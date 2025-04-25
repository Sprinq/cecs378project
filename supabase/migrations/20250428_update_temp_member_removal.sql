-- Migration file: supabase/migrations/20250428_update_temp_member_removal.sql

-- Update remove_expired_temporary_members function to handle members without explicit expiry dates
CREATE OR REPLACE FUNCTION remove_expired_temporary_members()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER := 0;
  member_record RECORD;
  temp_duration INTERVAL;
  join_time TIMESTAMPTZ;
  should_expire BOOLEAN;
BEGIN
  -- First, handle members with explicit expiration times
  WITH deleted_members AS (
    DELETE FROM public.server_members
    WHERE temporary_access = true
      AND access_expires_at IS NOT NULL
      AND access_expires_at < CURRENT_TIMESTAMP
    RETURNING id
  )
  SELECT COUNT(*) INTO removed_count FROM deleted_members;
  
  -- Next, handle members with duration-based expiration
  FOR member_record IN 
    SELECT 
      sm.id, 
      sm.user_id, 
      sm.server_id,
      sm.temporary_duration,
      sm.joined_at
    FROM public.server_members sm
    WHERE sm.temporary_access = true
      AND sm.access_expires_at IS NULL
      AND sm.temporary_duration IS NOT NULL
      AND sm.joined_at IS NOT NULL
  LOOP
    -- Parse the temporary_duration string to an interval
    BEGIN
      temp_duration := validate_duration_string(member_record.temporary_duration);
      join_time := member_record.joined_at;
      
      -- Check if the calculated expiration time has passed
      should_expire := (join_time + temp_duration) < CURRENT_TIMESTAMP;
      
      IF should_expire THEN
        -- Delete the member
        DELETE FROM public.server_members
        WHERE id = member_record.id;
        
        -- Increment the count
        removed_count := removed_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other members
      RAISE WARNING 'Failed to process temporary member %: %', member_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN removed_count;
END;
$$;

-- Update the server_members table to track the original join timestamp
ALTER TABLE public.server_members 
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

-- Create a migration function to set joined_at for existing members
DO $$
BEGIN
  UPDATE public.server_members
  SET joined_at = COALESCE(joined_at, now())
  WHERE joined_at IS NULL;
END
$$;