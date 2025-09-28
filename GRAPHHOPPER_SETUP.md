# GraphHopper API Setup for Enhanced Cycling Routes

Your app now supports GraphHopper for superior cycling infrastructure awareness and traffic avoidance. GraphHopper is specifically optimized for cycling routing and provides much better results for avoiding traffic and finding bike-friendly roads.

## Why GraphHopper?

- **Cycling-Specific**: Built for cycling with dedicated bike profiles
- **Infrastructure Awareness**: Knows about bike lanes, paths, and cycling networks
- **Traffic Avoidance**: Advanced custom routing models to avoid busy roads
- **High Quality**: Better routing decisions for cyclists vs generic mapping services

## Setup Instructions

1. **Get Free API Key**
   - Visit: https://www.graphhopper.com/
   - Sign up for a free account (includes 2,500 requests/day)
   - Get your API key from the dashboard

2. **Configure Environment**
   - Add to your `.env` file:
   ```
   REACT_APP_GRAPHHOPPER_API_KEY=your_api_key_here
   ```

3. **Deploy to Vercel**
   - Add the environment variable in your Vercel dashboard
   - Under Project Settings → Environment Variables

## How It Works

The app now uses a **Smart Routing Strategy**:

1. **GraphHopper First**: Tries GraphHopper with cycling-optimized settings
2. **Mapbox Fallback**: Falls back to Mapbox if GraphHopper unavailable
3. **Quality Assessment**: Evaluates route quality and picks the best option

## Features Enabled

- **Strict Traffic Avoidance**: Avoids primary roads, motorways, and trunk roads
- **Bike Infrastructure Boost**: Prioritizes bike lanes and cycling networks
- **Custom Routing Models**: Uses GraphHopper's flexible routing engine
- **Quality Scoring**: Intelligent route quality assessment

## Console Output

When generating routes, you'll see logs like:
- `🧠 Smart cycling router: Finding optimal route...`
- `🚴 Trying GraphHopper with profile: bike`
- `✅ GraphHopper provided excellent cycling route`
- `✅ Smart router selected: graphhopper - Optimized for cycling infrastructure`

## Without GraphHopper

The app still works without GraphHopper - it will automatically fall back to the enhanced Mapbox routing with stronger traffic exclusions.

---

**Your cycling routes will be significantly better with GraphHopper configured!**