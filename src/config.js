const path = require('path');

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || 'scis-news-events-demo-secret',
  TOKEN_EXPIRES_IN: process.env.TOKEN_EXPIRES_IN || '12h',
  DB_PATH: path.join(__dirname, '..', 'storage', 'events.db.json'),
  STATIC_ROOT: path.join(__dirname, '..'),
};
