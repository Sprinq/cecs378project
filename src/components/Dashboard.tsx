import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import ServerList from './ServerList';
import ServerView from './ServerView';
import Friends from './Friends';
import DirectMessagesList from './DirectMessagesList';
import DirectMessage from './DirectMessage';
import Welcome from './Welcome';

export default function Dashboard() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initDashboard = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user exists in our database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, username, display_name')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          console.error("Error checking user:", userError);
          // User might not exist, attempt to create profile
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              username: session.user.email,
              display_name: session.user.email?.split('@')[0]
            });
            
          if (createError) {
            console.error("Error creating user profile:", createError);
          }
        }
      } catch (error) {
        console.error("Error in dashboard init:", error);
      }

      setLoading(false);
    };

    initDashboard();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  // Check if we're in /dashboard with no subpath
  const isDashboardRoot = location.pathname === '/dashboard';

  return (
    <div className="flex h-screen bg-gray-900">
      <ServerList />
      <div className="flex flex-col flex-1">
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/server/:serverId/*" element={<ServerView />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/dm" element={
              <div className="flex h-full">
                <div className="w-64 bg-gray-800 border-r border-gray-700">
                  <DirectMessagesList />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400">
                    Select a conversation to start messaging
                  </div>
                </div>
              </div>
            } />
            <Route path="/dm/:friendId" element={
              <div className="flex h-full">
                <div className="w-64 bg-gray-800 border-r border-gray-700 hidden md:block">
                  <DirectMessagesList />
                </div>
                <div className="flex-1">
                  <DirectMessage />
                </div>
              </div>
            } />
            <Route
              path="/"
              element={
                <div className="flex-1">
                  {isDashboardRoot ? (
                    <Welcome />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )}
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}