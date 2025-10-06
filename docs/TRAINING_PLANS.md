# Training Plans Implementation

## Overview

This document outlines the complete training plan system implemented across Phases 1-3. The system provides comprehensive training analysis, intelligent workout scheduling, and integration with route generation.

---

## Architecture

### Database Schema (`database/training_plans_schema.sql`)

#### Tables

**1. training_plans**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- name: TEXT (plan name)
- goal_event_date: DATE (optional target event)
- goal_type: TEXT (endurance, climbing, racing, etc.)
- fitness_level: TEXT (beginner, intermediate, advanced)
- hours_per_week: INTEGER (3-40)
- duration_weeks: INTEGER (4-52)
- current_week: INTEGER (tracking progress)
- current_phase: TEXT (base, build, peak, taper, recovery)
- ftp: INTEGER (Functional Threshold Power in watts)
- max_heart_rate: INTEGER (BPM)
- status: TEXT (active, paused, completed, cancelled)
- started_at: TIMESTAMP
- completed_at: TIMESTAMP
```

**2. planned_workouts**
```sql
- id: UUID (primary key)
- plan_id: UUID (foreign key to training_plans)
- week_number: INTEGER (1-52)
- day_of_week: INTEGER (0=Sunday, 6=Saturday)
- workout_type: TEXT (rest, recovery, endurance, etc.)
- target_tss: INTEGER (0-500)
- target_duration: INTEGER (minutes)
- target_zone: DECIMAL (1-5)
- terrain_preference: TEXT (flat, rolling, hilly, mixed)
- description: TEXT
- completed: BOOLEAN
- completed_at: TIMESTAMP
- route_id: UUID (optional link to routes table)
- actual_tss: INTEGER (recorded after completion)
```

**3. training_metrics**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- date: DATE (unique per user)
- daily_tss: INTEGER (total TSS for the day)
- ctl: DECIMAL (Chronic Training Load - fitness)
- atl: DECIMAL (Acute Training Load - fatigue)
- tsb: DECIMAL (Training Stress Balance - form)
- weekly_volume_hours: DECIMAL
- weekly_elevation_gain: INTEGER
- calculated_at: TIMESTAMP
```

**4. workout_templates**
```sql
- id: UUID (primary key)
- name: TEXT (unique template name)
- workout_type: TEXT
- description: TEXT
- structure: JSONB (detailed workout structure)
- target_tss: INTEGER
- duration: INTEGER (minutes)
- terrain_type: TEXT
- difficulty_level: TEXT (beginner, intermediate, advanced)
```

#### Pre-Seeded Workout Templates

1. **Easy Recovery Ride** - Zone 1-2, 40 min, 30 TSS
2. **Endurance Base Build** - Zone 2, 110 min, 75 TSS
3. **Sweet Spot Intervals** - 3x15min @ Zone 3.5, 70 min, 85 TSS
4. **VO2 Max Intervals** - 5x5min @ Zone 5, 75 min, 95 TSS
5. **Hill Repeats** - 6x3min @ Zone 4, 70 min, 80 TSS
6. **Tempo Ride** - Zone 3, 60 min, 65 TSS
7. **Long Endurance Ride** - Zone 2, 180 min, 140 TSS

---

## Phase 1: Foundation

### Training Plan Constants (`src/utils/trainingPlans.js`)

#### Training Zones (Based on % of FTP)

```javascript
Zone 1 - Recovery: 0-55% FTP
Zone 2 - Endurance: 56-75% FTP
Zone 3 - Tempo: 76-90% FTP
Zone 3.5 - Sweet Spot: 88-94% FTP
Zone 4 - Threshold: 95-105% FTP
Zone 5 - VO2 Max: 106-150% FTP
```

#### Workout Types

