// Strava API Integration Service
// Handles OAuth authentication and activity data import

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH_BASE = 'https://www.strava.com/oauth';

/**
 * Strava OAuth and API service
 */
export class StravaService {
  constructor() {
    this.clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_STRAVA_CLIENT_SECRET;
    this.redirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI || `${window.location.origin}/strava/callback`;
  }

  /**
   * Check if Strava credentials are configured
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Generate Strava OAuth authorization URL
   */
  getAuthorizationUrl(state = null) {
    if (!this.isConfigured()) {
      throw new Error('Strava client ID and secret must be configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      approval_prompt: 'force',
      scope: 'read,activity:read_all,profile:read_all'
    });

    if (state) {
      params.append('state', state);
    }

    return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    if (!this.isConfigured()) {
      throw new Error('Strava client credentials not configured');
    }

    try {
      const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Strava token exchange failed: ${error}`);
      }

      const tokenData = await response.json();
      
      // Store tokens securely (in a real app, store refresh token server-side)
      this.storeTokens(tokenData);
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        athlete: tokenData.athlete,
        expiresAt: tokenData.expires_at
      };
    } catch (error) {
      console.error('Strava token exchange error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    if (!this.isConfigured()) {
      throw new Error('Strava client credentials not configured');
    }

    try {
      const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Strava token');
      }

      const tokenData = await response.json();
      this.storeTokens(tokenData);
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_at
      };
    } catch (error) {
      console.error('Strava token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getValidAccessToken() {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('No Strava tokens found. Please reconnect to Strava.');
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    if (tokens.expiresAt && tokens.expiresAt - 300 < now) {
      console.log('Strava token expired, refreshing...');
      const refreshed = await this.refreshAccessToken(tokens.refreshToken);
      return refreshed.accessToken;
    }

    return tokens.accessToken;
  }

  /**
   * Get athlete profile
   */
  async getAthlete() {
    try {
      const accessToken = await this.getValidAccessToken();
      const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Strava athlete:', error);
      throw error;
    }
  }

  /**
   * Get athlete activities
   */
  async getActivities(options = {}) {
    try {
      const accessToken = await this.getValidAccessToken();
      
      const params = new URLSearchParams({
        per_page: options.perPage || 30,
        page: options.page || 1
      });

      if (options.after) {
        params.append('after', Math.floor(options.after.getTime() / 1000));
      }

      if (options.before) {
        params.append('before', Math.floor(options.before.getTime() / 1000));
      }

      const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Strava activities:', error);
      throw error;
    }
  }

  /**
   * Get detailed activity data
   */
  async getActivity(activityId) {
    try {
      const accessToken = await this.getValidAccessToken();
      const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Strava activity:', error);
      throw error;
    }
  }

  /**
   * Get activity streams (GPS data, power, heart rate, etc.)
   */
  async getActivityStreams(activityId, types = ['latlng', 'time', 'altitude', 'heartrate', 'watts']) {
    try {
      const accessToken = await this.getValidAccessToken();
      const response = await fetch(
        `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=${types.join(',')}&key_by_type=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Strava activity streams:', error);
      throw error;
    }
  }

  /**
   * Store tokens securely (localStorage for demo - use secure storage in production)
   */
  storeTokens(tokenData) {
    const tokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_at,
      athlete: tokenData.athlete
    };
    
    localStorage.setItem('strava_tokens', JSON.stringify(tokens));
  }

  /**
   * Get stored tokens
   */
  getStoredTokens() {
    try {
      const stored = localStorage.getItem('strava_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading stored Strava tokens:', error);
      return null;
    }
  }

  /**
   * Check if user is connected to Strava
   */
  isConnected() {
    const tokens = this.getStoredTokens();
    return !!(tokens && tokens.accessToken);
  }

  /**
   * Disconnect from Strava (clear tokens)
   */
  disconnect() {
    localStorage.removeItem('strava_tokens');
  }

  /**
   * Convert Strava activity to our internal format
   */
  convertStravaActivity(stravaActivity, streams = null) {
    return {
      id: `strava_${stravaActivity.id}`,
      strava_id: stravaActivity.id,
      name: stravaActivity.name,
      type: stravaActivity.type?.toLowerCase() || 'ride',
      start_date: stravaActivity.start_date,
      distance_m: stravaActivity.distance,
      distance_km: stravaActivity.distance / 1000,
      duration_seconds: stravaActivity.moving_time,
      elevation_gain_m: stravaActivity.total_elevation_gain,
      elevation_loss_m: stravaActivity.total_elevation_gain, // Approximate
      average_speed: stravaActivity.average_speed,
      max_speed: stravaActivity.max_speed,
      average_heartrate: stravaActivity.average_heartrate,
      max_heartrate: stravaActivity.max_heartrate,
      average_watts: stravaActivity.average_watts,
      max_watts: stravaActivity.max_watts,
      kilojoules: stravaActivity.kilojoules,
      bounds_north: stravaActivity.start_latitude + 0.01, // Approximate
      bounds_south: stravaActivity.start_latitude - 0.01,
      bounds_east: stravaActivity.start_longitude + 0.01,  
      bounds_west: stravaActivity.start_longitude - 0.01,
      start_latitude: stravaActivity.start_latitude,
      start_longitude: stravaActivity.start_longitude,
      streams: streams,
      source: 'strava'
    };
  }
}

// Export singleton instance
export const stravaService = new StravaService();
export default stravaService;