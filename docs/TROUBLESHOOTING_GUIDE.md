# Troubleshooting Guide: Garmin/Wahoo Integration Issues

This guide addresses the 406 and 500 errors you're experiencing with bike computer integrations.

## Issues Identified

### 1. **406 Error: "Not Acceptable" from Supabase**
**Problem:** The `bike_computer_integrations` table doesn't exist or has wrong schema/permissions.

**Symptoms:**
```
GET /rest/v1/bike_computer_integrations?select=id,sync_enabled&user_id=eq.XXX&provider=eq.garmin 406
```

**Root Cause:**
- Table wasn't created properly
- Missing GRANT statements (authenticated role can't read)
- Wrong column names from outdated schema
- PostgREST schema cache not refreshed

### 2. **500 Error: Garmin OAuth API Failing**
**Problem:** Missing environment variables in Vercel deployment.

**Symptoms:**
```
POST https://www.tribos.studio/api/garmin-auth 500 (Internal Server Error)
❌ Garmin auth initiation failed: Error: Authentication failed
```

**Root Cause:**
- `SUPABASE_URL` not set in Vercel
- `SUPABASE_SERVICE_KEY` not set in Vercel
- `GARMIN_CONSUMER_KEY` not set in Vercel
- `GARMIN_CONSUMER_SECRET` not set in Vercel

### 3. **Slow Vercel Deploy Times (10 minutes)**
**Problem:** Large dependency footprint and build configuration.

**Causes:**
- 1.5GB node_modules folder
- Recent additions: `oauth-1.0a`, `crypto-js` (small impact)
- Sourcemap generation disabled but still processing
- React 19 (newer, potentially slower builds)

---

## SOLUTION 1: Fix Database (406 Errors)

### Step 1: Run the Definitive Fix SQL

1. Go to: https://supabase.com/dashboard/project/toihfeffpljsmgritmuy/sql/new

2. **Copy and paste this entire SQL:**
   (See `/database/migrations/DEFINITIVE_FIX_bike_computer_integrations.sql`)

3. Click **"Run"**

4. **Verify output** shows:
   - 2 tables created: `bike_computer_integrations`, `bike_computer_sync_history`
   - 8 RLS policies created (4 for each table)
   - Permissions granted to `service_role` and `authenticated`

### What This Does:
- **Drops** any existing incorrect tables
- **Creates** tables with correct schema and column names
- **Adds GRANT statements** (THIS WAS MISSING!)
- **Sets up RLS policies** for security
- **Forces PostgREST to reload** schema cache
- **Verifies** everything was created correctly

### Key Fix: GRANT Statements
```sql
-- These were MISSING from original migration!
GRANT ALL ON bike_computer_integrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON bike_computer_integrations TO authenticated;

GRANT ALL ON bike_computer_sync_history TO service_role;
GRANT SELECT, INSERT ON bike_computer_sync_history TO authenticated;
```

---

## SOLUTION 2: Fix Vercel Environment Variables (500 Errors)

### Go to Vercel Settings:
https://vercel.com/travisdiegowhites-projects/cycling-ai-app-v2/settings/environment-variables

### Add These Variables (for Production):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `SUPABASE_URL` | `https://toihfeffpljsmgritmuy.supabase.co` | Server-side |
| `SUPABASE_SERVICE_KEY` | Get from Supabase (see below) | **CRITICAL** |
| `GARMIN_CONSUMER_KEY` | `3713481c-7ec3-4e66-975e-fca6e1615dc0` | Server-side |
| `GARMIN_CONSUMER_SECRET` | `RZwzK67fynidIl4tbnrLsP+4pMXphozS6URLIEgdPZQ` | Server-side |
| `REACT_APP_GARMIN_CONSUMER_KEY` | `3713481c-7ec3-4e66-975e-fca6e1615dc0` | Client-side |
| `REACT_APP_GARMIN_REDIRECT_URI` | `https://www.tribos.studio/garmin/callback` | Client-side |

### How to Get SUPABASE_SERVICE_KEY:

1. Go to: https://supabase.com/dashboard/project/toihfeffpljsmgritmuy/settings/api
2. Scroll to "Project API keys"
3. Find the **"service_role"** key (NOT anon key!)
4. Click "Reveal" and copy the full key
5. Paste it as `SUPABASE_SERVICE_KEY` in Vercel

### After Adding Variables:

1. Click **"Redeploy"** in Vercel (top right)
2. Or push a new commit to trigger deployment
3. The 500 errors should be fixed

---

## SOLUTION 3: Optimize Deploy Times

### Current State:
- **1.5GB** node_modules
- **~47** direct dependencies
- **10 minute** deploy times

### Quick Wins:

#### 1. Use Vercel Build Cache (if not already)
Check `.vercel/project.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app"
}
```

#### 2. Optimize package.json
Already using:
- `GENERATE_SOURCEMAP=false` ✅
- `CI=false npm run build` ✅

#### 3. Consider Moving Dev Dependencies
Currently all deps are in `dependencies`. Move these to `devDependencies`:
- `@testing-library/*` (testing tools)
- `@types/*` (TypeScript types if not using TS in production)

#### 4. Reduce Bundle Size
Large packages in your build:
- `@turf/turf` (330KB) - Consider tree-shaking or using specific modules
- `mapbox-gl` (900KB) - Already optimal for maps
- `recharts` (430KB) - Can lazy-load charts

---

## Verification Steps

### After Running Database Fix:

1. **Check tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('bike_computer_integrations', 'bike_computer_sync_history');
   ```
   Expected: 2 rows

2. **Check RLS policies:**
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN ('bike_computer_integrations', 'bike_computer_sync_history');
   ```
   Expected: 8 rows (4 per table)

3. **Check permissions:**
   ```sql
   SELECT table_name, grantee, privilege_type
   FROM information_schema.table_privileges
   WHERE table_name = 'bike_computer_integrations'
   AND grantee IN ('service_role', 'authenticated');
   ```
   Expected: Multiple rows showing SELECT, INSERT, UPDATE, DELETE for authenticated

### After Vercel Environment Variables:

1. **Test Garmin connection** on https://www.tribos.studio
2. Check browser console - no 500 errors
3. OAuth flow should initiate successfully

### 406 Errors Should Be Gone:

1. Refresh your production site
2. Go to Import page → Garmin tab
3. Browser console should show no 406 errors
4. Should be able to click "Connect to Garmin"

---

## Why This Happened

### Schema Evolution Problem:
1. You had 3 different schema definitions for the same table
2. `bike_computer_integrations_schema.sql` (old column names)
3. `create_bike_computer_integrations.sql` (correct names)
4. `fix_bike_computer_integrations.sql` (migration from old to new)

### Missing Permissions:
The original `create_bike_computer_integrations.sql` migration was missing critical GRANT statements. Without these, the `authenticated` role (your logged-in users) couldn't query the table, causing 406 errors.

### Environment Variables:
API routes need server-side environment variables (without `REACT_APP_` prefix) to access Supabase and Garmin APIs.

---

## Files to Delete (After Fix Works)

These files are outdated and conflicting:
- `/database/bike_computer_integrations_schema.sql` - OLD SCHEMA, DO NOT USE
- `/database/migrations/fix_bike_computer_integrations.sql` - Only needed if using old schema

Keep these files:
- `/database/migrations/create_bike_computer_integrations.sql` - Original (but missing GRANTs)
- `/database/migrations/DEFINITIVE_FIX_bike_computer_integrations.sql` - THE FIX (includes GRANTs)

---

## Contact Points

If issues persist:

1. **Check Vercel deployment logs:**
   https://vercel.com/travisdiegowhites-projects/cycling-ai-app-v2/deployments

2. **Check Supabase logs:**
   https://supabase.com/dashboard/project/toihfeffpljsmgritmuy/logs/explorer

3. **Verify table in Supabase:**
   https://supabase.com/dashboard/project/toihfeffpljsmgritmuy/editor

---

## Summary Checklist

- [ ] Run DEFINITIVE_FIX_bike_computer_integrations.sql in Supabase
- [ ] Verify tables and permissions were created
- [ ] Add all environment variables to Vercel (especially SUPABASE_SERVICE_KEY)
- [ ] Redeploy on Vercel
- [ ] Test Garmin connection on production site
- [ ] Verify no 406 or 500 errors in browser console
- [ ] Delete outdated schema files to prevent confusion

Once all checkboxes are complete, your Garmin and Wahoo integrations should work perfectly!
