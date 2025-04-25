import React, { useState } from 'react';
import { X, UserX, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface KickMemberModalProps {
  serverId: string;
  serverName: string;
  userId: string;
  username: string;
  displayName: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function KickMemberModal({ 
  serverId, 
  serverName, 
  userId, 
  username, 
  displayName, 
  onClose, 
  onSuccess 
}: KickMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the RPC function to kick the member (more secure)
      const { data, error: kickError } = await supabase.rpc(
        'kick_server_member',
        {
          server_id: serverId,
          member_id: userId
        }
      );

      if (kickError) {
        console.error("RPC Error:", kickError);
        throw kickError;
      }

      console.log("Kick result:", data);

      // If the RPC function fails, fall back to direct deletion
      if (!data) {
        console.log("Falling back to direct removal");
        const { error: directError } = await supabase
          .from('server_members')
          .delete()
          .eq('server_id', serverId)
          .eq('user_id', userId);

        if (directError) {
          console.error("Direct removal error:", directError);
          throw directError;
        }
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Error kicking member:", err);
      setError(err instanceof Error ? err.message : 'Failed to remove member from server');
      setLoading(false);
    }
  };

  const memberName = displayName || username;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <UserX className="h-5 w-5 mr-2 text-red-500" />
            Remove Member
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-md border border-red-800">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-500 font-medium mb-1">Remove member from server</h3>
              <p className="text-gray-300 text-sm">
                Are you sure you want to remove <span className="font-semibold">{memberName}</span> from 
                <span className="font-semibold"> {serverName}</span>? They will no longer have access to any
                channels or messages in this server.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleKick}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Removing...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-1" />
                Remove Member
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}