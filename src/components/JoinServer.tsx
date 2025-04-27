import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, Loader, Clock, Calendar, Eye, EyeOff, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function JoinServer() {
  const { inviteCode } = useParams();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<{ 
    id: string; 
    name: string;
    hideHistory?: boolean;
    temporaryAccess?: boolean;
    temporaryDuration?: string;
    expiresAt?: string;
    usesLeft?: number;
  } | null>(null);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if the invite code is valid
  useEffect(() => {
    const checkInviteCode = async () => {
      if (!inviteCode || !session?.user) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log("Checking invite code:", inviteCode);
        
        // First, check the new server_invites table
        const { data: inviteData, error: inviteError } = await supabase
          .from('server_invites')
          .select('server_id, server:servers(id, name), hide_history, temporary_access, temporary_duration, raw_temporary_duration, expires_at, max_uses, uses')
          .eq('code', inviteCode)
          .single();
        
        if (!inviteError && inviteData) {
          console.log("Found invite in server_invites:", inviteData);
          
          // Check if invite has expired
          if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
            throw new Error('This invite has expired');
          }
          
          // Check if max uses has been reached
          if (inviteData.max_uses && inviteData.uses >= inviteData.max_uses) {
            throw new Error('This invite has reached its maximum number of uses');
          }
          
          // Check if user is already a member
          const { data: memberData, error: memberError } = await supabase
            .from('server_members')
            .select('user_id, temporary_access, access_expires_at')
            .eq('server_id', inviteData.server.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (memberError) {
            console.error("Error checking membership:", memberError);
          }

          if (memberData) {
            // User is already a member
            console.log("User is already a member, redirecting...");
            
            // If they have temporary access, show when it expires
            if (memberData.temporary_access && memberData.access_expires_at) {
              const expiry = new Date(memberData.access_expires_at);
              const now = new Date();
              
              // Calculate time remaining
              const timeRemaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
              
              if (timeRemaining > 0) {
                // Format the expiry time
                const days = Math.floor(timeRemaining / 86400);
                const hours = Math.floor((timeRemaining % 86400) / 3600);
                const minutes = Math.floor((timeRemaining % 3600) / 60);
                
                let expiryString = '';
                if (days > 0) {
                  expiryString = `${days} day${days !== 1 ? 's' : ''}`;
                } else if (hours > 0) {
                  expiryString = `${hours} hour${hours !== 1 ? 's' : ''}`;
                } else {
                  expiryString = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                }
                
                setExpiryTime(`Your temporary access expires in ${expiryString}`);
              } else {
                // Access has expired but they're still in the database
                // (They'll be removed soon by the cleanup function)
                setExpiryTime("Your temporary access has expired");
              }
            }
            
            // Still redirect to the server after a short delay
            setTimeout(() => {
              navigate(`/dashboard/server/${inviteData.server.id}`);
            }, 2000);
            return;
          }
          
          setServerDetails({
            id: inviteData.server.id,
            name: inviteData.server.name,
            hideHistory: inviteData.hide_history,
            temporaryAccess: inviteData.temporary_access,
            temporaryDuration: inviteData.raw_temporary_duration || inviteData.temporary_duration,
            expiresAt: inviteData.expires_at,
            usesLeft: inviteData.max_uses ? (inviteData.max_uses - inviteData.uses) : undefined
          });
          return;
        }
        
        // Fall back to checking the old invite system
        const { data: serverData, error: serverError } = await supabase
          .from('servers')
          .select('id, name, invite_expires_at')
          .eq('invite_code', inviteCode)
          .single();

        if (serverError) {
          console.error("Error fetching server:", serverError);
          throw new Error('Invalid invite code');
        }

        console.log("Found server via old invite system:", serverData);

        // Check if the invite has expired
        if (serverData.invite_expires_at && new Date(serverData.invite_expires_at) < new Date()) {
          throw new Error('This invite has expired');
        }

        // Check if the user is already a member
        const { data: memberData, error: memberError } = await supabase
          .from('server_members')
          .select('user_id, temporary_access, access_expires_at')
          .eq('server_id', serverData.id)
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (memberError) {
          console.error("Error checking membership:", memberError);
        }

        if (memberData) {
          // User is already a member, redirect to server
          console.log("User is already a member, redirecting...");
          
          // If they have temporary access, show when it expires
          if (memberData.temporary_access && memberData.access_expires_at) {
            const expiry = new Date(memberData.access_expires_at);
            const now = new Date();
            
            // Calculate time remaining
            const timeRemaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
            
            if (timeRemaining > 0) {
              // Format the expiry time
              const days = Math.floor(timeRemaining / 86400);
              const hours = Math.floor((timeRemaining % 86400) / 3600);
              const minutes = Math.floor((timeRemaining % 3600) / 60);
              
              let expiryString = '';
              if (days > 0) {
                expiryString = `${days} day${days !== 1 ? 's' : ''}`;
              } else if (hours > 0) {
                expiryString = `${hours} hour${hours !== 1 ? 's' : ''}`;
              } else {
                expiryString = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
              }
              
              setExpiryTime(`Your temporary access expires in ${expiryString}`);
            } else {
              setExpiryTime("Your temporary access has expired");
            }
          }
          
          // Still redirect after a short delay
          setTimeout(() => {
            navigate(`/dashboard/server/${serverData.id}`);
          }, 2000);
          return;
        }

        setServerDetails({
          id: serverData.id,
          name: serverData.name,
          expiresAt: serverData.invite_expires_at
        });
      } catch (err) {
        console.error("Error checking invite:", err);
        setError(err instanceof Error ? err.message : 'Failed to verify invite');
      } finally {
        setLoading(false);
      }
    };

    checkInviteCode();
  }, [inviteCode, session, navigate]);

  const handleJoinServer = async () => {
    if (!inviteCode || !session?.user || !serverDetails) return;

    setJoining(true);
    setError(null);

    try {
      console.log("Attempting to join server with invite code:", inviteCode);
      
      // First try the new join RPC
      const { data, error } = await supabase.rpc(
        'join_server_by_invite_code',
        { invite_code: inviteCode }
      );

      if (error) {
        console.error("Error from new RPC call:", error);
        // Fall back to old RPC
        const { data: oldData, error: oldError } = await supabase.rpc(
          'join_server_by_invite',
          { invite_code: inviteCode }
        );
        
        if (oldError) {
          throw oldError;
        }
        
        console.log("Join server successful (old method), server ID:", oldData);
        
        // Check if this was a temporary membership
        if (serverDetails.temporaryAccess) {
          alert(`You now have temporary access to the server for ${formatDuration(serverDetails.temporaryDuration)}. You will be automatically removed after this period.`);
        }
        
        // Trigger server list refresh
        window.dispatchEvent(new Event('refresh-server-list'));
        
        navigate(`/dashboard/server/${oldData}`);
        return;
      }

      console.log("Join server successful (new method), server ID:", data);
      
      // Check if this was a temporary membership and show a notification
      if (serverDetails.temporaryAccess) {
        alert(`You now have temporary access to the server for ${formatDuration(serverDetails.temporaryDuration)}. You will be automatically removed after this period.`);
      }
      
      // Trigger server list refresh
      window.dispatchEvent(new Event('refresh-server-list'));
      
      navigate(`/dashboard/server/${data}`);
    } catch (err) {
      console.error("Error joining server:", err);
      setError(err instanceof Error ? err.message : 'Failed to join server');
    } finally {
      setJoining(false);
    }
  };

  // Direct approach for debugging - use a simpler method to join
  const handleManualJoin = async () => {
    if (!serverDetails?.id || !session?.user) return;
    
    setJoining(true);
    setError(null);
    
    try {
      console.log("Attempting manual join for server:", serverDetails.id);
      
      // Direct insert approach
      const { error } = await supabase
        .from('server_members')
        .insert({
          server_id: serverDetails.id,
          user_id: session.user.id,
          role: 'member',
          hide_history: serverDetails.hideHistory || false,
          temporary_access: serverDetails.temporaryAccess || false,
          temporary_duration: serverDetails.temporaryDuration,
          joined_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Error inserting member:", error);
        throw error;
      }
      
      // If using the new invite system, increment the uses count
      if (inviteCode) {
        await supabase.rpc('increment_invite_uses', { invite_code: inviteCode });
      }
      
      console.log("Manual join successful");
      
      // Check if this was a temporary membership
      if (serverDetails.temporaryAccess) {
        alert(`You now have temporary access to the server for ${formatDuration(serverDetails.temporaryDuration)}. You will be automatically removed after this period.`);
      }
      
      navigate(`/dashboard/server/${serverDetails.id}`);
    } catch (err) {
      console.error("Error in manual join:", err);
      setError(err instanceof Error ? err.message : 'Failed to join server manually');
    } finally {
      setJoining(false);
    }
  };

  // Format duration for display
  const formatDuration = (duration: string | undefined) => {
    if (!duration) return '';
    
    // Handle preset formats
    if (duration === '1h') return '1 hour';
    if (duration === '24h') return '24 hours';
    if (duration === '7d') return '7 days';
    if (duration === '30d') return '30 days';
    
    // Handle raw PostgreSQL interval format
    // Examples: "1 hour", "30 minutes", "3 days", etc.
    return duration;
  };

  // If not logged in, redirect to login
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <Shield className="h-16 w-16 text-indigo-500 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Join Server</h1>
        <p className="text-gray-400 mb-6">You need to be logged in to join a server</p>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate(`/login?redirect=/invite/${inviteCode}`)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          >
            Log In
          </button>
          <button
            onClick={() => navigate(`/register?redirect=/invite/${inviteCode}`)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
          >
            Register
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <Loader className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400">Verifying invite...</p>
      </div>
    );
  }

  // If we have an expiry time to show, render a redirecting message
  if (expiryTime) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <Shield className="h-16 w-16 text-indigo-500 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">You're Already a Member</h1>
        <p className="text-gray-400 mb-2">Redirecting you to the server...</p>
        <div className="bg-gray-800 p-4 rounded-md text-yellow-400 flex items-center mb-6">
          <Timer className="h-5 w-5 mr-2" />
          <span>{expiryTime}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
        <p className="text-red-400 mb-6">{error}</p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          >
            Back to Dashboard
          </button>
          {serverDetails && (
            <div>
              <p className="text-gray-400 mt-4 mb-2">If you're still having trouble joining:</p>
              <button
                onClick={handleManualJoin}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                Try Alternative Join Method
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      <Shield className="h-16 w-16 text-indigo-500 mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">Join Server</h1>
      <p className="text-gray-400 mb-2">
        You've been invited to join{" "}
        <span className="text-white font-semibold">{serverDetails?.name}</span>
      </p>
      
      {/* Display invite options */}
      {(serverDetails?.hideHistory || serverDetails?.temporaryAccess || serverDetails?.usesLeft) && (
        <div className="mb-6 bg-gray-800 p-4 rounded-md max-w-sm">
          <h2 className="text-white text-sm font-semibold mb-2">Invite Details</h2>
          <div className="space-y-2 text-sm">
            {serverDetails.hideHistory && (
              <div className="flex items-center text-gray-300">
                <EyeOff className="h-4 w-4 mr-2 text-indigo-400" />
                <span>You won't see previous messages</span>
              </div>
            )}
            {serverDetails.temporaryAccess && (
              <div className="flex items-center text-gray-300">
                <Clock className="h-4 w-4 mr-2 text-yellow-400" />
                <span>Temporary access for {formatDuration(serverDetails.temporaryDuration)}</span>
              </div>
            )}
            {serverDetails.usesLeft !== undefined && (
              <div className="flex items-center text-gray-300">
                <Calendar className="h-4 w-4 mr-2 text-blue-400" />
                <span>{serverDetails.usesLeft} uses remaining</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Add a warning for temporary access */}
      {serverDetails?.temporaryAccess && (
        <div className="mb-6 bg-yellow-900 bg-opacity-20 p-4 rounded-md max-w-sm border border-yellow-800">
          <div className="flex items-center text-yellow-300">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>
              Your access to this server will automatically expire after {formatDuration(serverDetails.temporaryDuration)}.
              You will be removed from the server at that time.
            </span>
          </div>
        </div>
      )}
      
      <div className="flex space-x-4">
        <button
          onClick={handleJoinServer}
          disabled={joining}
          className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center ${joining ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {joining && <Loader className="h-4 w-4 mr-2 animate-spin" />}
          {joining ? 'Joining...' : 'Accept Invite'}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
          disabled={joining}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}