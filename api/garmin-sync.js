// Vercel API Route: Garmin Activity Backfill
// Triggers a backfill request for historical activities from Garmin
// Documentation: https://developer.garmin.com/gc-developer-program/overview/
//
// IMPORTANT: Garmin Activity API is event-driven and server-to-server only.
// You cannot directly query for activities. Instead:
// 1. Use Push/Ping webhooks (configured in Endpoint Configuration Tool)
// 2. Use Backfill API to request historical data (this endpoint)
// 3. Garmin will send the data via Push notifications to your webhook

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GARMIN_BACKFILL_BASE = 'https://apis.garmin.com/wellness-api/rest/backfill';

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

    // Calculate date range (default to last 30 days, max 30 days per request)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Validate date range (max 30 days per Garmin API docs)
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      return res.status(400).json({
        error: 'Date range too large. Maximum 30 days per backfill request.',
        maxDays: 30,
        requestedDays: daysDiff
      });
    }

    console.log('🔄 Triggering Garmin backfill:', {
      userId,
      hasAccessToken: !!integration.access_token,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      daysDiff
    });

    // Trigger backfill request for activities
    const backfillUrl = `${GARMIN_BACKFILL_BASE}/activities`;
    const params = new URLSearchParams({
      summaryStartTimeInSeconds: Math.floor(start.getTime() / 1000).toString(),
      summaryEndTimeInSeconds: Math.floor(end.getTime() / 1000).toString()
    });

    console.log('📡 Calling Garmin Backfill API:', {
      url: `${backfillUrl}?${params.toString()}`,
      hasAuth: !!integration.access_token
    });

    const response = await fetch(`${backfillUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`
      }
    });

    console.log('📡 Garmin Backfill API response:', {
      status: response.status,
      statusText: response.statusText
    });

    if (response.status === 202) {
      // 202 Accepted - Backfill request accepted
      console.log('✅ Garmin backfill request accepted');

      // Update last sync time
      await supabase
        .from('bike_computer_integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', 'garmin');

      return res.status(200).json({
        success: true,
        message: 'Backfill request accepted. Activities will be sent to your webhook shortly.',
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
          days: daysDiff
        }
      });

    } else if (response.status === 409) {
      // 409 Conflict - Duplicate backfill request
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ Duplicate backfill request:', errorData);

      return res.status(200).json({
        success: true,
        message: 'Backfill already in progress for this time range.',
        duplicate: true
      });

    } else {
      // Error response
      const errorText = await response.text();
      console.error('❌ Garmin backfill error:', {
        status: response.status,
        error: errorText
      });

      throw new Error(`Garmin backfill failed (${response.status}): ${errorText}`);
    }

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
