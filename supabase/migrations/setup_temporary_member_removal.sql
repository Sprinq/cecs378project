-- Migration file: supabase/migrations/20250426_setup_temp_member_removal.sql

-- This requires the pg_cron extension to be enabled in your Supabase project
-- You may need to contact Supabase support to enable this for your project

-- Create a scheduled job to remove expired temporary members
-- This job will run every hour
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Create the scheduled job if the extension is available
    PERFORM cron.schedule(
      'remove-expired-members', -- job name
      '0 * * * *',             -- cron schedule (every hour at minute 0)
      'SELECT remove_expired_temporary_members()' -- SQL to execute
    );
  END IF;
END
$$;

-- If pg_cron is not available, you can implement this logic in your application
-- by calling the remove_expired_temporary_members() function periodically