// Wahoo API Integration Service
// Secure server-side OAuth and API integration
// Documentation: https://cloud-api.wahooligan.com/

import { supabase } from '../supabase';

const WAHOO_OAUTH_BASE = 'https://api.wahooligan.com/oauth';
const WAHOO_API_BASE = 'https://api.wahooligan.com/v1';

// Get the API base URL based on environment
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Use relative URLs in production
  }
  return 'http://localhost:3000';
};

/**
 * Secure Wahoo OAuth and API service
 */
export class WahooService {
  constructor() {
    this.clientId = process.env.REACT_APP_WAHOO_CLIENT_ID;
    this.redirectUri = process.env.REACT_APP_WAHOO_REDIRECT_URI || `${window.location.origin}/wahoo/callback`;
  }

  /**
   * Check if Wahoo credentials are configured
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
   * Generate Wahoo OAuth authorization URL
   * Scopes: user_read, user_write, workouts_read, workouts_write, offline_data
   */
  getAuthorizationUrl(state = null) {
    if (!this.isConfigured()) {
      throw new Error('Wahoo client ID must be configured');
    }

    console.log('🔍 Wahoo OAuth Debug:', {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      currentOrigin: window.location.origin,
      environment: process.env.NODE_ENV
    });

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'user_read workouts_read offline_data'
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `${WAHOO_OAUTH_BASE}/authorize?${params.toString()}`;
    console.log('🔗 Generated Wahoo Auth URL:', authUrl);

    return authUrl;
  }

  /**
   * Exchange authorization code for access token (secure server-side)
   */
  async exchangeCodeForToken(code) {
    if (!this.isConfigured()) {
      throw new Error('Wahoo client credentials not configured');
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('🔄 Exchanging Wahoo code for tokens securely...');

      const response = await fetch(`${getApiBaseUrl()}/api/wahoo-auth`, {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Wahoo token exchange successful');

      return data;
    } catch (error) {
      console.error('❌ Wahoo token exchange failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has connected Wahoo account
   */
  async isConnected() {
    const userId = await this.getCurrentUserId();
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('bike_computer_integrations')
        .select('id, sync_enabled')
        .eq('user_id', userId)
        .eq('provider', 'wahoo')
        .single();

      return !error && data && data.sync_enabled;
    } catch (error) {
      console.error('Error checking Wahoo connection:', error);
      return false;
    }
  }

  /**
   * Get Wahoo integration details for current user
   */
  async getIntegration() {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('bike_computer_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'wahoo')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching Wahoo integration:', error);
      return null;
    }
  }

  /**
   * Disconnect Wahoo account
   */
  async disconnect() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/wahoo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'disconnect',
          userId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Wahoo');
      }

      console.log('✅ Wahoo disconnected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to disconnect Wahoo:', error);
      throw error;
    }
  }

  /**
   * Sync workouts from Wahoo (calls server-side endpoint)
   */
  async syncWorkouts(options = {}) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    try {
      console.log('🔄 Syncing workouts from Wahoo...');

      const response = await fetch(`${getApiBaseUrl()}/api/wahoo-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          ...options
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Wahoo sync completed:', data);

      return data;
    } catch (error) {
      console.error('❌ Wahoo sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit = 50) {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('bike_computer_sync_history')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'wahoo')
        .order('synced_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Wahoo sync history:', error);
      return [];
    }
  }
}

// Export singleton instance
const wahooService = new WahooService();
export default wahooService;
