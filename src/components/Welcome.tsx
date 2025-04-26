import React from "react";
import { useNavigate } from "react-router-dom";
import { ServerCrash, Users, MessageSquare } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center h-full">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1 rounded-full mb-6">
        <div className="bg-gray-900 rounded-full p-3">
          <svg
            className="w-16 h-16 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">
        Welcome to SecureChat
      </h1>
      <p className="text-gray-400 max-w-md mb-8">
        Connect with friends, create servers, and enjoy secure communications
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
        <div
          className="bg-gray-800 p-5 rounded-lg flex flex-col items-center hover:bg-gray-700 cursor-pointer transition-colors"
          onClick={() => navigate("/dashboard/server")}
        >
          <ServerCrash className="w-10 h-10 text-indigo-500 mb-3" />
          <h3 className="text-white font-medium mb-1">Join a Server</h3>
          <p className="text-gray-400 text-sm text-center">
            Chat in topic-based channels
          </p>
        </div>

        <div
          className="bg-gray-800 p-5 rounded-lg flex flex-col items-center hover:bg-gray-700 cursor-pointer transition-colors"
          onClick={() => navigate("/dashboard/friends")}
        >
          <Users className="w-10 h-10 text-green-500 mb-3" />
          <h3 className="text-white font-medium mb-1">Add Friends</h3>
          <p className="text-gray-400 text-sm text-center">
            Connect with people you know
          </p>
        </div>

        <div
          className="bg-gray-800 p-5 rounded-lg flex flex-col items-center hover:bg-gray-700 cursor-pointer transition-colors"
          onClick={() => navigate("/dashboard/dm")}
        >
          <MessageSquare className="w-10 h-10 text-blue-500 mb-3" />
          <h3 className="text-white font-medium mb-1">Direct Messages</h3>
          <p className="text-gray-400 text-sm text-center">
            Chat privately with friends
          </p>
        </div>
      </div>
    </div>
  );
}
