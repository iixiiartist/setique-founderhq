// components/agents/AgentsTab.tsx
// Main Agents tab - grid of AI agents available in FounderHQ

import React, { useState, useCallback } from 'react';
import { Bot, Sparkles, HelpCircle, ExternalLink } from 'lucide-react';
import { YOU_AGENTS, type YouAgentSlug } from '../../lib/config/youAgents';
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

  const agentEntries = Object.entries(YOU_AGENTS) as [YouAgentSlug, typeof YOU_AGENTS[YouAgentSlug]][];
  const enabledCount = agentEntries.filter(([_, config]) => config.enabled && config.id).length;

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
                  {enabledCount} agent{enabledCount !== 1 ? 's' : ''} active
                </p>
              </div>
            </div>
            <p className="mt-4 text-gray-600 max-w-2xl">
              Activate and use AI agents to accelerate research, GTM planning, and execution. 
              Each agent is specialized for specific tasks and powered by You.com's AI.
            </p>
          </div>

          <a
            href="https://you.com/agents"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <HelpCircle size={16} />
            Create Custom Agent
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{enabledCount}</p>
                <p className="text-sm text-gray-500">Active Agents</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Bot size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{agentEntries.length}</p>
                <p className="text-sm text-gray-500">Total Agents</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-yellow-900" />
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-900">Powered by You.com</p>
                <p className="text-xs text-yellow-700">Custom AI Agents Platform</p>
              </div>
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

        {/* Coming Soon / Help Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">🚀 More Agents Coming Soon</h3>
          <p className="text-sm text-gray-600 mb-4">
            We're building specialized agents for competitive intelligence, outreach optimization, 
            pricing strategy, and more. Have an idea for an agent?
          </p>
          <div className="flex gap-3">
            <a
              href="https://you.com/agents/create"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              Create your own agent
              <ExternalLink size={12} />
            </a>
            <span className="text-gray-300">|</span>
            <button className="text-sm text-gray-600 hover:text-gray-800">
              Request an agent
            </button>
          </div>
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
