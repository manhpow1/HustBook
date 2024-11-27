const formatPhoneNumber = (phoneNumber) => {
    if (phoneNumber.startsWith('0')) {
        return '+84' + phoneNumber.slice(1);
    }
    return phoneNumber;
};

module.exports = {
    formatPhoneNumber,
};