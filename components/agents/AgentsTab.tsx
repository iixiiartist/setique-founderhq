// components/agents/AgentsTab.tsx
// Main Agents tab - grid of AI agents available in FounderHQ

import React, { useState, useCallback } from 'react';
import { Bot, Sparkles, FileText, PlayCircle, Loader2 } from 'lucide-react';
import { YOU_AGENTS, getEnabledAgents, type YouAgentSlug } from '../../lib/config/youAgents';
import { AgentCard } from './AgentCard';
import { ResearchAgentModal } from './ResearchAgentModal';
import { WhyNowAgentModal } from './WhyNowAgentModal';
import { DealStrategistModal } from './DealStrategistModal';
import { SavedReportsList } from './SavedReportsList';
import { BackgroundJobsPanel } from './BackgroundJobsPanel';
import { useAgentReports } from '../../hooks/useAgentReports';
import { useBackgroundAgentJobs } from '../../hooks/useBackgroundAgentJobs';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AppActions } from '../../types';
import type { AgentReport } from '../../lib/services/agentReportService';

interface AgentsTabProps {
  actions?: AppActions;
  onInsertToDoc?: (content: string) => void;
}

export const AgentsTab: React.FC<AgentsTabProps> = ({ actions, onInsertToDoc }) => {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { reports, isLoading: reportsLoading, deleteReport, refreshReports } = useAgentReports(workspace?.id, user?.id);
  const { 
    jobs, 
    activeJobs, 
    isLoading: jobsLoading, 
    startBackgroundJob, 
    cancelJob, 
    deleteJob, 
    refreshJobs,
    runningJobId,
    runningProgress,
  } = useBackgroundAgentJobs({ userId: user?.id, workspaceId: workspace?.id });
  
  const [activeModal, setActiveModal] = useState<YouAgentSlug | null>(null);
  const [viewingReport, setViewingReport] = useState<AgentReport | null>(null);
  
  const deleteReportConfirm = useDeleteConfirm<{ id: string; name?: string }>('report');

  const handleOpenAgent = useCallback((slug: YouAgentSlug) => {
    setActiveModal(slug);
    setViewingReport(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    setViewingReport(null);
    // Refresh reports when modal closes (in case new report was saved)
    refreshReports();
  }, [refreshReports]);

  const handleViewReport = useCallback((report: AgentReport) => {
    setViewingReport(report);
    // Open the correct modal based on the report's agent slug
    setActiveModal(report.agent_slug as YouAgentSlug);
  }, []);

  const handleDeleteReport = useCallback((reportId: string) => {
    deleteReportConfirm.requestConfirm({ id: reportId, name: 'report' }, async (data) => {
      await deleteReport(data.id);
    });
  }, [deleteReport, deleteReportConfirm]);

  // Only show enabled agents
  const enabledAgentSlugs = getEnabledAgents();
  const agentEntries = enabledAgentSlugs.map(slug => [slug, YOU_AGENTS[slug]] as [YouAgentSlug, typeof YOU_AGENTS[YouAgentSlug]]);

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Bot size={20} className="sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Agents</h1>
              <p className="text-sm text-gray-500">
                Specialized AI assistants
              </p>
            </div>
          </div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">
            Use AI agents to accelerate research, GTM planning, and execution. 
            Each agent is specialized for specific tasks to help you move faster.
          </p>
        </div>

        {/* Feature Highlight */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">AI-Powered Research</p>
              <p className="text-xs text-gray-600">Get comprehensive briefs with real-time web research</p>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Available Agents</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {agentEntries.map(([slug, config]) => (
              <AgentCard
                key={slug}
                slug={slug}
                config={config}
                onOpen={() => handleOpenAgent(slug)}
              />
            ))}
          </div>
        </div>

        {/* Saved Reports Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Saved Reports</h2>
              {reports.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {reports.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <SavedReportsList
              reports={reports}
              isLoading={reportsLoading}
              onViewReport={handleViewReport}
              onDeleteReport={handleDeleteReport}
            />
          </div>
        </div>

        {/* Background Jobs Section */}
        {(jobs.length > 0 || activeJobs.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Background Jobs</h2>
                {activeJobs.length > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {activeJobs.length} running
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 sm:p-4">
              <BackgroundJobsPanel
                jobs={jobs}
                activeJobs={activeJobs}
                isLoading={jobsLoading}
                runningJobId={runningJobId}
                runningProgress={runningProgress}
                onCancelJob={cancelJob}
                onDeleteJob={deleteJob}
                onViewReport={handleViewReport}
                onRefresh={refreshJobs}
              />
            </div>
          </div>
        )}

        {/* Coming Soon Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">🚀 More Agents Coming Soon</h3>
          <p className="text-xs sm:text-sm text-gray-600">
            We're building specialized agents for competitive intelligence, outreach optimization, 
            and more. Stay tuned!
          </p>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'research_briefing' && (
        <ResearchAgentModal
          open={true}
          onClose={handleCloseModal}
          onInsertToDoc={onInsertToDoc}
          savedReport={viewingReport}
          onStartBackgroundJob={startBackgroundJob}
        />
      )}

      {activeModal === 'why_now' && (
        <WhyNowAgentModal
          open={true}
          onClose={handleCloseModal}
          onInsertToDoc={onInsertToDoc}
          savedReport={viewingReport}
          onStartBackgroundJob={startBackgroundJob}
        />
      )}

      {activeModal === 'deal_strategist' && (
        <DealStrategistModal
          open={true}
          onClose={handleCloseModal}
          onInsertToDoc={onInsertToDoc}
          savedReport={viewingReport}
          onStartBackgroundJob={startBackgroundJob}
        />
      )}

      {/* Delete Report Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteReportConfirm.isOpen}
        onClose={deleteReportConfirm.cancel}
        onConfirm={deleteReportConfirm.confirm}
        title={deleteReportConfirm.title}
        message={deleteReportConfirm.message}
        confirmLabel={deleteReportConfirm.confirmLabel}
        cancelLabel={deleteReportConfirm.cancelLabel}
        variant={deleteReportConfirm.variant}
        isLoading={deleteReportConfirm.isProcessing}
      />
    </div>
  );
};

export default AgentsTab;
