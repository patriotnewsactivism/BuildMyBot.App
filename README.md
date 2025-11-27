# BuildMyBot.App

Production-ready React + TypeScript single-page app for building and embedding AI chatbots. This repo includes a static build pipeline, Docker packaging, and an embeddable widget script.

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Environment variables
1. Copy the example file and populate values for your environment:
   ```bash
   cp .env.example .env
   ```
2. Update the placeholder values with your own secrets (OpenAI, Supabase, Stripe, Twilio, SendGrid). Never commit real secrets.

### Local development
```bash
npm install
npm run dev
```

### Production build
```bash
npm run build
```
The compiled assets are output to `dist/`.

## Docker deployment
A two-stage Dockerfile builds the Vite app and serves it with Nginx.
```bash
# Build the image
npm install
npm run build
# or build directly with Docker
# docker build -t buildmybot-app .
```
To run the production image locally:
```bash
docker build -t buildmybot-app .
docker run -p 8080:80 --env-file .env buildmybot-app
```
Then open `http://localhost:8080`.

## Embed widget
The public `embed.js` script mounts a chatbot iframe when included on a customer site.

```html
<script src="https://your-domain.com/embed.js"></script>
<script>
  window.bmbConfig = {
    botId: 'your-bot-id',
    domain: 'your-domain.com',
    protocol: 'https'
  };
</script>
```
- `botId` (required): Identifier for the bot to load.
- `domain`: Host where the widget is served (defaults to current hostname).
- `protocol`: `https` or `http` (defaults based on page protocol).
- You can optionally add `width`, `height`, `bottom`, `right`, and `zIndex` to adjust positioning.

## Security
- Do not expose API keys client-side. Keep secrets in environment variables or secure backend functions.
- Configure Supabase Row Level Security and Stripe webhook signatures before going live.
- Regenerate tokens and rotate keys if accidentally committed.
