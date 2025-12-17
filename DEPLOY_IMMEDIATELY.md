# 🚀 Deploy Your App in 60 Seconds

Your app is built and ready in the `dist/` folder. Choose the fastest option:

## Option 1: Vercel (Fastest - 1 minute)

```bash
# 1. Login (opens browser)
vercel login

# 2. Deploy (just press Enter for all prompts)
vercel --prod
```

Your app will be live at: `https://your-app.vercel.app`

## Option 2: Netlify Drop (No Account Needed - 2 minutes)

1. Open https://app.netlify.com/drop in your browser
2. Drag and drop the `dist` folder onto the page
3. Your app is instantly live!

No account needed for testing (create account to keep the URL).

## Option 3: Surge.sh (Simplest CLI - 1 minute)

```bash
# Install and deploy in one command
npx surge dist

# When prompted:
# - Email: your-email@example.com
# - Password: (create one)
# - Domain: buildmybot.surge.sh (or press Enter for random)
```

## Option 4: GitHub Pages (If you want your-username.github.io/BuildMyBot.App)

```bash
# Add GitHub Pages deployment
npm install --save-dev gh-pages

# Add to package.json scripts:
"deploy:gh": "gh-pages -d dist"

# Deploy
npm run deploy:gh
```

## Your Build is Ready!

The `dist/` folder contains your production-ready app:
- Total size: ~1.5MB
- Optimized and minified
- Ready for any static host

## Environment Variables Needed

After deploying, add these in your hosting platform's dashboard:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=your-openai-key
```

## Test Your Deployment

Once deployed, verify:
1. ✅ Homepage loads
2. ✅ Can create account
3. ✅ Can create bot
4. ✅ Chat works

---

💡 **Tip**: For instant testing without any setup, use Netlify Drop (Option 2)!