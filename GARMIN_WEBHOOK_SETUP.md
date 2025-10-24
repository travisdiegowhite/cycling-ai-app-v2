# Garmin Webhook Setup Guide

## ✅ What's Been Completed

1. ✅ **Webhook Handler Created** - `/api/garmin-webhook` endpoint
2. ✅ **FIT File Parser Installed** - `fit-file-parser` npm package
3. ✅ **Database Migration Created** - `garmin_webhook_events` table
4. ✅ **Code Deployed** - Pushed to GitHub, deploying to Vercel

---

## 🚀 Next Steps (Do These Now)

### Step 1: Run Database Migration

1. Go to Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/toihfeffpljsmgritmuy/sql/new
   ```

2. Copy the contents of:
   ```
   /database/migrations/create_garmin_webhook_events.sql
   ```

3. Paste into SQL Editor and click **Run**

4. Verify success - you should see:
   ```
   garmin_webhook_events table created successfully
   ```

---

### Step 2: Register Webhook in Garmin Developer Portal

#### A. Log into Garmin Developer Console

1. Go to: https://developerportal.garmin.com/
2. Sign in with your approved developer account
3. Navigate to your application/project

#### B. Register Activity Webhook

1. Find "Webhooks" or "Push Notifications" section
2. Add a new webhook with these details:

**Webhook URL:**
```
https://www.tribos.studio/api/garmin-webhook
```

**Event Types to Subscribe:**
- ✅ Activities (FIT files)
- ✅ Activity Uploads

**HTTP Method:** POST

**Content Type:** application/json

#### C. Webhook Verification

Garmin may send a verification request. Our endpoint handles this automatically with a 200 OK response.

If Garmin asks for a verification token or secret:
- Check their documentation for the exact format
- You may need to add verification logic to `/api/garmin-webhook.js`

---

### Step 3: Test the Webhook

#### Option A: Use Garmin's Test Tools

1. In the Garmin Developer Console, look for "Test" or "Sample Data" tools
2. Send a test activity webhook
3. Check Supabase to see if event was received:

```sql
SELECT * FROM garmin_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

#### Option B: Sync a Real Activity

1. Complete a cycling activity on your Garmin device
2. Sync your device with Garmin Connect (via phone or computer)
3. Wait a few seconds
4. Check your app - the activity should automatically appear!

---

## 🔍 Monitoring & Debugging

### Check Webhook Events

View all webhook events in Supabase:

```sql
-- See recent webhook events
SELECT
  id,
  event_type,
  activity_id,
  processed,
  process_error,
  created_at
FROM garmin_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

### Check Processing Errors

```sql
-- Find failed webhook processing
SELECT
  id,
  activity_id,
  process_error,
  payload
FROM garmin_webhook_events
WHERE processed = true
  AND process_error IS NOT NULL
ORDER BY created_at DESC;
```

### Check Imported Activities

```sql
-- See activities imported from Garmin
SELECT
  id,
  name,
  distance,
  duration,
  garmin_id,
  garmin_url,
  created_at
FROM routes
WHERE garmin_id IS NOT NULL
ORDER BY created_at DESC;
```

### View Vercel Logs

```bash
npx vercel logs https://www.tribos.studio --follow
```

Look for:
- `📥 Garmin webhook received` - Webhook was received
- `✅ Webhook event stored` - Event saved to database
- `🔄 Processing webhook event` - Processing started
- `📥 Downloading FIT file` - FIT file download started
- `✅ FIT file parsed successfully` - FIT file parsed
- `✅ Route created` - Activity imported
- `🎉 Activity imported successfully` - Complete!

Or errors:
- `❌ Webhook processing error` - Something failed

---

## ⚙️ Webhook Configuration in Garmin Portal

### Typical Garmin Webhook Payload

When a user syncs an activity, Garmin sends a POST request like this:

```json
{
  "userId": "user-garmin-id-123",
  "eventType": "activity",
  "activityId": "12345678901",
  "fileUrl": "https://apis.garmin.com/wellness-api/rest/activityFile/...",
  "fileType": "FIT",
  "startTimeInSeconds": 1698765432,
  "uploadTimestamp": "2024-10-31T12:30:00Z"
}
```

Our webhook handler:
1. Stores this event in `garmin_webhook_events` table
2. Responds immediately with 200 OK (within 5 seconds)
3. Processes asynchronously in background
4. Downloads FIT file using OAuth signature
5. Parses activity data
6. Creates route in your database
7. Stores GPS track points

---

## 🐛 Troubleshooting

### Webhook Not Being Called

**Check:**
1. Webhook URL is correctly registered in Garmin portal
2. URL is publicly accessible (test with: `curl https://www.tribos.studio/api/garmin-webhook`)
3. Garmin app has the correct webhook event types selected
4. Your Garmin device is syncing successfully