| Type | Default TSS | Default Duration | Primary Zone |
|------|-------------|------------------|--------------|
| Rest | 0 | 0 | - |
| Recovery | 25 | 30 min | 1 |
| Endurance | 75 | 90 min | 2 |
| Tempo | 65 | 60 min | 3 |
| Sweet Spot | 85 | 70 min | 3.5 |
| Threshold | 90 | 75 min | 4 |
| VO2 Max | 95 | 75 min | 5 |
| Hill Repeats | 80 | 70 min | 4 |
| Intervals | 85 | 75 min | 4 |
| Long Ride | 140 | 180 min | 2 |

#### Training Phases

1. **Base Building** - 6-12 weeks, Zone 2 focus, aerobic foundation
2. **Build Phase** - 12-16 weeks, Zone 3-4 focus, FTP development
3. **Peak Phase** - 6-8 weeks, Zone 4-5 focus, race preparation
4. **Taper** - 1-3 weeks, reduced volume, maintained intensity
5. **Recovery Week** - Active recovery, reduced load

#### Goal Types

- **Endurance** - Long distance capability
- **Climbing** - Power-to-weight improvement
- **Racing** - Competitive event preparation
- **General Fitness** - Overall health and fitness
- **Century Ride** - 100-mile preparation
- **Gran Fondo** - Long sportive events

#### Fitness Levels

```javascript
Beginner: 3-5 hours/week, 150-250 weekly TSS
Intermediate: 5-8 hours/week, 250-400 weekly TSS
Advanced: 8-15 hours/week, 400-700 weekly TSS
```

### Key Functions

#### TSS Calculations

**calculateTSS(durationSeconds, normalizedPower, ftp)**
```javascript
// Formula: (duration_hours × intensity_factor² × 100)
const intensityFactor = normalizedPower / ftp;
const durationHours = durationSeconds / 3600;
return Math.round(durationHours * intensityFactor * intensityFactor * 100);
```

**estimateTSS(durationMinutes, distanceKm, elevationGainM, workoutType)**
```javascript
// Base TSS: 50 TSS/hour at endurance pace
let baseTSS = (durationMinutes / 60) * 50;

// Elevation factor: ~10 TSS per 300m climbing
const elevationFactor = (elevationGainM / 300) * 10;

// Intensity multipliers
const multipliers = {
  recovery: 0.5,
  endurance: 1.0,
  tempo: 1.3,
  sweet_spot: 1.5,
  threshold: 1.7,
  vo2max: 2.0,
  hill_repeats: 1.6,
  intervals: 1.6,
  long_ride: 1.0
};

return Math.round((baseTSS + elevationFactor) * multiplier);
```

#### Training Load Metrics

**calculateCTL(dailyTSS)** - Chronic Training Load
```javascript
// 42-day exponentially weighted average (fitness)
const decay = 1 / 42;
dailyTSS.forEach((tss, index) => {
  const weight = Math.exp(-decay * (dailyTSS.length - index - 1));
  ctl += tss * weight;
});
return Math.round(ctl * decay);
```

**calculateATL(dailyTSS)** - Acute Training Load
```javascript
// 7-day exponentially weighted average (fatigue)
const decay = 1 / 7;
dailyTSS.forEach((tss, index) => {
  const weight = Math.exp(-decay * (dailyTSS.length - index - 1));
  atl += tss * weight;
});
return Math.round(atl * decay);
```

**calculateTSB(ctl, atl)** - Training Stress Balance
```javascript
// Form/Freshness indicator
return ctl - atl;

// Interpretation:
// TSB > 25: Very fresh, ready for racing
// TSB 5-25: Well rested, peak performance
// TSB -10 to 5: Balanced, normal training
// TSB -30 to -10: Fatigued, building fitness
// TSB < -30: Very fatigued, risk of overtraining
```

### TrainingContextSelector Component

**Purpose**: Reusable component for specifying workout context

**Props**:
- `value` - Current training context object
- `onChange` - Callback when context changes
- `showEstimatedTSS` - Boolean to show TSS estimate
- `routeDistance` - Route distance in km
- `routeElevation` - Route elevation gain in meters

