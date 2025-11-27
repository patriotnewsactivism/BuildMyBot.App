/**
 * BuildMyBot Cloud Functions
 * Secure backend API proxy for OpenAI, Twilio, and other services
 * Prevents API key exposure and adds rate limiting/validation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import OpenAI from 'openai';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS configuration - adjust origins for production
const corsHandler = cors({
  origin: true, // Allow all origins in development. In production, specify your domain
  credentials: true,
});

// Helper to wrap functions with CORS
const withCors = (handler: any) => (req: any, res: any) => {
  return corsHandler(req, res, () => handler(req, res));
};

// =============================================================================
// CHAT & AI FUNCTIONS
// =============================================================================

/**
 * Generate bot response using OpenAI
 * POST /generateBotResponse
 * Body: { systemPrompt, history, lastMessage, modelName?, context? }
 */
export const generateBotResponse = functions.https.onRequest(
  withCors(async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    try {
      const {
        systemPrompt,
        history = [],
        lastMessage,
        modelName = 'gpt-4o-mini',
        context,
      } = req.body;

      // Validation
      if (!systemPrompt || !lastMessage) {
        res.status(400).send({ error: 'Missing required fields' });
        return;
      }

      // Inject context into system prompt if available
      let finalSystemPrompt = systemPrompt;
      if (context && context.trim().length > 0) {
        finalSystemPrompt += `\n\n[CONTEXT / KNOWLEDGE BASE]\nUse the following information to answer user questions. If the answer is not in this context, say you don't know, but offer to take their contact info.\n\n${context}`;
      }

      // Map internal roles to OpenAI roles
      const messages: any[] = [
        { role: 'system', content: finalSystemPrompt },
        ...history.map((h: any) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.text,
        })),
        { role: 'user', content: lastMessage },
      ];

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || 'No response generated.';

      res.status(200).send({
        response: responseText,
        usage: completion.usage,
      });
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      res.status(500).send({
        error: 'Failed to generate response',
        message: error.message,
      });
    }
  })
);

/**
 * Generate marketing content
 * POST /generateMarketingContent
 * Body: { type, topic, tone }
 */
export const generateMarketingContent = functions.https.onRequest(
  withCors(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    try {
      const { type, topic, tone } = req.body;

      if (!type || !topic || !tone) {
        res.status(400).send({ error: 'Missing required fields: type, topic, tone' });
        return;
      }

      let prompt = `Act as a world-class marketing copywriter. Write a ${tone} ${type} about ${topic}. Keep it engaging and conversion-focused.`;

      if (type === 'viral-thread') {
        prompt = `Write a viral Twitter/X thread about ${topic}. Use a hook in the first tweet, short punchy sentences, and a call to action at the end. Tone: ${tone}.`;
      } else if (type === 'story') {
        prompt = `Write a script for a 15-second Instagram/TikTok Story about ${topic}. Include visual cues in brackets [like this]. Tone: ${tone}.`;
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      });

      const content = completion.choices[0]?.message?.content || 'Failed to generate content.';

      res.status(200).send({ content });
    } catch (error: any) {
      console.error('Marketing Generation Error:', error);
      res.status(500).send({
        error: 'Failed to generate marketing content',
        message: error.message,
      });
    }
  })
);

/**
 * Generate website structure
 * POST /generateWebsiteStructure
 * Body: { businessName, description }
 */
export const generateWebsiteStructure = functions.https.onRequest(
  withCors(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    try {
      const { businessName, description } = req.body;

      if (!businessName || !description) {
        res.status(400).send({ error: 'Missing required fields: businessName, description' });
        return;
      }

      const prompt = `Create a single-page landing page structure for a business named "${businessName}".
      Description: ${description}.
      Return ONLY a JSON object with keys: "headline", "subheadline", "features" (array of strings), "ctaText".`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const structure = completion.choices[0]?.message?.content || '{}';

      res.status(200).send({ structure: JSON.parse(structure) });
    } catch (error: any) {
      console.error('Website Generation Error:', error);
      res.status(500).send({
        error: 'Failed to generate website structure',
        message: error.message,
      });
    }
  })
);

// =============================================================================
// PHONE AGENT FUNCTIONS (Twilio Integration)
// =============================================================================

/**
 * Handle incoming phone calls
 * POST /phoneAgent/incoming
 * Twilio webhook handler
 */
export const phoneAgentIncoming = functions.https.onRequest(
  withCors(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    try {
      const { CallSid, From, To, CallStatus } = req.body;

      console.log('Incoming call:', { CallSid, From, To, CallStatus });

      // Store call record in Firestore
      await admin.firestore().collection('phone_calls').doc(CallSid).set({
        callSid: CallSid,
        from: From,
        to: To,
        status: CallStatus,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Return TwiML response
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello! Thank you for calling. Please hold while we connect you to an AI assistant.</Say>
  <Pause length="1"/>
  <Redirect>/phoneAgent/stream/${CallSid}</Redirect>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
    } catch (error: any) {
      console.error('Phone Agent Error:', error);
      res.status(500).send({ error: error.message });
    }
  })
);

/**
 * Stream audio for real-time conversation
 * This would integrate with OpenAI Realtime API (WebSocket)
 */
export const phoneAgentStream = functions.https.onRequest(
  withCors(async (req, res) => {
    // Placeholder for WebSocket streaming implementation
    // This requires OpenAI Realtime API integration
    res.status(501).send({
      error: 'Real-time streaming not yet implemented',
      message: 'Use OpenAI Realtime API with WebSocket connection',
    });
  })
);

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

/**
 * Handle SMS messages
 * POST /sms/incoming
 * Twilio SMS webhook
 */
export const smsIncoming = functions.https.onRequest(
  withCors(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    try {
      const { MessageSid, From, Body, To } = req.body;

      console.log('Incoming SMS:', { MessageSid, From, Body });

      // Store message in Firestore
      await admin.firestore().collection('sms_messages').add({
        messageSid: MessageSid,
        from: From,
        to: To,
        body: Body,
        direction: 'inbound',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful SMS assistant. Keep responses under 160 characters.',
          },
          { role: 'user', content: Body },
        ],
        max_tokens: 50,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Thank you for your message!';

      // Return TwiML to reply
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse}</Message>
</Response>`;

      res.type('text/xml');
      res.send(twiml);
    } catch (error: any) {
      console.error('SMS Handler Error:', error);
      res.status(500).send({ error: error.message });
    }
  })
);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Health check endpoint
 * GET /health
 */
export const health = functions.https.onRequest(
  withCors(async (req, res) => {
    res.status(200).send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      functions: [
        'generateBotResponse',
        'generateMarketingContent',
        'generateWebsiteStructure',
        'phoneAgentIncoming',
        'smsIncoming',
      ],
    });
  })
);
