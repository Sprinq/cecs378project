import React, { useState, useEffect } from 'react';
import { X, Plus, Trash, RefreshCw, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ManageChannelsProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
  onChannelUpdate?: () => void;
}

export default function ManageChannels({ serverId, serverName, onClose, onChannelUpdate }: ManageChannelsProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const { session } = useAuthStore();

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId)
        .order('name');

      if (error) throw error;
      setChannels(data || []);
    } catch (err) {
      console.error("Error fetching channels:", err);
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [serverId]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setCreatingChannel(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          description: newChannelDescription || null
        });

      if (error) throw error;

      setNewChannelName('');
      setNewChannelDescription('');
      fetchChannels();
      if (onChannelUpdate) onChannelUpdate();
    } catch (err) {
      console.error("Error creating channel:", err);
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Are you sure you want to delete the #${channelName} channel? This will delete all messages in this channel.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      fetchChannels();
      if (onChannelUpdate) onChannelUpdate();
    } catch (err) {
      console.error("Error deleting channel:", err);
      setError(err instanceof Error ? err.message : 'Failed to delete channel');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Hash className="h-5 w-5 mr-2" />
            Manage Channels for {serverName}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Create Channel Form */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-2">Create New Channel</h3>
          <form onSubmit={handleCreateChannel} className="space-y-3">
            <div>
              <label htmlFor="channelName" className="block text-sm font-medium text-gray-300 mb-1">
                Channel Name
              </label>
              <div className="flex items-center">
                <span className="text-gray-400 mr-1">#</span>
                <input
                  id="channelName"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="general"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Only lowercase letters, numbers, and dashes are allowed
              </p>
            </div>

            <div>
              <label htmlFor="channelDescription" className="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                id="channelDescription"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="What's this channel about?"
              />
            </div>

            <button
              type="submit"
              disabled={!newChannelName.trim() || creatingChannel}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {creatingChannel ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Channel
                </>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded flex items-center">
            <span>{error}</span>
            <button 
              onClick={fetchChannels}
              className="ml-2 bg-gray-700 p-1 rounded hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Channels List */}
        <div>
          <h3 className="text-white font-medium mb-2">Existing Channels</h3>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No channels found. Create one above!
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map(channel => (
                <div 
                  key={channel.id}
                  className="bg-gray-700 rounded-md p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center text-white">
                      <Hash className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    {channel.description && (
                      <p className="text-sm text-gray-400 mt-1">{channel.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteChannel(channel.id, channel.name)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Delete channel"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}