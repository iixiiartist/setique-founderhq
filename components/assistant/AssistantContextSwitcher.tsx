import React from 'react';
import { TabType } from '../../constants';
import { ASSISTANT_CONFIGS } from './assistantConfig';
import { ChevronDown } from 'lucide-react';
import './animations.css';

interface AssistantContextSwitcherProps {
  currentTab: TabType;
  onChange: (tab: TabType) => void;
  className?: string;
}

export const AssistantContextSwitcher: React.FC<AssistantContextSwitcherProps> = ({
  currentTab,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentConfig = ASSISTANT_CONFIGS.find(config => config.tab === currentTab);
  
  // Filter to only show assistants that exist
  const availableAssistants = ASSISTANT_CONFIGS;
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2
          bg-white border-2 border-black
          shadow-neo-sm hover:shadow-neo-md
          transition-all duration-150
          font-bold text-sm
        "
        aria-label="Switch assistant context"
        aria-expanded={isOpen}
      >
        <span className="text-base">{currentConfig?.icon || '✨'}</span>
        <span>{currentConfig?.title || 'AI Assistant'}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div
            className="
              absolute top-full left-0 mt-2 z-20
              min-w-[200px]
              bg-white border-3 border-black
              shadow-neo-xl
              dropdown-spring
              gpu-accelerate
            "
            role="menu"
          >
            {availableAssistants.map((config) => {
              const isActive = config.tab === currentTab;
              
              return (
                <button
                  key={config.tab}
                  onClick={() => {
                    onChange(config.tab);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3
                    text-left text-sm font-medium
                    border-b-2 border-black last:border-b-0
                    transition-colors
                    ${isActive 
                      ? `bg-${config.color}-100 text-${config.color}-900`
                      : 'hover:bg-gray-100'
                    }
                  `}
                  role="menuitem"
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className="flex-1">{config.title}</span>
                  {isActive && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
