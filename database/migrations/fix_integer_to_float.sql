-- Fix schema to accept decimal values for metrics that aren't truly integers
-- Strava API returns floats for elevation and power, rounding loses precision

-- Change elevation fields from INTEGER to FLOAT
ALTER TABLE routes
  ALTER COLUMN elevation_gain_m TYPE FLOAT USING elevation_gain_m::FLOAT;

ALTER TABLE routes
  ALTER COLUMN elevation_loss_m TYPE FLOAT USING elevation_loss_m::FLOAT;

-- Change power fields from INTEGER to FLOAT
ALTER TABLE routes
  ALTER COLUMN average_watts TYPE FLOAT USING average_watts::FLOAT;

ALTER TABLE routes
  ALTER COLUMN max_watts TYPE FLOAT USING max_watts::FLOAT;

ALTER TABLE routes
  ALTER COLUMN normalized_power TYPE FLOAT USING normalized_power::FLOAT;

-- Keep as INTEGER (these make sense as whole numbers):
-- - duration_seconds (whole seconds)
-- - average_heartrate (BPM is whole numbers)
-- - max_heartrate (BPM is whole numbers)
-- - kilojoules (energy, typically whole numbers)
-- - training_stress_score (computed metric, whole numbers)

COMMENT ON COLUMN routes.elevation_gain_m IS 'Elevation gain in meters (float for precision)';
COMMENT ON COLUMN routes.elevation_loss_m IS 'Elevation loss in meters (float for precision)';
COMMENT ON COLUMN routes.average_watts IS 'Average power in watts (float for precision)';
COMMENT ON COLUMN routes.max_watts IS 'Maximum power in watts (float for precision)';
