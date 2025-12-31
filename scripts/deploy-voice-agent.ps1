# Voice Agent Deployment Script for BuildMyBot (PowerShell)
# This script automates the complete setup of the AI voice agent

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  BuildMyBot Voice Agent Setup Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✓ Supabase CLI detected" -ForegroundColor Green
} catch {
    Write-Host "Error: Supabase CLI not found" -ForegroundColor Red
    Write-Host "Please install it: https://supabase.com/docs/guides/cli"
    exit 1
}

# Check if user is logged in to Supabase
try {
    $null = supabase projects list 2>&1
} catch {
    Write-Host "You need to log in to Supabase" -ForegroundColor Yellow
    supabase login
}

Write-Host ""

# Step 1: Collect API Keys
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Step 1: API Keys Configuration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$hasCartesia = Read-Host "Do you have a Cartesia API key? (Required for TTS) [y/N]"
if ($hasCartesia -match "^[Yy]$") {
    $CARTESIA_KEY = Read-Host "Enter your Cartesia API key"
    Write-Host "✓ Cartesia key saved" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: Voice agent won't work without Cartesia" -ForegroundColor Yellow
    Write-Host "  Get one at: https://cartesia.ai"
    $CARTESIA_KEY = ""
}

$hasDeepgram = Read-Host "Do you have a Deepgram API key? (Optional, for best STT quality) [y/N]"
if ($hasDeepgram -match "^[Yy]$") {
    $DEEPGRAM_KEY = Read-Host "Enter your Deepgram API key"
    Write-Host "✓ Deepgram key saved" -ForegroundColor Green
} else {
    Write-Host "⚠ Note: Will use OpenAI Whisper as fallback" -ForegroundColor Yellow
    $DEEPGRAM_KEY = ""
}

$hasTwilio = Read-Host "Do you have Twilio credentials? (Required) [y/N]"
if ($hasTwilio -match "^[Yy]$") {
    $TWILIO_SID = Read-Host "Enter your Twilio Account SID (starts with AC)"
    $TWILIO_TOKEN = Read-Host "Enter your Twilio Auth Token"
    $TWILIO_PHONE = Read-Host "Enter your Twilio Phone Number (e.g., +15551234567)"
    Write-Host "✓ Twilio credentials saved" -ForegroundColor Green
} else {
    Write-Host "Error: Twilio is required for voice agent" -ForegroundColor Red
    Write-Host "  Sign up at: https://www.twilio.com/try-twilio"
    exit 1
}

Write-Host ""

# Step 2: Set Supabase Secrets
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Step 2: Configuring Supabase Secrets" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($CARTESIA_KEY) {
    Write-Host "Setting CARTESIA_API_KEY..."
    supabase secrets set "CARTESIA_API_KEY=$CARTESIA_KEY"
    Write-Host "✓ Cartesia key configured" -ForegroundColor Green
}

if ($DEEPGRAM_KEY) {
    Write-Host "Setting DEEPGRAM_API_KEY..."
    supabase secrets set "DEEPGRAM_API_KEY=$DEEPGRAM_KEY"
    Write-Host "✓ Deepgram key configured" -ForegroundColor Green
}

Write-Host "Setting Twilio credentials..."
supabase secrets set "TWILIO_ACCOUNT_SID=$TWILIO_SID"
supabase secrets set "TWILIO_AUTH_TOKEN=$TWILIO_TOKEN"
supabase secrets set "TWILIO_PHONE_NUMBER=$TWILIO_PHONE"
Write-Host "✓ Twilio credentials configured" -ForegroundColor Green

Write-Host ""

# Step 3: Deploy Edge Functions
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Step 3: Deploying Edge Functions" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Deploying twilio-voice-handler..."
supabase functions deploy twilio-voice-handler
Write-Host "✓ Voice handler deployed" -ForegroundColor Green

Write-Host "Deploying twilio-voice-stream..."
supabase functions deploy twilio-voice-stream
Write-Host "✓ Voice stream deployed" -ForegroundColor Green

