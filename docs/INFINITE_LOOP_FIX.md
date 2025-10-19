# Critical Bug Fix: Infinite Render Loop in WorkoutSelector

## Problem

**Error:** React Error #185 - Maximum Update Depth Exceeded
**Symptom:** Blank screen, app crashes, infinite loop
**Root Cause:** WorkoutSelector component was recalculating data on every render, causing infinite re-render cycle

## Root Causes Identified

### 1. Unstable Data Reference (Primary Cause)
```javascript
// ❌ BEFORE - Created new array on EVERY render
if (compact) {
  const workoutOptions = Object.entries(workoutsByCategory).map(...);

  return <Select data={workoutOptions} />;
}
```

**Problem:** Every time the component rendered, a new `workoutOptions` array was created. This new reference caused Mantine's Select to think the data changed, triggering a re-render, which created a new array, which triggered another re-render, ad infinitum.

### 2. Unstable onChange Handler
```javascript
// ❌ BEFORE - Created new function on every render
onChange={(workoutId) => {
  const workout = LIBRARY[workoutId];
  if (workout && onWorkoutSelect) {
    onWorkoutSelect(workout);
  }
}}
```

**Problem:** Inline arrow function was recreated on every render, causing unnecessary re-renders in Mantine's Select component.

### 3. Console Logging in Render Cycle
```javascript
// ❌ BEFORE - Logged on every render
if (compact) {
  console.log('Workout options for dropdown:', ...);
  return <Select ... />;
}
```

**Problem:** While not causing the infinite loop directly, logging on every render added performance overhead.

## Solutions Implemented

### 1. Memoize Workout Options with `useMemo`
```javascript
// ✅ AFTER - Calculate once, reuse forever
const workoutOptions = useMemo(() => {
  console.log('🔄 Calculating workout options (should only happen once)');
  const workoutsByCategory = {};

  Object.values(LIBRARY).forEach(workout => {
    const categoryLabel = workout.category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    if (!workoutsByCategory[categoryLabel]) {
      workoutsByCategory[categoryLabel] = [];
    }

    workoutsByCategory[categoryLabel].push({
      value: workout.id || '',
      label: `${workout.name} (${workout.duration}min, ${workout.targetTSS} TSS)`
    });
  });

  const options = Object.entries(workoutsByCategory).map(([group, items]) => ({
    group,
    items
  }));

  console.log('✅ Workout options calculated:', {
    totalGroups: options.length,
    totalWorkouts: Object.keys(LIBRARY).length
  });

  return options;
}, []); // Empty deps - LIBRARY is constant
```

**Why this works:**
- `useMemo` ensures the calculation only runs once (empty dependency array)
- Same array reference is returned on every render
- No unnecessary re-renders triggered

### 2. Memoize onChange Handler with `useCallback`
```javascript
// ✅ AFTER - Stable function reference
const handleWorkoutChange = useCallback((workoutId) => {
  console.log('Workout selected from dropdown:', workoutId);
  if (!workoutId) return;
  const workout = LIBRARY[workoutId];
  console.log('Found workout object:', workout);
  if (workout && onWorkoutSelect) {
    onWorkoutSelect(workout);
  }
}, [onWorkoutSelect]);

// Use in Select
<Select onChange={handleWorkoutChange} />
```

**Why this works:**
- `useCallback` creates a stable function reference
- Only recreates if `onWorkoutSelect` changes
- Prevents Select from re-rendering unnecessarily

### 3. Wrap Component with `React.memo`
```javascript
// ✅ AFTER - Prevent unnecessary parent re-renders
export default React.memo(WorkoutSelector);
```

**Why this works:**
- `React.memo` prevents re-renders when props haven't changed
- Even if parent re-renders, WorkoutSelector won't unless props change
- Additional layer of protection

### 4. Remove Console Logging from Render Cycle
```javascript
// ✅ AFTER - Only log during calculation inside useMemo
if (compact) {
  return <Select data={workoutOptions} />;
}
```

**Why this works:**
- Logging moved inside `useMemo`, only happens once
- No performance overhead on every render

## Prevention Strategy

### Never Create Objects/Arrays in Render
```javascript
// ❌ BAD - Creates new reference every render
const data = workouts.map(w => ({ value: w.id, label: w.name }));

// ✅ GOOD - Stable reference via useMemo
const data = useMemo(
  () => workouts.map(w => ({ value: w.id, label: w.name })),
  [workouts]
);
```

### Never Create Functions in Render
```javascript
// ❌ BAD - Creates new function every render
<Select onChange={(id) => handleChange(id)} />

// ✅ GOOD - Stable reference via useCallback
const handleChange = useCallback((id) => doSomething(id), [deps]);
<Select onChange={handleChange} />
```

### Use React.memo for Expensive Components
```javascript
// ✅ GOOD - Only re-render when props change
export default React.memo(ExpensiveComponent);
```

### Watch for These Red Flags
1. Creating arrays/objects directly in JSX
2. Inline arrow functions in event handlers
3. Console logs in component body (outside hooks)
4. Complex calculations in render without `useMemo`
5. Event handlers not wrapped in `useCallback`

## Verification

After applying these fixes, you should see in console:
```
🔄 Calculating workout options (should only happen once)
✅ Workout options calculated: { totalGroups: 7, totalWorkouts: 40 }
```

This message should appear **ONLY ONCE** when the component first mounts.

If you see it repeating, the infinite loop is still occurring.

## Testing Checklist

- [ ] Open app - no blank screen
- [ ] Console shows workout calculation only once
- [ ] Can select workout from dropdown
- [ ] Selecting workout doesn't trigger re-calculation
- [ ] No React error #185 in console
- [ ] Route generation works with selected workout
- [ ] Interval cues display correctly

## Files Modified

- `src/components/WorkoutSelector.js`:
  - Added `useCallback` import
  - Wrapped `workoutOptions` in `useMemo`
  - Wrapped `handleWorkoutChange` in `useCallback`
  - Wrapped export with `React.memo`
  - Moved console logs inside `useMemo`

## Related Issues

- **Original Bug**: Mantine v8 grouped data format (fixed)
- **Null Safety**: Training plan selectors (fixed)
- **This Bug**: Infinite render loop (fixed)

All three issues are now resolved with proper React patterns.
