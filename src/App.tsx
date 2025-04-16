import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Shield, LogOut, User, Settings, Users, MessageSquare } from 'lucide-react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import UserSettings from './components/UserSettings';
import JoinServer from './components/JoinServer';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';

// Regular link component instead of NavLink
function AppNavLink({ to, icon: Icon, label }: { to: string; icon: React.FC<any>; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium mr-2"
    >
      <Icon className="h-5 w-5 mr-2" />
      {label}
    </Link>
  );
}

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
        {/* Encryption notification banner */}
        {session && !sessionStorage.getItem('privateKey') && (
          <div className="bg-yellow-600 bg-opacity-20 text-yellow-300 text-sm p-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  End-to-end encryption is not set up for your account. New messages are not encrypted.
                </span>
              </div>
              <button 
                className="text-yellow-200 underline"
                onClick={() => {
                  // This would ideally open a modal or go to a setup page
                  alert('This would open the encryption setup page in a real application.');
                }}
              >
                Set up encryption
              </button>
            </div>
          </div>
        )}
        
        {/* Only show the navbar if not on the invite page */}
        {!window.location.pathname.startsWith('/invite/') && (
          <nav className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <Link to="/" className="flex items-center">
                    <Shield className="h-8 w-8 text-indigo-500" />
                    <span className="ml-2 text-xl font-bold">SecureChat</span>
                  </Link>
                  
                  {session && (
                    <div className="ml-10 flex items-center space-x-2">
                      <AppNavLink to="/dashboard/server" icon={Shield} label="Servers" />
                      <AppNavLink to="/dashboard/friends" icon={Users} label="Friends" />
                      <AppNavLink to="/dashboard/dm" icon={MessageSquare} label="Messages" />
                    </div>
                  )}
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
        )}

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
            path="/invite/:inviteCode"
            element={<JoinServer />}
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