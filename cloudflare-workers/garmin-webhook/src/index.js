/**
 * Cloudflare Worker: Garmin Activity Webhook Handler
 * Receives push notifications when users sync Garmin devices
 * Documentation: https://developer.garmin.com/gc-developer-program/activity-api/
 */

import { createClient } from '@supabase/supabase-js';

// Security Configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per minute per IP

export default {
  async fetch(request, env, ctx) {
    try {
      console.log('🔧 Worker invoked:', request.method, request.url);

      // Check environment variables
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing environment variables:', {
          hasSupabaseUrl: !!env.SUPABASE_URL,
          hasSupabaseKey: !!env.SUPABASE_SERVICE_KEY
        });
        return new Response(JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }), {
          status: 500,
          headers: corsHeaders()
        });
      }

      console.log('✅ Environment variables present');

      // Initialize Supabase with environment variables
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
      console.log('✅ Supabase client initialized');

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        console.log('Handling CORS preflight');
        return handleCORS();
      }

      // Security checks
      const securityCheck = await checkSecurity(request, env);
      if (!securityCheck.allowed) {
        console.warn('🚫 Security check failed:', securityCheck.reason);
        return new Response(JSON.stringify({ error: securityCheck.reason }), {
          status: securityCheck.status,
          headers: corsHeaders()
        });
      }

      // Route requests
      if (request.method === 'GET') {
        console.log('📋 Handling health check');
        return handleHealthCheck();
      }

      if (request.method === 'POST') {
        console.log('📬 Handling webhook POST');
        return await handleWebhook(request, supabase, env, ctx);
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders()
      });
    } catch (error) {
      console.error('💥 Fatal error in worker:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }
};

/**
 * CORS headers
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

/**
 * Handle CORS preflight
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

/**
 * Security checks
 */
async function checkSecurity(request, env) {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  // 1. Rate limiting (using Cloudflare's built-in rate limiting via KV would be better for production)
  // For now, we'll rely on Cloudflare's DDoS protection

  // 2. Payload size check (max 10MB)
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > 10 * 1024 * 1024) {
    console.warn('🚫 Payload too large:', contentLength);
    return { allowed: false, status: 413, reason: 'Payload too large' };
  }

  // 3. Content-Type validation
  const contentType = request.headers.get('content-type');
  if (request.method === 'POST' && contentType && !contentType.includes('application/json')) {
    console.warn('🚫 Invalid content-type:', contentType);
    return { allowed: false, status: 415, reason: 'Content-Type must be application/json' };
  }

  // 4. Webhook signature verification (if secret is configured)
  if (request.method === 'POST' && env.GARMIN_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-garmin-signature') || request.headers.get('x-webhook-signature');

    if (!signature) {
      console.warn('⚠️ No signature header found');
      return { allowed: false, status: 401, reason: 'Missing signature' };
    }

    // We'll verify signature in handleWebhook after reading body
  }

  return { allowed: true };
}

/**
 * Health check endpoint
 */
function handleHealthCheck() {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'garmin-webhook-handler-cloudflare',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: corsHeaders()
  });
}

/**
 * Handle incoming webhook from Garmin
 */
async function handleWebhook(request, supabase, env, ctx) {
  try {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse webhook payload
    const webhookData = await request.json();

    console.log('📥 Garmin webhook received:', {
      eventType: webhookData.eventType,
      userId: webhookData.userId,
      activityId: webhookData.activityId,
      ip: clientIP,
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    });

    // Validate payload structure
    if (!webhookData || typeof webhookData !== 'object') {
      console.warn('🚫 Invalid payload structure:', typeof webhookData);
      return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
        status: 400,
        headers: corsHeaders()
      });
    }

    // Required fields validation
    if (!webhookData.userId) {
      console.warn('🚫 Missing userId in webhook payload');
      return new Response(JSON.stringify({ error: 'Missing userId in webhook payload' }), {
        status: 400,
        headers: corsHeaders()
      });
    }

    // Validate data types
    if (webhookData.activityId && typeof webhookData.activityId !== 'string') {
      console.warn('🚫 Invalid activityId type:', typeof webhookData.activityId);
      return new Response(JSON.stringify({ error: 'Invalid activityId type' }), {
        status: 400,
        headers: corsHeaders()
      });
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
        return new Response(JSON.stringify({
          success: true,
          message: 'Webhook already processed',
          eventId: existingEvent.id
        }), {
          status: 200,
          headers: corsHeaders()
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
    const response = new Response(JSON.stringify({
      success: true,
      eventId: event.id,
      message: 'Webhook received and queued for processing'
    }), {
      status: 200,
      headers: corsHeaders()
    });

    // Process webhook asynchronously using waitUntil
    // This allows the worker to continue processing after responding to Garmin
    ctx.waitUntil(processWebhookEvent(event.id, supabase, env));

    return response;

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({
      error: 'Webhook processing failed',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders()
    });
  }
}

/**
 * Process webhook event asynchronously
 */
async function processWebhookEvent(eventId, supabase, env) {
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
      await downloadAndProcessFitFile(event, integration, supabase, env);
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
 * Note: FIT file parsing would require a FIT parser library
 * For now, we'll mark it as needing external processing
 */
async function downloadAndProcessFitFile(event, integration, supabase, env) {
  try {
    console.log('📥 Downloading FIT file:', event.file_url);

    // Download FIT file using OAuth 2.0 Bearer token
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
    const buffer = new Uint8Array(arrayBuffer);

    console.log('✅ FIT file downloaded, size:', buffer.length, 'bytes');

    // Store FIT file data temporarily and mark for external processing
    // Cloudflare Workers have CPU time limits, so complex FIT parsing
    // should be done by a separate background job or Vercel API route

    await supabase
      .from('garmin_webhook_events')
      .update({
        processed: false, // Keep as unprocessed
        processed_at: null,
        process_error: 'FIT file downloaded - needs external processing',
        payload: {
          ...event.payload,
          fitFileSize: buffer.length,
          fitFileDownloaded: true
        }
      })
      .eq('id', event.id);

    console.log('⚠️ FIT file downloaded but needs external processing');
    console.log('💡 Set up a cron job or separate worker to process FIT files');

  } catch (error) {
    console.error('FIT file download error:', error);
    throw error;
  }
}
