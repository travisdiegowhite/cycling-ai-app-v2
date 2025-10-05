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
      // Use GraphHopper's "safest" route preference with VERY strict avoidance
      params.append('ch.disable', 'true'); // Disable contraction hierarchies for more flexibility
      params.append('custom_model', JSON.stringify({
        "priority": [
          // BLOCK dangerous roads completely
          { "if": "road_class == MOTORWAY", "multiply_by": "0" },
          { "if": "road_class == TRUNK", "multiply_by": "0" },
          { "if": "road_class == PRIMARY", "multiply_by": "0.01" }, // Almost block primary roads
          { "if": "max_speed > 50", "multiply_by": "0.05" }, // Avoid high-speed roads
          // STRONGLY prefer safe infrastructure
          { "if": "bike_network != MISSING", "multiply_by": "3.0" }, // 3x preference for bike networks
          { "if": "road_class == CYCLEWAY", "multiply_by": "5.0" }, // 5x preference for dedicated bike paths
          { "if": "road_class == RESIDENTIAL", "multiply_by": "2.0" }, // 2x preference for residential streets
          { "if": "road_class == LIVING_STREET", "multiply_by": "2.5" }, // Prefer living streets
          { "if": "road_class == SERVICE", "multiply_by": "1.5" }, // Prefer service roads
          { "if": "surface == PAVED", "multiply_by": "1.3" }
        ],
        "distance_influence": 70 // Allow up to 70% longer routes for safety
      }));
      console.log('🚫 GraphHopper: Applying STRICT traffic avoidance - blocking motorways, trunks, and heavily penalizing primary roads');
    } else if (preferences.routingPreferences?.trafficTolerance === 'medium') {
      params.append('ch.disable', 'true');
      params.append('custom_model', JSON.stringify({
        "priority": [
          { "if": "road_class == MOTORWAY", "multiply_by": "0" }, // Still block motorways
          { "if": "road_class == TRUNK", "multiply_by": "0.05" }, // Heavily penalize trunks
          { "if": "road_class == PRIMARY", "multiply_by": "0.3" }, // Moderately avoid primary
          { "if": "max_speed > 70", "multiply_by": "0.1" }, // Avoid very high-speed roads
          { "if": "bike_network != MISSING", "multiply_by": "2.0" },
          { "if": "road_class == CYCLEWAY", "multiply_by": "3.0" },
          { "if": "road_class == RESIDENTIAL", "multiply_by": "1.5" }
        ],
        "distance_influence": 40 // Allow up to 40% longer for moderate safety
      }));
      console.log('⚖️ GraphHopper: Applying moderate traffic avoidance');
    }

    // Bike infrastructure preference (only applies if no traffic tolerance was set)
    if (preferences.safetyPreferences?.bikeInfrastructure === 'strongly_preferred' ||
        preferences.safetyPreferences?.bikeInfrastructure === 'required') {

      if (!params.has('custom_model')) {
        // No traffic model set yet, create one focused on bike infrastructure
        params.append('ch.disable', 'true');

        const infraBoost = preferences.safetyPreferences.bikeInfrastructure === 'required' ? '3.0' : '2.0';

        params.append('custom_model', JSON.stringify({
          "priority": [
            // Block unsafe roads when infrastructure is required
            { "if": "road_class == MOTORWAY", "multiply_by": "0" },
            { "if": "road_class == TRUNK", "multiply_by": "0" },
            { "if": "road_class == PRIMARY", "multiply_by": preferences.safetyPreferences.bikeInfrastructure === 'required' ? "0" : "0.1" },
            // Strongly boost bike infrastructure
            { "if": "bike_network != MISSING", "multiply_by": infraBoost },
            { "if": "bike_network == LCN", "multiply_by": "2.5" }, // Local cycling network
            { "if": "bike_network == RCN", "multiply_by": "2.3" }, // Regional cycling network
            { "if": "bike_network == NCN", "multiply_by": "2.0" }, // National cycling network
            { "if": "road_class == CYCLEWAY", "multiply_by": "4.0" },
            { "if": "road_class == RESIDENTIAL", "multiply_by": "1.8" }
          ],
          "distance_influence": preferences.safetyPreferences.bikeInfrastructure === 'required' ? 80 : 50
        }));
        console.log(`🛣️ GraphHopper: Requiring bike infrastructure (${infraBoost}x boost)`);
      }
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