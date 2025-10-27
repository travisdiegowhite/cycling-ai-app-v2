# Hybrid Import Strategy: Strava Historical + Garmin Real-time

## 🎯 Problem Statement

New users face a dilemma:
- **Garmin** provides detailed real-time webhook sync BUT can't backfill historical data beyond webhook registration date
- **Strava** can import years of historical activities BUT no real-time webhooks (requires manual sync button)

## 💡 Solution: Smart Hybrid Import

Use **Strava for historical import** + **Garmin for ongoing auto-sync**

---

## 🎨 User Experience Flow

### **Option 1: Guided Onboarding Wizard** (RECOMMENDED)

#### Step 1: Welcome Screen
```
┌─────────────────────────────────────────────────────────┐
│  🚴 Import Your Cycling History                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  We'll help you import your rides in two steps:         │
│                                                          │
│  1️⃣ Import past rides from Strava (up to 2 years)      │
│  2️⃣ Auto-sync future rides from Garmin                 │
│                                                          │
│  This gives you the best of both platforms!             │
│                                                          │
│  [ Get Started → ]                                      │
└─────────────────────────────────────────────────────────┘
```

#### Step 2: Historical Import (Strava)
```
┌─────────────────────────────────────────────────────────┐
│  Step 1 of 2: Import Historical Activities              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Import from Strava                                  │
│                                                          │
│  How far back do you want to import?                    │
│  ┌─────────────────────────────────────┐               │
│  │ ○ Last 3 months                     │               │
│  │ ○ Last 6 months                     │               │
│  │ ● Last 1 year (recommended)         │               │
│  │ ○ Last 2 years                      │               │
│  │ ○ All time                          │               │
│  └─────────────────────────────────────┘               │
│                                                          │
│  ℹ️  Strava can import activities from any date.        │
│     This is a one-time import of your history.          │
│                                                          │
│  [ ← Back ]              [ Connect Strava → ]          │
└─────────────────────────────────────────────────────────┘
```

#### Step 3: Real-time Sync Setup (Garmin)
```
┌─────────────────────────────────────────────────────────┐
│  Step 2 of 2: Enable Auto-Sync for Future Rides        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⚡ Connect Garmin for Auto-Sync                        │
│                                                          │
│  ✅ Historical rides imported from Strava              │
│  📅 Found 127 rides from the last year                 │
│                                                          │
│  Now connect Garmin to automatically sync future rides: │
│                                                          │
│  ✨ Benefits of Garmin Auto-Sync:                      │
│  • Rides appear automatically after each activity       │
│  • No manual sync button needed                        │
│  • More detailed metrics (power, cadence, etc.)        │
│  • Works with all Garmin devices                       │
│                                                          │
│  [ Skip for Now ]          [ Connect Garmin → ]        │
└─────────────────────────────────────────────────────────┘
```

#### Step 4: Completion
```
┌─────────────────────────────────────────────────────────┐
│  ✅ You're All Set!                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Imported 127 historical rides from Strava          │
│  ⚡ Garmin auto-sync enabled                           │
│                                                          │
│  Your rides will now sync automatically whenever you    │
│  upload a new activity to Garmin Connect.              │
│                                                          │
│  [ View My Rides → ]                                    │
└─────────────────────────────────────────────────────────┘
```

---

### **Option 2: Smart Integration Page** (Alternative)

Single page with intelligent recommendations:

```
┌─────────────────────────────────────────────────────────┐
│  🚴 Fitness Integrations                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  💡 Recommended Setup for New Users:                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 1. Import History    → Connect Strava             │ │
│  │ 2. Auto-Sync Future  → Connect Garmin             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  📊 Strava (Best for Historical Import)                 │
│  Status: Not connected                                  │
│                                                          │
│  ✅ Import rides from any date (up to all time)        │
│  ✅ Quick setup with OAuth                             │
│  ⚠️  Requires manual sync button for new activities    │
│                                                          │
│  [ Connect Strava ]  [ Learn More ]                    │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  ⚡ Garmin (Best for Auto-Sync)                         │
│  Status: Not connected                                  │
│                                                          │
│  ✅ Automatic sync after each ride (no button!)        │
│  ✅ More detailed metrics (power, cadence)             │
│  ⚠️  Can only import from webhook registration date    │
│                                                          │
│  [ Connect Garmin ]  [ Learn More ]                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Phase 1: Strava Historical Import

#### New Component: `HistoricalImportWizard.js`
```javascript
const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'strava-import', title: 'Import History' },
  { id: 'garmin-setup', title: 'Enable Auto-Sync' },
  { id: 'complete', title: 'Complete' }
];
```

#### Strava Import Flow:
1. User selects time range (3mo, 6mo, 1yr, 2yr, all)
2. Calculate `after` timestamp
3. Call Strava API: `GET /athlete/activities?after={timestamp}&per_page=200`
4. Paginate through all activities
5. Import each activity:
   - Download full activity data (if has GPS)
   - Create route in Supabase
   - Mark as `strava_id` to prevent duplicates

#### API Endpoint: `/api/strava-bulk-import`
```javascript
POST /api/strava-bulk-import
{
  "userId": "uuid",
  "startDate": "2023-01-01",
  "endDate": "2024-12-31"
}

