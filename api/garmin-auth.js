// Vercel API Route: Secure Garmin Authentication
// Handles OAuth 1.0a authentication flow and token storage
// Documentation: https://developer.garmin.com/gc-developer-program/overview/

import { createClient } from '@supabase/supabase-js';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Initialize Supabase (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Garmin OAuth 1.0a endpoints
const GARMIN_REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
const GARMIN_ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm';

// Temporary storage for request tokens (in production, use Redis or database)
const requestTokenStore = new Map();

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

// Initialize OAuth 1.0a
function getOAuthClient() {
  return new OAuth({
    consumer: {
      key: process.env.GARMIN_CONSUMER_KEY,
      secret: process.env.GARMIN_CONSUMER_SECRET,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64');
    },
  });
}

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
    const { action, userId, oauthToken, oauthVerifier } = req.body;

    // Validate required environment variables
    if (!process.env.GARMIN_CONSUMER_KEY || !process.env.GARMIN_CONSUMER_SECRET) {
      return res.status(500).json({ error: 'Garmin credentials not configured' });
    }

    switch (action) {
      case 'get_request_token':
        return await getRequestToken(req, res, userId);

      case 'exchange_token':
        return await exchangeTokenForAccess(req, res, userId, oauthToken, oauthVerifier);

      case 'disconnect':
        return await disconnectGarmin(req, res, userId);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Garmin auth error:', error);

    return res.status(500).json({
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Step 1: Get OAuth 1.0a request token from Garmin
 */
async function getRequestToken(req, res, userId) {
  if (!userId) {
    return res.status(400).json({ error: 'UserId required' });
  }

  try {
    const oauth = getOAuthClient();

    // Determine callback URL based on environment
    const callbackUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_GARMIN_REDIRECT_URI || 'https://www.tribos.studio/garmin/callback'
      : 'http://localhost:3000/garmin/callback';

    console.log('🔍 Requesting Garmin OAuth token:', {
      userId,
      callbackUrl,
      consumerKey: process.env.GARMIN_CONSUMER_KEY
    });

    // Build OAuth request
    const requestData = {
      url: GARMIN_REQUEST_TOKEN_URL,
      method: 'POST',
      data: { oauth_callback: callbackUrl }
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    // Request token from Garmin
    const response = await fetch(GARMIN_REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `oauth_callback=${encodeURIComponent(callbackUrl)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Garmin request token failed:', errorText);
      throw new Error(`Garmin request token failed: ${errorText}`);
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);

    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      console.error('Invalid response from Garmin:', responseText);
      throw new Error('Invalid response from Garmin');
    }

    console.log('✅ Garmin request token received:', {
      hasToken: !!oauthToken,
      hasSecret: !!oauthTokenSecret
    });

    // Store request token temporarily (associated with userId)
    requestTokenStore.set(oauthToken, {
      secret: oauthTokenSecret,
      userId: userId,
      timestamp: Date.now()
    });

    // Clean up old tokens (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [token, data] of requestTokenStore.entries()) {
      if (data.timestamp < tenMinutesAgo) {
        requestTokenStore.delete(token);
      }
    }

    // Build authorization URL
    const authorizationUrl = `${GARMIN_AUTHORIZE_URL}?oauth_token=${oauthToken}`;

    return res.status(200).json({
      success: true,
      authorizationUrl: authorizationUrl,
      oauthToken: oauthToken
    });

  } catch (error) {
    console.error('Request token error:', error);
    throw error;
  }
}

/**
 * Step 2: Exchange request token + verifier for access token
 */
async function exchangeTokenForAccess(req, res, userId, oauthToken, oauthVerifier) {
  if (!userId || !oauthToken || !oauthVerifier) {
    return res.status(400).json({ error: 'UserId, oauthToken, and oauthVerifier required' });
  }

  try {
    // Retrieve stored request token secret
    const storedData = requestTokenStore.get(oauthToken);
    if (!storedData) {
      return res.status(400).json({ error: 'Invalid or expired request token' });
    }

    // Verify this token belongs to the requesting user
    if (storedData.userId !== userId) {
      return res.status(403).json({ error: 'Token does not belong to this user' });
    }

    const oauthTokenSecret = storedData.secret;

    console.log('🔄 Exchanging Garmin token for access token:', {
      userId,
      hasToken: !!oauthToken,
      hasVerifier: !!oauthVerifier
    });

    const oauth = getOAuthClient();

    // Build OAuth request for access token
    const requestData = {
      url: GARMIN_ACCESS_TOKEN_URL,
      method: 'POST',
      data: { oauth_verifier: oauthVerifier }
    };

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    // Request access token from Garmin
    const response = await fetch(GARMIN_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `oauth_verifier=${encodeURIComponent(oauthVerifier)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Garmin access token exchange failed:', errorText);
      throw new Error(`Garmin access token exchange failed: ${errorText}`);
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);

    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');

    if (!accessToken || !accessTokenSecret) {
      console.error('Invalid access token response from Garmin:', responseText);
      throw new Error('Invalid access token response from Garmin');
    }

    console.log('✅ Garmin access token received');

    // Clean up request token
    requestTokenStore.delete(oauthToken);

    // Store tokens in database
    const { error: dbError } = await supabase
      .from('bike_computer_integrations')
      .upsert({
        user_id: userId,
        provider: 'garmin',
        access_token: accessToken,
        refresh_token: accessTokenSecret, // OAuth 1.0a uses token secret instead
        token_expires_at: null, // OAuth 1.0a tokens don't expire
        provider_user_id: null, // Will be populated on first sync
        provider_user_data: null,
        sync_enabled: true,
        last_sync_at: null,
        sync_error: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider'
      });

    if (dbError) {
      console.error('Database error storing Garmin tokens:', dbError);
      throw new Error('Failed to store authentication data');
    }

    console.log('✅ Garmin integration stored successfully');

    return res.status(200).json({
      success: true,
      message: 'Garmin connected successfully'
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

/**
 * Disconnect Garmin account
 */
async function disconnectGarmin(req, res, userId) {
  if (!userId) {
    return res.status(400).json({ error: 'UserId required' });
  }

  try {
    // Delete stored integration
    const { error } = await supabase
      .from('bike_computer_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'garmin');

    if (error) {
      console.error('Database error deleting Garmin integration:', error);
      throw new Error('Failed to disconnect Garmin');
    }

    console.log('✅ Garmin integration disconnected successfully');

    return res.status(200).json({
      success: true,
      message: 'Garmin connection disconnected'
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    throw error;
  }
}
