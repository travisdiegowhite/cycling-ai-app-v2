// Vercel API Route: Garmin Activity Sync
// Fetches activities from Garmin Connect and imports them to the database
// Documentation: https://developer.garmin.com/gc-developer-program/overview/

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';

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

    // Get access token from database
    const { data: integration, error: tokenError } = await supabase
      .from('bike_computer_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'garmin')
      .single();

    if (tokenError || !integration) {
      return res.status(404).json({ error: 'Garmin not connected' });
    }

    if (!integration.sync_enabled) {
      return res.status(400).json({ error: 'Sync is disabled' });
    }

    // Calculate date range (default to last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log('🔄 Fetching activities from Garmin:', {
      userId,
      hasAccessToken: !!integration.access_token,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

    // Fetch activities from Garmin
    const activities = await fetchGarminActivities(
      integration.access_token,
      { startDate: start, endDate: end }
    );

    console.log(`✅ Fetched ${activities.length} activities from Garmin`);

    // Filter for cycling activities
    const cyclingActivities = activities.filter(activity =>
      activity.activityType?.typeKey === 'cycling' ||
      activity.activityType?.typeKey === 'road_biking' ||
      activity.activityType?.typeKey === 'mountain_biking' ||
      activity.activityType?.typeKey === 'gravel_cycling' ||
      activity.activityType?.typeKey === 'indoor_cycling'
    );

    console.log(`Found ${cyclingActivities.length} cycling activities`);

    // Get existing Garmin activity IDs to avoid duplicates
    const { data: existingRoutes } = await supabase
      .from('routes')
      .select('garmin_id')
      .eq('user_id', userId)
      .not('garmin_id', 'is', null);

    const existingGarminIds = new Set(
      (existingRoutes || []).map(r => r.garmin_id.toString())
    );

    // Import new activities
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const activity of cyclingActivities) {
      try {
        // Skip if already imported
        if (existingGarminIds.has(activity.activityId.toString())) {
          console.log(`Skipping existing activity ${activity.activityId}`);
          skipped++;
          continue;
        }

        // Convert Garmin activity to our route format
        const route = convertGarminActivity(activity, userId);

        if (route) {
          // Insert route
          const { data: insertedRoute, error: routeError } = await supabase
            .from('routes')
            .insert([route])
            .select('id')
            .single();

          if (routeError) {
            console.error('Error inserting route:', routeError);
            errors.push({
              activityId: activity.activityId,
              error: routeError.message
            });
            continue;
          }

          // Fetch and insert track points if available
          if (activity.hasSummaryPolyline && insertedRoute?.id) {
            try {
              const trackPoints = await fetchGarminTrackPoints(
                activity.activityId,
                integration.access_token
              );

              if (trackPoints && trackPoints.length > 0) {
                const trackPointsWithRouteId = trackPoints.map((point, index) => ({
                  route_id: insertedRoute.id,
                  latitude: point.latitude,
                  longitude: point.longitude,
                  elevation: point.elevation || null,
                  time_seconds: point.time || index,
                  distance_m: point.distance || null,
                  point_index: index
                }));

                // Insert track points in batches
                const batchSize = 1000;
                for (let i = 0; i < trackPointsWithRouteId.length; i += batchSize) {
                  const batch = trackPointsWithRouteId.slice(i, i + batchSize);
                  const { error: trackError } = await supabase
                    .from('track_points')
                    .insert(batch);

                  if (trackError) {
                    console.error('Error inserting track points:', trackError);
                  }
                }

                console.log(`Imported ${trackPointsWithRouteId.length} track points for activity ${activity.activityId}`);
              }
            } catch (trackError) {
              console.error('Error fetching track points:', trackError);
              // Continue anyway - route is still imported
            }
          }

          imported++;
          console.log(`Successfully imported activity ${activity.activityId}`);
        }

      } catch (error) {
        console.error(`Error processing activity ${activity.activityId}:`, error);
        errors.push({
          activityId: activity.activityId,
          error: error.message
        });
      }
    }

    // Record sync history
    const { error: historyError } = await supabase
      .from('bike_computer_sync_history')
      .insert([{
        user_id: userId,
        provider: 'garmin',
        activities_fetched: cyclingActivities.length,
        activities_imported: imported,
        activities_skipped: skipped,
        sync_errors: errors.length > 0 ? errors : null,
        synced_at: new Date().toISOString()
      }]);

    if (historyError) {
      console.error('Error recording sync history:', historyError);
    }

    // Update last sync time
    await supabase
      .from('bike_computer_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'garmin');

    return res.status(200).json({
      success: true,
      imported,
      skipped,
      total: cyclingActivities.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Garmin sync error:', {
      message: error.message,
      stack: error.stack,
      userId: req.body?.userId
    });

    // Record sync error
    try {
      await supabase
        .from('bike_computer_integrations')
        .update({
          sync_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.body.userId)
        .eq('provider', 'garmin');
    } catch (dbError) {
      console.error('Error recording sync error:', dbError);
    }

    return res.status(500).json({
      error: 'Sync failed',
      message: error.message,
      details: error.stack
    });
  }
}