Response:
{
  "success": true,
  "imported": 127,
  "skipped": 3,
  "errors": 0,
  "message": "Imported 127 activities from Jan 2023 to Dec 2024"
}
```

### Phase 2: Smart Duplicate Prevention

#### Deduplication Logic:
```sql
-- Check if activity already exists
SELECT id FROM routes
WHERE (
  strava_id = $1 OR
  garmin_id = $2 OR
  (
    started_at BETWEEN $3 - INTERVAL '5 minutes'
                   AND $3 + INTERVAL '5 minutes'
    AND ABS(distance - $4) < 100 -- Within 100m
  )
)
```

#### Route Table Updates:
```sql
ALTER TABLE routes ADD COLUMN IF NOT EXISTS import_source TEXT;
-- Values: 'strava', 'garmin', 'manual', 'file_upload'

CREATE INDEX idx_routes_started_at_distance
ON routes(started_at, distance);
```

### Phase 3: User Experience Enhancements

#### Progress Indicators:
```javascript
const [importProgress, setImportProgress] = useState({
  phase: 'fetching', // 'fetching', 'importing', 'complete'
  current: 0,
  total: 0,
  message: 'Fetching activities from Strava...'
});
```

#### Smart Recommendations:
```javascript
// Show recommendation based on account status
if (!hasStravaConnected && !hasGarminConnected) {
  recommendation = "Start by importing your history from Strava";
} else if (hasStravaConnected && !hasGarminConnected) {
  recommendation = "Enable Garmin auto-sync for future rides";
} else if (hasGarminConnected && !hasStravaConnected) {
  recommendation = "Import historical rides from Strava";
}
```

---

## 📊 Comparison Table (Show to Users)

| Feature | Strava | Garmin |
|---------|---------|--------|
| **Historical Import** | ✅ Any date | ❌ Only from webhook registration |
| **Auto-Sync** | ❌ Manual sync required | ✅ Automatic after each ride |
| **Setup Complexity** | ⭐ Easy | ⭐⭐ Medium |
| **Data Richness** | ⭐⭐⭐ Good | ⭐⭐⭐⭐ Excellent |
| **Best For** | One-time history import | Ongoing daily use |

**Recommendation:** Use both! Strava for history, Garmin for future.

---

## 🎯 Implementation Priority

### Priority 1: Core Functionality (Week 1)
- [ ] Create Strava bulk import API endpoint
- [ ] Add date range selector to Strava integration
- [ ] Implement basic duplicate detection
- [ ] Test with 100+ activities

### Priority 2: Smart UX (Week 2)
- [ ] Create hybrid import wizard component
- [ ] Add progress indicators
- [ ] Implement smart recommendations
- [ ] Add comparison table

### Priority 3: Polish (Week 3)
- [ ] Advanced duplicate detection (time + distance)
- [ ] Import history tracking
- [ ] Error recovery and retry logic
- [ ] Analytics: track import sources

---

## 🔮 Future Enhancements

### Advanced Deduplication
- Use GPS track similarity detection
- Machine learning for matching activities across platforms

### Import from Other Sources
- GPX/FIT file batch upload
- Wahoo integration
- Zwift integration

### Smart Scheduling
- Background import jobs for large datasets
- Rate-limited imports to avoid API throttling

---

## 📝 User Documentation

### Help Center Article: "How to Import Your Cycling History"

**New to tribos.studio? Here's how to get all your rides imported:**

1. **Import your history** - Connect Strava to import rides from the past 2 years
2. **Enable auto-sync** - Connect Garmin so future rides appear automatically
3. **Start riding!** - New rides will sync automatically after each activity

**Why both?**
- Strava excels at importing historical data from any date
- Garmin provides automatic real-time sync via webhooks
- Together, you get complete history + effortless future syncing!

---

## 🎨 Visual Design Notes

**Color Coding:**
- Strava: Orange (#FC4C02)
- Garmin: Blue (#007CC3)
- Wizard Progress: Use gradient Orange → Blue

**Icons:**
- Strava: 📊 (historical/data)
- Garmin: ⚡ (real-time/automatic)
- Combined: 🔄 (sync)

**Tone:**
- Friendly and educational, not technical
- Emphasize benefits, not limitations
- Use "recommended" rather than "required"

---

**Last Updated:** 2025-10-26
**Status:** Design Complete - Ready for Implementation
