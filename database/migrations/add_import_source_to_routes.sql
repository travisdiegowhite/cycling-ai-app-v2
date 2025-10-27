-- Add import_source column to routes table
-- This tracks where the route was imported from: strava, garmin, manual, file_upload

-- Add column if it doesn't exist
ALTER TABLE routes ADD COLUMN IF NOT EXISTS import_source TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN routes.import_source IS 'Source of the route import: strava, garmin, manual, file_upload, wahoo';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_routes_import_source ON routes(import_source);

-- Create index for duplicate detection (time + distance)
CREATE INDEX IF NOT EXISTS idx_routes_started_at_distance ON routes(started_at, distance)
WHERE started_at IS NOT NULL AND distance IS NOT NULL;

-- Update existing routes to mark their source if identifiable
UPDATE routes
SET import_source = CASE
  WHEN strava_id IS NOT NULL THEN 'strava'
  WHEN garmin_id IS NOT NULL THEN 'garmin'
  WHEN wahoo_id IS NOT NULL THEN 'wahoo'
  ELSE 'manual'
END
WHERE import_source IS NULL;

-- Verification query
SELECT
  import_source,
  COUNT(*) as count
FROM routes
WHERE import_source IS NOT NULL
GROUP BY import_source
ORDER BY count DESC;

SELECT 'import_source column added and existing routes updated' AS status;
