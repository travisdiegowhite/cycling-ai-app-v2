# AI Feature Parity Plan: Route Studio & AI Route Generator

## Current State Analysis

### AI Route Generator Features ✅

1. **AI-Powered Route Generation**
   - Uses `generateAIRoutes()` from `utils/aiRouteGenerator.js`
   - Considers training goals (endurance, intervals, recovery, hills)
   - Route types (loop, out & back, point-to-point)
   - Time-based generation (minutes available)

2. **Enhanced Context Collection**
   - `EnhancedContextCollector` from `utils/enhancedContext.js`
   - User preferences from database:
     - Routing preferences (traffic tolerance, hill preference, road types)
     - Surface preferences (pavement, gravel, mixed)
     - Safety preferences (traffic distance, intersection complexity)
     - Scenic preferences (parks, water, views)
     - Training context (fitness level, goals)
     - Local knowledge (familiar areas, avoided areas)

3. **Smart Routing**
   - `smartCyclingRouter` integration
   - Intelligent road selection
   - Infrastructure validation
   - Safety scoring

4. **Weather Integration**
   - Real-time weather data
   - Wind consideration
   - Temperature display
   - Weather-appropriate route suggestions

5. **Address Geocoding**
   - Mapbox geocoding API
   - Reverse geocoding
   - Address search
   - Draggable start marker

6. **Route Quality Scoring**
   - Analyzes past rides
   - Pattern-based templates
   - Personal history integration
   - Route recommendations based on riding style

### Route Studio Features ✅

1. **Manual Route Drawing**
   - Click-to-add waypoints
   - Drag waypoints
   - Remove waypoints
   - Reverse route

2. **Road Snapping**
   - Mapbox Directions API
   - Cycling-optimized routing
   - Profile selection (cycling, walking, driving)

3. **Elevation Profile**
   - Real terrain data from Mapbox
   - Elevation gain/loss calculation
   - Gradient analysis
   - Interactive elevation chart

4. **Mock AI Suggestions** ⚠️
   - **Basic/Limited**: Currently uses hardcoded mock suggestions
   - Suggestion types:
     - Avoid traffic
     - Add scenic route
     - Optimize climbs
     - Training variation
   - Preview before applying
   - Undo AI suggestions

5. **Route Management**
   - Save to database
   - Export GPX
   - Name and description
   - Undo/Redo history

6. **Map Controls**
   - Multiple map styles
   - Geolocation
   - Navigation controls
   - Different drawing modes

## Feature Gaps in Route Studio

### Critical Missing Features:

1. ❌ **Real AI Enhancement**
   - Currently uses mock/hardcoded suggestions
   - Not connected to actual AI route generation
   - No access to `generateAIRoutes()`
   - No Claude API integration

2. ❌ **Enhanced Context Integration**
   - Not using `EnhancedContextCollector`
   - No user preferences from database
   - No routing preferences
   - No surface/safety preferences

3. ❌ **Smart Routing**
   - Not using `smartCyclingRouter`
   - No intelligent road selection based on preferences
   - No infrastructure validation
   - No safety scoring

4. ❌ **Personal History Integration**
   - Not analyzing past rides
   - No pattern-based suggestions
   - No route templates from riding history
   - No "similar routes" recommendations

5. ❌ **Weather Integration**
   - No weather data display
   - No wind consideration in suggestions
   - No weather-based route optimization

6. ❌ **Training Goal Context**
   - No training goal selection
   - No goal-specific route optimization
   - No workout structure (intervals, recovery, etc.)

## Implementation Plan

### Phase 1: Shared AI Enhancement Module ✨

**Goal:** Create a unified AI enhancement service that both components use

**New File:** `src/utils/aiRouteEnhancer.js`

Features:
- Analyze existing route and suggest improvements
- Use real AI (Claude API) for intelligent suggestions
- Integrate with user preferences
- Provide before/after comparison
- Calculate improvement metrics

Functions:
```javascript
// Analyze a manually-drawn route and suggest enhancements
analyzeAndEnhanceRoute(route, userPreferences, trainingGoal)

// Get AI suggestions for specific aspects
getSafetyImprovements(route, preferences)
getScenicAlternatives(route, preferences)
getTrainingOptimizations(route, goal)
getElevationOptimizations(route, preferences)

// Apply suggestion to route
applySuggestion(route, suggestion)

// Compare routes (original vs suggested)
compareRoutes(original, suggested)
```

### Phase 2: Route Studio Enhancement Integration

**Goal:** Replace mock AI with real AI enhancement

**Changes to `RouteStudio.js`:**

1. **Import AI Enhancement Module**
```javascript
import { analyzeAndEnhanceRoute, getSafetyImprovements } from '../utils/aiRouteEnhancer';
import { EnhancedContextCollector } from '../utils/enhancedContext';
```

