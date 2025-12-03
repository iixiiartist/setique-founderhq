import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { 
  Activity, 
  getWorkspaceActivities, 
  formatActivityDescription, 
  getRelativeTime 
} from '../../lib/services/activityService';

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  limit = 20, 
  showHeader = true 
}) => {
  const { workspace } = useWorkspace();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [workspace?.id]);

  const loadActivities = async () => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { activities: fetchedActivities, error: fetchError } = await getWorkspaceActivities({
      workspaceId: workspace.id,
      limit,
    });

    if (fetchError) {
      setError(fetchError);
    } else {
      setActivities(fetchedActivities);
    }

    setLoading(false);
  };

  const getActivityIcon = (actionType: string): string => {
    switch (actionType) {
      case 'task_created':
        return '✨';
      case 'task_completed':
        return '✅';
      case 'task_assigned':
        return '👤';
      case 'task_updated':
        return '✏️';
      case 'task_deleted':
        return '🗑️';
      case 'crm_contact_added':
        return '👔';
      case 'crm_contact_updated':
        return '📝';
      case 'document_uploaded':
        return '📄';
      case 'meeting_scheduled':
        return '📅';
      case 'note_added':
        return '📌';
      default:
        return '•';
    }
  };

  const getActivityColor = (actionType: string): string => {
    switch (actionType) {
      case 'task_created':
        return 'text-slate-900 bg-white border border-gray-200 rounded-full';
      case 'task_completed':
        return 'text-white bg-green-600 rounded-full';
      case 'task_assigned':
        return 'text-slate-900 bg-blue-50 border border-blue-200 rounded-full';
      case 'task_updated':
        return 'text-slate-900 bg-gray-50 border border-gray-200 rounded-full';
      case 'task_deleted':
        return 'text-white bg-slate-700 rounded-full';
      case 'crm_contact_added':
      case 'crm_contact_updated':
        return 'text-slate-900 bg-purple-50 border border-purple-200 rounded-full';
      case 'document_uploaded':
        return 'text-slate-900 bg-white border border-gray-200 rounded-full';
      case 'meeting_scheduled':
        return 'text-slate-900 bg-amber-50 border border-amber-200 rounded-full';
      case 'note_added':
        return 'text-slate-900 bg-gray-100 border border-gray-200 rounded-full';
      default:
        return 'text-slate-900 bg-gray-50 border border-gray-200 rounded-full';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-8 gap-4">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-black animate-spin" style={{ animationDuration: '1.2s' }} />
          <div className="absolute inset-1.5 border border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 text-red-800 p-4">
        <p className="font-semibold">Failed to load activity feed</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600">
        <p className="text-lg mb-2">📭</p>
        <p className="font-semibold text-slate-900">No recent activity</p>
        <p className="text-sm mt-1">Team actions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          <button
            onClick={loadActivities}
            className="text-sm text-slate-700 font-medium hover:text-slate-900 flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      )}

      <div className="space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-all"
          >
            {/* Activity Icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-sm ${getActivityColor(
                activity.actionType
              )}`}
            >
              {getActivityIcon(activity.actionType)}
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.userName}</span>{' '}
                <span className="text-gray-600">{formatActivityDescription(activity)}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getRelativeTime(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
