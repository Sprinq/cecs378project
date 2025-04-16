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
import { migrateExistingMessages } from '../services/encryptionService';

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
        // Don't check for migration flag yet - just ensure keys exist
        const privateKeyString = sessionStorage.getItem('privateKey');
        if (!privateKeyString) {
          // Try to get the user's keys
          const { data: existingKey } = await supabase
            .from('user_keys')
            .select('public_key')
            .eq('user_id', session.user.id)
            .single();

          if (!existingKey) {
            // Generate a new key pair
            console.log('Generating new key pair for user');
            const keyPair = await window.crypto.subtle.generateKey(
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey']
            );
            
            // Export the public key
            const exported = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
            const publicKeyString = btoa(String.fromCharCode(...new Uint8Array(exported)));
            
            // Export the private key
            const privateKeyExported = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
            
            // Store public key in database
            await supabase.from('user_keys').insert({
              user_id: session.user.id,
              public_key: publicKeyString,
            });
            
            // Store private key in session storage
            sessionStorage.setItem('privateKey', JSON.stringify(privateKeyExported));
          }
        }
      } catch (error) {
        console.error("Error setting up user keys:", error);
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