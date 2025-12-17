/**
 * Firebase to Supabase Migration Script
 *
 * This script migrates data from Firebase Firestore to Supabase PostgreSQL
 *
 * Prerequisites:
 * 1. Export your Firebase data using Firebase Admin SDK or Firebase Export
 * 2. Set up your Supabase project with the schema from migrations
 * 3. Configure environment variables
 *
 * Usage:
 * node scripts/firebase-to-supabase-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIREBASE_EXPORT_PATH = './firebase-export.json'; // Path to your Firebase export

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Load Firebase export data
 */
function loadFirebaseData() {
  try {
    const data = readFileSync(FIREBASE_EXPORT_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading Firebase export:', error);
    console.log('Please ensure you have exported your Firebase data to firebase-export.json');
    console.log('You can export using Firebase Admin SDK or Firebase Console');
    process.exit(1);
  }
}

/**
 * Map Firebase user to Supabase profile
 */
function mapUserToProfile(firebaseUser) {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.name || '',
    role: firebaseUser.role || 'OWNER',
    plan: firebaseUser.plan || 'FREE',
    company_name: firebaseUser.companyName || '',
    avatar_url: firebaseUser.avatarUrl || firebaseUser.photoURL || null,
    reseller_code: firebaseUser.resellerCode || null,
    reseller_client_count: firebaseUser.resellerClientCount || 0,
    custom_domain: firebaseUser.customDomain || null,
    referred_by: firebaseUser.referredBy || null,
    status: firebaseUser.status || 'Active',
    stripe_customer_id: firebaseUser.stripeCustomerId || null,
    phone_config: firebaseUser.phoneConfig || { enabled: false },
    created_at: firebaseUser.createdAt || new Date().toISOString(),
    updated_at: firebaseUser.updatedAt || new Date().toISOString()
  };
}

/**
 * Map Firebase bot to Supabase bot
 */
function mapBot(firebaseBot, userId) {
  return {
    id: firebaseBot.id,
    user_id: userId,
    name: firebaseBot.name || 'Untitled Bot',
    type: firebaseBot.type || 'general',
    system_prompt: firebaseBot.systemPrompt || firebaseBot.prompt || 'You are a helpful assistant.',
    model: firebaseBot.model || 'gpt-4o-mini',
    temperature: firebaseBot.temperature || 0.7,
    active: firebaseBot.active !== false,
    conversations_count: firebaseBot.conversationsCount || 0,
    theme_color: firebaseBot.themeColor || '#2563eb',
    website_url: firebaseBot.websiteUrl || null,
    max_messages: firebaseBot.maxMessages || null,
    randomize_identity: firebaseBot.randomizeIdentity || false,
    avatar: firebaseBot.avatar || null,
    response_delay: firebaseBot.responseDelay || 0,
    knowledge_base: firebaseBot.knowledgeBase || [],
    created_at: firebaseBot.createdAt || new Date().toISOString(),
    updated_at: firebaseBot.updatedAt || new Date().toISOString()
  };
}

/**
 * Map Firebase lead to Supabase lead
 */
function mapLead(firebaseLead, userId) {
  return {
    id: firebaseLead.id,
    user_id: userId,
    bot_id: firebaseLead.botId || null,
    name: firebaseLead.name || 'Unknown',
    email: firebaseLead.email || '',
    phone: firebaseLead.phone || null,
    score: firebaseLead.score || 50,
    status: firebaseLead.status || 'New',
    source_url: firebaseLead.sourceUrl || null,
    metadata: firebaseLead.metadata || {},
    created_at: firebaseLead.createdAt || new Date().toISOString(),
    updated_at: firebaseLead.updatedAt || new Date().toISOString()
  };
}

/**
 * Map Firebase conversation to Supabase conversation and messages
 */
function mapConversation(firebaseConvo, botId, userId) {
  const conversation = {
    id: firebaseConvo.id,
    bot_id: botId,
    user_id: userId,
    session_id: firebaseConvo.sessionId || firebaseConvo.id,
    lead_id: firebaseConvo.leadId || null,
    sentiment: firebaseConvo.sentiment || 'Neutral',
    created_at: firebaseConvo.createdAt || new Date().toISOString()
  };

  const messages = (firebaseConvo.messages || []).map(msg => ({
    conversation_id: firebaseConvo.id,
    role: msg.role || 'user',
    content: msg.content || '',
    timestamp: msg.timestamp || msg.createdAt || new Date().toISOString()
  }));

  return { conversation, messages };
}

/**
 * Migrate users
 */
