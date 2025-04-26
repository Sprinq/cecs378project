-- Migration file: supabase/migrations/20250430_automatic_temp_member_removal_fixed.sql

-- First, let's check the primary key of the server_members table
DO $$
BEGIN
  RAISE NOTICE 'Checking server_members table structure...';
END;
$$;

-- Improve the remove_expired_temporary_members function to handle all cases
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
    RETURNING *
  )
  SELECT COUNT(*) INTO removed_count FROM deleted_members;
  
  -- Next, handle members with duration-based expiration
  -- Use the composite primary key (server_id, user_id) instead of id
  FOR member_record IN 
    SELECT 
      sm.server_id, 
      sm.user_id, 
      sm.temporary_duration,
      sm.joined_at
    FROM public.server_members sm
    WHERE sm.temporary_access = true
      AND sm.access_expires_at IS NULL
      AND sm.temporary_duration IS NOT NULL
      AND sm.joined_at IS NOT NULL
  LOOP
    -- Try to parse the temporary_duration string to an interval
    BEGIN
      -- Check if it's a standard format (1h, 24h, 7d, 30d)
      IF member_record.temporary_duration = '1h' THEN
        temp_duration := INTERVAL '1 hour';
      ELSIF member_record.temporary_duration = '24h' THEN
        temp_duration := INTERVAL '24 hours';
      ELSIF member_record.temporary_duration = '7d' THEN
        temp_duration := INTERVAL '7 days';
      ELSIF member_record.temporary_duration = '30d' THEN
        temp_duration := INTERVAL '30 days';
      ELSE
        -- Try to use validate_duration_string or parse it directly
        BEGIN
          temp_duration := validate_duration_string(member_record.temporary_duration);
        EXCEPTION WHEN OTHERS THEN
          -- Try direct parsing if validation function fails
          temp_duration := member_record.temporary_duration::INTERVAL;
        END;
      END IF;
      
      join_time := member_record.joined_at;
      
      -- Check if the calculated expiration time has passed
      should_expire := (join_time + temp_duration) < CURRENT_TIMESTAMP;
      
      IF should_expire THEN
        -- Delete the member using composite primary key
        DELETE FROM public.server_members
        WHERE server_id = member_record.server_id
          AND user_id = member_record.user_id;
        
        -- Increment the count
        removed_count := removed_count + 1;
        
        -- Log the removal for debugging (optional)
        RAISE NOTICE 'Removed temporary member % from server % (joined: %, duration: %)',
          member_record.user_id, member_record.server_id, join_time, temp_duration;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other members
      RAISE WARNING 'Failed to process temporary member (server_id: %, user_id: %): %', 
        member_record.server_id, member_record.user_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN removed_count;
END;
$$;

-- Create a trigger to automatically update access_expires_at when temporary_access is set
CREATE OR REPLACE FUNCTION update_access_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  temp_duration INTERVAL;
BEGIN
  -- Only proceed if this is a temporary access member
  IF NEW.temporary_access AND NEW.temporary_duration IS NOT NULL THEN
    -- Try to parse the temporary_duration
    BEGIN
      -- Check if it's a standard format
      IF NEW.temporary_duration = '1h' THEN
        temp_duration := INTERVAL '1 hour';
      ELSIF NEW.temporary_duration = '24h' THEN
        temp_duration := INTERVAL '24 hours';
      ELSIF NEW.temporary_duration = '7d' THEN
        temp_duration := INTERVAL '7 days';
      ELSIF NEW.temporary_duration = '30d' THEN
        temp_duration := INTERVAL '30 days';
      ELSE
        -- Try to use validate_duration_string or parse it directly
        BEGIN
          temp_duration := validate_duration_string(NEW.temporary_duration);
        EXCEPTION WHEN OTHERS THEN
          -- Try direct parsing if validation fails
          temp_duration := NEW.temporary_duration::INTERVAL;
        END;
      END IF;
      
      -- Set the access_expires_at based on joined_at plus the duration
      NEW.access_expires_at := NEW.joined_at + temp_duration;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not set expiry for member: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on server_members table
DROP TRIGGER IF EXISTS server_members_expiry_trigger ON public.server_members;
CREATE TRIGGER server_members_expiry_trigger
BEFORE INSERT OR UPDATE ON public.server_members
FOR EACH ROW
EXECUTE FUNCTION update_access_expiry();

-- Ensure all existing temporary members have access_expires_at set
DO $$
DECLARE
  member_record RECORD;
  temp_duration INTERVAL;
BEGIN
  -- Use composite primary key fields instead of id
  FOR member_record IN 
    SELECT 
      sm.server_id, 
      sm.user_id, 
      sm.temporary_duration,
      sm.joined_at
    FROM public.server_members sm
    WHERE sm.temporary_access = true
      AND sm.access_expires_at IS NULL
      AND sm.temporary_duration IS NOT NULL
      AND sm.joined_at IS NOT NULL
  LOOP
    BEGIN
      -- Try standard formats first
      IF member_record.temporary_duration = '1h' THEN
        temp_duration := INTERVAL '1 hour';
      ELSIF member_record.temporary_duration = '24h' THEN
        temp_duration := INTERVAL '24 hours';
      ELSIF member_record.temporary_duration = '7d' THEN
        temp_duration := INTERVAL '7 days';
      ELSIF member_record.temporary_duration = '30d' THEN
        temp_duration := INTERVAL '30 days';
      ELSE
        -- Try to parse with validation function or directly
        BEGIN
          temp_duration := validate_duration_string(member_record.temporary_duration);
        EXCEPTION WHEN OTHERS THEN
          temp_duration := member_record.temporary_duration::INTERVAL;
        END;
      END IF;
      
      -- Update the member with the calculated expiry time using composite key
      UPDATE public.server_members
      SET access_expires_at = member_record.joined_at + temp_duration
      WHERE server_id = member_record.server_id
        AND user_id = member_record.user_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to update expiry for member (server_id: %, user_id: %): %', 
        member_record.server_id, member_record.user_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Setup a scheduled job to run the cleanup function regularly (every 15 minutes)
-- This requires pg_cron extension which may need to be enabled by Supabase support
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Drop existing job if it exists
    PERFORM cron.unschedule('remove-expired-members');
    
    -- Create new scheduled job to run every 15 minutes
    PERFORM cron.schedule(
      'remove-expired-members',     -- job name
      '*/15 * * * *',              -- cron schedule (every 15 minutes)
      'SELECT remove_expired_temporary_members()'  -- SQL to execute
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please set up an external scheduler to call remove_expired_temporary_members() regularly.';
  END IF;
END
$$;