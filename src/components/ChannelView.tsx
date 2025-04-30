import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import {
  Send,
  AlertCircle,
  RefreshCw,
  Lock,
  MoreVertical,
  Edit,
  Trash,
  X,
  Check,
  ArrowLeft
} from "lucide-react";
import {
  encryptMessage,
  decryptMessage,
} from "../services/serverEncryptionService";

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

export default function ChannelView() {
  const { channelId, serverId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { session } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [channelName, setChannelName] = useState("");
  const [channelDetails, setChannelDetails] = useState<{
    id: string;
    server_id: string;
    encryption_enabled: boolean;
  } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Message editing states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editingLoading, setEditingLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchMessages = async () => {
    if (!channelId) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching messages for channel:", channelId);

      // First, validate that this channel belongs to the current server
      const { data: channelData, error: channelError } = await supabase
        .from("channels")
        .select("id, server_id, name, encryption_enabled")
        .eq("id", channelId)
        .single();

      if (channelError) {
        console.error("Error fetching channel:", channelError);
        setError(`Channel not found or access denied`);
        return;
      }

      // Store channel details for validation
      setChannelDetails(channelData);
      setChannelName(channelData.name);

      // Check if user has restricted history access
      const { data: memberData, error: memberError } = await supabase
        .from("server_members")
        .select("hide_history, joined_at")
        .eq("server_id", channelData.server_id)
        .eq("user_id", session?.user?.id)
        .single();

      if (memberError) {
        console.error("Error checking member permissions:", memberError);
      }

      let messageQuery = supabase
        .from("messages")
        .select(
          `
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
          ),
          channel:channels!messages_channel_id_fkey (
            server_id
          )
        `
        )
        .eq("channel_id", channelId)
        .order("created_at");

      // If user has hide_history flag, filter the message history
      if (memberData?.hide_history && memberData.joined_at) {
        messageQuery = messageQuery.gte("created_at", memberData.joined_at);
        console.log("Hiding message history before:", memberData.joined_at);
      }

      const { data, error } = await messageQuery;

      if (error) {
        console.error("Error fetching messages:", error);
        setError(`Failed to load messages: ${error.message}`);
        return;
      }

      console.log("Received message data:", data);

      if (data) {
        // Transform data to include sender info
        const formattedMessages = await Promise.all(
          data.map(async (message) => {
            console.log("Processing message:", message);

            let displayContent = message.encrypted_content;

            // Try to decrypt if message is flagged as encrypted
            if (message.is_encrypted) {
              try {
                displayContent = await decryptMessage(
                  channelId,
                  message.encrypted_content,
                  message.iv
                );
              } catch (decryptError) {
                console.error("Decryption error:", decryptError);
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
              sender_username: message.sender?.username || "Unknown User",
              sender_display_name: message.sender?.display_name || null,
              is_encrypted: message.is_encrypted || false,
            };
          })
        );

        console.log("Formatted messages:", formattedMessages);
        setMessages(formattedMessages);
        
        // Scroll to bottom after loading messages
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("Unexpected error fetching messages:", err);
      setError("An unexpected error occurred while loading messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!channelId) return;

    // Reset messages when changing channels
    setMessages([]);
    setError(null);

    // Fetch channel info and messages
    fetchMessages();

    // Mark channel as read
    if (session?.user) {
      try {
        supabase
          .from('channel_read_status')
          .upsert({
            user_id: session.user.id,
            channel_id: channelId,
            last_read_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error marking channel as read:', error);
      }
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("Received realtime message:", payload);
          fetchMessages();
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("Message updated:", payload);
          fetchMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("Message deleted:", payload);
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Unsubscribing from channel");
      channel.unsubscribe();
    };
  }, [channelId, serverId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId || !session?.user) return;

    // Validate that we have channel details
    if (!channelDetails) {
      setSendError("Cannot send message: channel information is missing");
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      console.log("Sending message to channel:", channelId);

      let encryptedContent = newMessage;
      let ivString = "unencrypted";
      let isEncrypted = false;

      // Only encrypt if the channel has encryption enabled
      if (channelDetails.encryption_enabled) {
        // Encrypt the message content using server-side encryption
        const encryptResult = await encryptMessage(channelId, newMessage);
        encryptedContent = encryptResult.encrypted;
        ivString = encryptResult.iv;
        isEncrypted = ivString !== "unencrypted";
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          sender_id: session.user.id,
          encrypted_content: encryptedContent,
          iv: ivString,
          is_encrypted: isEncrypted,
          encryption_version: 2, // Mark as using the new server-side encryption
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        setSendError(`Failed to send message: ${error.message}`);
        return;
      }

      console.log("Message sent successfully:", data);

      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Unexpected error sending message:", err);
      setSendError("An unexpected error occurred while sending your message");
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !channelId || !editContent.trim()) return;

    setEditingLoading(true);

    try {
      let encryptedContent = editContent;
      let ivString = "unencrypted";
      let isEncrypted = false;

      // Only encrypt if the channel has encryption enabled
      if (channelDetails?.encryption_enabled) {
        const encryptResult = await encryptMessage(channelId, editContent);
        encryptedContent = encryptResult.encrypted;
        ivString = encryptResult.iv;
        isEncrypted = ivString !== "unencrypted";
      }

      const { error } = await supabase
        .from("messages")
        .update({
          encrypted_content: encryptedContent,
          iv: ivString,
          is_encrypted: isEncrypted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMessageId)
        .eq("sender_id", session?.user?.id); // Only allow editing own messages

      if (error) {
        console.error("Error editing message:", error);
        setSendError(`Failed to edit message: ${error.message}`);
        return;
      }

      setEditingMessageId(null);
      setEditContent("");

      // Refresh messages after edit
      fetchMessages();
    } catch (err) {
      console.error("Unexpected error editing message:", err);
      setSendError("An unexpected error occurred while editing your message");
    } finally {
      setEditingLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", session?.user?.id); // Only allow deleting own messages

      if (error) {
        console.error("Error deleting message:", error);
        setSendError(`Failed to delete message: ${error.message}`);
        return;
      }

      // Refresh messages after delete
      fetchMessages();
    } catch (err) {
      console.error("Unexpected error deleting message:", err);
      setSendError("An unexpected error occurred while deleting your message");
    }
  };

  // Format timestamp with date and time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    // If the message is from today, just show the time
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    
    // If the message is from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    
    // For older messages, show the full date and time
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    }) + ' at ' + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400">
              No messages yet. Start the conversation!
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start group"
              onMouseEnter={() => setSelectedMessageId(message.id)}
              onMouseLeave={() => setSelectedMessageId(null)}
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 mr-3 flex items-center justify-center uppercase text-xs">
                {(
                  message.sender_display_name || message.sender_username
                ).charAt(0)}
              </div>
              <div className="flex-1 break-words">
                <div className="flex items-baseline flex-wrap">
                  <span className="font-medium text-white mr-2">
                    {message.sender_display_name || message.sender_username}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(message.created_at)}
                  </span>
                  {message.is_encrypted && (
                    <span className="ml-2 text-xs text-green-400 flex items-center">
                      <Lock className="h-3 w-3 mr-1" />
                      Encrypted
                    </span>
                  )}
                  {message.updated_at &&
                    message.updated_at !== message.created_at && (
                      <span className="ml-2 text-xs text-gray-400 italic">
                        (edited)
                      </span>
                    )}
                </div>

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
                        {editingLoading ? (
                          "Saving..."
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessageId(null);
                          setEditContent("");
                        }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 mt-1 break-words">
                    {message.encrypted_content}
                  </p>
                )}
              </div>

              {/* Message actions */}
              {message.sender_id === session?.user?.id &&
                selectedMessageId === message.id &&
                editingMessageId !== message.id && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        handleEditMessage(message.id, message.encrypted_content)
                      }
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
            placeholder={`Message #${channelName}${
              channelDetails?.encryption_enabled ? " (encrypted)" : ""
            }`}
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