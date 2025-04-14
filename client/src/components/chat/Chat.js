// components/chat/Chat.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverService } from '../../services/api';
import { joinChannel, leaveChannel } from '../../services/socket';
import ServerList from './ServerList';
import ChannelList from './ChannelList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import CreateServerModal from './CreateServerModal';
import CreateChannelModal from './CreateChannelModal';
import { Menu, X, Hash, Settings, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';

const Chat = ({ user, onLogout }) => {
  const { serverId, channelId } = useParams();
  const navigate = useNavigate();
  
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Fetch servers on component mount
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const fetchedServers = await serverService.getServers();
        setServers(fetchedServers);
        
        // If no server is selected but we have servers, select the first one
        if (!serverId && fetchedServers.length > 0) {
          navigate(`/server/${fetchedServers[0]._id}`);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching servers:', error);
        toast.error('Failed to load servers');
        setLoading(false);
      }
    };
    
    fetchServers();
  }, [serverId, navigate]);
  
  // Handle server selection
  useEffect(() => {
    if (!serverId || !servers.length) return;
    
    const server = servers.find(s => s._id === serverId);
    setActiveServer(server);
    
    // If no channel is selected but we have channels, select the first one
    if (!channelId && server && server.channels && server.channels.length > 0) {
      navigate(`/server/${serverId}/channel/${server.channels[0]._id}`);
    }
  }, [serverId, servers, channelId, navigate]);
  
  // Handle channel selection
  useEffect(() => {
    if (!channelId || !activeServer) return;
    
    const channel = activeServer.channels.find(c => c._id === channelId);
    
    if (channel) {
      setActiveChannel(channel);
      
      // Join the channel socket room
      joinChannel(channelId);
      
      // Leave channel when unmounting or changing channels
      return () => {
        leaveChannel(channelId);
      };
    }
  }, [channelId, activeServer]);
  
  // Handle server creation
  const handleCreateServer = async (newServer) => {
    try {
      setServers([...servers, newServer]);
      navigate(`/server/${newServer._id}`);
      toast.success('Server created successfully!');
    } catch (error) {
      console.error('Error handling new server:', error);
      toast.error('Failed to process new server');
    }
  };
  
  // Handle channel creation
  const handleCreateChannel = async (newChannel) => {
    try {
      // Update the active server with the new channel
      const updatedServer = {
        ...activeServer,
        channels: [...activeServer.channels, newChannel]
      };
      
      // Update the servers list
      const updatedServers = servers.map(server => 
        server._id === activeServer._id ? updatedServer : server
      );
      
      setServers(updatedServers);
      setActiveServer(updatedServer);
      
      // Navigate to the new channel
      navigate(`/server/${activeServer._id}/channel/${newChannel._id}`);
      
      toast.success('Channel created successfully!');
    } catch (error) {
      console.error('Error handling new channel:', error);
      toast.error('Failed to process new channel');
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Mobile menu button */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button 
          className="text-gray-300 hover:text-white"
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>
      
      {/* Servers sidebar */}
      <ServerList 
        servers={servers} 
        activeServerId={serverId}
        setShowCreateServerModal={setShowCreateServerModal}
        mobileMenuOpen={mobileMenuOpen}
        onLogout={handleLogout}
      />
      
      {/* Channels sidebar */}
      {activeServer && (
        <ChannelList 
          server={activeServer}
          activeChannelId={channelId}
          setShowCreateChannelModal={setShowCreateChannelModal}
          mobileMenuOpen={mobileMenuOpen}
          user={user}
        />
      )}
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* Channel header */}
        {activeChannel && (
          <div className="h-14 flex items-center px-4 border-b border-gray-800 shadow-sm">
            <button 
              className="md:hidden text-gray-400 hover:text-white mr-2"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Hash className="h-5 w-5 text-gray-400 mr-2" />
            <div className="flex-1">
              <h3 className="text-white font-semibold">
                {activeChannel.name}
              </h3>
              <p className="text-xs text-gray-400">
                End-to-end encrypted channel
              </p>
            </div>
            <div className="flex items-center">
              <button
                className="text-gray-400 hover:text-white ml-2"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <button
                className="text-gray-400 hover:text-white ml-2"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Messages and input */}
        {activeChannel ? (
          <>
            <MessageList 
              channelId={activeChannel._id} 
              currentUserId={user._id}
            />
            <MessageInput 
              channelId={activeChannel._id} 
              username={user.username}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Hash className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Welcome to SecureChat!</h3>
              <p>Select a channel to start messaging</p>
              {servers.length === 0 && (
                <button
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
                  onClick={() => setShowCreateServerModal(true)}
                >
                  Create your first server
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* User list - only shown for medium screens and up */}
      {activeServer && (
        <UserList 
          server={activeServer}
          currentUserId={user._id}
        />
      )}
      
      {/* Create server modal */}
      <CreateServerModal
        isOpen={showCreateServerModal}
        onClose={() => setShowCreateServerModal(false)}
        onCreate={handleCreateServer}
      />
      
      {/* Create channel modal */}
      {activeServer && (
        <CreateChannelModal
          isOpen={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          serverId={activeServer._id}
          onCreate={handleCreateChannel}
        />
      )}
    </div>
  );
};

export default Chat;