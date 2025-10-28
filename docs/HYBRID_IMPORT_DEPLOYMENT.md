# Hybrid Import System - Deployment Guide

## Overview

The hybrid import system combines Strava (for historical data) and Garmin (for automatic real-time sync) to provide users with complete cycling activity history and effortless future updates.

## What Was Implemented

### 1. Backend API
- **[api/strava-bulk-import.js](api/strava-bulk-import.js)** - New Vercel API route
  - Handles paginated fetching from Strava (200 activities per page)
  - Filters cycling activities only
  - Implements duplicate detection (ID-based + time/distance proximity)
  - Creates routes with `import_source='strava'`
  - Includes automatic token refresh

### 2. Database Migration
- **[database/migrations/add_import_source_to_routes.sql](database/migrations/add_import_source_to_routes.sql)**
  - Adds `import_source` column to routes table
  - Creates indexes for filtering and duplicate detection
  - Updates existing routes with their source

### 3. Frontend Components
- **[src/components/ImportWizard.js](src/components/ImportWizard.js)** - New 4-step wizard
  - Step 1: Welcome - explains hybrid strategy
  - Step 2: Strava historical import with date range selector
  - Step 3: Garmin auto-sync setup
  - Step 4: Completion confirmation
  - **NOW CONNECTED TO REAL API** (not mock)

- **[src/components/FitnessIntegrations.js](src/components/FitnessIntegrations.js)** - Updated
  - Added "Smart Import" button with gradient styling
  - Re-enabled Strava tab
  - Integrated ImportWizard modal
  - Added connection status checking

### 4. Service Layer
- **[src/utils/stravaService.js](src/utils/stravaService.js)** - Updated
  - Added `bulkImport()` method (line 312)
  - Client-side wrapper for bulk import API

---

## Deployment Steps

### Step 1: Apply Database Migration

Run this in your Supabase SQL Editor:

```bash
# Copy the migration file content and run in Supabase dashboard
# Or use psql:
psql $SUPABASE_DB_URL < database/migrations/add_import_source_to_routes.sql
```

**Verify:**
```sql
-- Should show: import_source column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'routes' AND column_name = 'import_source';

-- Should show counts by source
SELECT import_source, COUNT(*) as count
FROM routes
GROUP BY import_source;
```

### Step 2: Deploy to Vercel

The new API route will be automatically deployed when you push to your repository:

```bash
# Commit all changes
git add .
git commit -m "feat: Add hybrid import system (Strava + Garmin)

- Add Strava bulk import API endpoint
- Add import_source tracking to routes table
- Add ImportWizard component with 4-step flow
- Update FitnessIntegrations with Smart Import button
- Re-enable Strava tab and StravaIntegration component"

git push origin main
```

Vercel will automatically deploy:
- `/api/strava-bulk-import` endpoint
- Updated React components

### Step 3: Verify Environment Variables

Make sure these are set in Vercel:
```
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

---

## Testing

### Test 1: Database Migration

```sql
-- 1. Check column exists
\d routes;

-- 2. Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'routes';

-- 3. Test query performance
EXPLAIN ANALYZE
SELECT * FROM routes
WHERE import_source = 'strava'
AND started_at > NOW() - INTERVAL '1 year';
```

### Test 2: Strava Bulk Import API

**Option A: Via ImportWizard UI**
1. Navigate to Settings → Integrations
2. Click "Smart Import" button
3. Complete wizard:
   - Step 1: Click "Get Started"
   - Step 2: Select time period (e.g., "Last 1 year")
   - Click "Connect Strava" if needed
   - Click "Start Import"
4. Watch progress bar
5. Verify success message with imported count

**Option B: Direct API Test**

```bash
# Test with curl (requires authentication)
curl -X POST https://your-app.vercel.app/api/strava-bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2025-01-01T00:00:00Z"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "imported": 127,
  "skipped": 3,
  "errors": 0,
  "total": 130,
  "message": "Imported 127 activities, 3 duplicates skipped, 0 errors"
}
```

### Test 3: Check Routes in Database

```sql
-- Should show new routes with import_source='strava'
SELECT
  id,
  name,
  distance,
  started_at,
  import_source,
  strava_id,
  created_at
FROM routes
WHERE import_source = 'strava'
ORDER BY created_at DESC
LIMIT 10;
```

### Test 4: Duplicate Detection

Try importing the same date range twice:

```sql
-- First import: should import N activities
-- Second import: should skip all N activities (0 imported, N skipped)

-- Verify no duplicates by checking for multiple routes with same strava_id
SELECT strava_id, COUNT(*) as count
FROM routes
WHERE strava_id IS NOT NULL
GROUP BY strava_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## User Flow

### New User Journey
1. User signs up and navigates to Settings → Integrations
2. Sees "Smart Import" button and alert explaining hybrid strategy
3. Clicks "Smart Import"
4. **Step 1**: Learns about the strategy (Strava for history + Garmin for auto-sync)
5. **Step 2**:
   - Connects Strava account
   - Selects time period (3 months, 6 months, 1 year, 2 years, or all time)
   - Clicks "Start Import"
   - Watches progress bar (10% → 30% → 100%)
   - Sees success message: "Imported 127 rides (3 duplicates skipped)"
