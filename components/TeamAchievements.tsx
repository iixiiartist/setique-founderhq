import React, { useState } from 'react';
import { WorkspaceAchievement, TeamAchievementId } from '../types';
import { TEAM_ACHIEVEMENTS } from '../constants';
import { Trophy, Lock, TrendingUp, Users, DollarSign, Zap, Target } from 'lucide-react';

interface TeamAchievementsProps {
    unlockedAchievements: WorkspaceAchievement[];
    currentPlan: string;
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'team-building':
            return <Users className="w-5 h-5" />;
        case 'collaboration':
            return <Target className="w-5 h-5" />;
        case 'financial':
            return <DollarSign className="w-5 h-5" />;
        case 'productivity':
            return <TrendingUp className="w-5 h-5" />;
        case 'engagement':
            return <Zap className="w-5 h-5" />;
        default:
            return <Trophy className="w-5 h-5" />;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'team-building':
            return 'bg-purple-100 border-purple-300 text-purple-800';
        case 'collaboration':
            return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'financial':
            return 'bg-green-100 border-green-300 text-green-800';
        case 'productivity':
            return 'bg-orange-100 border-orange-300 text-orange-800';
        case 'engagement':
            return 'bg-pink-100 border-pink-300 text-pink-800';
        default:
            return 'bg-gray-100 border-gray-300 text-gray-800';
    }
};

const getTierBadge = (tier: number) => {
    const colors = {
        1: 'bg-gray-200 text-gray-700',
        2: 'bg-blue-200 text-blue-700',
        3: 'bg-purple-200 text-purple-700',
        4: 'bg-yellow-200 text-yellow-700'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${colors[tier as keyof typeof colors]}`}>
            Tier {tier}
        </span>
    );
};

const UnlockedAchievementCard: React.FC<{ achievement: WorkspaceAchievement }> = ({ achievement }) => {
    const details = TEAM_ACHIEVEMENTS[achievement.achievementId];
    const unlockedDate = new Date(achievement.unlockedAt);
    
    return (
        <div className={`p-4 border-2 border-black shadow-neo ${getCategoryColor(details.category)}`}>
            <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">
                    {details.icon || '🏆'}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{details.name}</h3>
                        {getTierBadge(details.tier)}
                        <div className="ml-auto text-green-600 text-2xl">✓</div>
                    </div>
                    <p className="text-sm mb-2">{details.description}</p>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            <span>+{details.xpReward} XP</span>
                        </div>
                        <div>
                            Unlocked: {unlockedDate.toLocaleDateString()}
                        </div>
                        {achievement.unlockedByName && (
                            <div>
                                By: <span className="font-bold">{achievement.unlockedByName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProgressAchievementCard: React.FC<{ 
    achievementId: TeamAchievementId;
    progress: number;
    total: number;
}> = ({ achievementId, progress, total }) => {
    const details = TEAM_ACHIEVEMENTS[achievementId];
    const percentage = Math.min(100, (progress / total) * 100);
    
    return (
        <div className="p-4 border-2 border-black shadow-neo bg-white">
            <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0 grayscale opacity-60">
                    {details.icon || '🏆'}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-700">{details.name}</h3>
                        {getTierBadge(details.tier)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{details.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-2">
                        <div className="h-3 w-full border-2 border-black bg-gray-100">
                            <div 
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
                        <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            <span>+{details.xpReward} XP</span>
                        </div>
                        <div>
                            Progress: {progress} / {total} ({Math.round(percentage)}%)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LockedAchievementCard: React.FC<{ 
    achievementId: TeamAchievementId;
}> = ({ achievementId }) => {
    const details = TEAM_ACHIEVEMENTS[achievementId];
    
    return (
        <div className="p-4 border-2 border-black shadow-neo bg-gray-50 opacity-60">
            <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0 grayscale">
                    {details.icon || '🏆'}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-4 h-4 text-gray-500" />
                        <h3 className="font-bold text-lg text-gray-500">{details.name}</h3>
                        {getTierBadge(details.tier)}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{details.description}</p>
                    
                    <div className="bg-gray-100 border-2 border-gray-300 p-2">
                        <p className="text-xs font-mono text-gray-600">
                            🔒 Complete the requirements to unlock this achievement
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TeamAchievements: React.FC<TeamAchievementsProps> = ({ 
    unlockedAchievements, 
    currentPlan
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    const isTeamPlan = currentPlan.includes('team');
    const allAchievementIds = Object.keys(TEAM_ACHIEVEMENTS) as TeamAchievementId[];
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));
    
    // Filter achievements by category
    const filteredAchievements = allAchievementIds.filter(id => {
        if (selectedCategory === 'all') return true;
        return TEAM_ACHIEVEMENTS[id].category === selectedCategory;
    });
    
    // Separate unlocked and locked
    const unlocked = unlockedAchievements.filter(a => 
        selectedCategory === 'all' || TEAM_ACHIEVEMENTS[a.achievementId].category === selectedCategory
    );
    const locked = filteredAchievements.filter(id => !unlockedIds.has(id));
    
    // Calculate stats
    const totalXP = unlockedAchievements.reduce((sum, a) => 
        sum + (TEAM_ACHIEVEMENTS[a.achievementId]?.xpReward || 0), 0
    );
    
    const categories = [
        { id: 'all', label: 'All', icon: <Trophy className="w-4 h-4" /> },
        { id: 'team-building', label: 'Team Building', icon: <Users className="w-4 h-4" /> },
        { id: 'collaboration', label: 'Collaboration', icon: <Target className="w-4 h-4" /> },
        { id: 'financial', label: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'productivity', label: 'Productivity', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'engagement', label: 'Engagement', icon: <Zap className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 border-2 border-black shadow-neo p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold font-mono mb-2">🏆 Team Achievements</h2>
                        <p className="text-sm opacity-90">
                            Unlock achievements by working together as a team
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold font-mono">{unlocked.length}/{allAchievementIds.length}</div>
                        <div className="text-xs opacity-90">Unlocked</div>
                        <div className="mt-2 text-yellow-300 font-bold">+{totalXP} Team XP</div>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 border-2 border-black font-mono font-bold transition-all flex items-center gap-2 ${
                            selectedCategory === cat.id
                                ? 'bg-blue-600 text-white shadow-neo'
                                : 'bg-white hover:bg-gray-100'
                        }`}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Unlocked Achievements */}
            {unlocked.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold font-mono mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-green-600" />
                        Unlocked ({unlocked.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {unlocked.map(achievement => (
                            <UnlockedAchievementCard 
                                key={achievement.id} 
                                achievement={achievement}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* In Progress (Placeholder - would need actual progress tracking) */}
            {/* You can add this later when you implement progress tracking */}

            {/* Locked Achievements */}
            {locked.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold font-mono mb-3 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-gray-500" />
                        Locked ({locked.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {locked.map(id => (
                            isTeamPlan ? (
                                <ProgressAchievementCard
                                    key={id}
                                    achievementId={id}
                                    progress={0}
                                    total={100}
                                />
                            ) : (
                                <LockedAchievementCard
                                    key={id}
                                    achievementId={id}
                                />
                            )
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {unlocked.length === 0 && locked.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-mono">No achievements in this category yet.</p>
                </div>
            )}
        </div>
    );
};

export default TeamAchievements;
