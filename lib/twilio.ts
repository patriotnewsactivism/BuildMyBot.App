import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken) {
  console.warn('Twilio credentials not configured');
}

export const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

export const TWILIO_PHONE_NUMBER = phoneNumber;

/**
 * Make an outbound call
 */
export async function makeCall(to: string, twimlUrl: string) {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  return await twilioClient.calls.create({
    to,
    from: TWILIO_PHONE_NUMBER,
    url: twimlUrl,
  });
}

/**
 * Send SMS
 */
export async function sendSMS(to: string, body: string) {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  return await twilioClient.messages.create({
    to,
    from: TWILIO_PHONE_NUMBER,
    body,
  });
}

/**
 * Get call logs
 */
export async function getCallLogs(limit = 50) {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  return await twilioClient.calls.list({ limit });
}

/**
 * Get call recording
 */
export async function getCallRecording(callSid: string) {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  const recordings = await twilioClient.recordings.list({
    callSid,
    limit: 1,
  });

  return recordings[0];
}
