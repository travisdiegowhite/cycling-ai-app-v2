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

    // Calculate date range
    // If no dates provided, default to last 30 days
    // If dates provided, we'll split into 30-day chunks
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate total days
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // If date range is > 30 days, we need to split into chunks
    // Garmin max is 30 days per backfill request
    const CHUNK_SIZE_DAYS = 30;
    const chunks = [];

    if (totalDays > CHUNK_SIZE_DAYS) {
      // Split into 30-day chunks
      let currentStart = new Date(start);
      while (currentStart < end) {
        const currentEnd = new Date(Math.min(
          currentStart.getTime() + (CHUNK_SIZE_DAYS * 24 * 60 * 60 * 1000),
          end.getTime()
        ));

        chunks.push({
          start: new Date(currentStart),
          end: new Date(currentEnd)
        });

        currentStart = new Date(currentEnd);
      }

      console.log(`📅 Splitting ${totalDays} days into ${chunks.length} chunks of ${CHUNK_SIZE_DAYS} days`);
    } else {
      chunks.push({ start, end });
    }

    console.log('🔄 Triggering Garmin backfill:', {
      userId,
      hasAccessToken: !!integration.access_token,
      totalDays,
      chunks: chunks.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });

    // Send backfill requests for each chunk
    const results = [];
    const backfillUrl = `${GARMIN_BACKFILL_BASE}/activities`;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const params = new URLSearchParams({
        summaryStartTimeInSeconds: Math.floor(chunk.start.getTime() / 1000).toString(),
        summaryEndTimeInSeconds: Math.floor(chunk.end.getTime() / 1000).toString()
      });

      console.log(`📡 Backfill chunk ${i + 1}/${chunks.length}:`, {
        url: `${backfillUrl}?${params.toString()}`,
        start: chunk.start.toISOString(),
        end: chunk.end.toISOString()
      });

      const response = await fetch(`${backfillUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`
        }
      });

      console.log(`📡 Chunk ${i + 1} response:`, {
        status: response.status,
        statusText: response.statusText
      });

      if (response.status === 202) {
        results.push({
          chunk: i + 1,
          status: 'accepted',
          dateRange: {
            start: chunk.start.toISOString(),
            end: chunk.end.toISOString()
          }
        });
      } else if (response.status === 409) {
        const errorData = await response.json().catch(() => ({}));
        results.push({
          chunk: i + 1,
          status: 'duplicate',
          message: 'Already requested',
          dateRange: {
            start: chunk.start.toISOString(),
            end: chunk.end.toISOString()
          }
        });
      } else {
        const errorText = await response.text();
        results.push({
          chunk: i + 1,
          status: 'error',
          error: errorText,
          dateRange: {
            start: chunk.start.toISOString(),
            end: chunk.end.toISOString()
          }
        });
      }

      // Small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update last sync time
    await supabase
      .from('bike_computer_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'garmin');

    const acceptedCount = results.filter(r => r.status === 'accepted').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log('✅ Backfill requests completed:', {
      total: results.length,
      accepted: acceptedCount,
      duplicate: duplicateCount,
      errors: errorCount
    });

    return res.status(200).json({
      success: true,
      message: `Backfill request completed. ${acceptedCount} chunk(s) accepted, ${duplicateCount} already in progress.`,
      totalDays,
      chunks: results.length,
      accepted: acceptedCount,
      duplicate: duplicateCount,
      errors: errorCount,
      results
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
