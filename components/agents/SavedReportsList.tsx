// components/agents/SavedReportsList.tsx
// Display list of saved Research Agent reports

import React from 'react';
import { FileText, Clock, Trash2, ChevronRight, Target, TrendingUp, Users, Lightbulb } from 'lucide-react';
import type { AgentReport } from '../../lib/services/agentReportService';

interface SavedReportsListProps {
  reports: AgentReport[];
  isLoading: boolean;
  onViewReport: (report: AgentReport) => void;
  onDeleteReport: (reportId: string) => void;
}

const GOAL_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  icp: { label: 'ICP & Pains', icon: <Users size={14} className="text-gray-500" /> },
  competitive: { label: 'Competitive', icon: <Target size={14} className="text-gray-500" /> },
  angles: { label: 'Outreach Angles', icon: <Lightbulb size={14} className="text-gray-500" /> },
  market: { label: 'Market Trends', icon: <TrendingUp size={14} className="text-gray-500" /> },
};

export const SavedReportsList: React.FC<SavedReportsListProps> = ({
  reports,
  isLoading,
  onViewReport,
  onDeleteReport,
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="animate-pulse">Loading saved reports...</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No saved reports yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Reports will appear here after you run research
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => {
        const goalInfo = GOAL_LABELS[report.goal] || { label: report.goal, icon: <FileText size={14} /> };
        const createdDate = new Date(report.created_at);
        const timeAgo = getTimeAgo(createdDate);

        return (
          <div
            key={report.id}
            className="group flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer transition-colors"
            onClick={() => onViewReport(report)}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-gray-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{report.target}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {goalInfo.icon}
                  {goalInfo.label}
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {timeAgo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteReport(report.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Delete report"
              >
                <Trash2 size={16} />
              </button>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default SavedReportsList;
