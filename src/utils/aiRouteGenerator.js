// AI Route Generation Engine
// Smart route generation considering training goals, weather, and conditions

import { mapMatchRoute, fetchElevationProfile, calculateElevationStats, getCyclingDirections } from './directions';
import { getWeatherData, getWindFactor, getOptimalTrainingConditions } from './weather';
import { calculateBearing } from './routeUtils';
import { fetchPastRides, analyzeRidingPatterns, generateRouteFromPatterns, buildRouteFromSegments } from './rideAnalysis';
import { getGraphHopperCyclingDirections, selectGraphHopperProfile, validateGraphHopperService, GRAPHHOPPER_PROFILES } from './graphHopper';
import { generateClaudeRoutes, enhanceRouteWithClaude, analyzeRidingPatternsWithClaude } from './claudeRouteService';
import { EnhancedContextCollector } from './enhancedContext';
import { filterRoutesByInfrastructure, enhanceRouteWithInfrastructure, generateInfrastructureReport } from './infrastructureValidator';

// Main AI route generation function
export async function generateAIRoutes(params) {
  const {
    startLocation,
    timeAvailable,
    trainingGoal,
    routeType,
    weatherData: providedWeather,
    userId
  } = params;

  console.log('Generating AI routes with params:', params);

  // Get weather data if not provided
  let weatherData = providedWeather;
  if (!weatherData) {
    weatherData = await getWeatherData(startLocation[1], startLocation[0]);
  }

  // Analyze past rides for personalized recommendations
  let ridingPatterns = null;
  let patternBasedSuggestions = null;
  let claudeAnalysis = null;
  
  if (userId) {
    console.log('Analyzing past rides for user:', userId);
    try {
      const pastRides = await fetchPastRides(userId);
      ridingPatterns = analyzeRidingPatterns(pastRides);
      patternBasedSuggestions = generateRouteFromPatterns(ridingPatterns, {
        startLocation,
        targetDistance: calculateTargetDistance(timeAvailable, trainingGoal),
        trainingGoal
      });
      
      // Get Claude's analysis of riding patterns
      claudeAnalysis = await analyzeRidingPatternsWithClaude(ridingPatterns, {
        trainingGoal,
        timeAvailable,
        targetDistance: calculateTargetDistance(timeAvailable, trainingGoal)
      });
      
      console.log('Found riding patterns:', ridingPatterns);
      console.log('Pattern-based suggestions:', patternBasedSuggestions);
      console.log('Claude analysis:', claudeAnalysis);
    } catch (error) {
      console.warn('Failed to analyze past rides:', error);
    }
  }

  // Calculate target distance, enhanced with Strava performance data
  let targetDistance = calculateTargetDistance(timeAvailable, trainingGoal, ridingPatterns?.performanceMetrics);
  if (patternBasedSuggestions?.adjustedDistance) {
    targetDistance = patternBasedSuggestions.adjustedDistance;
    console.log(`Adjusted target distance from ${calculateTargetDistance(timeAvailable, trainingGoal)}km to ${targetDistance}km based on riding patterns`);
  }
  
  // Log enhanced pattern information
  if (ridingPatterns) {
    console.log('🎯 Enhanced riding patterns analysis:', {
      dataSource: ridingPatterns.dataSource,
      confidence: ridingPatterns.confidence,
      averageSpeed: ridingPatterns.performanceMetrics?.averageSpeed || ridingPatterns.averageSpeed,
      fitnessLevel: ridingPatterns.performanceMetrics?.fitnessLevel,
      powerProfile: ridingPatterns.performanceMetrics?.powerProfile,
      preferredElevation: ridingPatterns.elevationTolerance?.optimal || ridingPatterns.elevationTolerance?.preferred
    });
  }
  
  // Try to build routes from actual segments first
  const routes = [];
  
  // Get user preferences if available
  let userPreferences = null;
  if (userId) {
    try {
      userPreferences = await EnhancedContextCollector.gatherDetailedPreferences(userId, params);
      console.log('🎯 Loaded user preferences, bike infrastructure:', userPreferences?.safetyPreferences?.bikeInfrastructure);
    } catch (error) {
      console.warn('Could not load user preferences:', error);
    }
  }
  
  // Priority 0: Generate Claude AI route suggestions first
  console.log('🧠 Generating intelligent routes with Claude AI...');
  console.log('Claude parameters:', { startLocation, timeAvailable, trainingGoal, routeType, targetDistance });
  
  try {
    const claudeRoutes = await generateClaudeRoutes({
      startLocation,
      timeAvailable,
      trainingGoal,
      routeType,
      weatherData,
      ridingPatterns,
      targetDistance,
      claudeAnalysis,
      userId
    });
    
    console.log(`✅ Claude returned ${claudeRoutes.length} route suggestions`);
    
    if (claudeRoutes.length > 0) {
      console.log(`Converting ${claudeRoutes.length} Claude suggestions to full routes...`);
      // Convert Claude suggestions to full routes with coordinates
      for (const claudeRoute of claudeRoutes) {
        console.log('Converting Claude route:', claudeRoute.name);
        // Pass route type and riding patterns to the conversion
        const routeWithContext = {
          ...claudeRoute,
          routeType,
          pastRidePatterns: ridingPatterns
        };
        const enhancedRoute = await convertClaudeToFullRoute(routeWithContext, startLocation, targetDistance, userPreferences);
        if (enhancedRoute) {
          console.log(`✅ Successfully converted: ${enhancedRoute.name}`);
          routes.push(enhancedRoute);
        } else {
          console.warn(`❌ Failed to convert: ${claudeRoute.name}`);
        }
      }
      console.log(`✅ Total routes after Claude conversion: ${routes.length}`);
    } else {
      console.warn('❌ Claude returned no routes, will use fallback generation');
    }
  } catch (error) {
    console.error('❌ Claude route generation failed:', error);
  }
  
  // Priority 1: Routes from your actual riding history (highest priority)
  if (routes.length < 2 && ridingPatterns?.routeTemplates?.length > 0) {
    console.log(`🎯 Building personalized routes from ${ridingPatterns.routeTemplates.length} past ride templates`);
    
    const personalizedRoutes = await generateRoutesFromPersonalHistory({
      startLocation,
      targetDistance,
      trainingGoal,
      routeType,
      ridingPatterns,
      weatherData
    });
    
    routes.push(...personalizedRoutes);
    console.log(`✅ Generated ${personalizedRoutes.length} routes based on your riding history`);
  }
  
  // Priority 2: Routes built from frequent route segments
  if (routes.length < 3 && ridingPatterns?.routeSegments?.length > 0) {
    console.log(`🛣️ Building routes from ${ridingPatterns.routeSegments.length} frequently used segments`);
    
    const segmentBasedRoute = buildRouteFromSegments(
      startLocation,
      targetDistance,
      trainingGoal,
      ridingPatterns
    );
    
    if (segmentBasedRoute) {
      routes.push(segmentBasedRoute);
      console.log('✅ Successfully created route from your frequent route segments');
    }
  }
  
  // Priority 2: Try to modify existing route templates
  if (ridingPatterns?.routeTemplates?.length > 0) {
    const templateRoutes = await generateRoutesFromTemplates({
      startLocation,
      targetDistance,
      trainingGoal,
      routeType,
      weatherData,
      templates: ridingPatterns.routeTemplates
    });
    routes.push(...templateRoutes);
  }
  
  // Priority 3: Use Mapbox-based routing (NO geometric patterns)
  if (routes.length < 3) {
    console.log(`Only found ${routes.length} routes from history, generating Mapbox-based routes`);
    const mapboxRoutes = await generateMapboxBasedRoutes({
      startLocation,
      targetDistance,
      trainingGoal,
      routeType,
      weatherData,
      ridingPatterns,
      patternBasedSuggestions
    });
    
    routes.push(...mapboxRoutes);
  }

  // Filter out null/invalid routes
  const validRoutes = routes.filter(route => route !== null && route !== undefined);
  
  if (validRoutes.length === 0) {
    console.warn('No valid routes generated, creating fallback route');
    // Create one simple fallback route as last resort
    const fallbackRoute = createMockRoute('Fallback Route', targetDistance, trainingGoal, startLocation);
    return [fallbackRoute];
  }

  // Score and rank routes
  const scoredRoutes = await scoreRoutes(validRoutes, {
    trainingGoal,
    weatherData,
    timeAvailable,
    ridingPatterns,
    userPreferences
  });

  console.log(`Generated ${scoredRoutes.length} valid routes from ${routes.length} attempts`);
  
  // Return top 3-5 routes
  return scoredRoutes.slice(0, 4);
}

// Calculate target distance based on time, training goal, and performance metrics
function calculateTargetDistance(timeMinutes, trainingGoal, performanceMetrics = null) {
  // Default average speeds by training type (km/h)
  const defaultSpeedMap = {
    recovery: 20,
    endurance: 25,
    intervals: 22, // Lower due to rest periods
    hills: 18      // Slower due to climbing
  };

  let baseSpeed = defaultSpeedMap[trainingGoal] || 23;

  // Enhance with Strava performance data if available
  if (performanceMetrics && performanceMetrics.averageSpeed && performanceMetrics.confidence > 0.5) {
    const userSpeed = performanceMetrics.averageSpeed;
    
    // Adjust base speed based on training goal and user's actual performance
    const speedMultipliers = {
      recovery: 0.8,   // 20% slower for recovery
      endurance: 1.0,  // Normal pace for endurance
      intervals: 0.9,  // 10% slower due to rest periods
      hills: 0.75      // 25% slower for hills
    };
    
    const adjustedUserSpeed = userSpeed * (speedMultipliers[trainingGoal] || 1.0);
    
    // Blend user's speed with default (70% user data, 30% default)
    const confidence = Math.min(performanceMetrics.confidence, 0.8); // Max 80% influence
    baseSpeed = adjustedUserSpeed * confidence + baseSpeed * (1 - confidence);
    
    console.log(`🚴 Speed calculation enhanced with Strava data:`, {
      userAverageSpeed: userSpeed,
      trainingGoal,
      adjustedSpeed: adjustedUserSpeed,
      finalSpeed: baseSpeed,
      confidence: performanceMetrics.confidence
    });
  }

  const hours = timeMinutes / 60;
  const targetDistance = hours * baseSpeed;
  
  // Apply fitness level adjustments if available
  if (performanceMetrics?.fitnessLevel) {
    const fitnessMultipliers = {
      'excellent': 1.1,
      'good': 1.0,
      'moderate': 0.9,
      'developing': 0.8
    };
    
    const multiplier = fitnessMultipliers[performanceMetrics.fitnessLevel] || 1.0;
    return targetDistance * multiplier;
  }
  
  return targetDistance;
}

