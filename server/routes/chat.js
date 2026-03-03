const express = require('express');
const db = require('../db/database');
const { generateResponse, streamGenerateResponse, calculateTypingDelay } = require('../core/gemini');
const { authenticateToken } = require('../core/authMiddleware');

const router = express.Router();

// Apply auth middleware to all chat routes
router.use(authenticateToken);

// Get all conversations for user
router.get('/conversations', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT id, title, created_at 
      FROM conversations 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation messages
router.get('/:id', (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    
    // Verify ownership
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, req.user.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = db.prepare(`
      SELECT id, role, content, language, created_at 
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(conversationId);

    // Get summary if exists
    const summary = db.prepare('SELECT * FROM conversation_summaries WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(conversationId);

    res.json({ conversation, messages, summary });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send message and get streaming AI response
router.post('/send', async (req, res) => {
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const { message, conversationId, mood } = req.body;

    if (!message || !message.trim()) {
      res.write(`data: ${JSON.stringify({ error: 'Message is required' })}\n\n`);
      res.end();
      return;
    }

    const userMood = mood || 'calm';
    let conversation;

    if (conversationId) {
      // Verify ownership
      conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, req.user.id);
      if (!conversation) {
        res.write(`data: ${JSON.stringify({ error: 'Conversation not found' })}\n\n`);
        res.end();
        return;
      }
    } else {
      // Create new conversation
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const result = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(req.user.id, title);
      conversation = { id: result.lastInsertRowid, title };
    }

    // Save user message
    const userMsgResult = db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversation.id, 'user', message);

    // Get conversation history for context
    const messages = db.prepare(`
      SELECT role, content, conversation_id
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(conversation.id);

    // Calculate suggested typing delay based on expected response
    const expectedDelay = calculateTypingDelay(message.length * 10);
    
    // Send initial response with conversation info
    res.write(`data: ${JSON.stringify({ 
      type: 'start', 
      conversationId: conversation.id, 
      title: conversation.title,
      suggestedDelay: expectedDelay
    })}\n\n`);

    // Stream the AI response
    await streamGenerateResponse(res, messages, userMood, req.user.id, db);

    res.end();
  } catch (error) {
    console.error('Send message error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to send message' })}\n\n`);
    res.end();
  }
});

// Non-streaming send (fallback for older clients)
router.post('/send-sync', async (req, res) => {
  try {
    const { message, conversationId, mood } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMood = mood || 'calm';
    let conversation;

    if (conversationId) {
      conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, req.user.id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    } else {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const result = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(req.user.id, title);
      conversation = { id: result.lastInsertRowid, title };
    }

    // Save user message
    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversation.id, 'user', message);

    // Get conversation history
    const messages = db.prepare(`
      SELECT role, content 
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(conversation.id);

    // Generate AI response
    const aiResponse = await generateResponse(messages, userMood);

    // Save AI response
    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversation.id, 'auria', aiResponse);

    res.json({ 
      response: aiResponse, 
      conversationId: conversation.id,
      title: conversation.title
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete conversation
router.delete('/:id', (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    // Verify ownership and delete
    const result = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(conversationId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Get user memories
router.get('/memories', (req, res) => {
  try {
    const memories = db.prepare('SELECT * FROM user_memory WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ memories });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

module.exports = router;
