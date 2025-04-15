import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Send, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender_id: string;
  encrypted_content: string;
  iv: string;
  created_at: string;
  sender_username: string;
  sender_display_name: string | null;
}

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
}

export default function DirectMessage() {
  const { friendId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { session } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [friend, setFriend] = useState<Friend | null>(null);
  const navigate = useNavigate();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch friend's details
  const fetchFriendDetails = async () => {
    if (!friendId || !session?.user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('id', friendId)
        .single();

      if (error) throw error;

      setFriend(data);
    } catch (err) {
      console.error('Error fetching friend details:', err);
      setError('Failed to load friend information');
    }
  };

  // Verify friendship
  const verifyFriendship = async () => {
    if (!friendId || !session?.user) return false;

    try {
      const { data, error } = await supabase
        .from('friends')
        .select('status')
        .or(`and(user_id1.eq.${session.user.id},user_id2.eq.${friendId}),and(user_id1.eq.${friendId},user_id2.eq.${session.user.id})`)
        .eq('status', 'accepted')
        .single();

      if (error || !data) {
        setError('You are not friends with this user');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error verifying friendship:', err);
      setError('Failed to verify friendship status');
      return false;
    }
  };

  const fetchMessages = async () => {
    if (!friendId || !session?.user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const isValidFriend = await verifyFriendship();
      if (!isValidFriend) {
        setLoading(false);
        return;
      }

      // Get the direct messages between the two users
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          sender_id,
          encrypted_content,
          iv,
          created_at,
          sender:users!sender_id (
            username,
            display_name
          )
        `)
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${session.user.id})`)
        .order('created_at');
      
      if (error) {
        console.error('Error fetching messages:', error);
        setError(`Failed to load messages: ${error.message}`);
        return;
      }
      
      if (data) {
        // Transform data to include sender info
        const formattedMessages = data.map(message => {
          return {
            id: message.id,
            sender_id: message.sender_id,
            encrypted_content: message.encrypted_content,
            iv: message.iv,
            created_at: message.created_at,
            sender_username: message.sender?.username || 'Unknown User',
            sender_display_name: message.sender?.display_name || null
          };
        });
        
        setMessages(formattedMessages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Unexpected error fetching messages:', err);
      setError('An unexpected error occurred while loading messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!friendId || !session?.user) return;

    fetchFriendDetails();
    fetchMessages();

    // Subscribe to new messages
    const directMessageChannel = supabase
      .channel(`direct_messages:${session.user.id}:${friendId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `or(and(sender_id=eq.${session.user.id},receiver_id=eq.${friendId}),and(sender_id=eq.${friendId},receiver_id=eq.${session.user.id}))`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      directMessageChannel.unsubscribe();
    };
  }, [friendId, session]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !friendId || !session?.user) return;

    setIsSending(true);
    setSendError(null);

    try {
      // For now, we're not implementing encryption - just storing the plain text
      // In a real app, you would encrypt this with the shared keys
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: session.user.id,
          receiver_id: friendId,
          encrypted_content: newMessage, // Not actually encrypted in this demo
          iv: 'dummy-iv'                 // Not actually used in this demo
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setSendError(`Failed to send message: ${error.message}`);
        return;
      }
      
      // Manually add the message to the list
      const currentUser = await supabase
        .from('users')
        .select('username, display_name')
        .eq('id', session.user.id)
        .single();
        
      if (currentUser.data) {
        const newMessageObj: Message = {
          id: data.id,
          sender_id: session.user.id,
          encrypted_content: newMessage,
          iv: 'dummy-iv',
          created_at: data.created_at,
          sender_username: currentUser.data.username,
          sender_display_name: currentUser.data.display_name
        };
        
        setMessages(prev => [...prev, newMessageObj]);
        setTimeout(scrollToBottom, 100);
      }
      
      setNewMessage('');
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      setSendError('An unexpected error occurred while sending your message');
    } finally {
      setIsSending(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center">
        <button 
          onClick={() => navigate('/dashboard/friends')}
          className="mr-2 text-gray-400 hover:text-white md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {friend ? (
          <>
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center uppercase text-sm mr-2">
              {(friend.display_name || friend.username)?.charAt(0)}
            </div>
            <h3 className="font-medium text-white">{friend.display_name || friend.username}</h3>
          </>
        ) : (
          <div className="h-8 w-32 bg-gray-700 animate-pulse rounded-md"></div>
        )}
        
        {error && (
          <div className="ml-auto flex items-center text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="mr-2">{error}</span>
            <button 
              onClick={fetchMessages}
              className="bg-gray-700 p-1 rounded hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400">No messages yet. Start the conversation!</div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex items-start ${
              message.sender_id === session?.user?.id ? 'justify-end' : ''
            }`}>
              {message.sender_id !== session?.user?.id && (
                <div className="w-8 h-8 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-xs">
                  {(message.sender_display_name || message.sender_username).charAt(0)}
                </div>
              )}
              <div className={`max-w-3/4 ${
                message.sender_id === session?.user?.id 
                  ? 'bg-indigo-600 rounded-tl-xl rounded-tr-sm rounded-bl-xl' 
                  : 'bg-gray-700 rounded-tl-sm rounded-tr-xl rounded-br-xl'
              } px-3 py-2 rounded-md`}>
                {message.sender_id !== session?.user?.id && (
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-white text-sm mr-2">
                      {message.sender_display_name || message.sender_username}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                )}
                <p className="text-gray-100">{message.encrypted_content}</p>
                {message.sender_id === session?.user?.id && (
                  <div className="text-right">
                    <span className="text-xs text-gray-300">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                )}
              </div>
              {message.sender_id === session?.user?.id && (
                <div className="w-8 h-8 rounded-full bg-gray-700 ml-3 flex items-center justify-center uppercase text-xs invisible">
                  {/* Just for spacing */}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        {sendError && (
          <div className="mb-2 text-red-400 text-sm p-2 bg-red-500 bg-opacity-10 rounded flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {sendError}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${friend ? (friend.display_name || friend.username) : '...'}`}
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!friend || !!error}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || !friend || !!error}
            className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}