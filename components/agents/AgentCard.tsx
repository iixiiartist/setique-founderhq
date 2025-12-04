// components/agents/AgentCard.tsx
// Reusable card component for displaying an agent

import React from 'react';
import { Zap, ZapOff, ExternalLink, Settings, Crown } from 'lucide-react';
import type { YouAgentConfig, YouAgentSlug } from '../../lib/config/youAgents';

interface AgentCardProps {
  slug: YouAgentSlug;
  config: YouAgentConfig;
  onOpen: () => void;
  onToggle?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  slug,
  config,
  onOpen,
  onToggle,
}) => {
  const isConfigured = Boolean(config.id);
  const canOpen = config.enabled && isConfigured;
  const isPro = config.tier === 'team-pro';

  return (
    <div className={`
      border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-white shadow-sm
      transition-all duration-200
      ${canOpen ? 'hover:shadow-md hover:border-gray-300' : 'opacity-75'}
    `}>
      <div className="space-y-2 sm:space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
            {config.icon}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {isPro && (
              <span className="text-[10px] sm:text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                <Crown size={10} />
                Pro
              </span>
            )}
            {!isConfigured && (
              <span className="text-[10px] sm:text-xs bg-gray-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Settings size={10} />
                <span className="hidden sm:inline">Setup Required</span>
                <span className="sm:hidden">Setup</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{config.label}</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">
            {config.description}
          </p>
        </div>

        {/* Goals Preview */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {config.goals.slice(0, 3).map((goal) => (
            <span
              key={goal.value}
              className="text-[10px] sm:text-xs bg-gray-100 text-slate-600 px-2 py-0.5 rounded-full"
            >
              {goal.label}
            </span>
          ))}
          {config.goals.length > 3 && (
            <span className="text-[10px] sm:text-xs text-slate-400">
              +{config.goals.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
        {onToggle && isConfigured && (
          <button
            onClick={onToggle}
            className={`
              flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-full border transition-colors font-medium
              ${config.enabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-gray-50 border-gray-200 text-slate-500 hover:bg-gray-100'
              }
            `}
          >
            {config.enabled ? <Zap size={12} /> : <ZapOff size={12} />}
            {config.enabled ? 'Active' : 'Inactive'}
          </button>
        )}

        {!isConfigured && (
          <span className="text-[10px] sm:text-xs text-slate-400">
            Configure in You.com
          </span>
        )}

        <button
          onClick={onOpen}
          disabled={!canOpen}
          className={`
            flex items-center justify-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl font-medium transition-all
            ${canOpen 
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
          `}
        >
          Open
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
