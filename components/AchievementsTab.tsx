import React, { useState, useEffect } from 'react';
import { GamificationData, AchievementId, WorkspaceAchievement } from '../types';
import { ACHIEVEMENTS } from '../constants';
import { User, Users } from 'lucide-react';
import TeamAchievements from './TeamAchievements';
import { DatabaseService } from '../lib/services/database';

interface AchievementsTabProps {
    gamification: GamificationData;
    workspaceId?: string;
    currentPlan?: string;
    onUpgrade?: () => void;
}

const AchievementCard: React.FC<{ details: typeof ACHIEVEMENTS[AchievementId], isUnlocked: boolean }> = ({ details, isUnlocked }) => {
    return (
        <div className={`p-4 border-2 border-black shadow-neo flex items-center gap-4 transition-all ${isUnlocked ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
            <div className={`text-4xl ${!isUnlocked && 'grayscale'}`}>{details.icon}</div>
            <div>
                <h3 className={`font-bold text-lg ${isUnlocked ? 'text-black' : 'text-gray-600'}`}>{details.title}</h3>
                <p className={`${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>{details.description}</p>
            </div>
            {isUnlocked && (
                <div className="ml-auto text-3xl text-green-500" role="img" aria-label="Completed">
                    ✔
                </div>
            )}
        </div>
    );
}

const AchievementsTab: React.FC<AchievementsTabProps> = ({ 
    gamification, 
    workspaceId,
    currentPlan = 'free',
    onUpgrade 
}) => {
    const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal');
    const [teamAchievements, setTeamAchievements] = useState<WorkspaceAchievement[]>([]);
    const [loading, setLoading] = useState(false);
    
    const achievementIds = Object.keys(ACHIEVEMENTS) as AchievementId[];
    
    // Check if user has access to team features
    const hasTeamAccess = currentPlan.includes('team');

    // Load team achievements when workspace ID is available
    useEffect(() => {
        const loadTeamAchievements = async () => {
            if (!workspaceId || activeTab !== 'team') return;
            
            setLoading(true);
            const { data } = await DatabaseService.getWorkspaceAchievements(workspaceId);
            setTeamAchievements(data || []);
            setLoading(false);
        };

        loadTeamAchievements();
    }, [workspaceId, activeTab]);

    return (
        <div className="space-y-6">
            {/* Tab Switcher - Only show Team tab if user has team access */}
            <div className="flex gap-2 border-2 border-black p-1 bg-gray-100 w-fit">
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-6 py-3 font-mono font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'personal'
                            ? 'bg-white border-2 border-black shadow-neo'
                            : 'bg-transparent hover:bg-white/50'
                    }`}
                >
                    <User className="w-5 h-5" />
                    My Achievements
                </button>
                {hasTeamAccess && (
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`px-6 py-3 font-mono font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'team'
                                ? 'bg-white border-2 border-black shadow-neo'
                                : 'bg-transparent hover:bg-white/50'
                        }`}
                    >
                        <Users className="w-5 h-5" />
                        Team Achievements
                    </button>
                )}
            </div>

            {/* Personal Achievements */}
            {activeTab === 'personal' && (
                <div className="bg-white p-6 border-2 border-black shadow-neo">
                    <h2 className="text-2xl font-semibold text-black mb-6">🏆 Trophy Room</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {achievementIds.map(id => (
                            <AchievementCard 
                                key={id}
                                details={ACHIEVEMENTS[id]}
                                isUnlocked={gamification.achievements.includes(id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Team Achievements */}
            {activeTab === 'team' && hasTeamAccess && (
                loading ? (
                    <div className="bg-white p-12 border-2 border-black shadow-neo text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="font-mono text-gray-600">Loading team achievements...</p>
                    </div>
                ) : (
                    <TeamAchievements
                        unlockedAchievements={teamAchievements}
                        currentPlan={currentPlan}
                    />
                )
            )}
        </div>
    );
};

export default AchievementsTab;