import React, { useState } from 'react';
import { X, ServerCrash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface CreateServerProps {
  onClose: () => void;
  onSuccess?: (serverId: string) => void;
}

export default function CreateServer({ onClose, onSuccess }: CreateServerProps) {
  const { session } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);
  
    try {
      console.log("Creating server with name:", name, "and description:", description);
      
      // Try using the RPC function first (with explicit parameter names)
      console.log("Attempting to use RPC function...");
      const { data, error: serverError } = await supabase.rpc(
        'create_server_with_channels',
        { 
          "server_name": name,
          "server_description": description
        }
      );
  
      if (serverError) {
        console.error("RPC error, details:", serverError);
        console.log("Falling back to manual creation");
        
        // Fall back to manual server creation
        const { data: manualData, error: manualError } = await supabase
          .from('servers')
          .insert({
            name,
            description,
            owner_id: session.user.id
          })
          .select('id')
          .single();
          
        if (manualError) {
          console.error("Manual server creation error:", manualError);
          throw manualError;
        }
        
        console.log("Server created successfully with ID:", manualData.id);
        
        // Add the user as a permanent owner
        console.log("Adding user as server owner");
        const { error: memberError } = await supabase
          .from('server_members')
          .insert({
            server_id: manualData.id,
            user_id: session.user.id,
            role: 'owner',
            temporary_access: false,
            joined_at: new Date().toISOString()
          });
          
        if (memberError) {
          console.error("Error adding member:", memberError);
        }
        
        // Create BOTH default channels manually
        console.log("Creating default channels: general and welcome");
        await createDefaultChannels(manualData.id);
        
        // Call success callback
        if (onSuccess) {
          console.log("Calling onSuccess with server ID:", manualData.id);
          onSuccess(manualData.id);
        } else {
          onClose();
        }
      } else if (data && onSuccess) {
        console.log("RPC function succeeded with server ID:", data);
        onSuccess(data);
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Server creation error:", err);
      setError(err instanceof Error ? err.message : 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create default channels
  const createDefaultChannels = async (serverId: string) => {
    try {
      // Create general channel
      const { error: generalError } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          name: 'general',
          description: 'General discussion channel'
        });

      if (generalError) {
        console.error("Error creating general channel:", generalError);
      } else {
        console.log("General channel created successfully");
      }

      // Create welcome channel
      const { error: welcomeError } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          name: 'welcome',
          description: 'Welcome new members'
        });

      if (welcomeError) {
        console.error("Error creating welcome channel:", welcomeError);
      } else {
        console.log("Welcome channel created successfully");
      }
    } catch (error) {
      console.error("Error creating default channels:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <ServerCrash className="h-5 w-5 mr-2" />
            Create a New Server
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="serverName" className="block text-sm font-medium text-gray-300 mb-1">
                Server Name
              </label>
              <input
                id="serverName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="My Awesome Server"
                required
              />
            </div>

            <div>
              <label htmlFor="serverDescription" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="serverDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                placeholder="What's this server about?"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 mr-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
              >
                {loading ? 'Creating...' : 'Create Server'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}