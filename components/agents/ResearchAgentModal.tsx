// components/agents/ResearchAgentModal.tsx
// Modal for running the Research & Briefing agent

import React, { useState, useCallback } from 'react';
import { X, Loader2, Globe, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { useYouAgent } from '../../hooks/useYouAgent';
import { YOU_AGENTS } from '../../lib/config/youAgents';
import { AgentResponsePresenter } from './AgentResponsePresenter';

interface ResearchAgentModalProps {
  open: boolean;
  onClose: () => void;
  onInsertToDoc?: (content: string) => void;
  initialTarget?: string;
}

type GoalType = 'icp' | 'competitive' | 'angles' | 'market';

const GOAL_PROMPTS: Record<GoalType, string> = {
  icp: 'Analyze ideal customer profile, key pain points, buying triggers, and decision-making criteria.',
  competitive: 'Provide competitive landscape analysis, market positioning, key differentiators, and threats.',
  angles: 'Generate outreach angles, value propositions, and messaging hooks for sales engagement.',
  market: 'Summarize market trends, growth drivers, challenges, and emerging opportunities.',
};

export const ResearchAgentModal: React.FC<ResearchAgentModalProps> = ({
  open,
  onClose,
  onInsertToDoc,
  initialTarget = '',
}) => {
  const agentConfig = YOU_AGENTS.research_briefing;
  const { run, loading, error, errorCode, lastResponse, resetIn, reset } = useYouAgent('research_briefing');

  const [target, setTarget] = useState(initialTarget);
  const [urls, setUrls] = useState('');
  const [goal, setGoal] = useState<GoalType>('icp');
  const [notes, setNotes] = useState('');

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!target.trim()) return;

    // Build the prompt
    const input = buildPrompt({ target: target.trim(), goal, notes: notes.trim() });
    
    // Build context
    const context = {
      urls: urls.split(',').map((u) => u.trim()).filter(Boolean),
      founderhq_context: {
        goal,
        notes: notes.trim(),
      },
    };

    try {
      await run(input, context);
    } catch (err) {
      // Error is already handled by the hook
      console.error('[ResearchAgentModal] Run failed:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center text-xl">
              {agentConfig.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{agentConfig.label}</h2>
              <p className="text-sm text-gray-500">Powered by You.com AI</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!lastResponse ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company / Market / Topic <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={agentConfig.placeholder}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    URLs to analyze (optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder="https://example.com, https://blog.example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">Comma-separated URLs for deeper analysis</p>
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Research Goal
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors bg-white"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as GoalType)}
                  >
                    {agentConfig.goals.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional Context (optional)
                </label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors resize-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Our product: AI GTM hub for SaaS founders doing $1–10M ARR. Focus on enterprise sales angles."
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">{error}</p>
                    {errorCode === 'rate_limit' && resetIn && (
                      <p className="text-xs text-red-600 mt-1">
                        Try again in {resetIn} seconds
                      </p>
                    )}
                    {errorCode === 'config' && (
                      <p className="text-xs text-red-600 mt-1">
                        Please contact support to configure this agent.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles size={12} />
                  Results typically take 30-90 seconds for comprehensive research
                </p>
                <button
                  type="submit"
                  disabled={loading || !target.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Researching (may take up to 60s)...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Run Briefing
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* New Research Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Research: <span className="text-gray-900">{target}</span>
                </h3>
                <button
                  onClick={() => reset()}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  ← New Research
                </button>
              </div>

              {/* Response */}
              <AgentResponsePresenter 
                response={lastResponse} 
                onInsertToDoc={onInsertToDoc}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function buildPrompt(params: {
  target: string;
  goal: GoalType;
  notes: string;
}): string {
  const { target, goal, notes } = params;
  const goalPrompt = GOAL_PROMPTS[goal];

  return [
    `Research target: ${target}`,
    ``,
    `Goal: ${goalPrompt}`,
    ``,
    notes ? `Additional context from user: ${notes}` : '',
    ``,
    `Please provide a concise, GTM-ready brief with actionable insights. Use clear sections and bullet points.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default ResearchAgentModal;
