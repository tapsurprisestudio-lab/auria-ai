/**
 * AURIA - Premium Emotional Companion
 * Global JavaScript
 */

(function() {
  'use strict';

  // ========================================
  // Configuration
  // ========================================
  
  const AVATAR_URL = 'https://i.imgur.com/vtzAk7r.jpeg';
  const STORAGE_KEYS = {
    USER_NAME: 'auria_user_name',
    MOOD: 'auria_mood',
    FOCUS_MODE: 'auria_focus',
    COMFORT_MODE: 'auria_comfort',
    CONVERSATIONS: 'auria_conversations',
    CURRENT_CHAT: 'auria_current_chat'
  };

  // ========================================
  // Utility Functions
  // ========================================

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return document.querySelectorAll(selector);
  }

  function getFromStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('LocalStorage not available');
      return null;
    }
  }

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage not available');
    }
  }

  function removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('LocalStorage not available');
    }
  }

  function getUserName() {
    return getFromStorage(STORAGE_KEYS.USER_NAME) || '';
  }

  function getMood() {
    return getFromStorage(STORAGE_KEYS.MOOD) || 'calm';
  }

  // ========================================
  // Navigation
  // ========================================

  function initNavigation() {
    const burger = $('.nav-burger');
    const mobileNav = $('.nav-mobile');
    
    if (burger && mobileNav) {
      burger.addEventListener('click', function() {
        mobileNav.classList.toggle('active');
      });

      // Close mobile nav when clicking a link
      $$('.nav-mobile a').forEach(link => {
        link.addEventListener('click', function() {
          mobileNav.classList.remove('active');
        });
      });
    }

    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  // ========================================
  // Backgrounds
  // ========================================

  function setBackground(imageUrl) {
    let bgLayer = $('.background-layer');
    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.className = 'background-layer';
      document.body.insertBefore(bgLayer, document.body.firstChild);
    }
    if (imageUrl) {
      bgLayer.style.backgroundImage = `url('${imageUrl}')`;
      bgLayer.style.display = 'block';
    } else {
      bgLayer.style.display = 'none';
    }
  }

  // ========================================
  // Particles
  // ========================================

  function initParticles() {
    let particles = $('.particles');
    if (!particles) {
      particles = document.createElement('div');
      particles.className = 'particles';
      document.body.insertBefore(particles, document.body.firstChild);
      
      // Create particle elements
      for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particles.appendChild(particle);
      }
    }
  }

  // ========================================
  // Mood System
  // ========================================

  function applyMoodTheme(mood) {
    document.body.className = document.body.className.replace(/mood-\w+/g, '').trim();
    if (mood) {
      document.body.classList.add(`mood-${mood}`);
    }
    saveToStorage(STORAGE_KEYS.MOOD, mood || 'calm');
  }

  function getMoodEmojis(mood) {
    const emojis = {
      sad: ['🤍', '😔', '🌊'],
      anxious: ['🌿', '🫶', '💫'],
      calm: ['🌙', '✨', '🕊️'],
      angry: ['🌫️', '🧘', '💭'],
      motivated: ['🔥', '💪', '⭐']
    };
    return emojis[mood] || emojis.calm;
  }

  // ========================================
  // Chat API (Backend)
  // ========================================

  async function sendToAPI(message, conversationId, mood) {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationId, mood }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response;
  }

  // Streaming response handler
  async function handleStreamingResponse(response, container, input) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    container.appendChild(typingIndicator);
    scrollToBottom(container);

    // Create placeholder message for AURIA
    const auriaMsgDiv = document.createElement('div');
    auriaMsgDiv.className = 'message auria';
    
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = AVATAR_URL;
    avatar.alt = 'AURIA';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    auriaMsgDiv.appendChild(avatar);
    auriaMsgDiv.appendChild(messageContent);

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'start') {
                // Save conversation ID
                if (data.conversationId) {
                  currentConversationId = data.conversationId;
                }
              } else if (data.type === 'chunk') {
                // Add chunk to content
                fullContent += data.content;
                messageContent.innerHTML = fullContent.replace(/\n/g, '<br>');
                scrollToBottom(container);
              } else if (data.type === 'done' || data.type === 'error') {
                // Final response
                if (data.content) {
                  fullContent = data.content;
                  messageContent.innerHTML = fullContent.replace(/\n/g, '<br>');
                }
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      // Remove typing indicator
      typingIndicator.remove();
      
      // Add message to container if not already added
      if (!container.contains(auriaMsgDiv)) {
        typingIndicator.remove();
        container.appendChild(auriaMsgDiv);
      }
      
      scrollToBottom(container);

      // Save to conversation
      if (fullContent) {
        saveCurrentChat(message, fullContent);
      }

    } catch (error) {
      console.error('Streaming error:', error);
      typingIndicator.remove();
      // Show error message
      messageContent.innerHTML = 'Sorry, I encountered an error. Please try again.';
      container.appendChild(auriaMsgDiv);
    }
  }

  // Fallback: Non-streaming API call
  async function sendToAPISync(message, conversationId, mood) {
    const response = await fetch('/api/chat/send-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationId, mood }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  // ========================================
  // Conversation History
  // ========================================

  function getConversations() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveConversations(conversations) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Could not save conversations');
    }
  }

  function addConversation(messages) {
    if (!messages || messages.length === 0) return;
    
    const conversations = getConversations();
    const firstUserMessage = messages.find(m => m.role === 'user');
    const title = firstUserMessage 
      ? (firstUserMessage.content.substring(0, 40) + '...')
      : 'New Conversation';
    
    const newConversation = {
      id: Date.now(),
      title: title,
      messages: messages,
      timestamp: new Date().toISOString()
    };
    
    conversations.unshift(newConversation);
    saveConversations(conversations.slice(0, 50)); // Keep last 50
  }

  function deleteConversation(id) {
    const conversations = getConversations();
    const filtered = conversations.filter(c => c.id !== id);
    saveConversations(filtered);
  }

  function clearAllConversations() {
    saveConversations([]);
  }

  // ========================================
  // Focus Mode
  // ========================================

  function initFocusMode() {
    const focusEnabled = getFromStorage(STORAGE_KEYS.FOCUS_MODE) === 'true';
    if (focusEnabled) {
      document.body.classList.add('focus-mode');
    }
  }

  function toggleFocusMode() {
    const isFocus = document.body.classList.toggle('focus-mode');
    saveToStorage(STORAGE_KEYS.FOCUS_MODE, isFocus);
    return isFocus;
  }

  // ========================================
  // Comfort Mode
  // ========================================

  function initComfortMode() {
    const comfortEnabled = getFromStorage(STORAGE_KEYS.COMFORT_MODE) === 'true';
    if (comfortEnabled) {
      document.body.classList.add('comfort');
    }
  }

  function toggleComfortMode() {
    const isComfort = document.body.classList.toggle('comfort');
    saveToStorage(STORAGE_KEYS.COMFORT_MODE, isComfort);
    return isComfort;
  }

  // ========================================
  // Chat UI
  // ========================================

  function initChat() {
    const chatMessages = $('.chat-messages');
    const chatInput = $('.chat-input');
    const sendBtn = $('.chat-send-btn');
    const focusBtn = $('.focus-mode-btn');

    if (!chatMessages) return;

    // Display welcome message
    displayWelcomeMessage();

    // Focus mode toggle
    if (focusBtn) {
      focusBtn.addEventListener('click', function() {
        const isFocus = toggleFocusMode();
        focusBtn.textContent = isFocus ? 'Exit Focus' : 'Focus Mode';
      });

      // Update button text based on current state
      if (getFromStorage(STORAGE_KEYS.FOCUS_MODE) === 'true') {
        focusBtn.textContent = 'Exit Focus';
      }
    }

    // Send message on button click
    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        const message = chatInput.value.trim();
        if (message) {
          sendMessage(message, chatInput, chatMessages);
        }
      });
    }

    // Send message on Enter
    if (chatInput) {
      chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const message = chatInput.value.trim();
          if (message) {
            sendMessage(message, chatInput, chatMessages);
          }
        }
      });
    }
  }

  function displayWelcomeMessage() {
    const chatMessages = $('.chat-messages');
    if (!chatMessages) return;

    const userName = getUserName();
    const mood = getMood();
    const moodEmojis = getMoodEmojis(mood);

    let welcomeText;
    if (userName) {
      welcomeText = `${moodEmojis[0]} Welcome back, ${userName}. I'm here.`;
    } else {
      welcomeText = `${moodEmojis[0]} Welcome. I'm here with you.`;
    }

    const welcomeMessage = createMessage(welcomeText, 'auria');
    chatMessages.innerHTML = '';
    chatMessages.appendChild(welcomeMessage);
    scrollToBottom(chatMessages);
  }

  function createMessage(content, role) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = AVATAR_URL;
    avatar.alt = 'AURIA';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = content.replace(/\n/g, '<br>');

    if (role === 'auria') {
      div.appendChild(avatar);
      div.appendChild(messageContent);
    } else {
      div.appendChild(messageContent);
      div.appendChild(avatar);
    }

    return div;
  }

  function sendMessage(message, input, container) {
    // Add user message
    const userMsg = createMessage(message, 'user');
    container.appendChild(userMsg);
    scrollToBottom(container);

    // Clear input
    input.value = '';

    // Try streaming API first, fallback to sync
    sendToAPI(message, currentConversationId, getMood())
      .then(response => {
        // Use streaming handler
        handleStreamingResponse(response, container, input);
      })
      .catch(error => {
        console.warn('Streaming failed, trying sync:', error);
        // Fallback to sync API
        return sendToAPISync(message, currentConversationId, getMood());
      })
      .then(data => {
        // Handle sync response if streaming failed
        if (data && data.response) {
          // Show typing indicator briefly
          const typingIndicator = createTypingIndicator();
          container.appendChild(typingIndicator);
          scrollToBottom(container);
          
          setTimeout(() => {
            typingIndicator.remove();
            
            const auriaMsg = createMessage(data.response, 'auria');
            container.appendChild(auriaMsg);
            scrollToBottom(container);
            
            // Save conversation
            if (data.conversationId) {
              currentConversationId = data.conversationId;
            }
            saveCurrentChat(message, data.response);
          }, 1000);
        }
      })
      .catch(error => {
        console.error('API error:', error);
        // Fallback to local response
        const typingIndicator = createTypingIndicator();
        container.appendChild(typingIndicator);
        scrollToBottom(container);
        
        setTimeout(() => {
          typingIndicator.remove();
          
          const mood = getMood();
          const response = getAuriaResponseLocal(message, mood);
          const auriaMsg = createMessage(response, 'auria');
          container.appendChild(auriaMsg);
          scrollToBottom(container);
          
          saveCurrentChat(message, response);
        }, 1500);
      });
  }

  // Local fallback responses (when API unavailable)
  function getAuriaResponseLocal(userMessage, mood) {
    const moodEmojis = getMoodEmojis(mood);
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for greetings
    if (/\b(hi|hello|hey|good morning|good evening|good night)\b/.test(lowerMessage)) {
      const greetings = {
        sad: `${moodEmojis[0]} Hello. I'm here with you. How are you feeling right now?`,
        anxious: `${moodEmojis[0]} Hi there. Take a breath. I'm here. What's on your mind?`,
        calm: `${moodEmojis[0]} Hello. It's good to see you. How can I support you today?`,
        angry: `${moodEmojis[0]} I hear you. Let's take this slowly. What's going on?`,
        motivated: `${moodEmojis[0]} Hey! I'm ready to help you make progress. What would you like to work on?`
      };
      return greetings[mood] || greetings.calm;
    }

    // Check for thanks
    if (/\b(thank|thanks|appreciate)\b/.test(lowerMessage)) {
      return `${moodEmojis[2]} You're welcome. I'm here whenever you need me. Is there anything else you'd like to talk about?`;
    }

    // Check for goodbyes
    if (/\b(bye|goodbye|see you|later|gotta go)\b/.test(lowerMessage)) {
      return `${moodEmojis[0]} Take care of yourself. Remember, I'm always here when you need a calm space. Until next time.`;
    }

    // Check for crisis keywords
    if (/\b(hurt|suicide|kill|die|harm|emergency|police|ambulance|crisis)\b/.test(lowerMessage)) {
      return `${moodEmojis[0]} I want you to know I care about you deeply. If you're in crisis, please reach out for immediate help:\n\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741\n• Emergency: 911\n\nYou don't have to face this alone. 💙`;
    }

    // Check for how are you
    if (/\b(how are you|how do you do|how r you)\b/.test(lowerMessage)) {
      return `${moodEmojis[1]} Thank you for asking. I'm here and ready to be present with you. How are you feeling?`;
    }

    // Check for what's your name
    if (/\b(what('s| is) your name|who are you)\b/.test(lowerMessage)) {
      return `${moodEmojis[0]} I'm AURIA — your calm companion. I'm here to provide emotional support, a listening ear, and gentle guidance when you need it.`;
    }

    // Default supportive responses
    const responses = {
      sad: [
        `${moodEmojis[0]} I hear you. It sounds like you're going through something difficult. Would you like to share more about what's happening?\n\nIn the meantime, let's try a small grounding exercise: name 5 things you can see around you right now.`,
        `${moodEmojis[1]} Your feelings are valid. It's okay to feel sad — it's part of being human. \n\nHere are some things that might help:\n• Take slow, deep breaths\n• Write down what's on your mind\n• Remind yourself: this feeling is temporary\n\nWhat would you like to explore?`,
        `${moodEmojis[2]} Thank you for sharing this with me. It takes courage to express what you're feeling.\n\nRemember: you don't have to carry this alone. I'm here to listen without judgment.\n\nWould it help to talk about what's contributing to these feelings?`
      ],
      anxious: [
        `${moodEmojis[0]} I can feel the worry in your words. Let's take this one step at a time.\n\nFirst, let's ground ourselves: feel your feet on the floor, notice 3 things you can see, and take a slow breath.\n\nWhat's been worrying you?`,
        `${moodEmojis[1]} Anxiety can feel overwhelming, but you're taking a positive step by talking about it. That's strength.\n\nLet's try this: \n1. Name one thing you can control right now\n2. Remember: this moment will pass\n3. You've gotten through difficult times before\n\nWhat's on your mind that I can help with?`,
        `${moodEmojis[2]} I hear you. When our mind feels busy, it helps to slow down together.\n\nTake a breath... and let it out slowly.\n\nNow, what's the main thing on your mind? We can work through it together, one small piece at a time.`
      ],
      calm: [
        `${moodEmojis[0]} It's wonderful that you're feeling calm. This is a great time for reflection or just enjoying the peace.\n\nIs there anything specific you'd like to explore or talk about?`,
        `${moodEmojis[1]} There's something peaceful about this moment. I appreciate you sharing this calm space with me.\n\nWhat would you like to discuss? Whether it's reflecting on your day, exploring thoughts, or just being here — I'm here.`,
        `${moodEmojis[2]} It's beautiful to experience this tranquility. Moments like these are precious.\n\nIs there something on your mind you'd like to explore, or would you prefer to simply enjoy this peaceful state together?`
      ],
      angry: [
        `${moodEmojis[0]} I can sense your frustration. It's completely human to feel angry when something isn't right.\n\nLet's take a moment to breathe together. In... and out.\n\nWhat happened? I'm here to listen without judgment.`,
        `${moodEmojis[1]} Your anger is valid — it's a signal that something matters to you. \n\nBefore we explore this, let's do a quick reset:\n• Take 3 deep breaths\n• Notice where you feel this in your body\n• Remind yourself: you are safe right now\n\nWould you like to talk about what's triggering these feelings?`,
        `${moodEmojis[2]} I hear you. When emotions run high, it helps to have someone simply listen.\n\nI'm not here to fix anything — just to be present with you.\n\nWhat's contributing to how you're feeling?`
      ],
      motivated: [
        `${moodEmojis[0]} I love your energy! It's great to see you feeling motivated.\n\nWhat goals or ideas are lighting you up? Let's explore how to make the most of this momentum.`,
        `${moodEmojis[1]} That's the spirit! Your motivation is inspiring.\n\nTo make the most of this energy, consider:\n• Breaking your goal into small steps\n• Celebrating each progress\n• Staying kind to yourself along the way\n\nWhat would you like to work on?`,
        `${moodEmojis[2]} Your drive is wonderful. Let's channel that energy productively.\n\nWhat's the one thing you'd like to accomplish or explore? We can create a simple plan together, or just have a conversation about your vision.`
      ]
    };

    const moodResponses = responses[mood] || responses.calm;
    return moodResponses[Math.floor(Math.random() * moodResponses.length)];
  }

  let currentConversationId = null;

  function createTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = AVATAR_URL;
    avatar.alt = 'AURIA';
    
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span';
    
    div.appendChild(avatar);
    div.appendChild(dots);
    
    return div;
  }

  function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
  }

  let currentChatMessages = [];

  function saveCurrentChat(userMsg, auriaMsg) {
    currentChatMessages.push({ role: 'user', content: userMsg });
    currentChatMessages.push({ role: 'auria', content: auriaMsg });
    saveToStorage(STORAGE_KEYS.CURRENT_CHAT, JSON.stringify(currentChatMessages));
  }

  function loadCurrentChat() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);
      currentChatMessages = data ? JSON.parse(data) : [];
    } catch (e) {
      currentChatMessages = [];
    }
  }

  function saveCurrentChatToHistory() {
    if (currentChatMessages.length > 0) {
      addConversation(currentChatMessages);
      currentChatMessages = [];
      removeFromStorage(STORAGE_KEYS.CURRENT_CHAT);
    }
  }

  // ========================================
  // Mood Selection
  // ========================================

  function initMoodSelection() {
    const moodOptions = $$('.mood-option');
    const confirmBtn = $('.mood-confirm-btn');
    const selectionContainer = $('.mood-selection');
    const confirmationContainer = $('.mood-confirmation');

    if (!moodOptions.length) return;

    let selectedMood = null;

    moodOptions.forEach(option => {
      option.addEventListener('click', function() {
        // Remove selected class from all
        moodOptions.forEach(o => o.classList.remove('selected'));
        // Add to clicked
        this.classList.add('selected');
        selectedMood = this.dataset.mood;
      });
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        if (selectedMood) {
          applyMoodTheme(selectedMood);
          
          if (selectionContainer && confirmationContainer) {
            selectionContainer.classList.add('hidden');
            confirmationContainer.classList.remove('hidden');
          }
        }
      });
    }
  }

  // ========================================
  // History
  // ========================================

  function initHistory() {
    const historyList = $('.history-list');
    if (!historyList) return;

    const conversations = getConversations();

    if (conversations.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💭</div>
          <p>No conversations yet. Start chatting to see your history here.</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = conversations.map(convo => `
      <div class="history-item" data-id="${convo.id}">
        <div class="history-item-info">
          <h4>${convo.title}</h4>
          <p>${new Date(convo.timestamp).toLocaleDateString()} · ${convo.messages.length} messages</p>
        </div>
        <div class="history-item-actions">
          <button class="btn btn-ghost btn-sm delete-chat-btn" data-id="${convo.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Delete buttons
    $$('.delete-chat-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        deleteConversation(id);
        initHistory(); // Refresh
      });
    });

    // Clear all button
    const clearAllBtn = $('.clear-all-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete all conversation history?')) {
          clearAllConversations();
          initHistory();
        }
      });
    }
  }

  // ========================================
  // Settings
  // ========================================

  function initSettings() {
    const comfortToggle = $('#comfort-toggle');
    const focusToggle = $('#focus-default-toggle');
    const soundToggle = $('#sound-toggle');
    const switchAccountBtn = $('.switch-account-btn');
    const deleteAccountBtn = $('.delete-account-btn');

    // Comfort mode
    if (comfortToggle) {
      comfortToggle.checked = getFromStorage(STORAGE_KEYS.COMFORT_MODE) === 'true';
      comfortToggle.addEventListener('change', function() {
        toggleComfortMode();
      });
    }

    // Focus mode default
    if (focusToggle) {
      focusToggle.checked = getFromStorage(STORAGE_KEYS.FOCUS_MODE) === 'true';
      focusToggle.addEventListener('change', function() {
        saveToStorage(STORAGE_KEYS.FOCUS_MODE, this.checked);
        if (this.checked) {
          document.body.classList.add('focus-mode');
        } else {
          document.body.classList.remove('focus-mode');
        }
      });
    }

    // Switch account
    if (switchAccountBtn) {
      switchAccountBtn.addEventListener('click', function() {
        removeFromStorage(STORAGE_KEYS.USER_NAME);
        window.location.href = 'signup.html';
      });
    }

    // Delete account
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', function() {
        if (confirm('This will delete all your data including conversation history. Are you sure?')) {
          localStorage.clear();
          window.location.href = 'signup.html';
        }
      });
    }
  }

  // ========================================
  // Auth Forms
  // ========================================

  function initAuthForms() {
    const loginForm = $('#login-form');
    const signupForm = $('#signup-form');

    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = $('#login-name')?.value || '';
        if (name) {
          saveToStorage(STORAGE_KEYS.USER_NAME, name);
        }
        window.location.href = 'splash.html';
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = $('#signup-name').value;
        if (name) {
          saveToStorage(STORAGE_KEYS.USER_NAME, name);
        }
        window.location.href = 'splash.html';
      });
    }
  }

  // ========================================
  // Initialize
  // ========================================

  function init() {
    initParticles();
    initNavigation();
    initFocusMode();
    initComfortMode();
    loadCurrentChat();
    
    // Page-specific initialization
    const pageInit = {
      'chat.html': initChat,
      'mood.html': initMoodSelection,
      'history.html': initHistory,
      'settings.html': initSettings,
      'login.html': initAuthForms,
      'signup.html': initAuthForms
    };

    const currentPage = window.location.pathname.split('/').pop();
    if (pageInit[currentPage]) {
      pageInit[currentPage]();
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
