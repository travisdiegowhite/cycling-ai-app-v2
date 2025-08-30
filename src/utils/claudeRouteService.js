// Claude AI Route Generation Service
// Uses Claude AI to generate intelligent cycling route suggestions

import Anthropic from '@anthropic-ai/sdk';
import { EnhancedContextCollector } from './enhancedContext';

// Initialize Claude client
const initClaude = () => {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('❌ Anthropic API key not found. Claude route generation will be disabled.');
    console.warn('Please set REACT_APP_ANTHROPIC_API_KEY in your .env file');
    return null;
  }
  
  if (apiKey === 'your_claude_api_key_here') {
    console.warn('❌ Claude API key is still set to placeholder value. Please update .env file');
    return null;
  }
  
  console.log('✅ Claude API key found, initializing client...');
  
  try {
    return new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
      defaultHeaders: {
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize Claude client:', error);
    return null;
  }
};

/**
 * Generate intelligent route suggestions using Claude AI
 * @param {Object} params - Route generation parameters
 * @returns {Promise<Array>} Array of AI-generated route suggestions
 */
export async function generateClaudeRoutes(params) {
  const claude = initClaude();
  if (!claude) {
    console.warn('Claude not available, falling back to existing route generation');
    return [];
  }

  const {
    startLocation,
    timeAvailable,
    trainingGoal,
    routeType,
    weatherData,
    ridingPatterns,
    targetDistance,
    userId
  } = params;

  try {
    console.log('🧠 Calling Claude API for route generation...');
    
    // Try to get enhanced context if userId is available
    let prompt;
    if (userId) {
      try {
        const enhancedContext = await EnhancedContextCollector.gatherDetailedPreferences(userId, params);
        console.log('Using enhanced context for route generation');
        prompt = EnhancedContextCollector.buildEnhancedRoutePrompt(enhancedContext);
      } catch (error) {
        console.warn('Failed to get enhanced context, using basic prompt:', error);
        prompt = buildRoutePrompt(params);
      }
    } else {
      prompt = buildRoutePrompt(params);
    }
    
    console.log('Claude prompt:', prompt);
    
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log('Claude response:', response);
    const suggestions = parseClaudeResponse(response.content[0].text);
    console.log('Parsed Claude suggestions:', suggestions);
    return suggestions;

  } catch (error) {
    console.error('Claude route generation failed:', error);
    console.error('Error details:', error.message);
    if (error.status) {
      console.error('HTTP Status:', error.status);
    }
    return [];
  }
}

/**
 * Build a comprehensive prompt for Claude route generation
 */
