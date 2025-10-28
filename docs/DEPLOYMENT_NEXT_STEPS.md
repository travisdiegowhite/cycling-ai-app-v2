# 🚀 Next Steps: Deploy Your Garmin Webhook to Cloudflare

## What We've Built

I've created a **Cloudflare Worker** that handles your Garmin webhooks for **FREE** (instead of $150/month on Vercel).

### Benefits
- ✅ **$0/month** (free tier: 100k requests/day)
- ✅ **No deployment protection** blocking webhooks
- ✅ **Global edge network** - faster than Vercel
- ✅ **No cold starts** - always ready
- ✅ **All security features** included (rate limiting, validation, etc.)

---

## 📋 Quick Deployment (15 minutes)

### Step 1: Install Wrangler CLI

Open a terminal and run:

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authorize the CLI with your Cloudflare account.

### Step 3: Navigate to Worker Directory

```bash
cd ~/Desktop/cycling-ai-app-v2/cloudflare-workers/garmin-webhook
```

### Step 4: Configure Secrets

You'll need to copy environment variables from Vercel to Cloudflare.

**Get values from Vercel:**
1. Open: https://vercel.com/travisdiegowhites-projects/cycling-ai-app-v2/settings/environment-variables
2. Find these variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GARMIN_CONSUMER_KEY`
   - `GARMIN_CONSUMER_SECRET`

**Set them in Cloudflare:**

```bash
# Run each command and paste the value when prompted
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put GARMIN_CONSUMER_KEY
wrangler secret put GARMIN_CONSUMER_SECRET
```

### Step 5: Deploy

```bash
npm run deploy
```

Cloudflare will show you your webhook URL:
```
✨ Successfully published your Worker!
📝 https://garmin-webhook.<YOUR-SUBDOMAIN>.workers.dev
```

**Copy this URL** - you'll need it for the next step!

---

## 🔧 Update Garmin Developer Portal

### Step 6: Register New Webhook URL

1. Go to: https://developerportal.garmin.com/
2. Sign in and navigate to your app
3. Go to **Endpoint Configuration** page
4. Update/add webhook endpoint:
   ```
   https://garmin-webhook.<YOUR-SUBDOMAIN>.workers.dev
   ```
5. Event types: Activities, Activity Uploads
6. Method: POST
7. Content-Type: application/json
8. Save

---

## ✅ Test Your Webhook

### Test 1: Health Check

```bash
curl https://garmin-webhook.<YOUR-SUBDOMAIN>.workers.dev
```

Should return:
```json
{
  "status": "ok",
  "service": "garmin-webhook-handler-cloudflare",
  "timestamp": "2025-10-25T..."
}
```

### Test 2: Real Activity

1. Complete a cycling activity on your Garmin device
2. Sync to Garmin Connect (phone or computer)
3. Wait 30 seconds
4. Check Supabase:

```sql
SELECT * FROM garmin_webhook_events
ORDER BY created_at DESC
LIMIT 5;
```

You should see a new webhook event!

---

## 📊 Monitor Your Worker

### View Live Logs

```bash
cd ~/Desktop/cycling-ai-app-v2/cloudflare-workers/garmin-webhook
npm run tail
```

This shows real-time logs from your deployed worker.

### View in Dashboard

1. Go to: https://dash.cloudflare.com/
2. Click **Workers & Pages**
3. Click **garmin-webhook**
4. Click **Logs** tab

---

## ⚠️ Important: FIT File Processing

The Cloudflare Worker **receives and stores** webhooks but doesn't **process FIT files** (CPU time limits).

### Two Options:

#### Option 1: Keep Vercel for FIT Processing (Recommended)

- **Cloudflare Worker**: Receives webhooks (free)
- **Vercel API route**: Processes FIT files (free tier)
- **Total cost**: $0/month

The existing Vercel `/api/garmin-webhook.js` can be modified to:
1. Poll `garmin_webhook_events` for unprocessed events
2. Download and parse FIT files
3. Import to routes/track_points tables

#### Option 2: Create Separate Cloudflare Worker

Create a scheduled worker that processes FIT files:

```bash
# In cloudflare-workers/garmin-fit-processor/
wrangler cron trigger process-fit "*/5 * * * *"
```

Runs every 5 minutes to process queued FIT files.

---

## 💰 Cost Breakdown

### Current Setup (Vercel)
- **Pro plan**: $20/month
- **Advanced Protection**: $150/month
- **Total**: $170/month

### With Cloudflare Workers
- **Webhooks (Cloudflare)**: $0/month
- **FIT processing (Vercel free)**: $0/month
- **Frontend (Vercel free or Cloudflare Pages)**: $0/month
- **Total**: $0/month

### Savings
**$2,040/year** 🎉

---

## 🔍 Troubleshooting

### "Error: Not authenticated"
Run `wrangler login` again and authorize in browser.

### "Error: Missing secret"
Make sure you ran all `wrangler secret put` commands.

### Webhook not receiving events
1. Check Garmin Developer Portal has correct webhook URL
2. Verify worker is deployed: `wrangler whoami`
3. View logs: `npm run tail`
4. Test health endpoint with curl

### Events stored but not processed
This is expected! FIT processing is separate (see options above).

---

## 📚 Documentation

- **Quick Start**: `cloudflare-workers/QUICK_START.md`
- **Full README**: `cloudflare-workers/garmin-webhook/README.md`
- **Platform Comparison**: `HOSTING_ALTERNATIVES_RESEARCH.md`
- **Security Guide**: `GARMIN_WEBHOOK_SECURITY.md`

---

## ✨ What Happens Next

Once deployed:

1. **User completes activity** on Garmin device
2. **User syncs** to Garmin Connect
3. **Garmin sends webhook** to your Cloudflare Worker
4. **Worker stores event** in Supabase
5. **FIT processing** (needs to be set up separately)
6. **Activity appears** in your app

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Health check returns 200 OK
✅ Garmin Developer Portal shows webhook as active
✅ Test activity creates event in `garmin_webhook_events` table
✅ Worker logs show webhook received
✅ No errors in Cloudflare dashboard

---

## 🆘 Need Help?

1. **Check logs**: `npm run tail`
2. **Review docs**: See cloudflare-workers/garmin-webhook/README.md
3. **Cloudflare Discord**: https://discord.gg/cloudflaredev
4. **Workers Docs**: https://developers.cloudflare.com/workers/

---

## 🚀 Optional: Migrate Entire App

If you want to completely leave Vercel:

1. Deploy frontend to **Cloudflare Pages** (free)
2. Create FIT processor worker (free tier)
3. Keep Supabase (already external)
4. Cancel Vercel subscription

Total migration time: ~4 hours
Total monthly cost: $0

---

## 📝 Checklist

- [ ] Install wrangler CLI
- [ ] Login to Cloudflare
- [ ] Set environment secrets
- [ ] Deploy worker
- [ ] Update Garmin Developer Portal
- [ ] Test health check
- [ ] Test with real activity
- [ ] Verify webhook event in Supabase
- [ ] Set up FIT processing (choose option)
- [ ] Monitor logs for 24 hours
- [ ] Celebrate saving $165/month! 🎉

---

**Ready to deploy?** Start with Step 1 above!
