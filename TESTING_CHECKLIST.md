# 🧪 Local Testing Checklist

**Dev Server Running:** ✅ http://localhost:3000

---

## Test 1: Dashboard Analytics (Real Data)

### Steps:
1. Open http://localhost:3000
2. Login with your Supabase account (or create new account)
3. Navigate to Dashboard

### ✅ What to Check:

**Conversation Volume Chart:**
- [ ] Chart shows data for last 7 days (Sun-Sat)
- [ ] If you have conversations, bars show real counts
- [ ] If no data yet, shows zeros (not fake 45, 52, 38, etc.)
- [ ] Hover shows actual numbers

**Lead Sources Widget:**
- [ ] If no leads: Shows "No leads captured yet"
- [ ] If leads exist: Shows percentage like "45% from Sales Bot"
- [ ] Percentage is calculated (not fixed at 82%)
- [ ] Shows actual bot name

**Average Response Time:**
- [ ] If no conversations: Shows "N/A"
- [ ] If conversations exist: Shows calculated time (e.g., "1.2s" or "850ms")
- [ ] NOT hardcoded "0.8s"

**To Generate Test Data:**
```
1. Create a bot in Bot Builder
2. Open the preview chat
3. Send 3-5 test messages
4. Wait 30 seconds
5. Refresh dashboard
6. Analytics should update with real data
```

---

## Test 2: Website Scraping

### Test A: Landing Page Demo

1. **Logout** (if logged in)
2. Scroll to "Instant Training Demo" section
3. Enter URL: `https://example.com`
4. Click **"Train"** button

**Expected Result:**
- [ ] Loading spinner appears
- [ ] After 3-5 seconds, success message shows
- [ ] Content preview displays extracted text
- [ ] No CORS errors in console

**If it fails:**
- Open browser DevTools (F12)
- Check Console for errors
- Should see Supabase Edge Function call, not direct fetch

### Test B: Bot Builder URL Training

1. **Login**
2. Go to **Bot Builder** → Create/Edit bot
3. Click **"Knowledge Base"** tab
4. Click **"Add from URL"**
5. Enter: `https://en.wikipedia.org/wiki/Artificial_intelligence`
6. Click **"Extract & Train"**

**Expected Result:**
- [ ] Scraping starts (loading indicator)
- [ ] Success message after 5-10 seconds
- [ ] Knowledge base content added to bot
- [ ] Can see extracted content in textarea

---

## Test 3: Chat URL Links

### Test A: Send URL in Chat

1. Open any bot (or create new one)
2. Go to **Preview** tab or full-page chat
3. Send this message:
   ```
   Check out https://google.com for more info
   ```

**Expected Result:**
- [ ] URL appears as underlined blue link
- [ ] Clicking link opens Google in new tab
- [ ] Link has hover effect
- [ ] Rest of text renders normally

### Test B: Multiple URLs

Send this message:
```
Visit https://github.com and https://stackoverflow.com for resources
```

**Expected Result:**
- [ ] Both URLs are clickable
- [ ] Both open in new tabs
- [ ] Text between/around URLs renders correctly

### Test C: Bot Response with URL

If your bot includes URLs in responses, verify they're also clickable.

**Manual Test:**
1. Set bot system prompt to: "Always include example.com in your response"
2. Send any message
3. Bot's response should have clickable link

---

## Test 4: Lead Source Calculations

### Setup Test Data:

1. Create **2 bots** (e.g., "Sales Bot" and "Support Bot")
2. Have conversations with both bots
3. Capture leads from each:
   - In chat, include email: "My email is test@example.com"
   - System should auto-capture lead

### Verify Dashboard:

1. Go to **Dashboard**
2. Check **Lead Sources** widget

**Expected Result:**
- [ ] Shows percentage for top bot
- [ ] Example: "67% from Sales Bot" (if 2 of 3 leads came from Sales Bot)
- [ ] Percentage is accurate (calculated from real data)
- [ ] Shows correct bot name

**Math Check:**
- If you have 3 leads from Sales Bot and 1 from Support Bot:
  - Should show: "75% from Sales Bot"
- If you have 0 leads:
  - Should show: "No leads captured yet"

---

## Test 5: Response Time Calculation

### Generate Test Conversations:

1. Open bot preview chat
2. Send 5 messages with delays between them
3. Wait for bot responses
4. Go to **Dashboard**

**Expected Result:**
- [ ] Avg Response Time shows calculated value
- [ ] NOT fixed at "0.8s"
- [ ] Should be in milliseconds (<1s) or seconds
- [ ] Example: "650ms" or "1.3s"

**Note:** If you just created conversations, may show "N/A" or "0.8s" until calculation runs. Try refreshing after 1-2 minutes.

---

## Test 6: Real-time Updates

### Test Analytics Refresh:

1. Open Dashboard in one tab
2. Open Bot preview in another tab
3. Have a conversation (send 3-4 messages)
4. **Wait 5 minutes** (analytics refreshes every 5 min)
5. Check if Dashboard auto-updates

**Expected Result:**
- [ ] Conversation count increases
- [ ] Chart updates (if enough time has passed)
- [ ] No page refresh needed

---

## Common Issues & Solutions

### Issue: "No data showing on dashboard"

**Cause:** You're a new user with no conversations yet

**Solution:**
1. Create a bot
2. Have test conversations
3. Capture test leads
4. Wait 30 seconds
5. Refresh dashboard

---

### Issue: "Website scraping fails with 401 error"

**Cause:** Not logged in or auth token expired

**Solution:**
1. Logout and login again
2. Clear browser cache
3. Check Supabase is connected (check .env)

---

### Issue: "URLs not clickable in chat"

**Cause:** Browser cache showing old version

**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Check browser console for errors

---

### Issue: "Analytics shows old mock data"

**Cause:** Using demo/admin account or mock data fallback

**Solution:**
1. Login with real Supabase user (not demo account)
2. Check user.id doesn't start with 'demo-user' or 'master-admin'
3. Verify you have real conversations/leads in database

---

## Success Criteria

All tests should pass:
- [x] Dev server running on localhost:3000
- [ ] Dashboard shows real data (or zeros for new users)
- [ ] Website scraping works (both landing page and bot builder)
- [ ] URLs in chat are clickable
- [ ] Lead sources calculated correctly
- [ ] Response time calculated (not hardcoded)

---

## Browser Console Check

Open DevTools (F12) → Console tab

**Good Signs:**
- No red errors
- See successful API calls to Supabase
- Edge Function calls succeed (status 200)

**Bad Signs:**
- CORS errors → Scraping broken
- 401/403 errors → Auth issue
- "MOCK_ANALYTICS_DATA" in logs → Still using mock data

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit any final changes
2. Push to GitHub
3. Vercel will auto-deploy
4. Test in production

### If Issues Found ❌
Report which test failed and I'll fix it immediately.

---

**Ready to test!** Start with Test 1 (Dashboard) and work through each one. Let me know results! 🚀
