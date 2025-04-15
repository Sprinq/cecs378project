import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Send, AlertCircle, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  encrypted_content: string;
  iv: string;
  created_at: string;
  sender_username: string;
  sender_display_name: string | null;
}

export default function ChannelView() {
  const { channelId, serverId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { session } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [channelName, setChannelName] = useState('');
  const [channelDetails, setChannelDetails] = useState<{ id: string, server_id: string } | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!channelId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching messages for channel:', channelId);
      
      // First, validate that this channel belongs to the current server
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('id, server_id, name')
        .eq('id', channelId)
        .single();
        
      if (channelError) {
        console.error('Error fetching channel:', channelError);
        setError(`Channel not found or access denied`);
        return;
      }
      
      // Store channel details for validation
      setChannelDetails(channelData);
      setChannelName(channelData.name);
      
      // Check if channel belongs to the correct server
      if (serverId && channelData.server_id !== serverId) {
        console.error('Channel does not belong to the specified server');
        setError(`This channel doesn't belong to the current server`);
        return;
      }
      
      // Now fetch messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, 
          sender_id, 
          encrypted_content,
          iv, 
          created_at,
          sender:users!sender_id (
            username,
            display_name
          ),
          channel:channels!messages_channel_id_fkey (
            server_id
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at');
      
      if (error) {
        console.error('Error fetching messages:', error);
        setError(`Failed to load messages: ${error.message}`);
        return;
      }
      
      console.log('Received message data:', data);
      
      if (data) {
        // Transform data to include sender info
        const formattedMessages = data.map(message => {
          console.log('Processing message:', message);
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
        
        console.log('Formatted messages:', formattedMessages);
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
    if (!channelId) return;

    // Reset messages when changing channels
    setMessages([]);
    
    // Fetch channel info and messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        console.log('Received realtime message:', payload);
        fetchMessages();
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from channel');
      channel.unsubscribe();
    };
  }, [channelId, serverId]); // Also depend on serverId

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId || !session?.user) return;
    
    // Validate that we have channel details and it belongs to the current server
    if (!channelDetails) {
      setSendError('Cannot send message: channel information is missing');
      return;
    }
    
    if (serverId && channelDetails.server_id !== serverId) {
      setSendError('Cannot send message: channel doesn\'t belong to this server');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      console.log('Sending message to channel:', channelId);
      
      // For now, we're not implementing encryption - just storing the plain text
      // In a real app, you would encrypt this with the shared keys
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: session.user.id,
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
      
      console.log('Message sent successfully:', data);
      
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
      {/* Channel header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center">
        <div className="bg-gray-700 w-6 h-6 rounded-md flex items-center justify-center mr-2">
          <span className="text-gray-300">#</span>
        </div>
        <h3 className="font-medium text-white">{channelName}</h3>
        
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
            <div key={message.id} className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-xs">
                {(message.sender_display_name || message.sender_username).charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline">
                  <span className="font-medium text-white mr-2">
                    {message.sender_display_name || message.sender_username}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-gray-300 mt-1">{message.encrypted_content}</p>
              </div>
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
            placeholder={`Message #${channelName}`}
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
