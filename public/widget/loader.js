/**
 * BuildMyBot Widget Loader (v1.0.0)
 *
 * This is the lightweight loader script that gets embedded on client websites.
 * It creates an isolated iframe to load the actual chatbot widget, preventing
 * CSS conflicts and ensuring the bot can't break the host site (and vice versa).
 *
 * Usage:
 * <script>
 *   (function(w,d,b){
 *     w.BuildMyBot=w.BuildMyBot||{botId:b};
 *     var s=d.createElement('script');
 *     s.src='https://buildmybot.app/widget/loader.js';
 *     s.async=1;
 *     d.head.appendChild(s);
 *   })(window,document,'YOUR_BOT_ID');
 * </script>
 */

(function(window, document) {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://buildmybot.app';

  const config = window.BuildMyBot || {};
  const botId = config.botId;

  if (!botId) {
    console.error('[BuildMyBot] Error: No botId provided. Cannot initialize widget.');
    return;
  }

  // Prevent multiple initializations
  if (window.__BUILDMYBOT_LOADED__) {
    console.warn('[BuildMyBot] Widget already loaded. Skipping re-initialization.');
    return;
  }
  window.__BUILDMYBOT_LOADED__ = true;

  // Track widget lifecycle for analytics
  const trackEvent = function(eventName, data) {
    try {
      // Send event to BuildMyBot analytics
      const beacon = new Image();
      beacon.src = `${API_BASE}/api/track?event=${encodeURIComponent(eventName)}&botId=${encodeURIComponent(botId)}&data=${encodeURIComponent(JSON.stringify(data || {}))}`;
    } catch (e) {
      // Silently fail - analytics shouldn't break the widget
    }
  };

  // Error handler - log errors but never crash the host site
  const handleError = function(error, context) {
    console.error('[BuildMyBot] Error:', error, context);

    // Send error to monitoring (Sentry)
    trackEvent('widget_error', {
      error: error.message || String(error),
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Don't throw - fail gracefully
    return null;
  };

  // Widget state
  let widgetState = {
    isOpen: false,
    isMinimized: true,
    unreadCount: 0,
    iframe: null,
    container: null,
    bubble: null
  };

  /**
   * Create the widget container and iframe
   */
  const createWidget = function() {
    try {
      // Create container for the widget
      const container = document.createElement('div');
      container.id = 'buildmybot-widget-container';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      // Create the chat bubble (minimized state)
      const bubble = document.createElement('button');
      bubble.id = 'buildmybot-chat-bubble';
      bubble.setAttribute('aria-label', 'Open chat');
      bubble.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
      `;

      // Add bot icon SVG
      bubble.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;

      // Hover effect
      bubble.addEventListener('mouseenter', function() {
        bubble.style.transform = 'scale(1.1)';
        bubble.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      });

      bubble.addEventListener('mouseleave', function() {
        bubble.style.transform = 'scale(1)';
        bubble.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      // Click to open/close
      bubble.addEventListener('click', function() {
        toggleWidget();
      });

      // Create iframe for chat widget
      const iframe = document.createElement('iframe');
      iframe.id = 'buildmybot-chat-iframe';
      iframe.src = `${API_BASE}/chat/${botId}?mode=embed&v=${WIDGET_VERSION}`;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'microphone; camera');
      iframe.setAttribute('title', 'BuildMyBot Chat Widget');
      iframe.style.cssText = `
        display: none;
        width: 400px;
        height: 600px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px);
        border: none;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        background: white;
        position: fixed;
        bottom: 90px;
        right: 20px;
        transition: all 0.3s ease;
        z-index: 999999;
      `;

      // Mobile responsive
      if (window.innerWidth <= 768) {
        iframe.style.cssText += `
          width: calc(100vw - 20px);
          height: calc(100vh - 120px);
          bottom: 90px;
          right: 10px;
        `;
      }

      // Append to container
      container.appendChild(bubble);
      container.appendChild(iframe);

      // Append to body
      document.body.appendChild(container);

      // Store references
      widgetState.container = container;
      widgetState.iframe = iframe;
      widgetState.bubble = bubble;

      // Track widget load
      trackEvent('widget_loaded', {
        botId: botId,
        url: window.location.href,
        referrer: document.referrer
      });

      // Set up postMessage communication
      setupCommunication(iframe);

      return { container, iframe, bubble };

    } catch (error) {
      return handleError(error, 'createWidget');
    }
  };

  /**
   * Toggle widget open/closed
   */
  const toggleWidget = function() {
    try {
      widgetState.isOpen = !widgetState.isOpen;

      if (widgetState.isOpen) {
        // Open widget
        widgetState.iframe.style.display = 'block';
        widgetState.bubble.style.display = 'none';

        // Reset unread count
        widgetState.unreadCount = 0;
        updateBubbleBadge();

        // Track open event
        trackEvent('widget_opened', { botId: botId });

        // Send message to iframe
        sendMessageToWidget({ action: 'open' });

      } else {
        // Close widget
        widgetState.iframe.style.display = 'none';
        widgetState.bubble.style.display = 'flex';

        // Track close event
        trackEvent('widget_closed', { botId: botId });

        // Send message to iframe
        sendMessageToWidget({ action: 'close' });
      }

    } catch (error) {
      handleError(error, 'toggleWidget');
    }
  };

  /**
   * Update unread message badge on bubble
   */
  const updateBubbleBadge = function() {
    try {
      const existingBadge = widgetState.bubble.querySelector('.unread-badge');

      if (widgetState.unreadCount > 0 && !widgetState.isOpen) {
        if (!existingBadge) {
          const badge = document.createElement('div');
          badge.className = 'unread-badge';
          badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            border-radius: 10px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid white;
          `;
          badge.textContent = widgetState.unreadCount > 9 ? '9+' : widgetState.unreadCount;
          widgetState.bubble.appendChild(badge);
        } else {
          existingBadge.textContent = widgetState.unreadCount > 9 ? '9+' : widgetState.unreadCount;
        }
      } else if (existingBadge) {
        existingBadge.remove();
      }
    } catch (error) {
      handleError(error, 'updateBubbleBadge');
    }
  };

  /**
   * Set up postMessage communication with iframe
   */
  const setupCommunication = function(iframe) {
    try {
      window.addEventListener('message', function(event) {
        // Verify origin for security
        const allowedOrigins = [API_BASE, 'http://localhost:8080'];
        if (!allowedOrigins.includes(event.origin)) {
          return;
        }

        const message = event.data;

        // Handle messages from the iframe
        switch (message.action) {
          case 'close':
            toggleWidget();
            break;

          case 'resize':
            if (message.width) iframe.style.width = message.width + 'px';
            if (message.height) iframe.style.height = message.height + 'px';
            break;

          case 'newMessage':
            if (!widgetState.isOpen) {
              widgetState.unreadCount++;
              updateBubbleBadge();
            }
            break;

          case 'ready':
            // Widget iframe is ready
            console.log('[BuildMyBot] Widget ready');
            break;

          default:
            console.log('[BuildMyBot] Unknown message:', message);
        }
      });

    } catch (error) {
      handleError(error, 'setupCommunication');
    }
  };

  /**
   * Send message to widget iframe
   */
  const sendMessageToWidget = function(message) {
    try {
      if (widgetState.iframe && widgetState.iframe.contentWindow) {
        widgetState.iframe.contentWindow.postMessage(message, API_BASE);
      }
    } catch (error) {
      handleError(error, 'sendMessageToWidget');
    }
  };

  /**
   * Public API
   */
  window.BuildMyBot = {
    ...config,
    open: function() {
      if (!widgetState.isOpen) toggleWidget();
    },
    close: function() {
      if (widgetState.isOpen) toggleWidget();
    },
    toggle: toggleWidget,
    sendMessage: function(text) {
      sendMessageToWidget({ action: 'sendMessage', text: text });
      if (!widgetState.isOpen) toggleWidget();
    },
    version: WIDGET_VERSION
  };

  /**
   * Initialize widget when DOM is ready
   */
  const init = function() {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
      } else {
        createWidget();
      }
    } catch (error) {
      handleError(error, 'init');
    }
  };

  // Start initialization
  init();

})(window, document);
