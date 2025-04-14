// components/chat/UserList.js
import React from 'react';
import { Crown, Circle } from 'lucide-react';

const UserList = ({ server, currentUserId }) => {
  // If there are no members, return empty div
  if (!server.members || server.members.length === 0) {
    return <div className="hidden md:block bg-gray-800 w-56 flex-shrink-0"></div>;
  }
  
  // Group users by status and role
  const groupUsers = () => {
    const owner = server.members.find(member => member._id === server.owner);
    const onlineUsers = server.members.filter(
      member => member.status === 'online' && member._id !== server.owner
    );
    const offlineUsers = server.members.filter(
      member => member.status !== 'online' && member._id !== server.owner
    );
    
    return {
      owner: owner ? [owner] : [],
      online: onlineUsers,
      offline: offlineUsers
    };
  };
  
  const { owner, online, offline } = groupUsers();
  
  return (
    <div className="hidden md:block bg-gray-800 w-56 flex-shrink-0 border-l border-gray-700">
      <div className="p-3 h-14 flex items-center border-b border-gray-700">
        <h3 className="text-md font-semibold text-gray-300">
          Members — {server.members.length}
        </h3>
      </div>
      
      <div className="overflow-y-auto h-[calc(100vh-3.5rem)]">
        {/* Owner Group */}
        {owner.length > 0 && (
          <div className="mb-2">
            <div className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase">
              Owner — {owner.length}
            </div>
            
            {owner.map(member => (
              <div 
                key={member._id} 
                className={`flex items-center px-3 py-2 hover:bg-gray-700 ${
                  member._id === currentUserId ? 'bg-gray-750' : ''
                }`}
              >
                <div className="relative">
                  {member.avatar ? (
                    <img 
                      src={member.avatar} 
                      alt={member.username}
                      className="w-8 h-8 rounded-full mr-2" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white mr-2">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className={`font-medium truncate ${
                      member._id === currentUserId ? 'text-indigo-400' : 'text-gray-200'
                    }`}>
                      {member.username}
                    </span>
                    <Crown className="h-3 w-3 text-yellow-500 ml-1" />
                    {member._id === currentUserId && (
                      <span className="ml-1 text-xs text-gray-400">(you)</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Online Group */}
        {online.length > 0 && (
          <div className="mb-2">
            <div className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase">
              Online — {online.length}
            </div>
            
            {online.map(member => (
              <div 
                key={member._id} 
                className={`flex items-center px-3 py-2 hover:bg-gray-700 ${
                  member._id === currentUserId ? 'bg-gray-750' : ''
                }`}
              >
                <div className="relative">
                  {member.avatar ? (
                    <img 
                      src={member.avatar} 
                      alt={member.username}
                      className="w-8 h-8 rounded-full mr-2" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white mr-2">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className={`font-medium truncate ${
                    member._id === currentUserId ? 'text-indigo-400' : 'text-gray-200'
                  }`}>
                    {member.username}
                    {member._id === currentUserId && (
                      <span className="ml-1 text-xs text-gray-400">(you)</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Offline Group */}
        {offline.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase">
              Offline — {offline.length}
            </div>
            
            {offline.map(member => (
              <div 
                key={member._id} 
                className={`flex items-center px-3 py-2 hover:bg-gray-700 ${
                  member._id === currentUserId ? 'bg-gray-750' : ''
                }`}
              >
                <div className="relative">
                  {member.avatar ? (
                    <img 
                      src={member.avatar} 
                      alt={member.username}
                      className="w-8 h-8 rounded-full mr-2 opacity-70" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white mr-2 opacity-70">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-2 w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-800"></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className={`font-medium truncate text-gray-400 ${
                    member._id === currentUserId ? 'text-indigo-400 opacity-70' : ''
                  }`}>
                    {member.username}
                    {member._id === currentUserId && (
                      <span className="ml-1 text-xs text-gray-500">(you)</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;