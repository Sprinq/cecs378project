import React from 'react';
import { useParams } from 'react-router-dom';

export default function ServerView() {
  const { serverId } = useParams();

  return (
    <div className="flex-1 bg-gray-800 text-gray-200">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Server Content</h2>
        {/* Server content will be implemented later */}
        <p className="text-gray-400">Server ID: {serverId}</p>
      </div>
    </div>
  );
}