async function migrateUsers(firebaseData) {
  console.log('Migrating users...');
  const users = firebaseData.users || {};
  let successCount = 0;
  let errorCount = 0;

  for (const [uid, userData] of Object.entries(users)) {
    try {
      // First create auth user if not exists
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: true,
        user_metadata: {
          name: userData.displayName || userData.name
        }
      });

      if (authError && !authError.message.includes('already exists')) {
        throw authError;
      }

      // Then create/update profile
      const profile = mapUserToProfile({ ...userData, uid: authUser?.id || uid });
      const { error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (error) throw error;
      successCount++;
      console.log(`✓ Migrated user: ${userData.email}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to migrate user ${uid}:`, error.message);
    }
  }

  console.log(`Users: ${successCount} succeeded, ${errorCount} failed\n`);
  return Object.keys(users).map(uid => ({ firebaseId: uid, supabaseId: uid }));
}

/**
 * Migrate bots
 */
async function migrateBots(firebaseData, userMappings) {
  console.log('Migrating bots...');
  const bots = firebaseData.bots || {};
  let successCount = 0;
  let errorCount = 0;

  for (const [botId, botData] of Object.entries(bots)) {
    try {
      const userId = userMappings.find(m => m.firebaseId === botData.userId)?.supabaseId || botData.userId;
      const bot = mapBot({ ...botData, id: botId }, userId);

      const { error } = await supabase
        .from('bots')
        .upsert(bot, { onConflict: 'id' });

      if (error) throw error;
      successCount++;
      console.log(`✓ Migrated bot: ${botData.name}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to migrate bot ${botId}:`, error.message);
    }
  }

  console.log(`Bots: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Migrate leads
 */
async function migrateLeads(firebaseData, userMappings) {
  console.log('Migrating leads...');
  const leads = firebaseData.leads || {};
  let successCount = 0;
  let errorCount = 0;

  for (const [leadId, leadData] of Object.entries(leads)) {
    try {
      const userId = userMappings.find(m => m.firebaseId === leadData.userId)?.supabaseId || leadData.userId;
      const lead = mapLead({ ...leadData, id: leadId }, userId);

      const { error } = await supabase
        .from('leads')
        .upsert(lead, { onConflict: 'id' });

      if (error) throw error;
      successCount++;
      console.log(`✓ Migrated lead: ${leadData.name || leadData.email}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Failed to migrate lead ${leadId}:`, error.message);
    }
  }

  console.log(`Leads: ${successCount} succeeded, ${errorCount} failed\n`);
}

/**
 * Migrate conversations and messages
 */
async function migrateConversations(firebaseData, userMappings) {
  console.log('Migrating conversations...');
  const conversations = firebaseData.conversations || {};
  let convoSuccessCount = 0;
  let convoErrorCount = 0;
  let messageSuccessCount = 0;
  let messageErrorCount = 0;

  for (const [convoId, convoData] of Object.entries(conversations)) {
    try {
      const userId = userMappings.find(m => m.firebaseId === convoData.userId)?.supabaseId || convoData.userId;
      const { conversation, messages } = mapConversation(
        { ...convoData, id: convoId },
        convoData.botId,
        userId
      );

      // Insert conversation
      const { error: convoError } = await supabase
        .from('conversations')
        .upsert(conversation, { onConflict: 'id' });

      if (convoError) throw convoError;
      convoSuccessCount++;

      // Insert messages
      if (messages.length > 0) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert(messages);

        if (msgError) {
          messageErrorCount += messages.length;
          console.error(`✗ Failed to migrate messages for conversation ${convoId}:`, msgError.message);
        } else {
          messageSuccessCount += messages.length;
        }
      }

      console.log(`✓ Migrated conversation: ${convoId} (${messages.length} messages)`);
    } catch (error) {
      convoErrorCount++;
      console.error(`✗ Failed to migrate conversation ${convoId}:`, error.message);
    }
  }

  console.log(`Conversations: ${convoSuccessCount} succeeded, ${convoErrorCount} failed`);
  console.log(`Messages: ${messageSuccessCount} succeeded, ${messageErrorCount} failed\n`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('=================================');
  console.log('Firebase to Supabase Migration');
  console.log('=================================\n');

  try {
    // Load Firebase data
    const firebaseData = loadFirebaseData();
    console.log('Firebase data loaded successfully\n');

    // Migrate in order (respecting foreign key constraints)
    const userMappings = await migrateUsers(firebaseData);
    await migrateBots(firebaseData, userMappings);
    await migrateLeads(firebaseData, userMappings);
    await migrateConversations(firebaseData, userMappings);

    console.log('=================================');
    console.log('Migration completed!');
    console.log('=================================');
    console.log('\nNext steps:');
    console.log('1. Verify data in Supabase dashboard');
    console.log('2. Test authentication for migrated users');
    console.log('3. Update application configuration to use Supabase');
    console.log('4. Run application tests');
    console.log('5. Consider setting up password reset for migrated users');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();