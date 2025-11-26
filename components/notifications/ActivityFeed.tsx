import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Filter,
  User,
  ListTodo,
  Briefcase,
  MessageSquare,
  FileText,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

// ============================================
// TYPES
// ============================================

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

type EntityFilter = 'all' | 'task' | 'deal' | 'contact' | 'document' | 'comment' | 'financial';

interface ActivityFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  compact?: boolean;
  onItemClick?: (entityType: string, entityId: string) => void;
}

// ============================================
// ACTIVITY ICON MAPPING
// ============================================

const getActivityIcon = (actionType: string, entityType: string): { icon: React.ReactNode; color: string } => {
  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    // Task actions
    task_created: { icon: <ListTodo className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600' },
    task_completed: { icon: <ListTodo className="w-4 h-4" />, color: 'bg-green-100 text-green-600' },
    task_assigned: { icon: <User className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
    task_updated: { icon: <ListTodo className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600' },
    
    // Deal actions
    deal_created: { icon: <Briefcase className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-600' },
    deal_won: { icon: <Briefcase className="w-4 h-4" />, color: 'bg-green-100 text-green-600' },
    deal_lost: { icon: <Briefcase className="w-4 h-4" />, color: 'bg-red-100 text-red-600' },
    deal_stage_changed: { icon: <Briefcase className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
    
    // Comment actions
    comment_added: { icon: <MessageSquare className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-600' },
    comment_reply: { icon: <MessageSquare className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-600' },
    
    // Document actions
    document_created: { icon: <FileText className="w-4 h-4" />, color: 'bg-orange-100 text-orange-600' },
    document_shared: { icon: <FileText className="w-4 h-4" />, color: 'bg-teal-100 text-teal-600' },
    
    // Contact actions
    contact_created: { icon: <Users className="w-4 h-4" />, color: 'bg-pink-100 text-pink-600' },
    contact_updated: { icon: <Users className="w-4 h-4" />, color: 'bg-pink-100 text-pink-600' },
    
    // Financial actions
    revenue_added: { icon: <DollarSign className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
    expense_added: { icon: <DollarSign className="w-4 h-4" />, color: 'bg-red-100 text-red-600' },
    
    // Meeting actions
    meeting_scheduled: { icon: <Calendar className="w-4 h-4" />, color: 'bg-violet-100 text-violet-600' },
  };

  const key = `${entityType}_${actionType.replace(entityType + '_', '')}`;
  return iconMap[actionType] || iconMap[key] || { 
    icon: <Activity className="w-4 h-4" />, 
    color: 'bg-gray-100 text-gray-600' 
  };
};

// ============================================
// ACTION DESCRIPTION MAPPING
// ============================================

const getActionDescription = (item: ActivityItem): string => {
  if (item.description) return item.description;

  const actionMap: Record<string, string> = {
    task_created: `created task "${item.entityName || 'Untitled'}"`,
    task_completed: `completed task "${item.entityName || 'Untitled'}"`,
    task_assigned: `assigned task "${item.entityName || 'Untitled'}"`,
    task_updated: `updated task "${item.entityName || 'Untitled'}"`,
    deal_created: `created deal "${item.entityName || 'Untitled'}"`,
    deal_won: `won deal "${item.entityName || 'Untitled'}"`,
    deal_lost: `lost deal "${item.entityName || 'Untitled'}"`,
    deal_stage_changed: `moved deal "${item.entityName || 'Untitled'}" to a new stage`,
    comment_added: `commented on "${item.entityName || 'an item'}"`,
    document_created: `created document "${item.entityName || 'Untitled'}"`,
    document_shared: `shared document "${item.entityName || 'Untitled'}"`,
    contact_created: `added contact "${item.entityName || 'Unknown'}"`,
    contact_updated: `updated contact "${item.entityName || 'Unknown'}"`,
    revenue_added: `logged revenue`,
    expense_added: `logged expense`,
    meeting_scheduled: `scheduled a meeting`,
  };

  return actionMap[item.actionType] || `performed an action`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  maxItems = 50,
  showFilters = true,
  compact = false,
  onItemClick,
}) => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<EntityFilter>('all');

  // Load activities
  const loadActivities = useCallback(async (showRefreshing = false) => {
    if (!user || !workspace) return;

    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      // Use RPC function for activity feed
      const { data, error } = await supabase
        .rpc('get_activity_feed', {
          p_workspace_id: workspace.id,
          p_limit: maxItems,
          p_offset: 0,
          p_entity_type: filter === 'all' ? null : filter,
        });

      if (error) {
        // Fallback to direct query if RPC doesn't exist
        logger.warn('Activity feed RPC not available, using direct query:', error);
        
        let query = supabase
          .from('activity_log')
          .select(`
            *,
            profiles:user_id(full_name, avatar_url)
          `)
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(maxItems);

        if (filter !== 'all') {
          query = query.eq('entity_type', filter);
        }

        const { data: fallbackData, error: fallbackError } = await query;

        if (fallbackError) throw fallbackError;

        const transformedData: ActivityItem[] = (fallbackData || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          userName: row.profiles?.full_name || 'Unknown User',
          userAvatar: row.profiles?.avatar_url,
          actionType: row.action_type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          entityName: row.entity_name,
          description: row.description,
          metadata: row.metadata,
          createdAt: row.created_at,
        }));

        setActivities(transformedData);
      } else {
        const transformedData: ActivityItem[] = (data || []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name || 'Unknown User',
          userAvatar: row.user_avatar,
          actionType: row.action_type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          entityName: row.entity_name,
          description: row.description,
          metadata: row.metadata,
          createdAt: row.created_at,
        }));

        setActivities(transformedData);
      }
    } catch (error) {
      logger.error('Failed to load activity feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, workspace, maxItems, filter]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Setup real-time subscription
  useEffect(() => {
    if (!workspace) return;

    const subscription = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          // Reload activities when new ones are added
          loadActivities(true);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [workspace, loadActivities]);

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get user initials
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filters: Array<{ id: EntityFilter; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All', icon: <Activity className="w-4 h-4" /> },
    { id: 'task', label: 'Tasks', icon: <ListTodo className="w-4 h-4" /> },
    { id: 'deal', label: 'Deals', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'contact', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
    { id: 'document', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'comment', label: 'Comments', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className={`bg-white border-2 border-black ${compact ? '' : 'h-full'} flex flex-col`}>
      {/* Header */}
      <div className="border-b-2 border-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <h3 className="font-bold">Recent Activity</h3>
        </div>
        <button
          onClick={() => loadActivities(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          aria-label="Refresh activity"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-gray-200 p-2 overflow-x-auto">
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className={`flex-1 overflow-y-auto ${compact ? 'max-h-96' : ''}`}>
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <Activity className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs text-center mt-1">
              {filter !== 'all' 
                ? `No ${filter} activity to show`
                : 'Activity will appear here as you work'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => {
              const { icon, color } = getActivityIcon(activity.actionType, activity.entityType);
              
              return (
                <div
                  key={activity.id}
                  onClick={() => onItemClick?.(activity.entityType, activity.entityId)}
                  className={`p-3 hover:bg-gray-50 transition-colors ${onItemClick ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      {activity.userAvatar ? (
                        <img
                          src={activity.userAvatar}
                          alt={activity.userName}
                          className="w-8 h-8 rounded-full border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {getInitials(activity.userName)}
                        </div>
                      )}
                      {/* Activity type badge */}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${color} flex items-center justify-center border-2 border-white`}>
                        {icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>{' '}
                        <span className="text-gray-600">
                          {getActionDescription(activity)}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(activity.createdAt)}
                        </span>
                        {activity.metadata?.amount && (
                          <span className="text-xs font-medium text-green-600">
                            ${activity.metadata.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Navigate indicator */}
                    {onItemClick && (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
