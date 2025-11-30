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
  const isPro = config.tier === 'pro';

  // Determine gradient based on agent type
  const getGradient = () => {
    switch (slug) {
      case 'why_now':
        return 'from-amber-100 to-orange-100';
      case 'deal_strategist':
        return 'from-indigo-100 to-purple-100';
      default:
        return 'from-yellow-100 to-amber-100';
    }
  };

  const getButtonColor = () => {
    switch (slug) {
      case 'why_now':
        return canOpen 
          ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed';
      case 'deal_strategist':
        return canOpen 
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed';
      default:
        return canOpen
          ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
  };

  return (
    <div className={`
      border rounded-xl p-4 sm:p-5 flex flex-col justify-between bg-white shadow-sm
      transition-all duration-200
      ${canOpen ? 'hover:shadow-md hover:border-yellow-300 active:scale-[0.99]' : 'opacity-75'}
    `}>
      <div className="space-y-2 sm:space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${getGradient()} rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-inner flex-shrink-0`}>
            {config.icon}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {isPro && (
              <span className="text-[10px] sm:text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-0.5 sm:gap-1 font-medium shadow-sm">
                <Crown size={10} />
                Pro
              </span>
            )}
            {!isConfigured && (
              <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-0.5 sm:gap-1">
                <Settings size={10} />
                <span className="hidden sm:inline">Setup Required</span>
                <span className="sm:hidden">Setup</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{config.label}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
            {config.description}
          </p>
        </div>

        {/* Goals Preview */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {config.goals.slice(0, 3).map((goal) => (
            <span
              key={goal.value}
              className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded"
            >
              {goal.label}
            </span>
          ))}
          {config.goals.length > 3 && (
            <span className="text-[10px] sm:text-xs text-gray-400">
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
              flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-full border transition-colors
              ${config.enabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              }
            `}
          >
            {config.enabled ? <Zap size={12} /> : <ZapOff size={12} />}
            {config.enabled ? 'Active' : 'Inactive'}
          </button>
        )}

        {!isConfigured && (
          <span className="text-[10px] sm:text-xs text-gray-400">
            Configure in You.com
          </span>
        )}

        <button
          onClick={onOpen}
          disabled={!canOpen}
          className={`
            flex items-center justify-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-0 rounded-lg font-medium transition-colors
            ${getButtonColor()}
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
