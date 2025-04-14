// components/chat/UserList.tsx
import React from 'react';
import { Crown, Circle } from 'lucide-react';
import { Server, User } from '../../types';

interface UserListProps {
  server: Server;
  currentUserId: string;
}

interface MemberExtended extends User {
  isOwner?: boolean;
}

const UserList: React.FC<UserListProps> = ({ server, currentUserId }) => {
  // If there are no members, return empty div
  if (!server.members || server.members.length === 0) {
    return <div className="hidden md:block bg-gray-800/50 backdrop-blur-sm w-60 flex-shrink-0 rounded-r-xl"></div>;
  }
  
  // Convert members array to an array of User objects
  const getMemberUser = (member: string | User): MemberExtended => {
    if (typeof member === 'string') {
      return {
        _id: member,
        username: 'Unknown User',
        email: '',
        publicKey: '',
        status: 'offline',
        isOwner: member === server.owner
      };
    }
    
    const user = member as User;
    return {
      ...user,
      isOwner: user._id === server.owner
    };
  };
  
  const members = (server.members as Array<string | User>).map(getMemberUser);
  
  // Group users by status and role
  const groupUsers = () => {
    const owner = members.find(member => {
      if (typeof server.owner === 'string') {
        return member._id === server.owner;
      } else {
        return member._id === (server.owner as User)._id;
      }
    });
    
    const onlineUsers = members.filter(
      member => member.status === 'online' && !member.isOwner
    );
    
    const offlineUsers = members.filter(
      member => member.status !== 'online' && !member.isOwner
    );
    
    return {
      owner: owner ? [owner] : [],
      online: onlineUsers,
      offline: offlineUsers
    };
  };
  
  const { owner, online, offline } = groupUsers();
  const totalMembers = members.length;
  
  return (
    <div className="hidden md:block bg-gray-800/50 backdrop-blur-sm w-60 flex-shrink-0 border-l border-gray-700/50 rounded-r-xl">
      <div className="px-4 py-3 h-16 flex items-center border-b border-gray-700/50">
        <h3 className="font-semibold text-gray-300">
          Members — {totalMembers}
        </h3>
      </div>
      
      <div className="overflow-y-auto h-[calc(100vh-4rem)] p-2">
        {/* Owner Group */}
        {owner.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 px-2 py-1.5 uppercase flex items-center">
              <Crown className="h-3 w-3 text-yellow-500 mr-1.5" />
              Owner
            </div>
            
            {owner.map(member => (
              <div 
                key={member._id} 
                className={`flex items-center px-3 py-2 hover:bg-gray-700/50 rounded-md transition-colors ${
                  member._id === currentUserId ? 'bg-gray-700/30' : ''
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white mr-2">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className={`font-medium truncate ${
                      member._id === currentUserId ? 'text-indigo-400' : 'text-gray-200'
                    }`}>
                      {member.username}
                    </span>
                    <Crown className="h-3 w-3 text-yellow-500 ml-1.5" />
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
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 px-2 py-1.5 uppercase flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
              Online — {online.length}
            </div>
            
            {online.map(member => (
              <div 
                key={member._id} 
                className={`flex items-center px-3 py-2 hover:bg-gray-700/50 rounded-md transition-colors ${
                  member._id === currentUserId ? 'bg-gray-700/30' : ''
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white mr-2">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
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
            <div className="text-xs font-semibold text-gray-400 px-2 py-1.5 uppercase flex items-center">
              <div className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></div>
              Offline — {offline.length}
            </div>
            
            {offline.map(member => (
              <div 
                key={member._id} 
                className={`flex items-center px-3 py-2 hover:bg-gray-700/50 rounded-md transition-colors opacity-75 ${
                  member._id === currentUserId ? 'bg-gray-700/30' : ''
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
                  <span className="absolute bottom-0 right-1 w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-800"></span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className={`font-medium truncate text-gray-400 ${
                    member._id === currentUserId ? 'text-indigo-400/70' : ''
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