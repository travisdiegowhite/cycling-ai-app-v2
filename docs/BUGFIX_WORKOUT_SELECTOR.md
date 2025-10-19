# Bug Fix: Workout Selector Dropdown Error

## Issue

When clicking to generate a route, users encountered this error:
```
ERROR: Cannot read properties of undefined (reading 'map')
TypeError: Cannot read properties of undefined (reading 'map')
```

## Root Cause

The Mantine `Select` component's `data` prop was receiving `undefined` instead of an array. This happened when:
1. The `WORKOUT_LIBRARY` import wasn't properly loaded
2. No fallback handling for undefined data

## Fixes Applied

### 1. Added Import Fallback
**File:** `src/components/WorkoutSelector.js`

```javascript
// Import both named and default exports
import WORKOUT_LIBRARY_DEFAULT, { WORKOUT_LIBRARY } from '../data/workoutLibrary';

// Use whichever is available
const LIBRARY = WORKOUT_LIBRARY || WORKOUT_LIBRARY_DEFAULT || {};
```

### 2. Added Early Return for Empty Library
```javascript
// Early return if library is empty
if (!LIBRARY || Object.keys(LIBRARY).length === 0) {
  return (
    <Alert icon={<Info size={16} />} title="Workout Library Not Loaded" color="red">
      The workout library failed to load. Please refresh the page or contact support.
    </Alert>
  );
}
```

### 3. Added Debug Logging
```javascript
// Debug: Log library on load
console.log('Workout Library loaded:', {
  totalWorkouts: Object.keys(LIBRARY).length,
  firstWorkout: Object.keys(LIBRARY)[0],
  sampleWorkout: Object.values(LIBRARY)[0]
});
```

### 4. Added Null Safety in Dropdown
```javascript
const workoutOptions = Object.values(LIBRARY).map(workout => ({
  value: workout.id,
  label: `${workout.name} (${workout.duration}min, ${workout.targetTSS} TSS)`,
  group: workout.category.replace('_', ' ')
}));

// Always pass an array, never undefined
<Select
  data={workoutOptions}  // No longer can be undefined
  value={selectedWorkoutId || null}  // Handle null properly
  // ...
/>
```

### 5. Added Callback Safety in AIRouteGenerator
**File:** `src/components/AIRouteGenerator.js`

```javascript
const handleLibraryWorkoutSelect = useCallback((workout) => {
  // Guard clause
  if (!workout) {
    console.error('No workout provided to handleLibraryWorkoutSelect');
    return;
  }

  // Use defaults for all properties
  setTrainingContext({
    workoutType: workout.category || 'endurance',
    phase: 'build',
    targetDuration: workout.duration || 60,
    targetTSS: workout.targetTSS || 75,
    primaryZone: workout.primaryZone || 2
  });

  // ...
}, []);
```

## Testing

### Test the Fix

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12) and check for:
   ```
   Workout Library loaded: {totalWorkouts: 40, ...}
   ```

3. **Navigate to Smart Route Planner:**
   - Set a start location
   - Expand "Advanced Options"
   - Check that the "Choose From Workout Library" dropdown appears

4. **Select a workout:**
   - Click the dropdown
   - Should see 40+ workouts grouped by category
   - Select any workout (e.g., "Traditional Sweet Spot")
   - Check console for:
     ```
     Workout selected from dropdown: traditional_sst
     Found workout object: {id: "traditional_sst", ...}
     Workout selected from library: {...}
     ```

5. **Verify the workout is applied:**
   - Time slider should update to match workout duration
   - Workout details should appear below dropdown
   - Toast notification should show "Workout selected: [name]"

## Debug Commands

If the error still occurs, check these in browser console:

```javascript
// Check if library loaded
import { WORKOUT_LIBRARY } from './src/data/workoutLibrary.js';
console.log(WORKOUT_LIBRARY);

// Check if there are workouts
console.log(Object.keys(WORKOUT_LIBRARY).length);

// Check first workout
console.log(Object.values(WORKOUT_LIBRARY)[0]);
```

## Prevention

To prevent similar errors in the future:

1. **Always provide fallbacks for external data:**
   ```javascript
   const data = externalData || [];
   ```

2. **Add early returns for invalid states:**
   ```javascript
   if (!data || data.length === 0) return <ErrorComponent />;
   ```

3. **Use optional chaining:**
   ```javascript
   workout?.category || 'default'
   ```

4. **Add console logs during development:**
   ```javascript
   console.log('Data loaded:', data);
   ```

5. **Test with empty/undefined data:**
   - Test component with `data={undefined}`
   - Test component with `data={[]}`
   - Test component with `data={null}`

## Files Modified

- ✅ `src/components/WorkoutSelector.js`
- ✅ `src/components/AIRouteGenerator.js`

### 6. Added Null Safety to Training Plan Select Components
**File:** `src/components/AIRouteGenerator.js`

Added defensive null checks to training plan selectors:

**Fixed at lines 972 and 986:**
```javascript
// Before (could fail if activePlans became undefined):
data={activePlans.map(plan => ({...}))}

// After (safe):
data={(activePlans || []).map(plan => ({...}))}

// Before (could fail if planWorkouts became undefined):
data={planWorkouts.map(workout => ({...}))}

// After (safe):
data={(planWorkouts || []).map(workout => ({...}))}
```

### 7. Fixed Incorrect Grouped Data Format for Mantine v8
**File:** `src/components/WorkoutSelector.js`

**THE ACTUAL ROOT CAUSE:** The workout selector was using an incorrect data format for grouped options!

**Before (INCORRECT - Mantine v7 format):**
```javascript
const workoutOptions = Object.values(LIBRARY).map(workout => ({
  value: workout.id,
  label: workout.name,
  group: categoryLabel  // ❌ This format doesn't work in Mantine v8!
}));

<Select data={workoutOptions} />
```

**After (CORRECT - Mantine v8 format):**
```javascript
// Step 1: Group workouts by category
const workoutsByCategory = {};
Object.values(LIBRARY).forEach(workout => {
  const categoryLabel = workout.category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  if (!workoutsByCategory[categoryLabel]) {
    workoutsByCategory[categoryLabel] = [];
  }

  workoutsByCategory[categoryLabel].push({
    value: workout.id,
    label: `${workout.name} (${workout.duration}min, ${workout.targetTSS} TSS)`
  });
});

// Step 2: Convert to Mantine's grouped format
const workoutOptions = Object.entries(workoutsByCategory).map(([group, items]) => ({
  group,
  items
}));

<Select data={workoutOptions} />
```

**Mantine v8 Grouped Data Requirements:**
```javascript
// Correct format:
[
  { group: 'Category Name', items: [{ value: '...', label: '...' }] },
  { group: 'Another Category', items: [{ value: '...', label: '...' }] }
]

// NOT this (v7 format):
[
  { value: '...', label: '...', group: 'Category Name' }  // ❌ Wrong!
]
```

## Status

✅ **FIXED**

The dropdown now:
- Safely handles undefined/null data in ALL Select components
- Shows clear error messages if library fails to load
- Logs debug information for troubleshooting
- Has proper null safety throughout both workout library and training plan selectors

---

**Last Updated:** 2025-10-18
**Status:** Resolved ✅
