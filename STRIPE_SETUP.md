# Stripe Setup Guide
## Payment Processing & Subscription Management

**Estimated Time:** 45-60 minutes

---

## Overview

This guide walks you through setting up Stripe for BuildMyBot, including:
- Creating Stripe account
- Configuring products and prices
- Setting up webhooks
- Testing payments
- Going live

---

## Step 1: Create Stripe Account

### 1.1 Sign Up

1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Enter your email and create a password
4. Verify your email address

### 1.2 Complete Account Setup

1. Fill in business information:
   - Business name: "BuildMyBot" (or your company name)
   - Business type: Individual or Company
   - Industry: SaaS / Software
   - Website: Your domain

2. Provide tax information (required for payouts)
3. Add bank account details (for receiving payments)

---

## Step 2: Get API Keys

### 2.1 Navigate to API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. You'll see two sets of keys:
   - **Test mode** (for development)
   - **Live mode** (for production)

### 2.2 Copy Test Mode Keys

For development, copy these keys:

```bash
# Publishable key (safe for browser)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Secret key (server-side only, NEVER expose!)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Add these to your `.env.local` file.

⚠️ **Important:** Start with test mode keys. Switch to live keys only when ready for production.

---

## Step 3: Create Products & Prices

### 3.1 Navigate to Products

1. Go to **Products** in Stripe Dashboard
2. Click **"+ Add product"**

### 3.2 Create Each Product

Create 5 products with the following details:

#### Product 1: Free Trial
- **Name:** BuildMyBot Free
- **Description:** Perfect for testing - 1 bot, 50 conversations/month
- **Pricing:**
  - Price: $0.00
  - Billing period: Monthly
  - Currency: USD
- **Metadata:**
  - `plan_type`: `free`
  - `bot_limit`: `1`
  - `conversation_limit`: `50`

#### Product 2: Starter
- **Name:** BuildMyBot Starter
- **Description:** Great for small businesses - 3 bots, 500 conversations/month
- **Pricing:**
  - Price: $29.00
  - Billing period: Monthly
  - Currency: USD
- **Metadata:**
  - `plan_type`: `starter`
  - `bot_limit`: `3`
  - `conversation_limit`: `500`

#### Product 3: Professional
- **Name:** BuildMyBot Professional
- **Description:** For growing companies - 10 bots, 2K conversations/month
- **Pricing:**
  - Price: $99.00
  - Billing period: Monthly
  - Currency: USD
- **Metadata:**
  - `plan_type`: `professional`
  - `bot_limit`: `10`
  - `conversation_limit`: `2000`

#### Product 4: Executive
- **Name:** BuildMyBot Executive
- **Description:** For large teams - 50 bots, 10K conversations/month
- **Pricing:**
  - Price: $199.00
  - Billing period: Monthly
  - Currency: USD
- **Metadata:**
  - `plan_type`: `executive`
  - `bot_limit`: `50`
  - `conversation_limit`: `10000`

#### Product 5: Enterprise
- **Name:** BuildMyBot Enterprise
- **Description:** Unlimited everything with priority support
- **Pricing:**
  - Price: $499.00
  - Billing period: Monthly
  - Currency: USD
- **Metadata:**
  - `plan_type`: `enterprise`
  - `bot_limit`: `-1`
  - `conversation_limit`: `-1`

### 3.3 Copy Price IDs

After creating each product, copy the **Price ID** (starts with `price_`):

```bash
STRIPE_PRICE_FREE=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_EXECUTIVE=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxxxxxxxxxx
```

Add these to your `.env.local` file.

---

## Step 4: Set Up Webhooks

### 4.1 Why Webhooks?

Webhooks notify your app when:
- Subscription is created/updated/canceled
- Payment succeeds/fails
- Free trial ends
- Card expires

### 4.2 Configure Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
     - For local testing: Use ngrok (see below)
   - **Description:** "BuildMyBot subscription webhooks"
   - **Events to send:**
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. Click **"Add endpoint"**

### 4.3 Copy Webhook Secret

After creating the endpoint:
1. Click on the webhook endpoint
2. Click **"Reveal" next to "Signing secret"**
3. Copy the secret (starts with `whsec_`)

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Add to `.env.local`.

### 4.4 Local Testing with ngrok

For local development:

```bash
# Install ngrok
brew install ngrok  # Mac
# or download from ngrok.com

