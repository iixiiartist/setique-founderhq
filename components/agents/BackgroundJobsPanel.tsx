// components/agents/BackgroundJobsPanel.tsx
// Panel showing active and recent background agent jobs

import React, { useCallback } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  X,
  ExternalLink,
  RefreshCw,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { BackgroundAgentJob } from '../../lib/services/backgroundAgentJobService';
import type { AgentReport } from '../../lib/services/agentReportService';
import { YOU_AGENTS } from '../../lib/config/youAgents';

interface BackgroundJobsPanelProps {
  jobs: BackgroundAgentJob[];
  activeJobs: BackgroundAgentJob[];
  isLoading: boolean;
  runningJobId: string | null;
  runningProgress: number;
  onCancelJob: (jobId: string) => Promise<boolean>;
  onDeleteJob: (jobId: string) => Promise<boolean>;
  onViewReport: (report: AgentReport) => void;
  onRefresh: () => Promise<void>;
  className?: string;
}

const STATUS_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  label: string;
  animate?: boolean;
}> = {
  pending: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Queued',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    label: 'Running',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    label: 'Failed',
  },
  cancelled: {
    icon: PauseCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    label: 'Cancelled',
  },
};

const GOAL_LABELS: Record<string, { label: string; emoji: string }> = {
  icp: { label: 'ICP Analysis', emoji: '👥' },
  competitive: { label: 'Competitive', emoji: '⚔️' },
  angles: { label: 'Outreach', emoji: '💡' },
  market: { label: 'Market', emoji: '📊' },
  timing: { label: 'Why Now', emoji: '⏰' },
  deal: { label: 'Deal Strategy', emoji: '🎯' },
};

export const BackgroundJobsPanel: React.FC<BackgroundJobsPanelProps> = ({
  jobs,
  activeJobs,
  isLoading,
  runningJobId,
  runningProgress,
  onCancelJob,
  onDeleteJob,
  onViewReport,
  onRefresh,
  className = '',
}) => {
  const handleViewReport = useCallback((job: BackgroundAgentJob) => {
    if (job.status === 'completed' && job.output) {
      // Create a minimal report object for viewing
      const report: AgentReport = {
        id: job.report_id || job.id,
        workspace_id: job.workspace_id,
        user_id: job.user_id,
        agent_slug: job.agent_slug,
        target: job.target,
        goal: job.goal,
        notes: job.notes,
        urls: job.urls,
        output: job.output,
        sources: job.sources || [],
        metadata: job.metadata || {},
        created_at: job.completed_at || job.created_at,
        updated_at: job.updated_at,
      };
      onViewReport(report);
    }
  }, [onViewReport]);

  if (isLoading && jobs.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading jobs...</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <PlayCircle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No background jobs yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Run an agent in the background to continue working while it processes
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Background Jobs
          </span>
          {activeJobs.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              {activeJobs.length} active
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          title="Refresh jobs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-2">
        {jobs.slice(0, 10).map((job) => {
          const statusConfig = STATUS_CONFIG[job.status];
          const StatusIcon = statusConfig.icon;
          const goalInfo = GOAL_LABELS[job.goal] || { label: job.goal, emoji: '📋' };
          const agentConfig = YOU_AGENTS[job.agent_slug as keyof typeof YOU_AGENTS];
          const isCurrentlyRunning = runningJobId === job.id;
          const progress = isCurrentlyRunning ? runningProgress : job.progress;

          return (
            <div
              key={job.id}
              className={`relative p-3 rounded-lg border transition-all ${
                job.status === 'running' || isCurrentlyRunning
                  ? 'border-blue-200 bg-blue-50/50'
                  : job.status === 'completed'
                  ? 'border-green-100 bg-green-50/30 hover:border-green-200'
                  : job.status === 'failed'
                  ? 'border-red-100 bg-red-50/30'
                  : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              {/* Progress bar for running jobs */}
              {(job.status === 'running' || isCurrentlyRunning) && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${statusConfig.bgColor}`}>
                  <StatusIcon 
                    className={`w-4 h-4 ${statusConfig.color} ${statusConfig.animate ? 'animate-spin' : ''}`} 
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" title={agentConfig?.label}>
                      {agentConfig?.icon || '🤖'}
                    </span>
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {job.target}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {goalInfo.emoji} {goalInfo.label}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </span>
                    {(job.status === 'running' || isCurrentlyRunning) && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-blue-600 font-medium">
                          {progress}%
                        </span>
                      </>
                    )}
                  </div>

                  {/* Error message for failed jobs */}
                  {job.status === 'failed' && job.error_message && (
                    <p className="mt-1.5 text-xs text-red-600 line-clamp-1">
                      {job.error_message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* View report for completed jobs */}
                  {job.status === 'completed' && job.output && (
                    <button
                      onClick={() => handleViewReport(job)}
                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                      title="View report"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}

                  {/* Cancel for running/pending */}
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button
                      onClick={() => onCancelJob(job.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Cancel job"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete for completed/failed/cancelled */}
                  {['completed', 'failed', 'cancelled'].includes(job.status) && (
                    <button
                      onClick={() => onDeleteJob(job.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {jobs.length > 10 && (
        <p className="text-xs text-center text-gray-400 mt-3">
          +{jobs.length - 10} more jobs
        </p>
      )}
    </div>
  );
};

export default BackgroundJobsPanel;