// Generate routes using Mapbox Directions API (NO geometric patterns)
async function generateMapboxBasedRoutes(params) {
  const { startLocation, targetDistance, trainingGoal, routeType, weatherData, patternBasedSuggestions, userPreferences } = params;
  const routes = [];
  
  console.log('Generating routes using Mapbox cycling intelligence');
  
  // Check for Mapbox token
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn('Mapbox token not available for route generation');
    return [createMockRoute('No Mapbox Token', targetDistance, trainingGoal, startLocation)];
  }
  
  try {
    // Generate different route types using Mapbox
    if (routeType === 'loop') {
      const loopRoutes = await generateMapboxLoops(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences);
      routes.push(...loopRoutes);
    } else if (routeType === 'out_back') {
      const outBackRoutes = await generateMapboxOutAndBack(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences);
      routes.push(...outBackRoutes);
    } else {
      // Generate both types
      const loopRoutes = await generateMapboxLoops(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences);
      const outBackRoutes = await generateMapboxOutAndBack(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences);
      routes.push(...loopRoutes.slice(0, 2), ...outBackRoutes.slice(0, 1));
    }
    
  } catch (error) {
    console.warn('Mapbox-based route generation failed:', error);
    // Only as absolute last resort, generate one carefully validated route
    const lastResort = await generateSingleValidatedRoute(startLocation, targetDistance, trainingGoal);
    if (lastResort) {
      routes.push(lastResort);
    }
  }
  
  // Filter valid routes
  let validRoutes = routes.filter(route => route !== null && route.coordinates && route.coordinates.length > 10);
  
  // Apply infrastructure validation and filtering if preferences exist
  if (userPreferences?.safetyPreferences?.bikeInfrastructure) {
    console.log('🚴 Applying infrastructure validation...');
    
    // Filter and enhance routes based on infrastructure
    validRoutes = filterRoutesByInfrastructure(validRoutes, userPreferences);
    
    // Add infrastructure metadata to each route
    validRoutes = validRoutes.map(route => enhanceRouteWithInfrastructure(route, userPreferences));
    
    // Generate infrastructure report
    const report = generateInfrastructureReport(validRoutes, userPreferences);
    console.log('📊 Infrastructure Report:', report.summary);
    if (report.recommendation) {
      console.log('💡 Recommendation:', report.recommendation);
    }
    
    // Add infrastructure info to route descriptions
    validRoutes = validRoutes.map(route => {
      if (route.infrastructure) {
        const infraNote = route.infrastructure.coverage 
          ? ` (${route.infrastructure.coverage} bike infrastructure)`
          : '';
        return {
          ...route,
          description: `${route.description || ''}${infraNote}`.trim()
        };
      }
      return route;
    });
  }
  
  return validRoutes;
}

// Generate smart cycling destinations using real cycling data
async function generateSmartDestinations(startLocation, targetDistance, isochrone) {
  const destinations = [];
  
  if (!isochrone.features || isochrone.features.length === 0) {
    return generateFallbackDestinations(startLocation, targetDistance);
  }
  
  // Use the isochrone boundaries to find realistic destinations
  const feature = isochrone.features[0]; // Use the largest time range
  const coordinates = feature.geometry.coordinates[0];
  
  // Select diverse points around the cycling-reachable area
  const numDestinations = Math.min(6, Math.floor(coordinates.length / 10));
  
  for (let i = 0; i < numDestinations; i++) {
    const index = Math.floor((coordinates.length * i) / numDestinations);
    const coord = coordinates[index];
    
    destinations.push({
      coordinates: coord,
      type: 'isochrone_boundary',
      distance: calculateDistance(startLocation, coord),
      bearing: calculateBearing(startLocation, coord)
    });
  }
  
  // Sort by how close they are to target distance
  return destinations.sort((a, b) => {
    const aDiff = Math.abs(a.distance - targetDistance / 2);
    const bDiff = Math.abs(b.distance - targetDistance / 2);
    return aDiff - bDiff;
  });
}

// Generate Mapbox-based loop routes
async function generateMapboxLoops(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences = null) {
  const routes = [];
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  
  // Generate different loop patterns using strategic waypoints
  const loopPatterns = [
    { name: 'Northern Loop', bearing: 0, radius: 0.7 },
    { name: 'Eastern Loop', bearing: 90, radius: 0.8 },
    { name: 'Southern Loop', bearing: 180, radius: 0.7 },
    { name: 'Western Loop', bearing: 270, radius: 0.8 }
  ];
  
  // Prioritize directions based on user patterns if available
  if (patternBasedSuggestions?.preferredDirection?.source === 'historical') {
    const preferredBearing = patternBasedSuggestions.preferredDirection.bearing;
    loopPatterns.sort((a, b) => {
      const aDiff = Math.abs(a.bearing - preferredBearing);
      const bDiff = Math.abs(b.bearing - preferredBearing);
      return aDiff - bDiff;
    });
  }
  
  for (let i = 0; i < Math.min(3, loopPatterns.length); i++) {
    const pattern = loopPatterns[i];
    
    try {
      const route = await generateMapboxLoop(startLocation, targetDistance, pattern, trainingGoal, mapboxToken, userPreferences);
      if (route && route.coordinates && route.coordinates.length > 20) {
        routes.push(route);
        console.log(`Successfully generated ${pattern.name} with ${route.coordinates.length} points`);
      }
    } catch (error) {
      console.warn(`Failed to generate ${pattern.name}:`, error);
    }
  }
  
  return routes;
}

// Generate Mapbox-based out-and-back routes
async function generateMapboxOutAndBack(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences = null) {
  const routes = [];
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  
  // Generate different directional out-and-back routes
  const directions = [
    { name: 'North Route', bearing: 0 },
    { name: 'Northeast Route', bearing: 45 },
    { name: 'East Route', bearing: 90 },
    { name: 'Southeast Route', bearing: 135 }
  ];
  
  // Prioritize preferred direction if available
  if (patternBasedSuggestions?.preferredDirection?.source === 'historical') {
    const preferredBearing = patternBasedSuggestions.preferredDirection.bearing;
    directions.sort((a, b) => {
      const aDiff = Math.abs(a.bearing - preferredBearing);
      const bDiff = Math.abs(b.bearing - preferredBearing);
      return aDiff - bDiff;
    });
  }
  
  for (let i = 0; i < Math.min(3, directions.length); i++) {
    const direction = directions[i];
    
    try {
      const route = await generateMapboxOutBack(startLocation, targetDistance, direction, trainingGoal, mapboxToken, patternBasedSuggestions, userPreferences);
      if (route && route.coordinates && route.coordinates.length > 10) {
        routes.push(route);
        console.log(`Successfully generated ${direction.name} with ${route.coordinates.length} points`);
      }
    } catch (error) {
      console.warn(`Failed to generate ${direction.name}:`, error);
    }
  }
  
  return routes;
}

