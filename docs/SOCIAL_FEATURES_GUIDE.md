# BaseMiles Social Features - Complete Implementation Guide

## 🎉 What We've Built

A **privacy-first, utility-focused** social layer for BaseMiles that emphasizes route sharing and local knowledge over performance tracking and social comparison.

---

## ✅ Completed Features

### 1. **Database Schema**
*Location: [`database/social_features_schema.sql`](../database/social_features_schema.sql)*

Eight new tables with complete indexes and helper functions:

| Table | Purpose |
|-------|---------|
| `shared_routes` | Privacy-first route sharing with 5 levels |
| `route_comments` | Practical route information (conditions/tips/hazards) |
| `route_collections` | Curated route lists |
| `collection_routes` | Many-to-many for collections |
| `connections` | Simple friend connections |
| `safety_checkins` | Optional location sharing for safety |
| `community_intel` | Anonymous aggregated usage data |
| `saved_routes` | User's saved routes library |
| `user_profiles` | Minimal profiles for social features |

**Key Features:**
- Automatic privacy zone detection
- Share token generation for link-only sharing
- Comment verification system (3+ verifications = verified)
- Bidirectional friend connections
- Time-based expiration for temporary shares/comments

### 2. **Row Level Security**
*Location: [`database/social_features_rls.sql`](../database/social_features_rls.sql)*

Complete RLS policies protecting all data:
- Users can only manage their own routes/comments/collections
- Public/friend-shared content visible based on permissions
- Emergency contacts can view active safety check-ins
- Helper functions for access control

### 3. **Core Utilities**

#### Route Sharing ([`src/utils/routeSharing.js`](../src/utils/routeSharing.js))
```javascript
import { shareRoute, SharingLevels } from '../utils/routeSharing';

// Share a route with automatic privacy protection
const result = await shareRoute(routeId, {
  sharingLevel: SharingLevels.FRIENDS,
  title: 'My favorite loop',
  tags: ['scenic', 'coffee-stops'],
  obscureStartEnd: true, // Auto-blur first/last 500m
  expiresInDays: 30
});
```

**5 Sharing Levels:**
1. `PRIVATE` - Only you (default)
2. `LINK_ONLY` - Anyone with the link
3. `FRIENDS` - Your connections
4. `LOCAL` - People in your area
5. `PUBLIC` - Everyone on BaseMiles

**Privacy Features:**
- Auto-detection of home/work locations
- First/last 500m obscuring
- Privacy zone configuration
- Temporary shares with expiration

#### Route Comments ([`src/utils/routeComments.js`](../src/utils/routeComments.js))
```javascript
import { addRouteComment, CommentTypes } from '../utils/routeComments';

// Add a practical comment
await addRouteComment(routeId, {
  commentType: CommentTypes.CONDITION,
  content: 'Construction on Main St until March',
  expiresInDays: 90
});
```

**5 Comment Types:**
1. `CONDITION` - Road conditions, closures
2. `TIP` - Best times, parking, water stops
3. `VARIANT` - Alternative route segments
4. `HAZARD` - Safety concerns
5. `AMENITY` - Cafes, restrooms, shops

**Comment Features:**
- Verification system (upvotes for useful info)
- Time-based expiration for temporary conditions
- Flag for moderation
- Location-specific comments (segment-level)

### 4. **UI Components**

#### RouteDiscovery ([`src/components/RouteDiscovery.js`](../src/components/RouteDiscovery.js))

Three-tab interface for discovering routes:

**Nearby Routes Tab:**
- Public and local routes in your area
- Filter by distance, difficulty, surface
- Save to your library

**Friends Routes Tab:**
- Routes shared by your connections
- See what friends are riding
- Requires accepted connection with `can_see_routes` permission

**Collections Tab:**
- Curated route lists by theme
- Subscribe to collections
- "Coffee Shop Routes", "Quiet Roads", etc.

**Features:**
- Search functionality
- Save/unsave routes
- View counts and popularity
- Creator attribution (minimal, non-prominent)

#### RouteComments ([`src/components/RouteComments.js`](../src/components/RouteComments.js))

Practical comments about routes:

**Categorized Display:**
- Filter by comment type (all/conditions/tips/hazards/amenities)
- Verified comments highlighted
- Time-since-posted for relevance

**Add Comments:**
- Select comment type
- Optional expiration for temporary info
- Character limit (1000 chars)

**Verification:**
- Upvote useful comments
- Auto-verified after 3 verifications
- Verified badge displays "Verified by X riders"

**Moderation:**
- Flag inappropriate comments
- Auto-hide after 3 flags
- Delete your own comments

#### ShareRouteDialog ([`src/components/ShareRouteDialog.js`](../src/components/ShareRouteDialog.js))

Privacy-first sharing interface:

**Privacy Level Selector:**
- Visual indicators for each level
- Clear descriptions of who can see
- Privacy warnings

**Route Details:**
- Optional title and description
- Tags for discovery
- Link generation for link-only sharing

**Privacy Controls:**
- Toggle start/end obscuring
- Set expiration date
- View privacy warnings

**Share Link:**
- Auto-generated for link-only sharing
- Copy to clipboard
- Shareable URL format

### 5. **Integration**

#### Navigation
- Added "Discover Routes" to main app navigation
- Globe icon, placed after "Upload Routes"
- Route: `/discover`

#### Route Builder
- "Share Route" button appears after saving
- Opens ShareRouteDialog with saved route
- Seamless save-then-share workflow

---

## 🚀 How to Use

### For End Users

#### Sharing a Route:
1. Build and save a route in Route Builder
2. Click "Share Route" button
3. Select privacy level
4. Add title, description, tags (optional)
5. Click "Share Route"
6. Copy link if using "Share with link"

