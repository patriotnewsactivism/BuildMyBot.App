# BuildMyBot User Guide

Welcome to BuildMyBot! This guide will help you get started building intelligent AI chatbots.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Bot](#creating-your-first-bot)
3. [Training Your Bot](#training-your-bot)
4. [Managing Leads](#managing-leads)
5. [Marketing Tools](#marketing-tools)
6. [Phone Agent](#phone-agent)
7. [Reseller Program](#reseller-program)
8. [Billing & Plans](#billing--plans)

---

## Getting Started

### Creating an Account

1. Visit [buildmybot.app](https://buildmybot.app)
2. Click "Sign Up" in the top right
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile

### Dashboard Overview

After logging in, you'll see your main dashboard with:

- **Bots**: All your AI chatbots
- **Leads**: Captured leads from conversations
- **Analytics**: Usage statistics and metrics
- **Marketplace**: Pre-built bot templates
- **Settings**: Account configuration

---

## Creating Your First Bot

### Step 1: Start Building

1. Click "New Bot" from the dashboard
2. Choose a bot type:
   - **Support Bot**: Customer service and FAQ
   - **Sales Bot**: Lead generation and qualification
   - **City Services**: Government and public service
   - **Recruitment**: Job applications and screening
   - **Travel**: Booking and recommendations
   - **Real Estate**: Property inquiries

### Step 2: Configure Your Bot

**Basic Settings:**
- **Name**: Give your bot a descriptive name
- **System Prompt**: Define your bot's personality and role
- **Model**: Choose GPT-4 or GPT-4o-mini
- **Temperature**: Adjust creativity (0.0 = focused, 1.0 = creative)

**Advanced Settings:**
- **Theme Color**: Customize the chat widget appearance
- **Max Messages**: Set conversation length limits
- **Randomize Identity**: Generate varied responses

### Step 3: Preview & Test

1. Use the preview chat on the right side
2. Test various questions and scenarios
3. Refine your system prompt based on responses
4. Save your bot when satisfied

---

## Training Your Bot

### Knowledge Base

Train your bot with custom content:

#### Upload PDFs
1. Go to Bot Builder → Knowledge Base
2. Click "Upload PDF"
3. Select your file (max 10MB)
4. Wait for processing and embedding

#### Add Website URLs
1. Click "Add URL"
2. Enter the website URL
3. The system will crawl and extract content
4. Review and approve the content

#### Add Text Content
1. Click "Add Text"
2. Paste or type your content
3. Add a title for organization
4. Save to knowledge base

### Best Practices

- Use clear, well-structured content
- Keep documents focused on specific topics
- Update knowledge base regularly
- Test bot responses after adding content
- Remove outdated information

---

## Managing Leads

### Lead Capture

Leads are automatically captured when visitors provide:
- Email address
- Phone number
- Name
- Company information

### CRM Features

**List View:**
- See all leads in a sortable table
- Filter by status, score, or date
- Export to CSV for external tools

**Kanban View:**
- Drag and drop between stages
- Visual pipeline management
- Quick status updates

**Lead Scoring:**
- Automatic scoring (0-100)
- Based on conversation intent
- Hot leads highlighted

### Lead Management

**Actions:**
- Add notes to leads
- Update contact information
- Change lead status
- Mark as converted

**Statuses:**
- New
- Contacted
- Qualified
- Converted
- Closed

---

## Marketing Tools

### Content Generator

Create engaging marketing content:

#### Social Media Posts
1. Select "Social Post"
2. Choose platform (Twitter/X, LinkedIn, Facebook)
3. Enter topic or product
4. Generate and customize

#### Email Campaigns
1. Select "Email"
2. Choose campaign type
3. Enter key points
4. Review and edit

#### Blog Posts
1. Select "Blog Post"
2. Enter topic and keywords
3. Generate outline or full post
4. Export as markdown

### Website Builder

Create landing pages instantly:

1. Go to Website Builder
2. Click "New Page"
3. Choose industry template
4. Customize content and design
5. Embed your chatbot
6. Publish or export

---

## Phone Agent

### Setup

1. Navigate to Phone Agent
2. Connect your Twilio account
3. Configure phone number
4. Set up call routing

### Features

- 24/7 automated answering
- Natural voice conversations
- Appointment booking
- Call transcripts saved to CRM
- Urgent call routing

### Configuration

**Voice Settings:**
- Choose voice type
- Set speaking rate
- Configure language

**Call Flow:**
- Greeting message
- Menu options
- Escalation rules
- Business hours

---

## Reseller Program

### Becoming a Partner

1. Visit Partner Program page
2. Apply for partner account
3. Wait for approval
4. Receive referral code

### Commission Tiers

- **Bronze**: 20% commission
- **Silver**: 25% commission (5+ clients)
- **Gold**: 30% commission (20+ clients)
- **Platinum**: 35% commission (50+ clients)

### Managing Clients

**Dashboard:**
- View all referred clients
- Track commission earnings
- See conversion rates
- Download reports

**White-Label:**
- Custom branding available
- Resell under your name
- Set your own pricing
- Full client management

---

## Billing & Plans

### Plan Comparison

#### Free Plan
- 1 bot
- 100 messages/month
- 10 leads
- Basic support

#### Pro Plan ($49/mo)
- 5 bots
- 1,000 messages/month
- 100 leads
- Email support
- Custom branding

#### Business Plan ($149/mo)
- 20 bots
- 10,000 messages/month
- 1,000 leads
- Priority support
- Phone agent
- API access

#### Enterprise Plan (Custom)
- Unlimited bots
- Unlimited messages
- Unlimited leads
- Dedicated support
- Custom integrations
- SLA guarantee

### Managing Your Subscription

**Upgrade:**
1. Go to Settings → Billing
2. Click "Upgrade Plan"
3. Select desired plan
4. Enter payment information

**Usage Monitoring:**
- View current usage
- Check quota limits
- See billing history
- Download invoices

---

## Troubleshooting

### Common Issues

**Bot not responding:**
- Check bot is active
- Verify API keys configured
- Review system prompt
- Check quota limits

**Knowledge base not working:**
- Ensure content is embedded
- Wait for processing to complete
- Check file format and size
- Verify permissions

**Leads not capturing:**
- Confirm lead capture enabled
- Check conversation flow
- Verify CRM permissions
- Review bot configuration

### Getting Help

**Support Options:**
- Email: support@buildmybot.app
- Documentation: docs.buildmybot.app
- Community: community.buildmybot.app
- Status: status.buildmybot.app

---

## Tips & Best Practices

### Bot Performance

1. **Clear Instructions**: Write specific system prompts
2. **Test Thoroughly**: Try edge cases and unusual inputs
3. **Update Regularly**: Keep knowledge base current
4. **Monitor Metrics**: Track response quality and lead conversion
5. **Iterate**: Continuously improve based on data

### Lead Conversion

1. **Quick Response**: Follow up within 24 hours
2. **Personalize**: Reference conversation context
3. **Qualify**: Focus on high-score leads first
4. **Track**: Use CRM status updates
5. **Nurture**: Stay in touch with warm leads

### Security

1. **Strong Passwords**: Use unique, complex passwords
2. **2FA**: Enable two-factor authentication
3. **API Keys**: Keep keys secure and private
4. **Permissions**: Review team access regularly
5. **Backups**: Export data periodically

---

## Advanced Features

### API Integration

Integrate BuildMyBot with your existing systems:

```javascript
// Example: Create lead via API
const response = await fetch('YOUR_EDGE_FUNCTION_URL/create-lead', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    botId: 'your-bot-id',
    email: 'lead@example.com',
    name: 'John Doe'
  })
});
```

See [API Documentation](./API.md) for complete reference.

### Webhooks

Receive real-time notifications:

1. Go to Settings → Webhooks
2. Add webhook URL
3. Select events to monitor
4. Test webhook delivery
5. Handle events in your system

### Custom Domains

Use your own domain for chat widgets:

1. Go to Settings → Domains
2. Add your domain
3. Configure DNS records
4. Verify ownership
5. Deploy chat widget

---

## Frequently Asked Questions

**Q: Can I use my own OpenAI API key?**
A: Yes, enterprise plans support custom API keys.

**Q: Is my data secure?**
A: Yes, we use industry-standard encryption and follow SOC 2 compliance.

**Q: Can I export my data?**
A: Yes, you can export all data anytime from Settings.

**Q: Do you offer refunds?**
A: Yes, 30-day money-back guarantee on all plans.

**Q: Can I white-label the platform?**
A: Yes, available on Business and Enterprise plans.

---

**Last Updated**: January 2024
**Version**: 1.0.0

For the latest updates, visit our [documentation website](https://docs.buildmybot.app).
