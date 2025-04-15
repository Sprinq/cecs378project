import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { User, UserPlus, X, MessageSquare, MoreHorizontal, Check, AlertCircle, RefreshCw } from 'lucide-react';
import FriendRequest from './FriendRequest';
import { useNavigate } from 'react-router-dom';

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  status: 'online' | 'offline' | 'away';
}

interface FriendRequest {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export default function Friends() {
  const { session } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const navigate = useNavigate();

  const fetchFriends = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch confirmed friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          user_id2:users!user_id2(id, username, display_name),
          user_id1:users!user_id1(id, username, display_name),
          status
        `)
        .eq('status', 'accepted')
        .or(`user_id1.eq.${session.user.id},user_id2.eq.${session.user.id}`);

      if (friendsError) throw friendsError;

      // Transform the data to a flatter structure
      const formattedFriends = friendsData?.map(friendship => {
        // Determine which user is the friend (not the current user)
        const friendUser = friendship.user_id1.id === session.user.id 
          ? friendship.user_id2 
          : friendship.user_id1;
        
        return {
          id: friendUser.id,
          username: friendUser.username,
          display_name: friendUser.display_name,
          // Default all users to online for now
          // In a production app, you'd implement a proper presence system
          status: 'online' as const
        };
      }) || [];

      setFriends(formattedFriends);

      // Fetch pending friend requests (received)
      const { data: pendingData, error: pendingError } = await supabase
        .from('friends')
        .select(`
          users!user_id1(id, username, display_name),
          created_at
        `)
        .eq('user_id2', session.user.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const formattedPending = pendingData?.map(request => ({
        id: request.users.id,
        username: request.users.username,
        display_name: request.users.display_name,
        created_at: request.created_at
      })) || [];

      setPendingRequests(formattedPending);

      // Fetch sent friend requests
      const { data: sentData, error: sentError } = await supabase
        .from('friends')
        .select(`
          users!user_id2(id, username, display_name),
          created_at
        `)
        .eq('user_id1', session.user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      const formattedSent = sentData?.map(request => ({
        id: request.users.id,
        username: request.users.username,
        display_name: request.users.display_name,
        created_at: request.created_at
      })) || [];

      setSentRequests(formattedSent);
    } catch (err) {
      console.error("Error fetching friends:", err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchFriends();
    }

    // Set up real-time subscriptions
    const friendsChannel = supabase
      .channel('friends_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `user_id1=eq.${session?.user?.id}`
      }, () => {
        fetchFriends();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `user_id2=eq.${session?.user?.id}`
      }, () => {
        fetchFriends();
      })
      .subscribe();

    return () => {
      friendsChannel.unsubscribe();
    };
  }, [session]);

  const handleAcceptRequest = async (userId: string) => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .match({ user_id1: userId, user_id2: session.user.id });

      if (error) throw error;

      fetchFriends();
    } catch (err) {
      console.error("Error accepting friend request:", err);
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .match({ user_id1: userId, user_id2: session.user.id });

      if (error) throw error;

      fetchFriends();
    } catch (err) {
      console.error("Error rejecting friend request:", err);
      setError(err instanceof Error ? err.message : 'Failed to reject friend request');
    }
  };

  const handleCancelRequest = async (userId: string) => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .match({ user_id1: session.user.id, user_id2: userId });

      if (error) throw error;

      fetchFriends();
    } catch (err) {
      console.error("Error canceling friend request:", err);
      setError(err instanceof Error ? err.message : 'Failed to cancel friend request');
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!session?.user) return;

    try {
      // Need to check both directions since we don't know which user initiated the friendship
      await supabase
        .from('friends')
        .delete()
        .or(`and(user_id1.eq.${session.user.id},user_id2.eq.${userId}),and(user_id1.eq.${userId},user_id2.eq.${session.user.id})`);

      fetchFriends();
    } catch (err) {
      console.error("Error removing friend:", err);
      setError(err instanceof Error ? err.message : 'Failed to remove friend');
    }
  };

  const handleMessageFriend = (userId: string) => {
    navigate(`/dashboard/dm/${userId}`);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <User className="h-5 w-5 mr-2" />
            Friends
          </h2>
          <button 
            onClick={() => setShowAddFriend(true)}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-sm font-medium"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Friend
          </button>
        </div>
      </div>

      {/* Friend request modal */}
      {showAddFriend && (
        <FriendRequest 
          onClose={() => setShowAddFriend(false)} 
          onSuccess={() => {
            setShowAddFriend(false);
            fetchFriends();
          }}
        />
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && friends.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 ? (
          <div className="flex justify-center items-center h-24">
            <div className="text-gray-400 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Loading friends...
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 text-red-400 text-sm p-2 bg-red-500 bg-opacity-10 rounded flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
                <button 
                  onClick={fetchFriends}
                  className="ml-2 bg-gray-700 p-1 rounded hover:bg-gray-600"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-2">Pending Friend Requests</h3>
                <div className="space-y-2">
                  {pendingRequests.map(request => (
                    <div 
                      key={request.id}
                      className="bg-gray-800 rounded-md p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-sm">
                          {(request.display_name || request.username).charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{request.display_name || request.username}</div>
                          <div className="text-xs text-gray-400">Sent {formatDate(request.created_at)}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleAcceptRequest(request.id)}
                          className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-md"
                          title="Accept"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(request.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-md"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent requests */}
            {sentRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-2">Sent Requests</h3>
                <div className="space-y-2">
                  {sentRequests.map(request => (
                    <div 
                      key={request.id}
                      className="bg-gray-800 rounded-md p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-sm">
                          {(request.display_name || request.username).charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{request.display_name || request.username}</div>
                          <div className="text-xs text-gray-400">Sent {formatDate(request.created_at)}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelRequest(request.id)}
                        className="text-gray-400 hover:text-white p-1.5"
                        title="Cancel Request"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            <h3 className="text-white font-medium mb-2">All Friends {friends.length > 0 && `(${friends.length})`}</h3>
            {friends.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <div className="text-4xl mb-2">👋</div>
                <div>You don't have any friends yet. Add some!</div>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <div 
                    key={friend.id}
                    className="bg-gray-800 rounded-md p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-sm relative">
                        {(friend.display_name || friend.username).charAt(0)}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                          friend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                      </div>
                      <div>
                        <div className="text-white font-medium">{friend.display_name || friend.username}</div>
                        <div className="text-xs text-gray-400">
                          {friend.status === 'online' ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleMessageFriend(friend.id)}
                        className="text-gray-400 hover:text-white p-1.5"
                        title="Message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <div className="relative group">
                        <button 
                          className="text-gray-400 hover:text-white p-1.5"
                          title="More Options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 mt-1 w-32 bg-gray-900 rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                          <button 
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="text-red-400 hover:bg-gray-800 w-full text-left px-3 py-1 text-sm"
                          >
                            Remove Friend
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}