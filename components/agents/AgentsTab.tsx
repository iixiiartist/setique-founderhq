// components/agents/AgentsTab.tsx
// Main Agents tab - grid of AI agents available in FounderHQ

import React, { useState, useCallback } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { YOU_AGENTS, getEnabledAgents, type YouAgentSlug } from '../../lib/config/youAgents';
import { AgentCard } from './AgentCard';
import { ResearchAgentModal } from './ResearchAgentModal';
import type { AppActions } from '../../types';

interface AgentsTabProps {
  actions?: AppActions;
  onInsertToDoc?: (content: string) => void;
}

export const AgentsTab: React.FC<AgentsTabProps> = ({ actions, onInsertToDoc }) => {
  const [activeModal, setActiveModal] = useState<YouAgentSlug | null>(null);

  const handleOpenAgent = useCallback((slug: YouAgentSlug) => {
    setActiveModal(slug);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

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
        />
      )}

      {/* Add more modals for other agents as they're implemented */}
    </div>
  );
};

export default AgentsTab;
