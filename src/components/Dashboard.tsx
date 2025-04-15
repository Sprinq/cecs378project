import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { supabase, generateKeyPair, exportPublicKey } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import ServerList from './ServerList';
import ServerView from './ServerView';

export default function Dashboard() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const setupUserKeys = async () => {
      if (!session?.user) return;

      try {
        const { data: existingKey } = await supabase
          .from('user_keys')
          .select('public_key')
          .eq('user_id', session.user.id)
          .single();

        if (!existingKey) {
          const keyPair = await generateKeyPair();
          const publicKeyString = await exportPublicKey(keyPair.publicKey);

          await supabase.from('user_keys').insert({
            user_id: session.user.id,
            public_key: publicKeyString,
          });

          // Store private key securely in memory
          // In a production app, you might want to encrypt this with a user-provided password
          sessionStorage.setItem('privateKey', JSON.stringify(await exportPublicKey(keyPair.privateKey)));
        }
      } catch (error) {
        console.error("Error setting up user keys:", error);
      }

      setLoading(false);
    };

    setupUserKeys();
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
            <Route
              path="/"
              element={
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400">
                    {isDashboardRoot ? (
                      "Select a server or create a new one to get started"
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )}
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}