**Features**:
- Workout type selector with icons
- Training phase selector
- Target duration input (10-480 minutes)
- Target TSS input (0-500)
- Auto-updates duration/TSS when workout type changes
- Shows estimated TSS for current route
- Warning when route TSS differs from target by >20

**Usage**:
```jsx
<TrainingContextSelector
  value={trainingContext}
  onChange={setTrainingContext}
  showEstimatedTSS={true}
  routeDistance={50} // km
  routeElevation={800} // meters
/>
```

---

## Phase 2: Training Analysis

### TrainingDashboard Component

**Route**: `/training`

**Features**:

1. **Metric Cards**
   - CTL (Fitness) - with tooltip explaining 42-day average
   - ATL (Fatigue) - with tooltip explaining 7-day average
   - TSB (Form) - color-coded based on interpretation
   - Weekly TSS - last 7 days total

2. **Form Interpretation Alert**
   - Real-time feedback based on TSB value
   - Color-coded (green=fresh, blue=rested, yellow=neutral, orange=fatigued, red=very fatigued)
   - Actionable recommendations

3. **Active Plan Alert**
   - Shows current training plan name
   - Displays current week and phase
   - Quick link to view plan details

4. **Tabbed Views**
   - Overview - Training load charts
   - Ride History - Searchable table
   - Calendar - Monthly workout view

5. **Time Range Selector**
   - Last 7 days
   - Last 30 days
   - Last 90 days

**Data Loading**:
```javascript
// Loads from Supabase:
- Active training plans
- Last 90 days of rides
- Calculates daily TSS from ride data
- Computes CTL/ATL/TSB metrics
```

### TrainingLoadChart Component

**Purpose**: Visual representation of training load over time

**Charts**:

1. **Daily TSS Area Chart**
   - Shows daily training stress scores
   - Area fill with blue gradient
   - Responsive to container width

2. **CTL/ATL/TSB Line Chart**
   - Three lines: CTL (blue), ATL (orange), TSB (green)
   - Reference line at TSB = 0
   - Exponentially weighted calculations for each day
   - Interactive tooltips

**Library**: Recharts v3.1.2

**Processing**:
```javascript
// For each day in the dataset:
1. Calculate CTL from all previous days (42-day weighted)
2. Calculate ATL from last 7 days (7-day weighted)
3. Compute TSB = CTL - ATL
4. Format date for display
```

### RideHistoryTable Component

**Purpose**: Searchable table of all rides with metrics

**Columns**:
- Date
- Name
- Distance (with unit conversion)
- Elevation gain (with unit conversion)
- Duration (formatted as hours/minutes)
- Estimated TSS (calculated from ride data)
- Route type (loop, point-to-point, etc.)
- Actions (View, Edit buttons)

**Features**:
- Search by ride name
- TSS estimation formula
- Direct links to route viewer and editor
- Responsive design with horizontal scroll

### TrainingCalendar Component

**Purpose**: Monthly calendar view of planned workouts

**Features**:

1. **Calendar Grid**
   - 7-day week grid
   - Month navigation (previous/next)
   - Today highlighting (blue border)
   - Past days grayed out

2. **Workout Display**
   - Workout icon from WORKOUT_TYPES
   - Duration badge
   - Completion checkmark
   - Color-coded by workout type

3. **Week Calculation**
   - Calculates week number from plan start date
   - Maps day of week to workout
   - Handles multi-month plans

4. **Legend**
   - Shows workout type icons and names
   - Quick reference for users

---

## Phase 3: Structured Training Plans

### TrainingPlanBuilder Component

**Route**: `/training/plans/new`

**4-Step Wizard**:

#### Step 1: Plan Details
```javascript
Fields:
- name: TEXT (required)
- goal_type: SELECT (endurance, climbing, racing, etc.)
- goal_event_date: DATE (optional)
- fitness_level: SELECT (beginner, intermediate, advanced)
```

#### Step 2: Training Parameters
```javascript
Fields:
- hours_per_week: NUMBER (3-25)
- duration_weeks: NUMBER (4-52)
- ftp: NUMBER (100-500, optional)
- max_heart_rate: NUMBER (120-220, optional)

Displays:
- Recommended Weekly TSS (calculated from fitness level + hours)
```

