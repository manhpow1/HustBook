const app = require('./src/app');
const config = require('config');
const logger = require('./src/utils/logger');

const PORT = config.get('server.port') || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});