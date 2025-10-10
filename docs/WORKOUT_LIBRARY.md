# Workout Library Documentation

## Overview

The workout library contains curated cycling training workouts based on proven training methodologies and open-source workout files from the cycling community. These templates can be used as recommendations when creating training plans.

## Workout Categories

### Recovery Workouts
**Purpose:** Active recovery, promote blood flow, aid recovery without adding training stress

- **Active Recovery - Z2** (60 min, TSS: 40)
  - 12 x 5min intervals at 65% FTP
  - Difficulty: Beginner
  - Focus: Recovery
  - Tags: `recovery`, `z2`, `easy`, `active-recovery`

### Sweet Spot Training (SST)
**Purpose:** Build threshold power without excessive fatigue (88-93% FTP)

- **Traditional SST** (65 min, TSS: 100)
  - 45min sustained effort at 90% FTP
  - Difficulty: Intermediate
  - Focus: Threshold
  - Tags: `sst`, `sweet-spot`, `threshold-building`

- **3x10 Sweet Spot** (45 min, TSS: 85)
  - 3 x 10min @ 90% FTP with 5min recovery
  - Difficulty: Intermediate
  - Focus: Threshold
  - Tags: `sst`, `intervals`, `sweet-spot`

### Threshold Intervals
**Purpose:** Build lactate threshold and race-specific fitness

- **Tempo Bursts** (75 min, TSS: 95)
  - 3 sets of 4x(2min @ 90% + 5sec sprint) with 4min recovery
  - Difficulty: Advanced
  - Focus: Mixed (threshold + neuromuscular)
  - Tags: `threshold`, `tempo`, `sprints`, `neuromuscular`

- **Descending Pyramid** (70 min, TSS: 105)
  - 20min + 10min + 5min @ 98% FTP with 5min recovery
  - Difficulty: Advanced
  - Focus: Threshold
  - Tags: `threshold`, `ftp`, `pyramid`, `lactate-threshold`

- **Over-Under Intervals** (75 min, TSS: 100)
  - 3 x 10min alternating 2min @ 95% and 1min @ 105% FTP
  - Difficulty: Advanced
  - Focus: Threshold
  - Tags: `over-under`, `threshold`, `surges`, `race-simulation`

### VO2 Max Intervals
**Purpose:** Increase aerobic capacity and maximum oxygen uptake

- **8x2min VO2 Max** (57 min, TSS: 90)
  - 8 x 2min @ 120% FTP with 2min recovery
  - Difficulty: Advanced
  - Focus: VO2 Max
  - Tags: `vo2max`, `intervals`, `high-intensity`

- **5x4min VO2 Max** (65 min, TSS: 95)
  - 5 x 4min @ 115% FTP with 4min recovery
  - Difficulty: Advanced
  - Focus: VO2 Max
  - Tags: `vo2max`, `intervals`, `aerobic-capacity`

### Endurance Workouts
**Purpose:** Build aerobic base and fat oxidation capacity

- **Foundation Endurance** (110 min, TSS: 75)
  - 90min steady Zone 2 at 68% FTP
  - Difficulty: Intermediate
  - Focus: Aerobic Base
  - Tags: `endurance`, `z2`, `base`, `aerobic`

- **2-Hour Base Ride** (140 min, TSS: 110)
  - 60min Z2 + 20min tempo + 30min Z2
  - Difficulty: Intermediate
  - Focus: Aerobic Base
  - Tags: `endurance`, `long-ride`, `weekend`, `base`

### Climbing Workouts
**Purpose:** Build climbing-specific power and muscular endurance

- **Climbing Repeats** (85 min, TSS: 90)
  - 6 x 5min @ 95% FTP with 5min recovery (low cadence 65rpm)
  - Difficulty: Advanced
  - Focus: Muscular Endurance
  - Tags: `climbing`, `hill-repeats`, `threshold`, `low-cadence`

### Tempo Workouts
**Purpose:** Build aerobic power and muscular endurance

- **2x20 Tempo** (90 min, TSS: 85)
  - 2 x 20min @ 85% FTP with 10min recovery
  - Difficulty: Intermediate
  - Focus: Muscular Endurance
  - Tags: `tempo`, `z3`, `aerobic-power`

### Specialty Workouts
**Purpose:** Develop specific abilities (sprints, mixed efforts)

- **Sprint Intervals** (80 min, TSS: 75)
  - 10 x 30sec max sprints with 4.5min recovery
  - Difficulty: Advanced
  - Focus: Anaerobic Power
  - Tags: `sprints`, `anaerobic`, `power`, `neuromuscular`