// Generate single Mapbox loop with strategic waypoints
async function generateMapboxLoop(startLocation, targetDistance, pattern, trainingGoal, mapboxToken, userPreferences = null) {
  const [startLon, startLat] = startLocation;
  
  // Calculate strategic waypoints for a realistic loop
  const radius = (targetDistance / (2 * Math.PI)) * pattern.radius;
  const waypoints = [startLocation];
  
  // Create 3-4 strategic waypoints instead of many geometric points
  const numWaypoints = 3;
  for (let i = 1; i <= numWaypoints; i++) {
    const angle = (pattern.bearing + (i * (360 / (numWaypoints + 1)))) * (Math.PI / 180);
    
    // Add variation but keep it realistic
    const angleVariation = angle + (Math.random() - 0.5) * 0.3;
    const radiusVariation = radius * (0.7 + Math.random() * 0.6);
    
    const deltaLat = (radiusVariation / 111.32) * Math.cos(angleVariation);
    const deltaLon = (radiusVariation / (111.32 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angleVariation);
    
    waypoints.push([startLon + deltaLon, startLat + deltaLat]);
  }
  
  // Close the loop
  waypoints.push(startLocation);
  
  try {
    console.log(`Generating ${pattern.name} with ${waypoints.length} waypoints`);
    
    // Use Mapbox Directions API for realistic cycling routes with user preferences
    const route = await getCyclingDirections(waypoints, mapboxToken, {
      profile: getMapboxProfile(trainingGoal),
      preferences: userPreferences
    });
    
    // Validate the route
    if (!route.coordinates || route.coordinates.length < 20 || route.confidence < 0.5) {
      console.warn(`${pattern.name} generated poor quality route, skipping`);
      return null;
    }
    
    // Check route complexity to avoid geometric patterns (relaxed threshold)
    const complexity = calculateRouteComplexity(route.coordinates);
    if (complexity < 0.03) { // Reduced from 0.1 to 0.03 to be less strict
      console.warn(`${pattern.name} appears too geometric (complexity: ${complexity.toFixed(2)}), skipping`);
      return null;
    }
    
    // Get elevation profile
    const elevationProfile = await fetchElevationProfile(route.coordinates, mapboxToken);
    const elevationStats = calculateElevationStats(elevationProfile);
    
    return {
      name: `${pattern.name} - ${getRouteNameByGoal(trainingGoal)}`,
      distance: route.distance / 1000,
      elevationGain: elevationStats.gain,
      elevationLoss: elevationStats.loss,
      coordinates: route.coordinates,
      difficulty: calculateDifficulty(route.distance / 1000, elevationStats.gain),
      description: `Cycling loop using Mapbox routing intelligence (${getMapboxProfile(trainingGoal)} profile)`,
      trainingGoal,
      pattern: 'loop',
      confidence: route.confidence,
      source: 'mapbox',
      elevationProfile,
      windFactor: 0.8
    };
    
  } catch (error) {
    console.warn(`Failed to generate ${pattern.name}:`, error);
    return null;
  }
}

// Generate single Mapbox out-and-back route
async function generateMapboxOutBack(startLocation, targetDistance, direction, trainingGoal, mapboxToken, patternBasedSuggestions, userPreferences = null) {
  const [startLon, startLat] = startLocation;
  const halfDistance = targetDistance / 2;
  
  // Check for nearby frequent areas in the preferred direction
  const nearbyAreas = patternBasedSuggestions?.nearbyFrequentAreas || [];
  let targetPoint = null;
  
  // Try to use a frequent area as the turnaround point
  for (const area of nearbyAreas) {
    const areaBearing = calculateBearing(startLocation, area.center);
    const bearingDiff = Math.abs(areaBearing - direction.bearing);
    const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
    
    const distanceToArea = calculateDistance(startLocation, area.center);
    
    // Use area if it's roughly in the right direction and distance
    if (normalizedDiff < 45 && 
        distanceToArea > halfDistance * 0.5 && 
        distanceToArea < halfDistance * 1.5) {
      targetPoint = area.center;
      console.log(`Using frequent area as turnaround point for ${direction.name}`);
      break;
    }
  }
  
  // If no suitable frequent area, calculate target point
  if (!targetPoint) {
    // Add some variation to avoid perfectly straight lines
    const angle = direction.bearing * (Math.PI / 180);
    const angleVariation = angle + (Math.random() - 0.5) * 0.2;
    const distanceVariation = halfDistance * (0.8 + Math.random() * 0.4);
    
    const deltaLat = (distanceVariation / 111.32) * Math.cos(angleVariation);
    const deltaLon = (distanceVariation / (111.32 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angleVariation);
    
    targetPoint = [startLon + deltaLon, startLat + deltaLat];
  }
  
  try {
    // Use Mapbox cycling directions to get realistic route
    const outboundRoute = await getCyclingDirections([startLocation, targetPoint], mapboxToken, {
      profile: getMapboxProfile(trainingGoal),
      preferences: userPreferences
    });
    
    if (!outboundRoute.coordinates || outboundRoute.coordinates.length < 5) {
      console.warn(`Failed to generate realistic outbound route for ${direction.name}`);
      return null;
    }
    
    // Create the return journey (reverse the coordinates)
    const returnCoordinates = [...outboundRoute.coordinates].reverse();
    
    // Combine outbound and return for full route
    const fullCoordinates = [...outboundRoute.coordinates, ...returnCoordinates.slice(1)];
    
    const elevationProfile = await fetchElevationProfile(fullCoordinates, mapboxToken);
    const elevationStats = calculateElevationStats(elevationProfile);
    
    return {
      name: `${direction.name} - ${getRouteNameByGoal(trainingGoal)}`,
      distance: (outboundRoute.distance * 2) / 1000,
      elevationGain: elevationStats.gain,
      elevationLoss: elevationStats.loss,
      coordinates: fullCoordinates,
      difficulty: calculateDifficulty((outboundRoute.distance * 2) / 1000, elevationStats.gain),
      description: `Out-and-back route using Mapbox cycling intelligence (${getMapboxProfile(trainingGoal)} profile)`,
      trainingGoal,
      pattern: 'out_back',
      confidence: outboundRoute.confidence,
      source: 'mapbox',
      elevationProfile,
      windFactor: 0.8
    };
    
  } catch (error) {
    console.warn(`Failed to generate out-and-back route for ${direction.name}:`, error);
    return null;
  }
}

// Calculate destination point given start, distance, and bearing
function calculateDestinationPoint(start, distanceKm, bearingDegrees) {
  const [lon, lat] = start;
  const R = 6371; // Earth's radius in km
  
  const bearing = bearingDegrees * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
    Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearing)
  );
  
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distanceKm / R) * Math.cos(lat1),
    Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI];
}

// Convert Claude route suggestion to full route with coordinates
async function convertClaudeToFullRoute(claudeRoute, startLocation, targetDistance, preferences = null) {
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn('Mapbox token not available for Claude route conversion');
    return {
      ...claudeRoute,
      coordinates: generateMockCoordinates(startLocation, claudeRoute.distance),
      confidence: 0.6
    };
  }

  try {
    // Generate strategic waypoints based on Claude's directions
    const waypoints = await generateWaypointsFromDirections(
      claudeRoute.keyDirections, 
      startLocation, 
      claudeRoute.distance || claudeRoute.estimatedDistance,
      claudeRoute.routeType || 'loop',
      claudeRoute.pastRidePatterns
    );

    // Use Mapbox to create realistic route
    const route = await getCyclingDirections(waypoints, mapboxToken, {
      profile: getMapboxProfile(claudeRoute.trainingGoal),
      preferences: preferences
    });

    if (route && route.coordinates && route.coordinates.length > 10) {
      // Get elevation profile
      const elevationProfile = await fetchElevationProfile(route.coordinates, mapboxToken);
      const elevationStats = calculateElevationStats(elevationProfile);

      return {
        ...claudeRoute,
        distance: route.distance / 1000,
        elevationGain: elevationStats.gain,
        elevationLoss: elevationStats.loss,
        coordinates: route.coordinates,
        confidence: route.confidence * 0.9, // Slightly lower since it's AI-generated
        elevationProfile,
        source: 'claude_mapbox'
      };
    }
  } catch (error) {
    console.warn('Failed to convert Claude route to full route:', error);
  }

  // Fallback to mock route if Mapbox fails
  return {
    ...claudeRoute,
    coordinates: generateMockCoordinates(startLocation, claudeRoute.distance),
    confidence: 0.5,
    source: 'claude_mock'
  };
}

// Generate waypoints from Claude's turn-by-turn directions with route type awareness
async function generateWaypointsFromDirections(directions, startLocation, targetDistance, routeType = 'loop', pastRidePatterns = null) {
  console.log('🧭 Generating waypoints:', {directions, startLocation, targetDistance, routeType});
  const waypoints = [startLocation];
  
  // Use different strategies based on route type
  if (routeType === 'loop') {
    return generateLoopWaypoints(startLocation, targetDistance, directions, pastRidePatterns);
  } else if (routeType === 'out_back') {
    return generateOutAndBackWaypoints(startLocation, targetDistance, directions, pastRidePatterns);
  } else if (routeType === 'point_to_point') {
    return generatePointToPointWaypoints(startLocation, targetDistance, directions, pastRidePatterns);
  }
  
  // Fallback to loop if route type not recognized
  return generateLoopWaypoints(startLocation, targetDistance, directions, pastRidePatterns);
}

// Generate realistic loop route waypoints
function generateLoopWaypoints(startLocation, targetDistance, directions, pastRidePatterns) {
  const waypoints = [startLocation];
  const numWaypoints = Math.min(6, Math.max(3, Math.floor(targetDistance / 12)));
  
  // Create a more realistic loop using varied distances and intelligent bearing selection
  const baseRadius = targetDistance / (2 * Math.PI) * 0.8;
  
  // If we have past ride patterns, bias towards those areas
  const preferredDirections = pastRidePatterns?.preferredDirections || [];
  
  for (let i = 1; i <= numWaypoints; i++) {
    let angle;
    
    if (preferredDirections.length > 0 && Math.random() > 0.3) {
      // 70% chance to use preferred directions from past rides
      const preferred = preferredDirections[Math.floor(Math.random() * preferredDirections.length)];
      const baseAngle = preferred.direction === 'north' ? 0 : 
                      preferred.direction === 'northeast' ? 45 :
                      preferred.direction === 'east' ? 90 :
                      preferred.direction === 'southeast' ? 135 :
                      preferred.direction === 'south' ? 180 :
                      preferred.direction === 'southwest' ? 225 :
                      preferred.direction === 'west' ? 270 : 315;
      angle = baseAngle + (i * 360 / numWaypoints) + Math.random() * 40 - 20;
    } else {
      // Create varied, non-uniform spacing for more natural routes
      const progress = i / numWaypoints;
      const baseAngle = progress * 360;
      angle = baseAngle + Math.sin(progress * Math.PI * 2) * 30 + Math.random() * 25 - 12.5;
    }
    
    // Vary distance to create interesting shapes (not perfect circles)
    const distanceVariation = Math.sin(i * Math.PI / 2) * 0.3 + 1; // Creates oval/figure-8 shapes
    const distance = baseRadius * distanceVariation + Math.random() * (baseRadius * 0.2) - (baseRadius * 0.1);
    
    const waypoint = calculateDestinationPoint(startLocation, distance, angle);
    console.log(`📍 Loop Waypoint ${i}:`, {angle: Math.round(angle), distance: Math.round(distance), waypoint});
    waypoints.push(waypoint);
  }
  
  // Always return to start for loops
  waypoints.push(startLocation);
  console.log('🧭 Final loop waypoints:', waypoints.length);
  return waypoints;
}

