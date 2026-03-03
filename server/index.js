require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

/*
==============================
FIX RENDER PROXY
==============================
*/
app.set("trust proxy", 1);

/*
==============================
MIDDLEWARE
==============================
*/
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

/*
==============================
RATE LIMIT
==============================
*/
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/chat/send', limiter);

/*
==============================
STATIC FRONTEND
==============================
*/
app.use(express.static(path.join(__dirname, '..', 'public')));

/*
==============================
API ROUTES
==============================
*/
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);

/*
==============================
HEALTH CHECK
==============================
*/
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/*
==============================
ROOT → SPLASH PAGE
==============================
*/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'splash.html'));
});

/*
==============================
SPA FALLBACK
==============================
*/
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'splash.html'));
  }
});

/*
==============================
ERROR HANDLER
==============================
*/
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

/*
==============================
START SERVER
==============================
*/
app.listen(PORT, () => {
  console.log(`AURIA server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
