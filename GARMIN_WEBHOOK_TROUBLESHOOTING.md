# Garmin Webhook Troubleshooting Guide

## 🔍 Issue: Webhooks Received but Data Not in Supabase

### **Root Cause Found:**

The Cloudflare worker is using `SUPABASE_SERVICE_KEY` (service_role) to insert data, but the **Row Level Security (RLS) policies** on the `routes` and `track_points` tables don't allow service_role to insert data.

Current RLS policies only allow authenticated users (`auth.uid()`) to insert:
```sql
CREATE POLICY "Users can create their own routes" ON routes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

The webhook worker runs as `service_role`, not as an authenticated user, so inserts are being blocked.

---

## ✅ Solution: Add Service Role Policies

### **Step 1: Apply the RLS Fix**

Run this SQL migration in your Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Paste the contents of `database/migrations/fix_garmin_webhook_rls.sql`
3. Click "Run"

Or copy this SQL directly:

```sql
-- Fix RLS policies to allow Garmin webhooks (via service_role) to create routes

-- ROUTES TABLE
DROP POLICY IF EXISTS "Service role can manage routes" ON routes;
CREATE POLICY "Service role can manage routes" ON routes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- TRACK POINTS TABLE
DROP POLICY IF EXISTS "Service role can manage track points" ON track_points;
CREATE POLICY "Service role can manage track points" ON track_points
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- SYNC HISTORY TABLE
DROP POLICY IF EXISTS "Service role can manage sync history" ON bike_computer_sync_history;
CREATE POLICY "Service role can manage sync history" ON bike_computer_sync_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

### **Step 2: Redeploy Cloudflare Worker**

Make sure your worker has all required environment variables:

```bash
cd cloudflare-workers/garmin-webhook

# Verify environment variables
wrangler secret list

# Should show:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - GARMIN_CONSUMER_KEY
# - GARMIN_CONSUMER_SECRET

# Redeploy
npm run deploy
```

---

## 🧪 Testing the Fix

### **Test 1: Manual Webhook Test**

Send a test webhook to your Cloudflare worker:

```bash
curl -X POST https://your-worker.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-garmin-user-id",
    "activityId": "test-12345",
    "eventType": "activity"
  }'
```

### **Test 2: Check Webhook Events Table**

Query Supabase to see if events are being stored:

```sql
SELECT
  id,
  event_type,
  garmin_user_id,
  activity_id,
  processed,
  process_error,
  created_at
FROM garmin_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**
- ✅ `processed = true` - Event was processed successfully
- ❌ `processed = false` with `process_error` - Check the error message
- ❌ `process_error = 'No integration found'` - User hasn't connected Garmin yet

### **Test 3: Check Routes Table**

See if routes were created:

```sql
SELECT
  id,
  user_id,
  name,
  distance,
  garmin_id,
  created_at
FROM routes
WHERE garmin_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### **Test 4: Sync from Garmin App**

1. Complete a ride on your Garmin device
2. Sync it to Garmin Connect
3. Wait 30-60 seconds for webhook
4. Check your app - the route should appear

---

## 🐛 Common Issues & Solutions

### Issue 1: "No integration found for Garmin user"

**Cause:** User's Garmin account not connected in your app.

**Solution:**
```sql
-- Check if integration exists
SELECT * FROM bike_computer_integrations
WHERE provider = 'garmin'
  AND user_id = 'YOUR_USER_ID';
```

If no results, user needs to connect Garmin in the app.

### Issue 2: "Failed to download FIT file: 401"

**Cause:** Access token expired.

**Solution:** The worker should automatically refresh the token. Check worker logs:

```bash
wrangler tail
```

Look for:
```
🔄 Token expired, refreshing...
✅ Access token refreshed successfully
```

If token refresh fails, user may need to reconnect Garmin.

### Issue 3: "Activity already imported"

**Cause:** Activity was already synced.

**Solution:** This is normal - it's preventing duplicates. Check:

```sql
SELECT * FROM routes
WHERE garmin_id = 'YOUR_ACTIVITY_ID';
```

### Issue 4: "Non-cycling activity"

**Cause:** Webhook is for a non-cycling activity (running, swimming, etc.).

**Solution:** This is intentional - the worker only imports cycling activities.

### Issue 5: RLS policy error in logs

**Error:** `new row violates row-level security policy`

**Solution:** Run the RLS fix SQL from Step 1 above.

---

## 📊 Monitoring Webhook Health

### Check Processing Success Rate

```sql
SELECT
  COUNT(*) FILTER (WHERE processed = true AND process_error IS NULL) as success,
  COUNT(*) FILTER (WHERE processed = true AND process_error IS NOT NULL) as errors,
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE processed = true AND process_error IS NULL) / NULLIF(COUNT(*), 0), 1) as success_rate_pct
FROM garmin_webhook_events
WHERE received_at > NOW() - INTERVAL '7 days';
```

### View Recent Errors

```sql
SELECT
  id,
  garmin_user_id,
  activity_id,
  process_error,
  received_at,
  processed_at
FROM garmin_webhook_events
WHERE process_error IS NOT NULL
ORDER BY received_at DESC
LIMIT 20;
```

### Check Cloudflare Worker Logs

```bash
# Real-time logs
wrangler tail

# Look for specific errors
wrangler tail | grep -i error
```

---

## 🔧 Debug Checklist

Before opening an issue, verify:

- [ ] RLS policies allow service_role to insert (Step 1 above)
- [ ] Cloudflare worker has all environment variables set
- [ ] User has connected Garmin account in app
- [ ] Garmin webhook URL points to Cloudflare worker
- [ ] `bike_computer_integrations` table has Garmin integration for user
- [ ] Access token is not expired (or worker can refresh it)
- [ ] Worker logs show successful webhook receipt
- [ ] `garmin_webhook_events` table shows events with `processed = true`

---

## 🆘 Still Not Working?

### Gather Debug Info:

1. **Webhook event:**
```sql
SELECT * FROM garmin_webhook_events
WHERE id = 'YOUR_EVENT_ID';
```

2. **User integration:**
```sql
SELECT
  id,
  user_id,
  provider,
  provider_user_id,
  sync_enabled,
  token_expires_at,
  last_sync_at
FROM bike_computer_integrations
WHERE provider = 'garmin'
  AND user_id = 'YOUR_USER_ID';
```

3. **Worker logs:**
```bash
wrangler tail --since 1h
```

4. **Check Garmin Developer Console:**
   - https://developer.garmin.com/gc-developer-program/overview/
   - Check webhook delivery status
   - Look for failed deliveries

---

## 📝 Manual Reprocessing

If a webhook failed but you want to retry:

1. **Find unprocessed events:**
```sql
SELECT id, garmin_user_id, activity_id, process_error
FROM garmin_webhook_events
WHERE processed = false OR process_error IS NOT NULL
ORDER BY received_at DESC;
```

2. **Reset event for reprocessing:**
```sql
UPDATE garmin_webhook_events
SET
  processed = false,
  processed_at = NULL,
  process_error = NULL
WHERE id = 'YOUR_EVENT_ID';
```

3. **Trigger reprocessing:**
The worker's async processing should pick it up, or you can manually trigger via a separate cron job.

---

**Last Updated:** 2025-10-26
