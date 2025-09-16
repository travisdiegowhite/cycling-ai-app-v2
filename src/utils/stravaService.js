// Strava API Integration Service
// Now uses secure server-side API for token management
// Updated: All API calls moved to secure backend endpoints

import { supabase } from '../supabase';

const STRAVA_OAUTH_BASE = 'https://www.strava.com/oauth';

// Get the API base URL based on environment
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Use relative URLs in production
  }
  return 'http://localhost:3000';
};

/**
 * Secure Strava OAuth and API service
 */
export class StravaService {
  constructor() {
    this.clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
    this.redirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI || `${window.location.origin}/strava/callback`;
  }

  /**
   * Check if Strava credentials are configured
   */
  isConfigured() {
    return !!(this.clientId);
  }

  /**
   * Get current user ID from Supabase auth
   */
  async getCurrentUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
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
   * Exchange authorization code for access token (secure server-side)
   */
  async exchangeCodeForToken(code) {
    if (!this.isConfigured()) {
      throw new Error('Strava client credentials not configured');
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('🔄 Exchanging Strava code for tokens securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/strava-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'exchange_code',
          code: code,
          userId: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Token exchange failed');
      }

      console.log('✅ Strava tokens stored securely');

      return {
        athlete: data.athlete
      };

    } catch (error) {
      console.error('Strava token exchange error:', error);
      throw error;
    }
  }

  // Token refresh is now handled securely server-side

  // Token management is now handled securely server-side

  /**
   * Get athlete profile (secure server-side)
   */
  async getAthlete() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('👤 Fetching Strava athlete securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/strava-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          endpoint: 'athlete'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Athlete request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch athlete');
      }

      return data.data;

    } catch (error) {
      console.error('Error fetching Strava athlete:', error);
      throw error;
    }
  }

  /**
   * Get athlete activities (secure server-side)
   */
  async getActivities(options = {}) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('📊 Fetching Strava activities securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/strava-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          endpoint: 'activities',
          options: options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Activities request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activities');
      }

      return data.data;

    } catch (error) {
      console.error('Error fetching Strava activities:', error);
      throw error;
    }
  }

  /**
   * Get detailed activity data (secure server-side)
   */
  async getActivity(activityId) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('📊 Fetching Strava activity securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/strava-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          endpoint: 'activity',
          options: { activityId }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Activity request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activity');
      }

      return data.data;

    } catch (error) {
      console.error('Error fetching Strava activity:', error);
      throw error;
    }
  }

  /**
   * Get activity streams (GPS data, power, heart rate, etc.) - secure server-side
   */
  async getActivityStreams(activityId, types = ['latlng', 'time', 'altitude', 'heartrate', 'watts']) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('📈 Fetching Strava activity streams securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/strava-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          endpoint: 'streams',
          options: { activityId, types }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Streams request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activity streams');
      }

      return data.data;

    } catch (error) {
      console.error('Error fetching Strava activity streams:', error);
      throw error;
    }
  }

  // Token storage is now handled securely server-side
  // No more localStorage token storage

  /**
   * Check if user is connected to Strava (secure server-side check)
   */
  async isConnected() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return false;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/strava-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get_tokens',
          userId: userId
        })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.connected && !data.isExpired;

    } catch (error) {
      console.error('Error checking Strava connection:', error);
      return false;
    }
  }

  /**
   * Disconnect from Strava (revoke tokens server-side)
   */
  async disconnect() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return;
    }

    try {
      console.log('🔌 Disconnecting from Strava securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/strava-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'revoke_tokens',
          userId: userId
        })
      });

      if (!response.ok) {
        console.warn('Failed to revoke Strava tokens');
      }

      console.log('✅ Strava disconnected securely');

    } catch (error) {
      console.error('Error disconnecting from Strava:', error);
    }
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