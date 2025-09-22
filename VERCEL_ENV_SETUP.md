# Vercel Environment Variables Setup for Strava Integration

## Required Environment Variables in Vercel Dashboard

Go to your Vercel project dashboard → Settings → Environment Variables and add:

### Production Environment Variables:

```bash
# Strava API Configuration (Public - Available in browser)
REACT_APP_STRAVA_CLIENT_ID=your_strava_client_id
REACT_APP_STRAVA_REDIRECT_URI=https://your-domain.com/strava/callback

# Supabase Configuration (Public)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox Token (Public)
REACT_APP_MAPBOX_TOKEN=your_mapbox_token

# Weather API (Public)
REACT_APP_WEATHER_API_KEY=your_weather_api_key

# Anthropic API (Public - for client-side AI features)
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key

# Server-Side Only Variables (Private - Not accessible in browser)
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Important Notes:

1. **REACT_APP_STRAVA_REDIRECT_URI** should be your production domain
2. **SUPABASE_SERVICE_KEY** is different from the anon key - get it from Supabase dashboard
3. Set all variables for "Production" environment in Vercel
4. Consider also setting for "Preview" environment for testing

## Strava App Configuration:

Update your Strava app settings at https://www.strava.com/settings/api:

- **Authorization Callback Domain:** `www.tribos.studio`
- **Website:** `https://www.tribos.studio`

## Alternative Domains:

If you prefer to use the Vercel domain instead:
- Use `https://cycling-ai-app-v2.vercel.app/strava/callback`
- Update Strava app callback domain to: `cycling-ai-app-v2.vercel.app`