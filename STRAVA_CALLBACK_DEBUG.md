# Strava Callback Debug Guide

## Check Your Strava App Configuration

### 1. Go to https://www.strava.com/settings/api

### 2. Verify EXACT Settings for Client ID 7885:

**Authorization Callback Domain:**
```
www.tribos.studio
```
(NO https://, NO www, NO path, NO trailing slash)

**Website:**
```
https://www.tribos.studio
```

### 3. If you need both development and production:

Strava allows multiple domains. Add both:
- `localhost` (for development)
- `www.tribos.studio` (for production)

### 4. Common Mistakes to Avoid:

❌ `https://www.tribos.studio/strava/callback` (too specific)
❌ `www.tribos.studio/` (trailing slash)
❌ `tribos.studio` (missing www if your site uses www)
✅ `www.tribos.studio` (correct)

## Testing Steps:

1. **Check console logs** when clicking "Connect to Strava"
2. **Verify the generated URL** matches your Strava app settings
3. **Try both domains** if needed:
   - Production: `https://www.tribos.studio/strava/callback`
   - Development: `http://localhost:3000/strava/callback`

## If Still Failing:

1. **Double-check your environment variables** in Vercel
2. **Make sure REACT_APP_STRAVA_REDIRECT_URI** exactly matches your domain
3. **Clear browser cache** and try again
4. **Check if your site is accessible** at the callback URL manually

## Debug Commands:

Visit your production site and check console logs when connecting to Strava.
The logs will show exactly what redirect_uri is being sent to Strava.