# Enhanced AI Route Generation with User Preferences

## Overview
The enhanced preference system allows the AI route generator to create highly personalized cycling routes based on detailed user preferences. This system learns from your riding patterns and adapts to your specific needs.

## Features Added

### 1. Database Schema (`database/user_preferences_schema.sql`)
- **User Preferences Tables**: Comprehensive schema for storing detailed preferences
  - `routing_preferences`: Traffic tolerance, hill preferences, turn complexity
  - `surface_preferences`: Surface quality, gravel tolerance, weather adjustments
  - `safety_preferences`: Infrastructure needs, rest stops, cell coverage
  - `scenic_preferences`: View preferences, photography stops, quietness
  - `training_context`: Current training phase, fatigue, weekly volume
  - `preference_history`: Tracks changes over time for learning

### 2. Enhanced Context Collector (`src/utils/enhancedContext.js`)
- Gathers detailed preferences from database
- Provides intelligent defaults for new users
- Builds comprehensive prompts for Claude AI
- Includes local knowledge (wind patterns, traffic, seasonal factors)
- Calculates area familiarity based on ride history

### 3. Preference Settings UI (`src/components/PreferenceSettings.js`)
- User-friendly interface with tabbed sections
- Real-time preference updates
- Visual feedback with sliders and selects
- Comprehensive coverage of all preference categories

### 4. Integration with Claude AI
- Enhanced prompts with detailed context
- Fallback to basic prompts if preferences unavailable
- Automatic preference initialization for new users

## How to Use

### For Users

1. **Access Preferences**
   - Click the settings icon next to "AI Training Route Generator"
   - Or it will be available in your profile settings

2. **Configure Your Preferences**
   - **Routing Tab**: Set traffic tolerance, hill preference, turn complexity
   - **Surface Tab**: Choose surface quality, gravel tolerance
   - **Safety Tab**: Configure infrastructure needs, rest stop frequency
   - **Scenic Tab**: Select preferred views, quietness level
   - **Training Tab**: Update current training phase and fatigue

3. **Generate Routes**
   - Your preferences are automatically used when generating AI routes
   - Routes will match your specified preferences
   - The system learns from your route selections over time

### For Developers

#### Setting Up the Database

1. Run the preference schema SQL:
```sql
-- In your Supabase SQL editor
-- Run the contents of database/user_preferences_schema.sql
```

2. The schema includes:
   - Automatic preference initialization
   - Row-level security policies
   - Update triggers for timestamps
   - Preference history tracking

#### Using Enhanced Context in Code

```javascript
import { EnhancedContextCollector } from './utils/enhancedContext';

// Get user preferences
const preferences = await EnhancedContextCollector.gatherDetailedPreferences(
  userId, 
  baseParams
);

// Update specific preferences
await EnhancedContextCollector.updatePreferences(
  userId, 
  'routing', // category
  { traffic_tolerance: 'medium' } // updates
);

// Build enhanced prompt
const prompt = EnhancedContextCollector.buildEnhancedRoutePrompt(preferences);
```

## Preference Categories

### Routing Preferences
- **Traffic Tolerance**: Low/Medium/High comfort with traffic
- **Hill Preference**: Avoid/Moderate/Seek climbing routes
- **Max Gradient**: Comfortable gradient percentage (5-20%)
- **Turn Complexity**: Simple/Varied/Technical navigation

### Surface Preferences
- **Surface Quality**: Excellent/Good/Fair/Poor acceptable
- **Gravel Tolerance**: 0-50% of route can be unpaved
- **Weather Adjustments**: Automatic surface changes in rain

### Safety Preferences
- **Bike Infrastructure**: Required/Preferred/Flexible
- **Rest Stop Frequency**: Every 5-30km
- **Cell Coverage**: Critical/Important/Not important
- **Group Riding**: Solo or group considerations

### Scenic Preferences
- **Scenic Importance**: How much views matter
- **Preferred Views**: Nature, water, mountains, urban, etc.
- **Photography Stops**: Include photo-worthy locations
- **Quietness**: High/Medium/Low preference for peaceful routes

### Training Context
- **Training Phase**: Base/Build/Peak/Recovery/Maintenance
- **Weekly Volume**: Current training load in km
- **Fatigue Level**: Fresh/Moderate/Tired/Exhausted
- **Equipment Status**: Bike condition considerations

## Progressive Enhancement Strategy

### Phase 1: Basic Preferences ✅
- Database schema created
- Basic preference UI
- Integration with Claude

### Phase 2: Learning System (Next)
- Track route selections
- Adjust preferences based on choices
- Confidence scoring

### Phase 3: Advanced Features (Future)
- Weather-based preference adjustments
- Time-of-day routing changes
- Social riding preferences
- Equipment-specific routing

## Benefits

1. **Personalized Routes**: Every route matches your specific needs
2. **Safety First**: Routes respect your safety requirements
3. **Training Aligned**: Routes support your current training phase
4. **Adaptive System**: Learns and improves over time
5. **Comprehensive Context**: Consider weather, time, location, and fitness

## Troubleshooting

### Preferences Not Loading
- Ensure database schema is properly installed
- Check browser console for errors
- Verify user authentication

### Routes Not Using Preferences
- Confirm Claude API key is configured
- Check that preferences are saved
- Look for fallback to basic prompt in console

### Database Errors
- Verify RLS policies are enabled
- Check user permissions
- Ensure all tables are created

## Next Steps

1. **Immediate Use**: Start using preferences for better routes
2. **Gather Feedback**: Track which preferences matter most
3. **Iterate**: Refine based on user behavior
4. **Expand**: Add more contextual factors as needed

The enhanced preference system provides a solid foundation for truly personalized AI route generation that improves with every ride.