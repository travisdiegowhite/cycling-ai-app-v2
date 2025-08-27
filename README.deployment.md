# Deployment Guide for BaseMiles Cycling AI App

## Vercel Deployment

### Prerequisites
1. Ensure all environment variables are set in Vercel dashboard
2. Verify all dependencies are properly installed

### Environment Variables Required
```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
REACT_APP_OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key
REACT_APP_STRAVA_CLIENT_ID=your_strava_client_id
REACT_APP_STRAVA_CLIENT_SECRET=your_strava_client_secret
```

### Build Configuration
- Node.js Version: 18.x or higher
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

### Common Build Issues & Solutions

#### Issue: "Module not found: Error: Can't resolve './components/StravaIntegration'"
**Solution**: Ensure all component files are properly committed to git and have correct export statements.

#### Issue: Claude SDK build errors
**Solution**: The Anthropic SDK is configured for browser usage with `dangerouslyAllowBrowser: true`. If build fails, check environment variables are properly set.

#### Issue: React Router deployment issues
**Solution**: Vercel.json is configured to redirect all routes to index.html for SPA routing.

### Deployment Steps
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy from main branch
4. Verify all API integrations work in production

### Performance Optimizations
- Static assets are cached with long expiration
- Chunked JavaScript bundles for optimal loading
- Service worker for offline functionality (if needed)

### Monitoring
- Check Vercel function logs for API errors
- Monitor Claude API usage and rate limits
- Track Supabase connection issues