# 🎙️ Voice Agent Quick Start (5 Minutes)

Get your AI voice agent up and running in 5 minutes with our automated setup script!

## What You'll Get

✅ **Real-time AI voice conversations** with sub-200ms latency
✅ **Automatic transcripts** of all calls
✅ **Lead capture** from phone conversations
✅ **24/7 AI receptionist** for your business
✅ **Multiple voice options** (6 professional voices)

## Prerequisites

Before starting, sign up for (all have free tiers):

1. **[Twilio Account](https://www.twilio.com/try-twilio)** - For phone numbers ($1/month)
2. **[Cartesia API](https://cartesia.ai)** - For ultra-fast text-to-speech ($0.05/1K chars)
3. **[Deepgram API](https://deepgram.com)** (Optional) - For best speech-to-text quality

## One-Command Setup

### Linux/Mac:

```bash
chmod +x scripts/deploy-voice-agent.sh
./scripts/deploy-voice-agent.sh
```

### Windows (PowerShell):

```powershell
.\scripts\deploy-voice-agent.ps1
```

The script will:
1. ✅ Collect your API keys
2. ✅ Configure Supabase secrets
3. ✅ Deploy all edge functions
4. ✅ Generate your webhook URLs
5. ✅ Test your deployment
6. ✅ Provide next steps

## Manual Setup (If Preferred)

### Step 1: Get API Keys

**Cartesia (Required):**
1. Go to [cartesia.ai](https://cartesia.ai)
2. Sign up and get your API key
3. Copy the key (starts with `cartesia_`)

**Twilio (Required):**
1. Go to [Twilio Console](https://console.twilio.com)
2. Find your Account SID and Auth Token
3. Buy a phone number ($1/month)

**Deepgram (Optional but Recommended):**
1. Go to [deepgram.com](https://deepgram.com)
2. Sign up for free tier
3. Get your API key

### Step 2: Configure Secrets

```bash
# Required
supabase secrets set CARTESIA_API_KEY=your_key_here
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=+15551234567

# Optional (improves STT quality)
supabase secrets set DEEPGRAM_API_KEY=your_key_here
```

### Step 3: Deploy Functions

```bash
supabase functions deploy twilio-voice-handler
supabase functions deploy twilio-voice-stream
supabase functions deploy twilio-call-webhook
```

### Step 4: Configure Twilio

1. Go to [Twilio Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/active)
2. Click your phone number
3. Under "Voice Configuration":
   - **A CALL COMES IN**: `https://[YOUR-PROJECT].supabase.co/functions/v1/twilio-voice-handler` (POST)
   - **STATUS CALLBACK URL**: `https://[YOUR-PROJECT].supabase.co/functions/v1/twilio-call-webhook` (POST)
4. Click "Save"

## Test Your Setup

### Option 1: Make a Real Call

1. Call your Twilio phone number
2. Hear your greeting message
3. Have a conversation with the AI
4. Check call logs in the Phone Agent dashboard

### Option 2: Use the Simulator

1. Go to **Phone Agent** in your BuildMyBot dashboard
2. Click the green phone button in the simulator
3. Configure test parameters
4. Click "Log simulated call"
5. View the call in Recent Calls

## Validate Your Setup

Run the validation script to check everything:

```bash
# Linux/Mac
./scripts/validate-voice-setup.sh

# Windows
# (Check manually via Supabase dashboard)
```

## Customize Your Agent

### 1. Change Greeting Message

In Phone Agent dashboard:
```
Greeting Message: "Hi! Thanks for calling [Your Business]. How can I help you today?"
```

### 2. Select a Voice

Click the play button to preview each voice:
- **Alloy** - Neutral, professional
- **Echo** - Clear, business-like
- **Fable** - Warm, friendly
- **Onyx** - Deep, authoritative
- **Nova** - Bright, energetic
- **Shimmer** - Soft, welcoming

### 3. Customize AI Personality

Go to **Bot Builder** and edit your bot's system prompt:

```
You are a professional AI receptionist for [Company Name].
You handle incoming calls with warmth and efficiency.
Your goal is to:
1. Answer questions about our services
2. Schedule appointments
3. Capture lead information
4. Transfer urgent calls to human staff

Be concise (1-2 sentences per response) for phone conversations.
```

## Performance Specs

| Metric | Target | What You'll Get |
|--------|--------|-----------------|
| **Latency** | <300ms | Ultra-responsive conversations |
| **Voice Quality** | High | Natural-sounding Cartesia Sonic |
| **Transcription Accuracy** | 95%+ | With Deepgram Nova-2 |
| **Cost per Minute** | ~$0.03 | Cartesia + Twilio + Deepgram |
| **Uptime** | 99.9% | Supabase Edge Functions |

## Pricing Breakdown

**Monthly Costs (typical usage):**
- Twilio Phone Number: $1.00/month
- Twilio Voice: $0.0085/minute
- Cartesia TTS: $0.05 per 1,000 characters
- Deepgram STT: $0.0043/minute (or use OpenAI Whisper)
- **Total**: ~$1-10/month for light usage

**Example: 100 minutes of calls/month**
- Phone number: $1.00
- Twilio calls: $0.85
- Cartesia: ~$1.50
- Deepgram: ~$0.43
- **Total: ~$3.78/month**

Compare to:
- Human receptionist: $2,000+/month
- Traditional IVR system: $50-200/month
- **BuildMyBot saves you 95%+ vs alternatives**

## Troubleshooting

### Calls not connecting?

1. Check Twilio webhook URLs are correct
2. Verify Supabase functions are deployed:
   ```bash
   supabase functions list
   ```
3. Check function logs:
   ```bash
   supabase functions logs twilio-voice-handler
   ```

### No transcripts showing up?

1. Verify STATUS CALLBACK URL is configured in Twilio
2. Check that TWILIO_AUTH_TOKEN is set
3. Make sure phone number is saved in Phone Agent config

### Voice quality issues?

1. Try a different voice option
2. Verify Cartesia API key is valid
3. Check your internet connection
4. Review function logs for errors

### AI not responding correctly?

1. Check your bot's system prompt in Bot Builder
2. Verify OPENAI_API_KEY is set in Supabase secrets
3. Review conversation history in call logs
4. Adjust temperature/model settings if needed

## Advanced Features

### Enable Call Recording

In Twilio phone number settings:
1. Enable "Record Voice Calls"
2. Recordings will be linked in call logs

### Lead Scoring

The AI automatically scores leads 0-100 based on:
- Intent signals
- Question types
- Engagement level

High-scoring leads (80+) appear in your CRM dashboard.

### Business Hours

Customize greeting based on time:

```javascript
if (hour < 9 || hour > 17) {
  return "Thanks for calling outside business hours. Please leave a message.";
}
```

### Transfer to Human

Train your bot to recognize transfer requests:

```
If the caller asks for a human or says "speak to someone",
respond: "I'll connect you with a team member right away."
Then set leadScore to 100 to prioritize.
```

## Next Steps

1. ✅ **Test thoroughly** - Make several test calls
2. ✅ **Customize personality** - Edit your bot's prompt
3. ✅ **Monitor performance** - Check call logs daily
4. ✅ **Optimize responses** - Review transcripts and improve
5. ✅ **Scale up** - Add more phone numbers as needed

## Support & Resources

- 📖 [Full Documentation](VOICE_AGENT_SETUP.md)
- 🔧 [Troubleshooting Guide](VOICE_AGENT_SETUP.md#troubleshooting)
- 🎯 [Best Practices](#best-practices)
- 💬 [Community Forum](https://github.com/yourusername/buildmybot/discussions)

## Best Practices

### ✅ DO:
- Keep responses concise (1-2 sentences)
- Use natural, conversational language
- Handle "I don't know" gracefully
- Log all calls for quality assurance
- Review transcripts weekly
- Update system prompt based on feedback

### ❌ DON'T:
- Make responses too long (users will hang up)
- Use technical jargon
- Promise what you can't deliver
- Ignore failed calls in logs
- Forget to test after changes
- Skip voice quality checks

---

**You're all set! 🎉**

Your AI voice agent is now live and ready to handle calls 24/7.

Call your number and experience the future of business communication!
