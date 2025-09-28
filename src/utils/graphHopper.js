// GraphHopper integration for cycling routes
// Good CORS support for browser applications

const GRAPHHOPPER_BASE_URL = 'https://graphhopper.com/api/1';

// GraphHopper cycling profiles
export const GRAPHHOPPER_PROFILES = {
  BIKE: 'bike',                    // Standard cycling
  RACINGBIKE: 'racingbike',       // Road cycling optimized  
  MOUNTAINBIKE: 'mtb',            // Mountain biking
  FOOT: 'foot'                     // Walking/hiking
};

// Get GraphHopper API key
const getGraphHopperApiKey = () => {
  return process.env.REACT_APP_GRAPHHOPPER_API_KEY;
};

// Get cycling directions using GraphHopper with advanced preferences
export async function getGraphHopperCyclingDirections(coordinates, options = {}) {
  const apiKey = getGraphHopperApiKey();

  if (!apiKey) {
    console.warn('GraphHopper API key not found. Get one free at https://www.graphhopper.com/');
    return null;
  }

  const {
    profile = GRAPHHOPPER_PROFILES.BIKE,
    alternatives = false,
    elevation = true,
    instructions = false,
    calcPoints = true,
    preferences = null
  } = options;

  // Format coordinates: lat,lon|lat,lon|...
  const points = coordinates.map(coord => `${coord[1]},${coord[0]}`).join('|');
  
  const params = new URLSearchParams({
    key: apiKey,
    vehicle: profile,
    points_encoded: 'false',
    calc_points: calcPoints,
    instructions: instructions,
    elevation: elevation,
    optimize: 'false'
  });

  // Add cycling-specific preferences for GraphHopper
  if (preferences) {
    console.log('🚴 Applying GraphHopper cycling preferences:', preferences);

    // Traffic avoidance using GraphHopper's custom model
    if (preferences.routingPreferences?.trafficTolerance === 'low') {
      // Use GraphHopper's "safest" route preference
      params.append('ch.disable', 'true'); // Disable contraction hierarchies for more flexibility
      params.append('custom_model', JSON.stringify({
        "priority": [
          { "if": "road_class == PRIMARY", "multiply_by": "0.1" },
          { "if": "road_class == TRUNK", "multiply_by": "0.05" },
          { "if": "road_class == MOTORWAY", "multiply_by": "0.01" },
          { "if": "bike_network != MISSING", "multiply_by": "1.5" },
          { "if": "surface == PAVED", "multiply_by": "1.2" }
        ]
      }));
      console.log('🚫 GraphHopper: Applying strict traffic avoidance');
    } else if (preferences.routingPreferences?.trafficTolerance === 'medium') {
      params.append('ch.disable', 'true');
      params.append('custom_model', JSON.stringify({
        "priority": [
          { "if": "road_class == TRUNK", "multiply_by": "0.3" },
          { "if": "road_class == MOTORWAY", "multiply_by": "0.1" },
          { "if": "bike_network != MISSING", "multiply_by": "1.3" }
        ]
      }));
      console.log('⚖️ GraphHopper: Applying moderate traffic avoidance');
    }

    // Bike infrastructure preference
    if (preferences.safetyPreferences?.bikeInfrastructure === 'strongly_preferred' ||
        preferences.safetyPreferences?.bikeInfrastructure === 'required') {
      // Boost cycling infrastructure in routing
      const infraBoost = preferences.safetyPreferences.bikeInfrastructure === 'required' ? '2.0' : '1.5';

      if (!params.has('custom_model')) {
        params.append('ch.disable', 'true');
        params.append('custom_model', JSON.stringify({
          "priority": [
            { "if": "bike_network != MISSING", "multiply_by": infraBoost },
            { "if": "bike_network == LCN", "multiply_by": "1.8" },
            { "if": "bike_network == RCN", "multiply_by": "1.6" },
            { "if": "bike_network == NCN", "multiply_by": "1.4" }
          ]
        }));
      }
      console.log(`🛣️ GraphHopper: Boosting bike infrastructure (${infraBoost}x)`);
    }
  }

  const url = `${GRAPHHOPPER_BASE_URL}/route?${params}&point=${points.replace(/\|/g, '&point=')}`;

  try {
    console.log(`Requesting GraphHopper cycling route with profile: ${profile}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GraphHopper API error: ${response.status} ${response.statusText}`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.paths || data.paths.length === 0) {
      console.warn('No routes found in GraphHopper response');
      return null;
    }

    const route = data.paths[0];
    
    return {
      coordinates: route.points.coordinates, // GeoJSON format
      distance: route.distance, // meters
      duration: route.time, // milliseconds  
      elevation: {
        ascent: route.ascent || 0,
        descent: route.descent || 0
      },
      confidence: 0.9, // GraphHopper generally has high confidence
      profile: profile,
      source: 'graphhopper',
      bbox: data.bbox,
      instructions: route.instructions || []
    };

  } catch (error) {
    console.error('GraphHopper request failed:', error);
    return null;
  }
}

// Select appropriate cycling profile based on training goal
export function selectGraphHopperProfile(trainingGoal) {
  switch (trainingGoal) {
    case 'hills':
    case 'intervals':
      return GRAPHHOPPER_PROFILES.RACINGBIKE; // Road bike profile
    
    case 'recovery':
      return GRAPHHOPPER_PROFILES.BIKE; // Standard bike (quieter roads)
    
    case 'endurance':
      return GRAPHHOPPER_PROFILES.RACINGBIKE; // Road optimized
    
    default:
      return GRAPHHOPPER_PROFILES.BIKE;
  }
}

// Validate GraphHopper service
export async function validateGraphHopperService() {
  const apiKey = getGraphHopperApiKey();
  
  if (!apiKey) {
    return {
      available: false,
      error: 'API key not configured',
      instructions: 'Get a free API key at https://www.graphhopper.com/'
    };
  }

  try {
    // Test with a simple request (London)
    const testUrl = `${GRAPHHOPPER_BASE_URL}/route?key=${apiKey}&vehicle=bike&point=51.5074,-0.1276&point=51.5100,-0.1200&points_encoded=false&calc_points=false`;
    
    const response = await fetch(testUrl);
    
    if (response.ok) {
      const data = await response.json();
      return { 
        available: true, 
        profiles: Object.values(GRAPHHOPPER_PROFILES),
        testDistance: data.paths?.[0]?.distance
      };
    } else {
      const errorText = await response.text();
      return { 
        available: false, 
        error: `API returned ${response.status}: ${errorText}`,
        instructions: 'Check your API key and quota'
      };
    }
  } catch (error) {
    return { 
      available: false, 
      error: error.message,
      instructions: 'Check your internet connection'
    };
  }
}

// Enhanced route generation using GraphHopper
export async function generateGraphHopperCyclingRoute(startCoord, endCoord, options = {}) {
  const {
    trainingGoal = 'endurance',
    alternatives = false
  } = options;

  const profile = selectGraphHopperProfile(trainingGoal);
  
  const routeOptions = {
    profile,
    elevation: true,
    alternatives,
    instructions: false
  };

  const route = await getGraphHopperCyclingDirections([startCoord, endCoord], routeOptions);
  
  if (route) {
    return {
      ...route,
      cyclingOptimized: true,
      trainingGoal
    };
  }

  return null;
}