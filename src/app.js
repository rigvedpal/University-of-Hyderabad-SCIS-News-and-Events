const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const { STATIC_ROOT } = require('./config');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

app.use(express.static(STATIC_ROOT));

app.get('/', (_req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
  });
});

module.exports = app;