#### Step 3: Review Schedule
```javascript
Action: Generate Training Schedule
- Creates workouts for all weeks
- Applies periodization logic
- Allows inline editing
```

#### Step 4: Confirm & Create
```javascript
Summary displays:
- Plan name, goal, duration
- Total workouts
- Average weekly TSS
- Weekly hours

Action: Creates plan in database
```

### Intelligent Schedule Generation

**Periodization Logic**:
```javascript
function determinPhase(weekNumber, totalWeeks) {
  const progress = (weekNumber / totalWeeks) * 100;

  if (progress < 40) return 'base';
  if (progress < 70) return 'build';
  if (progress < 90) return 'peak';
  return 'taper';
}

// Recovery week every 4th week
if (weekNumber % 4 === 0 && weekNumber !== totalWeeks) {
  return 'recovery';
}
```

**Base Phase Workouts** (Weeks 1-40%):
```
Sunday: Rest
Monday: Endurance 60min (60 TSS)
Tuesday: Endurance 90min (75 TSS)
Wednesday: Recovery 45min (30 TSS)
Thursday: Tempo 75min (70 TSS)
Friday: Rest
Saturday: Long Ride 150min (120 TSS)

Total: 355 TSS, 7 hours
```

**Build Phase Workouts** (Weeks 40-70%):
```
Sunday: Rest
Monday: Sweet Spot 70min (85 TSS)
Tuesday: Endurance 90min (75 TSS)
Wednesday: Recovery 45min (30 TSS)
Thursday: Threshold 75min (90 TSS)
Friday: Rest
Saturday: Long Ride 180min (140 TSS)

Total: 420 TSS, 7.5 hours
```

**Peak Phase Workouts** (Weeks 70-90%):
```
Sunday: Rest
Monday: VO2 Max 75min (95 TSS)
Tuesday: Endurance 75min (65 TSS)
Wednesday: Recovery 45min (30 TSS)
Thursday: Intervals 75min (85 TSS)
Friday: Rest
Saturday: Long Ride 150min (130 TSS)

Total: 405 TSS, 7 hours
```

**Taper Phase Workouts** (Weeks 90-100%):
```
Sunday: Rest
Monday: Intervals 45min (50 TSS)
Tuesday: Endurance 60min (50 TSS)
Wednesday: Recovery 30min (20 TSS)
Thursday: Rest
Friday: Recovery 30min (20 TSS)
Saturday: Rest

Total: 140 TSS, 3.4 hours
```

**Recovery Week Workouts**:
```
Sunday: Rest
Monday: Recovery 45min (30 TSS)
Tuesday: Endurance 60min (50 TSS)
Wednesday: Rest
Thursday: Recovery 45min (30 TSS)
Friday: Rest
Saturday: Endurance 90min (70 TSS)

Total: 180 TSS, 4 hours
```

**Goal-Specific Adjustments**:
```javascript
if (goalType === 'climbing') {
  // Set terrain preference to 'hilly'
  // Prioritize hill repeats and threshold work
}

if (goalType === 'racing') {
  // More VO2max and intervals
  // Longer peak phase
}

if (goalType === 'endurance' || goalType === 'century') {
  // Longer base phase
  // Progressive long ride increases
}
```

### WeeklySchedule Component

**Purpose**: Display and edit weekly workout schedules

**Features**:

1. **Accordion View**
   - Collapsible weeks
   - Phase badge (color-coded)
   - Total hours and TSS per week
   - Workout count

2. **Workout Cards**
   - Day name + workout type
   - Duration badge
   - TSS badge
   - Zone badge
   - Terrain indicator
   - Edit/Delete buttons

3. **Edit Modal**
   ```javascript
   Fields:
   - workout_type: SELECT
   - target_duration: NUMBER (0-480 min)
   - target_tss: NUMBER (0-500)
   - target_zone: NUMBER (1-5, step 0.5)
   - terrain_preference: SELECT (flat, rolling, hilly, mixed)
   ```

