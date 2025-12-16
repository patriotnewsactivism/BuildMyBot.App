import { supabase } from './supabaseClient';

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AuditAction =
  | 'bot_created'
  | 'bot_updated'
  | 'bot_deleted'
  | 'lead_created'
  | 'lead_updated'
  | 'conversation_started'
  | 'user_login'
  | 'user_logout'
  | 'user_suspended'
  | 'user_activated'
  | 'profile_updated'
  | 'widget_loaded'
  | 'widget_error'
  | 'feature_clicked'
  | string; // Allow custom actions

/**
 * Audit Service
 * Handles logging of security-critical and compliance-related actions
 */
export const auditService = {
  /**
   * Create an audit log entry
   * @param action - The action being performed
   * @param resourceType - Type of resource (bot, user, lead, etc.)
   * @param resourceId - ID of the affected resource
   * @param metadata - Additional context (IP, changes, etc.)
   */
  async logAction(
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog | null> {
    if (!supabase) {
      console.warn('Supabase not initialized. Audit log not created.');
      return null;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('No authenticated user. Audit log not created.');
        return null;
      }

      // Capture additional metadata
      const enrichedMetadata = {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      };

      // Insert audit log
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          user_email: user.email,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata: enrichedMetadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create audit log:', error);
        return null;
      }

      return data as AuditLog;
    } catch (err) {
      console.error('Error creating audit log:', err);
      return null;
    }
  },

  /**
   * Get audit logs for a specific user
   * @param userId - User ID to fetch logs for
   * @param limit - Maximum number of logs to return
   */
  async getUserLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch user audit logs:', error);
        return [];
      }

      return (data as AuditLog[]) || [];
    } catch (err) {
      console.error('Error fetching user audit logs:', err);
      return [];
    }
  },

  /**
   * Get audit logs for a specific resource
   * @param resourceType - Type of resource
   * @param resourceId - ID of the resource
   * @param limit - Maximum number of logs to return
   */
  async getResourceLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch resource audit logs:', error);
        return [];
      }

      return (data as AuditLog[]) || [];
    } catch (err) {
      console.error('Error fetching resource audit logs:', err);
      return [];
    }
  },

  /**
   * Get all audit logs (admin only)
   * @param filters - Optional filters
   * @param limit - Maximum number of logs to return
   */
  async getAllLogs(
    filters?: {
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<AuditLog[]> {
    if (!supabase) return [];

    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch all audit logs:', error);
        return [];
      }

      return (data as AuditLog[]) || [];
    } catch (err) {
      console.error('Error fetching all audit logs:', err);
      return [];
    }
  },

  /**
   * Search audit logs by action type
   * @param actions - Array of action types to search for
   * @param limit - Maximum number of logs to return
   */
  async searchByActions(actions: string[], limit: number = 50): Promise<AuditLog[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action', actions)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to search audit logs by actions:', error);
        return [];
      }

      return (data as AuditLog[]) || [];
    } catch (err) {
      console.error('Error searching audit logs by actions:', err);
      return [];
    }
  },
};
