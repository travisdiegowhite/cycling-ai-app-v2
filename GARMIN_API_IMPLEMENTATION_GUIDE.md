# Garmin Connect API Implementation Guide

## Overview

This guide covers implementing Garmin Connect's Activity API and Health API to fetch and store cycling activity data and health metrics in your application.

---

## 🔑 API Access & Prerequisites

### Required: Garmin Connect Developer Program Approval

1. **Apply for API Access**
   - Visit: https://developer.garmin.com/gc-developer-program/
   - Apply for free business developer access
   - Approval typically takes a few business days
   - You'll receive API documentation and credentials upon approval

2. **What You Get**
   - Access to Activity API (FIT files with detailed activity data)
   - Access to Health API (JSON health metrics)
   - Webhook/Push notification support
   - Developer web tools with sample data
   - Evaluation environment for testing

3. **OAuth Credentials**
   - ✅ Already have: Consumer Key & Secret (for OAuth 1.0a)
   - Need: Webhook endpoint URL (for push notifications)

---

## 📊 Available APIs

### 1. **Activity API**
**Purpose:** Access detailed fitness data from cycling activities

**Data Format:** FIT files (.fit), GPX (.gpx), TCX (.tcx)

**Supported Activity Types (30+ types):**
- Road Cycling
- Mountain Biking
- Indoor Cycling
- Gravel Cycling
- Running, Swimming, Hiking, etc.

**Data Included:**
- **GPS Data:** Latitude, longitude, altitude
- **Performance Metrics:** Speed, pace, distance, duration
- **Power Data:** Watts (if power meter connected)
- **Heart Rate:** BPM, zones
- **Cadence:** RPM (cycling), steps/min (running)
- **Elevation:** Gain, loss, grade
- **Temperature:** Ambient temperature
- **Intensity:** Workout intensity levels
- **Device Info:** Device type, firmware version

**Delivery Methods:**
- **Push (Webhooks):** Activity files delivered to your server shortly after user syncs
- **Pull (API):** Fetch activities on demand via REST endpoints

---

### 2. **Health API**
**Purpose:** Access all-day health and wellness metrics

**Data Format:** JSON

**Available Metrics:**
- **Activity:** Steps, calories, intensity minutes
- **Heart Rate:** Resting HR, max HR, beat-to-beat intervals*
- **Sleep:** Duration, quality, stages (light/deep/REM)
- **Stress:** Stress level scores
- **Respiration:** Breaths per minute
- **Pulse Ox:** Blood oxygen saturation (SpO2)
- **Body Battery:** Energy reserves (0-100)
- **Body Composition:** Weight, BMI, body fat %, muscle mass
- **Blood Pressure:** Systolic/diastolic readings

*Beat-to-beat interval data requires commercial licensing

**Delivery Methods:**
- **Push (Webhooks):** Real-time updates within seconds of device sync
- **Pull (API):** Fetch health summaries via REST endpoints

---

## 🏗️ Database Schema Design

### Existing Tables (Already Created)

You already have these tables from the bike computer integration:

```sql
-- OAuth tokens for Garmin integration
bike_computer_integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  provider TEXT, -- 'garmin'
  access_token TEXT,
  refresh_token TEXT, -- OAuth 1.0a token secret
  token_expires_at TIMESTAMPTZ, -- NULL for OAuth 1.0a
  provider_user_id TEXT,
  provider_user_data JSONB,
  sync_enabled BOOLEAN,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
)

-- Sync history for tracking imports
bike_computer_sync_history (
  id UUID PRIMARY KEY,
  integration_id UUID REFERENCES bike_computer_integrations,
  user_id UUID REFERENCES auth.users,
  provider TEXT,
  activity_id TEXT, -- Garmin activity ID
  route_id UUID REFERENCES routes, -- Your app's route ID
  synced_at TIMESTAMPTZ,
  sync_status TEXT, -- 'success', 'error', 'duplicate'
  error_message TEXT,
  activity_data JSONB, -- Store raw activity summary
  UNIQUE(integration_id, activity_id)
)

-- Your routes table (activities stored here)
routes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT,
  description TEXT,
  distance NUMERIC,
  elevation_gain NUMERIC,
  elevation_loss NUMERIC,
  duration INTEGER, -- seconds
  avg_speed NUMERIC,
  max_speed NUMERIC,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_power INTEGER,
  max_power INTEGER,
  avg_cadence INTEGER,
  calories INTEGER,
  polyline TEXT, -- Encoded polyline
  garmin_id TEXT, -- Garmin activity ID
  garmin_url TEXT, -- Link to Garmin Connect
  has_gps_data BOOLEAN,
  has_heart_rate_data BOOLEAN,
  has_power_data BOOLEAN,
  has_cadence_data BOOLEAN,
  activity_type TEXT, -- 'road_biking', 'mountain_biking', etc.
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- GPS track points (detailed route data)
track_points (
  id UUID PRIMARY KEY,
  route_id UUID REFERENCES routes,
  timestamp TIMESTAMPTZ,
  latitude NUMERIC,
  longitude NUMERIC,
  elevation NUMERIC,
  heart_rate INTEGER,
  power INTEGER,
  cadence INTEGER,
  speed NUMERIC,
  temperature NUMERIC,
  distance NUMERIC, -- Cumulative distance
  sequence_number INTEGER
)
```