4. **Live Updates**
   - Recalculates week totals when workout edited
   - Updates parent component state
   - Maintains data consistency

---

## Integration Points

### AI Route Generator Integration

**File**: `src/components/AIRouteGenerator.js`

**Changes**:
```javascript
// Added imports
import TrainingContextSelector from './TrainingContextSelector';
import { estimateTSS } from '../utils/trainingPlans';

// Added state
const [trainingContext, setTrainingContext] = useState({
  workoutType: 'endurance',
  phase: 'base',
  targetDuration: 60,
  targetTSS: 75,
  primaryZone: 2
});

// Pass to route generation
const routes = await generateAIRoutes({
  ...params,
  trainingContext: trainingContext
});

// Display TSS on route cards
{generatedRoutes.map(route => {
  const estimatedTSS = estimateTSS(
    trainingContext.targetDuration,
    route.distance,
    route.elevationGain,
    trainingContext.workoutType
  );

  return (
    <Badge color="blue" variant="light">
      {estimatedTSS} TSS
    </Badge>
  );
})}
```

### Route Studio Integration

**File**: `src/components/RouteStudio.js`

**Changes**:
```javascript
// Added imports
import TrainingContextSelector from './TrainingContextSelector';
import { estimateTSS } from '../utils/trainingPlans';

// Added state
const [trainingContext, setTrainingContext] = useState({
  workoutType: 'endurance',
  phase: 'base',
  targetDuration: 60,
  targetTSS: 75,
  primaryZone: 2
});

// Added UI component
<TrainingContextSelector
  value={trainingContext}
  onChange={setTrainingContext}
  showEstimatedTSS={snappedRoute?.coordinates?.length > 0}
  routeDistance={snappedRoute ? (snappedRoute.distance / 1000) : 0}
  routeElevation={elevationStats?.gain || 0}
/>

// Pass to AI enhancement
const suggestions = await analyzeAndEnhanceRoute(
  routeForAnalysis,
  prefs,
  trainingGoal,
  weatherData,
  trainingContext
);
```

---

## Navigation

**Added to `src/components/AppLayout.js`**:

```javascript
<Button
  variant={activePage === 'training' ? 'filled' : 'subtle'}
  leftSection={<TrendingUp size={18} />}
  onClick={() => handleNavigation('training', '/training')}
  justify="flex-start"
  fullWidth
>
  Training Dashboard
</Button>
```

**Added to `src/App.js`**:

```javascript
import TrainingDashboard from './components/TrainingDashboard';
import TrainingPlanBuilder from './components/TrainingPlanBuilder';

// Routes
<Route path="/training" element={<TrainingDashboard />} />
<Route path="/training/plans/new" element={<TrainingPlanBuilder />} />

// Active page handler
else if (path.startsWith('/training')) setActivePage('training');
```

---

## Dependencies

### New Package Added

```json
{
  "@mantine/dates": "^8.3.3",
  "dayjs": "^1.11.18"
}
```

**Purpose**: Date picker components for goal event date selection

### Existing Dependencies Used

```json
{
  "recharts": "^3.1.2",        // Training load charts
  "@mantine/core": "^8.2.4",   // UI components
  "@mantine/hooks": "^8.2.4",  // React hooks
  "@supabase/supabase-js": "^2.57.4" // Database
}
```

---

## Usage Flow

### User Journey 1: View Training Metrics

1. Click "Training Dashboard" in sidebar
2. View current CTL/ATL/TSB metrics
3. Read form interpretation and recommendations
4. Switch to "Overview" tab to see charts
5. Analyze training load trends over time
6. Switch to "Ride History" to review past rides
7. Search for specific rides by name
8. Click "View" or "Edit" to work with routes

### User Journey 2: Create Training Plan

