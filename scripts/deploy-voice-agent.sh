#!/bin/bash

# Voice Agent Deployment Script for BuildMyBot
# This script automates the complete setup of the AI voice agent

set -e  # Exit on error

echo "========================================="
echo "  BuildMyBot Voice Agent Setup Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Please install it: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if user is logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}You need to log in to Supabase${NC}"
    supabase login
fi

echo -e "${GREEN}✓ Supabase CLI detected${NC}"
echo ""

# Step 1: Collect API Keys
echo "========================================="
echo " Step 1: API Keys Configuration"
echo "========================================="
echo ""

read -p "Do you have a Cartesia API key? (Required for TTS) [y/N]: " has_cartesia
if [[ "$has_cartesia" =~ ^[Yy]$ ]]; then
    read -p "Enter your Cartesia API key: " CARTESIA_KEY
    echo -e "${GREEN}✓ Cartesia key saved${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Voice agent won't work without Cartesia${NC}"
    echo "  Get one at: https://cartesia.ai"
    CARTESIA_KEY=""
fi

read -p "Do you have a Deepgram API key? (Optional, for best STT quality) [y/N]: " has_deepgram
if [[ "$has_deepgram" =~ ^[Yy]$ ]]; then
    read -p "Enter your Deepgram API key: " DEEPGRAM_KEY
    echo -e "${GREEN}✓ Deepgram key saved${NC}"
else
    echo -e "${YELLOW}⚠ Note: Will use OpenAI Whisper as fallback${NC}"
    DEEPGRAM_KEY=""
fi

read -p "Do you have Twilio credentials? (Required) [y/N]: " has_twilio
if [[ "$has_twilio" =~ ^[Yy]$ ]]; then
    read -p "Enter your Twilio Account SID (starts with AC): " TWILIO_SID
    read -p "Enter your Twilio Auth Token: " TWILIO_TOKEN
    read -p "Enter your Twilio Phone Number (e.g., +15551234567): " TWILIO_PHONE
    echo -e "${GREEN}✓ Twilio credentials saved${NC}"
else
    echo -e "${RED}Error: Twilio is required for voice agent${NC}"
    echo "  Sign up at: https://www.twilio.com/try-twilio"
    exit 1
fi

echo ""

# Step 2: Set Supabase Secrets
echo "========================================="
echo " Step 2: Configuring Supabase Secrets"
echo "========================================="
echo ""

if [ -n "$CARTESIA_KEY" ]; then
    echo "Setting CARTESIA_API_KEY..."
    supabase secrets set CARTESIA_API_KEY="$CARTESIA_KEY"
    echo -e "${GREEN}✓ Cartesia key configured${NC}"
fi

if [ -n "$DEEPGRAM_KEY" ]; then
    echo "Setting DEEPGRAM_API_KEY..."
    supabase secrets set DEEPGRAM_API_KEY="$DEEPGRAM_KEY"
    echo -e "${GREEN}✓ Deepgram key configured${NC}"
fi

echo "Setting Twilio credentials..."
supabase secrets set TWILIO_ACCOUNT_SID="$TWILIO_SID"
supabase secrets set TWILIO_AUTH_TOKEN="$TWILIO_TOKEN"
supabase secrets set TWILIO_PHONE_NUMBER="$TWILIO_PHONE"
echo -e "${GREEN}✓ Twilio credentials configured${NC}"

echo ""

# Step 3: Deploy Edge Functions
echo "========================================="
echo " Step 3: Deploying Edge Functions"
echo "========================================="
echo ""

echo "Deploying twilio-voice-handler..."
supabase functions deploy twilio-voice-handler
echo -e "${GREEN}✓ Voice handler deployed${NC}"

echo "Deploying twilio-voice-stream..."
supabase functions deploy twilio-voice-stream
echo -e "${GREEN}✓ Voice stream deployed${NC}"

echo "Deploying twilio-call-webhook..."
supabase functions deploy twilio-call-webhook
echo -e "${GREEN}✓ Call webhook deployed${NC}"

echo ""

# Step 4: Get Webhook URLs
echo "========================================="
echo " Step 4: Webhook URLs"
echo "========================================="
echo ""

PROJECT_REF=$(supabase projects list --output json | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -n1)

if [ -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}Could not detect project automatically${NC}"
    read -p "Enter your Supabase project ref (from URL): " PROJECT_REF
fi

VOICE_HANDLER_URL="https://$PROJECT_REF.supabase.co/functions/v1/twilio-voice-handler"
STATUS_CALLBACK_URL="https://$PROJECT_REF.supabase.co/functions/v1/twilio-call-webhook"

echo -e "${GREEN}Your webhook URLs:${NC}"
echo ""
echo "1. Voice Handler URL (A CALL COMES IN):"
echo "   $VOICE_HANDLER_URL"
echo ""
echo "2. Status Callback URL:"
echo "   $STATUS_CALLBACK_URL"
echo ""

# Step 5: Twilio Configuration Instructions
echo "========================================="
echo " Step 5: Configure Twilio Phone Number"
echo "========================================="
echo ""

echo "Next steps:"
echo "1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active"
echo "2. Click on your phone number: $TWILIO_PHONE"
echo "3. Under 'Voice Configuration', set:"
echo "   - A CALL COMES IN: $VOICE_HANDLER_URL (HTTP POST)"
echo "   - STATUS CALLBACK URL: $STATUS_CALLBACK_URL (HTTP POST)"
echo "4. Click 'Save'"
echo ""

read -p "Press Enter when you've completed the Twilio configuration..."

echo ""

# Step 6: Test Deployment
echo "========================================="
echo " Step 6: Testing Deployment"
echo "========================================="
echo ""

echo "Testing voice handler endpoint..."
HANDLER_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$VOICE_HANDLER_URL")

if [ "$HANDLER_RESPONSE" == "405" ]; then
    echo -e "${GREEN}✓ Voice handler endpoint is live${NC}"
elif [ "$HANDLER_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ Voice handler endpoint is live${NC}"
else
    echo -e "${YELLOW}⚠ Voice handler returned unexpected status: $HANDLER_RESPONSE${NC}"
fi

echo "Testing webhook endpoint..."
WEBHOOK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$STATUS_CALLBACK_URL")

if [ "$WEBHOOK_RESPONSE" == "405" ]; then
    echo -e "${GREEN}✓ Webhook endpoint is live${NC}"
elif [ "$WEBHOOK_RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ Webhook endpoint is live${NC}"
else
    echo -e "${YELLOW}⚠ Webhook returned unexpected status: $WEBHOOK_RESPONSE${NC}"
fi

echo ""

# Step 7: Final Instructions
echo "========================================="
echo " 🎉 Setup Complete!"
echo "========================================="
echo ""

echo "Your voice agent is ready to use!"
echo ""
echo "To test:"
echo "1. Call your Twilio number: $TWILIO_PHONE"
echo "2. You should hear your greeting message"
echo "3. The AI will respond using Cartesia Sonic voice"
echo "4. Check call logs in the Phone Agent dashboard"
echo ""

echo "Documentation:"
echo "- Voice Agent Guide: VOICE_AGENT_SETUP.md"
echo "- Troubleshooting: Check function logs with:"
echo "  supabase functions logs twilio-voice-handler"
echo "  supabase functions logs twilio-voice-stream"
echo ""

echo -e "${GREEN}Happy calling! 📞${NC}"
