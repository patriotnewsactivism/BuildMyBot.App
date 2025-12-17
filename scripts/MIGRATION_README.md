# Firebase to Supabase Migration Guide

This guide helps you migrate your existing Firebase data to Supabase for BuildMyBot.

## Prerequisites

1. **Export Firebase Data**
2. **Set up Supabase Project**
3. **Configure Environment**

## Step 1: Export Firebase Data

### Option A: Using Firebase Admin SDK

Create a script to export your Firebase data:

```javascript
// firebase-export.js
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin with your service account
const serviceAccount = require('./path-to-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportData() {
  const data = {
    users: {},
    bots: {},
    leads: {},
    conversations: {}
  };

  // Export users
  const usersSnapshot = await db.collection('users').get();
  usersSnapshot.forEach(doc => {
    data.users[doc.id] = doc.data();
  });

  // Export bots
  const botsSnapshot = await db.collection('bots').get();
  botsSnapshot.forEach(doc => {
    data.bots[doc.id] = doc.data();
  });

  // Export leads
  const leadsSnapshot = await db.collection('leads').get();
  leadsSnapshot.forEach(doc => {
    data.leads[doc.id] = doc.data();
  });

  // Export conversations with messages
  const conversationsSnapshot = await db.collection('conversations').get();
  for (const doc of conversationsSnapshot.docs) {
    const convoData = doc.data();
    const messagesSnapshot = await doc.ref.collection('messages').get();
    convoData.messages = messagesSnapshot.docs.map(msgDoc => msgDoc.data());
    data.conversations[doc.id] = convoData;
  }

  // Save to file
  fs.writeFileSync('firebase-export.json', JSON.stringify(data, null, 2));
  console.log('Export complete: firebase-export.json');
}

exportData().catch(console.error);
```

Run the export:
```bash
node firebase-export.js
```

### Option B: Using Firebase Console

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Use the Firebase Admin SDK script above
4. Or use `firebase-tools` CLI:
   ```bash
   npm install -g firebase-tools
   firebase auth:export users.json
   firebase firestore:export ./firestore-export
   ```

## Step 2: Prepare Supabase

### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Wait for the project to be ready

### Apply Database Schema

Run the migration SQL files in your Supabase SQL Editor:

1. Go to SQL Editor in Supabase Dashboard
2. Run each migration file in order:
   - `20250109000000_initial_schema.sql`
   - `20250204000000_add_phone_call_metadata.sql`
   - `20251216_create_audit_logs.sql`

### Get Service Role Key

1. Go to Settings → API in Supabase Dashboard
2. Copy the `service_role` key (keep this secret!)
3. This key bypasses RLS for migration purposes

## Step 3: Configure Migration Environment

Create a `.env.migration` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: If you want to preserve user passwords
PRESERVE_PASSWORDS=false  # Set to true if migrating password hashes
```

## Step 4: Run the Migration

1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

2. Place your Firebase export in the scripts directory:
   ```bash
   mv firebase-export.json scripts/
   ```

3. Run the migration:
   ```bash
   cd scripts
   node firebase-to-supabase-migration.js
   ```

## Step 5: Verify Migration

### Check Data in Supabase

1. Go to Table Editor in Supabase Dashboard
2. Verify each table has the expected data:
   - `profiles` - User accounts
   - `bots` - Bot configurations
   - `leads` - Customer leads
   - `conversations` - Chat sessions
   - `messages` - Chat messages

### Test Authentication

Since Firebase Auth passwords cannot be migrated directly:

1. **Option 1**: Have users reset passwords
   - Send password reset emails to all users
   - Use Supabase Auth's password reset flow

2. **Option 2**: Implement custom migration
   - Keep Firebase Auth running temporarily
   - On first login, verify with Firebase, then set Supabase password
   - Gradually migrate users as they log in

### Sample password reset implementation:

```javascript
// Send password reset to all migrated users
async function sendPasswordResets() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email');

  for (const profile of profiles) {
    await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: 'https://yourdomain.com/reset-password'
    });
    console.log(`Password reset sent to ${profile.email}`);
  }
}
```

## Step 6: Update Application Configuration

1. Update environment variables to use Supabase
2. Remove Firebase configuration
3. Test all features thoroughly

## Troubleshooting

### Common Issues

1. **Auth users not created**
   - Error: "User already exists"
   - Solution: This is expected if re-running migration. Users are preserved.

2. **Foreign key violations**
   - Error: "violates foreign key constraint"
   - Solution: Ensure data is migrated in correct order (users → bots → leads → conversations)

3. **Data type mismatches**
   - Error: "invalid input syntax for type"
   - Solution: Check the mapping functions in migration script, adjust as needed

4. **Missing required fields**
   - Error: "null value in column"
   - Solution: Provide default values in mapping functions

### Rollback Procedure

If migration fails and you need to start over:

```sql
-- DANGER: This will delete all data! Only use for complete rollback
TRUNCATE messages CASCADE;
TRUNCATE conversations CASCADE;
TRUNCATE leads CASCADE;
TRUNCATE bots CASCADE;
TRUNCATE profiles CASCADE;

-- Also clean up auth users (requires service role)
-- This must be done via Supabase Dashboard or Admin API
```

## Data Mapping Reference

### Firebase → Supabase Field Mappings

**Users/Profiles:**
- `uid` → `id`
- `email` → `email`
- `displayName` → `name`
- `photoURL` → `avatar_url`
- `companyName` → `company_name`
- `resellerCode` → `reseller_code`
- `stripeCustomerId` → `stripe_customer_id`

**Bots:**
- `systemPrompt` or `prompt` → `system_prompt`
- `themeColor` → `theme_color`
- `websiteUrl` → `website_url`
- `maxMessages` → `max_messages`
- `randomizeIdentity` → `randomize_identity`
- `responseDelay` → `response_delay`
- `knowledgeBase` → `knowledge_base`

**Leads:**
- `sourceUrl` → `source_url`
- Keep `name`, `email`, `phone`, `score`, `status` as-is

**Conversations:**
- `sessionId` → `session_id`
- `leadId` → `lead_id`
- Nested `messages` collection → separate `messages` table

## Post-Migration Checklist

- [ ] All users migrated successfully
- [ ] All bots migrated with correct ownership
- [ ] All leads associated with correct users
- [ ] All conversations and messages preserved
- [ ] Authentication working for at least one test user
- [ ] Application connects to Supabase successfully
- [ ] Real-time subscriptions working
- [ ] Edge Functions deployed and accessible
- [ ] Storage buckets created and accessible
- [ ] RLS policies tested and working
- [ ] Backup of Firebase data saved securely
- [ ] Firebase project can be safely archived

## Support

If you encounter issues during migration:

1. Check Supabase logs in Dashboard → Logs
2. Review the migration script output for specific errors
3. Ensure all prerequisites are met
4. Verify your Firebase export contains expected data
5. Test with a small subset of data first

## Next Steps

After successful migration:

1. Update DNS/domain settings if using custom domain
2. Configure monitoring and alerts
3. Set up automated backups
4. Update documentation for team members
5. Plan Firebase shutdown date
6. Communicate changes to users if necessary