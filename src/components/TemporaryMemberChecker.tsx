// src/services/temporaryMemberChecker.ts

import { supabase } from '../lib/supabase';

export class TemporaryMemberChecker {
  private static instance: TemporaryMemberChecker;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): TemporaryMemberChecker {
    if (!TemporaryMemberChecker.instance) {
      TemporaryMemberChecker.instance = new TemporaryMemberChecker();
    }
    return TemporaryMemberChecker.instance;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check immediately on start
    this.checkExpiredMemberships();

    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkExpiredMemberships();
    }, 60000); // 1 minute
  }

  public stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
  }

  private async checkExpiredMemberships() {
    try {
      // Call the database function directly to cleanup expired members
      const { data, error } = await supabase.rpc('cleanup_expired_members');
      
      if (error) {
        console.error('Error calling cleanup_expired_members:', error);
        return;
      }

      if (data > 0) {
        console.log(`Removed ${data} expired temporary members`);
        
        // If any members were removed, trigger a refresh of the current page data
        // This will cause ServerView to re-fetch data and potentially redirect if the user was kicked
        const event = new CustomEvent('temporary-members-removed', { detail: { count: data } });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error('Error checking expired memberships:', err);
    }
  }

  // Manual trigger for immediate cleanup
  public async checkNow(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_members');
      
      if (error) {
        console.error('Error calling cleanup_expired_members:', error);
        return 0;
      }

      if (data > 0) {
        console.log(`Removed ${data} expired temporary members`);
        
        // Trigger refresh event
        const event = new CustomEvent('temporary-members-removed', { detail: { count: data } });
        window.dispatchEvent(event);
      }

      return data || 0;
    } catch (err) {
      console.error('Error checking expired memberships:', err);
      return 0;
    }
  }
}

// Export singleton instance
export const temporaryMemberChecker = TemporaryMemberChecker.getInstance();