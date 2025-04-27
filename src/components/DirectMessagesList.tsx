import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { MessageSquare, User, RefreshCw, AlertCircle } from 'lucide-react';
import { decryptMessage } from '../services/serverEncryptionService';

interface FriendInfo {
  id: string;
  username: string;
  display_name: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export default function DirectMessagesList() {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { friendId } = useParams();
  const { session } = useAuthStore();
  const navigate = useNavigate();

  // Memoize fetchFriends to avoid stale closure issues
  const fetchFriends = React.useCallback(async () => {
    if (!session?.user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch all friends
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

      // Transform the data
      const friendsList = friendsData?.map(friendship => {
        const friendUser = friendship.user_id1.id === session.user.id 
          ? friendship.user_id2 
          : friendship.user_id1;

        return {
          id: friendUser.id,
          username: friendUser.username,
          display_name: friendUser.display_name,
          last_message: null,
          last_message_time: null,
          unread_count: 0
        };
      }) || [];

      // For each friend, get their last message
      for (const friend of friendsList) {
        const { data: messageData } = await supabase
          .from('direct_messages')
          .select('encrypted_content, iv, created_at, is_encrypted, sender_id, updated_at')
          .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${session.user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (messageData) {
          // Try to decrypt the message for preview
          let displayContent = messageData.encrypted_content;
          if (messageData.is_encrypted) {
            try {
              const conversationId = [session.user.id, friend.id].sort().join('-');
              displayContent = await decryptMessage(
                conversationId,
                messageData.encrypted_content,
                messageData.iv
              );
            } catch (error) {
              console.error('Failed to decrypt message preview:', error);
              displayContent = '🔒 [Encrypted message]';
            }
          }
          
          // Add prefix for messages sent by the current user
          if (messageData.sender_id === session.user.id) {
            displayContent = `You: ${displayContent}`;
          }
          
          // Mark edited messages
          if (messageData.updated_at && messageData.updated_at !== messageData.created_at) {
            displayContent += ' (edited)';
          }
          
          friend.last_message = displayContent;
          friend.last_message_time = messageData.created_at;
        }

        // Get unread count (messages from friend that current user hasn't seen)
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', friend.id)
          .eq('receiver_id', session.user.id)
          .eq('read', false);

        friend.unread_count = count || 0;
      }

      // Sort by last message time (most recent first)
      friendsList.sort((a, b) => {
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setFriends(friendsList);
    } catch (err) {
      console.error("Error fetching friends:", err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchFriends();

      // Set up real-time subscriptions for all message events (INSERT, UPDATE, DELETE)
      const messagesChannel = supabase
        .channel(`direct_messages_channel_${session.user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${session.user.id}`
        }, (payload) => {
          console.log('Message INSERT received (receiver):', payload);
          fetchFriends();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${session.user.id}`
        }, (payload) => {
          console.log('Message UPDATE received (receiver):', payload);
          fetchFriends();
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${session.user.id}`
        }, (payload) => {
          console.log('Message DELETE received (receiver):', payload);
          fetchFriends();
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${session.user.id}`
        }, (payload) => {
          console.log('Message INSERT received (sender):', payload);
          fetchFriends();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${session.user.id}`
        }, (payload) => {
          console.log('Message UPDATE received (sender):', payload);
          fetchFriends();
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${session.user.id}`
        }, (payload) => {
          console.log('Message DELETE received (sender):', payload);
          fetchFriends();
        })
        .subscribe((status) => {
          console.log('Direct messages channel subscription status:', status);
        });

      return () => {
        console.log('Unsubscribing from direct messages channel');
        messagesChannel.unsubscribe();
      };
    }
  }, [session, fetchFriends]);

  // Format timestamp
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within the last week, show day name
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  // Truncate message preview
  const truncateMessage = (message: string | null, length = 30) => {
    if (!message) return '';
    return message.length > length ? message.substring(0, length) + '...' : message;
  };

  // Function to mark messages as read
  const markMessagesAsRead = async (friendId: string) => {
    if (!session?.user) return;
    
    try {
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('receiver_id', session.user.id)
        .eq('sender_id', friendId)
        .eq('read', false);
        
      // Update the local state to immediately remove the unread count
      setFriends(prevFriends => 
        prevFriends.map(friend => 
          friend.id === friendId ? { ...friend, unread_count: 0 } : friend
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-medium flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Direct Messages
        </h2>
      </div>

      {loading && friends.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Loading...
          </div>
        </div>
      ) : error ? (
        <div className="p-4 text-red-400 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={fetchFriends}
            className="ml-2 bg-gray-700 p-1 rounded hover:bg-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      ) : friends.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <User className="h-10 w-10 mx-auto text-gray-500 mb-2" />
            <p className="text-gray-400">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">Add friends to start messaging</p>
            <button 
              onClick={() => navigate('/dashboard/friends')}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
            >
              View Friends
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {friends.map(friend => (
            <div 
              key={friend.id}
              className={`p-3 flex items-center hover:bg-gray-700 cursor-pointer ${
                friendId === friend.id ? 'bg-gray-700' : ''
              }`}
              onClick={() => {
                markMessagesAsRead(friend.id);
                navigate(`/dashboard/dm/${friend.id}`);
              }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center uppercase text-sm">
                  {(friend.display_name || friend.username).charAt(0)}
                </div>
                {friend.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {friend.unread_count}
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="text-white font-medium truncate">
                    {friend.display_name || friend.username}
                  </span>
                  {friend.last_message_time && (
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatTime(friend.last_message_time)}
                    </span>
                  )}
                </div>
                {friend.last_message && (
                  <p className={`text-sm ${friend.unread_count > 0 ? 'text-white font-medium' : 'text-gray-400'} truncate`}>
                    {truncateMessage(friend.last_message)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}