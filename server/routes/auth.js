const express = require('express');
const router = express.Router();
const { db, auth } = require('../firebaseConfig');

router.post('/login', (req, res) => {
    // Implementation for login
});

router.post('/signup', async (req, res) => {
    try {
        const { phonenumber, password, uuid } = req.body;

        // Case 5: Check if all required fields are provided
        if (!phonenumber || !password || !uuid) {
            return res.status(400).json({ code: '1002', message: 'Parameter is not enough' });
        }

        // Case 3: Validate phone number format
        if (!/^0\d{9}$/.test(phonenumber)) {
            return res.status(400).json({ code: '1004', message: 'Invalid phone number format' });
        }

        // Case 4: Validate password
        if (password.length < 6 || password.length > 10 || /[^a-zA-Z0-9]/.test(password) || password === phonenumber) {
            return res.status(400).json({ code: '1004', message: 'Invalid password format' });
        }

        // Case 2: Check if user already exists
        try {
            const userRecord = await auth.getUserByPhoneNumber('+84' + phonenumber.substring(1));
            return res.status(400).json({ code: '9996', message: 'User existed' });
        } catch (error) {
            // User doesn't exist, continue with registration
        }

        // Case 1: Create new user
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newUser = await auth.createUser({
            phoneNumber: '+84' + phonenumber.substring(1),
            password: password,
        });

        await db.collection('users').doc(newUser.uid).set({
            phoneNumber: phonenumber,
            uuid: uuid,
            verificationCode: verificationCode,
            isVerified: false
        });

        res.status(200).json({
            code: '1000',
            message: 'OK',
            data: {
                verifyCode: verificationCode
            }
        });

    } catch (error) {
        console.error('Firebase Error:', error);
        if (error.code === 'app/invalid-credential') {
            return res.status(500).json({ code: '1001', message: 'Firebase configuration error. Please check server logs.' });
        }
        res.status(500).json({ code: '1001', message: 'Cannot connect to DB' });
    }
});

router.post('/logout', (req, res) => {
    // Implementation for logout
});

router.post('/get_verify_code', (req, res) => {
    // Implementation for getting verification code
});

router.post('/check_verify_code', (req, res) => {
    // Implementation for checking verification code
});

module.exports = router;