// Generate out-and-back route waypoints
function generateOutAndBackWaypoints(startLocation, targetDistance, directions, pastRidePatterns) {
  const waypoints = [startLocation];
  const outboundDistance = targetDistance / 2;
  
  // Choose a primary direction for the out-and-back
  let primaryBearing = Math.random() * 360;
  
  // Use preferred directions if available
  if (pastRidePatterns?.preferredDirections?.length > 0) {
    const preferred = pastRidePatterns.preferredDirections[0];
    const directionMap = {
      'north': 0, 'northeast': 45, 'east': 90, 'southeast': 135,
      'south': 180, 'southwest': 225, 'west': 270, 'northwest': 315
    };
    primaryBearing = directionMap[preferred.direction] || Math.random() * 360;
  }
  
  // Add some waypoints along the outbound journey
  const numOutboundWaypoints = Math.min(3, Math.max(1, Math.floor(outboundDistance / 10)));
  
  for (let i = 1; i <= numOutboundWaypoints; i++) {
    const progress = i / (numOutboundWaypoints + 1);
    const distance = outboundDistance * progress;
    const bearing = primaryBearing + Math.random() * 20 - 10; // Small variations
    
    const waypoint = calculateDestinationPoint(startLocation, distance, bearing);
    console.log(`📍 Outbound Waypoint ${i}:`, {bearing: Math.round(bearing), distance: Math.round(distance)});
    waypoints.push(waypoint);
  }
  
  // Final outbound point (turnaround)
  const turnaroundPoint = calculateDestinationPoint(startLocation, outboundDistance, primaryBearing);
  waypoints.push(turnaroundPoint);
  console.log(`🔄 Turnaround point:`, {bearing: Math.round(primaryBearing), distance: Math.round(outboundDistance)});
  
  // Return journey - same points in reverse (Mapbox will route back)
  waypoints.push(startLocation);
  
  console.log('🧭 Final out-and-back waypoints:', waypoints.length);
  return waypoints;
}

// Generate point-to-point route waypoints  
function generatePointToPointWaypoints(startLocation, targetDistance, directions, pastRidePatterns) {
  const waypoints = [startLocation];
  
  // Choose destination direction
  let destinationBearing = Math.random() * 360;
  if (pastRidePatterns?.preferredDirections?.length > 0) {
    const preferred = pastRidePatterns.preferredDirections[0];
    const directionMap = {
      'north': 0, 'northeast': 45, 'east': 90, 'southeast': 135,
      'south': 180, 'southwest': 225, 'west': 270, 'northwest': 315
    };
    destinationBearing = directionMap[preferred.direction] || Math.random() * 360;
  }
  
  // Add intermediate waypoints
  const numWaypoints = Math.min(4, Math.max(2, Math.floor(targetDistance / 15)));
  
  for (let i = 1; i <= numWaypoints; i++) {
    const progress = i / (numWaypoints + 1);
    const distance = targetDistance * progress;
    const bearing = destinationBearing + Math.random() * 30 - 15; // Allow some meandering
    
    const waypoint = calculateDestinationPoint(startLocation, distance, bearing);
    console.log(`📍 P2P Waypoint ${i}:`, {bearing: Math.round(bearing), distance: Math.round(distance)});
    waypoints.push(waypoint);
  }
  
  // Final destination
  const destination = calculateDestinationPoint(startLocation, targetDistance, destinationBearing);
  waypoints.push(destination);
  
  console.log('🧭 Final point-to-point waypoints:', waypoints.length);
  return waypoints;
}

// Generate routes based on user's personal riding history
async function generateRoutesFromPersonalHistory(params) {
  const {
    startLocation,
    targetDistance,
    trainingGoal,
    routeType,
    ridingPatterns,
    weatherData
  } = params;

  const routes = [];
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.warn('Mapbox token required for personal history routes');
    return routes;
  }

  // Find templates that match current preferences
  const suitableTemplates = ridingPatterns.routeTemplates
    .filter(template => {
      // Filter by route type if specified
      if (routeType && template.routeType !== routeType) return false;
      
      // Filter by similar distance (within 30% of target)
      const distanceDiff = Math.abs(template.baseDistance - targetDistance) / targetDistance;
      if (distanceDiff > 0.3) return false;
      
      // Filter by training goal compatibility
      if (!isTemplateCompatibleWithTrainingGoal(template, trainingGoal)) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Prioritize by confidence and recency
      const aScore = a.confidence * 0.6 + (new Date(a.timestamp).getTime() / 1000000000000) * 0.4;
      const bScore = b.confidence * 0.6 + (new Date(b.timestamp).getTime() / 1000000000000) * 0.4;
      return bScore - aScore;
    })
    .slice(0, 3); // Top 3 templates

  console.log(`📋 Found ${suitableTemplates.length} suitable templates from your riding history`);

  for (const template of suitableTemplates) {
    try {
      console.log(`🔄 Adapting template: ${template.name}`);
      
      // Adapt the template to start from current location
      const adaptedRoute = await adaptTemplateToNewStart(template, startLocation, targetDistance, mapboxToken);
      
      if (adaptedRoute) {
        // Enhance with weather and training goal context
        const enhancedRoute = {
          ...adaptedRoute,
          name: `${template.name} (Adapted)`,
          description: `Based on your ${template.routeType} ride from ${new Date(template.timestamp).toLocaleDateString()}. ${getPersonalizationDescription(template, ridingPatterns)}`,
          trainingGoal,
          pattern: 'personal_history',
          confidence: template.confidence * 0.9, // Slightly lower since it's adapted
          source: 'personal_template',
          originalTemplate: template.id,
          personalizedFeatures: analyzePersonalizedFeatures(template, ridingPatterns)
        };

        routes.push(enhancedRoute);
        console.log(`✅ Successfully adapted template: ${template.name}`);
      }
    } catch (error) {
      console.warn(`Failed to adapt template ${template.name}:`, error);
    }
  }

  return routes;
}

// Check if a template is compatible with the training goal
function isTemplateCompatibleWithTrainingGoal(template, trainingGoal) {
  const compatibilityMap = {
    recovery: ['easy'], // Only easy routes for recovery
    endurance: ['easy', 'moderate', 'challenging'], // Most routes work for endurance
    intervals: ['easy', 'moderate'], // Need routes with good interval sections
    hills: ['challenging', 'hard'] // Need routes with elevation
  };

  const compatibleDifficulties = compatibilityMap[trainingGoal] || ['easy', 'moderate'];
  return compatibleDifficulties.includes(template.difficulty);
}

// Adapt a route template to start from a new location
async function adaptTemplateToNewStart(template, newStartLocation, targetDistance, mapboxToken) {
  try {
    // Calculate how to modify the template
    const originalStart = template.startArea;
    const displacement = [
      newStartLocation[0] - originalStart[0], // longitude difference
      newStartLocation[1] - originalStart[1]  // latitude difference
    ];

    // Shift all waypoints by the displacement
    const adaptedWaypoints = [newStartLocation]; // Start from new location
    
    // Add key waypoints from the template, shifted to new area
    template.keyPoints.slice(1, -1).forEach(point => {
      adaptedWaypoints.push([
        point.lon + displacement[0],
        point.lat + displacement[1]
      ]);
    });

    // If it's a loop, return to start; otherwise, adapt the end point
    if (template.routeType === 'loop') {
      adaptedWaypoints.push(newStartLocation);
    } else {
      const originalEnd = template.endArea;
      adaptedWaypoints.push([
        originalEnd[0] + displacement[0],
        originalEnd[1] + displacement[1]
      ]);
    }

    // Use Mapbox to create a realistic route through these waypoints
    const route = await getCyclingDirections(adaptedWaypoints, mapboxToken, {
      profile: getMapboxProfile(template.difficulty)
    });

    if (!route || !route.coordinates || route.coordinates.length < 10) {
      console.warn('Failed to generate realistic adapted route');
      return null;
    }

    // Scale the route to match target distance
    const scaleFactor = targetDistance / (route.distance / 1000);
    if (scaleFactor < 0.7 || scaleFactor > 1.3) {
      // Too much scaling needed, skip this template
      console.warn(`Route scaling factor ${scaleFactor.toFixed(2)} too extreme, skipping`);
      return null;
    }

    // Get elevation profile
    const elevationProfile = await fetchElevationProfile(route.coordinates, mapboxToken);
    const elevationStats = calculateElevationStats(elevationProfile);

    return {
      coordinates: route.coordinates,
      distance: route.distance / 1000,
      elevationGain: elevationStats.gain,
      elevationLoss: elevationStats.loss,
      elevationProfile,
      difficulty: template.difficulty,
      routeType: template.routeType,
      windFactor: 0.8
    };

  } catch (error) {
    console.warn('Failed to adapt template:', error);
    return null;
  }
}

// Generate personalized description based on riding patterns
function getPersonalizationDescription(template, ridingPatterns) {
  const features = [];
  
  if (ridingPatterns.preferredDirections.length > 0) {
    const mainDirection = ridingPatterns.preferredDirections[0];
    features.push(`follows your preferred ${mainDirection.direction} direction`);
  }
  
  if (ridingPatterns.frequentAreas.length > 0) {
    features.push(`passes through areas you frequently ride`);
  }
  
  if (template.pattern === 'gentle_curves') {
    features.push(`matches your preference for scenic winding routes`);
  } else if (template.pattern === 'straight') {
    features.push(`matches your preference for direct routes`);
  }
  
  return features.length > 0 ? `This route ${features.join(' and ')}.` : 'Personalized based on your riding history.';
}

// Analyze personalized features of this route
function analyzePersonalizedFeatures(template, ridingPatterns) {
  const features = {
    matchesPreferredDistance: false,
    matchesPreferredDirection: false,
    passesFrequentAreas: false,
    matchesElevationPreference: false,
    matchesRoutePattern: false
  };

  // Check distance preference
  if (ridingPatterns.preferredDistances?.mean) {
    const distanceDiff = Math.abs(template.baseDistance - ridingPatterns.preferredDistances.mean) / ridingPatterns.preferredDistances.mean;
    features.matchesPreferredDistance = distanceDiff < 0.2; // Within 20%
  }

  // Check direction preference
  if (ridingPatterns.preferredDirections.length > 0) {
    const templateBearing = calculateBearing(template.startArea, template.endArea);
    const preferredBearing = ridingPatterns.preferredDirections[0].bearing;
    const bearingDiff = Math.abs(templateBearing - preferredBearing);
    const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
    features.matchesPreferredDirection = normalizedDiff < 45; // Within 45 degrees
  }

  // Check elevation preference
  if (ridingPatterns.elevationTolerance?.preferred) {
    const elevationDiff = Math.abs(template.baseElevation - ridingPatterns.elevationTolerance.preferred) / ridingPatterns.elevationTolerance.preferred;
    features.matchesElevationPreference = elevationDiff < 0.3; // Within 30%
  }

  return features;
}

