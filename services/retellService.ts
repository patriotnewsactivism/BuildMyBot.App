/**
 * Retell AI Phone Agent Service
 *
 * Retell AI provides human-like conversational voice agents.
 * - Latency: <500ms
 * - Pricing: $0.07/min
 * - Compliance: HIPAA, SOC2, GDPR
 *
 * Setup Requirements:
 * 1. Create account at https://retellai.com
 * 2. Get API key from dashboard
 * 3. Create an agent in Retell dashboard
 * 4. Connect Twilio phone number (or use Retell's numbers)
 *
 * Environment Variables:
 * - RETELL_API_KEY: Your Retell API key
 */

const getRetellApiKey = () => {
  return process.env.VITE_RETELL_API_KEY || process.env.RETELL_API_KEY || '';
};

const RETELL_API_BASE = 'https://api.retellai.com';

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  llm_websocket_url?: string;
  webhook_url?: string;
}

export interface RetellCall {
  call_id: string;
  agent_id: string;
  call_status: 'registered' | 'ongoing' | 'ended' | 'error';
  start_timestamp?: number;
  end_timestamp?: number;
  transcript?: string;
  recording_url?: string;
  from_number?: string;
  to_number?: string;
}

export interface RetellVoice {
  voice_id: string;
  voice_name: string;
  provider: string;
  accent?: string;
  gender?: string;
  preview_audio_url?: string;
}

// Available voice options (Retell supports ElevenLabs, Azure, and their own voices)
export const RETELL_VOICES: RetellVoice[] = [
  // ElevenLabs voices (most human-like)
  { voice_id: 'eleven_turbo_v2_rachel', voice_name: 'Rachel', provider: 'ElevenLabs', gender: 'female', accent: 'American' },
  { voice_id: 'eleven_turbo_v2_adam', voice_name: 'Adam', provider: 'ElevenLabs', gender: 'male', accent: 'American' },
  { voice_id: 'eleven_turbo_v2_antoni', voice_name: 'Antoni', provider: 'ElevenLabs', gender: 'male', accent: 'American' },
  { voice_id: 'eleven_turbo_v2_bella', voice_name: 'Bella', provider: 'ElevenLabs', gender: 'female', accent: 'American' },
  { voice_id: 'eleven_turbo_v2_josh', voice_name: 'Josh', provider: 'ElevenLabs', gender: 'male', accent: 'American' },
  { voice_id: 'eleven_turbo_v2_sarah', voice_name: 'Sarah', provider: 'ElevenLabs', gender: 'female', accent: 'American' },

  // Azure voices (good quality, lower cost)
  { voice_id: 'azure_jenny', voice_name: 'Jenny', provider: 'Azure', gender: 'female', accent: 'American' },
  { voice_id: 'azure_guy', voice_name: 'Guy', provider: 'Azure', gender: 'male', accent: 'American' },
  { voice_id: 'azure_aria', voice_name: 'Aria', provider: 'Azure', gender: 'female', accent: 'American' },
  { voice_id: 'azure_davis', voice_name: 'Davis', provider: 'Azure', gender: 'male', accent: 'American' },

  // Retell native voices
  { voice_id: 'retell_emma', voice_name: 'Emma', provider: 'Retell', gender: 'female', accent: 'American' },
  { voice_id: 'retell_james', voice_name: 'James', provider: 'Retell', gender: 'male', accent: 'American' },
];

/**
 * Create a new Retell AI agent
 */
export const createRetellAgent = async (
  agentName: string,
  voiceId: string,
  systemPrompt: string,
  knowledgeBase?: string[]
): Promise<RetellAgent | null> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) {
    console.error('Retell API key not configured');
    return null;
  }

  const prompt = knowledgeBase && knowledgeBase.length > 0
    ? `${systemPrompt}\n\n### KNOWLEDGE BASE:\n${knowledgeBase.join('\n')}`
    : systemPrompt;

  try {
    const response = await fetch(`${RETELL_API_BASE}/create-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agent_name: agentName,
        voice_id: voiceId,
        language: 'en-US',
        response_engine: {
          type: 'retell-llm',
          llm_id: 'gpt-4o-mini', // Use GPT-4o-mini for cost efficiency
        },
        general_prompt: prompt,
        begin_message: "Hello! Thanks for calling. How can I help you today?",
        // Human-like settings
        responsiveness: 0.8, // Quick but not robotic
        interruption_sensitivity: 0.6,
        enable_backchannel: true, // "uh-huh", "I see" etc.
        backchannel_frequency: 0.5,
        reminder_trigger_ms: 10000,
        reminder_max_count: 2,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Retell API error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create Retell agent:', error);
    return null;
  }
};

/**
 * Update an existing Retell agent
 */
export const updateRetellAgent = async (
  agentId: string,
  updates: Partial<{
    agent_name: string;
    voice_id: string;
    general_prompt: string;
    begin_message: string;
  }>
): Promise<boolean> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) return false;

  try {
    const response = await fetch(`${RETELL_API_BASE}/update-agent/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(updates),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to update Retell agent:', error);
    return false;
  }
};

/**
 * Get agent details
 */
export const getRetellAgent = async (agentId: string): Promise<RetellAgent | null> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${RETELL_API_BASE}/get-agent/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get Retell agent:', error);
    return null;
  }
};

/**
 * List all calls for analytics
 */
export const listRetellCalls = async (
  agentId?: string,
  limit: number = 50
): Promise<RetellCall[]> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (agentId) params.append('agent_id', agentId);

    const response = await fetch(`${RETELL_API_BASE}/list-calls?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.calls || [];
  } catch (error) {
    console.error('Failed to list Retell calls:', error);
    return [];
  }
};

/**
 * Get call details including transcript
 */
export const getRetellCall = async (callId: string): Promise<RetellCall | null> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${RETELL_API_BASE}/get-call/${callId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get Retell call:', error);
    return null;
  }
};

/**
 * Create a web call (for testing in browser)
 */
export const createWebCall = async (agentId: string): Promise<{ access_token: string } | null> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${RETELL_API_BASE}/create-web-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to create web call:', error);
    return null;
  }
};

/**
 * Register a phone number with Retell
 */
export const registerPhoneNumber = async (
  phoneNumber: string,
  agentId: string
): Promise<boolean> => {
  const apiKey = getRetellApiKey();
  if (!apiKey) return false;

  try {
    const response = await fetch(`${RETELL_API_BASE}/create-phone-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        agent_id: agentId,
        // Twilio credentials would be configured in Retell dashboard
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to register phone number:', error);
    return false;
  }
};

/**
 * Check if Retell is configured
 */
export const isRetellConfigured = (): boolean => {
  return !!getRetellApiKey();
};
