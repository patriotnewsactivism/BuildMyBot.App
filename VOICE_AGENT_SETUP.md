# Voice Agent Setup Guide

This guide will help you set up the AI voice agent using Twilio + Cartesia for ultra-low latency phone calls.

## Architecture

- **Twilio**: Handles incoming calls and telephony
- **Cartesia Sonic**: Text-to-speech with sub-200ms latency (~10x faster than ElevenLabs)
- **Supabase Edge Functions**: Processes calls in real-time via WebSocket streaming
- **Real-time transcripts**: Automatically logged to your database

## Prerequisites

1. **Twilio Account** - [Sign up here](https://www.twilio.com/try-twilio)
2. **Cartesia Account** - [Get API key here](https://cartesia.ai)
3. **Supabase Project** - Already configured ✅

## Step-by-Step Setup

### 1. Get Your API Keys

#### Cartesia API Key
1. Go to [https://cartesia.ai](https://cartesia.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `cartesia_...`)

#### Twilio Credentials
1. Log in to [Twilio Console](https://console.twilio.com)
2. Find your **Account SID** (starts with `AC...`)
3. Find your **Auth Token** (click to reveal)
4. Buy a phone number if you don't have one:
   - Go to Phone Numbers → Buy a Number
   - Choose a number (voice-enabled)
   - Note the Phone Number SID (starts with `PN...`)

### 2. Configure Supabase Secrets

Run these commands in your terminal:

```bash
# Set Cartesia API key
supabase secrets set CARTESIA_API_KEY=your_cartesia_api_key_here

# Set Twilio credentials
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Optional: Set your Twilio phone number
supabase secrets set TWILIO_PHONE_NUMBER=+15551234567
```

### 3. Deploy Supabase Edge Functions

Deploy the voice agent edge functions:

```bash
# Deploy all functions
supabase functions deploy twilio-voice-handler
supabase functions deploy twilio-voice-stream
supabase functions deploy twilio-call-webhook
```

Get your webhook URLs (replace `<your-project>` with your Supabase project ID):

- **Voice Handler**: `https://<your-project>.supabase.co/functions/v1/twilio-voice-handler`
- **Status Callback**: `https://<your-project>.supabase.co/functions/v1/twilio-call-webhook`

### 4. Configure Twilio Phone Number

1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/active)
2. Click on your phone number
3. Scroll to "Voice Configuration"
4. Set **A CALL COMES IN**:
   - Webhook: `https://<your-project>.supabase.co/functions/v1/twilio-voice-handler`
   - HTTP Method: `POST`
5. Set **STATUS CALLBACK URL**:
   - URL: `https://<your-project>.supabase.co/functions/v1/twilio-call-webhook`
   - HTTP Method: `POST`
6. Click **Save**

### 5. Configure in BuildMyBot App

1. Navigate to **Phone Agent** section in your dashboard
2. Enter your Twilio Phone Number SID in the configuration
3. Customize your greeting message
4. Choose a voice (alloy, echo, fable, onyx, nova, shimmer)
5. Enable the agent
6. Click **Save Configuration**

## Testing Your Setup

### Test Call
1. Call your Twilio phone number
2. You should hear your custom greeting
3. The AI will respond to your questions using Cartesia's ultra-fast voice synthesis
4. All calls are automatically logged in the "Recent Calls" section

### Simulator
Use the built-in call simulator to:
- Test your configuration without making real calls
- Preview how transcripts will be captured
- Log simulated calls to your database

## Voice Options

The agent supports multiple Cartesia voices mapped to friendly names:

| Name | Cartesia Voice ID | Description |
|------|-------------------|-------------|
| alloy | 79a125e8-cd45-4c13-8a67-188112f4dd22 | Neutral, balanced |
| echo | a167e0f3-df7e-4d52-a9c3-f949145efdab | Clear, professional |
| fable | bf991597-6c13-47e4-8411-91ec2de5c466 | Warm, friendly |
| onyx | 41534e16-2966-4c6b-9670-111411def906 | Deep, authoritative |
| nova | 79a125e8-cd45-4c13-8a67-188112f4dd22 | Bright, energetic |
| shimmer | a167e0f3-df7e-4d52-a9c3-f949145efdab | Soft, welcoming |

## Performance & Pricing

### Cartesia Sonic
- **Latency**: ~150-200ms (sub-200ms)
- **Pricing**: ~$0.05 per 1,000 characters
- **Model**: sonic-english (streaming optimized)

### Comparison to ElevenLabs
- **10x faster**: 200ms vs 500-800ms latency
- **6x cheaper**: $0.05 vs $0.30 per 1K characters
- **Better for real-time**: Optimized for conversational AI

### Twilio Costs
- **Voice calls**: $0.0085/minute (US)
- **Phone number**: $1/month
- See [Twilio Pricing](https://www.twilio.com/voice/pricing/us)

## Troubleshooting

### Calls not connecting
- ✅ Check that voice handler URL is correctly configured in Twilio
- ✅ Verify Supabase functions are deployed: `supabase functions list`
- ✅ Check function logs: `supabase functions logs twilio-voice-handler`

### No transcripts showing up
- ✅ Verify status callback URL is configured in Twilio
- ✅ Check that TWILIO_AUTH_TOKEN is set (enables signature validation)
- ✅ Ensure your phone number is saved in PhoneAgent configuration

### Voice quality issues
- ✅ Try a different voice option
- ✅ Check your internet connection
- ✅ Verify Cartesia API key is valid

### Signature validation failing
```bash
# Check if auth token is set correctly
supabase secrets list

# Re-set if needed
supabase secrets set TWILIO_AUTH_TOKEN=your_token
```

## Advanced Configuration

### Custom System Prompts
The voice agent uses your bot's system prompt. To customize:
1. Go to **Bot Builder**
2. Edit your bot's system prompt
3. The voice agent will automatically use this for conversations

### Recording Calls
To enable call recording, update your Twilio webhook configuration:
1. Enable "Record" in Twilio phone number settings
2. Recordings will be available in call logs

### Lead Capture
When the AI detects a hot lead during a call:
- Automatically creates a lead in your CRM
- Transcript is saved with the lead
- You can follow up from the Leads dashboard

## Next Steps

- Test your setup with a real call
- Customize your bot's personality in Bot Builder
- Review call logs and transcripts
- Set up notifications for incoming calls
- Monitor usage and costs in your dashboard

## Support

- [Twilio Documentation](https://www.twilio.com/docs/voice)
- [Cartesia API Docs](https://docs.cartesia.ai)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

For issues specific to BuildMyBot, check the application logs or contact support.
