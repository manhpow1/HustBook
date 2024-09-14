const express = require("express");
const router = express.Router();
const { db, auth } = require("../firebaseConfig");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
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

        // Check if user exists
        let userRecord;
        try {
            userRecord = await auth.getUserByPhoneNumber("+84" + phonenumber.substring(1));
        } catch (error) {
            console.error("Error fetching user:", error);
            return res.status(400).json({ code: "9995", message: "User is not validated" });
        }

        // Fetch user data from Firestore
        const userDoc = await db.collection("users").doc(userRecord.uid).get();
        const userData = userDoc.data();

        // Check if user is verified (if you're implementing this)
        if (userData.isVerified === false) {
            return res.status(400).json({ code: "9995", message: "Account not verified" });
        }

        // Verify password using bcrypt
        console.log("Stored hashed password:", userData.password);
        console.log("Provided password:", password);

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        console.log("Password comparison result:", isPasswordCorrect);
        if (!isPasswordCorrect) {
            return res.status(400).json({ code: "1004", message: "Invalid password" });
        }

        // Generate a new token (you should use a proper JWT library in production)
        const token = jwt.sign(
            { uid: userRecord.uid, phone: userRecord.phoneNumber },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Update user's device token if provided
        if (deviceId) {
            await db.collection("users").doc(userRecord.uid).update({ deviceId });
        }

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userRecord.uid,
                username: userData.username || "User" + userRecord.uid.substring(0, 4),
                token: token,
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
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    try {
        const { phonenumber, password, uuid } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

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
            const userRecord = await auth.getUserByPhoneNumber(
                "+84" + phonenumber.substring(1)
            );
            return res.status(400).json({ code: "9996", message: "User existed" });
        } catch (error) {
            // User doesn't exist, continue with registration
        }

        // Case 1: Create new user
        const verificationCode = Math.floor(
            100000 + Math.random() * 900000
        ).toString();
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
        });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                verifyCode: verificationCode,
            },
        });
    } catch (error) {
        console.error("Firebase Error:", error);
        if (error.code === "app/invalid-credential") {
            return res.status(500).json({
                code: "1001",
                message: "Firebase configuration error. Please check server logs.",
            });
        }
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
            { uid: userDoc.id, phone: userData.phoneNumber },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Update user as verified
        await userDoc.ref.update({ isVerified: true });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userDoc.id,
                token: token,
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

        if (!token) {
            return res.json({ isAuthenticated: false });
        }

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.uid;

        // Check if the user exists in the database
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return res.json({ isAuthenticated: false });
        }

        res.json({ isAuthenticated: true });
    } catch (error) {
        console.error("Auth check error:", error);
        res.json({ isAuthenticated: false });
    }
});

router.post("/change_info_after_signup", upload.single('avatar'), async (req, res) => {
    try {
        const { token, username } = req.body;
        const avatar = req.file;

        if (!token || !username) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        // Verify the token
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ code: "9998", message: "Invalid token" });
        }

        // Validate username
        if (!validateUsername(username)) {
            return res.status(400).json({ code: "1004", message: "Invalid username format" });
        }

        const userId = decodedToken.uid;

        // Get user data
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ code: "9995", message: "User not found" });
        }

        const userData = userDoc.data();

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
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
});

function validateUsername(username) {
    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(username)) {
        return false;
    }

    // Check length
    if (username.length < 3 || username.length > 30) {
        return false;
    }

    // Check if it's not a path, phone number, or address (basic checks)
    if (
        username.includes('/') ||
        username.includes('\\') ||
        /^\d+$/.test(username) ||
        /^\d{3}-\d{3}-\d{4}$/.test(username) ||
        /^\d+\s+[\w\s]+(?:avenue|street|road)$/i.test(username)
    ) {
        return false;
    }

    return true;
}

module.exports = router;
module.exports = router;