- **Endurance with Bursts** (85 min, TSS: 70)
  - 75min Z2 with 10 x 15sec bursts every 6min
  - Difficulty: Intermediate
  - Focus: Mixed (endurance + neuromuscular)
  - Tags: `endurance`, `bursts`, `neuromuscular`, `z2-plus`

## Power Zones Reference

| Zone | Name | % FTP | Purpose |
|------|------|-------|---------|
| 1 | Active Recovery | 0-55% | Easy spinning, recovery |
| 2 | Endurance | 56-75% | Aerobic base building |
| 3 | Tempo | 76-90% | Muscular endurance |
| 4 | Lactate Threshold | 91-105% | Race pace, FTP development |
| 5 | VO2 Max | 106-120% | Aerobic capacity |
| 6 | Anaerobic Capacity | 121-150% | Short, hard efforts |
| 7 | Neuromuscular Power | 150%+ | Max sprints |

## Workout Structure Format

All workouts in the database use a JSON structure:

```json
{
  "warmup": {
    "duration": 10,
    "zone": 2,
    "power_pct_ftp": 60
  },
  "intervals": {
    "sets": 3,
    "work": {
      "duration": 15,
      "zone": 3.5,
      "intensity": 0.90,
      "power_pct_ftp": 90
    },
    "rest": {
      "duration": 5,
      "zone": 1,
      "power_pct_ftp": 50
    }
  },
  "cooldown": {
    "duration": 10,
    "zone": 1,
    "power_pct_ftp": 30
  }
}
```

## Database Schema

### workout_templates Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Workout name (unique) |
| workout_type | TEXT | Type: rest, recovery, endurance, tempo, sweet_spot, threshold, vo2max, hill_repeats, intervals, long_ride |
| description | TEXT | Detailed description |
| structure | JSONB | Workout structure (intervals, zones, durations) |
| target_tss | INTEGER | Estimated Training Stress Score |
| duration | INTEGER | Total duration in minutes |
| terrain_type | TEXT | Recommended terrain: flat, rolling, hilly, mixed |
| difficulty_level | TEXT | beginner, intermediate, advanced |
| intensity_factor | DECIMAL | Average IF for workout (0.0 - 2.5) |
| focus_area | TEXT | aerobic_base, muscular_endurance, threshold, vo2max, anaerobic, recovery, mixed |
| tags | TEXT[] | Array of searchable tags |

## Using Workout Templates

### Query Examples

**Get all recovery workouts:**
```sql
SELECT * FROM workout_templates
WHERE workout_type = 'recovery'
ORDER BY duration;
```

**Find sweet spot workouts for intermediate riders:**
```sql
SELECT * FROM workout_templates
WHERE workout_type = 'sweet_spot'
AND difficulty_level = 'intermediate'
ORDER BY target_tss;
```

**Search by tags:**
```sql
SELECT * FROM workout_templates
WHERE 'threshold' = ANY(tags)
ORDER BY duration;
```

**Get workouts by focus area:**
```sql
SELECT * FROM workout_templates
WHERE focus_area = 'vo2max'
ORDER BY difficulty_level, duration;
```

## Integration with Training Plans

When creating a training plan, these templates can be:

1. **Recommended** based on:
   - Current training phase (base, build, peak, taper)
   - User fitness level
   - Goals (endurance, climbing, racing)
   - Available time per week

2. **Customized** by:
   - Adjusting duration
   - Scaling intensity based on user FTP
   - Modifying intervals to match user preferences

3. **Tracked** by:
   - Linking `planned_workouts.route_id` to actual rides
   - Comparing target TSS vs actual TSS
   - Monitoring completion rates

## Sources & Credits

These workouts are based on:
- **Zwift ZWO files** from [bdcheung/zwift_workouts](https://github.com/bdcheung/zwift_workouts)
- Classic cycling training methodologies (Sweet Spot, Over-Unders, VO2 Max intervals)
- TrainerRoad and other structured training programs
- Sports science research on cycling performance

## Migration Instructions

To apply these workout templates to your database:

### Option 1: Using the Node.js Script (Recommended)
```bash
node scripts/apply-workout-migration.js
```

### Option 2: Using psql (if you have PostgreSQL client installed)
```bash
psql $DATABASE_URL < database/migrations/add_enhanced_workout_templates.sql
```

### Option 3: Using Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `database/migrations/add_enhanced_workout_templates.sql`
4. Paste and run

## Future Enhancements

Potential additions to the workout library:

- [ ] Time trial specific workouts
- [ ] Criterium race simulation
- [ ] Gran Fondo preparation workouts
- [ ] Off-season base building plans
- [ ] Indoor trainer specific workouts (ERG mode optimized)
- [ ] Group ride simulation workouts
- [ ] Recovery week protocols
- [ ] FTP test protocols (20min, 8min, ramp test)
