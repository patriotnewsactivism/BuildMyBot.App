(function () {
  var config = window.bmbConfig || {};
  var botId = config.botId;

  if (!botId) {
    console.warn('[BuildMyBot] Missing botId in window.bmbConfig. Widget will not render.');
    return;
  }

  if (document.getElementById('bmb-widget-frame')) {
    return;
  }

  var scriptSrc = document.currentScript ? document.currentScript.src : null;
  var derivedHost = null;
  if (config.domain) {
    derivedHost = config.domain.replace(/^https?:\/\//, '');
  } else if (scriptSrc) {
    try {
      derivedHost = new URL(scriptSrc).host;
    } catch (e) {
      derivedHost = window.location.host;
    }
  } else {
    derivedHost = window.location.host;
  }

  var protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  var widgetUrl = protocol + '//' + derivedHost + '/widget/' + encodeURIComponent(botId);

  var iframe = document.createElement('iframe');
  iframe.id = 'bmb-widget-frame';
  iframe.src = widgetUrl;
  iframe.title = config.title || 'BuildMyBot Chat';
  iframe.style.position = 'fixed';
  iframe.style.bottom = (config.bottomOffset || 20) + 'px';
  iframe.style.right = (config.rightOffset || 20) + 'px';
  iframe.style.width = (config.width || 380) + 'px';
  iframe.style.height = (config.height || 520) + 'px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 12px 40px rgba(0,0,0,0.16)';
  iframe.style.zIndex = config.zIndex || 2147483000;

  if (config.allowMicrophone === true) {
    iframe.allow = 'microphone';
  }

  document.body.appendChild(iframe);
})();
