// components/chat/ChannelList.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Hash, Plus, ChevronDown, Settings, Volume2 } from 'lucide-react';

const ChannelList = ({ 
  server, 
  activeChannelId, 
  setShowCreateChannelModal, 
  mobileMenuOpen,
  user
}) => {
  // Check if the current user is the server owner
  const isOwner = server.owner === user._id;

  return (
    <div className={`bg-gray-800 w-64 flex-shrink-0 ${
      mobileMenuOpen ? 'block absolute inset-y-0 left-16 z-40' : 'hidden md:flex'
    } flex-col`}>
      <div className="px-4 py-3 h-14 flex items-center justify-between border-b border-gray-700">
        <h2 className="font-semibold text-white overflow-ellipsis overflow-hidden whitespace-nowrap">
          {server.name}
        </h2>
        <button className="text-gray-400 hover:text-white">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 pt-3">
          <div className="text-xs font-semibold text-gray-400 px-2 mb-1 flex justify-between items-center">
            <span className="uppercase">Text Channels</span>
            {isOwner && (
              <button 
                onClick={() => setShowCreateChannelModal(true)}
                className="text-gray-400 hover:text-white"
                title="Create Channel"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {server.channels.filter(channel => channel.type === 'text').map(channel => (
            <Link
              key={channel._id}
              to={`/server/${server._id}/channel/${channel._id}`}
              className={`flex items-center px-2 py-1 rounded w-full mb-1 ${
                activeChannelId === channel._id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Hash className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="truncate">{channel.name}</span>
            </Link>
          ))}
          
          {server.channels.filter(channel => channel.type === 'voice').length > 0 && (
            <>
              <div className="text-xs font-semibold text-gray-400 px-2 mt-4 mb-1 uppercase">
                Voice Channels
              </div>
              
              {server.channels.filter(channel => channel.type === 'voice').map(channel => (
                <Link
                  key={channel._id}
                  to={`/server/${server._id}/channel/${channel._id}`}
                  className={`flex items-center px-2 py-1 rounded w-full mb-1 ${
                    activeChannelId === channel._id
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Volume2 className="h-4 w-4 mr-1.5 flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
      
      <div className="p-2 bg-gray-850 border-t border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mr-2">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {user.username}
            </div>
            <div className="text-xs text-green-400 truncate">
              Online
            </div>
          </div>
          <div className="flex">
            <button className="text-gray-400 hover:text-white ml-1">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelList;