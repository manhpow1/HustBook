const authService = require('../services/authService');
const { validateSignup, validateLogin, validateChangeInfo } = require('../validators/userValidator');
const { generateRandomCode, hashPassword, comparePassword, formatPhoneNumber } = require('../utils/helpers');
const User = require('../models/User');

const signup = async (req, res) => {
    try {
        const { error } = validateSignup(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }

        const { phoneNumber, password, uuid } = req.body;

        const existingUser = await authService.getUserByPhoneNumber(phoneNumber);
        if (existingUser) {
            return res.status(400).json({ code: "9996", message: "User existed" });
        }

        const hashedPassword = await hashPassword(password);
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        const verificationCode = generateRandomCode();

        const { userId, deviceToken } = await authService.createUser(formattedPhoneNumber, hashedPassword, uuid, verificationCode);

        const token = authService.generateJWT({ uid: userId, phone: formattedPhoneNumber });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userId,
                token: token,
                deviceToken: deviceToken,
                verifyCode: verificationCode,
            },
        });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const login = async (req, res) => {
    try {
        const { error } = validateLogin(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }

        const { phoneNumber, password, deviceId } = req.body;

        const user = await authService.getUserByPhoneNumber(phoneNumber);
        if (!user) {
            return res.status(400).json({ code: "9995", message: "User is not validated" });
        }

        const isPasswordCorrect = await comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ code: "1004", message: "Invalid password" });
        }

        const deviceToken = authService.generateDeviceToken();
        await authService.updateUserDeviceInfo(user.uid, deviceToken, deviceId);

        const token = authService.generateJWT({ uid: user.uid, phone: user.phoneNumber });

        const userModel = new User(user);

        const refreshToken = generateRefreshToken(user.id);
        await updateDocument(collections.users, user.id, { refreshToken });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                ...userModel.toJSON(),
                token: token,
                deviceToken: deviceToken,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(400).json({ code: "1002", message: "No token provided" });
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        await authService.clearUserDeviceToken(userId);

        res.status(200).json({ code: "1000", message: "OK" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const getVerifyCode = async (req, res) => {
    try {
        const { phonenumber } = req.body;

        if (!/^0\d{9}$/.test(phonenumber)) {
            return res.status(400).json({ code: "1004", message: "Invalid phone number format" });
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            return res.status(400).json({ code: "9995", message: "User is not validated" });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await authService.storeVerificationCode(user.uid, verificationCode);

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
};

const checkVerifyCode = async (req, res) => {
    try {
        const { phonenumber, code } = req.body;

        if (!phonenumber || !code) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        if (!/^0\d{9}$/.test(phonenumber)) {
            return res.status(400).json({ code: "1004", message: "Invalid phone number format" });
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            return res.status(400).json({ code: "9995", message: "User is not validated" });
        }

        const currentTime = Date.now();
        const codeExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (user.verificationCode !== code ||
            currentTime - user.verificationCodeTimestamp > codeExpirationTime) {
            return res.status(400).json({ code: "9993", message: "Code verify is incorrect" });
        }

        const token = authService.generateJWT({ uid: user.uid, phone: phonenumber });
        const deviceToken = authService.generateDeviceToken();

        await authService.updateUserVerification(user.uid, true, deviceToken);

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: user.uid,
                token: token,
                deviceToken: deviceToken,
                active: user.active || "1"
            }
        });
    } catch (error) {
        console.error("Error in check_verify_code:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const checkAuth = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const deviceToken = req.headers['x-device-token'];

        if (!token || !deviceToken) {
            return res.json({ isAuthenticated: false });
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        const user = await getDocument(collections.users, userId);

        if (!user || user.deviceToken !== deviceToken) {
            return res.json({ isAuthenticated: false });
        }

        res.json({ isAuthenticated: true });
    } catch (error) {
        console.error("Auth check error:", error);
        res.json({ isAuthenticated: false });
    }
};

const changeInfoAfterSignup = async (req, res) => {
    try {
        const { error } = validateChangeInfo(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }
        const { token, username } = req.body;
        const avatar = req.file;

        if (!token || !username) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        const user = await getDocument(collections.users, userId);
        if (!user) {
            return res.status(404).json({ code: "9995", message: "User not found" });
        }

        if (username === req.user.phoneNumber) {
            return res.status(400).json({ code: "1004", message: "Username cannot be the same as the phone number" });
        }

        const updateData = { username };

        if (avatar) {
            // In a real-world scenario, you would upload this file to a storage service
            // and get a URL. For this example, we'll just use a placeholder URL.
            updateData.avatar = `http://example.com/avatars/${avatar.filename}`;
        }

        await updateDocument(collections.users, userId, updateData);

        const updatedUser = await getDocument(collections.users, userId);

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userId,
                username: updatedUser.username,
                phonenumber: updatedUser.phoneNumber,
                created: updatedUser.createdAt,
                avatar: updatedUser.avatar,
                is_blocked: updatedUser.isBlocked || false,
                online: updatedUser.online || false
            }
        });
    } catch (error) {
        console.error("Error in change_info_after_signup:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB or internal server error" });
    }
};

module.exports = {
    login,
    signup,
    logout,
    getVerifyCode,
    checkVerifyCode,
    checkAuth,
    changeInfoAfterSignup
};