# Start your Next.js app
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as your webhook URL:
# https://abc123.ngrok.io/api/webhooks/stripe
```

**Note:** ngrok URLs change each time. For permanent testing, upgrade to ngrok paid plan or use a staging server.

---

## Step 5: Update Environment Variables

Your `.env.local` should now have:

```bash
# =============================================================================
# STRIPE
# =============================================================================

# API Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Price IDs
STRIPE_PRICE_FREE=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_EXECUTIVE=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxxxxxxxxxx

# Product IDs (Optional - not currently used)
STRIPE_PRODUCT_FREE=prod_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRODUCT_STARTER=prod_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRODUCT_PROFESSIONAL=prod_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRODUCT_EXECUTIVE=prod_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRODUCT_ENTERPRISE=prod_xxxxxxxxxxxxxxxxxxxxx
```

---

## Step 6: Test Payment Flow

### 6.1 Test Credit Cards

Stripe provides test cards for various scenarios:

**Successful Payment:**
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Declined Card:**
- Card number: `4000 0000 0000 0002`
- Triggers card declined error

**Insufficient Funds:**
- Card number: `4000 0000 0000 9995`
- Triggers insufficient funds error

**3D Secure Authentication:**
- Card number: `4000 0025 0000 3155`
- Requires additional authentication

Full list: https://stripe.com/docs/testing

### 6.2 Test Subscription Creation

1. Run your app: `npm run dev`
2. Log in to your BuildMyBot account
3. Go to **Billing** page
4. Click "Upgrade" on Starter plan
5. Enter test card: `4242 4242 4242 4242`
6. Complete checkout
7. Should redirect to success page
8. Check Stripe Dashboard → Subscriptions (should see new subscription)
9. Check your database → `subscriptions` table (should have record)

### 6.3 Test Webhook Delivery

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event type: `customer.subscription.created`
5. Click **"Send test webhook"**
6. Check your server logs for webhook processing
7. Check database for subscription update

### 6.4 Test Subscription Management

1. Create a test subscription
2. Go to Billing page
3. Click "Manage Subscription"
4. Should redirect to Stripe Customer Portal
5. Try:
   - Changing payment method
   - Updating plan
   - Canceling subscription
6. Each action should trigger webhooks
7. Verify changes reflected in your database

---

## Step 7: Handle Failed Payments

### 7.1 Configure Retry Logic

In Stripe Dashboard:
1. Go to **Settings** → **Billing** → **Subscriptions and emails**
2. Configure:
   - **Smart retries:** Enabled (automatically retries failed payments)
   - **Payment retry schedule:** 3 days, 5 days, 7 days (default)
   - **Subscription lifecycle:** Cancel after 4 failed payment attempts

### 7.2 Email Notifications

Stripe automatically sends emails for:
- Payment successful
- Payment failed
- Card expiring soon
- Subscription canceled

Customize email templates:
1. Go to **Settings** → **Billing** → **Emails**
2. Customize templates with your branding

---

## Step 8: Production Checklist

Before going live:

### 8.1 Switch to Live Mode

1. In Stripe Dashboard, toggle to **Live mode**
2. Copy live API keys (start with `pk_live_` and `sk_live_`)
3. Update production environment variables
4. Update webhook endpoint to production URL
5. Copy new webhook secret

### 8.2 Verify Account Activation

1. Complete business verification
2. Add business address
3. Verify bank account
4. Accept Stripe Terms of Service

### 8.3 Test Live Payment

1. Make a real payment with your own card
2. Verify funds appear in Stripe balance
3. Request a test payout to bank account
4. Verify webhook delivery

### 8.4 Security Checklist

- [ ] Webhook signature verification enabled
- [ ] API keys stored in environment variables (not in code)
- [ ] HTTPS only in production
- [ ] Rate limiting on checkout endpoints
- [ ] Fraud detection enabled (Stripe Radar)
- [ ] 3D Secure enabled for high-risk payments

---

## Step 9: Monitor & Optimize

### 9.1 Stripe Dashboard

Monitor:
- **Home:** Overview of payments, subscriptions
- **Payments:** Individual payment details
- **Subscriptions:** Active/canceled subscriptions
- **Customers:** Customer list and history
- **Disputes:** Chargebacks and disputes
- **Reports:** Revenue, MRR, churn, etc.

### 9.2 Key Metrics

Track:
- **MRR (Monthly Recurring Revenue):** Total monthly revenue
- **Churn Rate:** % of customers who cancel
- **LTV (Lifetime Value):** Average customer value
- **ARPU (Average Revenue Per User):** MRR / active customers
- **Failed Payment Rate:** % of failed payments

### 9.3 Optimize Conversion

Stripe Checkout best practices:
- Mobile-optimized (automatically handled)
- Multiple payment methods (card, Apple Pay, Google Pay)
- Clear pricing and terms
- Instant email confirmation
- Easy cancellation process

---

## Troubleshooting

### Issue: Webhook not receiving events

**Solutions:**
1. Check webhook URL is publicly accessible (use ngrok for local)
2. Verify webhook secret is correct in `.env.local`
3. Check server logs for errors
4. Test webhook manually in Stripe Dashboard
5. Ensure endpoint returns 200 status

### Issue: Subscription not creating in database

**Solutions:**
1. Check webhook is configured with correct events
2. Verify `user_id` in subscription metadata
3. Check database permissions (RLS policies)
4. Look for errors in server logs
5. Test webhook delivery manually

### Issue: Customer Portal not working

**Solutions:**
1. Verify customer has active subscription
2. Check Stripe customer ID exists
3. Enable Customer Portal in Stripe settings:
   - Go to **Settings** → **Billing** → **Customer portal**
   - Toggle "Enable customer portal"
4. Check return URL is correct

### Issue: Test payments fail

**Solutions:**
1. Use correct test card numbers (see above)
2. Check Stripe is in test mode
3. Verify API keys are test mode keys
4. Check for errors in browser console
5. Ensure checkout session is created successfully

---

## Pricing Strategy Tips

### Monthly vs. Annual

Consider adding annual plans with discount:
- Annual Starter: $290/yr (save $58)
- Annual Professional: $990/yr (save $198)
- Encourages longer commitments
- Reduces churn
- Better cash flow

### Freemium Model

- Free plan: 50 conversations/month
- Goal: Get users hooked, then convert to paid
- Typical conversion rate: 2-5%
- Upgrade prompts when limits reached

### Usage-Based Pricing

Consider adding:
- Overage charges: $0.01/conversation over limit
- Add-on features: Phone agent ($50/mo), white-label ($100/mo)
- Enterprise custom pricing

---

## Costs & Fees

### Stripe Fees

- **Standard rate:** 2.9% + $0.30 per transaction
- **Subscriptions:** Same as above
- **International cards:** +1% fee
- **Currency conversion:** +1% fee
- **Disputes:** $15 per chargeback

### Monthly Volume Discounts

- Contact Stripe for enterprise pricing
- Typical discounts at $80K+/month volume

### Example Calculations

**Starter Plan ($29/mo):**
- Stripe fee: $1.14
- Net revenue: $27.86
- Margin: 96%

**Professional Plan ($99/mo):**
- Stripe fee: $3.17
- Net revenue: $95.83
- Margin: 96.8%

---

## Resources

- **Stripe Docs:** https://stripe.com/docs
- **Subscription Billing:** https://stripe.com/docs/billing/subscriptions
- **Webhooks:** https://stripe.com/docs/webhooks
- **Testing:** https://stripe.com/docs/testing
- **Customer Portal:** https://stripe.com/docs/billing/subscriptions/customer-portal

---

## Support

Need help with Stripe setup?

- **Stripe Support:** support@stripe.com
- **Stripe Discord:** https://stripe.com/discord
- **Our Docs:** See IMPLEMENTATION_ROADMAP.md

---

*Last updated: November 25, 2025*
