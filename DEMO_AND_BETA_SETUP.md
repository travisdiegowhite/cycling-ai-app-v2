# Demo Account & Beta Launch Setup

## Overview
This document explains the demo account and beta signup system for tribos.studio, with a planned beta launch on **December 25, 2025**.

## Features Implemented

### 1. Demo Account System ✅
A fully functional demo account that allows anyone to try the platform without signing up.

**Demo Credentials:**
- Email: `demo@tribos.studio`
- Password: `demo2024tribos`

**How It Works:**
- Users click "Try Demo" button on landing page
- Automatically logs in with demo credentials
- Full access to all features (read-only recommended)
- No signup required

### 2. Beta Signup System ✅
A waitlist/signup system for the December 25, 2025 beta launch.

**Components:**
- `BetaSignup.js` - Modal component for beta signups
- `beta_signups` database table
- Email collection and interest tracking
- Launch date countdown badge

### 3. Updated Landing Page ✅
Redesigned call-to-action buttons:
- **"Try Demo"** - Instant access via demo account
- **"Join Beta"** - Sign up for December launch
- Launch date badge prominently displayed
- Multiple CTAs throughout the page

## Database Schema

### Beta Signups Table

Run this SQL in Supabase SQL Editor:

```sql
-- From: database/beta_signups_schema.sql

CREATE TABLE IF NOT EXISTS beta_signups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cycling_experience TEXT,
    interests TEXT,
    wants_notifications BOOLEAN DEFAULT true,
    signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'activated')),
    invited_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- See full schema in database/beta_signups_schema.sql
```

**Columns:**
- `name` - User's full name
- `email` - Email address (unique)
- `cycling_experience` - Background info (optional)
- `interests` - Features they're interested in (optional)
- `wants_notifications` - Opt-in for launch emails
- `status` - pending, invited, or activated
- `signed_up_at` - When they signed up
- `invited_at` - When invite was sent
- `activated_at` - When they activated their account

## Setup Instructions

### Step 1: Create Demo Account in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter:
   - **Email:** `demo@tribos.studio`
   - **Password:** `demo2024tribos`
   - **Auto Confirm User:** YES (important!)
4. Click "Create user"

**Alternative (SQL method):**
```sql
-- This creates the demo user programmatically
-- Run in Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'demo@tribos.studio',
  crypt('demo2024tribos', gen_salt('bf')),
  now(),
  now(),
  now(),
  now()
);
```

### Step 2: Run Beta Signups Migration

```bash
# In Supabase SQL Editor, run:
database/beta_signups_schema.sql
```

Or copy and paste the contents into SQL Editor and execute.

### Step 3: Populate Demo Account with Sample Data (Optional)

To make the demo more impressive, add sample data:

**Sample Routes:**
```sql
-- Add a few sample routes to the demo account
-- First, get the demo user's ID
SELECT id FROM auth.users WHERE email = 'demo@tribos.studio';

-- Then insert sample routes (replace USER_ID with actual ID)
INSERT INTO routes (user_id, name, description, distance_km, activity_type, created_at)
VALUES
  ('USER_ID', 'Morning Coffee Ride', 'Easy 30km loop through the valley', 30.5, 'ride', now() - interval '2 days'),
  ('USER_ID', 'Hill Climb Training', 'Intense climbing workout with 800m elevation', 45.2, 'ride', now() - interval '5 days'),
  ('USER_ID', 'Weekend Long Ride', 'Beautiful 100km scenic route', 102.3, 'ride', now() - interval '7 days');
```

**Sample Training Plans:**
```sql
-- Add a sample training plan
INSERT INTO training_plans (user_id, plan_name, plan_type, start_date, end_date, goal)
VALUES
  ('USER_ID', 'Spring Century Prep', 'endurance', now(), now() + interval '12 weeks', 'Build endurance for 100+ km rides');
```

### Step 4: Configure Demo Account Restrictions (Recommended)

Add database trigger to make demo account read-only for certain tables:

```sql
-- Optional: Prevent demo account from deleting routes
CREATE OR REPLACE FUNCTION prevent_demo_delete()
RETURNS TRIGGER AS $$
DECLARE
  demo_user_id uuid;
BEGIN
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@tribos.studio';

  IF OLD.user_id = demo_user_id THEN
    RAISE EXCEPTION 'Demo account cannot delete data';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply to routes table
CREATE TRIGGER demo_prevent_route_delete
  BEFORE DELETE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_demo_delete();
```

