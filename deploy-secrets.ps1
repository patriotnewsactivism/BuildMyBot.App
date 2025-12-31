# BuildMyBot - Supabase Secrets Configuration Script (PowerShell)
# This script helps you configure all required secrets for production deployment

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "BuildMyBot Secrets Configuration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Function to set a secret
function Set-SupabaseSecret {
    param (
        [string]$SecretName,
        [string]$Description,
        [bool]$IsRequired
    )

    Write-Host "Setting: $SecretName" -ForegroundColor Yellow
    Write-Host "Description: $Description"

    if ($IsRequired) {
        Write-Host "(REQUIRED)" -ForegroundColor Red
    } else {
        Write-Host "(Optional)" -ForegroundColor Gray
    }

    $secretValue = Read-Host "Enter value (or press Enter to skip)"

    if ($secretValue) {
        npx supabase secrets set "$SecretName=$secretValue"
        Write-Host "✓ $SecretName configured" -ForegroundColor Green
        Write-Host ""
    } else {
        if ($IsRequired) {
            Write-Host "⚠ WARNING: $SecretName is required for full functionality" -ForegroundColor Red
            Write-Host ""
        } else {
            Write-Host "⊘ Skipped $SecretName" -ForegroundColor Gray
            Write-Host ""
        }
    }
}

Write-Host "This script will help you configure secrets for Supabase Edge Functions."
Write-Host "You'll be prompted for each secret. Required secrets are marked."
Write-Host ""
Read-Host "Press Enter to continue..."
Write-Host ""

# ============================================
# STRIPE SECRETS (Required for billing)
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "1. STRIPE CONFIGURATION (Billing)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Get these from: https://dashboard.stripe.com/apikeys"
Write-Host ""

Set-SupabaseSecret -SecretName "STRIPE_SECRET_KEY" -Description "Stripe secret key (sk_test_... or sk_live_...)" -IsRequired $true
Set-SupabaseSecret -SecretName "STRIPE_WEBHOOK_SECRET" -Description "Stripe webhook signing secret (whsec_...)" -IsRequired $true

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "2. STRIPE PRICE IDs (Subscription Plans)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Create subscription prices in Stripe Dashboard > Products"
Write-Host "Format: price_... (e.g., price_1ABC123...)"
Write-Host ""

Set-SupabaseSecret -SecretName "STRIPE_PRICE_STARTER" -Description "Starter plan price ID" -IsRequired $true
Set-SupabaseSecret -SecretName "STRIPE_PRICE_PROFESSIONAL" -Description "Professional plan price ID" -IsRequired $true
Set-SupabaseSecret -SecretName "STRIPE_PRICE_EXECUTIVE" -Description "Executive plan price ID" -IsRequired $true
Set-SupabaseSecret -SecretName "STRIPE_PRICE_ENTERPRISE" -Description "Enterprise plan price ID" -IsRequired $true

# ============================================
# TWILIO SECRETS (Required for Phone Agent)
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "3. TWILIO CONFIGURATION (Phone Agent)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Get these from: https://console.twilio.com/"
Write-Host ""

Set-SupabaseSecret -SecretName "TWILIO_ACCOUNT_SID" -Description "Twilio Account SID (AC...)" -IsRequired $false
Set-SupabaseSecret -SecretName "TWILIO_AUTH_TOKEN" -Description "Twilio Auth Token" -IsRequired $false
Set-SupabaseSecret -SecretName "TWILIO_PHONE_NUMBER" -Description "Twilio phone number (+1...)" -IsRequired $false

# ============================================
# CARTESIA SECRETS (Required for Voice TTS)
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "4. CARTESIA CONFIGURATION (Voice TTS)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Get API key from: https://cartesia.ai/"
Write-Host ""

Set-SupabaseSecret -SecretName "CARTESIA_API_KEY" -Description "Cartesia API key for voice synthesis" -IsRequired $false

# ============================================
# OPENAI SECRETS (Required for AI)
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "5. OPENAI CONFIGURATION (AI)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Get API key from: https://platform.openai.com/api-keys"
Write-Host ""

Set-SupabaseSecret -SecretName "OPENAI_API_KEY" -Description "OpenAI API key (sk-...)" -IsRequired $true

# ============================================
# OPTIONAL SECRETS
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "6. OPTIONAL CONFIGURATION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Set-SupabaseSecret -SecretName "ANTHROPIC_API_KEY" -Description "Anthropic API key for Claude support (sk-ant-...)" -IsRequired $false
Set-SupabaseSecret -SecretName "GOOGLE_API_KEY" -Description "Google AI API key for Gemini fallback" -IsRequired $false

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✓ Secrets configuration complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Verify secrets: npx supabase secrets list"
Write-Host "2. Deploy Edge Functions: npm run deploy:functions"
Write-Host "3. Test your deployment"
Write-Host ""
