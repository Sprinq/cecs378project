-- Fixed function with proper dollar quoting
CREATE OR REPLACE FUNCTION join_server_by_invite_code(
  invite_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  invite_record RECORD;
  server_id UUID;
  already_member BOOLEAN;
  access_expires_at TIMESTAMPTZ;
  temp_interval INTERVAL;
BEGIN
  -- Find the invite by code
  SELECT 
    i.*, 
    s.id as server_id 
  INTO invite_record
  FROM public.server_invites i
  JOIN public.servers s ON i.server_id = s.id
  WHERE i.code = $1;
  
  -- If not found in server_invites, check the legacy invite system
  IF invite_record IS NULL THEN
    SELECT id, invite_expires_at INTO server_id, access_expires_at
    FROM public.servers
    WHERE invite_code = $1;
    
    IF server_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invite code';
    END IF;
    
    -- Check if the invite has expired
    IF access_expires_at IS NOT NULL AND access_expires_at < CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Invite code has expired';
    END IF;
  ELSE
    -- Use data from the invite record
    server_id := invite_record.server_id;
    
    -- Check if the invite has expired
    IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Invite code has expired';
    END IF;
    
    -- Check if the invite has reached max uses
    IF invite_record.max_uses IS NOT NULL AND invite_record.uses >= invite_record.max_uses THEN
      RAISE EXCEPTION 'Invite code has reached maximum uses';
    END IF;
    
    -- Calculate when temporary access expires, if applicable
    IF invite_record.temporary_access AND invite_record.temporary_duration IS NOT NULL THEN
      BEGIN
        temp_interval := validate_duration_string(invite_record.temporary_duration);
        access_expires_at := CURRENT_TIMESTAMP + temp_interval;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid temporary duration in invite: %', invite_record.temporary_duration;
      END;
    END IF;
  END IF;
  
  -- Check if the user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = server_id
    AND user_id = auth.uid()
  ) INTO already_member;
  
  IF already_member THEN
    -- If already a member, just return the server ID
    RETURN server_id;
  END IF;
  
  -- Add the user to the server with invite restrictions if applicable
  INSERT INTO public.server_members (
    server_id,
    user_id,
    role,
    hide_history,
    temporary_access,
    temporary_duration,
    access_expires_at
  ) VALUES (
    server_id,
    auth.uid(),
    'member',
    COALESCE(invite_record.hide_history, false),
    COALESCE(invite_record.temporary_access, false),
    invite_record.temporary_duration,
    access_expires_at
  );
  
  -- Increment the number of uses for the invite
  IF invite_record.id IS NOT NULL THEN
    UPDATE public.server_invites
    SET uses = uses + 1
    WHERE id = invite_record.id;
  END IF;
  
  RETURN server_id;
END;
$function$;