**Test endpoint:**
```bash
curl https://www.tribos.studio/api/garmin-webhook
# Should return: {"status":"ok","service":"garmin-webhook-handler",...}
```

### Webhook Called But Activities Not Importing

**Check database:**
```sql
SELECT * FROM garmin_webhook_events
WHERE processed = false
ORDER BY created_at DESC;
```

If events are stuck unprocessed:
- Check Vercel logs for errors
- Verify OAuth tokens are valid
- Check FIT file URL is accessible

### No Garmin User Integration Found

Error: "No integration found for Garmin user: xxx"

**Solution:** The webhook includes Garmin's user ID, but we need to map it to your users.

When a user first connects Garmin OAuth, we need to store their Garmin user ID:

```sql
-- Update integration with Garmin user ID
UPDATE bike_computer_integrations
SET provider_user_id = 'garmin-user-id-from-oauth'
WHERE user_id = 'your-app-user-id'
  AND provider = 'garmin';
```

This should happen automatically during OAuth, but verify it's set.

### FIT File Download Fails

**Possible causes:**
1. OAuth signature is incorrect
2. Access token expired (OAuth 1.0a tokens don't expire, but check)
3. File URL is invalid or expired
4. Network/firewall issues

**Debug:**
- Check Vercel logs for exact error message
- Verify OAuth signature generation matches initial auth flow
- Test file URL accessibility

### Activity Created But No GPS Data

**Check:**
1. Activity was indoor cycling (no GPS)
2. GPS wasn't enabled on device
3. FIT file didn't contain position data

**View activity details:**
```sql
SELECT
  name,
  has_gps_data,
  has_heart_rate_data,
  has_power_data,
  activity_type
FROM routes
WHERE garmin_id = 'activity-id';
```

---

## 📊 Expected Behavior

### After Setting Up

1. User connects Garmin via OAuth (already working ✅)
2. User goes for a bike ride with their Garmin device
3. User syncs device with Garmin Connect app
4. Garmin sends webhook to your endpoint **within seconds**
5. Activity automatically appears in your app
6. User sees new route in "My Routes" with full GPS, power, HR data

### No Manual Sync Needed!

Unlike Wahoo (which requires manual sync button), Garmin webhooks are **automatic**. As soon as the user syncs their device, you get the data.

---

## 🔐 Security Considerations

### Webhook Authentication

Garmin may support webhook signatures to verify requests actually come from Garmin.

**To implement:**
1. Check Garmin documentation for signature header
2. Verify signature in webhook handler
3. Reject requests with invalid signatures

### Rate Limiting

If you get a lot of users, consider:
- Rate limiting webhook endpoint
- Queueing webhook processing
- Monitoring webhook delivery metrics

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Webhook endpoint returns 200 OK to health check
✅ Garmin Developer Portal shows webhook as "Active"
✅ Test webhook creates entry in `garmin_webhook_events` table
✅ Real activity sync creates route in `routes` table
✅ GPS track points appear in `track_points` table
✅ Activity shows up in your app UI
✅ All activity metrics are accurate (distance, elevation, HR, power)

---

## 📝 Webhook Registration Template

Use this when registering in Garmin Developer Portal:

**Webhook Name:** Tribos Studio Activity Import

**Webhook URL:** https://www.tribos.studio/api/garmin-webhook

**Events:**
- Activity uploads
- Activity file available

**Method:** POST

**Content-Type:** application/json

**Description:** Automatically import cycling activities from Garmin Connect devices

**IP Whitelist:** None required (public endpoint)

**Timeout:** 5 seconds (we respond immediately)

---

## 🚨 Important Notes

1. **Webhook must respond within 5 seconds** - We do this by storing event and processing async
2. **FIT file URLs may expire** - Download and process quickly
3. **Not all activities have all sensors** - Handle missing data gracefully
4. **Indoor activities have no GPS** - Still import with available data
5. **Duplicate detection** - Check `garmin_id` before importing

---

## 📞 Support

If webhook setup isn't working:

1. **Check Vercel deployment status**
   - https://vercel.com/travisdiegowhites-projects/cycling-ai-app-v2/deployments

2. **Test endpoint manually**
   ```bash
   curl -X POST https://www.tribos.studio/api/garmin-webhook \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","eventType":"activity","activityId":"test123"}'
   ```

3. **Check Supabase logs**
   - https://supabase.com/dashboard/project/toihfeffpljsmgritmuy/logs/explorer

4. **Contact Garmin support**
   - connect-support@developer.garmin.com

---

**Current Status:**
- ✅ Code deployed to production
- ⏳ Waiting for database migration
- ⏳ Waiting for webhook registration
- ⏳ Ready to test!

**Next:** Run the database migration, then register the webhook URL in Garmin Developer Portal!
