// components/agents/AgentCard.tsx
// Reusable card component for displaying an agent

import React from 'react';
import { Zap, ZapOff, ExternalLink, Settings } from 'lucide-react';
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

  return (
    <div className={`
      border rounded-xl p-5 flex flex-col justify-between bg-white shadow-sm
      transition-all duration-200
      ${canOpen ? 'hover:shadow-md hover:border-yellow-300' : 'opacity-75'}
    `}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center text-2xl shadow-inner">
            {config.icon}
          </div>
          {!isConfigured && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
              <Settings size={10} />
              Setup Required
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-gray-900">{config.label}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {config.description}
          </p>
        </div>

        {/* Goals Preview */}
        <div className="flex flex-wrap gap-1.5">
          {config.goals.slice(0, 3).map((goal) => (
            <span
              key={goal.value}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
            >
              {goal.label}
            </span>
          ))}
          {config.goals.length > 3 && (
            <span className="text-xs text-gray-400">
              +{config.goals.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
        {onToggle && isConfigured && (
          <button
            onClick={onToggle}
            className={`
              flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors
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
          <span className="text-xs text-gray-400">
            Configure in You.com
          </span>
        )}

        <button
          onClick={onOpen}
          disabled={!canOpen}
          className={`
            flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors
            ${canOpen
              ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
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
