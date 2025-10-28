// Vercel API Route: Strava Bulk Import
// Imports historical activities from Strava for new users
// This is the "Step 1" of the hybrid import strategy (Strava history + Garmin auto-sync)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return ['https://www.tribos.studio', 'https://cycling-ai-app-v2.vercel.app'];
  }
  return ['http://localhost:3000'];
};

const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export default async function handler(req, res) {
  // Handle CORS
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  res.setHeader('Access-Control-Allow-Credentials', corsHeaders['Access-Control-Allow-Credentials']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startDate, endDate } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'UserId required' });
    }

    // Get Strava access token
    const { data: stravaToken, error: tokenError } = await supabase
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (tokenError || !stravaToken) {
      return res.status(404).json({ error: 'Strava not connected' });
    }

    // Check if token needs refresh
    let accessToken = stravaToken.access_token;
    if (new Date(stravaToken.expires_at) <= new Date()) {
      console.log('🔄 Refreshing Strava token...');
      accessToken = await refreshStravaToken(userId, stravaToken.refresh_token);
    }

    // Calculate timestamp for "after" parameter
    const afterTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : null;
    const beforeTimestamp = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : null;

    console.log('📥 Starting Strava bulk import:', {
      userId,
      startDate,
      endDate,
      afterTimestamp,
      beforeTimestamp
    });

    // Fetch all activities from Strava (paginated)
    const allActivities = await fetchAllStravaActivities(accessToken, afterTimestamp, beforeTimestamp);

    console.log(`📊 Found ${allActivities.length} activities from Strava`);

    // Filter for cycling activities only
    const cyclingActivities = allActivities.filter(activity =>
      activity.type === 'Ride' ||
      activity.type === 'VirtualRide' ||
      activity.type === 'EBikeRide' ||
      activity.type === 'GravelRide' ||
      activity.type === 'MountainBikeRide'
    );

    console.log(`🚴 ${cyclingActivities.length} cycling activities to import`);

    // Import each activity
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = []; // Capture first 5 errors for debugging

    for (const activity of cyclingActivities) {
      try {
        const result = await importStravaActivity(userId, activity, accessToken);
        if (result === 'imported') imported++;
        else if (result === 'skipped') skipped++;
      } catch (error) {
        console.error(`Error importing activity ${activity.id}:`, error);
        errors++;

        // Capture first 5 errors with details
        if (errorDetails.length < 5) {
          errorDetails.push({
            activityId: activity.id,
            activityName: activity.name,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint
          });
        }
      }
    }

    console.log('✅ Bulk import complete:', { imported, skipped, errors, errorDetails });

    return res.status(200).json({
      success: true,
      imported,
      skipped,
      errors,
      total: cyclingActivities.length,
      message: `Imported ${imported} activities, ${skipped} duplicates skipped, ${errors} errors`,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    });

  } catch (error) {
    console.error('Strava bulk import error:', error);
    return res.status(500).json({
      error: 'Bulk import failed',
      message: error.message
    });
  }
}

/**
 * Fetch all activities from Strava with pagination
 */
async function fetchAllStravaActivities(accessToken, afterTimestamp, beforeTimestamp) {
  const allActivities = [];
  let page = 1;
  const perPage = 200; // Strava max

  while (true) {
    const params = new URLSearchParams({
      per_page: perPage.toString(),
      page: page.toString()
    });

    if (afterTimestamp) {
      params.append('after', afterTimestamp.toString());
    }
    if (beforeTimestamp) {
      params.append('before', beforeTimestamp.toString());
    }

    console.log(`📡 Fetching Strava activities page ${page}...`);

    const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Strava API error: ${response.status}`);
    }

    const activities = await response.json();

    if (activities.length === 0) {
      break; // No more activities
    }

    allActivities.push(...activities);

    if (activities.length < perPage) {
      break; // Last page
    }

    page++;

    // Rate limiting - Strava allows 100 requests per 15 minutes, 1000 per day
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between pages
  }

  return allActivities;
}

/**
 * Import a single Strava activity into routes table
 */
async function importStravaActivity(userId, activity, accessToken) {
  // Check for duplicates
  const { data: existing } = await supabase
    .from('routes')
    .select('id')
    .eq('strava_id', activity.id.toString())
    .single();

  if (existing) {
    console.log(`⏭️ Activity ${activity.id} already imported`);
    return 'skipped';
  }

  // Check for near-duplicate based on time and distance
  const startTime = new Date(activity.start_date);
  const fiveMinutesAgo = new Date(startTime.getTime() - 5 * 60 * 1000);
  const fiveMinutesLater = new Date(startTime.getTime() + 5 * 60 * 1000);
  const distanceKm = activity.distance / 1000; // meters to km

  const { data: nearDuplicates } = await supabase
    .from('routes')
    .select('id')
    .gte('recorded_at', fiveMinutesAgo.toISOString())
    .lte('recorded_at', fiveMinutesLater.toISOString())
    .gte('distance_km', distanceKm - 0.1)
    .lte('distance_km', distanceKm + 0.1)
    .limit(1);

  if (nearDuplicates && nearDuplicates.length > 0) {
    console.log(`⏭️ Near-duplicate found for activity ${activity.id} (time+distance match)`);
    return 'skipped';
  }

  // Determine activity type
  let activityType = 'road_biking';
  if (activity.type === 'MountainBikeRide') activityType = 'mountain_biking';
  else if (activity.type === 'GravelRide') activityType = 'gravel_cycling';
  else if (activity.type === 'VirtualRide') activityType = 'indoor_cycling';
  else if (activity.type === 'EBikeRide') activityType = 'road_biking'; // Treat as road for now

  // Create route
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .insert({
      user_id: userId,
      name: activity.name || `Strava ${activityType.replace('_', ' ')}`,
      description: 'Imported from Strava',
      distance_km: activity.distance ? activity.distance / 1000 : null, // meters to km
      elevation_gain_m: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null,
      duration_seconds: activity.moving_time ? Math.round(activity.moving_time) : null,
      average_speed: activity.average_speed ? activity.average_speed * 3.6 : null, // m/s to km/h
      max_speed: activity.max_speed ? activity.max_speed * 3.6 : null,
      average_heartrate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      max_heartrate: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
      average_watts: activity.average_watts ? Math.round(activity.average_watts) : null,
      max_watts: activity.max_watts ? Math.round(activity.max_watts) : null,
      kilojoules: activity.kilojoules ? Math.round(activity.kilojoules) : null,
      strava_id: activity.id.toString(),
      strava_url: `https://www.strava.com/activities/${activity.id}`,
      has_gps_data: !!activity.map?.summary_polyline,
      has_heart_rate_data: !!activity.average_heartrate,
      has_power_data: !!activity.average_watts,
      has_cadence_data: !!activity.average_cadence,
      activity_type: activityType,
      recorded_at: activity.start_date,
      imported_from: 'strava',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (routeError) {
    console.error(`❌ Error creating route for activity ${activity.id}:`, {
      error: routeError,
      code: routeError.code,
      message: routeError.message,
      details: routeError.details,
      hint: routeError.hint,
      activityData: {
        id: activity.id,
        name: activity.name,
        distance: activity.distance,
        start_date: activity.start_date
      }
    });
    throw routeError;
  }

  console.log(`✅ Imported activity ${activity.id} as route ${route.id}`);

  return 'imported';
}

/**
 * Refresh Strava access token
 */
async function refreshStravaToken(userId, refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Strava token');
  }

  const data = await response.json();

  // Update token in database
  await supabase
    .from('strava_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(data.expires_at * 1000).toISOString()
    })
    .eq('user_id', userId);

  return data.access_token;
}
