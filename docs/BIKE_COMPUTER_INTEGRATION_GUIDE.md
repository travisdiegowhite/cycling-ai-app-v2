# Bike Computer Integration Guide

## Overview
This guide documents the implementation of direct bike computer integration (Wahoo, Garmin) for automatic ride imports.

## What's Been Built (Client-Side)

### 1. Database Schema ✅
**File:** `database/bike_computer_integrations_schema.sql`

Two tables created:
- `bike_computer_integrations` - Stores OAuth tokens and connection details
- `bike_computer_sync_history` - Tracks import history and prevents duplicates

Key features:
- Row Level Security (RLS) enabled
- Supports multiple providers (wahoo, garmin, hammerhead)
- Tracks sync status and errors
- Prevents duplicate imports with unique constraints

### 2. Wahoo Service (Client) ✅
**File:** `src/utils/wahooService.js`

Implements:
- OAuth flow initiation
- Token exchange (calls server-side)
- Connection status checking
- Disconnect functionality
- Workout syncing
- Sync history retrieval

OAuth scopes requested:
- `user_read` - Read user profile
- `workouts_read` - Read workout data
- `offline_data` - Access data while offline

### 3. Wahoo OAuth Callback ✅
**File:** `src/components/WahooCallback.js`

- Handles OAuth redirect from Wahoo
- Exchanges authorization code for tokens
- Shows loading states
- Redirects to settings after success
- Error handling with user feedback

### 4. Routing ✅
**File:** `src/App.js`

Added route: `/wahoo/callback` for OAuth flow

## What's Needed Next (Server-Side)

### 1. Environment Variables

Add to `.env`:
```bash
# Wahoo API Credentials
REACT_APP_WAHOO_CLIENT_ID=your_client_id_here
REACT_APP_WAHOO_CLIENT_SECRET=your_client_secret_here
REACT_APP_WAHOO_REDIRECT_URI=http://localhost:3000/wahoo/callback

# For production (Vercel)
# REACT_APP_WAHOO_REDIRECT_URI=https://yourdomain.com/wahoo/callback
```

### 2. Register Wahoo Developer Account

1. Go to https://developers.wahooligan.com
2. Create an account
3. Create a new app:
   - **Name:** Your App Name
   - **Redirect URI:** `http://localhost:3000/wahoo/callback` (dev) or your production URL
   - **Scopes:** user_read, workouts_read, offline_data
4. Get your Client ID and Client Secret
5. Add to `.env` file

**Contact:** wahooapi@wahoofitness.com for approval questions

### 3. Server-Side Endpoints Needed

#### A. Wahoo Auth Endpoint
**Path:** `api/wahoo-auth`

Needs to handle:
```javascript
POST /api/wahoo-auth
{
  action: 'exchange_code' | 'disconnect',
  code: string, // For exchange_code
  userId: string
}
```

Responsibilities:
- Exchange authorization code for access/refresh tokens
- Store tokens in `bike_computer_integrations` table
- Return user data
- Handle token refresh
- Handle disconnect (delete from DB)

#### B. Wahoo Sync Endpoint
**Path:** `api/wahoo-sync`

Needs to handle:
```javascript
POST /api/wahoo-sync
{
  userId: string,
  since?: timestamp // Optional: only sync activities after this time
}
```

Responsibilities:
- Get access token from DB
- Fetch workouts from Wahoo API
- Transform Wahoo workout data to your routes schema
- Import track points
- Update `bike_computer_sync_history`
- Handle pagination for bulk imports

### 4. Wahoo API Endpoints to Use

Base URL: `https://api.wahooligan.com/v1`

Key endpoints:
```
GET /user - Get user profile
GET /workouts - List workouts
  Query params:
  - per_page: Number of results (max 100)
  - page: Page number
  - order: created_at (default)

GET /workouts/:id - Get specific workout details
GET /workouts/:id/file - Download workout file (FIT format)
```

Authentication:
```
Authorization: Bearer {access_token}
```

### 5. Database Migration

Run the schema:
```bash
# In Supabase SQL editor or migration tool
psql -U postgres -d your_database -f database/bike_computer_integrations_schema.sql
```

Or in Supabase dashboard:
1. Go to SQL Editor
2. Paste contents of `bike_computer_integrations_schema.sql`
3. Run

### 6. UI Integration (Settings Page)

Need to add to Settings page:

