// src/components/KickNotification.tsx
import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface KickEvent {
  serverId: string;
  serverName: string;
}

export default function KickNotification() {
  const [notification, setNotification] = useState<KickEvent | null>(null);

  useEffect(() => {
    const handleKickEvent = (event: CustomEvent<KickEvent>) => {
      setNotification(event.detail);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    };

    window.addEventListener('user-kicked-from-server', handleKickEvent as EventListener);

    return () => {
      window.removeEventListener('user-kicked-from-server', handleKickEvent as EventListener);
    };
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        <div className="flex-1">
          <p className="font-medium">You've been removed from {notification.serverName}</p>
          <p className="text-sm opacity-90">Your access has been revoked or has expired</p>
        </div>
        <button 
          onClick={() => setNotification(null)}
          className="ml-4 hover:opacity-75"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}