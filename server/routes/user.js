const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../core/authMiddleware');

const router = express.Router();

// Apply auth middleware to all user routes
router.use(authenticateToken);

// Get current user
router.get('/me', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Delete account
router.delete('/delete', (req, res) => {
  try {
    // Delete user (conversations and messages will be cascade deleted)
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);

    // Clear cookie
    res.clearCookie('token');

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
