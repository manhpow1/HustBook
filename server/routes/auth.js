const express = require("express");
const router = express.Router();
const { db, auth } = require("../config/firebaseConfig");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { v4: uuidv4 } = require('uuid');

const generateDeviceToken = () => uuidv4();
console.log("JWT_SECRET first 5 characters:", process.env.JWT_SECRET.substring(0, 5));

router.post("/login", async (req, res) => {
    try {
        const { phonenumber, password, deviceId } = req.body;

        console.log("Received login request:", { phonenumber, password: '****', deviceId });

        // Check if all required fields are provided
        if (!phonenumber || !password) {
            return res
                .status(400)
                .json({ code: "1002", message: "Parameter is not enough" });
        }

        // Validate phone number format
        if (!/^0\d{9}$/.test(phonenumber)) {
            return res
                .status(400)
                .json({ code: "1004", message: "Invalid phone number format" });
        }

        // Check if user exists in Authentication
        let userRecord = await auth.getUserByPhoneNumber("+84" + phonenumber.substring(1));
        const userDoc = await db.collection("users").doc(userRecord.uid).get();
        const userData = userDoc.data();

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ code: "1004", message: "Invalid password" });
        }

        const deviceToken = generateDeviceToken();

        // Update the deviceToken in the database
        await db.collection("users").doc(userRecord.uid).update({ deviceToken });

        const token = jwt.sign(
            { uid: userRecord.uid, phone: userRecord.phoneNumber },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userRecord.uid,
                username: userData.username || "User" + userRecord.uid.substring(0, 4),
                token: token,
                deviceToken: deviceToken,  // Make sure this is included
                avatar: userData.avatar || "http://example.com/default-avatar.jpg",
                active: userData.active || "1"
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
});

router.post("/signup", async (req, res) => {
    try {
        const { phonenumber, password, uuid } = req.body;

        // Case 5: Check if all required fields are provided
        if (!phonenumber || !password || !uuid) {
            return res
                .status(400)
                .json({ code: "1002", message: "Parameter is not enough" });
        }

        // Case 3: Validate phone number format
        if (!/^0\d{9}$/.test(phonenumber)) {
            return res
                .status(400)
                .json({ code: "1004", message: "Invalid phone number format" });
        }

        // Case 4: Validate password
        if (
            password.length < 6 ||
            password.length > 10 ||
            /[^a-zA-Z0-9]/.test(password) ||
            password === phonenumber
        ) {
            return res
                .status(400)
                .json({ code: "1004", message: "Invalid password format" });
        }

        // Case 2: Check if user already exists
        try {
            const userRecord = await auth.getUserByPhoneNumber("+84" + phonenumber.substring(1));

            // If user exists in Authentication, check if they exist in Firestore
            const userDoc = await db.collection("users").doc(userRecord.uid).get();
            if (!userDoc.exists) {
                // If user exists in Authentication but not in Firestore, delete the Authentication record
                await auth.deleteUser(userRecord.uid);
            } else {
                return res.status(400).json({ code: "9996", message: "User existed" });
            }
        } catch (error) {
            // User doesn't exist in Authentication, continue with registration
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const deviceToken = generateDeviceToken();

        const newUser = await auth.createUser({
            phoneNumber: "+84" + phonenumber.substring(1),
            password: password,
        });

        await db.collection("users").doc(newUser.uid).set({
            phoneNumber: phonenumber,
            password: hashedPassword,
            uuid: uuid,
            verificationCode: verificationCode,
            isVerified: false,
            deviceToken: deviceToken
        });

        // Generate JWT token
        const token = jwt.sign(
            { uid: newUser.uid, phone: newUser.phoneNumber },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log("Generated token first 20 characters:", token.substring(0, 20));

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: newUser.uid,
                token: token,
                deviceToken: deviceToken,
                verifyCode: verificationCode,
            },
        });
    } catch (error) {
        console.error("Firebase Error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
});

router.post("/logout", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(400).json({ code: "1002", message: "No token provided" });
        }

        // Verify the token
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ code: "9998", message: "Invalid token" });
        }

        const userId = decodedToken.uid;

        // Optionally, can invalidate the token on the server side
        // This depends on how to manage tokens (e.g., using a blacklist)

        // Clear the device token for push notifications
        await db.collection("users").doc(userId).update({
            deviceToken: null
        });

        // Respond with success
        res.status(200).json({ code: "1000", message: "OK" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
});

