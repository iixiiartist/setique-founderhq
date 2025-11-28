// components/agents/DealStrategistModal.tsx
// Modal for running the Deal & Account Strategist agent

import React, { useState, useCallback, useEffect } from 'react';
import { X, Loader2, FileText, AlertCircle, Sparkles, Save, Check, Download, FolderPlus, ChevronDown, Target, AlertTriangle, Users } from 'lucide-react';
import { useYouAgent } from '../../hooks/useYouAgent';
import { useAgentReports } from '../../hooks/useAgentReports';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { YOU_AGENTS } from '../../lib/config/youAgents';
import { AgentResponsePresenter } from './AgentResponsePresenter';
import { exportReportToHtml, exportReportToPdf, saveReportToFileLibrary } from '../../lib/services/agentReportExport';
import type { AgentReport } from '../../lib/services/agentReportService';
import type { RunAgentResponse } from '../../lib/services/youAgentClient';

interface DealStrategistModalProps {
  open: boolean;
  onClose: () => void;
  onInsertToDoc?: (content: string) => void;
  initialTarget?: string;
  savedReport?: AgentReport | null;
  // Optional pre-filled data from CRM
  accountData?: {
    name?: string;
    industry?: string;
    size?: string;
    stage?: string;
    value?: string;
    contacts?: string;
    notes?: string;
  };
}

type GoalType = 'strategy' | 'risks' | 'outreach' | 'next_steps';

const GOAL_PROMPTS: Record<GoalType, string> = {
  strategy: 'Provide comprehensive deal strategy including positioning, value alignment, and win path.',
  risks: 'Identify pipeline risks, gaps, and weaknesses. Flag missing information and blockers.',
  outreach: 'Generate outreach guidance, messaging angles, and communication approach.',
  next_steps: 'Focus on actionable next moves and task recommendations.',
};

