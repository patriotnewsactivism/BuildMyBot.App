// Integration test for create-lead Edge Function
// Run with: deno test --allow-all test/edge-functions/create-lead.test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'test-key';

Deno.test("create-lead: should create new lead", async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Setup: Create test user and bot
  const testEmail = `test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'testpassword123',
  });

  if (authError) throw authError;
  assertExists(authData.user);

  const { data: botData, error: botError } = await supabase
    .from('bots')
    .insert({
      owner_id: authData.user.id,
      name: 'Test Bot',
      type: 'support',
      system_prompt: 'Test prompt',
      model: 'gpt-4',
    })
    .select()
    .single();

  if (botError) throw botError;
  assertExists(botData);

  // Execute: Call create-lead function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-lead`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      botId: botData.id,
      email: 'lead@example.com',
      name: 'John Doe',
      phone: '123-456-7890',
      company: 'Acme Inc',
      score: 85,
    }),
  });

  // Assert: Check response
  assertEquals(response.status, 200);
  const result = await response.json();
  assertExists(result.leadId);
  assertEquals(result.success, true);
  assertEquals(result.message, 'Lead created');

  // Verify lead was created in database
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', result.leadId)
    .single();

  if (leadError) throw leadError;
  assertExists(leadData);
  assertEquals(leadData.email, 'lead@example.com');
  assertEquals(leadData.name, 'John Doe');
  assertEquals(leadData.score, 85);

  // Cleanup
  await supabase.from('leads').delete().eq('id', result.leadId);
  await supabase.from('bots').delete().eq('id', botData.id);
});

Deno.test("create-lead: should update existing lead", async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Setup: Create test user, bot, and existing lead
  const testEmail = `test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'testpassword123',
  });

  if (authError) throw authError;
  assertExists(authData.user);

  const { data: botData } = await supabase
    .from('bots')
    .insert({
      owner_id: authData.user.id,
      name: 'Test Bot',
      type: 'support',
      system_prompt: 'Test prompt',
      model: 'gpt-4',
    })
    .select()
    .single();

  assertExists(botData);

  const { data: existingLead } = await supabase
    .from('leads')
    .insert({
      owner_id: authData.user.id,
      source_bot_id: botData.id,
      email: 'existing@example.com',
      name: 'Jane Doe',
      score: 50,
      status: 'new',
    })
    .select()
    .single();

  assertExists(existingLead);

  // Execute: Call create-lead with same email
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-lead`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      botId: botData.id,
      email: 'existing@example.com',
      name: 'Jane Doe Updated',
      score: 90,
    }),
  });

  // Assert: Check response
  assertEquals(response.status, 200);
  const result = await response.json();
  assertEquals(result.success, true);
  assertEquals(result.message, 'Lead updated');

  // Verify lead was updated
  const { data: updatedLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', existingLead.id)
    .single();

  assertExists(updatedLead);
  assertEquals(updatedLead.score, 90); // Score should be updated to higher value

  // Cleanup
  await supabase.from('leads').delete().eq('id', existingLead.id);
  await supabase.from('bots').delete().eq('id', botData.id);
});

Deno.test("create-lead: should reject unauthorized request", async () => {
  // Execute: Call without auth token
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      botId: 'invalid-bot',
      email: 'test@example.com',
    }),
  });

  // Assert: Should return 401
  assertEquals(response.status, 401);
  const result = await response.json();
  assertEquals(result.error, 'Unauthorized');
});