#### Discovering Routes:
1. Click "Discover Routes" in navigation
2. Browse Nearby/Friends/Curated tabs
3. Use search and filters
4. Click route card to view details
5. Click bookmark icon to save

#### Adding Route Info:
1. View a route detail
2. Click "Add Info" in comments section
3. Select information type
4. Write your comment
5. Set expiration if temporary
6. Submit

#### Verifying Comments:
1. View route comments
2. Click thumbs-up on useful comments
3. Comments with 3+ verifications get verified badge

### For Developers

#### Check if Route is Saved:
```javascript
import { isRouteSaved } from '../utils/routeSharing';

const saved = await isRouteSaved(routeId);
```

#### Get Shared Routes:
```javascript
import { getUserSharedRoutes } from '../utils/routeSharing';

const result = await getUserSharedRoutes();
// result.sharedRoutes contains all user's shared routes
```

#### Get Route Comments:
```javascript
import { getRouteComments } from '../utils/routeComments';

const result = await getRouteComments(routeId, {
  commentType: 'condition', // optional filter
  onlyCurrent: true
});

// result.grouped has comments by type
```

---

## 📋 Still To Do

### High Priority

1. **Add RouteComments to route detail views**
   - Integrate into Map component
   - Integrate into RouteStudio
   - Show on route hover/click

2. **User Profile Initialization**
   - Auto-create profile on first login
   - Profile setup wizard
   - Avatar upload

3. **Route Collections UI**
   - Create/manage collections
   - Add routes to collections
   - Subscribe to collections

### Medium Priority

4. **Friend Connection System**
   - Send/accept connection requests
   - Manage permissions
   - Friend list UI

5. **Community Intel Aggregation**
   - Popular times heat map
   - Anonymous usage statistics
   - Best conditions analysis

6. **Safety Check-ins**
   - Create check-in with route
   - Share with emergency contacts
   - Auto-alert if overdue

### Low Priority

7. **Notifications**
   - Friend requests
   - Comment replies
   - Route updates

8. **Mobile Optimization**
   - Responsive layouts
   - Touch-friendly interactions
   - Mobile-specific features

---

## 🧪 Testing Checklist

- [ ] Create and save a route
- [ ] Share route at each privacy level
- [ ] Test privacy zone detection
- [ ] Access route via share link
- [ ] Add comments of each type
- [ ] Verify comments
- [ ] Save someone else's route
- [ ] Test expiration (dates)
- [ ] Test RLS (try accessing others' private routes)
- [ ] Flag a comment
- [ ] Search/filter in discovery

---

## 🔧 Configuration

### Environment Variables

Ensure these are set in your `.env`:
```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. Enable PostGIS extension (already in schema):
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

2. Run migrations:
```bash
# In Supabase SQL Editor or via psql
\i database/social_features_schema.sql
\i database/social_features_rls.sql
```

3. Verify tables:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%route%' OR tablename LIKE '%connection%';
```

---

## 🎯 Design Philosophy

### What Makes This Different from Strava?

| Feature | Strava | BaseMiles |
|---------|--------|-----------|
| Focus | Activities & Performance | Routes & Planning |
| Social | Activity feed, kudos | Route discovery, practical info |
| Privacy | Opt-out, complex | Opt-in, simple |
| Comments | Social validation | Practical utility |
| Sharing | Performance-focused | Route-focused |
| Pressure | Leaderboards, KOMs | None |
| Discovery | Segments | Routes & Collections |

### Core Principles

1. **Privacy-First**
   - Everything starts private
   - Explicit opt-in for sharing
   - Auto-obscure home/work
   - Clear privacy indicators

2. **Utility Over Vanity**
   - No kudos or likes
   - Comments provide practical info
   - Verification, not popularity
   - Anonymous aggregation

3. **Routes, Not Activities**
   - Share route plans, not ride records
   - Focus on discovery and planning
   - No performance tracking/comparison

4. **No Social Pressure**
   - No activity feed
   - No leaderboards
   - No follower counts
   - Optional stats display

---

## 📚 API Reference

### Route Sharing

```javascript
// Share route
shareRoute(routeId, options)

// Get shared route by token
getSharedRouteByToken(shareToken)

// Unshare route
unshareRoute(routeId)

// Get user's shared routes
getUserSharedRoutes(userId)

// Save route to library
saveRoute(routeId, sharedRouteId, folder, notes)

// Check if saved
isRouteSaved(routeId)

// Get saved routes
getSavedRoutes(folder)
```

### Route Comments

```javascript
// Add comment
addRouteComment(routeId, commentData)

// Get comments
getRouteComments(routeId, filters)

// Verify comment
verifyComment(commentId)

// Update comment
updateComment(commentId, updates)

// Delete comment
deleteComment(commentId)

// Mark outdated
markCommentOutdated(commentId)

// Flag comment
flagComment(commentId, reason)

// Get stats
getCommentStats(routeId)

// Get friend comments
getFriendComments(limit)
```

---

## 🐛 Known Issues

1. Need to handle route geometry formats (GeoJSON vs array)
2. Need to test with real user profiles and avatars
3. Mobile responsiveness needs testing
4. Need error boundaries for components
5. Need offline/network error handling

---

## 📖 Next Steps

1. **Test the current implementation**
   - Create a test route
   - Share it with different levels
   - Add comments
   - Verify the discovery page works

2. **Add user profile initialization**
   - Create profile on first login
   - Set display name
   - Choose privacy settings

3. **Build friend connection system**
   - Connection request UI
   - Accept/reject flow
   - Permission management

4. **Add RouteComments to route views**
   - Map component integration
   - Route detail modal
   - Hover/click interactions

Would you like me to continue with any of these next steps?
