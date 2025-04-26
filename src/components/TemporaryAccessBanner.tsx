import React, { useState, useEffect } from 'react';
import { Timer, AlertCircle } from 'lucide-react';

interface TemporaryAccessBannerProps {
  expiresAt: string | null;
}

// This component will be used in ServerView.tsx to show temporary access information
export default function TemporaryAccessBanner({ expiresAt }: TemporaryAccessBannerProps) {
  const [timeDisplay, setTimeDisplay] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  
  useEffect(() => {
    if (!expiresAt) return;
    
    // Function to update the countdown
    const updateCountdown = () => {
      const expiry = new Date(expiresAt);
      const now = new Date();
      const timeRemaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
      
      if (timeRemaining <= 0) {
        setIsExpired(true);
        return;
      }
      
      // Format the time remaining
      const days = Math.floor(timeRemaining / 86400);
      const hours = Math.floor((timeRemaining % 86400) / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      
      let display = '';
      if (days > 0) {
        display = `${days} day${days !== 1 ? 's' : ''}`;
        if (hours > 0) display += ` and ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        display = `${hours} hour${hours !== 1 ? 's' : ''}`;
        if (minutes > 0) display += ` and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        display = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      
      setTimeDisplay(display);
    };
    
    // Initial update
    updateCountdown();
    
    // Set up interval to update the countdown every minute
    const interval = setInterval(updateCountdown, 60000);
    
    // Clean up the interval on unmount
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  if (!expiresAt) return null;
  
  if (isExpired) {
    return (
      <div className="bg-red-900 bg-opacity-20 text-red-400 py-2 px-4 text-sm flex items-center">
        <AlertCircle className="h-4 w-4 mr-2" />
        <span>Your temporary access has expired. You will be removed from this server soon.</span>
      </div>
    );
  }
  
  return (
    <div className="bg-yellow-900 bg-opacity-20 text-yellow-400 py-2 px-4 text-sm flex items-center">
      <Timer className="h-4 w-4 mr-2" />
      <span>Temporary access: Your membership expires in {timeDisplay}</span>
    </div>
  );
}