// send-notification Edge Function
// Handles email and SMS notifications for leads, alerts, and system events
// Production-ready implementation using SendGrid and Twilio

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://buildmybot.app",
  "https://app.buildmybot.app",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Email templates
const EMAIL_TEMPLATES = {
  new_lead: {
    subject: "New Lead Captured from {botName}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Lead Alert</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-top: 0;">You have a new lead!</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 10px;"><strong>Name:</strong> {leadName}</p>
            <p style="margin: 0 0 10px;"><strong>Email:</strong> {leadEmail}</p>
            <p style="margin: 0 0 10px;"><strong>Phone:</strong> {leadPhone}</p>
            <p style="margin: 0 0 10px;"><strong>Lead Score:</strong> <span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px;">{leadScore}/100</span></p>
            <p style="margin: 0;"><strong>Source:</strong> {botName}</p>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="{dashboardUrl}" style="background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View in Dashboard</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
          <p>This notification was sent by BuildMyBot</p>
        </div>
      </div>
    `,
  },
  hot_lead: {
    subject: "HOT LEAD: {leadName} - Score {leadScore}/100",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">HOT LEAD ALERT</h1>
        </div>
        <div style="padding: 30px; background: #fef2f2;">
          <h2 style="color: #1e293b; margin-top: 0;">High-value lead detected!</h2>
          <p>This lead scored <strong>{leadScore}/100</strong> and requires immediate attention.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #dc2626;">
            <p style="margin: 0 0 10px;"><strong>Name:</strong> {leadName}</p>
            <p style="margin: 0 0 10px;"><strong>Email:</strong> <a href="mailto:{leadEmail}">{leadEmail}</a></p>
            <p style="margin: 0 0 10px;"><strong>Phone:</strong> <a href="tel:{leadPhone}">{leadPhone}</a></p>
            <p style="margin: 0;"><strong>Captured by:</strong> {botName}</p>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="{dashboardUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Contact Lead Now</a>
          </div>
        </div>
      </div>
    `,
  },
  welcome: {
    subject: "Welcome to BuildMyBot",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to BuildMyBot!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-top: 0;">Hi {userName}!</h2>
          <p>Thanks for signing up. You're now ready to create AI chatbots that capture leads 24/7.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0;">Quick Start Guide:</h3>
            <ol style="padding-left: 20px;">
              <li>Create your first bot in the Bot Builder</li>
              <li>Add knowledge from your website or documents</li>
              <li>Embed the chat widget on your site</li>
              <li>Start capturing leads automatically!</li>
            </ol>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="{dashboardUrl}" style="background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Go to Dashboard</a>
          </div>
        </div>
      </div>
    `,
  },
  payment_failed: {
    subject: "Action Required: Payment Failed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Failed</h1>
        </div>
        <div style="padding: 30px; background: #fef2f2;">
          <h2 style="color: #1e293b; margin-top: 0;">Hi {userName},</h2>
          <p>We were unable to process your payment for your {planName} subscription.</p>
          <p>Please update your payment method to avoid service interruption.</p>
          <div style="margin-top: 20px; text-align: center;">
            <a href="{billingUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Update Payment Method</a>
          </div>
        </div>
      </div>
    `,
  },
};

interface SendEmailRequest {
  type: "new_lead" | "hot_lead" | "welcome" | "payment_failed" | "custom";
  to: string;
  subject?: string;
  html?: string;
  variables?: Record<string, string>;
}

interface SendSmsRequest {
  to: string;
  message: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication (either internal call or user request)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "send_email": {
        if (!sendgridApiKey) {
          return new Response(
            JSON.stringify({ error: "Email service not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const emailRequest: SendEmailRequest = body;
        let { to, subject, html, type, variables } = emailRequest;

        // Use template if type is specified
        if (type && type !== "custom" && EMAIL_TEMPLATES[type]) {
          const template = EMAIL_TEMPLATES[type];
          subject = template.subject;
          html = template.html;
        }

        // Replace variables in template
        if (variables) {
          for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, "g");
            subject = subject?.replace(regex, value) || subject;
            html = html?.replace(regex, value) || html;
          }
        }

        // Send email via SendGrid
        const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: "notifications@buildmybot.app", name: "BuildMyBot" },
            subject,
            content: [{ type: "text/html", value: html }],
          }),
        });

        if (!sendgridResponse.ok) {
          const errorText = await sendgridResponse.text();
          console.error("SendGrid error:", errorText);
          throw new Error("Failed to send email");
        }

        // Log notification
        if (userId) {
          await supabase.from("marketing_content").insert({
            user_id: userId,
            content_type: "email_notification",
            title: subject,
            content: html,
            metadata: { to, type, sent_at: new Date().toISOString() },
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Email sent successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send_sms": {
        if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
          return new Response(
            JSON.stringify({ error: "SMS service not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const smsRequest: SendSmsRequest = body;
        const { to, message } = smsRequest;

        if (!to || !message) {
          return new Response(
            JSON.stringify({ error: "Missing to or message" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send SMS via Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: twilioPhoneNumber,
              To: to,
              Body: message,
            }),
          }
        );

        if (!twilioResponse.ok) {
          const errorData = await twilioResponse.json();
          console.error("Twilio error:", errorData);
          throw new Error("Failed to send SMS");
        }

        return new Response(
          JSON.stringify({ success: true, message: "SMS sent successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "notify_new_lead": {
        // Internal function to notify user of new lead
        const { leadId, botId } = body;

        // Get lead and bot details
        const { data: lead } = await supabase
          .from("leads")
          .select("*, bots(name, user_id)")
          .eq("id", leadId)
          .single();

        if (!lead) {
          return new Response(
            JSON.stringify({ error: "Lead not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", lead.bots.user_id)
          .single();

        if (!profile?.email) {
          return new Response(
            JSON.stringify({ error: "User email not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Choose template based on lead score
        const templateType = lead.score >= 80 ? "hot_lead" : "new_lead";
        const template = EMAIL_TEMPLATES[templateType];

        const variables = {
          leadName: lead.name,
          leadEmail: lead.email,
          leadPhone: lead.phone || "Not provided",
          leadScore: String(lead.score),
          botName: lead.bots.name,
          dashboardUrl: "https://app.buildmybot.app/leads",
        };

        // Send email notification
        if (sendgridApiKey) {
          let subject = template.subject;
          let html = template.html;

          for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, "g");
            subject = subject.replace(regex, value);
            html = html.replace(regex, value);
          }

          await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sendgridApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: profile.email }] }],
              from: { email: "notifications@buildmybot.app", name: "BuildMyBot" },
              subject,
              content: [{ type: "text/html", value: html }],
            }),
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Lead notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in send-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
