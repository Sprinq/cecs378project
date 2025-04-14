// components/chat/MessageList.tsx
import React, { useState, useEffect, useRef } from 'react';
import { messageService } from '../../services/api';
import { onNewMessage } from '../../services/socket';
import Message from './Message';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import Loading from '../common/Loading';
import { Message as MessageType } from '../../types';

interface MessageListProps {
  channelId: string;
  currentUserId: string;
}

interface MessageGroup {
  date: string;
  messages: MessageType[];
}

const MessageList: React.FC<MessageListProps> = ({ channelId, currentUserId }) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Fetch messages when channelId changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedMessages = await messageService.getMessages(channelId);
        setMessages(fetchedMessages);
        setHasMore(fetchedMessages.length === 50); // If we got 50 messages, there might be more
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        setLoading(false);
      }
    };
    
    if (channelId) {
      fetchMessages();
    }
    
    return () => {
      // Cleanup
      setMessages([]);
    };
  }, [channelId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && !loadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMore]);
  
  // Listen for new messages
  useEffect(() => {
    const unsubscribe = onNewMessage(newMessage => {
      if (newMessage.channel === channelId) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [channelId]);
  
  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const loadMoreMessages = async () => {
      if (!hasMore || loadingMore) return;
      
      try {
        setLoadingMore(true);
        
        // Get oldest message timestamp for pagination
        const oldestMessage = messages[0];
        if (!oldestMessage) {
          setLoadingMore(false);
          return;
        }
        
        const olderMessages = await messageService.getMessages(
          channelId,
          50,
          oldestMessage.createdAt
        );
        
        if (olderMessages.length === 0) {
          setHasMore(false);
        } else {
          setMessages(prevMessages => [...olderMessages, ...prevMessages]);
          setHasMore(olderMessages.length === 50);
        }
        
        setLoadingMore(false);
      } catch (error) {
        console.error('Error loading more messages:', error);
        setLoadingMore(false);
      }
    };
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current = observer;
    
    const container = containerRef.current;
    if (container && messages.length > 0) {
      observer.observe(container.firstChild as Element);
    }
    
    return () => {
      if (container && container.firstChild) {
        observer.unobserve(container.firstChild as Element);
      }
    };
  }, [channelId, messages, hasMore, loadingMore]);
  
  // Group messages by date
  const groupMessagesByDate = (): MessageGroup[] => {
    const groups: Record<string, MessageType[]> = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.keys(groups).map(date => ({
      date,
      messages: groups[date]
    }));
  };
  
  const messageGroups = groupMessagesByDate();
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-6 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-red-500/30 shadow-lg">
          <div className="text-red-400 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-300 mb-4 font-medium">{error}</p>
          <button
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 rounded-md text-white transition-colors shadow-md"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-6 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
            <MessageSquare className="h-12 w-12 mx-auto text-indigo-400 relative z-10" />
          </div>
          <p className="text-lg text-white font-medium mb-2">No messages yet</p>
          <p className="text-gray-400">Be the first to send a message!</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="flex-1 overflow-y-auto p-4 bg-gray-900/50"
      ref={containerRef}
    >
      {loadingMore && (
        <div className="text-center py-2">
          <Loading size="small" />
        </div>
      )}
      
      {messageGroups.map(group => (
        <div key={group.date}>
          <div className="relative py-3 flex items-center my-2">
            <div className="flex-grow border-t border-gray-700/50"></div>
            <span className="flex-shrink-0 mx-4 py-1 px-3 text-xs text-gray-500 bg-gray-800/60 backdrop-blur-sm rounded-full">
              {format(new Date(group.date), 'MMMM d, yyyy')}
            </span>
            <div className="flex-grow border-t border-gray-700/50"></div>
          </div>
          
          {group.messages.map(message => (
            <Message
              key={message._id}
              message={message}
              isCurrentUser={typeof message.sender === 'string' 
                ? message.sender === currentUserId 
                : message.sender._id === currentUserId}
            />
          ))}
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;