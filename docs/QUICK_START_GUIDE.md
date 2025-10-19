# Quick Start Guide - Power-Based Training Library

## For End Users

### How to Use the Workout Library

**Option 1: Browse First, Route Second**
1. Click **"Workout Library"** in the sidebar
2. Browse workouts or use filters to find what you want
3. Click on a workout to see full details
4. Click **"Generate Route"** button
5. AI creates the perfect route for your workout

**Option 2: Route with Workout**
1. Click **"Smart Route Planner"** in sidebar
2. Set your start location
3. Click **"Advanced Options"** to expand
4. Select a workout from the **"Workout Library"** dropdown
5. Click **"Find My Routes"**

---

## For Developers

### Running the App

```bash
cd /home/travis/Desktop/cycling-ai-app-v2

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Testing the Integration

**Test Workout Library Page:**
1. Navigate to `http://localhost:3000/workouts`
2. You should see:
   - 3 stat cards at the top
   - Filter controls
   - Accordion with workout categories
   - "Training Methodologies" tab

**Test Route Generator Integration:**
1. Navigate to `http://localhost:3000/`
2. Set a start location (click map or use current location)
3. Click "Advanced Options"
4. Find "Choose From Workout Library" section
5. Select any workout from dropdown
6. Verify:
   - Time slider updates to match workout duration
   - Workout details appear below dropdown
   - Coach notes are visible

### File Locations

**Workout Data:**
- `src/data/workoutLibrary.js` - All 40+ workouts
- `src/data/trainingPlanTemplates.js` - 5 complete training plans

**Components:**
- `src/components/WorkoutSelector.js` - Workout browser/selector
- `src/components/WorkoutLibrary.js` - Full page view
- `src/components/AIRouteGenerator.js` - Integrated with workout selector

**Documentation:**
- `docs/TRAINING_SCIENCE_2025.md` - Full training methodology guide
- `docs/POWER_TRAINING_SUMMARY.md` - Feature summary & competitive analysis
- `docs/WORKOUT_QUICK_REFERENCE.md` - Quick workout lookup
- `docs/INTEGRATION_COMPLETE.md` - Integration details

### Adding a New Workout

1. Open `src/data/workoutLibrary.js`
2. Add a new workout object to `WORKOUT_LIBRARY`:

```javascript
export const WORKOUT_LIBRARY = {
  // ... existing workouts ...

  my_new_workout: {
    id: 'my_new_workout',
    name: 'My New Workout',
    category: 'threshold',  // recovery, endurance, tempo, sweet_spot, threshold, vo2max, climbing, anaerobic
    difficulty: 'intermediate',  // beginner, intermediate, advanced
    duration: 60,  // minutes
    targetTSS: 75,
    intensityFactor: 0.85,
    description: 'Description of what this workout does',
    focusArea: 'threshold',  // aerobic_base, muscular_endurance, threshold, vo2max, anaerobic, recovery, mixed
    tags: ['threshold', 'intervals', 'my-tag'],
    terrainType: 'flat',  // flat, rolling, hilly, mixed
    structure: {
      warmup: { duration: 10, zone: 2, powerPctFTP: 65 },
      main: [
        { duration: 40, zone: 4, powerPctFTP: 95, description: 'Main effort' }
      ],
      cooldown: { duration: 10, zone: 1, powerPctFTP: 50 }
    },
    coachNotes: 'Tips for completing this workout successfully',
    primaryZone: 4
  }
};
```

3. Save the file
4. Workout will immediately appear in the library (no restart needed in dev mode)

### Database Migration (Optional)

To add workouts to the database:

```bash
# Apply migration
node scripts/apply-workout-migration.js
```

**Note:** The app currently works entirely from the JavaScript files. The database migration is optional and only needed if you want to:
- Store custom user-created workouts
- Add workout ratings/reviews
- Track workout analytics

---

## Customization

### Changing Filters

Edit `src/components/WorkoutSelector.js`:

```javascript
const filteredWorkouts = useMemo(() => {
  return Object.values(WORKOUT_LIBRARY).filter(workout => {
    // Add custom filter logic here
    // Example: Only show workouts under 90 minutes
    if (workout.duration > 90) return false;

    // Existing filters...
    return true;
  });
}, [filters]);
```

### Adding New Training Methodologies

Edit `src/data/workoutLibrary.js`:

```javascript
export const TRAINING_METHODOLOGIES = {
  // ... existing methodologies ...

  my_methodology: {
    name: 'My Custom Methodology',
    description: 'Description of this training approach',
    weeklyDistribution: {
      zone1_2: 0.60,
      zone3_4: 0.30,
      zone5_plus: 0.10
    },
    bestFor: ['goal1', 'goal2'],
    researchBasis: 'Based on...',
    sampleWeek: [
      { day: 'Monday', workout: 'recovery_spin' },
      { day: 'Tuesday', workout: 'traditional_sst' },
      // ...
    ]
  }
};
```

### Styling

The components use Mantine UI components. To customize styling:

**Global Theme:**
Edit `src/theme.js`

**Component-Level:**
Use inline styles or Mantine's style props:

```jsx
<Card
  withBorder
  p="md"
  style={{
    backgroundColor: 'your-color',
    borderRadius: '8px'
  }}
>
```

---

## Troubleshooting

### "Module not found" errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Workouts not showing up

1. Check browser console for errors
2. Verify import in component:
   ```javascript
   import { WORKOUT_LIBRARY } from '../data/workoutLibrary';
   ```
3. Check file path is correct

### Route generation not working with workouts

1. Verify `useTrainingContext` toggle is enabled in Advanced Options
2. Check that training context is being passed to `generateAIRoutes`
3. Look for errors in browser console

### TypeScript errors (if using TypeScript)

The library is written in JavaScript. If you're using TypeScript:

1. Add type definitions for workout objects
2. Or add `// @ts-ignore` above imports

---

## Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables

Make sure these are set in your production environment:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
VITE_MAPBOX_TOKEN=your-mapbox-token
# ... other variables
```

### Vercel Deployment

If deploying to Vercel:

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

---

## Support

### Documentation

- [TRAINING_SCIENCE_2025.md](TRAINING_SCIENCE_2025.md) - Full training guide
- [POWER_TRAINING_SUMMARY.md](POWER_TRAINING_SUMMARY.md) - Feature overview
- [WORKOUT_QUICK_REFERENCE.md](WORKOUT_QUICK_REFERENCE.md) - Workout quick reference
- [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md) - Technical integration details

### Common Questions

**Q: Can users create custom workouts?**
A: Not yet. This is a future feature. Currently, the 40+ pre-built workouts are available.

**Q: Do I need to run the database migration?**
A: No, it's optional. The app works entirely from the JavaScript workout library.

**Q: How do I update workout TSS or duration?**
A: Edit the workout object in `src/data/workoutLibrary.js` and save. Changes appear immediately.

**Q: Can I delete workouts I don't want?**
A: Yes, just remove the workout object from `WORKOUT_LIBRARY` in `workoutLibrary.js`.

**Q: How do I add my own training methodology?**
A: Add a new entry to `TRAINING_METHODOLOGIES` in `workoutLibrary.js`.

---

## Next Steps

1. **Test the integration** - Go through the full user flow
2. **Add your own workouts** - Customize for your audience
3. **Market the feature** - Tell users about the new workout library
4. **Collect feedback** - See which workouts are most popular
5. **Iterate** - Add new workouts based on user requests

---

**Ready to Ship!** 🚀

The power-based training library is fully integrated and ready for users.

**Last Updated:** 2025-10-18
