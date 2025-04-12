// components/chat/MessageList.js
import React, { useState, useEffect, useRef } from 'react';
import { messageService } from '../../services/api';
import { onNewMessage } from '../../services/socket';
import Message from './Message';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import Loading from '../common/Loading';

const MessageList = ({ channelId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  
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
      observer.observe(container.firstChild);
    }
    
    return () => {
      if (container && container.firstChild) {
        observer.unobserve(container.firstChild);
      }
    };
  }, [channelId, messages, hasMore, loadingMore]);
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
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
        <div className="text-red-500">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="flex-1 overflow-y-auto p-4 bg-gray-900"
      ref={containerRef}
    >
      {loadingMore && (
        <div className="text-center py-2">
          <Loading size="small" />
        </div>
      )}
      
      {Object.keys(messageGroups).map(date => (
        <div key={date}>
          <div className="relative py-2 flex items-center">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="flex-shrink mx-4 text-xs text-gray-500">
              {format(new Date(date), 'MMMM d, yyyy')}
            </span>
            <div className="flex-grow border-t border-gray-700"></div>
          </div>
          
          {messageGroups[date].map(message => (
            <Message
              key={message._id}
              message={message}
              isCurrentUser={message.sender._id === currentUserId}
            />
          ))}
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;