---

### New Tables Needed

#### 1. Garmin Health Metrics

```sql
-- Daily health summaries
CREATE TABLE garmin_health_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES bike_computer_integrations(id) ON DELETE CASCADE,

  -- Date of measurement
  date DATE NOT NULL,

  -- Activity metrics
  steps INTEGER,
  calories_active INTEGER,
  calories_bmr INTEGER,
  calories_total INTEGER,
  distance_meters NUMERIC,
  active_minutes INTEGER,
  sedentary_minutes INTEGER,
  moderate_intensity_minutes INTEGER,
  vigorous_intensity_minutes INTEGER,
  floors_climbed INTEGER,

  -- Heart rate
  resting_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_heart_rate INTEGER,

  -- Sleep
  sleep_duration_seconds INTEGER,
  sleep_quality_score INTEGER,
  light_sleep_seconds INTEGER,
  deep_sleep_seconds INTEGER,
  rem_sleep_seconds INTEGER,
  awake_seconds INTEGER,

  -- Wellness
  stress_avg INTEGER, -- 0-100
  stress_max INTEGER,
  body_battery_min INTEGER, -- 0-100
  body_battery_max INTEGER,
  respiration_avg NUMERIC, -- breaths/min
  spo2_avg NUMERIC, -- SpO2 percentage
  spo2_min NUMERIC,

  -- Body composition (if available)
  weight_kg NUMERIC,
  bmi NUMERIC,
  body_fat_percentage NUMERIC,
  muscle_mass_kg NUMERIC,
  bone_mass_kg NUMERIC,
  body_water_percentage NUMERIC,

  -- Blood pressure (if available)
  systolic INTEGER,
  diastolic INTEGER,

  -- Metadata
  raw_data JSONB, -- Store complete JSON from Garmin
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_garmin_health_daily_user_date ON garmin_health_daily(user_id, date DESC);
CREATE INDEX idx_garmin_health_daily_integration ON garmin_health_daily(integration_id);

-- Enable RLS
ALTER TABLE garmin_health_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health data"
  ON garmin_health_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert health data"
  ON garmin_health_daily FOR INSERT
  WITH CHECK (true); -- API inserts, verified server-side

CREATE POLICY "System can update health data"
  ON garmin_health_daily FOR UPDATE
  USING (true);
```

#### 2. Garmin Heart Rate Details (Optional - High Frequency Data)

```sql
-- Detailed heart rate throughout the day (epoch summaries)
CREATE TABLE garmin_heart_rate_epochs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES bike_computer_integrations(id) ON DELETE CASCADE,

  timestamp TIMESTAMPTZ NOT NULL,
  heart_rate INTEGER NOT NULL, -- BPM

  -- Optional: Beat-to-beat intervals (requires commercial license)
  rr_intervals INTEGER[], -- Milliseconds between beats

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- No unique constraint (multiple readings per second possible)
);

CREATE INDEX idx_garmin_hr_epochs_user_time ON garmin_heart_rate_epochs(user_id, timestamp DESC);
CREATE INDEX idx_garmin_hr_epochs_integration ON garmin_heart_rate_epochs(integration_id);

-- Enable RLS
ALTER TABLE garmin_heart_rate_epochs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own HR data"
  ON garmin_heart_rate_epochs FOR SELECT
  USING (auth.uid() = user_id);
```

