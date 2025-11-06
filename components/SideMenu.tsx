import React from 'react';
import { NAV_ITEMS, TabType, Tab } from '../constants';
import { GamificationData, PlanType } from '../types';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: TabType;
    onSwitchTab: (tab: TabType) => void;
    gamification: GamificationData;
    onProgressBarClick: () => void;
    workspacePlan?: PlanType;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, activeTab, onSwitchTab, gamification, onProgressBarClick, workspacePlan }) => {
    const activeClass = "text-blue-500 border-black bg-gray-100";
    const inactiveClass = "text-gray-600 border-transparent";

    const levelThreshold = (level: number) => 100 * level + Math.pow(level, 2) * 50;
    const currentLevelThreshold = levelThreshold(gamification.level);
    const progressPercentage = Math.min(100, (gamification.xp / currentLevelThreshold) * 100);
    
    // Filter out Documents tab for free users
    const filteredNavItems = NAV_ITEMS.filter(item => {
        if (item.id === Tab.Documents && workspacePlan === 'free') {
            return false;
        }
        return true;
    });
    
    return (
        <>
            {/* Backdrop overlay - only shows when menu is open */}
            <div 
                className={`fixed inset-0 bg-black z-40 transition-opacity ${isOpen ? 'opacity-30 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Menu content - slides in from left */}
            <div 
                id="menu-content" 
                className={`fixed top-0 left-0 w-4/5 max-w-sm sm:max-w-md lg:max-w-lg h-full bg-white border-r-2 border-black shadow-neo-lg z-50 transition-transform duration-300 ease-in-out p-4 sm:p-6 flex flex-col overflow-y-auto custom-scrollbar ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold">Menu</h2>
                    <button onClick={onClose} className="text-3xl hover:text-gray-600 transition-colors" aria-label="Close menu">&times;</button>
                </div>
                <nav className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    {filteredNavItems.map(item => (
                        <a 
                            key={item.id} 
                            href="#" 
                            className={`block p-3 text-lg font-mono font-semibold rounded-none border-2 transition-all my-2 ${activeTab === item.id ? activeClass : inactiveClass} hover:bg-gray-100 hover:text-black`}
                            onClick={(e) => {
                                e.preventDefault();
                                onSwitchTab(item.id);
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
                <div className="mt-auto pt-4 border-t-2 border-dashed border-black">
                     <button 
                        onClick={onProgressBarClick} 
                        className="w-full mb-4 text-left cursor-pointer group"
                        aria-label="View open tasks"
                     >
                        <div className="flex justify-between items-end mb-1 font-mono">
                            <span className="font-semibold">Founder Lvl. {gamification.level}</span>
                            <span className="text-sm">{Math.floor(gamification.xp)} / {Math.floor(currentLevelThreshold)} XP</span>
                        </div>
                        <div className="w-full bg-gray-200 border-2 border-black h-4 group-hover:border-blue-500 transition-colors">
                            <div className="bg-blue-500 h-full" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </button>
                    <div className="text-sm text-gray-500 font-mono">
                        User ID: solo-founder-001
                    </div>
                </div>
            </div>
        </>
    );
};

export default SideMenu;