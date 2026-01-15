require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { errorHandler, ApiError, ValidationError } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const studentRoutes = require('./routes/students');
const webhookRoutes = require('./routes/webhooks');
const { initDb, initSqliteDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// Initialize database
if (DB_TYPE === 'sqlite') {
  initSqliteDb();
} else {
  initDb();
}

// Middleware
app.use(bodyParser.json());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/webhooks', webhookRoutes);

// Serve static files from public directory (after API routes)
app.use(express.static('public'));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    // API route 404 - return JSON
    return res.status(404).json({ 
      status: 'error',
      message: 'Not Found',
      error: {
        statusCode: 404,
        message: 'The requested resource was not found on this server.'
      }
    });
  }
  // Non-API route 404 - could serve a 404 page or redirect to home
  res.status(404).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Using ${DB_TYPE} database`);
  });
}

// shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

module.exports = app;