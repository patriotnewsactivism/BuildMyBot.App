/**
 * BuildMyBot Embed Widget v2.0
 * Add this script to any website to embed a chat widget
 *
 * Usage:
 * <script>
 *   window.bmbConfig = {
 *     botId: "your-bot-id",
 *     theme: "#1e3a8a",
 *     position: "bottom-right", // or "bottom-left"
 *     welcomeMessage: "Hi! How can I help you?",
 *     domain: "buildmybot.app" // or your custom domain
 *   };
 * </script>
 * <script src="https://buildmybot.app/embed.js" async></script>
 */

(function() {
  'use strict';

  // Get configuration
  var config = window.bmbConfig || {};
  var botId = config.botId;
  var theme = config.theme || '#1e3a8a';
  var position = config.position || 'bottom-right';
  var welcomeMessage = config.welcomeMessage || 'Hi! How can I help you today?';
  var domain = config.domain || 'buildmybot.app';
  var lazyLoad = config.lazyLoad !== false; // Default true - load iframe on first open

  if (!botId) {
    console.error('BuildMyBot: botId is required in window.bmbConfig');
    return;
  }

  // Build the chat URL
  var protocol = 'https:';
  var chatUrl = protocol + '//' + domain + '/chat/' + botId + '?mode=widget';

  // Create styles
  var styles = document.createElement('style');
  styles.id = 'bmb-widget-styles';
  styles.textContent = '\
    .bmb-widget-container {\
      position: fixed;\
      ' + (position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;') + '\
      bottom: 20px;\
      z-index: 999999;\
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\
    }\
    .bmb-widget-button {\
      width: 60px;\
      height: 60px;\
      border-radius: 50%;\
      background-color: ' + theme + ';\
      border: none;\
      cursor: pointer;\
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      transition: transform 0.2s ease, box-shadow 0.2s ease;\
    }\
    .bmb-widget-button:hover {\
      transform: scale(1.05);\
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);\
    }\
    .bmb-widget-button svg {\
      width: 28px;\
      height: 28px;\
    }\
    .bmb-widget-button.open .bmb-chat-icon { display: none; }\
    .bmb-widget-button.open .bmb-close-icon { display: block; }\
    .bmb-widget-button .bmb-close-icon { display: none; }\
    .bmb-chat-window {\
      position: absolute;\
      ' + (position === 'bottom-left' ? 'left: 0;' : 'right: 0;') + '\
      bottom: 70px;\
      width: 380px;\
      height: 550px;\
      background: white;\
      border-radius: 16px;\
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);\
      overflow: hidden;\
      opacity: 0;\
      transform: translateY(20px) scale(0.95);\
      transition: opacity 0.3s ease, transform 0.3s ease;\
      pointer-events: none;\
    }\
    .bmb-chat-window.open {\
      opacity: 1;\
      transform: translateY(0) scale(1);\
      pointer-events: auto;\
    }\
    .bmb-chat-window iframe {\
      width: 100%;\
      height: 100%;\
      border: none;\
    }\
    .bmb-welcome-bubble {\
      position: absolute;\
      ' + (position === 'bottom-left' ? 'left: 70px;' : 'right: 70px;') + '\
      bottom: 10px;\
      background: white;\
      padding: 12px 16px;\
      border-radius: 12px;\
      ' + (position === 'bottom-left' ? 'border-bottom-left-radius: 4px;' : 'border-bottom-right-radius: 4px;') + '\
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\
      max-width: 220px;\
      font-size: 14px;\
      color: #334155;\
      opacity: 0;\
      transform: translateY(10px);\
      transition: opacity 0.3s ease, transform 0.3s ease;\
      pointer-events: none;\
    }\
    .bmb-welcome-bubble.show {\
      opacity: 1;\
      transform: translateY(0);\
      pointer-events: auto;\
      cursor: pointer;\
    }\
    .bmb-welcome-bubble.hide { display: none; }\
    .bmb-welcome-close {\
      position: absolute;\
      top: -8px;\
      right: -8px;\
      width: 20px;\
      height: 20px;\
      background: #94a3b8;\
      border: none;\
      border-radius: 50%;\
      cursor: pointer;\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      font-size: 14px;\
      color: white;\
      line-height: 1;\
    }\
    .bmb-welcome-close:hover { background: #64748b; }\
    @media (max-width: 480px) {\
      .bmb-chat-window {\
        width: calc(100vw - 40px);\
        height: calc(100vh - 120px);\
        ' + (position === 'bottom-left' ? 'left: 0;' : 'right: 0;') + '\
        bottom: 80px;\
        border-radius: 12px;\
      }\
      .bmb-welcome-bubble { display: none; }\
      .bmb-widget-container {\
        ' + (position === 'bottom-left' ? 'left: 10px;' : 'right: 10px;') + '\
        bottom: 10px;\
      }\
    }\
  ';
  document.head.appendChild(styles);

  // Create widget container
  var container = document.createElement('div');
  container.className = 'bmb-widget-container';
  container.id = 'bmb-widget-container';

  // Create welcome bubble
  var welcomeBubble = document.createElement('div');
  welcomeBubble.className = 'bmb-welcome-bubble';
  welcomeBubble.innerHTML = welcomeMessage + '<button class="bmb-welcome-close" aria-label="Close">&times;</button>';

  // Create chat window
  var chatWindow = document.createElement('div');
  chatWindow.className = 'bmb-chat-window';

  var iframe = document.createElement('iframe');
  iframe.title = 'BuildMyBot Chat Widget';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'microphone');
  chatWindow.appendChild(iframe);

  // Create button
  var button = document.createElement('button');
  button.className = 'bmb-widget-button';
  button.setAttribute('aria-label', 'Open chat');
  button.innerHTML = '\
    <svg class="bmb-chat-icon" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">\
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>\
    </svg>\
    <svg class="bmb-close-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
      <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>\
    </svg>\
  ';

  // Assemble widget
  container.appendChild(welcomeBubble);
  container.appendChild(chatWindow);
  container.appendChild(button);
  document.body.appendChild(container);

  // State
  var isOpen = false;
  var iframeLoaded = false;
  var welcomeDismissed = false;

  // Show welcome bubble after delay
  setTimeout(function() {
    if (!isOpen && !welcomeDismissed) {
      welcomeBubble.classList.add('show');
    }
  }, 2500);

  // Auto-hide welcome bubble after showing for a while
  setTimeout(function() {
    if (!isOpen && !welcomeDismissed) {
      welcomeBubble.classList.remove('show');
    }
  }, 12000);

  // Close welcome bubble
  var closeBtn = welcomeBubble.querySelector('.bmb-welcome-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      welcomeBubble.classList.remove('show');
      welcomeBubble.classList.add('hide');
      welcomeDismissed = true;
    });
  }

  // Toggle chat
  function toggleChat() {
    isOpen = !isOpen;

    if (isOpen) {
      // Load iframe on first open (lazy loading)
      if (!iframeLoaded) {
        iframe.src = chatUrl;
        iframeLoaded = true;
      }

      chatWindow.classList.add('open');
      button.classList.add('open');
      welcomeBubble.classList.remove('show');
      welcomeBubble.classList.add('hide');
      button.setAttribute('aria-label', 'Close chat');
    } else {
      chatWindow.classList.remove('open');
      button.classList.remove('open');
      button.setAttribute('aria-label', 'Open chat');
    }
  }

  button.addEventListener('click', toggleChat);

  // Also open on welcome bubble click
  welcomeBubble.addEventListener('click', function(e) {
    if (!e.target.classList.contains('bmb-welcome-close')) {
      toggleChat();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) {
      toggleChat();
    }
  });

  // Expose public API for programmatic control
  window.BuildMyBot = {
    open: function() {
      if (!isOpen) toggleChat();
    },
    close: function() {
      if (isOpen) toggleChat();
    },
    toggle: toggleChat,
    isOpen: function() {
      return isOpen;
    }
  };

  // Log successful initialization
  console.log('BuildMyBot widget initialized for bot:', botId);

})();
