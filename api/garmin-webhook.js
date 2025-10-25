// Vercel API Route: Garmin Activity Webhook Handler
// Receives push notifications when users sync Garmin devices
// Documentation: https://developer.garmin.com/gc-developer-program/activity-api/

import { createClient } from '@supabase/supabase-js';
import FitParser from 'fit-file-parser';
import crypto from 'crypto';

// Initialize Supabase (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Security Configuration
const WEBHOOK_SECRET = process.env.GARMIN_WEBHOOK_SECRET; // Optional: for signature verification
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per minute per IP
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds max processing time

// In-memory rate limiting (use Redis for production)
const rateLimitStore = new Map();

// CORS configuration
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return ['https://www.tribos.studio', 'https://cycling-ai-app-v2.vercel.app'];
  }
  return ['http://localhost:3000'];
};

const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export default async function handler(req, res) {
  // Handle CORS - Allow both browser origins and Garmin servers
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // For browser requests (OPTIONS preflight), require specific origin
  // For webhook POST/GET from Garmin servers, allow any origin (no Origin header)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && req.method !== 'OPTIONS') {
    // No origin header = server-to-server request from Garmin
    // Set permissive headers to allow the request
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  res.setHeader('Access-Control-Allow-Credentials', corsHeaders['Access-Control-Allow-Credentials']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Security checks for webhook requests
  if (req.method === 'POST') {
    // 1. Rate limiting
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.allowed) {
      console.warn('🚫 Rate limit exceeded:', {
        ip: getClientIP(req),
        requestsInWindow: rateLimitResult.count
      });
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      });
    }

    // 2. Payload size check (max 10MB)
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) {
      console.warn('🚫 Payload too large:', contentLength);
      return res.status(413).json({ error: 'Payload too large' });
    }

    // 3. Content-Type validation
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.includes('application/json')) {
      console.warn('🚫 Invalid content-type:', contentType);
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }

    // 4. Webhook signature verification (if secret is configured)
    if (WEBHOOK_SECRET) {
      const signatureValid = verifyWebhookSignature(req);
      if (!signatureValid) {
        console.warn('🚫 Invalid webhook signature:', {
          ip: getClientIP(req),
          userAgent: req.headers['user-agent']
        });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    return handleWebhook(req, res);
  }

  if (req.method === 'GET') {
    return handleHealthCheck(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
}

/**
 * Rate limiting check
 */
function checkRateLimit(req) {
  const ip = getClientIP(req);
  const now = Date.now();

  // Clean up old entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }

  // Get or create rate limit data for this IP
  let limitData = rateLimitStore.get(ip);
  if (!limitData || now - limitData.windowStart > RATE_LIMIT_WINDOW_MS) {
    limitData = {
      windowStart: now,
      count: 0
    };
  }

  limitData.count++;
  rateLimitStore.set(ip, limitData);

  return {
    allowed: limitData.count <= RATE_LIMIT_MAX_REQUESTS,
    count: limitData.count
  };
}

/**
 * Verify webhook signature (HMAC-SHA256)
 * Garmin may send signature in header like: X-Garmin-Signature
 */
function verifyWebhookSignature(req) {
  const signature = req.headers['x-garmin-signature'] ||
                   req.headers['x-webhook-signature'];

  if (!signature) {
    console.warn('⚠️ No signature header found');
    return false;
  }

  try {
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Health check endpoint for Garmin webhook verification
 */
async function handleHealthCheck(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'garmin-webhook-handler',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle incoming webhook from Garmin
 */
async function handleWebhook(req, res) {
  try {
    const webhookData = req.body;
    const clientIP = getClientIP(req);

    console.log('📥 Garmin webhook received:', {
      eventType: webhookData.eventType,
      userId: webhookData.userId,
      activityId: webhookData.activityId,
      ip: clientIP,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // Validate webhook payload structure
    if (!webhookData || typeof webhookData !== 'object') {
      console.warn('🚫 Invalid payload structure:', typeof webhookData);
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    // Required fields validation
    if (!webhookData.userId) {
      console.warn('🚫 Missing userId in webhook payload');
      return res.status(400).json({ error: 'Missing userId in webhook payload' });
    }

    // Validate data types
    if (webhookData.activityId && typeof webhookData.activityId !== 'string') {
      console.warn('🚫 Invalid activityId type:', typeof webhookData.activityId);
      return res.status(400).json({ error: 'Invalid activityId type' });
    }

    // Check for duplicate webhook (idempotency)
    if (webhookData.activityId) {
      const { data: existingEvent } = await supabase
        .from('garmin_webhook_events')
        .select('id')
        .eq('activity_id', webhookData.activityId)
        .eq('garmin_user_id', webhookData.userId)
        .single();

      if (existingEvent) {
        console.log('ℹ️ Duplicate webhook ignored:', webhookData.activityId);
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed',
          eventId: existingEvent.id
        });
      }
    }

    // Store webhook event for async processing
    const { data: event, error: eventError } = await supabase
      .from('garmin_webhook_events')
      .insert({
        event_type: webhookData.eventType || 'activity',
        garmin_user_id: webhookData.userId,
        activity_id: webhookData.activityId,
        file_url: webhookData.fileUrl || webhookData.activityFileUrl,
        file_type: webhookData.fileType || 'FIT',
        upload_timestamp: webhookData.uploadTimestamp || webhookData.startTimeInSeconds
          ? new Date(webhookData.startTimeInSeconds * 1000).toISOString()
          : null,
        payload: webhookData,
        processed: false
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error storing webhook event:', eventError);
      throw eventError;
    }

    console.log('✅ Webhook event stored:', event.id);

    // Respond quickly to Garmin (within 5 seconds)
    res.status(200).json({
      success: true,
      eventId: event.id,
      message: 'Webhook received and queued for processing'
    });

    // Process webhook asynchronously (don't await - fire and forget)
    processWebhookEvent(event.id).catch(err => {
      console.error('❌ Webhook processing error:', err);
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Process webhook event asynchronously
 */
async function processWebhookEvent(eventId) {
  try {
    console.log('🔄 Processing webhook event:', eventId);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('garmin_webhook_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;
    if (!event || event.processed) {
      console.log('Event already processed or not found:', eventId);
      return;
    }

    // Find user by Garmin user ID
    const { data: integration, error: integrationError } = await supabase
      .from('bike_computer_integrations')
      .select('id, user_id, access_token, refresh_token, provider_user_id')
      .eq('provider', 'garmin')
      .eq('provider_user_id', event.garmin_user_id)
      .single();

    if (integrationError || !integration) {
      console.log('No integration found for Garmin user:', event.garmin_user_id);

      // Mark as processed with error
      await supabase
        .from('garmin_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_error: 'No integration found for this Garmin user'
        })
        .eq('id', eventId);

      return;
    }

    // Update event with user/integration IDs
    await supabase
      .from('garmin_webhook_events')
      .update({
        user_id: integration.user_id,
        integration_id: integration.id
      })
      .eq('id', eventId);

    // Check if activity already imported
    if (event.activity_id) {
      const { data: existing } = await supabase
        .from('routes')
        .select('id')
        .eq('garmin_id', event.activity_id)
        .eq('user_id', integration.user_id)
        .single();

      if (existing) {
        console.log('Activity already imported:', event.activity_id);

        await supabase
          .from('garmin_webhook_events')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            process_error: 'Activity already imported',
            route_id: existing.id
          })
          .eq('id', eventId);

        return;
      }
    }

    // Download and process FIT file
    if (event.file_url) {
      await downloadAndProcessFitFile(event, integration);
    } else {
      console.log('No file URL in webhook event');

      await supabase
        .from('garmin_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_error: 'No file URL provided in webhook'
        })
        .eq('id', eventId);
    }

  } catch (error) {
    console.error('Processing error for event', eventId, ':', error);

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

/**
 * Download FIT file from Garmin and process it
 */
async function downloadAndProcessFitFile(event, integration) {
  try {
    console.log('📥 Downloading FIT file:', event.file_url);

    // Garmin OAuth 2.0 requires Bearer token for file downloads
    // Download FIT file
    const response = await fetch(event.file_url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download FIT file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('✅ FIT file downloaded, size:', buffer.length, 'bytes');

    // Parse FIT file
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      mode: 'cascade'
    });

    const fitData = await new Promise((resolve, reject) => {
      fitParser.parse(buffer, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });

    console.log('✅ FIT file parsed successfully');

    // Process activity data
    await processActivityData(event, integration, fitData);

  } catch (error) {
    console.error('FIT file download/parse error:', error);
    throw error;
  }
}

/**
 * Process parsed FIT data and store in database
 */
async function processActivityData(event, integration, fitData) {
  try {
    const activity = fitData.activity;
    const session = activity.sessions?.[0];
    const records = activity.records || [];

    if (!session) {
      throw new Error('No session data in FIT file');
    }

    console.log('📊 Processing activity:', {
      sport: session.sport,
      distance: session.total_distance,
      duration: session.total_elapsed_time,
      points: records.length
    });

    // Check if cycling activity
    const sport = session.sport?.toLowerCase() || '';
    const isCycling = sport.includes('cycling') || sport.includes('biking') || sport === 'cycling';

    if (!isCycling) {
      console.log('Skipping non-cycling activity:', session.sport);

      await supabase
        .from('garmin_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          process_error: `Non-cycling activity: ${session.sport}`
        })
        .eq('id', event.id);

      return;
    }

    // Determine activity type
    let activityType = 'road_biking';
    if (sport.includes('mountain')) activityType = 'mountain_biking';
    else if (sport.includes('gravel')) activityType = 'gravel_cycling';
    else if (sport.includes('indoor')) activityType = 'indoor_cycling';

    // Calculate polyline from GPS data
    const gpsPoints = records.filter(r => r.position_lat && r.position_long);
    const polyline = encodePolyline(gpsPoints);

    // Create route
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert({
        user_id: integration.user_id,
        name: `Garmin ${activityType.replace('_', ' ')} - ${new Date().toLocaleDateString()}`,
        description: `Imported from Garmin Connect`,
        distance: session.total_distance ? session.total_distance / 1000 : null,
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
        polyline: polyline,
        garmin_id: event.activity_id,
        garmin_url: event.activity_id ? `https://connect.garmin.com/modern/activity/${event.activity_id}` : null,
        has_gps_data: gpsPoints.length > 0,
        has_heart_rate_data: records.some(r => r.heart_rate),
        has_power_data: records.some(r => r.power),
        has_cadence_data: records.some(r => r.cadence),
        activity_type: activityType,
        started_at: session.start_time || new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (routeError) throw routeError;

    console.log('✅ Route created:', route.id);

    // Store track points (GPS data)
    if (gpsPoints.length > 0) {
      const trackPoints = gpsPoints.map((r, index) => ({
        route_id: route.id,
        timestamp: r.timestamp || new Date().toISOString(),
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

      // Insert in batches of 1000
      for (let i = 0; i < trackPoints.length; i += 1000) {
        const batch = trackPoints.slice(i, i + 1000);
        await supabase.from('track_points').insert(batch);
      }

      console.log('✅ Track points stored:', trackPoints.length);
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
        route_id: route.id
      })
      .eq('id', event.id);

    console.log('🎉 Activity imported successfully:', route.id);

  } catch (error) {
    console.error('Activity processing error:', error);
    throw error;
  }
}

/**
 * Encode GPS points to polyline
 */
function encodePolyline(points) {
  if (!points || points.length === 0) return null;

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.position_lat * 1e5);
    const lng = Math.round(point.position_long * 1e5);

    encoded += encodeNumber(lat - prevLat);
    encoded += encodeNumber(lng - prevLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

function encodeNumber(num) {
  let encoded = '';
  let value = num < 0 ? ~(num << 1) : num << 1;

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}