1. Click "Training Dashboard" in sidebar
2. Click "New Training Plan" button
3. **Step 1**: Enter plan details
   - Name: "Spring Century Training"
   - Goal: Century Ride
   - Event Date: May 15, 2025
   - Fitness: Intermediate
4. **Step 2**: Set parameters
   - Hours/week: 8
   - Duration: 16 weeks
   - FTP: 250 watts
   - Max HR: 185 BPM
5. **Step 3**: Review schedule
   - Click "Generate Training Schedule"
   - Review 16-week plan with 112 workouts
   - Edit specific workouts if needed
6. **Step 4**: Confirm
   - Review summary
   - Click "Create Training Plan"
7. Plan is created and saved to database
8. Redirected to Training Dashboard

### User Journey 3: Generate Route for Workout

1. Navigate to AI Route Generator
2. Set training context:
   - Workout: Sweet Spot Intervals
   - Phase: Build
   - Duration: 70 minutes
   - Target TSS: 85
3. Set other parameters (location, route type)
4. Generate routes
5. View TSS estimates on each route card
6. Select route that matches target TSS
7. Route loads into Route Studio
8. Save route and link to planned workout

### User Journey 4: Track Workout Completion

1. Navigate to Training Dashboard
2. Click "Calendar" tab
3. View today's planned workout
4. Click workout to see details
5. Complete workout (ride the route)
6. Workout auto-marked as completed
7. TSS recorded in training metrics
8. CTL/ATL/TSB updated automatically

---

## Database Queries

### Load Training Dashboard Data

```javascript
// Get active plan
const { data: plans } = await supabase
  .from('training_plans')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(1);

// Get recent rides (90 days)
const daysAgo = new Date();
daysAgo.setDate(daysAgo.getDate() - 90);

const { data: rides } = await supabase
  .from('routes')
  .select('*')
  .eq('user_id', user.id)
  .gte('created_at', daysAgo.toISOString())
  .order('created_at', { ascending: false });
```

### Create Training Plan

```javascript
// Insert plan
const { data: plan, error } = await supabase
  .from('training_plans')
  .insert([{
    user_id: user.id,
    name: 'Spring Century Training',
    goal_type: 'century',
    goal_event_date: '2025-05-15',
    fitness_level: 'intermediate',
    hours_per_week: 8,
    duration_weeks: 16,
    current_phase: 'base',
    ftp: 250,
    max_heart_rate: 185,
    status: 'active'
  }])
  .select()
  .single();

// Insert workouts
const allWorkouts = weeklySchedule.flatMap(week =>
  week.workouts.map(workout => ({
    plan_id: plan.id,
    week_number: week.week_number,
    day_of_week: workout.day_of_week,
    workout_type: workout.workout_type,
    target_tss: workout.target_tss,
    target_duration: workout.target_duration,
    target_zone: workout.target_zone,
    terrain_preference: workout.terrain_preference
  }))
);

const { error: workoutsError } = await supabase
  .from('planned_workouts')
  .insert(allWorkouts);
```

### Load Calendar Workouts

```javascript
// Get workouts for current month
const { data: workouts } = await supabase
  .from('planned_workouts')
  .select('*')
  .eq('plan_id', activePlan.id)
  .in('week_number', weekNumbers)
  .order('week_number', { ascending: true })
  .order('day_of_week', { ascending: true });
```

---

## Future Enhancements

### Phase 4 Ideas

1. **Auto-Generated Plans**
   - AI-powered plan generation based on user history
   - Adaptive scheduling based on performance
   - Integration with fitness platforms (Strava, TrainingPeaks)

2. **Progress Tracking**
   - Week-over-week comparisons
   - FTP testing and tracking
   - Performance predictions

3. **Advanced Analytics**
   - Power curve analysis
   - Heart rate zone distribution
   - Fatigue modeling

4. **Social Features**
   - Share training plans
   - Coach collaboration
   - Group challenges

5. **Mobile App**
   - Workout reminders
   - On-bike guidance
   - Post-ride analysis

### Immediate Next Steps

