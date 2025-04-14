// components/chat/Chat.tsx
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
import { Menu, X, Hash, Settings, LogOut, Plus, Lock as LockIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { User, Server, Channel } from '../../types';
import './Chat.css';

interface ChatProps {
  user: User | null;
  onLogout: () => Promise<void>;
}

const Chat: React.FC<ChatProps> = ({ user, onLogout }) => {
  const { serverId, channelId } = useParams<{ serverId?: string, channelId?: string }>();
  const navigate = useNavigate();
  
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState<boolean>(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
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
    if (server) {
      setActiveServer(server);
      
      // If no channel is selected but we have channels, select the first one
      if (!channelId && server.channels && server.channels.length > 0) {
        const firstChannelId = typeof server.channels[0] === 'string' 
          ? server.channels[0] 
          : (server.channels[0] as Channel)._id;
        navigate(`/server/${serverId}/channel/${firstChannelId}`);
      }
    }
  }, [serverId, servers, channelId, navigate]);
  
  // Handle channel selection
  useEffect(() => {
    if (!channelId || !activeServer) return;
    
    const findChannel = (channelItem: Channel | string): Channel | undefined => {
      if (typeof channelItem === 'string') {
        // Find the full channel object in the server's channels
        return (activeServer.channels as Channel[]).find(c => c._id === channelItem);
      }
      return channelItem as Channel;
    };
    
    const channels = activeServer.channels.map(findChannel).filter(Boolean) as Channel[];
    const channel = channels.find(c => c._id === channelId);
    
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
  const handleCreateServer = async (newServer: Server) => {
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
  const handleCreateChannel = async (newChannel: Channel) => {
    try {
      if (!activeServer) return;
      
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      {/* Mobile menu button */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button 
          className="text-gray-300 hover:text-white bg-gray-800 bg-opacity-60 backdrop-blur-sm p-2 rounded-md"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
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
      {activeServer && user && (
        <ChannelList 
          server={activeServer}
          activeChannelId={channelId}
          setShowCreateChannelModal={setShowCreateChannelModal}
          mobileMenuOpen={mobileMenuOpen}
          user={user}
        />
      )}
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-gray-900 bg-opacity-70 backdrop-blur-sm rounded-tl-xl ml-0 md:ml-4 relative overflow-hidden">
        {/* Channel header */}
        {activeChannel ? (
          <div className="h-16 flex items-center px-4 border-b border-gray-800/70 shadow-sm bg-gray-800/50 backdrop-blur-sm">
            <button 
              className="md:hidden text-gray-400 hover:text-white mr-2 bg-gray-700/60 p-1 rounded"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Hash className="h-5 w-5 text-gray-400 mr-2" />
            <div className="flex-1">
              <h3 className="text-white font-semibold">
                {activeChannel.name}
              </h3>
              <p className="text-xs text-gray-400 flex items-center">
                <LockIcon className="h-3 w-3 mr-1 text-green-400" />
                End-to-end encrypted channel
              </p>
            </div>
            <div className="flex items-center">
              <button
                className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700/50"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
              <button
                className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700/50 ml-1"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-16 flex items-center px-4 border-b border-gray-800/70 shadow-sm bg-gray-800/50 backdrop-blur-sm">
            <button 
              className="md:hidden text-gray-400 hover:text-white mr-2 bg-gray-700/60 p-1 rounded"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h3 className="text-white font-semibold">
                SecureChat
              </h3>
              <p className="text-xs text-gray-400 flex items-center">
                <LockIcon className="h-3 w-3 mr-1 text-green-400" />
                End-to-end encrypted messaging
              </p>
            </div>
            <div className="flex items-center">
              <button
                className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700/50"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Messages and input */}
        {activeChannel && user ? (
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
            <div className="text-center p-6 max-w-md mx-auto bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
                <Hash className="h-16 w-16 mx-auto relative z-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Welcome to SecureChat!</h3>
              <p className="text-gray-300 mb-6">Select a channel to start messaging or create a new server to begin.</p>
              {servers.length === 0 && (
                <button
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-md text-white flex items-center justify-center mx-auto shadow-lg hover:shadow-indigo-500/20 transition-all duration-200"
                  onClick={() => setShowCreateServerModal(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create your first server
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* User list - only shown for medium screens and up */}
      {activeServer && user && (
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