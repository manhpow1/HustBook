const express = require("express");
const router = express.Router();
const { db, auth } = require("../firebaseConfig");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
        const token = "fake-token-" + Math.random().toString(36).substring(7);

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

router.post("/logout", (req, res) => {
    // Implementation for logout
});

router.post("/get_verify_code", (req, res) => {
    // Implementation for getting verification code
});

router.post("/check_verify_code", (req, res) => {
    // Implementation for checking verification code
});

module.exports = router;
