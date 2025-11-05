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
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'task_completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'task_assigned':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'task_updated':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'task_deleted':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'crm_contact_added':
      case 'crm_contact_updated':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'document_uploaded':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      case 'meeting_scheduled':
        return 'text-pink-600 bg-pink-50 border-pink-200';
      case 'note_added':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Failed to load activity feed</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p className="text-lg mb-2">📭</p>
        <p>No recent activity</p>
        <p className="text-sm mt-1">Team actions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button
            onClick={loadActivities}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
            className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            {/* Activity Icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getActivityColor(
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
