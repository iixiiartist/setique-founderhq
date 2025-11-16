import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'task' | 'deal' | 'contact' | 'document' | 'product';
  entityName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface TeamActivityFeedProps {
  workspaceId: string;
  limit?: number;
  showFilters?: boolean;
  className?: string;
  onViewAllActivity?: () => void;
}

export const TeamActivityFeed: React.FC<TeamActivityFeedProps> = ({
  workspaceId,
  limit = 20,
  showFilters = true,
  className = '',
  onViewAllActivity,
}) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tasks' | 'deals' | 'contacts'>('all');

  useEffect(() => {
    loadActivities();
  }, [workspaceId, filter]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      // This would query an activity_logs table or aggregate from various tables
      // For now, we'll create a mock implementation
      // TODO: Implement actual activity log table in Supabase
      
      const mockActivities: ActivityEvent[] = [];
      
      // Query recent tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, text, status, user_id, created_at, updated_at, profiles!tasks_user_id_fkey(full_name)')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(filter === 'tasks' || filter === 'all' ? 10 : 0);

      if (tasks) {
        tasks.forEach(task => {
          mockActivities.push({
            id: `task-${task.id}`,
            userId: task.user_id,
            userName: (task.profiles as any)?.full_name || 'Unknown',
            action: task.status === 'Done' ? 'completed' : 'updated',
            entityType: 'task',
            entityName: task.text,
            timestamp: task.updated_at,
          });
        });
      }

      // Sort by timestamp
      mockActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(mockActivities.slice(0, limit));
    } catch (error) {
      logger.error('[TeamActivityFeed] Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string, entityType: string) => {
    switch (action) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'created':
        return <AlertCircle className="text-blue-500" size={20} />;
      case 'updated':
        return <Clock className="text-gray-500" size={20} />;
      case 'won':
        return <TrendingUp className="text-green-500" size={20} />;
      default:
        return <User className="text-gray-400" size={20} />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'completed':
      case 'won':
        return 'border-l-green-500 bg-green-50';
      case 'created':
        return 'border-l-blue-500 bg-blue-50';
      case 'lost':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActionText = (activity: ActivityEvent) => {
    const action = activity.action;
    const entity = activity.entityType;
    
    switch (action) {
      case 'completed':
        return 'completed';
      case 'created':
        return 'created';
      case 'updated':
        return 'updated';
      case 'won':
        return 'won';
      case 'lost':
        return 'lost';
      case 'assigned':
        return 'was assigned';
      default:
        return 'updated';
    }
  };

  if (loading) {
    return (
      <div className={`border-2 border-black p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-2 border-black shadow-neo bg-white ${className}`}>
      {/* Header */}
      <div className="border-b-2 border-black p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-blue-600" />
            <h3 className="text-lg font-bold">Team Activity</h3>
          </div>
          {showFilters && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border-2 border-black text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activity</option>
              <option value="tasks">Tasks Only</option>
              <option value="deals">Deals Only</option>
              <option value="contacts">Contacts Only</option>
            </select>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold">No recent activity</p>
            <p className="text-sm mt-1">Team actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-gray-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`border-l-4 ${getActivityColor(activity.action)} p-4 hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.action, activity.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="font-bold">{activity.userName}</span>
                      {' '}
                      {getActionText(activity)}
                      {' '}
                      <span className="font-semibold">"{activity.entityName}"</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-2 py-1 text-xs font-bold uppercase border border-black bg-white">
                    {activity.entityType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="border-t-2 border-black p-3 bg-gray-50 text-center">
          <button
            onClick={() => {
              logger.info('[TeamActivityFeed] View all clicked');
              onViewAllActivity?.();
            }}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View All Activity →
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamActivityFeed;
