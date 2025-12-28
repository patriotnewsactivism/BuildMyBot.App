// embed.js
// This script allows users to embed their BuildMyBot chatbot on their own websites
// It loads the chatbot as an iframe widget in the bottom right corner

(function() {
  // Get script configuration from data attributes
  var script = document.currentScript;
  var botId = script ? script.getAttribute('data-bot-id') : null;
  var baseUrl = script ? script.getAttribute('src').split('/embed.js')[0] : 'https://buildmybot.app';
  
  if (!botId) {
    console.error('BuildMyBot: data-bot-id attribute is missing');
    return;
  }
  
  // Create styles
  var style = document.createElement('style');
  style.innerHTML = `
    .buildmybot-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    .buildmybot-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #0070f3;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background-color 0.2s;
    }
    
    .buildmybot-launcher:hover {
      transform: scale(1.05);
      background-color: #0060df;
    }
    
    .buildmybot-icon {
      width: 32px;
      height: 32px;
      fill: white;
    }
    
    .buildmybot-iframe-container {
      width: 400px;
      height: 600px;
      max-width: 90vw;
      max-height: 80vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
      margin-bottom: 20px;
      overflow: hidden;
      display: none;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s, transform 0.3s;
    }
    
    .buildmybot-iframe-container.open {
      display: block;
      opacity: 1;
      transform: translateY(0);
    }
    
    .buildmybot-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    @media (max-width: 480px) {
      .buildmybot-iframe-container {
        width: 100vw;
        height: 100vh;
        max-width: 100%;
        max-height: 100%;
        position: fixed;
        bottom: 0;
        right: 0;
        margin-bottom: 0;
        border-radius: 0;
      }
      
      .buildmybot-widget-container.open {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Create container
  var container = document.createElement('div');
  container.className = 'buildmybot-widget-container';
  document.body.appendChild(container);
  
  // Create iframe container
  var iframeContainer = document.createElement('div');
  iframeContainer.className = 'buildmybot-iframe-container';
  container.appendChild(iframeContainer);
  
  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.className = 'buildmybot-iframe';
  // Use a blank page initially to prevent loading until opened (optional optimization)
  // or load immediately
  iframe.src = baseUrl + '/chat/' + botId + '?embed=true';
  iframeContainer.appendChild(iframe);
  
  // Create launcher button
  var launcher = document.createElement('div');
  launcher.className = 'buildmybot-launcher';
  launcher.innerHTML = `
    <svg class="buildmybot-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  `;
  container.appendChild(launcher);
  
  // Handle click
  var isOpen = false;
  launcher.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.classList.add('open');
      container.classList.add('open');
      launcher.innerHTML = `
        <svg class="buildmybot-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      `;
    } else {
      iframeContainer.classList.remove('open');
      container.classList.remove('open');
      launcher.innerHTML = `
        <svg class="buildmybot-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      `;
    }
  });
})();
