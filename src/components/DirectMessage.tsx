import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Send, AlertCircle, RefreshCw, ArrowLeft, Lock, Edit, Trash, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { encryptMessage, decryptMessage } from '../services/serverEncryptionService';

interface Message {
  id: string;
  sender_id: string;
  encrypted_content: string;
  iv: string;
  created_at: string;
  updated_at?: string;
  sender_username: string;
  sender_display_name: string | null;
  is_encrypted: boolean;
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
  const conversationId = session?.user ? 
    [session.user.id, friendId].sort().join('-') : null;

  // Message editing states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

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
    if (!friendId || !session?.user || !conversationId) return;
    
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
          updated_at,
          is_encrypted,
          encryption_version,
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
        // Transform data to include sender info and decrypt messages
        const formattedMessages = await Promise.all(data.map(async (message) => {
          let displayContent = message.encrypted_content;
          
          // If the message is encrypted, try to decrypt it
          if (message.is_encrypted) {
            try {
              // Use the conversationId as the entity ID for encryption/decryption
              displayContent = await decryptMessage(
                conversationId,
                message.encrypted_content,
                message.iv
              );
            } catch (decryptError) {
              console.error('Decryption error:', decryptError);
              displayContent = `🔒 [Encrypted message - cannot decrypt]`;
            }
          }
          
          return {
            id: message.id,
            sender_id: message.sender_id,
            encrypted_content: displayContent,
            iv: message.iv,
            created_at: message.created_at,
            updated_at: message.updated_at,
            sender_username: message.sender?.username || 'Unknown User',
            sender_display_name: message.sender?.display_name || null,
            is_encrypted: message.is_encrypted || false
          };
        }));
        
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
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `or(and(sender_id=eq.${session.user.id},receiver_id=eq.${friendId}),and(sender_id=eq.${friendId},receiver_id=eq.${session.user.id}))`
      }, () => {
        fetchMessages();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
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
  }, [friendId, session, conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !friendId || !session?.user || !conversationId) return;
  
    setIsSending(true);
    setSendError(null);
  
    try {
      let encryptedContent = newMessage;
      let ivString = 'unencrypted';
      let isEncrypted = false;
      
      // Always encrypt direct messages
      const encryptResult = await encryptMessage(conversationId, newMessage);
      encryptedContent = encryptResult.encrypted;
      ivString = encryptResult.iv;
      isEncrypted = ivString !== 'unencrypted';
  
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: session.user.id,
          receiver_id: friendId,
          encrypted_content: encryptedContent,
          iv: ivString,
          is_encrypted: isEncrypted,
          encryption_version: 2 // Using server-side encryption
        })
        .select()
        .single();
  
      if (error) {
        console.error('Error sending message:', error);
        setSendError(`Failed to send message: ${error.message}`);
        return;
      }
      
      setNewMessage('');
      
      // Refresh messages after sending
      fetchMessages();
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      setSendError('An unexpected error occurred while sending your message');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !conversationId || !editContent.trim()) return;
    
    setEditingLoading(true);
    
    try {
      // Encrypt the edited message
      const encryptResult = await encryptMessage(conversationId, editContent);
      
      const { error } = await supabase
        .from('direct_messages')
        .update({
          encrypted_content: encryptResult.encrypted,
          iv: encryptResult.iv,
          is_encrypted: encryptResult.iv !== 'unencrypted',
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMessageId)
        .eq('sender_id', session?.user?.id); // Only allow editing own messages
        
      if (error) {
        console.error('Error editing message:', error);
        setSendError(`Failed to edit message: ${error.message}`);
        return;
      }
      
      setEditingMessageId(null);
      setEditContent('');
      
      // Refresh messages after edit
      fetchMessages();
    } catch (err) {
      console.error('Unexpected error editing message:', err);
      setSendError('An unexpected error occurred while editing your message');
    } finally {
      setEditingLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', session?.user?.id); // Only allow deleting own messages
        
      if (error) {
        console.error('Error deleting message:', error);
        setSendError(`Failed to delete message: ${error.message}`);
        return;
      }
      
      // Refresh messages after delete
      fetchMessages();
    } catch (err) {
      console.error('Unexpected error deleting message:', err);
      setSendError('An unexpected error occurred while deleting your message');
    }
  };

  // Format timestamp with date and time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    // If the message is from today, just show the time
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If the message is from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // For older messages, show the full date and time
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (friendId && session?.user) {
      const markAsRead = async () => {
        await supabase
          .from('direct_messages')
          .update({ read: true })
          .eq('receiver_id', session.user.id)
          .eq('sender_id', friendId)
          .eq('read', false);
      };
      markAsRead();
    }
   }, [friendId, session]);

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
            
            {/* Show encryption badge */}
            <div className="ml-2 flex items-center text-green-400 text-xs">
              <Lock className="h-3 w-3 mr-1" />
              <span>Encrypted</span>
            </div>
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
            <div 
              key={message.id} 
              className={`flex items-start ${
                message.sender_id === session?.user?.id ? 'justify-end' : ''
              }`}
              onMouseEnter={() => setSelectedMessageId(message.id)}
              onMouseLeave={() => setSelectedMessageId(null)}
            >
              {message.sender_id !== session?.user?.id && (
                <div className="w-8 h-8 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-xs">
                  {(message.sender_display_name || message.sender_username).charAt(0)}
                  {message.updated_at && message.updated_at !== message.created_at && (
                    <span className="ml-2 text-xs text-gray-400 italic">
                      (edited)
                    </span>
                  )}
                </div>
              )}
              
              <div className={`max-w-3/4 ${
                message.sender_id === session?.user?.id 
                  ? 'bg-indigo-600' 
                  : 'bg-gray-700'
              } px-3 py-2 rounded-md`}>
                {message.sender_id !== session?.user?.id && (
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-white text-sm mr-2">
                      {message.sender_display_name || message.sender_username}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.created_at)}
                    </span>
                    {message.is_encrypted && (
                      <span className="ml-2 text-xs text-green-300 flex items-center">
                        <Lock className="h-3 w-3 mr-1" />
                      </span>
                    )}
                    {message.updated_at && message.updated_at !== message.created_at && (
                      <span className="ml-2 text-xs text-gray-300 italic">
                        (edited)
                      </span>
                    )}
                  </div>
                )}
                
                {editingMessageId === message.id ? (
                  <div className="mt-1">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-md px-3 py-1 text-sm"
                      autoFocus
                    />
                    <div className="mt-1 flex items-center space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={editingLoading}
                        className="text-green-400 hover:text-green-300 text-xs"
                      >
                        {editingLoading ? 'Saving...' : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessageId(null);
                          setEditContent('');
                        }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-100">{message.encrypted_content}</p>
                )}
                
                {message.sender_id === session?.user?.id && (
                  <div className="text-right">
                    <span className="text-xs text-gray-300">
                      {formatTime(message.created_at)}
                    </span>
                    {message.is_encrypted && (
                      <span className="ml-2 text-xs text-green-300 flex inline-flex items-center">
                        <Lock className="h-3 w-3 ml-1" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Message actions */}
              {message.sender_id === session?.user?.id && selectedMessageId === message.id && editingMessageId !== message.id && (
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleEditMessage(message.id, message.encrypted_content)}
                    className="p-1 text-gray-400 hover:text-white"
                    title="Edit message"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="p-1 text-gray-400 hover:text-red-400"
                    title="Delete message"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              )}
              
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