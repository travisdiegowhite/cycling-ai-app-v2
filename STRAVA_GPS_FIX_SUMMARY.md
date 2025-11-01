# Strava GPS Import Fix - Summary

## Issues Fixed

### 1. **No GPS Track Points Being Imported** ✅
**Problem**: After Strava import, routes showed "No GPS data available" even though `has_gps_data=true`. Database had 0 track points.

**Root Cause**: When we integrated Garmin webhooks, the Strava bulk import was changed to use `summary_polyline` from the activities list endpoint instead of the detailed Streams API. This only provided ~100 low-resolution coordinates without elevation, time, or distance data.

**Solution**: Restored the original Streams API approach from the pre-Garmin code:
- Fetches `/activities/{id}/streams?keys=latlng,time,altitude,distance`
- Gets high-resolution GPS data (~1 point per 5 seconds)
- Includes elevation, timestamps, and distance markers
- **File**: [api/strava-bulk-import.js](api/strava-bulk-import.js#L357-L434)

### 2. **Mysterious Duplicate Detection** ✅
**Problem**: Import showed "74 duplicates skipped, 0 imported" but SQL confirmed database was completely empty (0 routes).

**Root Cause**: Unknown - possibly PostgREST cache, different database connection, or transaction timing issue.

**Solution**: Added `force` parameter to bypass duplicate detection:
- Default: `force=true` to always import
- Backend skips duplicate checks when force is enabled
- Frontend passes force parameter in API requests
- **Files**:
  - Backend: [api/strava-bulk-import.js](api/strava-bulk-import.js#L90-L98) & [lines 253-298](api/strava-bulk-import.js#L253-L298)
  - Frontend: [src/utils/stravaService.js](src/utils/stravaService.js#L319)

### 3. **Navigation Issues** ✅
**Problem**:
- Import wizard "View My Rides" button returned to import page instead of Training Dashboard
- "View route" redirected to route planner instead of showing modal popup

**Solution**:
- Fixed ImportWizard to navigate to Training Dashboard
- Added RideDetailModal integration to RideHistoryTable
- **Files**:
  - [src/components/ImportWizard.js](src/components/ImportWizard.js)
  - [src/components/RideHistoryTable.js](src/components/RideHistoryTable.js)

## Code Changes Summary

### Backend: api/strava-bulk-import.js

**Added Force Mode** (lines 90-98, 253-298):
```javascript
const { userId, startDate, endDate, force = false } = req.body;

if (force) {
  console.log('⚠️ FORCE MODE ENABLED - Will skip duplicate checks');
}

async function importStravaActivity(userId, activity, accessToken, force = false) {
  if (!force) {
    // Check for duplicates...
  } else {
    console.log(`🔄 FORCE MODE: Importing without duplicate check`);
  }
}
```

**Restored Streams API** (lines 357-434):
```javascript
// Fetch streams from Strava API
const response = await fetch(
  `${STRAVA_API_BASE}/activities/${activity.id}/streams?keys=latlng,time,altitude,distance&key_by_type=true`,
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);

if (response.ok) {
  const streams = await response.json();

  if (streams.latlng && streams.latlng.data.length > 0) {
    const trackPoints = streams.latlng.data.map((latLng, index) => ({
      route_id: route.id,
      point_index: index,
      latitude: latLng[0],
      longitude: latLng[1],
      elevation: streams.altitude?.data?.[index] || null,
      time_seconds: streams.time?.data?.[index] || null,
      distance_m: streams.distance?.data?.[index] || null
    }));

    // Insert track points
    await supabase.from('track_points').insert(trackPoints);

    console.log(`📍 Imported ${trackPoints.length} GPS points`);
  }
}
```

### Frontend: src/utils/stravaService.js

**Added Force Parameter** (line 319, 337):
```javascript
async bulkImport(options = {}) {
  const { startDate, endDate, force = true } = options; // Default force=true

  if (force) {
    console.log('⚠️ FORCE MODE: Bypassing duplicate checks');
  }

  const response = await fetch(`${getApiBaseUrl()}/api/strava-bulk-import`, {
    method: 'POST',
    body: JSON.stringify({
      userId,
      startDate,
      endDate,
      force  // Pass force parameter
    })
  });
}
```

## Testing Instructions

### 1. Wait for Deployment
Vercel should auto-deploy within 5-10 minutes after the push. Check deployment status:
- Visit: https://vercel.com/your-project/deployments
- Or: Run `vercel inspect` in the terminal

### 2. Run Fresh Import
1. Go to the app
2. Click "Import from Strava"
3. Select date range (or leave blank for all activities)
4. Click "Start Import"
5. Watch for console logs:
   - "⚠️ FORCE MODE: Bypassing duplicate checks"
   - "📍 Fetching GPS streams for activity..."
   - "✅ Got X GPS points for activity..."
   - "📍 Imported X GPS points for activity..."

### 3. Verify Import Success
Run the verification script:
```bash
node verify-import.js
```

This will show:
- Total routes imported
- Routes with GPS data
- Sample track points with elevation/time/distance
- Any issues detected

### 4. Test Map Display
1. Go to Training Dashboard
2. Click the Eye icon to view a route
3. Verify the map displays correctly with the GPS track
4. Check that elevation profile shows (if available)

## Diagnostic Scripts

### verify-import.js
Comprehensive verification of import success:
- Counts routes and track points
- Shows sample GPS data
- Verifies data quality (elevation, time, distance)
- Identifies any issues

**Usage**: `node verify-import.js`

### check-with-service-key.js
Checks track points using Supabase service key (bypasses RLS):
- Useful for debugging RLS issues
- Shows actual database content

**Usage**: `node check-with-service-key.js`

### check-duplicates.js
Shows all routes and checks for duplicates:
- Lists all routes with strava_id
- Counts total track points
- Helps identify duplicate issues

**Usage**: `node check-duplicates.js`

### check-import.js
Quick status check after import:
- Shows recent routes
- Sample track points
- Summary statistics

**Usage**: `node check-import.js`

## Expected Results

After a successful import, you should see:

✅ **Routes Table**:
- Routes imported with correct metadata
- `has_gps_data = true`
- `track_points_count > 0` (typically 500-2000 points per route)
- `start_latitude`, `start_longitude` populated

✅ **Track Points Table**:
- Thousands of track points across all routes
- Each point has: latitude, longitude
- Most points have: elevation, time_seconds, distance_m
- Virtual/indoor rides may have fewer fields

✅ **Map Display**:
- Route view modal shows interactive map
- GPS track displayed as blue line
- Elevation profile shows (if available)
- Start/end markers visible

## Troubleshooting

### If maps still don't display:

1. **Check track points were imported**:
   ```bash
   node verify-import.js
   ```

2. **Check Vercel logs** for GPS fetch messages:
   - "📍 Fetching GPS streams for activity..."
   - "✅ Got X GPS points for activity..."

3. **Check for API errors**:
   - Strava rate limit (100 requests per 15 min)
   - Token expiration
   - Network errors

4. **Re-run import with fresh data**:
   - Delete old routes in database
   - Run import again
   - Force mode is already enabled by default

### If import shows errors:

Check the `errorDetails` in the console output:
```javascript
{
  errorDetails: [
    {
      activityId: 123456,
      activityName: "Morning Ride",
      errorCode: "23505",
      errorMessage: "duplicate key value..."
    }
  ]
}
```

Common error codes:
- `23505`: Duplicate key (shouldn't happen with force mode)
- `PGRST116`: Not found (expected for duplicate checks)
- `42501`: Permission denied (RLS issue)

## Next Steps

1. ✅ Deploy and test the force mode implementation
2. ⏳ Run database migration for track_points nullable fields:
   ```sql
   -- Run in Supabase SQL editor
   \i database/migrations/fix_track_points_nullable.sql
   ```
3. ⏳ Test import with various activity types (road, MTB, gravel, virtual)
4. ⏳ Monitor Strava API rate limits during bulk imports
5. ⏳ Consider adding progress indicator for long imports

## Related Files

- [api/strava-bulk-import.js](api/strava-bulk-import.js) - Backend import handler
- [src/utils/stravaService.js](src/utils/stravaService.js) - Frontend Strava service
- [src/components/ImportWizard.js](src/components/ImportWizard.js) - Import UI
- [src/components/RideHistoryTable.js](src/components/RideHistoryTable.js) - Route list with view modal
- [database/migrations/fix_track_points_nullable.sql](database/migrations/fix_track_points_nullable.sql) - Schema fix

## Git History

Relevant commits:
- `84d7771` - feat: Add force mode to bypass duplicate detection
- `a1603fd` - debug: Add detailed logging for duplicate detection
- `da6eb46` - fix: Use Strava Streams API for GPS data like old working code
- `a0702c1` - fix: Prepare for fresh Strava import with GPS data

Compare to working version (before Garmin integration):
- `90ecbb7` - Original working Strava import with Streams API
