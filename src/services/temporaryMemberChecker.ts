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

  public start(intervalSeconds: number = 5) {
    if (this.isRunning) return;
    this.isRunning = true;
  
    // Check immediately on start
    this.checkExpiredMemberships();
  
    // Then check at the specified interval (default 5 seconds)
    this.checkInterval = setInterval(() => {
      this.checkExpiredMemberships();
    }, intervalSeconds * 1000);
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
          .select('server_id, temporary_access, access_expires_at, role')
          .eq('user_id', session.user.id)
          .eq('temporary_access', true);
        
        if (memberData) {
          // Don't remove server owners regardless of temporary access
          const expiredMemberships = memberData.filter(
            member => member.role !== 'owner' && 
                      member.access_expires_at && 
                      new Date(member.access_expires_at) < new Date()
          );
          
          if (expiredMemberships.length > 0) {
            // Trigger a kick event for each expired server
            for (const member of expiredMemberships) {
              // Get server name for the notification
              const { data: serverData } = await supabase
                .from('servers')
                .select('name')
                .eq('id', member.server_id)
                .single();
              
              const event = new CustomEvent('user-kicked-from-server', {
                detail: { 
                  serverId: member.server_id,
                  serverName: serverData?.name || 'the server'
                }
              });
              window.dispatchEvent(event);
            }
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
}

// Export singleton instance
export const temporaryMemberChecker = TemporaryMemberChecker.getInstance();