2. **Add User Preferences State**
```javascript
const [userPreferences, setUserPreferences] = useState(null);
const [trainingGoal, setTrainingGoal] = useState('endurance');
```

3. **Load User Preferences on Mount**
```javascript
useEffect(() => {
  if (user) {
    loadUserPreferences();
  }
}, [user]);
```

4. **Replace `generateAISuggestions()` with Real AI**
```javascript
const generateAISuggestions = useCallback(async () => {
  if (!snappedRoute || !user) return;

  setLoadingAISuggestions(true);

  try {
    // Get user preferences
    const preferences = await EnhancedContextCollector.gatherDetailedPreferences(
      user.id,
      { startLocation: waypoints[0]?.position }
    );

    // Get AI-powered suggestions
    const suggestions = await analyzeAndEnhanceRoute(
      snappedRoute,
      preferences,
      trainingGoal
    );

    setAiSuggestions(suggestions);
    toast.success(`Generated ${suggestions.length} AI-powered suggestions`);
  } catch (error) {
    toast.error('Failed to generate suggestions');
  } finally {
    setLoadingAISuggestions(false);
  }
}, [snappedRoute, user, waypoints, trainingGoal]);
```

5. **Add Training Goal Selector**
```javascript
<SegmentedControl
  value={trainingGoal}
  onChange={setTrainingGoal}
  data={[
    { value: 'endurance', label: 'Endurance' },
    { value: 'intervals', label: 'Intervals' },
    { value: 'recovery', label: 'Recovery' },
    { value: 'hills', label: 'Hills' }
  ]}
/>
```

6. **Add Weather Display**
```javascript
const [weatherData, setWeatherData] = useState(null);

// Fetch weather when route is drawn
useEffect(() => {
  if (waypoints.length > 0) {
    fetchWeather(waypoints[0].position);
  }
}, [waypoints]);
```

7. **Add Preference Settings Modal**
```javascript
<Modal opened={preferencesOpened} onClose={() => setPreferencesOpened(false)}>
  <PreferenceSettings
    userId={user?.id}
    onSave={(prefs) => {
      setUserPreferences(prefs);
      setPreferencesOpened(false);
    }}
  />
</Modal>
```

### Phase 3: Personal History Integration

**Goal:** Suggest improvements based on user's riding history

**New Features:**

1. **Analyze Riding Patterns**
```javascript
// Get user's riding patterns
const patterns = await analyzeRidingPatterns(user.id);

// Suggest routes similar to ones they like
const similarRoutes = findSimilarRoutes(currentRoute, patterns);
```

2. **Route Templates**
```javascript
// Show "You often ride routes like this..."
const templates = await getUserRouteTemplates(user.id);

// Suggest variations
const variations = generateTemplateVariations(currentRoute, templates);
```

3. **Smart Suggestions Based on History**
```javascript
// "Based on your rides, you prefer..."
// "This route avoids areas you typically avoid"
// "Similar to your favorite 30km loop"
```

### Phase 4: Smart Routing Integration

**Goal:** Use intelligent routing instead of basic Mapbox

**Changes:**

1. **Replace Basic Snapping**
```javascript
// Old: Mapbox Directions API only
// New: smartCyclingRouter with preferences
const route = await generateSmartRoute({
  waypoints,
  preferences: userPreferences,
  trainingGoal,
  weather: weatherData
});
```

2. **Add Safety Scoring**
```javascript
// Show safety score for route
const safetyScore = calculateSafetyScore(route, preferences);
```

3. **Infrastructure Validation**
```javascript
// Validate route has proper cycling infrastructure
const validation = await validateInfrastructure(route);
```

## Benefits of Parity

1. **Consistency:** Users get the same AI quality in both tools
2. **Flexibility:** Can start with AI generation OR manual drawing
3. **Enhancement:** Manual routes get AI polish
4. **Learning:** AI learns from manual routes user draws
5. **Hybrid Workflow:** Generate with AI, refine manually, enhance with AI again

## Timeline

- **Phase 1:** Shared AI Enhancement Module - 2-3 days
- **Phase 2:** Route Studio Integration - 2-3 days
- **Phase 3:** Personal History - 1-2 days
- **Phase 4:** Smart Routing - 1-2 days

**Total:** ~1-2 weeks for full parity

## Priority Features (Start Here)

1. ✨ **Real AI Suggestions** (Phase 1 & 2)
2. 🎯 **User Preferences Integration** (Phase 2)
3. 🌦️ **Weather Display** (Phase 2)
4. 📊 **Training Goals** (Phase 2)
5. 🧠 **Smart Routing** (Phase 4)

## Success Metrics

- ✅ Route Studio uses same AI as AI Route Generator
- ✅ Both components share same preference system
- ✅ Suggestions improve route quality measurably
- ✅ Users can switch between manual and AI modes seamlessly
- ✅ AI learns from both generated and manually-drawn routes
