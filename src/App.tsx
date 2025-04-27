import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import {
  Shield,
  LogOut,
  User,
  Settings,
  Users,
  MessageSquare,
  Lock,
} from "lucide-react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserSettings from "./components/UserSettings";
import JoinServer from "./components/JoinServer";
import KickNotification from "./components/KickNotification";
import { useAuthStore } from "./stores/authStore";
import { supabase } from "./lib/supabase";
import { temporaryMemberChecker } from './services/temporaryMemberChecker';

// Regular link component instead of NavLink
function AppNavLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.FC<any>;
  label: string;
}) {
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
  const [username, setUsername] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from("users")
          .select("username, display_name")
          .eq("id", session.user.id)
          .single();

        if (data && !error) {
          setUsername(data.display_name || data.username);
        }
      }
    };

    fetchUserProfile();
  }, [session, showSettings]); // Re-fetch when settings modal closes

  // Start the temporary member checker with 5-second interval
  useEffect(() => {
    temporaryMemberChecker.start(5); // Check every 5 seconds
    
    return () => {
      temporaryMemberChecker.stop();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // src/App.tsx - Update line ~41
  return (
    <Router>
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <KickNotification />
        {/* Only show the navbar if not on the invite page */}
        {!window.location.pathname.startsWith("/invite/") && (
          <nav className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex lg:h-16">
                <div className="flex items-center justify-between lg:flex-row flex-col w-full">
                  <div className="flex items-center flex-col lg:flex-row space-x-2">
                    <Link to="/" className="flex items-center">
                      <Shield className="h-8 w-8 text-indigo-500" />
                      <span className="ml-2 text-xl font-bold">SecureChat</span>
                    </Link>

                    {session && (
                      <div className="pl-8 flex space-x-2">
                        <AppNavLink
                          to="/dashboard/server"
                          icon={Shield}
                          label="Servers"
                        />
                        <AppNavLink
                          to="/dashboard/friends"
                          icon={Users}
                          label="Friends"
                        />
                        <AppNavLink
                          to="/dashboard/dm"
                          icon={MessageSquare}
                          label="Messages"
                        />
                      </div>
                    )}
                  </div>
                  {session && (
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">
                          {username || session.user.email}
                        </span>
                      </div>

                      {/* Show encryption status indicator */}
                      <div className="text-green-400 flex items-center text-sm">
                        <Lock className="h-4 w-4 mr-1" />
                        <span>Encrypted</span>
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
            </div>
          </nav>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
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
            <Route path="/invite/:inviteCode" element={<JoinServer />} />
            <Route
              path="/"
              element={<Navigate to={session ? "/dashboard" : "/login"} />}
            />
          </Routes>
        </div>
      </div>

      {showSettings && session && <UserSettings onClose={toggleSettings} />}
    </Router>
  );
}

export default App;
