// Load environment variables from .env in development and throw an
// error if any required variables are missing in production
require('dotenv-safe').config({
  example:
    process.env.NODE_ENV === 'production'
      ? '.env.prod.example'
      : '.env.example',
});

const config = require('config');

const app = require('./app');

app.configure();
app.start(config.get('port'));
