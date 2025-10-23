// Simple endpoint to check if environment variables are set
// Access at: https://www.tribos.studio/api/check-env

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const envCheck = {
    // Check if variables exist (don't expose actual values!)
    GARMIN_CONSUMER_KEY: !!process.env.GARMIN_CONSUMER_KEY,
    GARMIN_CONSUMER_SECRET: !!process.env.GARMIN_CONSUMER_SECRET,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,

    // Show length (for debugging without exposing values)
    GARMIN_CONSUMER_KEY_LENGTH: process.env.GARMIN_CONSUMER_KEY?.length || 0,
    GARMIN_CONSUMER_SECRET_LENGTH: process.env.GARMIN_CONSUMER_SECRET?.length || 0,
    SUPABASE_SERVICE_KEY_LENGTH: process.env.SUPABASE_SERVICE_KEY?.length || 0,

    // Environment info
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: !!process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV
  };

  return res.status(200).json({
    message: 'Environment variable check',
    timestamp: new Date().toISOString(),
    environment: envCheck,
    allVariablesSet: envCheck.GARMIN_CONSUMER_KEY &&
                     envCheck.GARMIN_CONSUMER_SECRET &&
                     envCheck.SUPABASE_URL &&
                     envCheck.SUPABASE_SERVICE_KEY
  });
}
