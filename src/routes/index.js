const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roomRoutes = require('./room.routes');
const matchRoutes = require('./match.routes');
const adminRoutes = require('./admin.routes');
const friendRoutes = require('./friend.routes');
const notificationRoutes = require('./notification.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cricket Box API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rooms', roomRoutes);
router.use('/matches', matchRoutes);
router.use('/admin', adminRoutes);
router.use('/friends', friendRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