export const DealStrategistModal: React.FC<DealStrategistModalProps> = ({
  open,
  onClose,
  onInsertToDoc,
  initialTarget = '',
  savedReport = null,
  accountData,
}) => {
  const agentConfig = YOU_AGENTS.deal_strategist;
  const { run, loading, error, errorCode, lastResponse, resetIn, reset } = useYouAgent('deal_strategist');
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { saveReport, isSaving } = useAgentReports(workspace?.id, user?.id);

  const [target, setTarget] = useState(initialTarget || accountData?.name || '');
  const [goal, setGoal] = useState<GoalType>('strategy');
  const [dealContext, setDealContext] = useState('');
  const [reportSaved, setReportSaved] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  // If viewing a saved report, create a response object from it
  const displayResponse: RunAgentResponse | null = savedReport 
    ? {
        output: savedReport.output,
        sources: savedReport.sources,
        metadata: savedReport.metadata,
      }
    : lastResponse;

  // Initialize with account data if provided
  useEffect(() => {
    if (accountData && !savedReport) {
      const contextParts: string[] = [];
      if (accountData.name) contextParts.push(`Account: ${accountData.name}`);
      if (accountData.industry) contextParts.push(`Industry: ${accountData.industry}`);
      if (accountData.size) contextParts.push(`Company Size: ${accountData.size}`);
      if (accountData.stage) contextParts.push(`Deal Stage: ${accountData.stage}`);
      if (accountData.value) contextParts.push(`Deal Value: ${accountData.value}`);
      if (accountData.contacts) contextParts.push(`Key Contacts: ${accountData.contacts}`);
      if (accountData.notes) contextParts.push(`Notes: ${accountData.notes}`);
      
      if (contextParts.length > 0) {
        setDealContext(contextParts.join('\n'));
      }
    }
  }, [accountData, savedReport]);

  // Reset saved state when modal opens fresh
  useEffect(() => {
    if (savedReport) {
      setTarget(savedReport.target);
      setGoal(savedReport.goal as GoalType);
      setDealContext(savedReport.notes || '');
      setCurrentReportId(savedReport.id);
      setReportSaved(true);
      setSavedToLibrary(false);
    } else {
      setReportSaved(false);
      setCurrentReportId(null);
      setSavedToLibrary(false);
    }
  }, [savedReport]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowExportMenu(false);
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

  const handleClose = useCallback(() => {
    reset();
    setTarget('');
    setGoal('strategy');
    setDealContext('');
    setReportSaved(false);
    setCurrentReportId(null);
    onClose();
  }, [reset, onClose]);

  const handleSaveReport = useCallback(async () => {
    if (!displayResponse?.output || reportSaved || currentReportId) return;

    const saved = await saveReport({
      agentSlug: 'deal_strategist',
      target: target.trim(),
      goal,
      notes: dealContext.trim() || undefined,
      urls: [],
      output: displayResponse.output,
      sources: displayResponse.sources,
      metadata: displayResponse.metadata,
    });

    if (saved) {
      setReportSaved(true);
      setCurrentReportId(saved.id);
    }
  }, [displayResponse, reportSaved, currentReportId, saveReport, target, goal, dealContext]);

  // Build report object for exports
  const getReportForExport = useCallback((): AgentReport | null => {
    if (savedReport) return savedReport;
    if (!displayResponse?.output) return null;
    
    return {
      id: currentReportId || 'temp',
      workspace_id: workspace?.id || '',
      user_id: user?.id || '',
      agent_slug: 'deal_strategist',
      target: target.trim(),
      goal,
      notes: dealContext.trim() || null,
      urls: [],
      output: displayResponse.output,
      sources: displayResponse.sources || [],
      metadata: displayResponse.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [savedReport, displayResponse, currentReportId, workspace, user, target, goal, dealContext]);

  const handleExportHtml = useCallback(() => {
    const report = getReportForExport();
    if (!report) return;
    exportReportToHtml(report, { title: `Deal Strategy: ${target.trim()}` });
    setShowExportMenu(false);
  }, [getReportForExport, target]);

  const handleExportPdf = useCallback(async () => {
    const report = getReportForExport();
    if (!report) return;
    
    setExportingPdf(true);
    try {
      await exportReportToPdf(report, { title: `Deal Strategy: ${target.trim()}` });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
      setShowExportMenu(false);
    }
  }, [getReportForExport, target]);

  const handleSaveToLibrary = useCallback(async () => {
    const report = getReportForExport();
    if (!report || !user?.id || !workspace?.id) return;
    
    setSavingToLibrary(true);
    try {
      const result = await saveReportToFileLibrary(report, user.id, workspace.id);
      if (result.success) {
        setSavedToLibrary(true);
      } else {
        console.error('Failed to save to library:', result.error);
      }
    } catch (err) {
      console.error('Save to library failed:', err);
    } finally {
      setSavingToLibrary(false);
      setShowExportMenu(false);
    }
  }, [getReportForExport, user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!target.trim() && !dealContext.trim()) return;

    // Build the prompt with deal context
    const input = buildPrompt({ target: target.trim(), goal, dealContext: dealContext.trim() });
    
    // Build context (no URLs needed for this agent)
    const context = {
      founderhq_context: {
        goal,
        deal_context: dealContext.trim(),
      },
    };

    try {
      await run(input, context);
    } catch (err) {
      console.error('[DealStrategistModal] Run failed:', err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-xl">
              {agentConfig.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{agentConfig.label}</h2>
              <p className="text-sm text-gray-500">Turn CRM data into actionable deal strategy</p>
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
          {!displayResponse ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account / Opportunity Name
                </label>
                <div className="relative">
                  <Target size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="e.g. Acme Corp - Enterprise Deal"
                  />
                </div>
              </div>

              {/* Goal Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Analysis Focus
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {agentConfig.goals.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(g.value as GoalType)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        goal === g.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deal Context - Main Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Deal / Account Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors resize-none font-mono"
                  rows={8}
                  value={dealContext}
                  onChange={(e) => setDealContext(e.target.value)}
                  placeholder={`Paste account details, opportunity info, or deal notes:

Account: Acme Corp
Industry: Fintech
Stage: Discovery
Value: $50k ARR
Champion: Sarah (VP Ops)
Economic Buyer: Unknown
Last Activity: Demo call 11/20
Notes: They're evaluating 3 vendors...`}
                  required={!target.trim()}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Include: account info, deal stage, contacts, notes, call summaries, emails
                </p>
              </div>

              {/* Context Tips */}
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-1">For best results, include:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-indigo-700">
                      <li>Deal stage and pipeline value</li>
                      <li>Key contacts and their roles (buyer, champion, blocker)</li>
                      <li>Recent activity and meeting notes</li>
                      <li>Known pains or requirements</li>
                    </ul>
                  </div>
                </div>
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
                  <Users size={12} />
                  Works best with detailed CRM context
                </p>
                <button
                  type="submit"
                  disabled={loading || (!target.trim() && !dealContext.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analyzing deal...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Get Strategy
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Header with actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Strategy: <span className="text-gray-900">{target || 'Deal Analysis'}</span>
                  {savedReport && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      Saved
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Export dropdown */}
                  {displayResponse?.output && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExportMenu(!showExportMenu);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <Download size={14} />
                        Export
                        <ChevronDown size={12} />
                      </button>
                      
                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <button
                            onClick={handleExportHtml}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          >
                            <FileText size={14} />
                            Export as HTML
                          </button>
                          <button
                            onClick={handleExportPdf}
                            disabled={exportingPdf}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left disabled:opacity-50"
                          >
                            {exportingPdf ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                            {exportingPdf ? 'Exporting...' : 'Export as PDF'}
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={handleSaveToLibrary}
                            disabled={savingToLibrary || savedToLibrary}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left disabled:opacity-50"
                          >
                            {savedToLibrary ? (
                              <>
                                <Check size={14} className="text-green-500" />
                                Saved to Library
                              </>
                            ) : savingToLibrary ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <FolderPlus size={14} />
                                Save to File Library
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Save button - only show for new reports */}
                  {!savedReport && displayResponse?.output && (
                    <button
                      onClick={handleSaveReport}
                      disabled={isSaving || reportSaved}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      {reportSaved ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          Saved
                        </>
                      ) : isSaving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Save Report
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      reset();
                      setReportSaved(false);
                      setCurrentReportId(null);
                      setSavedToLibrary(false);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    ← New Analysis
                  </button>
                </div>
              </div>

              {/* Response */}
              <AgentResponsePresenter 
                response={displayResponse!} 
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
  dealContext: string;
}): string {
  const { target, goal, dealContext } = params;
  const goalPrompt = GOAL_PROMPTS[goal];

  return [
    target ? `Account/Opportunity: ${target}` : '',
    ``,
    `Analysis focus: ${goalPrompt}`,
    ``,
    `CRM Context:`,
    dealContext,
    ``,
    `Provide structured output with: Deal Snapshot, Risks & Gaps, Recommended Next Moves, Messaging Angle, and Suggested FounderHQ Tasks.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default DealStrategistModal;
