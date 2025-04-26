import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Hash,
  Users,
  Settings,
  Link as LinkIcon,
  Trash,
  MoreVertical,
} from "lucide-react";
import ChannelView from "./ChannelView";
import ServerInvite from "./ServerInvite";
import DeleteServerModal from "./DeleteServerModal";
import { useAuthStore } from "../stores/authStore";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Hash, Users, Settings, Link as LinkIcon, Trash, MoreVertical, UserX, Plus } from 'lucide-react';
import ChannelView from './ChannelView';
import ServerInvite from './ServerInvite';
import DeleteServerModal from './DeleteServerModal';
import KickMemberModal from './KickMemberModal';
import TemporaryAccessBanner from './TemporaryAccessBanner';
import ManageChannels from './ManageChannels';
import { useAuthStore } from '../stores/authStore';

interface Server {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
}

interface ServerMember {
  user_id: string;
  username: string;
  display_name: string | null;
  role: string;
}

export default function ServerView() {
  const { serverId, channelId } = useParams();
  const [server, setServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    channelId || null
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [userRole, setUserRole] = useState<string>("member");
  const [userRole, setUserRole] = useState<string>('member');
  const [temporaryAccess, setTemporaryAccess] = useState<boolean>(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [memberToKick, setMemberToKick] = useState<ServerMember | null>(null);
  const [showManageChannels, setShowManageChannels] = useState(false);
  const { session } = useAuthStore();
  const navigate = useNavigate();

  // Debug logging to verify user role and session
  useEffect(() => {
    if (session?.user) {
      console.log("Current user ID:", session.user.id);
    }
  }, [session]);

  useEffect(() => {
    if (!serverId) return;

    const fetchServerData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch server details
        const { data: serverData, error: serverError } = await supabase
          .from("servers")
          .select("*")
          .eq("id", serverId)
          .single();
    try {
      // Fetch server details
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single();

        if (serverError) throw serverError;
        setServer(serverData);

        // Log the server owner ID for debugging
        console.log("Server owner ID:", serverData.owner_id);

        // If the current user is the server owner, set their role immediately
        if (session?.user && serverData.owner_id === session.user.id) {
          console.log("User is the server owner!");
          setUserRole("owner");
        }
      if (serverError) throw serverError;
      setServer(serverData);
      
      // Log the server owner ID for debugging
      console.log("Server owner ID:", serverData.owner_id);
      
      // If the current user is the server owner, set their role immediately
      if (session?.user && serverData.owner_id === session.user.id) {
        console.log("User is the server owner!");
        setUserRole('owner');
      }

        // Fetch channels
        const { data: channelsData, error: channelsError } = await supabase
          .from("channels")
          .select("*")
          .eq("server_id", serverId)
          .order("name");
      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId)
        .order('name');

        if (channelsError) throw channelsError;
        setChannels(channelsData || []);

        // If channels exist and no channel is selected, select the first one
        if (channelsData && channelsData.length > 0 && !selectedChannelId) {
          setSelectedChannelId(channelsData[0].id);
        }
      if (channelsError) throw channelsError;
      setChannels(channelsData || []);
      
      // If no channel is currently selected or the current channel doesn't exist
      if (channelsData && channelsData.length > 0) {
        // Check if the current channelId exists in this server
        const currentChannelExists = channelId ? 
          channelsData.some(channel => channel.id === channelId) : false;
        
        if (!currentChannelExists) {
          // Find the general channel or default to the first channel
          const generalChannel = channelsData.find(channel => 
            channel.name.toLowerCase() === 'general'
          );
          
          const defaultChannel = generalChannel || channelsData[0];
          setSelectedChannelId(defaultChannel.id);
          
          // Navigate to the default channel
          navigate(`/dashboard/server/${serverId}/channel/${defaultChannel.id}`, { replace: true });
        } else {
          setSelectedChannelId(channelId || null);
        }
      }

        // Fetch server members with user details
        const { data: membersData, error: membersError } = await supabase
          .from("server_members")
          .select(
            `
            user_id,
            role,
            users (
              username,
              display_name
            )
          `
          )
          .eq("server_id", serverId);
      // Fetch server members with user details
      const { data: membersData, error: membersError } = await supabase
        .from('server_members')
        .select(`
          user_id,
          role,
          temporary_access,
          access_expires_at,
          users (
            username,
            display_name
          )
        `)
        .eq('server_id', serverId);

        if (membersError) throw membersError;

        // Transform the nested data structure
        const formattedMembers =
          membersData?.map((member) => ({
            user_id: member.user_id,
            username: member.users.username,
            display_name: member.users.display_name,
            role: member.role,
          })) || [];

        setMembers(formattedMembers);
      if (membersError) throw membersError;
      
      // Transform the nested data structure
      const formattedMembers = membersData?.map(member => ({
        user_id: member.user_id,
        username: member.users.username,
        display_name: member.users.display_name,
        role: member.role,
        temporary_access: member.temporary_access,
        access_expires_at: member.access_expires_at
      })) || [];
      
      setMembers(formattedMembers);

        // Get the current user's role
        if (session?.user) {
          const currentUserMember = membersData?.find(
            (member) => member.user_id === session.user.id
          );

          if (currentUserMember) {
            console.log("Found member role:", currentUserMember.role);
            setUserRole(currentUserMember.role);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load server data"
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
      // Get the current user's role and temporary access status
      if (session?.user) {
        const currentUserMember = membersData?.find(member => 
          member.user_id === session.user.id
        );
        
        if (currentUserMember) {
          console.log("Found member role:", currentUserMember.role);
          setUserRole(currentUserMember.role);
          
          // Set temporary access information if applicable
          if (currentUserMember.temporary_access) {
            console.log("User has temporary access, expires at:", currentUserMember.access_expires_at);
            setTemporaryAccess(true);
            setAccessExpiresAt(currentUserMember.access_expires_at);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load server data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!serverId) return;

    fetchServerData();

    // Subscribe to real-time changes
    const channelsChannel = supabase
      .channel("channels_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          fetchServerData();
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel("members_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "server_members",
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          fetchServerData();
        }
      )
      .subscribe();

    return () => {
      channelsChannel.unsubscribe();
      membersChannel.unsubscribe();
    };
  }, [serverId, selectedChannelId, session]);

  // Effect to update URL when selected channel changes
  useEffect(() => {
    if (selectedChannelId && serverId) {
      navigate(`/dashboard/server/${serverId}/channel/${selectedChannelId}`, {
        replace: true,
      });
    }
  }, [selectedChannelId, serverId, navigate]);

  // Effect to sync the selected channel with the URL parameter
  useEffect(() => {
    if (channelId) {
      setSelectedChannelId(channelId);
    }
  }, [channelId]);

  useEffect(() => {
    // Log whenever user role changes
    console.log("Current user role:", userRole);
  }, [userRole]);

  const handleChannelClick = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  // Check if user is admin or owner
  const canInvite = userRole === "owner" || userRole === "admin";

  const canInvite = userRole === 'owner' || userRole === 'admin';
  const canKick = userRole === 'owner' || userRole === 'admin';
  
  // Alternative check - if server exists and current user is the owner
  const isServerOwner =
    server && session?.user && server.owner_id === session.user.id;

  // Handle clicking outside of server menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showServerMenu) {
        setShowServerMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showServerMenu]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading server data...
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error || "Server not found"}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Channels sidebar */}
      <div className="w-full lg:w-64 bg-gray-800 p-4 flex flex-col h-48 lg:h-full overflow-y-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-semibold text-xl text-white">{server.name}</h3>
            <div className="flex items-center">
              {/* Invite button */}
              {(canInvite || isServerOwner) && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 mr-1"
                  title="Invite People"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
              )}

              {/* Server settings button */}
              {isServerOwner && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowServerMenu(!showServerMenu);
                    }}
                    className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700"
                    title="Server Settings"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Server settings dropdown */}
                  {showServerMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-10">
                      {/* Delete server option */}
                      <button
                        onClick={() => {
                          setShowServerMenu(false);
                          setShowDeleteModal(true);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Server
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {server.description && (
            <p className="text-sm text-gray-400">{server.description}</p>
          )}
        </div>

        <div className="mb-4">
          <h4 className="uppercase text-xs font-semibold text-gray-400 mb-2 px-2">
            Channels
          </h4>
          <div className="space-y-1">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-center px-2 py-1 ${
                  selectedChannelId === channel.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                } rounded cursor-pointer`}
                onClick={() => handleChannelClick(channel.id)}
              >
                <Hash className="h-4 w-4 mr-2 text-gray-400" />
                <span>{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    <div className="flex flex-col h-full">
      {/* Temporary access banner - show at the top of the page */}
      {temporaryAccess && (
        <TemporaryAccessBanner expiresAt={accessExpiresAt} />
      )}
      
      <div className="flex flex-1 h-0">
        {/* Channels sidebar */}
        <div className="w-64 bg-gray-800 p-4 flex flex-col h-full">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-xl text-white">{server.name}</h3>
              <div className="flex items-center">
                {/* Invite button */}
                {(canInvite || isServerOwner) && (
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 mr-1"
                    title="Invite People"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                )}
                
                {/* Server settings button */}
                {isServerOwner && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowServerMenu(!showServerMenu);
                      }}
                      className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700"
                      title="Server Settings"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {/* Server settings dropdown */}
                    {showServerMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-10">
                        {/* Delete server option */}
                        <button 
                          onClick={() => {
                            setShowServerMenu(false);
                            setShowDeleteModal(true);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete Server
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {server.description && (
              <p className="text-sm text-gray-400">{server.description}</p>
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <h4 className="uppercase text-xs font-semibold text-gray-400">Channels</h4>
              {isServerOwner && (
                <button
                  onClick={() => setShowManageChannels(true)}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                  title="Manage Channels"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {channels.map(channel => (
                <div 
                  key={channel.id}
                  className={`flex items-center px-2 py-1 ${
                    selectedChannelId === channel.id 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-300 hover:bg-gray-700'
                  } rounded cursor-pointer`}
                  onClick={() => handleChannelClick(channel.id)}
                >
                  <Hash className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{channel.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Main content area */}
      <div className="flex-1 bg-gray-900 overflow-y-auto">
        <Routes>
          <Route path="/channel/:channelId" element={<ChannelView />} />
          <Route
            path="*"
            element={
              <div className="p-4">
                <h2 className="text-2xl font-semibold mb-4 text-white">
                  Welcome to {server.name}
                </h2>
                <p className="text-gray-400">
                  Select a channel to start chatting!
                </p>
              </div>
            }
          />
        </Routes>
      </div>
        {/* Main content area */}
        <div className="flex-1 bg-gray-900">
          <Routes>
            <Route 
              path="/channel/:channelId" 
              element={<ChannelView />} 
            />
            <Route 
              path="*" 
              element={
                <div className="p-4">
                  <h2 className="text-2xl font-semibold mb-4 text-white">Welcome to {server.name}</h2>
                  <p className="text-gray-400">
                    Select a channel to start chatting!
                  </p>
                </div>
              } 
            />
          </Routes>
        </div>

      {/* Members sidebar */}
      <div className="w-56 bg-gray-800 p-4 hidden lg:block">
        <h4 className="uppercase text-xs font-semibold text-gray-400 mb-2 flex items-center">
          <Users className="h-3 w-3 mr-1" />
          Members ({members.length})
        </h4>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center text-gray-300"
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 mr-2 flex items-center justify-center uppercase text-xs">
                {(member.display_name || member.username).charAt(0)}
              </div>
              <div>
                <div className="text-sm">
                  {member.display_name || member.username}
                </div>
                <div className="text-xs text-gray-400">{member.role}</div>
              </div>
            </div>
          ))}
        {/* Members sidebar */}
        <div className="w-56 bg-gray-800 p-4">
          <h4 className="uppercase text-xs font-semibold text-gray-400 mb-2 flex items-center">
            <Users className="h-3 w-3 mr-1" />
            Members ({members.length})
          </h4>
          <div className="space-y-2">
            {members.map(member => (
              <div 
                key={member.user_id}
                className="flex items-center justify-between text-gray-300 group"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-700 mr-2 flex items-center justify-center uppercase text-xs">
                    {(member.display_name || member.username).charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm">
                      {member.display_name || member.username}
                      {member.temporary_access && (
                        <span className="ml-2 text-xs text-yellow-400">(temp)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{member.role}</div>
                  </div>
                </div>
                
                {/* Kick button - only show for owners/admins and not for themselves or the server owner */}
                {canKick && 
                 member.user_id !== session?.user?.id && 
                 member.role !== 'owner' && (
                  <button
                    onClick={() => handleKickMember(member)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 p-1"
                    title="Kick Member"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Server invite modal */}
      {showInviteModal && server && (
        <ServerInvite
          serverId={server.id}
          serverName={server.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Delete server modal */}
      {showDeleteModal && server && (
        <DeleteServerModal
          serverId={server.id}
          serverName={server.name}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