// Generate fallback destinations when isochrone fails
function generateFallbackDestinations(startLocation, targetDistance) {
  const destinations = [];
  const numDestinations = 4;
  
  for (let i = 0; i < numDestinations; i++) {
    const bearing = (360 / numDestinations) * i + Math.random() * 30 - 15; // Add some variation
    const distance = targetDistance * (0.3 + Math.random() * 0.4); // 30-70% of target
    
    const destination = calculateDestinationPoint(startLocation, distance, bearing);
    destinations.push({
      coordinates: destination,
      type: 'calculated',
      distance,
      bearing
    });
  }
  
  return destinations;
}

// Get display name for route type

// Generate single validated route as absolute last resort
async function generateSingleValidatedRoute(startLocation, targetDistance, trainingGoal) {
  console.log('Generating single validated route as last resort using Mapbox');
  
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn('No Mapbox token available for last resort route');
    return null;
  }
  
  // Try a simple out-and-back in the most promising direction
  const destination = calculateDestinationPoint(startLocation, targetDistance / 2, 45); // Northeast
  
  try {
    const route = await getCyclingDirections([startLocation, destination], mapboxToken, {
      profile: getMapboxProfile(trainingGoal)
    });
    
    if (route && route.coordinates && route.coordinates.length > 10) {
      const returnCoords = [...route.coordinates].reverse();
      const fullCoords = [...route.coordinates, ...returnCoords.slice(1)];
      
      const elevationProfile = await fetchElevationProfile(fullCoords, mapboxToken);
      const elevationStats = calculateElevationStats(elevationProfile);
      
      return {
        name: 'Validated Mapbox Route',
        distance: (route.distance * 2) / 1000,
        elevationGain: elevationStats.gain,
        elevationLoss: elevationStats.loss,
        coordinates: fullCoords,
        difficulty: calculateDifficulty((route.distance * 2) / 1000, elevationStats.gain),
        description: 'Carefully validated cycling route using Mapbox Directions API',
        trainingGoal,
        pattern: 'out_back',
        confidence: route.confidence * 0.8,
        source: 'mapbox_validated',
        elevationProfile
      };
    }
  } catch (error) {
    console.warn('Failed to generate last resort Mapbox route:', error);
  }
  
  return null;
}

// Generate multiple route variations using Mapbox (DEPRECATED - use generateMapboxBasedRoutes instead)
async function generateRouteVariations(params) {
  console.log('DEPRECATED: generateRouteVariations called - redirecting to Mapbox-based generation');
  return await generateMapboxBasedRoutes(params);
}

// Generate loop routes using real ride data
async function generateLoopRoutes(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions, userPreferences = null) {
  const routes = [];
  
  // Priority 1: Try to build loops from actual route segments
  const segmentBasedLoops = await buildLoopsFromSegments(
    startLocation, 
    targetDistance, 
    trainingGoal, 
    patternBasedSuggestions
  );
  routes.push(...segmentBasedLoops);
  
  // Priority 2: Try to use past loop templates
  if (patternBasedSuggestions?.nearbyFrequentAreas?.length > 0) {
    const frequentAreaLoops = await buildLoopsFromFrequentAreas(
      startLocation,
      targetDistance,
      trainingGoal,
      weatherData,
      patternBasedSuggestions.nearbyFrequentAreas
    );
    routes.push(...frequentAreaLoops);
  }
  
  // Priority 3: Use Mapbox cycling intelligence instead of geometric patterns
  if (routes.length === 0) {
    console.log('No routes found from ride data, using Mapbox cycling intelligence');
    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
    if (mapboxToken) {
      const mapboxRoute = await generateMapboxLoop(startLocation, targetDistance, 
        { name: 'Fallback Loop', bearing: 45, radius: 0.8 }, trainingGoal, mapboxToken, userPreferences);
      
      if (mapboxRoute) {
        routes.push(mapboxRoute);
      }
    }
  }

  console.log(`Generated ${routes.length} loop routes (${routes.filter(r => r.source === 'segments').length} from segments, ${routes.filter(r => r.source === 'areas').length} from frequent areas)`);
  
  return routes;
}

// Build loops using actual route segments from past rides
async function buildLoopsFromSegments(startLocation, targetDistance, trainingGoal, patternBasedSuggestions) {
  const routes = [];
  
  if (!patternBasedSuggestions?.ridingPatterns?.routeSegments) {
    return routes;
  }
  
  const segments = patternBasedSuggestions.ridingPatterns.routeSegments;
  
  // Find segments near the start location
  const nearbySegments = segments.filter(segment => {
    const distanceToStart = calculateDistance(startLocation, segment.startPoint);
    const distanceToEnd = calculateDistance(startLocation, segment.endPoint);
    return Math.min(distanceToStart, distanceToEnd) < 3; // Within 3km
  });
  
  if (nearbySegments.length === 0) {
    return routes;
  }
  
  // Try to chain segments into a loop
  for (let i = 0; i < Math.min(2, nearbySegments.length); i++) {
    const primarySegment = nearbySegments[i];
    
    // Try to find other segments that could complete a loop
    const completingSegments = segments.filter(segment => {
      if (segment === primarySegment) return false;
      
      // Check if this segment could connect back to start
      const endToSegmentStart = calculateDistance(primarySegment.endPoint, segment.startPoint);
      const endToSegmentEnd = calculateDistance(primarySegment.endPoint, segment.endPoint);
      const segmentToStart = calculateDistance(
        endToSegmentStart < endToSegmentEnd ? segment.endPoint : segment.startPoint,
        startLocation
      );
      
      return Math.min(endToSegmentStart, endToSegmentEnd) < 2 && segmentToStart < 2;
    });
    
    if (completingSegments.length > 0) {
      const loop = await buildSegmentLoop(startLocation, primarySegment, completingSegments[0], targetDistance, trainingGoal);
      if (loop) {
        routes.push(loop);
      }
    }
  }
  
  return routes;
}

// Build loops using frequent riding areas
async function buildLoopsFromFrequentAreas(startLocation, targetDistance, trainingGoal, weatherData, frequentAreas) {
  const routes = [];
  
  // Find areas that would make good loop destinations
  const suitableAreas = frequentAreas.filter(area => {
    const distance = calculateDistance(startLocation, area.center);
    return distance > targetDistance * 0.2 && distance < targetDistance * 0.8; // Between 20-80% of target distance
  });
  
  if (suitableAreas.length === 0) {
    return routes;
  }
  
  // Try to create loops through the most frequently used areas
  for (let i = 0; i < Math.min(2, suitableAreas.length); i++) {
    const area = suitableAreas[i];
    
    const loop = await createLoopThroughArea(startLocation, area.center, targetDistance, trainingGoal);
    if (loop) {
      routes.push({
        ...loop,
        name: `Loop via Frequent Area ${i + 1}`,
        description: `Route through an area you ride frequently (visited ${area.frequency} times)`,
        source: 'areas',
        confidence: area.confidence * 0.8
      });
    }
  }
  
  return routes;
}

// REMOVED: No more geometric patterns! All routes now use OpenStreetMap cycling intelligence.

// Build a loop from two segments
async function buildSegmentLoop(startLocation, segment1, segment2, targetDistance, trainingGoal) {
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) return null;
  
  try {
    // Determine the best order to connect segments
    const waypoints = [startLocation];
    
    // Add segment 1
    const distToSeg1Start = calculateDistance(startLocation, segment1.startPoint);
    const distToSeg1End = calculateDistance(startLocation, segment1.endPoint);
    
    if (distToSeg1Start < distToSeg1End) {
      waypoints.push(...segment1.coordinates.slice(1)); // Skip duplicate start
    } else {
      waypoints.push(...[...segment1.coordinates].reverse().slice(1));
    }
    
    // Add segment 2 (connecting back to start)
    const lastPoint = waypoints[waypoints.length - 1];
    const distToSeg2Start = calculateDistance(lastPoint, segment2.startPoint);
    const distToSeg2End = calculateDistance(lastPoint, segment2.endPoint);
    
    if (distToSeg2Start < distToSeg2End) {
      waypoints.push(...segment2.coordinates.slice(1));
    } else {
      waypoints.push(...[...segment2.coordinates].reverse().slice(1));
    }
    
    // Close the loop
    waypoints.push(startLocation);
    
    // Validate and clean up the route
    const route = await getCyclingDirections(waypoints, mapboxToken);
    
    if (route.coordinates && route.coordinates.length > 10) {
      const elevationProfile = await fetchElevationProfile(route.coordinates, mapboxToken);
      const elevationStats = calculateElevationStats(elevationProfile);
      
      return {
        name: 'Loop from Your Routes',
        distance: route.distance / 1000,
        elevationGain: elevationStats.gain,
        elevationLoss: elevationStats.loss,
        coordinates: route.coordinates,
        difficulty: calculateDifficulty(route.distance / 1000, elevationStats.gain),
        description: 'Built from segments of your actual rides',
        trainingGoal,
        pattern: 'loop',
        confidence: 0.9, // High confidence since it uses real segments
        elevationProfile,
        source: 'segments'
      };
    }
  } catch (error) {
    console.warn('Failed to build segment loop:', error);
  }
  
  return null;
}

// Create loop through a frequent area
async function createLoopThroughArea(startLocation, areaCenter, targetDistance, trainingGoal) {
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) return null;
  
  try {
    // Create a simple route: start -> area -> back to start
    const waypoints = [startLocation, areaCenter, startLocation];
    
    const route = await getCyclingDirections(waypoints, mapboxToken);
    
    if (route.coordinates && route.coordinates.length > 10) {
      const elevationProfile = await fetchElevationProfile(route.coordinates, mapboxToken);
      const elevationStats = calculateElevationStats(elevationProfile);
      
      return {
        distance: route.distance / 1000,
        elevationGain: elevationStats.gain,
        elevationLoss: elevationStats.loss,
        coordinates: route.coordinates,
        difficulty: calculateDifficulty(route.distance / 1000, elevationStats.gain),
        trainingGoal,
        pattern: 'loop',
        elevationProfile
      };
    }
  } catch (error) {
    console.warn('Failed to create area loop:', error);
  }
  
  return null;
}