Write-Host "Deploying twilio-call-webhook..."
supabase functions deploy twilio-call-webhook
Write-Host "✓ Call webhook deployed" -ForegroundColor Green

Write-Host ""

# Step 4: Get Webhook URLs
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Step 4: Webhook URLs" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$projectsList = supabase projects list --output json | ConvertFrom-Json
$PROJECT_REF = $projectsList[0].id

if (-not $PROJECT_REF) {
    Write-Host "Could not detect project automatically" -ForegroundColor Yellow
    $PROJECT_REF = Read-Host "Enter your Supabase project ref (from URL)"
}

$VOICE_HANDLER_URL = "https://$PROJECT_REF.supabase.co/functions/v1/twilio-voice-handler"
$STATUS_CALLBACK_URL = "https://$PROJECT_REF.supabase.co/functions/v1/twilio-call-webhook"

Write-Host "Your webhook URLs:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Voice Handler URL (A CALL COMES IN):"
Write-Host "   $VOICE_HANDLER_URL"
Write-Host ""
Write-Host "2. Status Callback URL:"
Write-Host "   $STATUS_CALLBACK_URL"
Write-Host ""

# Step 5: Twilio Configuration Instructions
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Step 5: Configure Twilio Phone Number" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:"
Write-Host "1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active"
Write-Host "2. Click on your phone number: $TWILIO_PHONE"
Write-Host "3. Under 'Voice Configuration', set:"
Write-Host "   - A CALL COMES IN: $VOICE_HANDLER_URL (HTTP POST)"
Write-Host "   - STATUS CALLBACK URL: $STATUS_CALLBACK_URL (HTTP POST)"
Write-Host "4. Click 'Save'"
Write-Host ""

Read-Host "Press Enter when you've completed the Twilio configuration"

Write-Host ""

# Step 6: Test Deployment
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Step 6: Testing Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing voice handler endpoint..."
try {
    $handlerResponse = Invoke-WebRequest -Uri $VOICE_HANDLER_URL -Method GET -ErrorAction SilentlyContinue
    $handlerStatus = $handlerResponse.StatusCode
} catch {
    $handlerStatus = $_.Exception.Response.StatusCode.Value__
}

if ($handlerStatus -eq 405 -or $handlerStatus -eq 200) {
    Write-Host "✓ Voice handler endpoint is live" -ForegroundColor Green
} else {
    Write-Host "⚠ Voice handler returned unexpected status: $handlerStatus" -ForegroundColor Yellow
}

Write-Host "Testing webhook endpoint..."
try {
    $webhookResponse = Invoke-WebRequest -Uri $STATUS_CALLBACK_URL -Method GET -ErrorAction SilentlyContinue
    $webhookStatus = $webhookResponse.StatusCode
} catch {
    $webhookStatus = $_.Exception.Response.StatusCode.Value__
}

if ($webhookStatus -eq 405 -or $webhookStatus -eq 200) {
    Write-Host "✓ Webhook endpoint is live" -ForegroundColor Green
} else {
    Write-Host "⚠ Webhook returned unexpected status: $webhookStatus" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Final Instructions
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " 🎉 Setup Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your voice agent is ready to use!"
Write-Host ""
Write-Host "To test:"
Write-Host "1. Call your Twilio number: $TWILIO_PHONE"
Write-Host "2. You should hear your greeting message"
Write-Host "3. The AI will respond using Cartesia Sonic voice"
Write-Host "4. Check call logs in the Phone Agent dashboard"
Write-Host ""

Write-Host "Documentation:"
Write-Host "- Voice Agent Guide: VOICE_AGENT_SETUP.md"
Write-Host "- Troubleshooting: Check function logs with:"
Write-Host "  supabase functions logs twilio-voice-handler"
Write-Host "  supabase functions logs twilio-voice-stream"
Write-Host ""

Write-Host "Happy calling! 📞" -ForegroundColor Green
