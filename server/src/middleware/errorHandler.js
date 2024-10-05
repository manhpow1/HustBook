const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({ code: "1002", message: err.message });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ code: "9998", message: "Token is invalid" });
    }

    // Default to 500 server error
    res.status(500).json({ code: "1001", message: "Internal Server Error" });
};

module.exports = errorHandler;