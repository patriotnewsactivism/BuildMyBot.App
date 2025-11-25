import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';

if (!resendApiKey) {
  console.warn('Resend API key is not set');
}

export const resend = new Resend(resendApiKey);

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
) {
  try {
    await resend.emails.send({
      from: 'BuildMyBot <noreply@buildmybot.app>',
      to,
      subject: 'Welcome to BuildMyBot! 🤖',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1e3a8a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; }
              .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🤖 Welcome to BuildMyBot!</h1>
              </div>
              <div class="content">
                <h2>Hi ${name},</h2>
                <p>Thanks for joining BuildMyBot! We're excited to help you create intelligent AI chatbots for your business.</p>

                <h3>🚀 Get Started in 3 Steps:</h3>
                <ol>
                  <li><strong>Create Your First Bot</strong> - Configure your AI assistant with custom prompts</li>
                  <li><strong>Customize Appearance</strong> - Match your brand colors and style</li>
                  <li><strong>Add to Your Website</strong> - Copy a simple code snippet</li>
                </ol>

                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>

                <h3>💡 Pro Tips:</h3>
                <ul>
                  <li>Start with a clear system prompt that defines your bot's personality</li>
                  <li>Test conversations before deploying to your website</li>
                  <li>Use lead capture prompts to collect visitor information</li>
                  <li>Check analytics daily to optimize performance</li>
                </ul>

                <p>Need help? Just reply to this email - we're here to support you!</p>

                <p>Best regards,<br>The BuildMyBot Team</p>
              </div>
              <div class="footer">
                <p>BuildMyBot - AI Chatbots Made Simple</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}">Visit Dashboard</a> | <a href="${process.env.NEXT_PUBLIC_APP_URL}/docs">Documentation</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

/**
 * Send hot lead alert to bot owner
 */
export async function sendHotLeadAlert(
  to: string,
  leadData: {
    email?: string;
    phone?: string;
    score: number;
    botName: string;
    conversationUrl: string;
    messages: string[];
  }
) {
  try {
    await resend.emails.send({
      from: 'BuildMyBot Alerts <alerts@buildmybot.app>',
      to,
      subject: `🔥 Hot Lead Alert: ${leadData.score}/100 on ${leadData.botName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .score { font-size: 48px; font-weight: bold; margin: 10px 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .lead-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .conversation { background: #f9fafb; padding: 15px; border-left: 4px solid #1e3a8a; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔥 Hot Lead Alert!</h1>
                <div class="score">${leadData.score}/100</div>
                <p>High-value lead detected on ${leadData.botName}</p>
              </div>
              <div class="content">
                <div class="lead-info">
                  <h3>Lead Contact Information:</h3>
                  ${leadData.email ? `<p><strong>Email:</strong> ${leadData.email}</p>` : ''}
                  ${leadData.phone ? `<p><strong>Phone:</strong> ${leadData.phone}</p>` : ''}
                  <p><strong>Lead Score:</strong> ${leadData.score}/100</p>
                  <p><strong>Bot:</strong> ${leadData.botName}</p>
                </div>

                <h3>Recent Conversation:</h3>
                ${leadData.messages.slice(-3).map(msg => `
                  <div class="conversation">
                    ${msg}
                  </div>
                `).join('')}

                <a href="${leadData.conversationUrl}" class="button">View Full Conversation</a>

                <h3>⚡ Quick Actions:</h3>
                <ul>
                  <li>Respond within 5 minutes for best results</li>
                  <li>Reference their specific questions</li>
                  <li>Offer personalized solution</li>
                  <li>Schedule a call or demo</li>
                </ul>

                <p><em>Hot leads convert 5x better when contacted within the first hour!</em></p>
              </div>
              <div class="footer">
                <p>BuildMyBot Lead Alerts</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/leads">Manage Leads</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send hot lead alert:', error);
    throw error;
  }
}

/**
 * Send usage limit warning (80% of limit reached)
 */
export async function sendUsageLimitWarning(
  to: string,
  data: {
    planType: string;
    currentUsage: number;
    limit: number;
    percentage: number;
  }
) {
  try {
    await resend.emails.send({
      from: 'BuildMyBot <noreply@buildmybot.app>',
      to,
      subject: `⚠️ Usage Alert: ${data.percentage}% of ${data.planType} plan limit reached`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .usage-bar { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
              .usage-fill { background: #f59e0b; height: 100%; width: ${data.percentage}%; }
              .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Usage Alert</h1>
                <p>You're approaching your monthly conversation limit</p>
              </div>
              <div class="content">
                <h2>Current Usage</h2>
                <div class="usage-bar">
                  <div class="usage-fill"></div>
                </div>
                <p style="text-align: center; font-size: 24px; margin: 10px 0;">
                  <strong>${data.currentUsage} / ${data.limit}</strong> conversations (${data.percentage}%)
                </p>

                <p>Your <strong>${data.planType}</strong> plan includes ${data.limit} conversations per month. You've used ${data.currentUsage} so far.</p>

                <h3>What happens if I reach the limit?</h3>
                <ul>
                  <li>Your chatbots will stop responding to new visitors</li>
                  <li>Existing conversations will be saved</li>
                  <li>Limits reset on the 1st of each month</li>
                </ul>

                <h3>Options to continue:</h3>
                <ul>
                  <li><strong>Upgrade Plan:</strong> Get more conversations and features</li>
                  <li><strong>Wait:</strong> Limits reset at the start of next month</li>
                  <li><strong>Purchase Add-on:</strong> Buy extra conversations ($0.01 each)</li>
                </ul>

                <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" class="button">Upgrade Plan</a>

                <p>Questions? Just reply to this email!</p>
              </div>
              <div class="footer">
                <p>BuildMyBot Usage Monitoring</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/analytics">View Analytics</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send usage warning:', error);
    throw error;
  }
}

/**
 * Send subscription canceled notification
 */
export async function sendSubscriptionCanceledEmail(
  to: string,
  name: string,
  planType: string,
  endDate: string
) {
  try {
    await resend.emails.send({
      from: 'BuildMyBot <noreply@buildmybot.app>',
      to,
      subject: 'Your BuildMyBot subscription has been canceled',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Subscription Canceled</h1>
              </div>
              <div class="content">
                <h2>Hi ${name},</h2>
                <p>We're sorry to see you go. Your <strong>${planType}</strong> subscription has been canceled.</p>

                <h3>What happens now?</h3>
                <ul>
                  <li>Your bots will continue working until <strong>${endDate}</strong></li>
                  <li>After that, your account will revert to the Free plan</li>
                  <li>All your data and conversations will be preserved</li>
                  <li>You can reactivate anytime</li>
                </ul>

                <h3>We'd love your feedback</h3>
                <p>Would you mind sharing why you canceled? Your feedback helps us improve BuildMyBot for everyone.</p>

                <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback" class="button">Share Feedback</a>

                <p>Changed your mind? You can reactivate your subscription anytime before ${endDate}.</p>

                <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" class="button">Reactivate Subscription</a>

                <p>Thanks for being part of BuildMyBot!</p>

                <p>Best regards,<br>The BuildMyBot Team</p>
              </div>
              <div class="footer">
                <p>BuildMyBot</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}">Visit Dashboard</a></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
    throw error;
  }
}
