# Fresh Strava Import - Pre-Flight Checklist

## Issues Found and Fixed

### 1. Track Points Schema Mismatch ❌ BLOCKING
**Problem**: `track_points.time_seconds` is `NOT NULL` in schema but bulk import sets it to `null`

**Impact**: Track point insertion will FAIL

**Fix Required**: Make `time_seconds` and `distance` nullable in schema OR populate them during import

**Location**:
- Schema: `database/new_routes_schema.sql` line 111
- Import: `api/strava-bulk-import.js` line 352

### 2. Integer Type Conversions ✅ FIXED
**Problem**: Strava returns floats but database expects integers

**Fixed Fields** (using Math.round()):
- ✅ duration_seconds
- ✅ elevation_gain_m
- ✅ elevation_loss_m (if used)
- ✅ average_heartrate
- ✅ max_heartrate
- ✅ average_watts
- ✅ max_watts
- ✅ kilojoules

**Location**: `api/strava-bulk-import.js` lines 298-305

### 3. GPS Data Import ✅ WORKING
**Status**: Code is in place to import GPS track points

**What it does**:
- Decodes `summary_polyline` from Strava activities list
- Inserts points to `track_points` table
- Updates route with start/end coords and count

**Note**: Uses summary_polyline (~100 points) not detailed polyline (~1000+ points) to avoid rate limits

**Location**: `api/strava-bulk-import.js` lines 339-387

### 4. Route Fields ✅ COMPLETE
**All required fields are populated**:
- ✅ user_id
- ✅ name
- ✅ distance_km
- ✅ duration_seconds
- ✅ elevation_gain_m
- ✅ average_speed, max_speed
- ✅ heartrate data
- ✅ power data
- ✅ strava_id, strava_url
- ✅ has_gps_data, has_heart_rate_data, has_power_data
- ✅ activity_type
- ✅ recorded_at ⚠️ IMPORTANT FOR TRAINING DASHBOARD
- ✅ imported_from = 'strava'

## Required Fixes Before Import

### Fix #1: Update track_points Schema
Make time_seconds and distance nullable since Strava summary polyline doesn't include this data:

```sql
ALTER TABLE track_points
  ALTER COLUMN time_seconds DROP NOT NULL,
  ALTER COLUMN distance_m DROP NOT NULL;
```

### Fix #2: Add Better Error Logging
The import should show progress and detailed errors per activity.

**Currently missing**:
- Progress indicator (Activity 1 of 184...)
- Detailed error output
- Summary stats at end

## Import Strategy

### Recommended Approach:
1. **Clear existing routes**:
   ```sql
   DELETE FROM track_points WHERE route_id IN (
     SELECT id FROM routes WHERE user_id = 'YOUR_USER_ID'
   );
   DELETE FROM routes WHERE user_id = 'YOUR_USER_ID';
   ```

2. **Run schema fix** (if not already done):
   ```sql
   ALTER TABLE track_points
     ALTER COLUMN time_seconds DROP NOT NULL;
   ```

3. **Use Import Wizard** (not StravaIntegration page):
   - Go to Settings → Import Wizard
   - Select timeframe (e.g., "Last 1 year")
   - Click "Start Import"
   - Wait for completion

4. **Verify results**:
   ```sql
   SELECT
     COUNT(*) as total_routes,
     COUNT(CASE WHEN has_gps_data THEN 1 END) as with_gps,
     COUNT(CASE WHEN track_points_count > 0 THEN 1 END) as with_track_points,
     AVG(track_points_count) as avg_points_per_route
   FROM routes
   WHERE user_id = 'YOUR_USER_ID';
   ```

## Known Limitations

### 1. GPS Resolution
- **Summary polyline**: ~100 points (used by bulk import)
- **Detailed polyline**: ~1000+ points (requires individual API calls)
- **Trade-off**: Bulk import uses summary to avoid rate limits

### 2. Missing Data in Track Points
Since we use summary polyline:
- ❌ No timestamps per point
- ❌ No elevation data
- ❌ No speed/power/HR per point
- ✅ GPS coordinates only

To get detailed data, we'd need to:
1. Make individual API call per activity
2. Fetch detailed polyline + streams
3. This hits rate limits fast (100 req/15min)

### 3. Rate Limiting
**Strava Limits**:
- 100 requests per 15 minutes
- 1,000 requests per day

**Current approach**:
- List all activities: ~1 request per 200 activities
- Import track points: Uses polyline from list (no extra calls)
- **Total for 184 activities**: ~1-2 API calls

## Post-Import Checklist

After import completes, verify:

- [ ] All routes appear in Training Dashboard
- [ ] Click "View route" shows GPS map
- [ ] Route details show correct metrics
- [ ] No routes have NULL `recorded_at`
- [ ] `track_points_count` matches actual points in database

## Troubleshooting

### Training Dashboard Empty
**Cause**: Routes with NULL `recorded_at` are filtered out

**Fix**: Ensure `recorded_at` is set during import (it should be `activity.start_date`)

### "No GPS data available"
**Causes**:
1. `has_gps_data` = false
2. `track_points_count` = 0 or NULL
3. No rows in `track_points` table

**Check**:
```sql
SELECT id, name, has_gps_data, track_points_count
FROM routes
WHERE user_id = 'YOUR_USER_ID'
AND has_gps_data = true
AND (track_points_count IS NULL OR track_points_count = 0);
```

### Import Fails with Integer Error
**Error**: `invalid input syntax for type integer: "143.1"`

**Cause**: Float value being inserted into INTEGER column

**Fix**: Ensure ALL integer fields use `Math.round()` in import code