```jsx
import wahooService from '../utils/wahooService';

// In your settings component:
const handleConnectWahoo = async () => {
  const authUrl = wahooService.getAuthorizationUrl();
  window.location.href = authUrl;
};

const handleDisconnectWahoo = async () => {
  await wahooService.disconnect();
  // Refresh UI
};

// Check connection status:
const isConnected = await wahooService.isConnected();
```

## Garmin Integration ✅

### Client-Side Complete:
- `src/utils/garminService.js` - OAuth 1.0a flow
- `src/components/GarminCallback.js` - Callback handler
- Route added to App.js: `/garmin/callback`

## Garmin Integration Details

### Requirements:
1. **Business Developer Account Required**
   - Not available for hobbyists
   - Apply at: https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/
   - Must provide business details

2. **API Features:**
   - Activity API - Get full activity data
   - Health API - Get all-day metrics
   - Training API - Push workouts to devices
   - **PUSH-based webhooks** (more efficient than polling)

3. **Approval Process:**
   - Fill out application form
   - Wait for Garmin review
   - Receive developer credentials
   - Configure webhook endpoints

## User Experience Flow

1. **User goes to Settings > Integrations**
2. **Clicks "Connect Wahoo"**
3. **Redirected to Wahoo authorization page**
4. **User authorizes the app**
5. **Redirected back to /wahoo/callback**
6. **Tokens exchanged and stored**
7. **Redirected to Settings with success message**
8. **From now on:**
   - User completes ride on Wahoo device
   - Device auto-uploads to Wahoo Cloud (via WiFi/Bluetooth)
   - Your app syncs from Wahoo Cloud (automatic or manual trigger)
   - Ride appears in your app

## Rate Limits

### Wahoo Production Apps:
- 200 requests per 5 minutes
- 1000 requests per hour
- 5000 requests per day

**Strategy:** Batch sync operations, cache when possible

### Wahoo Sandbox (Testing):
- 25 requests per 5 minutes
- 100 requests per hour
- 250 requests per day

## Testing Checklist

- [ ] Wahoo developer account created
- [ ] Client ID and Secret added to `.env`
- [ ] Database schema migrated to Supabase
- [ ] Server-side auth endpoint created
- [ ] Server-side sync endpoint created
- [ ] OAuth flow works (can connect Wahoo account)
- [ ] Can fetch workouts from Wahoo API
- [ ] Workouts successfully import as routes
- [ ] Track points imported correctly
- [ ] Can disconnect Wahoo account
- [ ] Sync history tracks imports
- [ ] Duplicate prevention works
- [ ] Error handling works properly

## Legal Pages (Required for API Approvals) ✅

### Privacy Policy
**File:** `src/components/PrivacyPolicy.js`
**Route:** `/privacy-policy`

Comprehensive privacy policy covering:
- Data collection practices
- Third-party integrations (Strava, Garmin, Wahoo)
- Security measures
- User rights (access, deletion, export)
- GDPR and CCPA compliance
- Data retention policies

### Terms of Service
**File:** `src/components/TermsOfService.js`
**Route:** `/terms-of-service`

Complete terms covering:
- Service description
- User responsibilities
- Safety disclaimers
- Third-party integrations
- Intellectual property
- Liability limitations

**Important:** Update the contact email addresses in both files before going live:
- `privacy@yourdomain.com`
- `legal@yourdomain.com`

## Application Requirements

When applying for Wahoo/Garmin developer access, you'll need:
1. **Privacy Policy URL:** `https://yourdomain.com/privacy-policy`
2. **Terms of Service URL:** `https://yourdomain.com/terms-of-service`
3. **Application Description:** Brief description of your app
4. **Redirect URIs:**
   - Dev: `http://localhost:3000/[provider]/callback`
   - Prod: `https://yourdomain.com/[provider]/callback`

## Resources

- **Wahoo API Docs:** https://cloud-api.wahooligan.com/
- **Wahoo Developer Portal:** https://developers.wahooligan.com/cloud
- **Wahoo API Agreement:** https://www.wahoofitness.com/wahoo-api-agreement
- **Garmin Developer:** https://developer.garmin.com/
- **Garmin Application Form:** https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/

## Questions?

Contact:
- **Wahoo:** wahooapi@wahoofitness.com
- **Garmin:** Through developer portal support

## Next Steps

1. **Get Wahoo API credentials** (highest priority)
2. **Run database migration**
3. **Build server-side auth endpoint**
4. **Build server-side sync endpoint**
5. **Add UI to Settings page**
6. **Test end-to-end flow**
7. **Deploy to production**
8. **(Optional) Apply for Garmin developer access**
