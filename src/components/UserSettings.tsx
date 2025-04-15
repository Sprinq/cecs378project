import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Save, X, User } from 'lucide-react';

export default function UserSettings({ onClose }: { onClose: () => void }) {
  const { session } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('username, display_name')
          .eq('id', session.user.id)
          .single();
          
        if (data && !error) {
          setUsername(data.username || '');
          setDisplayName(data.display_name || '');
          setOriginalUsername(data.username || '');
        }
      }
    };
    
    fetchUserProfile();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Check if username is already taken (if username has changed)
      if (username !== originalUsername) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        if (existingUser) {
          throw new Error('Username is already taken');
        }
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session?.user?.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setOriginalUsername(username); // Update the original username after successful update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Settings
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
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Username"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Your unique identifier. This must be unique across all users.
              </p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                Display Name
              </label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Display Name"
              />
              <p className="mt-1 text-xs text-gray-400">
                How you'll appear to others. This doesn't have to be unique.
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-500 text-sm p-2 bg-green-500 bg-opacity-10 rounded">
                Profile updated successfully!
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium flex items-center"
              >
                {loading ? 'Saving...' : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}