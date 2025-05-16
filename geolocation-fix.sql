-- Fix RLS policies for classes to ensure students can view them
DO $$
BEGIN
    -- First, ensure the 'All users can view classes' policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' AND policyname = 'All users can view classes'
    ) THEN
        CREATE POLICY "All users can view classes"
        ON classes FOR SELECT
        USING (true);
    END IF;
    
    -- Drop and recreate the policy to make sure it's working correctly
    DROP POLICY IF EXISTS "All users can view classes" ON classes;
    
    CREATE POLICY "All users can view classes"
    ON classes FOR SELECT
    USING (true);
END
$$;

-- Add a policy specifically for the find_nearby_classes function
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' AND policyname = 'Enable location-based class discovery'
    ) THEN
        CREATE POLICY "Enable location-based class discovery"
        ON classes FOR SELECT
        USING (active = true);
    END IF;
END
$$;

-- Make sure the function for finding nearby classes exists and works
CREATE OR REPLACE FUNCTION find_nearby_classes(
  lat DOUBLE PRECISION,
  long DOUBLE PRECISION,
  max_distance DOUBLE PRECISION DEFAULT 1000 -- Default 1000 meters
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    (
      6371000 * acos(
        cos(radians(lat)) * 
        cos(radians(c.latitude)) * 
        cos(radians(c.longitude) - radians(long)) + 
        sin(radians(lat)) * 
        sin(radians(c.latitude))
      )
    ) AS distance
  FROM classes c
  WHERE 
    c.active = TRUE AND
    c.latitude IS NOT NULL AND
    c.longitude IS NOT NULL
  ORDER BY distance
  LIMIT 50;
END;
$$ LANGUAGE plpgsql; 