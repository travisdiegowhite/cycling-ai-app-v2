# Import All Historical Garmin Activities

## Quick Import via Browser Console

Once the code deploys (in ~30 seconds), open your app in Chrome/Firefox:

1. Open the browser console (F12 or Cmd+Option+J)
2. Run this command to import ALL activities since 2020:

```javascript
// Import all activities from 2020 to now
garminService.syncActivities({
  startDate: '2020-01-01'
}).then(result => {
  console.log('✅ Backfill complete!', result);
  console.log(`📊 Requested ${result.chunks} chunks covering ${result.totalDays} days`);
  console.log(`✅ ${result.accepted} accepted, ⚠️ ${result.duplicate} duplicates, ❌ ${result.errors} errors`);
});
```

Or import a specific date range:

```javascript
// Import activities from 2022 only
garminService.syncActivities({
  startDate: '2022-01-01',
  endDate: '2022-12-31'
}).then(result => console.log(result));
```

## How It Works

1. **Automatic Chunking**: The system splits your request into 30-day chunks (Garmin's max)
2. **Sequential Requests**: Sends each chunk with a 100ms delay to avoid rate limiting
3. **Webhook Delivery**: Garmin sends activities to your webhook asynchronously
4. **Database Import**: Webhook handler imports activities into Supabase

## Timeline

- ⚡ **Request sent**: Immediately
- 🔄 **Garmin processing**: 1-10 minutes per chunk
- 📥 **Webhook delivery**: Within minutes after processing
- ✅ **Activities appear**: Check Supabase tables

## Checking Progress

### 1. Check Webhook Events
```sql
SELECT
  COUNT(*) as total_events,
  COUNT(CASE WHEN processed = true THEN 1 END) as processed,
  COUNT(CASE WHEN process_error IS NOT NULL THEN 1 END) as errors
FROM garmin_webhook_events;
```

### 2. Check Imported Activities
```sql
SELECT
  COUNT(*) as total_activities,
  MIN(recorded_at) as oldest,
  MAX(recorded_at) as newest
FROM routes
WHERE imported_from = 'garmin';
```

### 3. Check Recent Activities
```sql
SELECT
  name,
  distance_km,
  duration_seconds,
  recorded_at,
  created_at
FROM routes
WHERE imported_from = 'garmin'
ORDER BY recorded_at DESC
LIMIT 20;
```

## Troubleshooting

### No webhook events?
- Check if endpoint is configured: https://apis.garmin.com/tools/endpoints
- Verify webhook URL: `https://www.tribos.studio/api/garmin-webhook`
- Ensure "Activities" summary type is enabled

### Activities not importing?
```sql
-- Check for processing errors
SELECT
  event_type,
  activity_id,
  process_error,
  payload
FROM garmin_webhook_events
WHERE process_error IS NOT NULL
ORDER BY created_at DESC;
```

### Rate Limit Hit?
According to Garmin docs:
- **Evaluation keys**: 100 days/minute
- **Production keys**: 10,000 days/minute

If you hit the limit, just wait a minute and retry.

## Important Notes

1. **First-Time Import**: Only activities AFTER your OAuth consent will be available
   - Garmin doesn't provide activities from before you connected your account
   - User rate limit: 1 month since first connection

2. **Duplicate Protection**: Running backfill multiple times for the same period returns 409 (Conflict)
   - This is normal and prevents duplicate imports
   - Check the `duplicate` count in the response

3. **Automatic Future Sync**: After initial import, new activities sync automatically via webhook
   - No manual sync needed going forward!

## Example Response

```json
{
  "success": true,
  "message": "Backfill request completed. 12 chunk(s) accepted, 0 already in progress.",
  "totalDays": 365,
  "chunks": 13,
  "accepted": 12,
  "duplicate": 1,
  "errors": 0,
  "results": [
    {
      "chunk": 1,
      "status": "accepted",
      "dateRange": {
        "start": "2023-01-01T00:00:00.000Z",
        "end": "2023-01-31T00:00:00.000Z"
      }
    },
    // ... more chunks
  ]
}
```

---

**Pro Tip**: Start with a small range first (e.g., last month) to test, then expand to all historical data.
