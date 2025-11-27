(function () {
  const mountWidget = () => {
    if (document.getElementById('bmb-embed-frame')) return;
    if (!document.body) return;

    const defaultConfig = {
      botId: null,
      domain: window?.location?.hostname || 'localhost',
      protocol: window?.location?.protocol?.includes('https') ? 'https' : 'http',
      width: '380px',
      height: '520px',
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      border: 'none',
      zIndex: 9999,
    };

    const userConfig = window.bmbConfig || {};
    const config = { ...defaultConfig, ...userConfig };

    if (!config.botId) {
      console.warn('[BuildMyBot] Missing botId in bmbConfig. Embed widget aborted.');
      return;
    }

    const sanitizedDomain = String(config.domain || '').replace(/^https?:\/\//, '');
    if (!sanitizedDomain) {
      console.warn('[BuildMyBot] Invalid domain provided. Embed widget aborted.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'bmb-embed-frame';
    iframe.src = `${config.protocol}://${sanitizedDomain}/widget/${encodeURIComponent(config.botId)}`;
    iframe.style.position = config.position;
    iframe.style.bottom = config.bottom;
    iframe.style.right = config.right;
    iframe.style.width = config.width;
    iframe.style.height = config.height;
    iframe.style.border = config.border;
    iframe.style.zIndex = String(config.zIndex);
    iframe.setAttribute('title', 'BuildMyBot Chat Widget');
    iframe.setAttribute('allow', 'clipboard-write');

    iframe.addEventListener('load', () => {
      iframe.contentWindow?.postMessage({ type: 'bmb:loaded', botId: config.botId }, '*');
    });

    window.addEventListener('message', (event) => {
      if (!event?.data || event.data?.type !== 'bmb:resize') return;
      const { width, height } = event.data;
      if (width) iframe.style.width = `${width}`;
      if (height) iframe.style.height = `${height}`;
    });

    document.body.appendChild(iframe);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget, { once: true });
  } else {
    mountWidget();
  }
})();
