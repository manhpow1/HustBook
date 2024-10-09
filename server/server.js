const app = require('./src/app');
const config = require('config');
const logger = require('./src/utils/logger');

const port = config.get('server.port');

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});