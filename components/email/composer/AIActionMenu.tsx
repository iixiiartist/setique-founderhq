import React, { forwardRef } from 'react';
import {
    Wand2,
    Sparkles,
    Minimize,
    Maximize,
    Briefcase,
    Heart,
    Search,
    Lightbulb
} from 'lucide-react';
import { AI_ACTIONS } from './constants';
import type { AIAction } from './constants';

interface AIActionMenuProps {
    position: { top: number; left: number };
    onAction: (action: AIAction['action']) => void;
    onClose: () => void;
}

const iconMap: Record<AIAction['action'], React.ReactNode> = {
    draft: <Wand2 className="w-4 h-4" />,
    improve: <Sparkles className="w-4 h-4" />,
    shorten: <Minimize className="w-4 h-4" />,
    expand: <Maximize className="w-4 h-4" />,
    formal: <Briefcase className="w-4 h-4" />,
    friendly: <Heart className="w-4 h-4" />,
    research: <Search className="w-4 h-4" />,
    suggest: <Lightbulb className="w-4 h-4" />,
};

export const AIActionMenu = forwardRef<HTMLDivElement, AIActionMenuProps>(
    ({ position, onAction, onClose }, ref) => {
        return (
            <div
                ref={ref}
                className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl w-64 py-1 overflow-hidden"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                }}
            >
                <div className="px-3 py-2 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Sparkles className="w-4 h-4 text-gray-600" />
                        AI Email Assistant
                    </div>
                </div>
                <div className="py-1">
                    {AI_ACTIONS.map((action) => (
                        <button
                            key={action.action}
                            onClick={() => {
                                onAction(action.action);
                                onClose();
                            }}
                            className="w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <span className="text-gray-600">
                                {iconMap[action.action]}
                            </span>
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                    {action.label}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {action.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }
);

AIActionMenu.displayName = 'AIActionMenu';

export default AIActionMenu;