// Generate a specific loop pattern
async function generateLoopPattern(startLocation, targetDistance, pattern, trainingGoal, weatherData, patternBasedSuggestions) {
  const [startLon, startLat] = startLocation;
  
  // Calculate approximate radius for the loop
  const radius = (targetDistance / (2 * Math.PI)) * 0.9; // Slightly larger for realistic cycling routes
  
  // Check if we have nearby frequent areas to incorporate
  const nearbyAreas = patternBasedSuggestions?.nearbyFrequentAreas || [];
  
  // Generate fewer, more realistic waypoints
  const waypoints = [startLocation];
  
  // Try a simpler approach: create 2-3 intermediate points for a more natural route
  const numIntermediatePoints = Math.min(3, Math.max(2, Math.floor(targetDistance / 15))); // 1 point per 15km roughly
  
  for (let i = 1; i <= numIntermediatePoints; i++) {
    let targetPoint;
    
    // Try to use frequent areas first
    if (nearbyAreas.length > 0 && i <= nearbyAreas.length) {
      const area = nearbyAreas[i - 1];
      const distanceToArea = calculateDistance(startLocation, area.center);
      
      // Use frequent area if it's within reasonable distance
      if (distanceToArea < targetDistance * 0.8 && distanceToArea > targetDistance * 0.2) {
        targetPoint = area.center;
        console.log(`Using frequent area for waypoint ${i}:`, area.center);
      }
    }
    
    // Generate more realistic waypoint based on road network considerations
    if (!targetPoint) {
      // Use smaller radius and less random variation
      const segmentRadius = radius * (0.5 + i * 0.3); // Gradually increase distance
      const angle = (pattern.bearing + (i * (360 / (numIntermediatePoints + 1)))) * (Math.PI / 180);
      
      // Reduced randomness for more predictable routes
      const angleVariation = angle + (Math.random() - 0.5) * 0.2; // Reduced from 0.5
      const radiusVariation = segmentRadius * (0.9 + Math.random() * 0.2); // Reduced variation
      
      const deltaLat = (radiusVariation / 111.32) * Math.cos(angleVariation);
      const deltaLon = (radiusVariation / (111.32 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angleVariation);
      
      targetPoint = [startLon + deltaLon, startLat + deltaLat];
    }
    
    waypoints.push(targetPoint);
  }
  
  // Close the loop
  waypoints.push(startLocation);

  // Get Mapbox token
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn('Mapbox token not available for route generation');
    return createMockRoute(pattern.name, targetDistance, trainingGoal);
  }

  try {
    console.log(`Generating ${pattern.name} with waypoints:`, waypoints.length);
    
    // Use Directions API first for better cycling routes
    let snappedRoute = await getCyclingDirections(waypoints, mapboxToken, {
      profile: getMapboxProfile(trainingGoal)
    });

    // Validate the directions result
    const isDirectionsValid = snappedRoute.coordinates && 
                             snappedRoute.coordinates.length > 10 && // Ensure reasonable detail
                             snappedRoute.confidence > 0.7 && // High confidence
                             snappedRoute.distance > (targetDistance * 0.5 * 1000) && // At least 50% of target distance
                             snappedRoute.distance < (targetDistance * 2 * 1000); // Not more than 200% of target

    // If directions API fails or gives poor results, try map matching
    if (!isDirectionsValid) {
      console.log('Directions API result not suitable, trying map matching for:', pattern.name);
      snappedRoute = await mapMatchRoute(waypoints, mapboxToken, {
        profile: getMapboxProfile(trainingGoal)
      });
      
      // Validate map matching result
      const isMapMatchValid = snappedRoute.coordinates && 
                             snappedRoute.coordinates.length > 5 && 
                             snappedRoute.confidence > 0.3 &&
                             snappedRoute.distance > (targetDistance * 0.3 * 1000);
      
      if (!isMapMatchValid) {
        console.warn('Both directions and map matching produced poor results for:', pattern.name);
        return null; // Return null instead of mock route
      }
    }

    // Additional validation: check if route is too geometric (straight lines)
    if (snappedRoute.coordinates && snappedRoute.coordinates.length > 2) {
      const routeComplexity = calculateRouteComplexity(snappedRoute.coordinates);
      if (routeComplexity < 0.03) { // Too simple/geometric (relaxed threshold)
        console.warn('Route appears too geometric, skipping:', pattern.name);
        return null;
      }
    }

    // Get elevation profile
    const elevationProfile = await fetchElevationProfile(snappedRoute.coordinates, mapboxToken);
    const elevationStats = calculateElevationStats(elevationProfile);

    return {
      name: `${pattern.name} - ${getRouteNameByGoal(trainingGoal)}`,
      distance: snappedRoute.distance / 1000, // Convert to km
      elevationGain: elevationStats.gain,
      elevationLoss: elevationStats.loss,
      coordinates: snappedRoute.coordinates,
      difficulty: calculateDifficulty(snappedRoute.distance / 1000, elevationStats.gain),
      description: generateRouteDescription(trainingGoal, pattern.variation, elevationStats),
      trainingGoal,
      pattern: pattern.variation,
      confidence: snappedRoute.confidence,
      elevationProfile,
      windFactor: calculateWindFactor(snappedRoute.coordinates, weatherData)
    };

  } catch (error) {
    console.warn('Route snapping failed, using mock route:', error);
    return createMockRoute(pattern.name, targetDistance, trainingGoal, startLocation);
  }
}

// Calculate distance between two points (simple approximation)
function calculateDistance([lon1, lat1], [lon2, lat2]) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate route complexity to detect overly geometric routes
function calculateRouteComplexity(coordinates) {
  if (coordinates.length < 3) return 0;
  
  let totalBearingChange = 0;
  let segmentCount = 0;
  
  for (let i = 1; i < coordinates.length - 1; i++) {
    const bearing1 = calculateBearing(coordinates[i - 1], coordinates[i]);
    const bearing2 = calculateBearing(coordinates[i], coordinates[i + 1]);
    
    // Calculate bearing change (absolute difference)
    let bearingChange = Math.abs(bearing2 - bearing1);
    if (bearingChange > 180) bearingChange = 360 - bearingChange;
    
    totalBearingChange += bearingChange;
    segmentCount++;
  }
  
  // Return average bearing change normalized (higher = more complex/realistic)
  return segmentCount > 0 ? (totalBearingChange / segmentCount) / 180 : 0;
}

// Generate out-and-back routes
async function generateOutAndBackRoutes(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions) {
  const routes = [];
  const halfDistance = targetDistance / 2;
  
  // Generate different directions, prioritizing user preferences
  let directions = [
    { name: 'North Route', bearing: 0 },
    { name: 'Northeast Route', bearing: 45 },
    { name: 'East Route', bearing: 90 },
    { name: 'Southeast Route', bearing: 135 },
  ];

  // Prioritize preferred direction if available
  if (patternBasedSuggestions?.preferredDirection?.source === 'historical') {
    const preferredBearing = patternBasedSuggestions.preferredDirection.bearing;
    directions = directions.sort((a, b) => {
      const aDiff = Math.abs(a.bearing - preferredBearing);
      const bDiff = Math.abs(b.bearing - preferredBearing);
      return aDiff - bDiff;
    });
  }

  for (const direction of directions) {
    try {
      const route = await generateOutAndBackPattern(
        startLocation,
        halfDistance,
        direction,
        trainingGoal,
        weatherData,
        patternBasedSuggestions
      );
      if (route && route.coordinates && route.coordinates.length > 10) {
        routes.push(route);
        console.log(`Successfully generated ${direction.name} with ${route.coordinates.length} points`);
      } else {
        console.log(`Skipped ${direction.name} - insufficient quality`);
      }
    } catch (error) {
      console.warn(`Failed to generate ${direction.name}:`, error);
    }
  }

  return routes;
}

// Generate point-to-point routes
async function generatePointToPointRoutes(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions) {
  // For now, convert to out-and-back since we need a return journey
  // In future, could integrate with public transport APIs
  return generateOutAndBackRoutes(startLocation, targetDistance, trainingGoal, weatherData, patternBasedSuggestions);
}

// Calculate wind factor for entire route
function calculateWindFactor(coordinates, weatherData) {
  if (!weatherData || !coordinates || coordinates.length < 2) return 0.8;

  let totalFactor = 0;
  let segments = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const bearing = calculateBearing(coordinates[i], coordinates[i + 1]);
    const factor = getWindFactor(bearing, weatherData.windDegrees, weatherData.windSpeed);
    totalFactor += factor;
    segments++;
  }

  return segments > 0 ? totalFactor / segments : 0.8;
}

// Get appropriate Mapbox routing profile
function getMapboxProfile(trainingGoal) {
  switch (trainingGoal) {
    case 'recovery':
      return 'cycling'; // Prefer bike-friendly routes
    case 'endurance':
      return 'cycling';
    case 'intervals':
      return 'cycling'; // Might prefer roads with less traffic
    case 'hills':
      return 'cycling';
    default:
      return 'cycling';
  }
}

// Calculate route difficulty
function calculateDifficulty(distance, elevationGain) {
  const elevationRatio = elevationGain / distance; // meters per km
  
  if (elevationRatio < 10) return 'easy';
  if (elevationRatio < 25) return 'moderate';
  return 'hard';
}

// Generate route name based on training goal
function getRouteNameByGoal(goal) {
  const names = {
    endurance: 'Endurance Ride',
    intervals: 'Interval Training',
    recovery: 'Recovery Spin',
    hills: 'Hill Climb'
  };
  return names[goal] || 'Training Ride';
}


// Generate route description
function generateRouteDescription(trainingGoal, pattern, elevationStats) {
  const descriptions = {
    endurance: 'Steady paced route perfect for building aerobic base',
    intervals: 'Route with good segments for high-intensity efforts',
    recovery: 'Easy spinning route for active recovery',
    hills: 'Challenging climbs to build strength and power'
  };
  
  let desc = descriptions[trainingGoal] || 'Great training route';
  
  if (elevationStats.gain > 300) {
    desc += ' with significant climbing';
  } else if (elevationStats.gain < 100) {
    desc += ' on mostly flat terrain';
  }
  
  return desc;
}

