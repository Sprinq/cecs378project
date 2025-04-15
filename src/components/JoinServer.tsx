import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function JoinServer() {
  const { inviteCode } = useParams();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();

  // Check if the invite code is valid
  useEffect(() => {
    const checkInviteCode = async () => {
      if (!inviteCode || !session?.user) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log("Checking invite code:", inviteCode);
        
        // First, get server details from the invite code
        const { data: serverData, error: serverError } = await supabase
          .from('servers')
          .select('id, name, invite_expires_at')
          .eq('invite_code', inviteCode)
          .single();

        if (serverError) {
          console.error("Error fetching server:", serverError);
          throw new Error('Invalid invite code');
        }

        console.log("Found server:", serverData);

        // Check if the invite has expired
        if (serverData.invite_expires_at && new Date(serverData.invite_expires_at) < new Date()) {
          throw new Error('This invite has expired');
        }

        // Check if the user is already a member
        const { data: memberData, error: memberError } = await supabase
          .from('server_members')
          .select('user_id')
          .eq('server_id', serverData.id)
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (memberError) {
          console.error("Error checking membership:", memberError);
        }

        if (memberData) {
          // User is already a member, redirect to server
          console.log("User is already a member, redirecting...");
          navigate(`/dashboard/server/${serverData.id}`);
          return;
        }

        setServerDetails({
          id: serverData.id,
          name: serverData.name
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
    if (!inviteCode || !session?.user) return;

    setJoining(true);
    setError(null);

    try {
      console.log("Attempting to join server with invite code:", inviteCode);
      
      // Call the RPC function directly with the invite code
      const { data, error } = await supabase.rpc(
        'join_server_by_invite',
        { invite_code: inviteCode }
      );

      if (error) {
        console.error("Error from RPC call:", error);
        throw error;
      }

      console.log("Join server successful, server ID:", data);
      
      // Navigate to the server
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
          role: 'member'
        });
        
      if (error) {
        console.error("Error inserting member:", error);
        throw error;
      }
      
      console.log("Manual join successful");
      navigate(`/dashboard/server/${serverDetails.id}`);
    } catch (err) {
      console.error("Error in manual join:", err);
      setError(err instanceof Error ? err.message : 'Failed to join server manually');
    } finally {
      setJoining(false);
    }
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
      <p className="text-gray-400 mb-6">
        You've been invited to join{" "}
        <span className="text-white font-semibold">{serverDetails?.name}</span>
      </p>
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