#### 3. Webhook Events Log (Important for Debugging)

```sql
-- Track webhook deliveries from Garmin
CREATE TABLE garmin_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_type TEXT NOT NULL, -- 'activity', 'health', 'womens_health'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES bike_computer_integrations(id) ON DELETE SET NULL,

  -- Event details
  garmin_user_id TEXT, -- Garmin's user ID
  activity_id TEXT, -- If activity event
  file_url TEXT, -- URL to download FIT file
  upload_timestamp TIMESTAMPTZ, -- When Garmin received the data

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  process_error TEXT,

  -- Raw webhook payload
  payload JSONB NOT NULL,

  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_garmin_webhooks_processed ON garmin_webhook_events(processed, received_at);
CREATE INDEX idx_garmin_webhooks_user ON garmin_webhook_events(user_id);
CREATE INDEX idx_garmin_webhooks_activity ON garmin_webhook_events(activity_id);
```

---

## 🔧 Implementation Steps

### Phase 1: Activity API (FIT Files)

#### Step 1: Install FIT File Parser

```bash
npm install fit-file-parser
```

Or alternative:
```bash
npm install easy-fit
```

#### Step 2: Create Webhook Endpoint

Create `/api/garmin-webhooks.js`:

```javascript
// Vercel API Route: Handle Garmin Webhook Events
import { createClient } from '@supabase/supabase-js';
import FitParser from 'fit-file-parser';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Garmin sends webhook notifications when users sync activities
    const webhookData = req.body;

    console.log('📥 Garmin webhook received:', webhookData);

    // Store webhook event for processing
    const { data: event, error: eventError } = await supabase
      .from('garmin_webhook_events')
      .insert({
        event_type: webhookData.eventType || 'activity',
        garmin_user_id: webhookData.userId,
        activity_id: webhookData.activityId,
        file_url: webhookData.fileUrl,
        upload_timestamp: webhookData.uploadTimestamp,
        payload: webhookData,
        processed: false
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Respond quickly to Garmin (process async later)
    res.status(200).json({ success: true, eventId: event.id });

    // Process webhook asynchronously (don't await)
    processWebhookEvent(event.id).catch(err => {
      console.error('Webhook processing error:', err);
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function processWebhookEvent(eventId) {
  try {
    // Get event details
    const { data: event } = await supabase
      .from('garmin_webhook_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event || event.processed) return;

    // Find user by Garmin user ID
    const { data: integration } = await supabase
      .from('bike_computer_integrations')
      .select('user_id, access_token, refresh_token')
      .eq('provider', 'garmin')
      .eq('provider_user_id', event.garmin_user_id)
      .single();

    if (!integration) {
      console.log('No integration found for Garmin user:', event.garmin_user_id);
      return;
    }

    // Download FIT file from Garmin
    const fitFileUrl = event.file_url;
    const fitResponse = await fetch(fitFileUrl, {
      headers: {
        // OAuth 1.0a signature required
        'Authorization': generateOAuthHeader(fitFileUrl, integration.access_token, integration.refresh_token)
      }
    });

    if (!fitResponse.ok) {
      throw new Error(`Failed to download FIT file: ${fitResponse.statusText}`);
    }

    const fitBuffer = await fitResponse.arrayBuffer();

    // Parse FIT file
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      mode: 'cascade'
    });

    const fitData = await new Promise((resolve, reject) => {
      fitParser.parse(fitBuffer, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });

    // Extract activity data
    const activity = fitData.activity;
    const session = activity.sessions?.[0];
    const records = activity.records || [];

    // Check if cycling activity
    const activityType = session.sport; // 'cycling', 'running', etc.
    if (!['cycling', 'road_biking', 'mountain_biking'].includes(activityType.toLowerCase())) {
      console.log('Skipping non-cycling activity:', activityType);
      return;
    }

    // Store activity in routes table
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert({
        user_id: integration.user_id,
        name: `Garmin Activity ${event.activity_id}`,
        description: `Imported from Garmin Connect`,
        distance: session.total_distance / 1000, // Convert to km
        elevation_gain: session.total_ascent,
        elevation_loss: session.total_descent,
        duration: session.total_elapsed_time,
        avg_speed: session.avg_speed,
        max_speed: session.max_speed,
        avg_heart_rate: session.avg_heart_rate,
        max_heart_rate: session.max_heart_rate,
        avg_power: session.avg_power,
        max_power: session.max_power,
        avg_cadence: session.avg_cadence,
        calories: session.total_calories,
        garmin_id: event.activity_id,
        garmin_url: `https://connect.garmin.com/modern/activity/${event.activity_id}`,
        has_gps_data: records.some(r => r.position_lat && r.position_long),
        has_heart_rate_data: records.some(r => r.heart_rate),
        has_power_data: records.some(r => r.power),
        has_cadence_data: records.some(r => r.cadence),
        activity_type: activityType,
        started_at: session.start_time,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (routeError) throw routeError;

    // Store track points (GPS data)
    const trackPoints = records
      .filter(r => r.position_lat && r.position_long)
      .map((r, index) => ({
        route_id: route.id,
        timestamp: r.timestamp,
        latitude: r.position_lat,
        longitude: r.position_long,
        elevation: r.altitude,
        heart_rate: r.heart_rate,
        power: r.power,
        cadence: r.cadence,
        speed: r.speed,
        temperature: r.temperature,
        distance: r.distance,
        sequence_number: index
      }));

    // Insert in batches
    for (let i = 0; i < trackPoints.length; i += 1000) {
      const batch = trackPoints.slice(i, i + 1000);
      await supabase.from('track_points').insert(batch);
    }

    // Record sync history
    await supabase
      .from('bike_computer_sync_history')
      .insert({
        integration_id: integration.id,
        user_id: integration.user_id,
        provider: 'garmin',
        activity_id: event.activity_id,
        route_id: route.id,
        synced_at: new Date().toISOString(),
        sync_status: 'success',
        activity_data: session
      });

    // Mark webhook as processed
    await supabase
      .from('garmin_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        user_id: integration.user_id,
        integration_id: integration.id
      })
      .eq('id', eventId);

    console.log('✅ Activity imported successfully:', route.id);

  } catch (error) {
    console.error('Processing error:', error);

    // Update event with error
    await supabase
      .from('garmin_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        process_error: error.message
      })
      .eq('id', eventId);
  }
}

