import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase, generateKeyPair, exportPublicKey } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import ServerList from './ServerList';
import ServerView from './ServerView';

export default function Dashboard() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupUserKeys = async () => {
      if (!session?.user) return;

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
                    Select a server or create a new one to get started
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