-- Fix Supabase Security Linter Issues
-- Addresses: auth users exposure, security definer views, RLS disabled

-- ============================================================================
-- Issue 1 & 2: user_preferences_complete view exposes auth.users with SECURITY DEFINER
-- ============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.user_preferences_complete CASCADE;

-- Recreate WITHOUT exposing email (auth.users data)
-- and WITHOUT SECURITY DEFINER
CREATE OR REPLACE VIEW public.user_preferences_complete AS
SELECT
    u.id as user_id,
    -- REMOVED: u.email (this exposed auth.users data to anon role)
    up.onboarding_completed,
    up.preferences_version,

    -- Routing preferences
    rp.traffic_tolerance,
    rp.distance_from_traffic,
    rp.hill_preference,
    rp.max_gradient_comfort,
    rp.preferred_road_types,
    rp.avoided_road_types,
    rp.intersection_complexity,
    rp.turning_preference,
    rp.route_type_preference,

    -- Surface preferences
    sp.primary_surfaces,
    sp.surface_quality,
    sp.avoid_gravel,
    sp.avoid_unpaved,

    -- Performance preferences
    pp.fitness_level,
    pp.typical_speed_kmh,
    pp.max_comfortable_distance_km,
    pp.preferred_route_duration_minutes,

    -- Contextual preferences
    cp.riding_style,
    cp.group_size_preference,
    cp.time_of_day_preference,
    cp.weather_tolerance,
    cp.temperature_preference_c,
    cp.wind_tolerance,

    -- Environmental preferences
    ep.scenery_importance,
    ep.urban_vs_rural,
    ep.prefer_water_views,
    ep.prefer_forests,
    ep.prefer_open_views,

    -- Safety preferences
    safep.night_riding_comfort,
    safep.require_bike_lanes,
    safep.require_shoulders,
    safep.min_shoulder_width_m,
    safep.avoid_high_speed_roads,
    safep.max_speed_limit_kmh,

    -- Cycling equipment
    eq.bikes,
    eq.has_lights,
    eq.has_gps,
    eq.has_power_meter,
    eq.has_heart_rate_monitor
FROM auth.users u
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN routing_preferences rp ON u.id = rp.user_id
LEFT JOIN surface_preferences sp ON u.id = sp.user_id
LEFT JOIN performance_preferences pp ON u.id = pp.user_id
LEFT JOIN contextual_preferences cp ON u.id = cp.user_id
LEFT JOIN environmental_preferences ep ON u.id = ep.user_id
LEFT JOIN safety_preferences safep ON u.id = safep.user_id
LEFT JOIN cycling_equipment eq ON u.id = eq.user_id;

-- Add RLS policy so users can only see their own preferences
ALTER VIEW public.user_preferences_complete SET (security_invoker = true);

-- Note: Views inherit RLS from underlying tables, so this will enforce user_id checks

COMMENT ON VIEW public.user_preferences_complete IS
'Complete user preferences without exposing auth.users email. Uses security_invoker (not security_definer) for proper RLS enforcement.';

-- ============================================================================
-- Issue 3: route_summary uses SECURITY DEFINER
-- ============================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.route_summary CASCADE;

-- Recreate WITHOUT SECURITY DEFINER
CREATE OR REPLACE VIEW public.route_summary AS
SELECT
    r.id,
    r.user_id,
    r.name,
    r.distance_km,
    r.duration_seconds,
    r.elevation_gain_m,
    r.average_speed,
    r.average_heartrate,
    r.average_watts,
    r.recorded_at,
    r.imported_from,
    r.training_goal,
    r.route_type,
    r.has_gps_data,
    r.has_heart_rate_data,
    r.has_power_data,
    -- Calculated fields
    ROUND((r.distance_km / (r.duration_seconds / 3600.0))::numeric, 2) as calculated_avg_speed,
    CASE
        WHEN r.duration_seconds > 0 THEN ROUND((r.duration_seconds / 60.0 / r.distance_km)::numeric, 2)
        ELSE NULL
    END as average_pace_min_per_km,
    CASE
        WHEN r.distance_km > 0 THEN ROUND((r.elevation_gain_m / r.distance_km)::numeric, 1)
        ELSE 0
    END as elevation_per_km
FROM routes r;

-- Use security_invoker (default, but being explicit)
ALTER VIEW public.route_summary SET (security_invoker = true);

COMMENT ON VIEW public.route_summary IS
'Summary view of routes with calculated performance metrics. Uses security_invoker for proper RLS enforcement.';

-- ============================================================================
-- Issue 4: spatial_ref_sys has RLS disabled
-- ============================================================================

-- This is a PostGIS system table, we should NOT enable RLS on it
-- Instead, create a policy that allows SELECT for all roles

-- Enable RLS on spatial_ref_sys
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Allow everyone to SELECT (it's a reference table with no sensitive data)
DROP POLICY IF EXISTS "Allow public read access to spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "Allow public read access to spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
TO public
USING (true);

COMMENT ON TABLE public.spatial_ref_sys IS
'PostGIS spatial reference system table. RLS enabled with public read access.';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Security fixes applied successfully:' as status;
SELECT '1. user_preferences_complete: removed email exposure, removed SECURITY DEFINER' as fix_1;
SELECT '2. route_summary: removed SECURITY DEFINER' as fix_2;
SELECT '3. spatial_ref_sys: enabled RLS with public read policy' as fix_3;