function buildRoutePrompt(params) {
  const {
    startLocation,
    timeAvailable,
    trainingGoal,
    routeType,
    weatherData,
    ridingPatterns,
    targetDistance
  } = params;

  const [longitude, latitude] = startLocation;

  let prompt = `You are an expert cycling coach and route planner. Generate 3-4 intelligent cycling route suggestions based on the following parameters:

LOCATION & DISTANCE:
- Start coordinates: ${latitude}, ${longitude}
- Target distance: ${targetDistance.toFixed(1)}km
- Time available: ${timeAvailable} minutes
- Route type: ${routeType}

TRAINING GOAL: ${trainingGoal}
${getTrainingGoalDescription(trainingGoal)}

WEATHER CONDITIONS:`;

  if (weatherData) {
    prompt += `
- Temperature: ${weatherData.temperature}°C
- Wind: ${weatherData.windSpeed} km/h from ${weatherData.windDirection}
- Conditions: ${weatherData.description}
- Humidity: ${weatherData.humidity}%`;
  } else {
    prompt += `
- Weather data not available`;
  }

  if (ridingPatterns) {
    prompt += `

RIDER PREFERENCES (based on past rides):`;
    
    if (ridingPatterns.preferredDistances?.mean) {
      prompt += `
- Typical ride distance: ${ridingPatterns.preferredDistances.mean.toFixed(1)}km (range: ${ridingPatterns.preferredDistances.range?.min?.toFixed(1)}-${ridingPatterns.preferredDistances.range?.max?.toFixed(1)}km)`;
    }
    
    if (ridingPatterns.elevationTolerance?.preferred) {
      prompt += `
- Preferred elevation gain: ${ridingPatterns.elevationTolerance.preferred}m (tolerance: up to ${ridingPatterns.elevationTolerance.tolerance}m)`;
    }
    
    if (ridingPatterns.frequentAreas?.length > 0) {
      prompt += `
- Frequently visited areas: ${ridingPatterns.frequentAreas.length} known locations`;
      ridingPatterns.frequentAreas.slice(0, 3).forEach((area, i) => {
        prompt += `
  • Area ${i+1}: visited ${area.frequency} times (confidence: ${(area.confidence * 100).toFixed(0)}%)`;
      });
    }
    
    if (ridingPatterns.preferredDirections?.length > 0) {
      prompt += `
- Preferred directions: `;
      ridingPatterns.preferredDirections.slice(0, 2).forEach((dir, i) => {
        prompt += `${dir.direction} (${(dir.preference * 100).toFixed(0)}% of rides)${i === 0 && ridingPatterns.preferredDirections.length > 1 ? ', ' : ''}`;
      });
    }
    
    if (ridingPatterns.routeTemplates?.length > 0) {
      prompt += `
- Past route patterns: ${ridingPatterns.routeTemplates.length} templates available
  • Most common route type: ${getMostCommonRouteType(ridingPatterns.routeTemplates)}
  • Preferred difficulty: ${getMostCommonDifficulty(ridingPatterns.routeTemplates)}`;
    }
    
    if (ridingPatterns.distanceDistribution) {
      const dist = ridingPatterns.distanceDistribution;
      prompt += `
- Distance preferences: ${(dist.short * 100).toFixed(0)}% short rides, ${(dist.medium * 100).toFixed(0)}% medium, ${(dist.long * 100).toFixed(0)}% long rides`;
    }
  }

  prompt += `

Please provide 3-4 route suggestions in the following JSON format:
{
  "routes": [
    {
      "name": "descriptive route name",
      "description": "detailed description explaining why this route fits the training goal",
      "estimatedDistance": distance_in_km,
      "estimatedElevation": elevation_gain_in_meters,
      "difficulty": "easy|moderate|hard",
      "keyDirections": ["turn by turn directions as array of strings"],
      "trainingFocus": "what makes this route good for the specified training goal",
      "weatherConsiderations": "how this route works with current weather",
      "estimatedTime": time_in_minutes
    }
  ]
}

IMPORTANT:
- Focus on realistic, rideable routes
- Consider safety (bike lanes, traffic levels)
- Match difficulty to training goal
- Explain route benefits clearly
- Account for weather impact on route choice
- Provide specific turn-by-turn guidance
- Keep routes within 20% of target distance`;

  return prompt;
}

/**
 * Calculate realistic time estimate based on distance and difficulty
 */
function calculateRealisticTime(distanceKm, difficulty) {
  let avgSpeed = 20; // Base speed in km/h
  
  // Adjust speed based on difficulty
  switch (difficulty) {
    case 'easy':
      avgSpeed = 22;
      break;
    case 'moderate':
      avgSpeed = 20;
      break;
    case 'hard':
      avgSpeed = 15;
      break;
    default:
      avgSpeed = 20;
  }
  
  return Math.round((distanceKm / avgSpeed) * 60); // Convert to minutes
}

/**
 * Get detailed description for training goals
 */
function getTrainingGoalDescription(goal) {
  const descriptions = {
    endurance: `
- Focus: Aerobic base building, steady effort
- Intensity: Moderate, sustainable pace
- Route needs: Consistent terrain, minimal stops`,
    
    intervals: `
- Focus: High-intensity efforts with recovery periods
- Intensity: Alternating hard efforts and easy recovery
- Route needs: Safe sections for hard efforts, good visibility`,
    
    recovery: `
- Focus: Active recovery, easy spinning
- Intensity: Very easy, conversational pace
- Route needs: Flat terrain, scenic/enjoyable, minimal traffic`,
    
    hills: `
- Focus: Climbing strength and power development
- Intensity: Sustained efforts on climbs
- Route needs: Significant elevation gain, varied gradients`
  };
  
  return descriptions[goal] || 'General fitness and enjoyment';
}

/**
 * Parse Claude's response and convert to route objects
 */