**Note:** This is optional. You can also just restore demo data periodically.

### Step 5: Test the System

1. **Test Demo Login:**
   - Go to landing page
   - Click "Try Demo"
   - Should automatically log in
   - Should see sample routes (if added)
   - Verify all features work

2. **Test Beta Signup:**
   - Click "Join Beta" button
   - Fill out form
   - Submit
   - Check `beta_signups` table in Supabase
   - Verify success message displays

3. **Test Duplicate Prevention:**
   - Try signing up with same email again
   - Should show error: "Email already registered"

## User Experience Flow

### Demo Flow
```
User visits tribos.studio
    ↓
Sees landing page with "Try Demo" button
    ↓
Clicks "Try Demo"
    ↓
Automatically logged in as demo@tribos.studio
    ↓
Full access to all features
    ↓
Can explore AI routes, training plans, integrations, etc.
    ↓
If impressed, can click "Join Beta" from within app
```

### Beta Signup Flow
```
User visits tribos.studio
    ↓
Clicks "Join Beta" button
    ↓
Modal opens with signup form
    ↓
Enters: name, email, experience, interests
    ↓
Submits form
    ↓
Stored in beta_signups table
    ↓
Success message: "You're In! Beta launches Dec 25, 2025"
    ↓
User receives confirmation (optional - requires email setup)
```

## Managing Beta Signups

### View All Signups

```sql
SELECT
  name,
  email,
  cycling_experience,
  interests,
  signed_up_at,
  status
FROM beta_signups
ORDER BY signed_up_at DESC;
```

### Export Email List

```sql
-- Get all emails for launch announcement
SELECT email, name
FROM beta_signups
WHERE wants_notifications = true
AND status = 'pending'
ORDER BY signed_up_at;
```

### Update Status When Inviting

```sql
-- Mark users as invited
UPDATE beta_signups
SET
  status = 'invited',
  invited_at = now()
WHERE status = 'pending'
AND signed_up_at < '2025-12-25'::timestamp;
```

### Mark as Activated

```sql
-- After they create account
UPDATE beta_signups
SET
  status = 'activated',
  activated_at = now()
WHERE email = 'user@example.com';
```

## Email Integration (Optional)

To send launch notifications, integrate with an email service:

### Option 1: Supabase Edge Functions + Resend

```typescript
// supabase/functions/send-beta-invite/index.ts
import { Resend } from 'resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  const { email, name } = await req.json();

  await resend.emails.send({
    from: 'tribos.studio <noreply@tribos.studio>',
    to: email,
    subject: 'Your tribos.studio Beta Access is Ready! 🚴',
    html: `
      <h1>Welcome to tribos.studio Beta, ${name}!</h1>
      <p>Your beta access is now active...</p>
    `
  });

  return new Response(JSON.stringify({ success: true }));
});
```

### Option 2: Manual Launch Email

On December 25, 2025:

1. Export email list from database
2. Use Mailchimp/SendGrid/similar
3. Send launch announcement
4. Include:
   - Beta access link
   - Setup instructions
   - Feature highlights
   - Support contact

## Landing Page Updates

### Key Changes Made

1. **Hero Section:**
   - Replaced "Get Started Free" with "Try Demo"
   - Added "Join Beta" secondary button
   - Added launch date badge: "Beta Launch: December 25, 2025"
   - Updated subtext to emphasize demo access

2. **Benefits Section:**
   - Both "Try Demo" and "Join Beta" buttons
   - Side-by-side layout for easy choice

3. **CTA Section:**
   - Large "Try Demo Now" primary button
   - "Join Beta" secondary button
   - Updated copy to mention beta launch

4. **All Button Placements:**
   - Consistent messaging throughout
   - Clear differentiation between demo and beta

## Marketing Recommendations

### Before Launch (Now - Dec 2025)

1. **Social Media:**
   - Post about beta signup opening
   - Highlight demo access
   - Share feature previews
   - Countdown posts closer to launch

2. **Content Marketing:**
   - Blog posts about AI route planning
   - Tutorial videos using demo account
   - Comparison with other platforms
   - User testimonials (from demo users)

