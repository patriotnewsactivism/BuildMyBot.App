# BuildMyBot Widget Integration Guide

## Quick Start

Copy and paste this code into your website's HTML, just before the closing `</body>` tag:

```html
<!-- BuildMyBot Chat Widget -->
<script>
  (function(w,d,b){
    w.BuildMyBot=w.BuildMyBot||{botId:b};
    var s=d.createElement('script');
    s.src='https://buildmybot.app/widget/loader.js';
    s.async=1;
    d.head.appendChild(s);
  })(window,document,'YOUR_BOT_ID');
</script>
```

**Replace `YOUR_BOT_ID`** with your actual bot ID from the BuildMyBot dashboard.

## Features

✅ **Isolated & Safe**: Uses iframe isolation to prevent CSS conflicts
✅ **Lightweight**: Only ~2KB initial load
✅ **Mobile Responsive**: Automatically adapts to screen size
✅ **Error Resilient**: Graceful degradation if API is down
✅ **Privacy Focused**: Respects Do Not Track settings
✅ **Analytics Built-in**: Tracks widget loads and interactions

## Advanced Configuration

### Custom Position

```html
<script>
  (function(w,d,b){
    w.BuildMyBot=w.BuildMyBot||{
      botId: b,
      position: 'bottom-left', // Options: 'bottom-right', 'bottom-left'
      theme: {
        primaryColor: '#667eea',
        bubbleSize: 60
      }
    };
    var s=d.createElement('script');
    s.src='https://buildmybot.app/widget/loader.js';
    s.async=1;
    d.head.appendChild(s);
  })(window,document,'YOUR_BOT_ID');
</script>
```

### JavaScript API

Once loaded, you can control the widget programmatically:

```javascript
// Open the chat widget
BuildMyBot.open();

// Close the chat widget
BuildMyBot.close();

// Toggle open/closed
BuildMyBot.toggle();

// Send a message programmatically
BuildMyBot.sendMessage('Hello from JavaScript!');

// Check widget version
console.log(BuildMyBot.version);
```

### Triggering Widget on Events

```javascript
// Open widget when user clicks a button
document.getElementById('contact-btn').addEventListener('click', function() {
  BuildMyBot.open();
});

// Auto-open after 10 seconds
setTimeout(function() {
  BuildMyBot.open();
}, 10000);
```

## Platform-Specific Instructions

### WordPress

1. Go to **Appearance > Theme Editor**
2. Open `footer.php`
3. Paste the embed code before `</body>`
4. Save changes

### Wix

1. Go to **Settings > Custom Code**
2. Click **Add Custom Code**
3. Paste the embed code
4. Set load location to **Body - End**
5. Save and publish

### Shopify

1. Go to **Online Store > Themes**
2. Click **Actions > Edit Code**
3. Open `theme.liquid`
4. Paste the embed code before `</body>`
5. Save

### Squarespace

1. Go to **Settings > Advanced > Code Injection**
2. Paste the embed code in **Footer**
3. Save

### Webflow

1. Go to **Project Settings > Custom Code**
2. Paste the embed code in **Footer Code**
3. Publish site

## Troubleshooting

### Widget not appearing?

1. **Check bot ID**: Ensure you replaced `YOUR_BOT_ID` with your actual ID
2. **Check console**: Open browser DevTools (F12) and look for errors
3. **Ad blockers**: Some ad blockers may block the widget
4. **CSP headers**: If you have Content Security Policy headers, add:
   ```
   frame-src https://buildmybot.app;
   script-src https://buildmybot.app;
   ```

### Widget appears but doesn't work?

1. **Check internet connection**: Widget requires active connection
2. **Check bot status**: Ensure bot is active in dashboard
3. **Browser compatibility**: Requires modern browser (Chrome, Firefox, Safari, Edge)

## Security & Privacy

- Widget runs in isolated iframe for maximum security
- No cookies or tracking without consent
- GDPR and CCPA compliant
- All data encrypted in transit (HTTPS)
- Respects Do Not Track browser setting

## Performance

- **Initial load**: ~2KB (loader script)
- **Full widget**: ~100KB (loaded on-demand)
- **No impact on page speed**: Loads asynchronously
- **CDN delivery**: Served from global CDN for fast loading

## Support

Need help? Contact support@buildmybot.app or visit https://docs.buildmybot.app