// Score and rank routes
async function scoreRoutes(routes, criteria) {
  const { trainingGoal, weatherData, timeAvailable, ridingPatterns, userPreferences } = criteria;
  
  const scoredRoutes = routes.map(route => {
    let score = 0.5; // Base score
    
    // Training goal alignment
    score += getTrainingGoalScore(route, trainingGoal);
    
    // Weather optimization
    if (weatherData) {
      score += getWeatherScore(route, weatherData);
    }
    
    // Time efficiency
    score += getTimeEfficiencyScore(route, timeAvailable);
    
    // Route quality
    score += getRouteQualityScore(route);
    
    // Historical pattern matching
    if (ridingPatterns) {
      score += getHistoricalPatternScore(route, ridingPatterns);
    }
    
    // NEW: Traffic and quietness scoring based on user preferences
    if (userPreferences) {
      score += getTrafficAvoidanceScore(route, userPreferences);
      score += getQuietnessPreferenceScore(route, userPreferences);
    }
    
    return {
      ...route,
      score: Math.max(0, Math.min(1, score))
    };
  });
  
  // Sort by score descending
  return scoredRoutes.sort((a, b) => b.score - a.score);
}

// Training goal scoring
function getTrainingGoalScore(route, goal) {
  switch (goal) {
    case 'hills':
      return (route.elevationGain / route.distance) > 20 ? 0.2 : -0.1;
    case 'recovery':
      return (route.elevationGain / route.distance) < 15 ? 0.2 : -0.1;
    case 'intervals':
      return route.windFactor > 0.8 ? 0.15 : 0; // Prefer low wind for intervals
    default:
      return 0.1;
  }
}

// Weather scoring
function getWeatherScore(route, weather) {
  const conditions = getOptimalTrainingConditions(weather, route.trainingGoal);
  return conditions ? conditions.score * 0.2 : 0;
}

// Time efficiency scoring
function getTimeEfficiencyScore(route, timeAvailable) {
  // More realistic speed estimates based on training goal and elevation
  let avgSpeed = 20; // Base speed in km/h
  
  // Adjust speed based on training goal
  switch (route.trainingGoal) {
    case 'recovery':
      avgSpeed = 18; // Slower for recovery rides
      break;
    case 'endurance':
      avgSpeed = 22; // Moderate pace
      break;
    case 'intervals':
      avgSpeed = 20; // Variable pace averages out
      break;
    case 'hills':
      avgSpeed = 15; // Much slower due to climbing
      break;
    default:
      avgSpeed = 20;
  }
  
  // Adjust for elevation gain (slower speeds with more climbing)
  const elevationRatio = route.elevationGain / route.distance; // meters per km
  if (elevationRatio > 25) avgSpeed *= 0.75; // Significant climbing
  else if (elevationRatio > 15) avgSpeed *= 0.85; // Moderate climbing
  else if (elevationRatio > 10) avgSpeed *= 0.95; // Light climbing
  
  const estimatedTime = (route.distance / avgSpeed) * 60; // Convert to minutes
  const timeDiff = Math.abs(estimatedTime - timeAvailable);
  
  if (timeDiff < 10) return 0.2; // Within 10 minutes
  if (timeDiff < 20) return 0.1; // Within 20 minutes
  return -0.1; // Too far off
}

// Route quality scoring
function getRouteQualityScore(route) {
  let score = 0;
  
  // Confidence from map matching
  if (route.confidence > 0.8) score += 0.1;
  
  // Wind factor
  score += (route.windFactor - 0.8) * 0.5;
  
  return score;
}

// Historical pattern scoring
function getHistoricalPatternScore(route, patterns) {
  let score = 0;
  
  // Distance preference matching
  if (patterns.preferredDistances?.mean) {
    const userMean = patterns.preferredDistances.mean;
    const distanceDiff = Math.abs(route.distance - userMean) / userMean;
    
    // Bonus for distances close to user's typical rides
    if (distanceDiff < 0.2) score += 0.15; // Within 20% of typical
    else if (distanceDiff < 0.4) score += 0.1; // Within 40% of typical
    else if (distanceDiff > 1.0) score -= 0.1; // Much longer than typical
  }
  
  // Elevation preference matching
  if (patterns.elevationTolerance?.preferred) {
    const preferredElevation = patterns.elevationTolerance.preferred;
    const elevationRatio = route.elevationGain / route.distance; // meters per km
    const preferredRatio = preferredElevation / patterns.preferredDistances?.mean || 15;
    
    const elevationDiff = Math.abs(elevationRatio - preferredRatio) / preferredRatio;
    
    if (elevationDiff < 0.3) score += 0.1; // Close to preferred climbing rate
    else if (elevationDiff > 1.5) score -= 0.05; // Much different from preferred
  }
  
  // Frequent area bonus
  if (patterns.frequentAreas?.length > 0 && route.coordinates?.length > 0) {
    const routeCenter = calculateRouteCenter(route.coordinates);
    const nearFrequentArea = patterns.frequentAreas.some(area => {
      const distance = calculateDistance(routeCenter, area.center);
      return distance < 5; // Within 5km of frequent area
    });
    
    if (nearFrequentArea) score += 0.1;
  }
  
  // Pattern confidence weighting
  const patternConfidence = calculatePatternConfidence(patterns);
  return score * patternConfidence;
}

// Calculate route center point
function calculateRouteCenter(coordinates) {
  if (!coordinates || coordinates.length === 0) return [0, 0];
  
  const totalLon = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const totalLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  
  return [totalLon / coordinates.length, totalLat / coordinates.length];
}

// Calculate pattern confidence (imported from rideAnalysis but redefined for safety)
function calculatePatternConfidence(patterns) {
  let score = 0;
  let factors = 0;

  if (patterns.preferredDistances?.mean) {
    score += 0.3;
    factors++;
  }

  if (patterns.frequentAreas?.length > 0) {
    score += 0.3 * Math.min(patterns.frequentAreas.length / 3, 1);
    factors++;
  }

  if (patterns.preferredDirections?.length > 0) {
    score += 0.2 * patterns.preferredDirections[0].preference;
    factors++;
  }

  if (patterns.elevationTolerance?.mean !== undefined) {
    score += 0.2;
    factors++;
  }

  return factors > 0 ? score / factors : 0.5; // Default to 50% confidence
}

// NEW: Score route based on traffic avoidance preferences
function getTrafficAvoidanceScore(route, preferences) {
  const trafficTolerance = preferences?.routingPreferences?.trafficTolerance;
  
  if (!trafficTolerance) return 0;
  
  let score = 0;
  
  // High reward for routes that match user's traffic preferences
  if (route.trafficScore) {
    const expectedTrafficLevels = {
      'low': 0.3,      // Expect very low traffic
      'medium': 0.7,   // Accept moderate traffic  
      'high': 1.0      // Accept any traffic level
    };
    
    const expectedLevel = expectedTrafficLevels[trafficTolerance] || 0.7;
    
    // Reward routes that meet or exceed expectations
    if (trafficTolerance === 'low' && route.trafficScore <= 0.4) {
      score += 0.3; // Big bonus for actually quiet routes when low traffic is preferred
      console.log(`🏆 Route gets traffic avoidance bonus: ${route.trafficScore.toFixed(2)} traffic score`);
    } else if (trafficTolerance === 'medium' && route.trafficScore <= 0.8) {
      score += 0.15; // Moderate bonus for reasonable traffic
    }
    
    // Penalize routes that don't match preferences  
    if (trafficTolerance === 'low' && route.trafficScore > 0.6) {
      score -= 0.2; // Penalty for high traffic when quiet roads preferred
      console.log(`⚠️ Route gets traffic penalty: ${route.trafficScore.toFixed(2)} traffic score`);
    }
  }
  
  // Additional scoring based on route characteristics that indicate quiet roads
  if (trafficTolerance === 'low') {
    // Prefer routes with more turns (local roads)
    if (route.coordinates && route.coordinates.length > 0) {
      const turnDensity = calculateTurnDensity(route.coordinates);
      score += turnDensity * 0.1; // Up to 0.1 bonus for winding routes
    }
    
    // Prefer slightly longer routes (likely avoiding main roads)
    if (route.distance && route.source !== 'mock') {
      // Small bonus for routes that are 5-15% longer than direct routes
      score += 0.05; // Assume quiet routing adds reasonable distance
    }
  }
  
  return Math.max(-0.3, Math.min(0.4, score)); // Cap the bonus/penalty
}

// NEW: Score route based on quietness preferences  
function getQuietnessPreferenceScore(route, preferences) {
  const quietnessLevel = preferences?.scenicPreferences?.quietnessLevel;
  
  if (!quietnessLevel) return 0;
  
  let score = 0;
  
  // Use the quietness score from routing if available
  if (route.quietnessScore) {
    const expectedQuietnessLevels = {
      'high': 0.8,    // Expect very quiet routes
      'medium': 0.6,  // Accept moderate quietness
      'low': 0.4      // Quietness not important
    };
    
    const expectedLevel = expectedQuietnessLevels[quietnessLevel] || 0.6;
    
    // Reward routes that meet quietness expectations
    if (route.quietnessScore >= expectedLevel) {
      const bonus = (route.quietnessScore - expectedLevel) * 0.5;
      score += bonus;
      console.log(`🤫 Route gets quietness bonus: ${route.quietnessScore.toFixed(2)} quietness score`);
    } else {
      // Penalize routes that don't meet quietness expectations
      const penalty = (expectedLevel - route.quietnessScore) * 0.3;
      score -= penalty;
    }
  }
  
  // Additional factors for high quietness preference
  if (quietnessLevel === 'high') {
    // Prefer routes generated with walking profile (often quieter)
    if (route.profile === 'walking') {
      score += 0.15;
      console.log('🚶 Route gets walking profile quietness bonus');
    }
    
    // Prefer routes with bike infrastructure (separated from cars)
    const bikeInfrastructure = preferences?.safetyPreferences?.bikeInfrastructure;
    if (bikeInfrastructure === 'required' || bikeInfrastructure === 'strongly_preferred') {
      score += 0.1;
    }
  }
  
  return Math.max(-0.2, Math.min(0.3, score)); // Cap the bonus/penalty
}

