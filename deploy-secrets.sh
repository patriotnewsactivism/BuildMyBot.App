#!/bin/bash
# BuildMyBot - Supabase Secrets Configuration Script
# This script helps you configure all required secrets for production deployment

set -e

echo "======================================"
echo "BuildMyBot Secrets Configuration"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_required=$3

    echo -e "${YELLOW}Setting: ${secret_name}${NC}"
    echo "Description: ${secret_description}"

    if [ "$is_required" = "true" ]; then
        echo -e "${RED}(REQUIRED)${NC}"
    else
        echo -e "(Optional)"
    fi

    read -p "Enter value (or press Enter to skip): " secret_value

    if [ -n "$secret_value" ]; then
        npx supabase secrets set "${secret_name}=${secret_value}"
        echo -e "${GREEN}✓ ${secret_name} configured${NC}\n"
    else
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}⚠ WARNING: ${secret_name} is required for full functionality${NC}\n"
        else
            echo -e "⊘ Skipped ${secret_name}\n"
        fi
    fi
}

echo "This script will help you configure secrets for Supabase Edge Functions."
echo "You'll be prompted for each secret. Required secrets are marked."
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================
# STRIPE SECRETS (Required for billing)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. STRIPE CONFIGURATION (Billing)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get these from: https://dashboard.stripe.com/apikeys"
echo ""

set_secret "STRIPE_SECRET_KEY" "Stripe secret key (sk_test_... or sk_live_...)" "true"
set_secret "STRIPE_WEBHOOK_SECRET" "Stripe webhook signing secret (whsec_...)" "true"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. STRIPE PRICE IDs (Subscription Plans)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Create subscription prices in Stripe Dashboard > Products"
echo "Format: price_... (e.g., price_1ABC123...)"
echo ""

set_secret "STRIPE_PRICE_STARTER" "Starter plan price ID" "true"
set_secret "STRIPE_PRICE_PROFESSIONAL" "Professional plan price ID" "true"
set_secret "STRIPE_PRICE_EXECUTIVE" "Executive plan price ID" "true"
set_secret "STRIPE_PRICE_ENTERPRISE" "Enterprise plan price ID" "true"

# ============================================
# TWILIO SECRETS (Required for Phone Agent)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. TWILIO CONFIGURATION (Phone Agent)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get these from: https://console.twilio.com/"
echo ""

set_secret "TWILIO_ACCOUNT_SID" "Twilio Account SID (AC...)" "false"
set_secret "TWILIO_AUTH_TOKEN" "Twilio Auth Token" "false"
set_secret "TWILIO_PHONE_NUMBER" "Twilio phone number (+1...)" "false"

# ============================================
# CARTESIA SECRETS (Required for Voice TTS)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. CARTESIA CONFIGURATION (Voice TTS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get API key from: https://cartesia.ai/"
echo ""

set_secret "CARTESIA_API_KEY" "Cartesia API key for voice synthesis" "false"

# ============================================
# OPENAI SECRETS (Required for AI)
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. OPENAI CONFIGURATION (AI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Get API key from: https://platform.openai.com/api-keys"
echo ""

set_secret "OPENAI_API_KEY" "OpenAI API key (sk-...)" "true"

# ============================================
# OPTIONAL SECRETS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. OPTIONAL CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

set_secret "ANTHROPIC_API_KEY" "Anthropic API key for Claude support (sk-ant-...)" "false"
set_secret "GOOGLE_API_KEY" "Google AI API key for Gemini fallback" "false"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Secrets configuration complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Verify secrets: npx supabase secrets list"
echo "2. Deploy Edge Functions: npm run deploy:functions"
echo "3. Test your deployment"
echo ""