function generateOAuthHeader(url, accessToken, tokenSecret) {
  // Use your existing OAuth 1.0a signature generation
  // Similar to garmin-auth.js
  // ... OAuth signature logic
}
```

#### Step 3: Register Webhook with Garmin

After getting API approval, register your webhook URL in the Garmin Developer Console:

**Webhook URL:** `https://www.tribos.studio/api/garmin-webhooks`

**Event Types:**
- Activities (FIT files)
- Health (JSON summaries)

---

### Phase 2: Health API (JSON Data)

#### Create Health Data Sync Endpoint

Create `/api/garmin-health-sync.js`:

```javascript
// Sync health data from Garmin Health API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startDate, endDate } = req.body;

    // Get user's Garmin integration
    const { data: integration } = await supabase
      .from('bike_computer_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'garmin')
      .single();

    if (!integration) {
      return res.status(404).json({ error: 'Garmin not connected' });
    }

    // Fetch daily summaries from Garmin Health API
    const healthUrl = `https://apis.garmin.com/wellness-api/rest/dailies`;
    const response = await fetch(healthUrl, {
      headers: {
        'Authorization': generateOAuthHeader(healthUrl, integration.access_token, integration.refresh_token)
      },
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Garmin Health API error: ${response.statusText}`);
    }

    const healthData = await response.json();

    // Store health data
    for (const day of healthData) {
      await supabase
        .from('garmin_health_daily')
        .upsert({
          user_id: userId,
          integration_id: integration.id,
          date: day.calendarDate,
          steps: day.totalSteps,
          calories_active: day.activeKilocalories,
          calories_bmr: day.bmrKilocalories,
          calories_total: day.totalKilocalories,
          distance_meters: day.totalDistanceMeters,
          active_minutes: day.activeTimeSeconds / 60,
          moderate_intensity_minutes: day.moderateIntensityDurationSeconds / 60,
          vigorous_intensity_minutes: day.vigorousIntensityDurationSeconds / 60,
          resting_heart_rate: day.restingHeartRate,
          max_heart_rate: day.maxHeartRate,
          avg_heart_rate: day.averageHeartRateInBeatsPerMinute,
          sleep_duration_seconds: day.sleepingSeconds,
          stress_avg: day.averageStressLevel,
          body_battery_max: day.maxBodyBattery,
          respiration_avg: day.averageRespirationRate,
          spo2_avg: day.avgSpo2,
          raw_data: day,
          synced_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        });
    }

    res.status(200).json({
      success: true,
      daysImported: healthData.length
    });

  } catch (error) {
    console.error('Health sync error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

---

## 📋 Implementation Checklist

### Prerequisites
- [ ] Apply for Garmin Connect Developer Program access
- [ ] Wait for approval (few business days)
- [ ] Receive API documentation and credentials
- [ ] Review API terms and user consent requirements

### Database Setup
- [ ] Run migration to create `garmin_health_daily` table
- [ ] Run migration to create `garmin_heart_rate_epochs` table (optional)
- [ ] Run migration to create `garmin_webhook_events` table
- [ ] Verify RLS policies are set correctly
- [ ] Test database connections

### Activity API (Phase 1)
- [ ] Install `fit-file-parser` npm package
- [ ] Create `/api/garmin-webhooks.js` endpoint
- [ ] Implement FIT file parsing logic
- [ ] Test with sample FIT files
- [ ] Deploy webhook endpoint to production
- [ ] Register webhook URL with Garmin
- [ ] Test end-to-end activity import

### Health API (Phase 2)
- [ ] Create `/api/garmin-health-sync.js` endpoint
- [ ] Implement health data fetching
- [ ] Create UI for manual health data sync
- [ ] Set up automatic daily sync (cron job)
- [ ] Test health data import

### Frontend Integration
- [ ] Add "Sync Health Data" button to Garmin integration UI
- [ ] Show health metrics in dashboard
- [ ] Display activity history from Garmin
- [ ] Add health trends charts (steps, HR, sleep, etc.)

### Testing & Monitoring
- [ ] Test with real Garmin device
- [ ] Monitor webhook delivery logs
- [ ] Check error rates in `garmin_webhook_events` table
- [ ] Verify data accuracy against Garmin Connect web
- [ ] Load test with multiple concurrent webhooks

---

## 🎯 Next Steps

1. **Apply for API Access** - Start the approval process now (takes a few days)
2. **Set Up Database** - Create the new tables while waiting for approval
3. **Install Dependencies** - Add FIT file parser to your project
4. **Build Webhook Handler** - Implement the webhook endpoint
5. **Test with Samples** - Use Garmin's sample data in evaluation environment
6. **Go Live** - Register webhooks and start receiving real data

---

## 📚 Resources

- **Garmin Developer Portal:** https://developerportal.garmin.com/
- **Activity API Docs:** https://developer.garmin.com/gc-developer-program/activity-api/
- **Health API Docs:** https://developer.garmin.com/gc-developer-program/health-api/
- **FIT SDK:** https://developer.garmin.com/fit/overview/
- **fit-file-parser npm:** https://www.npmjs.com/package/fit-file-parser
- **Support Email:** connect-support@developer.garmin.com

---

## 💡 Tips & Best Practices

1. **Webhook Reliability**
   - Always respond to webhooks within 5 seconds
   - Process data asynchronously after responding
   - Implement retry logic for failed processing
   - Log all webhook events for debugging

2. **Data Privacy**
   - Get explicit user consent before accessing data
   - Clearly explain what data you'll access
   - Provide easy disconnect/delete options
   - Follow GDPR/CCPA requirements

3. **Performance**
   - Parse FIT files asynchronously (CPU intensive)
   - Batch insert track points (1000 at a time)
   - Use database indexes for queries
   - Cache health data summaries

4. **Error Handling**
   - Handle missing sensors gracefully (not all bikes have power meters)
   - Deal with GPS dropouts in tunnels/indoors
   - Validate data ranges (HR < 220, power < 2000W, etc.)
   - Log errors but don't fail entire import

5. **Testing**
   - Use Garmin's sample data before going live
   - Test with activities missing certain sensors
   - Verify duplicate detection works
   - Check timezone handling

---

**Status:** Ready for implementation once Garmin API access is approved! 🚀
