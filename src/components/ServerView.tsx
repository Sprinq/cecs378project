// src/components/ServerView.tsx

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
  UserX,
  Plus,
} from "lucide-react";
import ChannelView from "./ChannelView";
import ServerInvite from "./ServerInvite";
import DeleteServerModal from "./DeleteServerModal";
import KickMemberModal from "./KickMemberModal";
import TemporaryAccessBanner from "./TemporaryAccessBanner";
import ManageChannels from "./ManageChannels";
import { useAuthStore } from "../stores/authStore";

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
  temporary_access?: boolean;
  access_expires_at?: string | null;
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
  const [temporaryAccess, setTemporaryAccess] = useState<boolean>(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [memberToKick, setMemberToKick] = useState<ServerMember | null>(null);
  const [showManageChannels, setShowManageChannels] = useState(false);
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());
  const { session } = useAuthStore();
  const navigate = useNavigate();

  // Check for unread messages
  const checkUnreadChannels = async () => {
    if (!session?.user || !serverId || channels.length === 0) return;
    
    try {
      // Get all recent messages in all channels
      const { data: channelMessages } = await supabase
        .from('messages')
        .select('channel_id, created_at')
        .in('channel_id', channels.map(c => c.id))
        .order('created_at', { ascending: false });

      // Get user's read status
      const { data: readStatus } = await supabase
        .from('channel_read_status')
        .select('channel_id, last_read_at')
        .eq('user_id', session.user.id)
        .in('channel_id', channels.map(c => c.id));

      const unread = new Set<string>();
      
      channels.forEach(channel => {
        const lastMessage = channelMessages?.find(m => m.channel_id === channel.id);
        const lastRead = readStatus?.find(r => r.channel_id === channel.id);
        
        if (lastMessage && (!lastRead || new Date(lastMessage.created_at) > new Date(lastRead.last_read_at))) {
          unread.add(channel.id);
        }
      });
      
      // Remove the currently selected channel from unread set
      if (selectedChannelId) {
        unread.delete(selectedChannelId);
      }
      
      setUnreadChannels(unread);
    } catch (error) {
      console.error('Error checking unread channels:', error);
    }
  };

  // Update read status when clicking a channel
  const handleChannelClick = async (channelId: string) => {
    setSelectedChannelId(channelId);
    
    // Mark channel as read
    if (session?.user) {
      try {
        await supabase
          .from('channel_read_status')
          .upsert({
            user_id: session.user.id,
            channel_id: channelId,
            last_read_at: new Date().toISOString()
          });
        
        // Remove from unread set
        setUnreadChannels(prev => {
          const newSet = new Set(prev);
          newSet.delete(channelId);
          return newSet;
        });
      } catch (error) {
        console.error('Error marking channel as read:', error);
      }
    }
  };

  // Listen for kick events
  useEffect(() => {
    const handleKickEvent = (event: CustomEvent) => {
      window.dispatchEvent(new Event('refresh-server-list'));
      
      if (event.detail.serverId === serverId) {
        navigate('/dashboard', { replace: true });
      }
    };
  
    window.addEventListener('user-kicked-from-server', handleKickEvent as EventListener);
  
    return () => {
      window.removeEventListener('user-kicked-from-server', handleKickEvent as EventListener);
    };
  }, [serverId, navigate]);

  const fetchServerData = async () => {
    if (!serverId) return;

    setLoading(true);
    setError(null);

    try {
      // First check if the user is still a member of this server
      const { data: memberCheck, error: memberCheckError } = await supabase
        .from("server_members")
        .select("user_id")
        .eq("server_id", serverId)
        .eq("user_id", session?.user?.id)
        .maybeSingle();

      if (memberCheckError) {
        console.error("Error checking membership:", memberCheckError);
      }

      // If the user is not a member, redirect to dashboard
      if (!memberCheck && session?.user) {
        console.log("User is not a member of this server, redirecting...");
        
        let serverName = 'this server';
        try {
          const { data: serverInfo } = await supabase
            .from("servers")
            .select("name")
            .eq("id", serverId)
            .single();
          
          if (serverInfo) {
            serverName = serverInfo.name;
          }
        } catch (err) {
          console.error("Error fetching server name:", err);
        }
        
        const event = new CustomEvent('user-kicked-from-server', {
          detail: {
            serverId,
            serverName
          }
        });
        window.dispatchEvent(event);
        navigate("/dashboard", { replace: true });
        return;
      }

      // Fetch server details
      const { data: serverData, error: serverError } = await supabase
        .from("servers")
        .select("*")
        .eq("id", serverId)
        .single();

      if (serverError) throw serverError;
      setServer(serverData);

      if (session?.user && serverData.owner_id === session.user.id) {
        setUserRole("owner");
      }

      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("name");

      if (channelsError) throw channelsError;
      setChannels(channelsData || []);

      if (channelsData && channelsData.length > 0) {
        const currentChannelExists = channelId
          ? channelsData.some((channel) => channel.id === channelId)
          : false;

        if (!currentChannelExists) {
          const generalChannel = channelsData.find(
            (channel) => channel.name.toLowerCase() === "general"
          );

          const defaultChannel = generalChannel || channelsData[0];
          setSelectedChannelId(defaultChannel.id);

          navigate(
            `/dashboard/server/${serverId}/channel/${defaultChannel.id}`,
            { replace: true }
          );
          
          // Mark the default channel as read immediately
          if (session?.user) {
            await supabase
              .from('channel_read_status')
              .upsert({
                user_id: session.user.id,
                channel_id: defaultChannel.id,
                last_read_at: new Date().toISOString()
              });
          }
        } else {
          setSelectedChannelId(channelId || null);
        }
      }

      // Fetch server members
      const { data: membersData, error: membersError } = await supabase
        .from("server_members")
        .select(
          `
          user_id,
          role,
          temporary_access,
          access_expires_at,
          users (
            username,
            display_name
          )
        `
        )
        .eq("server_id", serverId);

      if (membersError) throw membersError;

      const formattedMembers =
        membersData?.map((member) => ({
          user_id: member.user_id,
          username: member.users.username,
          display_name: member.users.display_name,
          role: member.role,
          temporary_access: member.temporary_access,
          access_expires_at: member.access_expires_at,
        })) || [];

      setMembers(formattedMembers);

      if (session?.user) {
        const currentUserMember = membersData?.find(
          (member) => member.user_id === session.user.id
        );

        if (currentUserMember) {
          setUserRole(currentUserMember.role);

          if (currentUserMember.temporary_access) {
            setTemporaryAccess(true);
            setAccessExpiresAt(currentUserMember.access_expires_at);
          } else {
            setTemporaryAccess(false);
            setAccessExpiresAt(null);
          }
        } else {
          setTemporaryAccess(false);
          setAccessExpiresAt(null);
          setUserRole("member");
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

  useEffect(() => {
    if (!serverId) return;
  
    fetchServerData();
  
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
  
    // Real-time members subscription with all event types
    const serverMembersChannel = supabase
      .channel(`server_members_${serverId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'server_members',
          filter: `server_id=eq.${serverId}`
        },
        () => {
          console.log('Member change detected, refreshing...');
          fetchServerData();
        }
      )
      .subscribe((status) => {
        console.log('Members subscription status:', status);
      });
  
    // Add polling interval for extra reliability (every 30 seconds)
    const pollingInterval = setInterval(() => {
      fetchServerData();
    }, 30000);
  
    return () => {
      channelsChannel.unsubscribe();
      membersChannel.unsubscribe();
      serverMembersChannel.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, [serverId, session]);

  // Check for unread channels when channels list updates
  useEffect(() => {
    if (channels.length > 0) {
      checkUnreadChannels();
      
      // Set up interval to check for unread messages every 5 seconds
      const unreadInterval = setInterval(checkUnreadChannels, 5000);
      
      // Subscribe to new messages to update unread status
      const messageSubscription = supabase
        .channel('unread_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=in.(${channels.map(c => c.id).join(',')})`
          },
          () => {
            checkUnreadChannels();
          }
        )
        .subscribe();
      
      return () => {
        clearInterval(unreadInterval);
        messageSubscription.unsubscribe();
      };
    }
  }, [channels, session, selectedChannelId]);

  useEffect(() => {
    if (selectedChannelId && serverId) {
      navigate(`/dashboard/server/${serverId}/channel/${selectedChannelId}`, {
        replace: true,
      });
    }
  }, [selectedChannelId, serverId, navigate]);

  useEffect(() => {
    if (channelId) {
      setSelectedChannelId(channelId);
    }
  }, [channelId]);

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

  const handleKickMember = (member: ServerMember) => {
    setMemberToKick(member);
  };

  const handleKickSuccess = () => {
    setMemberToKick(null);
  };

  const canInvite = userRole === "owner" || userRole === "admin";
  const canKick = userRole === "owner" || userRole === "admin";
  const isServerOwner =
    server && session?.user && server.owner_id === session.user.id;

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
    <div className="flex flex-col h-full">
      {temporaryAccess && <TemporaryAccessBanner expiresAt={accessExpiresAt} />}

      <div className="flex flex-1 min-h-0">
        {/* Channels sidebar */}
        <div className="w-64 bg-gray-800 p-4 flex flex-col overflow-y-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-xl text-white">
                {server.name}
              </h3>
              <div className="flex items-center">
                {(canInvite || isServerOwner) && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 mr-1"
                    title="Invite People"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                )}

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

                    {showServerMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-10">
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

          <div className="mb-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2 px-2">
              <h4 className="uppercase text-xs font-semibold text-gray-400">
                Channels
              </h4>
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
                  {unreadChannels.has(channel.id) && (
                    <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                  )}
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

        {/* Members sidebar */}
        <div className="w-56 bg-gray-800 p-4 overflow-y-auto">
          <h4 className="uppercase text-xs font-semibold text-gray-400 mb-2 flex items-center">
            <Users className="h-3 w-3 mr-1" />
            Members ({members.length})
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
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
                        <span className="ml-2 text-xs text-yellow-400">
                          (temp)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{member.role}</div>
                  </div>
                </div>

                {canKick &&
                  member.user_id !== session?.user?.id &&
                  member.role !== "owner" && (
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

      {/* Modals */}
      {showInviteModal && server && (
        <ServerInvite
          serverId={server.id}
          serverName={server.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showDeleteModal && server && (
        <DeleteServerModal
          serverId={server.id}
          serverName={server.name}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {memberToKick && server && (
        <KickMemberModal
          serverId={server.id}
          serverName={server.name}
          userId={memberToKick.user_id}
          username={memberToKick.username}
          displayName={memberToKick.display_name}
          onClose={() => setMemberToKick(null)}
          onSuccess={handleKickSuccess}
        />
      )}

      {showManageChannels && server && (
        <ManageChannels
          serverId={server.id}
          serverName={server.name}
          onClose={() => setShowManageChannels(false)}
          onChannelUpdate={fetchServerData}
        />
      )}
    </div>
  );
}