router.post("/get_verify_code", async (req, res) => {
    try {
        const { phonenumber } = req.body;

        // Validate phone number format
        if (!/^0\d{9}$/.test(phonenumber)) {
            return res.status(400).json({ code: "1004", message: "Invalid phone number format" });
        }

        // Check if user exists
        let userRecord;
        try {
            userRecord = await auth.getUserByPhoneNumber("+84" + phonenumber.substring(1));
        } catch (error) {
            return res.status(400).json({ code: "9995", message: "User is not validated" });
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store the verification code in the database
        await db.collection("users").doc(userRecord.uid).update({
            verificationCode: verificationCode,
            verificationCodeTimestamp: Date.now()
        });

        // In a real-world scenario, you would send this code via SMS
        // For this example, we'll just return it in the response
        res.status(200).json({
            code: "1000",
            message: "Verification code sent successfully",
            data: {
                verifyCode: verificationCode // In production, don't send this back to the client
            }
        });

    } catch (error) {
        console.error("Error in get_verify_code:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
});

router.post("/check_verify_code", async (req, res) => {
    try {
        const { phonenumber, code } = req.body;
        // Validate input
        if (!phonenumber || !code) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        // Validate phone number format
        if (!/^0\d{9}$/.test(phonenumber)) {
            return res.status(400).json({ code: "1004", message: "Invalid phone number format" });
        }

        // Find user by phone number
        const userQuerySnapshot = await db.collection("users")
            .where("phoneNumber", "==", phonenumber)
            .get();

        if (userQuerySnapshot.empty) {
            return res.status(400).json({ code: "9995", message: "User is not validated" });
        }

        const userDoc = userQuerySnapshot.docs[0];
        const userData = userDoc.data();

        // Check if the verification code matches and is not expired
        const currentTime = Date.now();
        const codeExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (userData.verificationCode !== code ||
            currentTime - userData.verificationCodeTimestamp > codeExpirationTime) {
            return res.status(400).json({ code: "9993", message: "Code verify is incorrect" });
        }

        // Generate a new token
        const token = jwt.sign(
            { uid: userDoc.id, phone: phonenumber },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const deviceToken = jwt.sign({ uid: userDoc.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        // Update user as verified
        await userDoc.ref.update({
            isVerified: true,
            deviceToken: deviceToken
        });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userDoc.id,
                token: token,
                deviceToken: deviceToken,
                active: userData.active || "1"
            }
        });

    } catch (error) {
        console.error("Error in check_verify_code:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
});

router.get("/check", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const deviceToken = req.headers['x-device-token'];

        console.log("Received headers:", req.headers);  // Add this line
        console.log("Received token:", token);
        console.log("Received device token:", deviceToken);

        if (!token || !deviceToken) {
            console.log("No token or device token provided");
            return res.json({ isAuthenticated: false });
        }

        // Verify the token
        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            console.log("Decoded token:", decodedToken);
            const userId = decodedToken.uid;

            // Check if the user exists in the database and the device token matches
            const userDoc = await db.collection("users").doc(userId).get();

            if (!userDoc.exists || userDoc.data().deviceToken !== deviceToken) {
                console.log("User not found or device token mismatch");
                return res.json({ isAuthenticated: false });
            }

            console.log("User authenticated successfully");
            res.json({ isAuthenticated: true });
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError);
            res.json({ isAuthenticated: false });
        }
    } catch (error) {
        console.error("Auth check error:", error);
        res.json({ isAuthenticated: false });
    }
});

router.post("/change_info_after_signup", upload.single('avatar'), async (req, res) => {
    try {
        const { token, username } = req.body;
        const avatar = req.file;

        console.log('Received data:', { token, username, avatar: avatar ? 'File received' : 'No file' });

        if (!token || !username) {
            console.log('Missing token or username');
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        // Verify the token
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.log('Invalid token:', error.message);
            return res.status(401).json({ code: "9998", message: "Invalid token" });
        }

        const userId = decodedToken.uid;

        // Get user data
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            console.log('User not found:', userId);
            return res.status(404).json({ code: "9995", message: "User not found" });
        }

        const userData = userDoc.data();

        if (username === userData.phoneNumber) {
            console.log('Username same as phone number');
            return res.status(400).json({ code: "1004", message: "Username cannot be the same as the phone number" });
        }

        // Validate username
        if (!validateUsername(username)) {
            console.log('Invalid username format');
            return res.status(400).json({ code: "1004", message: "Invalid username format" });
        }

        // Update user information
        const updateData = {
            username: username,
        };

        if (avatar) {
            // In a real-world scenario, you would upload this file to a storage service
            // and get a URL. For this example, we'll just use a placeholder URL.
            updateData.avatar = `http://example.com/avatars/${avatar.filename}`;
        }

        await db.collection("users").doc(userId).update(updateData);

        // Fetch updated user data
        const updatedUserDoc = await db.collection("users").doc(userId).get();
        const updatedUserData = updatedUserDoc.data();

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userId,
                username: updatedUserData.username,
                phonenumber: updatedUserData.phoneNumber,
                created: updatedUserData.createdAt,
                avatar: updatedUserData.avatar,
                is_blocked: updatedUserData.isBlocked || false,
                online: updatedUserData.online || false
            }
        });
    } catch (error) {
        console.error("Error in change_info_after_signup:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB or internal server error" });
    }
});

function validateUsername(username) {
    // Check for special characters (improved regex)
    if (/[!@#$%^&*(),.?":{}|<>]/.test(username)) {
        return false;
    }

    // Check length
    if (username.length < 3 || username.length > 30) {
        return false;
    }

    // Check if it's not a path, phone number, or address (improved checks)
    if (
        username.includes('/') ||
        username.includes('\\') ||
        /^\d+$/.test(username) ||
        /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(username) ||
        /^\d+\s+[\w\s]+(?:avenue|ave|street|st|road|rd|boulevard|blvd)\.?$/i.test(username)
    ) {
        return false;
    }

    return true;
}

module.exports = router;