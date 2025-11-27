/**
 * Phone Agent Routes
 * Twilio integration for voice calls and SMS
 */

import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import * as admin from 'firebase-admin';

const router = Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Twilio webhook validation middleware
const validateTwilioRequest = (req: Request, res: Response, next: any) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN || '',
    twilioSignature,
    url,
    req.body
  );

  if (process.env.NODE_ENV === 'production' && !isValid) {
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }

  next();
};

/**
 * POST /api/phone/call/incoming
 * Handle incoming phone calls
 */
router.post('/call/incoming', validateTwilioRequest, async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;

    console.log('Incoming call:', { CallSid, From, To, CallStatus });

    // Store call record in Firestore
    const db = admin.firestore();
    await db.collection('phone_calls').doc(CallSid).set({
      callSid: CallSid,
      from: From,
      to: To,
      status: CallStatus,
      direction: 'inbound',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      {
        voice: 'Polly.Joanna',
      },
      'Hello! Thank you for calling BuildMyBot. Please hold while we connect you to an AI assistant.'
    );
    twiml.pause({ length: 1 });

    // For real-time AI conversation, redirect to streaming endpoint
    // twiml.redirect(`/api/phone/call/stream/${CallSid}`);

    // For now, just gather input
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/phone/call/process',
      method: 'POST',
    });
    gather.say('Please tell me how I can help you today.');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error: any) {
    console.error('Phone call error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/phone/call/process
 * Process speech input from caller
 */
router.post('/call/process', validateTwilioRequest, async (req: Request, res: Response) => {
  try {
    const { SpeechResult, CallSid } = req.body;

    console.log('Speech input:', { CallSid, SpeechResult });

    // TODO: Integrate with OpenAI to generate response
    // For now, echo back the input
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: 'Polly.Joanna' },
      `I heard you say: ${SpeechResult}. Thank you for calling. Goodbye!`
    );
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error: any) {
    console.error('Speech processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/phone/call/status
 * Handle call status updates from Twilio
 */
router.post('/call/status', validateTwilioRequest, async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    console.log('Call status update:', { CallSid, CallStatus, CallDuration });

    // Update call record in Firestore
    const db = admin.firestore();
    await db.collection('phone_calls').doc(CallSid).update({
      status: CallStatus,
      duration: CallDuration,
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.sendStatus(200);
  } catch (error: any) {
    console.error('Call status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/phone/sms/incoming
 * Handle incoming SMS messages
 */
router.post('/sms/incoming', validateTwilioRequest, async (req: Request, res: Response) => {
  try {
    const { MessageSid, From, Body, To } = req.body;

    console.log('Incoming SMS:', { MessageSid, From, Body });

    // Store message in Firestore
    const db = admin.firestore();
    await db.collection('sms_messages').add({
      messageSid: MessageSid,
      from: From,
      to: To,
      body: Body,
      direction: 'inbound',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // TODO: Generate AI response using OpenAI
    // For now, send a simple reply
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Thank you for your message! We will get back to you soon.');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error: any) {
    console.error('SMS handler error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/phone/sms/send
 * Send outbound SMS message
 */
router.post('/sms/send', async (req: Request, res: Response) => {
  try {
    const { to, body } = req.body;

    if (!to || !body) {
      return res.status(400).json({ error: 'to and body are required' });
    }

    const message = await twilioClient.messages.create({
      body,
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    res.json({
      messageSid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
    });
  } catch (error: any) {
    console.error('SMS send error:', error);
    res.status(500).json({ error: 'Failed to send SMS', message: error.message });
  }
});

export default router;
