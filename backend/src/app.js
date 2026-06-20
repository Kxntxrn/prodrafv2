const express = require('express');
const cors = require('cors');
const connectDB = require('./config/mongodb');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const seedData = require('./seeders/seeder');

const app = express();

// Connect to MongoDB & Seed Data
connectDB().then(() => {
  seedData();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (for docker health check and troubleshooting)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    status: 'OK', 
    message: 'Borrowing System API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes - support both standard /api and versioned /api/v1 for compatibility
app.use('/api/v1', routes);
app.use('/api', routes);

// Error Handler (Must be registered last)
app.use(errorMiddleware);

module.exports = app;