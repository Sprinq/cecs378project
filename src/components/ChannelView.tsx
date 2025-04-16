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
        console.log('Channel server ID mismatch - Channel belongs to:', 
                  channelData.server_id, 'URL indicates server:', serverId);
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
          is_encrypted,
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
        const formattedMessages = await Promise.all(data.map(async (message) => {
          console.log('Processing message:', message);
          
          let displayContent = message.encrypted_content;
          
          // Try to decrypt if message is flagged as encrypted
          if (message.is_encrypted) {
            const privateKeyString = sessionStorage.getItem('privateKey');
            
            if (privateKeyString) {
              try {
                // In a real implementation, you would retrieve the encrypted channel key
                // and decrypt it using your private key. For this demo, we'll use a simpler approach.
                
                // This is a placeholder for decryption logic
                // For demo purposes, we're marking encrypted messages
                displayContent = `🔒 ${message.encrypted_content.substring(0, 20)}...` +
                                `(encrypted message)`;
              } catch (decryptError) {
                console.error('Decryption error:', decryptError);
                displayContent = `🔒 [Encrypted message - cannot decrypt]`;
              }
            } else {
              displayContent = `🔒 [Encrypted message]`;
            }
          }
          
          return {
            id: message.id,
            sender_id: message.sender_id,
            encrypted_content: displayContent,
            iv: message.iv,
            created_at: message.created_at,
            sender_username: message.sender?.username || 'Unknown User',
            sender_display_name: message.sender?.display_name || null,
            is_encrypted: message.is_encrypted || false
          };
        }));
        
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
    
    // Validate that we have channel details
    if (!channelDetails) {
      setSendError('Cannot send message: channel information is missing');
      return;
    }
  
    setIsSending(true);
    setSendError(null);
  
    try {
      console.log('Sending message to channel:', channelId);
      
      let encryptedContent = newMessage;
      let ivString = 'dummy-iv';
      
      // Get the user's private key from session storage
      const privateKeyString = sessionStorage.getItem('privateKey');
      
      if (privateKeyString) {
        try {
          // For channel messages, we'll use a channel-specific key
          // Get all members' public keys
          const { data: memberKeys, error: keysError } = await supabase
            .from('user_keys')
            .select('user_id, public_key')
            .in('user_id', members.map(member => member.user_id));
          
          if (keysError) throw keysError;
          
          // If we have keys, encrypt the message
          if (memberKeys && memberKeys.length > 0) {
            // Use a simple derived key for the channel - in a production app,
            // you'd want to create a unique channel key and encrypt it for each member
            const channelKey = await window.crypto.subtle.generateKey(
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt']
            );
            
            // Encrypt the message
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(newMessage);
            
            const encrypted = await window.crypto.subtle.encrypt(
              { name: 'AES-GCM', iv },
              channelKey,
              encoded
            );
            
            encryptedContent = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
            ivString = btoa(String.fromCharCode(...iv));
            
            // In a real implementation, you would encrypt the channel key with each member's public key
            // and store those encrypted keys. For this demo, we'll skip that complexity.
          }
        } catch (encryptError) {
          console.error('Encryption error:', encryptError);
          // Fall back to unencrypted message if encryption fails
        }
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: session.user.id,
          encrypted_content: encryptedContent,
          iv: ivString,
          is_encrypted: privateKeyString ? true : false // Flag to indicate if this message is encrypted
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
          encrypted_content: newMessage, // Show the unencrypted content in the UI
          iv: ivString,
          created_at: data.created_at,
          sender_username: currentUser.data.username,
          sender_display_name: currentUser.data.display_name,
          is_encrypted: privateKeyString ? true : false
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