3. **Community Engagement:**
   - Share in cycling forums
   - Reddit r/cycling, r/cyclingtech
   - Strava clubs
   - Local cycling groups

4. **Email Nurture:**
   - Welcome email after beta signup
   - Monthly updates on development
   - Feature highlights
   - Launch reminder

### Launch Day (Dec 25, 2025)

1. Send beta access emails
2. Social media announcement
3. Product Hunt launch (optional)
4. Press release (if applicable)
5. Personal network outreach

### Post-Launch

1. Gather feedback from beta users
2. Iterate based on feedback
3. Prepare for public launch
4. Consider early access pricing

## Analytics to Track

### Demo Account Metrics
- Number of demo logins per day
- Average session duration
- Features most used
- Conversion to beta signup

### Beta Signup Metrics
- Total signups
- Signups per day (growth rate)
- Geographic distribution
- Cycling experience breakdown
- Most requested features
- Notification opt-in rate

### Conversion Funnel
```
Landing Page Views
    ↓ (% who click Demo)
Demo Logins
    ↓ (% who convert)
Beta Signups
    ↓ (on launch)
Beta Activations
    ↓ (eventually)
Paid Conversions
```

## Monitoring & Maintenance

### Weekly Tasks
- Check beta signup numbers
- Review feedback/interests
- Test demo account still works
- Verify no spam signups

### Monthly Tasks
- Export beta signup list (backup)
- Send update email to waitlist
- Add demo data if needed
- Review analytics

### Pre-Launch Tasks (Dec 2025)
- Prepare launch email template
- Test beta invitation flow
- Set up onboarding sequence
- Prepare launch announcement
- Brief support team (if applicable)

## Troubleshooting

### Demo Login Not Working
**Problem:** "Try Demo" button doesn't log in

**Solutions:**
1. Check demo account exists in Supabase Auth
2. Verify email is `demo@tribos.studio`
3. Check password matches `demo2024tribos`
4. Ensure account is confirmed (email_confirmed_at set)
5. Check browser console for errors

### Beta Signup Form Error
**Problem:** Form submission fails

**Solutions:**
1. Verify `beta_signups` table exists
2. Check RLS policies allow INSERT for anon users
3. Look for duplicate email error
4. Check Supabase logs for details

### Duplicate Email Error
**Problem:** User already signed up, gets error

**Expected behavior** - show friendly message:
"This email is already registered for the beta!"

**Fix:** Already handled in `BetaSignup.js`

## Files Modified/Created

### New Files
- `src/components/BetaSignup.js` - Beta signup modal
- `database/beta_signups_schema.sql` - Database schema
- `DEMO_AND_BETA_SETUP.md` - This document

### Modified Files
- `src/components/LandingPage.js` - Added demo/beta buttons
- `src/components/Auth.js` - Added demo login functionality

## Security Considerations

### Demo Account
- ✅ Public credentials (by design)
- ✅ Read-only recommended (optional triggers)
- ✅ Regular data refresh keeps it clean
- ⚠️ Could be abused - monitor usage
- 💡 Consider rate limiting if needed

### Beta Signups
- ✅ RLS prevents unauthorized reads
- ✅ Only service role can view signups
- ✅ Email uniqueness enforced
- ✅ No sensitive data collected
- ✅ GDPR compliant (can delete on request)

## Next Steps

1. **Create demo account** in Supabase (Step 1 above)
2. **Run beta_signups migration** (Step 2 above)
3. **Add sample data** to demo account (Step 3 above)
4. **Test both flows** end-to-end
5. **Set up analytics** to track metrics
6. **Plan launch campaign** for Dec 25, 2025
7. **Start collecting signups** immediately

## Support

For questions or issues:
- Check Supabase logs for errors
- Review browser console
- Check this document for solutions
- Contact: travis@tribos.studio

---

## Status: ✅ READY TO DEPLOY

All code has been written and is ready for testing. Follow the setup instructions above to activate the demo account and beta signup system.

**Timeline:**
- **Now:** Deploy and start collecting beta signups
- **Oct 2024 - Dec 2024:** Build, test, gather waitlist
- **Dec 25, 2025:** Beta Launch! 🚀

---

*Last updated: 2025-10-13*
*Implementation by: Claude Code Assistant*
