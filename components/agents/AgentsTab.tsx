// components/agents/AgentsTab.tsx
// Main Agents tab - grid of AI agents available in FounderHQ

import React, { useState, useCallback } from 'react';
import { Bot, Sparkles, FileText } from 'lucide-react';
import { YOU_AGENTS, getEnabledAgents, type YouAgentSlug } from '../../lib/config/youAgents';
import { AgentCard } from './AgentCard';
import { ResearchAgentModal } from './ResearchAgentModal';
import { WhyNowAgentModal } from './WhyNowAgentModal';
import { DealStrategistModal } from './DealStrategistModal';
import { SavedReportsList } from './SavedReportsList';
import { useAgentReports } from '../../hooks/useAgentReports';
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
  
  const [activeModal, setActiveModal] = useState<YouAgentSlug | null>(null);
  const [viewingReport, setViewingReport] = useState<AgentReport | null>(null);

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

  const handleDeleteReport = useCallback(async (reportId: string) => {
    if (confirm('Delete this report? This cannot be undone.')) {
      await deleteReport(reportId);
    }
  }, [deleteReport]);

  // Only show enabled agents
  const enabledAgentSlugs = getEnabledAgents();
  const agentEntries = enabledAgentSlugs.map(slug => [slug, YOU_AGENTS[slug]] as [YouAgentSlug, typeof YOU_AGENTS[YouAgentSlug]]);

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
                <p className="text-gray-500">
                  Specialized AI assistants
                </p>
              </div>
            </div>
            <p className="mt-4 text-gray-600 max-w-2xl">
              Use AI agents to accelerate research, GTM planning, and execution. 
              Each agent is specialized for specific tasks to help you move faster.
            </p>
          </div>
        </div>

        {/* Feature Highlight */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-yellow-900" />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-900">AI-Powered Research</p>
              <p className="text-xs text-yellow-700">Get comprehensive briefs with real-time web research</p>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Agents</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Saved Reports</h2>
              {reports.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {reports.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            <SavedReportsList
              reports={reports}
              isLoading={reportsLoading}
              onViewReport={handleViewReport}
              onDeleteReport={handleDeleteReport}
            />
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">🚀 More Agents Coming Soon</h3>
          <p className="text-sm text-gray-600">
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
        />
      )}

      {activeModal === 'why_now' && (
        <WhyNowAgentModal
          open={true}
          onClose={handleCloseModal}
          onInsertToDoc={onInsertToDoc}
          savedReport={viewingReport}
        />
      )}

      {activeModal === 'deal_strategist' && (
        <DealStrategistModal
          open={true}
          onClose={handleCloseModal}
          onInsertToDoc={onInsertToDoc}
          savedReport={viewingReport}
        />
      )}
    </div>
  );
};

export default AgentsTab;
