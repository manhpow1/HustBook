const bcrypt = require('bcrypt');

const generateRandomCode = (length = 6) => {
    return Math.floor(100000 + Math.random() * 900000).toString().slice(0, length);
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

const formatPhoneNumber = (phoneNumber) => {
    if (phoneNumber.startsWith('0')) {
        return '+84' + phoneNumber.slice(1);
    }
    return phoneNumber;
};

module.exports = {
    generateRandomCode,
    hashPassword,
    comparePassword,
    formatPhoneNumber
};