function parseClaudeResponse(responseText) {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in Claude response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const routes = parsed.routes || [];

    return routes.map((route, index) => ({
      name: route.name || `Claude Route ${index + 1}`,
      description: route.description || 'AI-generated cycling route',
      distance: route.estimatedDistance || 25,
      elevationGain: route.estimatedElevation || 150,
      elevationLoss: Math.round((route.estimatedElevation || 150) * 0.9),
      difficulty: route.difficulty || 'moderate',
      coordinates: [], // Will be filled by Mapbox routing
      trainingGoal: route.trainingFocus || 'General training',
      pattern: 'claude_generated',
      confidence: 0.85,
      source: 'claude',
      keyDirections: route.keyDirections || [],
      weatherConsiderations: route.weatherConsiderations || '',
      estimatedTime: calculateRealisticTime(route.estimatedDistance || 25, route.difficulty || 'moderate'),
      elevationProfile: [],
      windFactor: 0.8
    }));

  } catch (error) {
    console.warn('Failed to parse Claude response:', error);
    return [];
  }
}

/**
 * Enhance existing route with Claude-generated description and analysis
 */
export async function enhanceRouteWithClaude(route, params) {
  const claude = initClaude();
  if (!claude) {
    return route;
  }

  try {
    const prompt = `You are a cycling coach analyzing a route. Provide an enhanced description and training analysis for this cycling route:

ROUTE DETAILS:
- Name: ${route.name}
- Distance: ${route.distance}km
- Elevation gain: ${route.elevationGain}m
- Difficulty: ${route.difficulty}
- Training goal: ${route.trainingGoal}

CURRENT DESCRIPTION: ${route.description}

Please provide:
1. An enhanced, motivating description (2-3 sentences)
2. Specific training benefits
3. Pacing recommendations
4. Key challenges to expect

Respond in JSON format:
{
  "enhancedDescription": "improved description",
  "trainingBenefits": "specific benefits for this training goal",
  "pacingAdvice": "how to pace this route",
  "keyChallenges": "what to watch out for"
}`;

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }]
    });

    const enhancement = JSON.parse(response.content[0].text);
    
    return {
      ...route,
      description: enhancement.enhancedDescription || route.description,
      trainingBenefits: enhancement.trainingBenefits,
      pacingAdvice: enhancement.pacingAdvice,
      keyChallenges: enhancement.keyChallenges
    };

  } catch (error) {
    console.warn('Failed to enhance route with Claude:', error);
    return route;
  }
}

/**
 * Get Claude's analysis of riding patterns for personalized recommendations
 */
export async function analyzeRidingPatternsWithClaude(patterns, currentParams) {
  const claude = initClaude();
  if (!claude) {
    return null;
  }

  try {
    const prompt = `You are a cycling coach analyzing a rider's patterns. Based on this riding history, provide personalized recommendations:

RIDING PATTERNS:
${JSON.stringify(patterns, null, 2)}

CURRENT REQUEST:
- Training goal: ${currentParams.trainingGoal}
- Time available: ${currentParams.timeAvailable} minutes
- Target distance: ${currentParams.targetDistance}km

Analyze their patterns and provide recommendations in JSON format:
{
  "personalizedAdvice": "coaching advice based on their history",
  "recommendedIntensity": "suggested intensity level",
  "routePreferences": "what type of routes they seem to prefer",
  "progressionSuggestions": "how to progress their training"
}`;

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }]
    });

    return JSON.parse(response.content[0].text);

  } catch (error) {
    console.warn('Failed to analyze patterns with Claude:', error);
    return null;
  }
}

// Helper function to analyze most common route type from templates
function getMostCommonRouteType(templates) {
  const counts = {};
  templates.forEach(template => {
    counts[template.routeType] = (counts[template.routeType] || 0) + 1;
  });
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

// Helper function to analyze most common difficulty from templates  
function getMostCommonDifficulty(templates) {
  const counts = {};
  templates.forEach(template => {
    counts[template.difficulty] = (counts[template.difficulty] || 0) + 1;
  });
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

const claudeService = {
  generateClaudeRoutes,
  enhanceRouteWithClaude,
  analyzeRidingPatternsWithClaude
};

export default claudeService;