// Fetch activities from Garmin API using OAuth 2.0 Bearer token
async function fetchGarminActivities(accessToken, options = {}) {
  const { startDate, endDate } = options;

  const url = `${GARMIN_API_BASE}/activities`;
  const params = new URLSearchParams({
    uploadStartTimeInSeconds: Math.floor(startDate.getTime() / 1000).toString(),
    uploadEndTimeInSeconds: Math.floor(endDate.getTime() / 1000).toString()
  });

  const fullUrl = `${url}?${params.toString()}`;

  console.log('📡 Calling Garmin API:', {
    url: fullUrl,
    hasAuth: !!accessToken
  });

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  console.log('📡 Garmin API response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Garmin API error response:', error);
    throw new Error(`Failed to fetch Garmin activities (${response.status}): ${error}`);
  }

  const data = await response.json();
  console.log('📊 Garmin API response data:', {
    isArray: Array.isArray(data),
    count: Array.isArray(data) ? data.length : 'not an array',
    keys: data ? Object.keys(data) : 'null'
  });

  return data || [];
}

// Convert Garmin activity to our route format
function convertGarminActivity(activity, userId) {
  try {
    const route = {
      user_id: userId,
      name: activity.activityName || `Garmin Ride ${new Date(activity.startTimeGMT).toLocaleDateString()}`,
      description: activity.description || null,
      activity_type: 'ride',

      // Garmin integration
      garmin_id: activity.activityId.toString(),
      imported_from: 'garmin',

      // Core metrics
      distance_km: activity.distance ? activity.distance / 1000 : 0,
      duration_seconds: activity.duration || activity.movingDuration || 0,
      elevation_gain_m: activity.elevationGain || 0,
      elevation_loss_m: activity.elevationLoss || 0,

      // Performance metrics
      average_speed: activity.averageSpeed ? activity.averageSpeed * 3.6 : null, // m/s to km/h
      max_speed: activity.maxSpeed ? activity.maxSpeed * 3.6 : null, // m/s to km/h
      average_pace: null,

      // Heart rate data
      average_heartrate: activity.averageHR || null,
      max_heartrate: activity.maxHR || null,

      // Power data
      average_watts: activity.avgPower || null,
      max_watts: activity.maxPower || null,
      kilojoules: activity.calories ? activity.calories * 4.184 : null, // Rough conversion from calories

      // Location data (if available)
      start_latitude: activity.startLatitude || null,
      start_longitude: activity.startLongitude || null,

      // Data availability flags
      has_gps_data: !!activity.hasSummaryPolyline,
      track_points_count: 0, // Will be updated when track points are inserted
      has_heart_rate_data: !!activity.averageHR,
      has_power_data: !!activity.avgPower,

      // Timing
      recorded_at: activity.startTimeGMT || activity.startTimeLocal,
      uploaded_at: activity.createDate || activity.startTimeGMT,

      // File info
      filename: `garmin_${activity.activityId}.json`,

      // External links
      garmin_url: `https://connect.garmin.com/modern/activity/${activity.activityId}`
    };

    return route;

  } catch (error) {
    console.error('Error converting Garmin activity:', error);
    throw error;
  }
}

// Fetch GPS track points for an activity using OAuth 2.0 Bearer token
async function fetchGarminTrackPoints(activityId, accessToken) {
  try {
    const url = `${GARMIN_API_BASE}/activityDetails/${activityId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity details: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract track points from Garmin's format
    if (data.geoPolylineDTO && data.geoPolylineDTO.polyline) {
      // Decode Garmin polyline (similar to Google polyline encoding)
      const trackPoints = decodeGarminPolyline(data.geoPolylineDTO.polyline);
      return trackPoints;
    }

    // Alternative: use samples if available
    if (data.samples) {
      const trackPoints = data.samples.map((sample, index) => ({
        latitude: sample.latitudeDegrees,
        longitude: sample.longitudeDegrees,
        elevation: sample.elevationMeters,
        time: sample.timestampSeconds,
        distance: sample.distanceMeters,
        point_index: index
      })).filter(p => p.latitude && p.longitude);

      return trackPoints;
    }

    console.log('No track point data available for activity:', activityId);
    return [];

  } catch (error) {
    console.error('Error fetching Garmin track points:', error);
    return [];
  }
}

// Decode Garmin polyline (Google Maps polyline encoding)
function decodeGarminPolyline(encoded) {
  if (!encoded) return [];

  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return points;
}