// Helper function to calculate turn density for traffic avoidance scoring
function calculateTurnDensity(coordinates) {
  if (coordinates.length < 3) return 0;
  
  let significantTurns = 0;
  let totalSegments = 0;
  
  for (let i = 1; i < coordinates.length - 1; i++) {
    const bearing1 = calculateBearing(coordinates[i - 1], coordinates[i]);
    const bearing2 = calculateBearing(coordinates[i], coordinates[i + 1]);
    
    let bearingChange = Math.abs(bearing2 - bearing1);
    if (bearingChange > 180) bearingChange = 360 - bearingChange;
    
    if (bearingChange > 30) { // Significant turn
      significantTurns++;
    }
    totalSegments++;
  }
  
  return totalSegments > 0 ? significantTurns / totalSegments : 0;
}

// Create mock route for fallback
function createMockRoute(name, targetDistance, trainingGoal, startLocation = null) {
  const elevationGain = trainingGoal === 'hills' ? targetDistance * 25 : 
                      trainingGoal === 'recovery' ? targetDistance * 5 : 
                      targetDistance * 15;

  // Generate mock coordinates if we have a start location
  let coordinates = [];
  if (startLocation) {
    coordinates = generateMockCoordinates(startLocation, targetDistance);
  }

  return {
    name: `${name} - ${getRouteNameByGoal(trainingGoal)}`,
    distance: targetDistance,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationGain * 0.9),
    coordinates,
    difficulty: calculateDifficulty(targetDistance, elevationGain),
    description: generateRouteDescription(trainingGoal, 'mock', { gain: elevationGain }),
    trainingGoal,
    pattern: 'mock',
    confidence: 0.5,
    elevationProfile: [],
    windFactor: 0.8,
    score: 0.6
  };
}

// Generate mock coordinates for a route
function generateMockCoordinates(startLocation, targetDistance) {
  const [startLon, startLat] = startLocation;
  const coordinates = [startLocation];
  
  // Approximate: 1 degree ≈ 111 km
  const radius = (targetDistance / (2 * Math.PI)) / 111; // Convert to degrees
  const numPoints = 8; // Create octagonal route
  
  for (let i = 1; i <= numPoints; i++) {
    const angle = (i * 45) * (Math.PI / 180); // 45 degrees apart
    const deltaLat = radius * Math.cos(angle);
    const deltaLon = radius * Math.sin(angle) / Math.cos(startLat * Math.PI / 180);
    
    coordinates.push([startLon + deltaLon, startLat + deltaLat]);
  }
  
  // Close the loop
  coordinates.push(startLocation);
  
  return coordinates;
}

// Generate out-and-back pattern
async function generateOutAndBackPattern(startLocation, halfDistance, direction, trainingGoal, weatherData, patternBasedSuggestions) {
  const [startLon, startLat] = startLocation;
  
  // Calculate target point for out-and-back
  const angle = direction.bearing * (Math.PI / 180);
  
  // Check for nearby frequent areas in the preferred direction
  const nearbyAreas = patternBasedSuggestions?.nearbyFrequentAreas || [];
  let targetPoint = null;
  
  // Try to use a frequent area as the turnaround point
  for (const area of nearbyAreas) {
    const areaBearing = calculateBearing(startLocation, area.center);
    const bearingDiff = Math.abs(areaBearing - direction.bearing);
    const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
    
    const distanceToArea = calculateDistance(startLocation, area.center);
    
    // Use area if it's roughly in the right direction and distance
    if (normalizedDiff < 45 && 
        distanceToArea > halfDistance * 0.5 && 
        distanceToArea < halfDistance * 1.5) {
      targetPoint = area.center;
      console.log(`Using frequent area as turnaround point for ${direction.name}`);
      break;
    }
  }
  
  // If no suitable frequent area, calculate target point
  if (!targetPoint) {
    // Add some variation to avoid perfectly straight lines
    const angleVariation = angle + (Math.random() - 0.5) * 0.2;
    const distanceVariation = halfDistance * (0.8 + Math.random() * 0.4);
    
    const deltaLat = (distanceVariation / 111.32) * Math.cos(angleVariation);
    const deltaLon = (distanceVariation / (111.32 * Math.cos(startLat * Math.PI / 180))) * Math.sin(angleVariation);
    
    targetPoint = [startLon + deltaLon, startLat + deltaLat];
  }
  
  // Create simple out-and-back route
  const waypoints = [startLocation, targetPoint];
  
  // Get Mapbox token and try to generate route
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn('Mapbox token not available');
    return null;
  }

  try {
    // Use cycling directions to get realistic route
    const outboundRoute = await getCyclingDirections(waypoints, mapboxToken, {
      profile: getMapboxProfile(trainingGoal)
    });
    
    if (!outboundRoute.coordinates || outboundRoute.coordinates.length < 5) {
      console.warn(`Failed to generate realistic outbound route for ${direction.name}`);
      return null;
    }
    
    // Create the return journey (reverse the coordinates)
    const returnCoordinates = [...outboundRoute.coordinates].reverse();
    
    // Combine outbound and return for full route
    const fullCoordinates = [...outboundRoute.coordinates, ...returnCoordinates.slice(1)]; // Skip duplicate start point
    
    const elevationProfile = await fetchElevationProfile(fullCoordinates, mapboxToken);
    const elevationStats = calculateElevationStats(elevationProfile);
    
    return {
      name: `${direction.name} - ${getRouteNameByGoal(trainingGoal)}`,
      distance: (outboundRoute.distance * 2) / 1000, // Convert to km and double for round trip
      elevationGain: elevationStats.gain,
      elevationLoss: elevationStats.loss,
      coordinates: fullCoordinates,
      difficulty: calculateDifficulty((outboundRoute.distance * 2) / 1000, elevationStats.gain),
      description: generateRouteDescription(trainingGoal, 'out_back', elevationStats),
      trainingGoal,
      pattern: 'out_back',
      confidence: outboundRoute.confidence,
      elevationProfile,
      windFactor: calculateWindFactor(fullCoordinates, weatherData)
    };
    
  } catch (error) {
    console.warn(`Failed to generate out-and-back route for ${direction.name}:`, error);
    return null;
  }
}

// Generate routes from past ride templates
async function generateRoutesFromTemplates(params) {
  const { startLocation, targetDistance, trainingGoal, routeType, templates } = params;
  const routes = [];
  
  // Find templates that match the desired route type and are near the start location
  const suitableTemplates = templates.filter(template => {
    // Check if template pattern matches desired route type
    if (routeType !== 'any' && template.pattern !== routeType) {
      return false;
    }
    
    // Check if template is near the start location
    const distanceToTemplate = calculateDistance(startLocation, template.startArea);
    if (distanceToTemplate > 10) { // Within 10km
      return false;
    }
    
    // Check if template distance is reasonable for target
    const distanceRatio = Math.abs(template.distance - targetDistance) / targetDistance;
    return distanceRatio < 0.5; // Within 50% of target distance
  });
  
  console.log(`Found ${suitableTemplates.length} suitable route templates`);
  
  // Use the best templates to create new routes
  for (let i = 0; i < Math.min(2, suitableTemplates.length); i++) {
    const template = suitableTemplates[i];
    
    try {
      // Adapt the template to the new start location
      const adaptedRoute = await adaptTemplateToLocation(template, startLocation, targetDistance, trainingGoal);
      
      if (adaptedRoute && adaptedRoute.coordinates && adaptedRoute.coordinates.length > 10) {
        routes.push(adaptedRoute);
        console.log(`Successfully adapted template route: ${template.distance}km -> ${adaptedRoute.distance}km`);
      }
    } catch (error) {
      console.warn('Failed to adapt template route:', error);
    }
  }
  
  return routes;
}

// Adapt a route template to a new location
async function adaptTemplateToLocation(template, newStartLocation, targetDistance, trainingGoal) {
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) return null;
  
  // Scale and translate the template key points to the new start location
  const templateStart = template.keyPoints[0];
  const offset = [
    newStartLocation[0] - templateStart[0],
    newStartLocation[1] - templateStart[1]
  ];
  
  // Scale factor to adjust distance
  const scaleFactor = targetDistance / template.distance;
  
  const adaptedKeyPoints = template.keyPoints.map((point, index) => {
    if (index === 0) {
      return newStartLocation; // Always start at the new location
    }
    
    // Apply offset and scaling
    const relativePoint = [
      point[0] - templateStart[0],
      point[1] - templateStart[1]
    ];
    
    return [
      newStartLocation[0] + relativePoint[0] * scaleFactor,
      newStartLocation[1] + relativePoint[1] * scaleFactor
    ];
  });
  
  try {
    // Use Mapbox to create a realistic route through these adapted points
    const snappedRoute = await getCyclingDirections(adaptedKeyPoints, mapboxToken, {
      profile: getMapboxProfile(trainingGoal)
    });
    
    if (!snappedRoute.coordinates || snappedRoute.coordinates.length < 10) {
      return null;
    }
    
    const elevationProfile = await fetchElevationProfile(snappedRoute.coordinates, mapboxToken);
    const elevationStats = calculateElevationStats(elevationProfile);
    
    return {
      name: `Adapted Route - ${getRouteNameByGoal(trainingGoal)}`,
      distance: snappedRoute.distance / 1000,
      elevationGain: elevationStats.gain,
      elevationLoss: elevationStats.loss,
      coordinates: snappedRoute.coordinates,
      difficulty: calculateDifficulty(snappedRoute.distance / 1000, elevationStats.gain),
      description: 'Based on your past riding patterns',
      trainingGoal,
      pattern: template.pattern,
      confidence: template.confidence * 0.9, // Slightly lower confidence since it's adapted
      elevationProfile,
      source: 'template',
      originalTemplate: template.id
    };
    
  } catch (error) {
    console.warn('Failed to adapt template:', error);
    return null;
  }
}