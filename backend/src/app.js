const express = require('express');
const cors = require('cors');
const connectDB = require('./config/mongodb');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// เชื่อมต่อ MongoDB
connectDB();

// Routes
app.use('/api/v1', routes);

// Error Handler (ต้องอยู่ท้ายสุด)
app.use(errorMiddleware);

module.exports = app;