6. **Step 3**:
   - Connects Garmin account
   - Understands auto-sync will work for future rides
7. **Step 4**:
   - Confirmation screen
   - Clicks "View My Rides"
   - Sees all imported activities in app

### Existing User with Strava
1. Already has Strava connected
2. Clicks "Smart Import"
3. Skip step 2 (already connected)
4. Can still trigger bulk import for additional historical data

### Existing User with Garmin
1. Already has Garmin connected
2. Clicks "Smart Import"
3. Can import Strava history to backfill pre-webhook activities
4. Skip step 3 (already connected)

---

## Performance Considerations

### Strava API Rate Limits
- **100 requests per 15 minutes**
- **1000 requests per day**
- Each page fetches 200 activities
- 200ms delay between pages to avoid throttling

### Example Import Times
| Activities | Pages | Estimated Time |
|-----------|-------|----------------|
| 50        | 1     | ~5 seconds     |
| 200       | 1     | ~5 seconds     |
| 500       | 3     | ~15 seconds    |
| 1000      | 5     | ~25 seconds    |
| 2000      | 10    | ~50 seconds    |

### Database Performance
- Indexes on `import_source`, `started_at`, and `distance` ensure fast duplicate detection
- Batch inserts process ~20-50 activities per second
- For 1000 activities: ~30-60 seconds total

---

## Monitoring

### Check Import Success Rate

```sql
SELECT
  import_source,
  COUNT(*) as total_routes,
  COUNT(DISTINCT DATE(started_at)) as unique_days,
  MIN(started_at) as oldest_ride,
  MAX(started_at) as newest_ride
FROM routes
GROUP BY import_source
ORDER BY total_routes DESC;
```

### Monitor API Errors

Check Vercel logs for errors:
```bash
vercel logs --follow
```

Look for:
- `❌ Strava bulk import error:`
- `Error importing activity`
- `Strava API error:`

### User Feedback

Monitor browser console for:
- `✅ Import complete:` - successful imports
- `Import error:` - client-side errors

---

## Troubleshooting

### Issue 1: "Strava not connected"
**Symptoms:**
- User clicks "Start Import" but gets error
- API returns 404: "Strava not connected"

**Fix:**
```sql
-- Check if user has Strava tokens
SELECT * FROM strava_tokens WHERE user_id = 'user-id-here';

-- If missing, user needs to connect Strava first
```

### Issue 2: Token Expired
**Symptoms:**
- API returns 401 error
- "Failed to refresh Strava token"

**Fix:**
- User should disconnect and reconnect Strava
- Check `strava_tokens.expires_at` is in the future

### Issue 3: No Activities Imported
**Symptoms:**
- Import completes but `imported: 0, skipped: 0`
- User has activities on Strava

**Cause:**
- User might not have cycling activities (only runs, swims, etc.)
- Date range might be outside their activity history

**Fix:**
```sql
-- Check what activities exist in Strava API (check logs)
-- Verify user has cycling activities in selected date range
```

### Issue 4: Duplicate Activities
**Symptoms:**
- Same activity appears twice in routes table

**Fix:**
```sql
-- Find duplicates
SELECT strava_id, COUNT(*) as count
FROM routes
WHERE strava_id IS NOT NULL
GROUP BY strava_id
HAVING COUNT(*) > 1;

-- Remove duplicates (keep oldest)
DELETE FROM routes
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY strava_id ORDER BY created_at) as rn
    FROM routes
    WHERE strava_id IS NOT NULL
  ) t
  WHERE rn > 1
);
```

---

## Rollback Plan

If something goes wrong:

### Rollback Database Migration
```sql
-- Remove import_source column
ALTER TABLE routes DROP COLUMN IF EXISTS import_source;

-- Drop indexes
DROP INDEX IF EXISTS idx_routes_import_source;
DROP INDEX IF EXISTS idx_routes_started_at_distance;
```

### Rollback Code
```bash
git revert HEAD
git push origin main
```

### Remove Imported Routes
```sql
-- DANGER: Only run if you need to remove all Strava imports
DELETE FROM routes WHERE import_source = 'strava';
```

---

## Next Steps

After successful deployment:

1. ✅ Test with your own Strava account
2. ✅ Monitor first few user imports
3. ✅ Check database for any performance issues with large imports
4. ✅ Consider adding:
   - Progress webhooks for very large imports (2000+ activities)
   - Email notification when import completes
   - Import history table to track all bulk imports

---

## Files Modified/Created

### New Files
- `api/strava-bulk-import.js` (327 lines)
- `database/migrations/add_import_source_to_routes.sql` (37 lines)
- `src/components/ImportWizard.js` (395 lines)
- `HYBRID_IMPORT_DEPLOYMENT.md` (this file)

### Modified Files
- `src/utils/stravaService.js` - Added `bulkImport()` method
- `src/components/FitnessIntegrations.js` - Added Smart Import button and wizard integration

---

**Last Updated:** 2025-10-27
**Status:** ✅ Ready for deployment
