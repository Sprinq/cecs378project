import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Shield, LogOut, User, Settings } from 'lucide-react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import UserSettings from './components/UserSettings';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';

function App() {
  const { session } = useAuthStore();
  const [username, setUsername] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('users')
          .select('username, display_name')
          .eq('id', session.user.id)
          .single();
          
        if (data && !error) {
          setUsername(data.display_name || data.username);
        }
      }
    };
    
    fetchUserProfile();
  }, [session, showSettings]); // Re-fetch when settings modal closes

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-indigo-500" />
                <span className="ml-2 text-xl font-bold">SecureChat</span>
              </div>
              
              {session && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-gray-300">
                    <User className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">{username || session.user.email}</span>
                  </div>
                  <button
                    onClick={toggleSettings}
                    className="flex items-center text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/register"
            element={session ? <Navigate to="/dashboard" /> : <Register />}
          />
          <Route
            path="/dashboard/*"
            element={session ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/"
            element={<Navigate to={session ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </div>
      
      {showSettings && session && <UserSettings onClose={toggleSettings} />}
    </Router>
  );
}

export default App;