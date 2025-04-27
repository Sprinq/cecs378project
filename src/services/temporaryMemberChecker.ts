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

    // Then check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkExpiredMemberships();
    }, 30000); // 30 seconds
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
      // First, check if the current user has expired access
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if we need to redirect the current user
        const { data: memberData } = await supabase
          .from('server_members')
          .select('server_id, temporary_access, access_expires_at')
          .eq('user_id', session.user.id)
          .eq('temporary_access', true);
        
        if (memberData) {
          const expiredMemberships = memberData.filter(
            member => member.access_expires_at && new Date(member.access_expires_at) < new Date()
          );
          
          if (expiredMemberships.length > 0) {
            // Trigger a refresh event for each expired server
            expiredMemberships.forEach(member => {
              const event = new CustomEvent('user-temp-access-expired', {
                detail: { serverId: member.server_id }
              });
              window.dispatchEvent(event);
            });
          }
        }
      }
      
      // Call the database function to cleanup expired members
      const { data, error } = await supabase.rpc('cleanup_expired_members');
      
      if (error) {
        console.error('Error calling cleanup_expired_members:', error);
        return;
      }

      if (data > 0) {
        console.log(`Removed ${data} expired temporary members`);
        
        // Trigger a general refresh event
        const event = new CustomEvent('temporary-members-removed', { detail: { count: data } });
        window.dispatchEvent(event);
        
        // Also trigger a manual refresh of the current page
        if (window.location.pathname.includes('/dashboard/server/')) {
          const refreshEvent = new Event('refresh-server-data');
          window.dispatchEvent(refreshEvent);
        }
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
        
        // Also trigger a manual refresh of the current page
        if (window.location.pathname.includes('/dashboard/server/')) {
          const refreshEvent = new Event('refresh-server-data');
          window.dispatchEvent(refreshEvent);
        }
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