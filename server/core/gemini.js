const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSystemPrompt } = require('./systemPrompt');

let genAI = null;

function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// Extract memory facts from conversation
function extractMemoryFacts(messages) {
  const facts = [];
  const userMessages = messages.filter(m => m.role === 'user');
  
  // Look for key emotional patterns
  const patterns = [
    { regex: /anxiety|anxious|worry|worried|nervous/gi, fact: 'User struggles with anxiety' },
    { regex: /depress|sad|sadness|down|hopeless/gi, fact: 'User experiences sadness or depression' },
    { regex: /stress|stressed|overwhelm/gi, fact: 'User deals with stress' },
    { regex: /angry|anger|frustrat/gi, fact: 'User experiences anger' },
    { regex: /motivation|motivated|goal|dream/gi, fact: 'User is motivated and goal-oriented' },
    { regex: /calm|peace|relax/gi, fact: 'User values calm and peace' },
    { regex: /work|job|career/gi, fact: 'User has work-related concerns' },
    { regex: /relationship|friend|family|partner/gi, fact: 'User has relationship concerns' },
    { regex: /sleep|tired|exhaust/gi, fact: 'User has sleep or energy concerns' },
    { regex: /meditation|breathe|exercise| workout/gi, fact: 'User practices self-care activities' }
  ];
  
  userMessages.forEach(msg => {
    patterns.forEach(p => {
      if (p.regex.test(msg.content) && !facts.includes(p.fact)) {
        facts.push(p.fact);
      }
    });
  });
  
  return facts.slice(0, 5); // Max 5 facts
}

// Get user memories from database
function getUserMemories(userId, db) {
  try {
    const memories = db.prepare('SELECT * FROM user_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(userId);
    return memories || [];
  } catch (e) {
    console.error('Error fetching memories:', e);
    return [];
  }
}

// Save extracted memories
function saveMemories(userId, facts, db) {
  if (!facts || facts.length === 0) return;
  
  try {
    const existing = db.prepare('SELECT memory_text FROM user_memory WHERE user_id = ?').all(userId);
    const existingTexts = existing.map(e => e.memory_text);
    
    facts.forEach(fact => {
      if (!existingTexts.includes(fact)) {
        db.prepare('INSERT INTO user_memory (user_id, memory_text) VALUES (?, ?)').run(userId, fact);
      }
    });
  } catch (e) {
    console.error('Error saving memories:', e);
  }
}

// Get conversation summary
function getConversationSummary(conversationId, db) {
  try {
    const summary = db.prepare('SELECT * FROM conversation_summaries WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(conversationId);
    return summary || null;
  } catch (e) {
    console.error('Error fetching summary:', e);
    return null;
  }
}

// Create summary using Gemini
async function createSummary(messages, client) {
  if (!client || messages.length < 10) return null;
  
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const recentMessages = messages.slice(-20);
    const conversationText = recentMessages.map(m => 
      `${m.role === 'user' ? 'User' : 'AURIA'}: ${m.content}`
    ).join('\n\n');
    
    const prompt = `Create a brief emotional summary of this conversation (2-3 sentences). Focus on the user's emotional state, key topics discussed, and any important feelings or concerns they shared:\n\n${conversationText}`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error('Error creating summary:', e);
    return null;
  }
}

// Save conversation summary
function saveSummary(conversationId, summaryText, messageCount, db) {
  if (!summaryText) return;
  
  try {
    db.prepare('INSERT INTO conversation_summaries (conversation_id, summary_text, message_count) VALUES (?, ?, ?)').run(
      conversationId, summaryText, messageCount
    );
  } catch (e) {
    console.error('Error saving summary:', e);
  }
}

// Streaming response generation
async function streamGenerateResponse(res, messages, mood = 'calm', userId, db) {
  const client = getGeminiClient();
  
  if (!client) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: getFallbackResponse(mood) })}\n\n`);
    res.write('data: {"type":"done"}\n\n');
    return;
  }

  try {
    // Get user memories
    const memories = getUserMemories(userId, db);
    
    // Get conversation summary if exists
    const conversationId = messages[0]?.conversation_id;
    const summary = conversationId ? getConversationSummary(conversationId, db) : null;
    
    // Extract and save new memories
    const newFacts = extractMemoryFacts(messages);
    if (newFacts.length > 0) {
      saveMemories(userId, newFacts, db);
    }
    
    // Check if we need to summarize (every 20 messages)
    const messageCount = messages.length;
    if (messageCount > 0 && messageCount % 20 === 0) {
      const summaryText = await createSummary(messages, client);
      if (summaryText && conversationId) {
        saveSummary(conversationId, summaryText, messageCount, db);
      }
    }
    
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: getSystemPrompt(mood, memories, summary)
    });

    // Convert messages to Gemini format
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'auria' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Build chat with history
    let chat;
    if (chatHistory.length > 1) {
      chat = model.startChat({
        history: chatHistory.slice(0, -1),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        }
      });
    } else {
      chat = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        }
      });
    }

    // Send message and get streaming result
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessageStream(lastMessage);
    
    let fullResponse = '';
    
    // Stream chunks
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunkText })}\n\n`);
    }
    
    res.write(`data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`);
    
  } catch (error) {
    console.error('Gemini streaming error:', error.message);
    const fallback = getFallbackResponse(mood);
    res.write(`data: ${JSON.stringify({ type: 'error', content: fallback })}\n\n`);
    res.write('data: {"type":"done"}\n\n');
  }
}

// Non-streaming response (fallback)
async function generateResponse(messages, mood = 'calm') {
  const client = getGeminiClient();
  
  if (!client) {
    return getFallbackResponse(mood);
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: getSystemPrompt(mood)
    });

    // Convert messages to Gemini format
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'auria' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Start chat with history (except last message)
    let chat;
    if (chatHistory.length > 1) {
      chat = model.startChat({
        history: chatHistory.slice(0, -1),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      });
    } else {
      chat = model.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      });
    }

    // Send last message
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return getFallbackResponse(mood);
  }
}

function getFallbackResponse(mood) {
  const fallbacks = {
    sad: `🤍 I hear you. Sometimes it helps to just breathe and acknowledge what we're feeling. Take a moment to notice 5 things you can see around you right now.\n\nWould you like to share what's on your mind?`,
    anxious: `🌿 I understand. Let's take this slowly. Try taking a deep breath together - in for 4 counts, hold for 4, out for 4.\n\nWhat's been weighing on your mind?`,
    calm: `🌙 I'm glad you're here. This is your space to reflect or simply be.\n\nWhat would you like to explore together?`,
    angry: `🌫️ I hear that you're feeling frustrated. It's completely valid to feel this way.\n\nWould you like to talk about what's contributing to these feelings?`,
    motivated: `🔥 I love your energy! Let's channel that motivation.\n\nWhat's the one thing you'd like to focus on?`
  };
  
  return fallbacks[mood] || fallbacks.calm;
}

// Calculate typing delay based on response length
function calculateTypingDelay(textLength) {
  const minDelay = 500;  // Minimum 500ms
  const maxDelay = 3000; // Maximum 3s
  const delayPerChar = 20; // 20ms per character
  
  return Math.min(Math.max(textLength * delayPerChar, minDelay), maxDelay);
}

module.exports = { 
  generateResponse, 
  streamGenerateResponse, 
  calculateTypingDelay,
  getUserMemories,
  saveMemories,
  getConversationSummary,
  createSummary,
  saveSummary
};