1. **Link Routes to Workouts**
   - Add route_id to planned_workouts when route is saved
   - Show linked routes in calendar
   - Quick access to route from workout

2. **Workout Completion Tracking**
   - Mark workouts as completed
   - Record actual TSS vs. planned
   - Calculate compliance percentage

3. **Plan Progress View**
   - Week-by-week progress chart
   - Completion percentage
   - Upcoming workouts preview

4. **Export/Import Plans**
   - Export to CSV/JSON
   - Import from TrainingPeaks
   - Share with other users

---

## Technical Notes

### Performance Considerations

1. **Chart Rendering**
   - Recharts uses React memoization
   - Data processed once and cached
   - Responsive containers for smooth resizing

2. **Database Queries**
   - Indexed on user_id and date columns
   - Limited to 90 days for CTL calculation
   - Batch inserts for workout creation

3. **State Management**
   - React useState for local state
   - Minimal prop drilling
   - Efficient re-renders with useCallback/useMemo

### Security

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only access their own data
   - Workout templates are public read-only

2. **Data Validation**
   - CHECK constraints on database columns
   - Client-side validation in forms
   - Sanitized inputs before database operations

### Testing Considerations

1. **Unit Tests**
   - TSS calculation functions
   - CTL/ATL/TSB calculations
   - Schedule generation logic

2. **Integration Tests**
   - Plan creation flow
   - Workout editing
   - Calendar navigation

3. **E2E Tests**
   - Complete user journey: create plan → view dashboard → edit workout
   - Route generation with training context
   - TSS estimation accuracy

---

## Troubleshooting

### Common Issues

**1. TSS Estimates Don't Match Expectations**
- Check workout type multiplier
- Verify elevation data is accurate
- Ensure duration is in correct units

**2. Charts Not Rendering**
- Check recharts is installed: `npm list recharts`
- Verify data format matches chart requirements
- Check browser console for errors

**3. Workouts Not Showing in Calendar**
- Verify plan is active
- Check week number calculation
- Ensure day_of_week is 0-6

**4. Plan Creation Fails**
- Check all required fields are filled
- Verify database connection
- Check RLS policies are correct

### Debug Tips

```javascript
// Enable debug logging for TSS calculations
console.log('TSS Calculation:', {
  duration: durationMinutes,
  distance: distanceKm,
  elevation: elevationGainM,
  workoutType,
  result: estimatedTSS
});

// Check CTL/ATL/TSB values
console.log('Training Load:', {
  ctl: calculateCTL(dailyTSS),
  atl: calculateATL(dailyTSS.slice(-7)),
  tsb: calculateTSB(ctl, atl),
  interpretation: interpretTSB(tsb)
});

// Verify schedule generation
console.log('Generated Schedule:', {
  weeks: weeklySchedule.length,
  totalWorkouts: weeklySchedule.reduce((sum, w) => sum + w.workouts.length, 0),
  avgWeeklyTSS: weeklySchedule.reduce((sum, w) => sum + w.total_tss, 0) / weeklySchedule.length
});
```

---

## Conclusion

This training plan system provides a complete solution for structured cycling training, from analysis to planning to execution. The three-phase implementation covers:

- **Phase 1**: Foundation with TSS calculations and training context
- **Phase 2**: Comprehensive analysis with metrics and visualizations
- **Phase 3**: Intelligent plan creation with periodization

The system integrates seamlessly with existing route generation features and provides a solid foundation for future enhancements.

---

## References

- [Training Stress Score (TSS) Explained](https://www.trainingpeaks.com/blog/what-is-tss/)
- [Chronic Training Load (CTL) and Performance](https://www.trainingpeaks.com/blog/the-science-of-the-performance-manager/)
- [Periodization in Endurance Training](https://www.trainingpeaks.com/blog/periodization-of-training/)
- [Power Training Zones](https://www.trainingpeaks.com/blog/power-training-levels/)

---

**Last Updated**: 2025-10-05
**Version**: 1.0.0
**Author**: Claude Code + Travis White
