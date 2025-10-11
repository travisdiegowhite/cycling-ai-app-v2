/**
 * Smart cycling router that combines multiple routing services for optimal cycling routes
 * Uses GraphHopper for cycling infrastructure awareness and Mapbox as fallback
 */

import { getGraphHopperCyclingDirections, selectGraphHopperProfile } from './graphHopper';
import { getCyclingDirections } from './directions';
import { fetchElevationProfile, calculateElevationStats } from './directions';

/**
 * Get the best cycling route using multiple routing services
 */
export async function getSmartCyclingRoute(waypoints, options = {}) {
  const {
    profile = 'bike',
    preferences = null,
    trainingGoal = 'endurance',
    mapboxToken = null,
    maxRetries = 2
  } = options;

  console.log('🧠 Smart cycling router: Finding optimal route...');
  console.log('📍 Waypoints:', waypoints.length);
  console.log('🎯 Profile:', profile);
  console.log('🎯 Training goal:', trainingGoal);
  console.log('⚙️ Preferences:', preferences);

  // Strategy 1: Try GraphHopper for cycling-optimized routing (including gravel)
  const graphHopperResult = await tryGraphHopperRouting(waypoints, {
    profile,
    preferences,
    trainingGoal
  });

  if (graphHopperResult && isGoodCyclingRoute(graphHopperResult, preferences)) {
    console.log('✅ GraphHopper provided excellent cycling route');
    return {
      ...graphHopperResult,
      source: 'graphhopper',
      confidence: Math.min(graphHopperResult.confidence + 0.1, 1.0) // Boost confidence for cycling-specific service
    };
  }

  // Strategy 2: Try Mapbox with optimized settings
  if (mapboxToken) {
    console.log('🔄 Falling back to Mapbox with cycling optimizations...');
    const mapboxResult = await tryMapboxRouting(waypoints, {
      preferences,
      trainingGoal,
      mapboxToken
    });

    if (mapboxResult && mapboxResult.coordinates && mapboxResult.coordinates.length > 10) {
      console.log('✅ Mapbox provided viable cycling route');
      return {
        ...mapboxResult,
        source: 'mapbox_optimized',
        confidence: Math.max(mapboxResult.confidence - 0.1, 0.5) // Reduce confidence slightly for non-cycling-specific service
      };
    }
  }

  // Strategy 3: If both fail, try GraphHopper with relaxed settings
  if (graphHopperResult) {
    console.log('⚠️ Using GraphHopper route with relaxed quality standards');
    return {
      ...graphHopperResult,
      source: 'graphhopper_fallback',
      confidence: 0.6
    };
  }

  console.warn('❌ All routing strategies failed');
  return null;
}

/**
 * Try GraphHopper routing with cycling-specific optimizations
 */
async function tryGraphHopperRouting(waypoints, options) {
  const { profile, preferences, trainingGoal } = options;

  try {
    // Select optimal GraphHopper profile
    const ghProfile = selectGraphHopperProfile(trainingGoal, profile);

    console.log(`🚴 Trying GraphHopper with profile: ${ghProfile} (original: ${profile})`);

    const result = await getGraphHopperCyclingDirections(waypoints, {
      profile: ghProfile,
      elevation: true,
      preferences: preferences,
      calcPoints: true
    });

    if (result && result.coordinates && result.coordinates.length > 0) {
      // Convert GraphHopper format to our standard format
      return {
        coordinates: result.coordinates,
        distance: result.distance,
        duration: result.duration,
        elevationGain: result.elevation?.ascent || 0,
        elevationLoss: result.elevation?.descent || 0,
        confidence: result.confidence || 0.9,
        profile: ghProfile,
        source: 'graphhopper'
      };
    }

    return null;
  } catch (error) {
    console.warn('GraphHopper routing failed:', error);
    return null;
  }
}

/**
 * Try Mapbox routing with cycling optimizations
 */
async function tryMapboxRouting(waypoints, options) {
  const { preferences, trainingGoal, mapboxToken } = options;

  try {
    console.log('🗺️ Trying Mapbox with enhanced cycling preferences...');

    const result = await getCyclingDirections(waypoints, mapboxToken, {
      profile: 'cycling',
      preferences: preferences
    });

    return result;
  } catch (error) {
    console.warn('Mapbox routing failed:', error);
    return null;
  }
}

/**
 * Evaluate if a route is good for cycling based on preferences
 */
function isGoodCyclingRoute(route, preferences) {
  if (!route || !route.coordinates || route.coordinates.length < 10) {
    return false;
  }

  // Check route quality metrics
  const qualityScore = calculateRouteQuality(route, preferences);

  console.log(`📊 Route quality score: ${qualityScore.toFixed(2)}`);

  // Route is considered good if it scores above 0.7
  return qualityScore > 0.7;
}

/**
 * Calculate route quality score based on cycling preferences
 */
function calculateRouteQuality(route, preferences) {
  let score = 0.5; // Base score

  // Distance reasonableness (not too short or too long)
  if (route.distance > 1000 && route.distance < 200000) { // 1km to 200km
    score += 0.2;
  }

  // Confidence boost
  if (route.confidence > 0.8) {
    score += 0.1;
  }

  // Cycling-specific service bonus
  if (route.source === 'graphhopper') {
    score += 0.15; // GraphHopper is cycling-optimized
  }

  // Preferences alignment
  if (preferences) {
    // Traffic avoidance bonus
    if (preferences.routingPreferences?.trafficTolerance === 'low') {
      // GraphHopper with custom model gets bonus
      if (route.source === 'graphhopper') {
        score += 0.1;
      }
    }

    // Bike infrastructure bonus
    if (preferences.safetyPreferences?.bikeInfrastructure === 'strongly_preferred' ||
        preferences.safetyPreferences?.bikeInfrastructure === 'required') {
      if (route.source === 'graphhopper') {
        score += 0.15;
      }
    }
  }

  // Gravel profile bonus - prefer GraphHopper for gravel routing
  if (route.profile === 'gravel' && route.source === 'graphhopper') {
    score += 0.2; // Strong preference for GraphHopper on gravel routes
  }

  return Math.min(score, 1.0);
}

/**
 * Get routing strategy description for user feedback
 */
export function getRoutingStrategyDescription(route) {
  if (!route) return 'No route available';

  // Check for gravel profile first
  if (route.profile === 'gravel') {
    return 'Prioritized dirt roads, trails, and unpaved surfaces';
  }

  switch (route.source) {
    case 'graphhopper':
      return 'Optimized for cycling infrastructure and traffic avoidance';
    case 'mapbox_optimized':
      return 'Enhanced routing with traffic filtering';
    case 'graphhopper_fallback':
      return 'Cycling-aware routing with relaxed constraints';
    default:
      return 'Standard routing';
  }
}

/**
 * Check if GraphHopper is available and configured
 */
export function isGraphHopperAvailable() {
  return !!process.env.REACT_APP_GRAPHHOPPER_API_KEY;
}