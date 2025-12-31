#!/bin/bash

# Voice Agent Setup Validation Script
# Checks that all required configuration is in place

set -e

echo "========================================="
echo "  Voice Agent Configuration Validator"
echo "========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Check Supabase CLI
echo "Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI installed${NC}"
else
    echo -e "${RED}✗ Supabase CLI not found${NC}"
    ((ERRORS++))
fi

# Check Supabase secrets
echo ""
echo "Checking Supabase secrets..."

check_secret() {
    local secret_name=$1
    local is_required=$2

    if supabase secrets list 2>/dev/null | grep -q "$secret_name"; then
        echo -e "${GREEN}✓ $secret_name is set${NC}"
        return 0
    else
        if [ "$is_required" == "true" ]; then
            echo -e "${RED}✗ $secret_name is MISSING (required)${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ $secret_name is not set (optional)${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

check_secret "CARTESIA_API_KEY" "true"
check_secret "TWILIO_ACCOUNT_SID" "true"
check_secret "TWILIO_AUTH_TOKEN" "true"
check_secret "TWILIO_PHONE_NUMBER" "true"
check_secret "OPENAI_API_KEY" "true"
check_secret "DEEPGRAM_API_KEY" "false"

# Check deployed functions
echo ""
echo "Checking deployed edge functions..."

check_function() {
    local func_name=$1

    if supabase functions list 2>/dev/null | grep -q "$func_name"; then
        echo -e "${GREEN}✓ $func_name is deployed${NC}"
        return 0
    else
        echo -e "${RED}✗ $func_name is NOT deployed${NC}"
        ((ERRORS++))
        return 1
    fi
}

check_function "twilio-voice-handler"
check_function "twilio-voice-stream"
check_function "twilio-call-webhook"

# Check environment variables in .env.local
echo ""
echo "Checking local environment variables..."

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local file exists${NC}"

    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL is set${NC}"
    else
        echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL not found in .env.local${NC}"
        ((ERRORS++))
    fi

    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set${NC}"
    else
        echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗ .env.local file not found${NC}"
    echo "  Copy .env.example to .env.local and fill in values"
    ((ERRORS++))
fi

# Test webhook endpoints
echo ""
echo "Testing webhook endpoints..."

PROJECT_REF=$(supabase projects list --output json 2>/dev/null | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -n1)

if [ -n "$PROJECT_REF" ]; then
    VOICE_URL="https://$PROJECT_REF.supabase.co/functions/v1/twilio-voice-handler"
    WEBHOOK_URL="https://$PROJECT_REF.supabase.co/functions/v1/twilio-call-webhook"

    echo "Testing $VOICE_URL..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$VOICE_URL" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" == "405" ] || [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ Voice handler endpoint is reachable${NC}"
    else
        echo -e "${YELLOW}⚠ Voice handler returned status $HTTP_CODE${NC}"
        ((WARNINGS++))
    fi

    echo "Testing $WEBHOOK_URL..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" == "405" ] || [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ Webhook endpoint is reachable${NC}"
    else
        echo -e "${YELLOW}⚠ Webhook returned status $HTTP_CODE${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ Could not detect project ref automatically${NC}"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "========================================="
echo " Validation Summary"
echo "========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Voice agent is ready to use.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    echo "  Voice agent should work, but some optional features may be unavailable"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before using the voice agent."
    echo "Run this script again after making changes."
    exit 1
fi
