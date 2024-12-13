const app = require('./src/app');
const config = require('config');
const logger = require('./src/utils/logger');
const http = require('http');

// Create an HTTP server from the Express app
const server = http.createServer(app);

const PORT = config.get('server.port') || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Initialize Socket.io
const { initSocketIO } = require('./src/socket');
initSocketIO(server);