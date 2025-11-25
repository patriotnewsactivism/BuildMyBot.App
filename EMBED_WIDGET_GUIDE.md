# Embed Widget Guide
## Add AI Chatbots to Any Website

**Last Updated:** November 25, 2025

---

## Overview

The BuildMyBot embed widget allows you to add AI-powered chatbots to any website with a simple JavaScript snippet. The widget is:

- ✅ **Lightweight** - Under 10KB, loads instantly
- ✅ **Responsive** - Works on desktop, tablet, and mobile
- ✅ **Customizable** - Matches your brand colors
- ✅ **Persistent** - Conversations saved across page loads
- ✅ **Secure** - No sensitive data exposed to browser
- ✅ **Privacy-Friendly** - GDPR compliant

---

## Quick Start

### 1. Get Your Bot ID

1. Log in to your BuildMyBot dashboard
2. Go to **Bots** section
3. Copy your bot ID (e.g., `b_1234567890abcdef`)

### 2. Add the Code to Your Website

Add this snippet just before the closing `</body>` tag on your website:

```html
<!-- BuildMyBot Widget -->
<script>
  window.buildMyBotConfig = {
    botId: 'YOUR_BOT_ID_HERE'
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

Replace `YOUR_BOT_ID_HERE` with your actual bot ID.

### 3. Test It!

Refresh your website and you should see a blue chat button in the bottom-right corner. Click it to open the chat widget!

---

## Installation Options

### Option 1: Direct Script Tag (Recommended)

```html
<script>
  window.buildMyBotConfig = {
    botId: 'b_1234567890abcdef'
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

**Pros:**
- Simplest installation
- Automatically updated with new features
- CDN-cached for fast loading

**Cons:**
- Requires external script load

### Option 2: Self-Hosted

Download `embed.js` and host it on your own server:

```html
<script>
  window.buildMyBotConfig = {
    botId: 'b_1234567890abcdef',
    apiUrl: 'https://buildmybot.app' // Still points to our API
  };
</script>
<script src="/js/embed.js"></script>
```

**Pros:**
- Full control over script
- Can customize for your needs
- Works offline (cached)

**Cons:**
- Must manually update for new features
- Slightly slower loading (no CDN)

### Option 3: Google Tag Manager

1. In GTM, create a new **Custom HTML** tag
2. Paste the widget code:

```html
<script>
  window.buildMyBotConfig = {
    botId: 'b_1234567890abcdef'
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

3. Set trigger to **All Pages**
4. Publish changes

**Pros:**
- No code changes to website
- Easy A/B testing
- Can trigger on specific pages

**Cons:**
- Requires GTM access
- Slightly delayed loading

---

## Configuration Options

### Basic Configuration

```javascript
window.buildMyBotConfig = {
  // Required
  botId: 'b_1234567890abcdef',

  // Optional
  apiUrl: 'https://buildmybot.app', // Custom API URL
};
```

### Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `botId` | `string` | *Required* | Your bot's unique ID |
| `apiUrl` | `string` | `'https://buildmybot.app'` | API endpoint URL |

More options coming in future updates:
- Custom position (left/right, top/bottom)
- Custom button icon
- Custom greeting message
- Auto-open delay
- Trigger on scroll/time
- Custom CSS classes

---

## Widget Behavior

### Initial State

When the page loads:
1. Widget button appears in bottom-right corner
2. After delay (configured in dashboard), bot may show initial greeting
3. Previous conversations are restored from browser storage

### Conversation Persistence

Conversations are saved in the visitor's browser using `localStorage`:
- Continues across page reloads
- Persists across sessions
- Cleared when browser cache is cleared
- Separate conversations per bot

### Visitor Tracking

Each visitor gets a unique ID:
- Generated on first visit
- Stored in `localStorage`
- Used to track conversations
- Anonymous (no personal data)

---

## Features

### 1. Lead Capture

The widget automatically detects and captures:

**Email Addresses:**
- `john@example.com`
- `contact@company.co.uk`
- Any valid email format

**Phone Numbers:**
- `(555) 123-4567`
- `555-123-4567`
- `+1 555 123 4567`
- International formats

Captured leads appear in your dashboard **Leads CRM** section.

### 2. Hot Lead Alerts

When a visitor provides contact info AND engages significantly:
- Lead score is calculated (0-100)
- If score exceeds threshold (default: 75), webhook fires
- You receive instant notification
- Can configure email/SMS alerts

### 3. Sentiment Analysis

Each conversation is analyzed for sentiment:
- Positive (happy customer)
- Neutral (information seeking)
- Negative (frustrated/angry)

Helps prioritize responses and identify issues.

### 4. Usage Tracking

All conversations are logged for:
- Analytics dashboard
- Performance monitoring
- Plan limit enforcement
- Billing purposes

---

## Customization

### Theme Colors

Configure in your bot settings (dashboard):
- Primary color (buttons, header)
- Text colors
- Background colors

Changes apply immediately to all embedded widgets.

### Initial Greeting

Set a custom greeting message:
- "Hi! How can I help you today?"
- "Welcome to [Company]! I'm here to assist."
- Any message you want

Configure greeting delay (default: 1 second).

### Bot Personality

Customize via system prompt:
- Formal vs. casual tone
- Industry-specific language
- Branding guidelines
- Response style

---

## Browser Support

### Supported Browsers

✅ Chrome 90+ (including mobile)
✅ Firefox 88+ (including mobile)
✅ Safari 14+ (including iOS)
✅ Edge 90+
✅ Opera 75+

### Not Supported

❌ Internet Explorer 11 and below
❌ Very old mobile browsers (iOS < 12, Android < 7)

---

## Performance

### Load Time

- Script size: ~9KB gzipped
- Initial load: < 100ms
- No impact on page speed
- Lazy-loaded resources

### Resource Usage

- Minimal CPU usage
- ~2MB memory footprint
- Network: Only API calls when chatting
- No background processes

---

## Privacy & Security

### Data Collection

We collect:
- Conversation messages
- Visitor ID (anonymous)
- Page URL and referrer
- Timestamp
- User agent (browser info)

We DO NOT collect:
- Personal data (unless voluntarily shared)
- Browsing history
- Cookies (beyond localStorage)
- IP addresses (logged server-side only)

### GDPR Compliance

The widget is GDPR compliant:
- No cookies without consent
- Anonymous visitor tracking
- Data export available
- Data deletion on request
- Privacy policy provided

### Security

- All API calls over HTTPS
- No sensitive data in browser
- XSS protection built-in
- Rate limiting on backend
- Input sanitization

---

## Troubleshooting

### Widget Not Appearing

**Check 1: Bot ID Correct?**
```javascript
console.log(window.buildMyBotConfig.botId);
```

**Check 2: Script Loaded?**
```javascript
console.log(document.querySelector('script[src*="embed.js"]'));
```

**Check 3: Bot Active?**
- Log in to dashboard
- Check bot is marked "Active"
- Check bot hasn't been deleted

### Widget Not Responding

**Check 1: Network Errors?**
- Open browser console (F12)
- Check for error messages
- Verify API URL is correct

**Check 2: Bot Configuration?**
- Ensure bot has system prompt
- Check model is set (gpt-4o-mini)
- Verify OpenAI API key is configured

### Conversations Not Saving

**Check 1: LocalStorage Available?**
```javascript
console.log(localStorage.getItem('buildmybot_visitor_id'));
```

**Check 2: Browser Privacy Settings?**
- Check if localStorage is blocked
- Try in incognito mode
- Check browser settings

---

## Testing

### Local Testing

For testing on `localhost`:

```javascript
window.buildMyBotConfig = {
  botId: 'b_test123',
  apiUrl: 'http://localhost:3000'
};
```

### Staging Environment

Create a test bot for staging:
- Separate from production bot
- Can test freely without affecting users
- Clone production bot settings

---

## Examples

### E-Commerce Website

```html
<!-- Product page with chatbot -->
<script>
  window.buildMyBotConfig = {
    botId: 'b_ecommerce_bot',
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

Bot configured for:
- Product recommendations
- Order status inquiries
- Shipping questions
- Return policy

### SaaS Landing Page

```html
<!-- Landing page with chatbot -->
<script>
  window.buildMyBotConfig = {
    botId: 'b_saas_sales_bot',
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

Bot configured for:
- Feature explanations
- Pricing questions
- Demo booking
- Trial signup

### Support Portal

```html
<!-- Help center with chatbot -->
<script>
  window.buildMyBotConfig = {
    botId: 'b_support_bot',
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

Bot configured for:
- Troubleshooting
- FAQ answers
- Ticket creation
- Documentation search

---

## API Reference

### Public Endpoints

The widget calls these endpoints:

#### Get Bot Configuration

```
GET /api/public/bots/{botId}
```

Returns:
- Bot name
- Theme colors
- Initial greeting
- Active status

#### Send Chat Message

```
POST /api/public/chat/{botId}
```

Body:
```json
{
  "message": "Hello!",
  "conversationId": "conv_123",
  "visitorId": "visitor_abc",
  "metadata": {
    "url": "https://example.com/page",
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0..."
  }
}
```

Response:
```json
{
  "conversationId": "conv_123",
  "message": "Hi! How can I help you today?"
}
```

---

## Advanced Usage

### Multiple Bots on Same Page

You can have different bots on different pages:

```html
<!-- Homepage -->
<script>
  window.buildMyBotConfig = { botId: 'b_homepage_bot' };
</script>
<script src="https://buildmybot.app/embed.js"></script>

<!-- Pricing page -->
<script>
  window.buildMyBotConfig = { botId: 'b_sales_bot' };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

**Note:** Only one bot can be active per page. Use page-specific bots, not multiple on same page.

### Programmatic Control

Access the widget via JavaScript (coming soon):

```javascript
// Open chat programmatically
window.BuildMyBot.open();

// Close chat
window.BuildMyBot.close();

// Send message programmatically
window.BuildMyBot.sendMessage('Hello!');

// Get conversation history
const history = window.BuildMyBot.getHistory();
```

---

## Migration Guide

### From Intercom

Replace:
```html
<script>
  window.intercomSettings = {
    app_id: "abc123"
  };
</script>
<script src="https://widget.intercom.io/widget/abc123"></script>
```

With:
```html
<script>
  window.buildMyBotConfig = {
    botId: 'YOUR_BOT_ID'
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

### From Drift

Replace:
```html
<script>
  !function() {
    var t = window.driftt = window.drift = window.driftt || [];
    // ... drift code
  }();
</script>
```

With:
```html
<script>
  window.buildMyBotConfig = {
    botId: 'YOUR_BOT_ID'
  };
</script>
<script src="https://buildmybot.app/embed.js"></script>
```

---

## FAQ

### Q: Does it slow down my website?

**A:** No. The widget is under 10KB and loads asynchronously. It won't affect your page speed or SEO.

### Q: Can I customize the appearance?

**A:** Yes! Configure theme colors, position, and styling in your bot settings.

### Q: Does it work on mobile?

**A:** Yes! The widget is fully responsive and works great on mobile devices.

### Q: How many conversations can I have?

**A:** Depends on your plan. Free: 50/mo, Starter: 500/mo, Professional: 2K/mo, etc.

### Q: Can I use it on multiple websites?

**A:** Yes! Same bot can be embedded on unlimited websites.

### Q: Is it GDPR compliant?

**A:** Yes. We follow GDPR guidelines and provide data export/deletion options.

---

## Support

Need help? We're here for you:

- **Documentation:** https://buildmybot.app/docs
- **Email:** support@buildmybot.app
- **Live Chat:** Click the blue button on our website!

---

## Changelog

### Version 1.0.0 (November 2025)
- Initial release
- Lead capture
- Conversation persistence
- Mobile responsive
- Theme customization

### Upcoming Features
- Voice input
- File attachments
- Typing indicators
- Read receipts
- Custom positioning
- A/B testing support

---

*Last updated: November 25, 2025*
