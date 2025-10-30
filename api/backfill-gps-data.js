// Vercel API Route: Backfill GPS Data for Existing Strava Routes
// Re-imports GPS track points for routes that were imported before GPS support

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

/**
 * Decode Google Polyline format
 */
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'UserId required' });
    }

    console.log('🔄 Starting GPS data backfill for user:', userId);

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

    // Find all Strava routes that claim to have GPS data but have no track points
    const { data: routesNeedingGPS, error: routesError } = await supabase
      .from('routes')
      .select('id, strava_id, name')
      .eq('user_id', userId)
      .eq('imported_from', 'strava')
      .eq('has_gps_data', true)
      .is('track_points_count', null);

    if (routesError) {
      console.error('Failed to fetch routes:', routesError);
      return res.status(500).json({ error: 'Failed to fetch routes' });
    }

    console.log(`📊 Found ${routesNeedingGPS.length} routes needing GPS data`);

    // Strava rate limit: 100 requests per 15 minutes, 1000 per day
    // Process in batches of 50 with proper delays
    const BATCH_SIZE = 50;
    const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds (30 requests/min = well under 100/15min)

    let updated = 0;
    let failed = 0;
    let rateLimited = false;
    const errorDetails = [];

    // Process only first batch to avoid hitting rate limits
    const routesToProcess = routesNeedingGPS.slice(0, BATCH_SIZE);

    if (routesNeedingGPS.length > BATCH_SIZE) {
      console.log(`⚠️ Processing first ${BATCH_SIZE} routes to avoid rate limits. Run again later for remaining ${routesNeedingGPS.length - BATCH_SIZE} routes.`);
    }

    for (const route of routesToProcess) {
      try {
        if (!route.strava_id) {
          console.error(`❌ Route ${route.id} has no strava_id`);
          errorDetails.push({ routeId: route.id, routeName: route.name, error: 'No strava_id' });
          failed++;
          continue;
        }

        // Fetch activity details from Strava
        const response = await fetch(`${STRAVA_API_BASE}/activities/${route.strava_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          console.error(`❌ Failed to fetch Strava activity ${route.strava_id}: ${errorMsg}`);
          errorDetails.push({ routeId: route.id, routeName: route.name, stravaId: route.strava_id, error: errorMsg });

          // If rate limited, stop processing immediately
          if (response.status === 429) {
            rateLimited = true;
            console.error('🚫 Strava rate limit reached. Stopping backfill. Wait 15 minutes and try again.');
            failed++;
            break; // Stop processing more routes
          }

          failed++;
          continue;
        }

        const activity = await response.json();

        if (activity.map?.polyline) {
          // Decode polyline
          const coordinates = decodePolyline(activity.map.polyline);

          if (coordinates.length > 0) {
            // Prepare track points
            const trackPoints = coordinates.map((coord, index) => ({
              route_id: route.id,
              point_index: index,
              latitude: coord[0],
              longitude: coord[1],
              elevation: null,
              time: null,
              distance: null
            }));

            // Insert track points
            const { error: trackPointsError } = await supabase
              .from('track_points')
              .insert(trackPoints);

            if (trackPointsError) {
              console.error(`⚠️ Failed to insert track points for route ${route.id}:`, trackPointsError);
              failed++;
              continue;
            }

            // Update route with coordinates
            const firstPoint = coordinates[0];
            const lastPoint = coordinates[coordinates.length - 1];

            await supabase
              .from('routes')
              .update({
                start_latitude: firstPoint[0],
                start_longitude: firstPoint[1],
                end_latitude: lastPoint[0],
                end_longitude: lastPoint[1],
                track_points_count: coordinates.length
              })
              .eq('id', route.id);

            console.log(`✅ Backfilled ${coordinates.length} GPS points for route ${route.id} (${route.name})`);
            updated++;
          }
        } else {
          // Route has no GPS data - update flag
          await supabase
            .from('routes')
            .update({ has_gps_data: false })
            .eq('id', route.id);

          console.log(`⚠️ Route ${route.id} has no GPS data available`);
          failed++;
        }

        // Rate limiting - Strava allows 100 requests per 15 minutes
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

      } catch (error) {
        console.error(`❌ Error processing route ${route.id}:`, error);
        errorDetails.push({ routeId: route.id, routeName: route.name, error: error.message });
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      updated,
      failed,
      total: routesNeedingGPS.length,
      processed: routesToProcess.length,
      remaining: routesNeedingGPS.length - routesToProcess.length,
      rateLimited,
      errorSamples: errorDetails.slice(0, 10), // Return first 10 errors for debugging
      message: rateLimited
        ? '⚠️ Rate limited by Strava. Wait 15 minutes before trying again.'
        : routesNeedingGPS.length > BATCH_SIZE
        ? `✅ Processed ${routesToProcess.length} routes. Run again to process remaining ${routesNeedingGPS.length - BATCH_SIZE} routes.`
        : null
    });

  } catch (error) {
    console.error('GPS backfill error:', error);
    return res.status(500).json({
      error: 'Backfill failed',
      message: error.message
    });
  }
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
