/**
 * BuildMyBot Embed Widget
 * Version: 1.0.0
 *
 * Usage:
 * <script>
 *   window.buildMyBotConfig = {
 *     botId: 'your-bot-id',
 *     apiUrl: 'https://yourdomain.com' // Optional, defaults to buildmybot.app
 *   };
 * </script>
 * <script src="https://yourdomain.com/embed.js"></script>
 */

(function() {
  'use strict';

  // Configuration
  const config = window.buildMyBotConfig || {};
  const BOT_ID = config.botId;
  const API_URL = config.apiUrl || 'https://buildmybot.app';

  if (!BOT_ID) {
    console.error('BuildMyBot: botId is required in buildMyBotConfig');
    return;
  }

  // State
  let isOpen = false;
  let conversationId = null;
  let visitorId = getOrCreateVisitorId();
  let messages = [];
  let isTyping = false;

  // Get or create visitor ID (persistent across page loads)
  function getOrCreateVisitorId() {
    let id = localStorage.getItem('buildmybot_visitor_id');
    if (!id) {
      id = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('buildmybot_visitor_id', id);
    }
    return id;
  }

  // Restore conversation from localStorage
  function restoreConversation() {
    const saved = localStorage.getItem(`buildmybot_conversation_${BOT_ID}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        conversationId = data.conversationId;
        messages = data.messages || [];
        return true;
      } catch (e) {
        console.error('BuildMyBot: Failed to restore conversation', e);
      }
    }
    return false;
  }

  // Save conversation to localStorage
  function saveConversation() {
    localStorage.setItem(`buildmybot_conversation_${BOT_ID}`, JSON.stringify({
      conversationId,
      messages,
      timestamp: Date.now()
    }));
  }

  // Create chat widget HTML
  function createWidget() {
    // Chat button
    const button = document.createElement('div');
    button.id = 'buildmybot-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    button.onclick = toggleChat;

    // Chat window
    const widget = document.createElement('div');
    widget.id = 'buildmybot-widget';
    widget.innerHTML = `
      <div id="buildmybot-header">
        <div>
          <div id="buildmybot-title">Chat with us</div>
          <div id="buildmybot-subtitle">We're here to help</div>
        </div>
        <button id="buildmybot-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div id="buildmybot-messages"></div>
      <div id="buildmybot-input-container">
        <input
          type="text"
          id="buildmybot-input"
          placeholder="Type your message..."
          autocomplete="off"
        />
        <button id="buildmybot-send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      <div id="buildmybot-branding">
        Powered by <a href="https://buildmybot.app" target="_blank">BuildMyBot</a>
      </div>
    `;

    // Append to body
    document.body.appendChild(button);
    document.body.appendChild(widget);

    // Event listeners
    document.getElementById('buildmybot-close').onclick = toggleChat;
    document.getElementById('buildmybot-send').onclick = sendMessage;
    document.getElementById('buildmybot-input').onkeypress = function(e) {
      if (e.key === 'Enter') sendMessage();
    };

    // Load bot config and apply theme
    loadBotConfig();

    // Restore previous conversation
    if (restoreConversation()) {
      renderMessages();
    }
  }

  // Load bot configuration from API
  async function loadBotConfig() {
    try {
      const response = await fetch(`${API_URL}/api/public/bots/${BOT_ID}`);
      if (!response.ok) throw new Error('Failed to load bot config');

      const { bot } = await response.json();

      // Apply theme
      if (bot.theme_color) {
        document.documentElement.style.setProperty('--buildmybot-primary', bot.theme_color);
      }

      // Update title
      if (bot.name) {
        document.getElementById('buildmybot-title').textContent = bot.name;
      }

      // Send initial greeting if no conversation
      if (bot.initial_greeting && messages.length === 0) {
        setTimeout(() => {
          addMessage('bot', bot.initial_greeting);
        }, bot.initial_delay || 1000);
      }
    } catch (error) {
      console.error('BuildMyBot: Failed to load config', error);
    }
  }

  // Toggle chat window
  function toggleChat() {
    isOpen = !isOpen;
    const widget = document.getElementById('buildmybot-widget');
    const button = document.getElementById('buildmybot-button');

    if (isOpen) {
      widget.classList.add('open');
      button.classList.add('hidden');
      document.getElementById('buildmybot-input').focus();
    } else {
      widget.classList.remove('open');
      button.classList.remove('hidden');
    }
  }

  // Add message to chat
  function addMessage(role, content) {
    messages.push({ role, content, timestamp: Date.now() });
    saveConversation();
    renderMessages();
  }

  // Render all messages
  function renderMessages() {
    const container = document.getElementById('buildmybot-messages');
    container.innerHTML = messages.map(msg => `
      <div class="buildmybot-message buildmybot-message-${msg.role}">
        <div class="buildmybot-message-content">${escapeHtml(msg.content)}</div>
      </div>
    `).join('');

    // Add typing indicator if bot is typing
    if (isTyping) {
      container.innerHTML += `
        <div class="buildmybot-message buildmybot-message-bot">
          <div class="buildmybot-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // Send message to bot
  async function sendMessage() {
    const input = document.getElementById('buildmybot-input');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    addMessage('user', message);
    input.value = '';

    // Show typing indicator
    isTyping = true;
    renderMessages();

    try {
      const response = await fetch(`${API_URL}/api/public/chat/${BOT_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId,
          visitorId,
          metadata: {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
          }
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Save conversation ID
      if (data.conversationId && !conversationId) {
        conversationId = data.conversationId;
        saveConversation();
      }

      // Add bot response
      isTyping = false;
      addMessage('bot', data.message);

    } catch (error) {
      console.error('BuildMyBot: Failed to send message', error);
      isTyping = false;
      addMessage('bot', 'Sorry, I encountered an error. Please try again.');
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Inject styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --buildmybot-primary: #1e3a8a;
        --buildmybot-text: #1f2937;
        --buildmybot-bg: #ffffff;
        --buildmybot-gray: #f3f4f6;
      }

      #buildmybot-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--buildmybot-primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        z-index: 9998;
      }

      #buildmybot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      #buildmybot-button.hidden {
        opacity: 0;
        pointer-events: none;
      }

      #buildmybot-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 40px);
        background: var(--buildmybot-bg);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: all 0.3s ease;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      #buildmybot-widget.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      #buildmybot-header {
        background: var(--buildmybot-primary);
        color: white;
        padding: 20px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      #buildmybot-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      #buildmybot-subtitle {
        font-size: 13px;
        opacity: 0.9;
      }

      #buildmybot-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      #buildmybot-close:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      #buildmybot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .buildmybot-message {
        display: flex;
        max-width: 80%;
      }

      .buildmybot-message-user {
        align-self: flex-end;
      }

      .buildmybot-message-bot {
        align-self: flex-start;
      }

      .buildmybot-message-content {
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .buildmybot-message-user .buildmybot-message-content {
        background: var(--buildmybot-primary);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .buildmybot-message-bot .buildmybot-message-content {
        background: var(--buildmybot-gray);
        color: var(--buildmybot-text);
        border-bottom-left-radius: 4px;
      }

      .buildmybot-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: var(--buildmybot-gray);
        border-radius: 12px;
        border-bottom-left-radius: 4px;
      }

      .buildmybot-typing span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9ca3af;
        animation: buildmybot-typing 1.4s infinite;
      }

      .buildmybot-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .buildmybot-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes buildmybot-typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-8px); }
      }

      #buildmybot-input-container {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 8px;
      }

      #buildmybot-input {
        flex: 1;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        font-family: inherit;
      }

      #buildmybot-input:focus {
        border-color: var(--buildmybot-primary);
      }

      #buildmybot-send {
        background: var(--buildmybot-primary);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
      }

      #buildmybot-send:hover {
        opacity: 0.9;
      }

      #buildmybot-branding {
        text-align: center;
        padding: 12px;
        font-size: 12px;
        color: #9ca3af;
        border-top: 1px solid #e5e7eb;
      }

      #buildmybot-branding a {
        color: var(--buildmybot-primary);
        text-decoration: none;
        font-weight: 500;
      }

      #buildmybot-branding a:hover {
        text-decoration: underline;
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        #buildmybot-widget {
          width: 100%;
          height: 100%;
          max-height: 100vh;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }

        #buildmybot-header {
          border-radius: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    injectStyles();
    createWidget();
  }
})();
