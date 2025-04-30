import React, { useState } from 'react';
import { X, AlertTriangle, Trash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface DeleteServerModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export default function DeleteServerModal({ serverId, serverName, onClose }: DeleteServerModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<string>('');
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const handleDelete = async () => {
    if (confirmText !== serverName) {
      setError(`Please type "${serverName}" to confirm deletion`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setDeleteStep('Starting deletion process...');
      console.log("Attempting to delete server:", serverId);
      
      // Explicitly delete all related data manually
      // 1. First delete server members
      setDeleteStep('Removing server members...');
      console.log("Deleting server members...");
      await supabase
        .from('server_members')
        .delete()
        .eq('server_id', serverId);
      
      // 2. Delete server invites
      setDeleteStep('Removing server invites...');
      console.log("Deleting server invites...");
      await supabase
        .from('server_invites')
        .delete()
        .eq('server_id', serverId);
      
      // 3. Get channels to delete their messages
      setDeleteStep('Finding channels to delete...');
      console.log("Fetching channels to delete messages...");
      const { data: channels } = await supabase
        .from('channels')
        .select('id')
        .eq('server_id', serverId);
      
      if (channels && channels.length > 0) {
        const channelIds = channels.map(c => c.id);
        
        // 4. Delete messages in those channels
        setDeleteStep('Deleting channel messages...');
        console.log("Deleting messages from channels:", channelIds);
        for (const channelId of channelIds) {
          await supabase
            .from('messages')
            .delete()
            .eq('channel_id', channelId);
        }
        
        // 5. Delete the channels
        setDeleteStep('Removing channels...');
        console.log("Deleting channels...");
        await supabase
          .from('channels')
          .delete()
          .eq('server_id', serverId);
      }
      
      // 6. Finally delete the server itself
      setDeleteStep('Deleting the server...');
      console.log("Deleting server...");
      const { error: serverError } = await supabase
        .from('servers')
        .delete()
        .eq('id', serverId)
        .eq('owner_id', session?.user?.id); // Ensure user is owner
      
      if (serverError) {
        console.error("Server deletion error:", serverError);
        throw serverError;
      }
      
      console.log("Server deletion successful! Redirecting...");
      setDeleteStep('Success! Redirecting...');
      
      // 7. Trigger server list refresh
      window.dispatchEvent(new Event('refresh-server-list'));
      window.dispatchEvent(new CustomEvent('server-deleted'));
      
      // 8. Navigate away and close modal
      navigate('/dashboard', { replace: true });
      onClose();
    } catch (err) {
      console.error("Error deleting server:", err);
      setError(err instanceof Error ? err.message : 'Failed to delete the server');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Trash className="h-5 w-5 mr-2 text-red-500" />
            Delete Server
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-red-900 bg-opacity-20 rounded-md border border-red-800">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-500 font-medium mb-1">Warning: This action cannot be undone</h3>
              <p className="text-gray-300 text-sm">
                This will permanently delete <span className="font-semibold">{serverName}</span> server, 
                including all channels, messages, and member data. Server members will immediately lose 
                access to all server content.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            To confirm, type "{serverName}" in the box below:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder={`Type ${serverName} to confirm`}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-4 text-blue-400 text-sm p-2 bg-blue-500 bg-opacity-10 rounded">
            <div className="flex items-center">
              <svg className="animate-spin mr-2 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {deleteStep}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== serverName}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <Trash className="h-4 w-4 mr-1" />
                Delete Server
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}