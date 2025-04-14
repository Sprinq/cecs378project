// components/chat/ChannelList.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Hash, Plus, ChevronDown, Settings, Volume2 } from 'lucide-react';
import { Server, User, Channel } from '../../types';

interface ChannelListProps { 
  server: Server;
  activeChannelId?: string;
  setShowCreateChannelModal: (show: boolean) => void;
  mobileMenuOpen: boolean;
  user: User;
}

const ChannelList: React.FC<ChannelListProps> = ({ 
  server, 
  activeChannelId, 
  setShowCreateChannelModal, 
  mobileMenuOpen,
  user
}) => {
  // Check if the current user is the server owner
  const isOwner = typeof server.owner === 'string' 
    ? server.owner === user._id 
    : (server.owner as User)._id === user._id;

  // Ensure channels are properly typed
  const getChannel = (channelItem: string | Channel): Channel => {
    if (typeof channelItem === 'string') {
      // Find the channel object in server.channels
      const foundChannel = (server.channels as Channel[])
        .find(c => typeof c !== 'string' && c._id === channelItem);
      
      if (foundChannel && typeof foundChannel !== 'string') {
        return foundChannel;
      }
      
      // If not found, return a default channel object
      return {
        _id: channelItem,
        name: 'Unknown',
        server: server._id,
        type: 'text',
        createdAt: new Date().toISOString()
      };
    }
    return channelItem as Channel;
  };

  // Get all channels as Channel objects
  const channels = server.channels.map(getChannel);

  // Filter channels by type
  const textChannels = channels.filter(channel => channel.type === 'text');
  const voiceChannels = channels.filter(channel => channel.type === 'voice');

  return (
    <div className={`bg-gray-800/90 backdrop-blur-sm w-64 flex-shrink-0 ${
      mobileMenuOpen ? 'block absolute inset-y-0 left-20 z-30' : 'hidden md:flex'
    } flex-col border-r border-gray-700/50 rounded-l-xl overflow-hidden`}>
      <div className="px-4 py-3 h-16 flex items-center justify-between border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-sm">
        <h2 className="font-semibold text-white overflow-ellipsis overflow-hidden whitespace-nowrap">
          {typeof server.name === 'string' ? server.name : 'Server'}
        </h2>
        <button className="text-gray-400 hover:text-white p-1 hover:bg-gray-700/50 rounded-md transition-colors">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-400 px-2 mb-2 flex justify-between items-center">
            <span className="uppercase">Text Channels</span>
            {isOwner && (
              <button 
                onClick={() => setShowCreateChannelModal(true)}
                className="text-gray-400 hover:text-white p-1 hover:bg-gray-700/50 rounded-md transition-colors"
                title="Create Channel"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {textChannels.map(channel => (
            <Link
              key={channel._id}
              to={`/server/${server._id}/channel/${channel._id}`}
              className={`flex items-center px-2 py-2 rounded-md w-full mb-1 transition-all duration-200 group ${
                activeChannelId === channel._id
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Hash className={`h-4 w-4 mr-2 flex-shrink-0 ${
                activeChannelId === channel._id
                  ? 'text-indigo-400'
                  : 'text-gray-500 group-hover:text-indigo-400'
              }`} />
              <span className="truncate">{channel.name}</span>
            </Link>
          ))}
          
          {voiceChannels.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-gray-400 px-2 mb-2 uppercase">
                Voice Channels
              </div>
              
              {voiceChannels.map(channel => (
                <Link
                  key={channel._id}
                  to={`/server/${server._id}/channel/${channel._id}`}
                  className={`flex items-center px-2 py-2 rounded-md w-full mb-1 transition-all duration-200 group ${
                    activeChannelId === channel._id
                      ? 'bg-gray-700/80 text-white'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Volume2 className={`h-4 w-4 mr-2 flex-shrink-0 ${
                    activeChannelId === channel._id
                      ? 'text-green-400'
                      : 'text-gray-500 group-hover:text-green-400'
                  }`} />
                  <span className="truncate">{channel.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3 bg-gray-850 border-t border-gray-700/50">
        <div className="flex items-center p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 flex items-center justify-center text-white flex-shrink-0 mr-3">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {user.username}
            </div>
            <div className="text-xs text-green-400 truncate flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              Online
            </div>
          </div>
          <button className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700/50 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelList;