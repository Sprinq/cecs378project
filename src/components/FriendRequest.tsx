import React, { useState } from 'react';
import { X, UserPlus, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface FriendRequestProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FriendRequest({ onClose, onSuccess }: FriendRequestProps) {
  const { session } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'display_name'>('username');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Find the user by username or display name
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq(searchType, identifier)
        .single();

      if (userError) {
        throw new Error(`User not found with this ${searchType.replace('_', ' ')}`);
      }

      if (userData.id === session.user.id) {
        throw new Error('You cannot add yourself as a friend');
      }

      // Check if a friend request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('friends')
        .select('status')
        .or(`and(user_id1.eq.${session.user.id},user_id2.eq.${userData.id}),and(user_id1.eq.${userData.id},user_id2.eq.${session.user.id})`)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingRequest) {
        if (existingRequest.status === 'accepted') {
          throw new Error('You are already friends with this user');
        } else {
          throw new Error('A friend request already exists');
        }
      }

      // Send the friend request
      const { error: friendError } = await supabase
        .from('friends')
        .insert({
          user_id1: session.user.id,
          user_id2: userData.id,
          status: 'pending'
        });

      if (friendError) {
        throw friendError;
      }

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      console.error("Friend request error:", err);
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Add Friend
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="text-green-500 text-center p-4 bg-green-500 bg-opacity-10 rounded mb-4">
            Friend request sent successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <span className="block text-sm font-medium text-gray-300 mr-4">
                    Search by:
                  </span>
                  <div className="flex bg-gray-700 rounded-md p-1 space-x-1">
                    <button
                      type="button"
                      onClick={() => setSearchType('username')}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        searchType === 'username' 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Username
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchType('display_name')}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        searchType === 'display_name' 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Display Name
                    </button>
                  </div>
                </div>

                <label htmlFor="identifier" className="block text-sm font-medium text-gray-300 mb-1">
                  {searchType === 'username' ? 'Username' : 'Display Name'}
                </label>
                <input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Enter ${searchType === 'username' ? 'username' : 'display name'}`}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Enter the exact {searchType === 'username' ? 'username' : 'display name'} of the person you want to add
                </p>
              </div>

              {error && (
                <div className="text-red-500 text-sm p-2 bg-red-500 bg-opacity-10 rounded flex items-center">
                  <span className="mr-2">{error}</span>
                  <button 
                    type="button"
                    onClick={() => setError(null)}
                    className="bg-gray-700 p-1 rounded hover:bg-gray-600"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
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
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}