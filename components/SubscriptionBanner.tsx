import React, { useEffect, useState } from 'react';
import {
    PLAN_LIMITS,
    formatPrice,
    formatBytes,
    getUsagePercentage,
    isApproachingLimit,
    isLimitExceeded,
    PlanType
} from '../lib/subscriptionConstants';
import { supabase } from '../lib/supabase';

interface SubscriptionBannerProps {
    planType: PlanType;
    aiRequestsUsed: number;
    storageUsed: number;
    fileCountUsed: number;
    seatCount?: number;
    usedSeats?: number;
    onUpgrade: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
    planType,
    aiRequestsUsed,
    storageUsed,
    fileCountUsed,
    seatCount,
    usedSeats,
    onUpgrade
}) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_admin')
                        .eq('id', user.id)
                        .maybeSingle();
                    
                    setIsAdmin(profile?.is_admin || false);
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAdminStatus();
    }, []);

    // Show admin banner if user is admin
    if (isAdmin && !isLoading) {
        return (
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 border-2 border-black shadow-neo p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">👑</div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Admin Access
                                <span className="text-xs bg-white text-black px-2 py-1 border border-black font-mono">UNLIMITED</span>
                            </h3>
                            <p className="text-sm text-white mt-1 font-mono">
                                You have full access to all features with no limits
                            </p>
                        </div>
                    </div>
                    <div className="text-white text-sm font-mono bg-black bg-opacity-20 px-4 py-2 border border-white">
                        ∞ AI • ∞ Storage • ∞ Files
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <div className="bg-gray-100 border-2 border-black p-4 mb-6 animate-pulse h-32" />;
    }

    const limits = PLAN_LIMITS[planType];
    const isTeamPlan = planType.startsWith('team-');

    const aiUsagePercent = getUsagePercentage(aiRequestsUsed, limits.aiRequestsPerMonth);
    const storageUsagePercent = getUsagePercentage(storageUsed, limits.storageBytes);
    const fileUsagePercent = getUsagePercentage(fileCountUsed, limits.fileCount);

    const showAiWarning = isApproachingLimit(aiRequestsUsed, limits.aiRequestsPerMonth) || isLimitExceeded(aiRequestsUsed, limits.aiRequestsPerMonth);
    const showStorageWarning = isApproachingLimit(storageUsed, limits.storageBytes) || isLimitExceeded(storageUsed, limits.storageBytes);
    const showFileWarning = isApproachingLimit(fileCountUsed, limits.fileCount) || isLimitExceeded(fileCountUsed, limits.fileCount);

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-red-600';
        if (percentage >= 80) return 'bg-yellow-400';
        return 'bg-blue-600';
    };

    const renderUsageBar = (label: string, used: number, limit: number | null, formatFn?: (val: number) => string) => {
        const percentage = getUsagePercentage(used, limit);
        const displayUsed = formatFn ? formatFn(used) : used.toLocaleString();
        const displayLimit = limit === null ? '∞' : (formatFn ? formatFn(limit) : limit.toLocaleString());
        const isUnlimited = limit === null;

        return (
            <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs text-black font-bold mb-1">
                    <span>{label}</span>
                    <span className={isUnlimited ? 'text-green-600' : ''}>{displayUsed} / {displayLimit}</span>
                </div>
                <div className="w-full bg-gray-200 border-2 border-black h-6">
                    <div
                        className={`h-full transition-all ${isUnlimited ? 'bg-green-600' : getProgressColor(percentage)}`}
                        style={{ width: `${isUnlimited ? 100 : Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white border-2 border-black shadow-neo p-4 mb-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-black flex items-center gap-2">
                        {limits.name} Plan
                        {planType === 'free' && (
                            <span className="text-xs bg-gray-200 text-black px-2 py-1 border border-black font-mono">FREE</span>
                        )}
                    </h3>
                    {isTeamPlan && seatCount && (
                        <p className="text-sm text-black mt-1 font-mono">
                            {usedSeats || 0} / {seatCount} seats used
                        </p>
                    )}
                </div>
                {planType !== 'power-individual' && planType !== 'team-pro' && (
                    <button
                        onClick={onUpgrade}
                        className="font-mono bg-blue-600 border-2 border-black text-white cursor-pointer py-2 px-4 font-semibold shadow-neo-btn transition-all hover:bg-blue-700 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                        Upgrade Plan
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-4">
                {renderUsageBar('AI Requests', aiRequestsUsed, limits.aiRequestsPerMonth)}
                {renderUsageBar('Storage', storageUsed, limits.storageBytes, formatBytes)}
                {renderUsageBar('Files', fileCountUsed, limits.fileCount)}
            </div>

            {(showAiWarning || showStorageWarning || showFileWarning) && (
                <div className="mt-4 p-3 bg-yellow-100 border-2 border-black">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-black flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-black">Usage Warning</p>
                            <p className="text-xs text-black mt-1">
                                You're approaching your plan limits. 
                                {showAiWarning && ' AI requests are running low.'}
                                {showStorageWarning && ' Storage is nearly full.'}
                                {showFileWarning && ' File limit almost reached.'}
                                {' '}
                                <button onClick={onUpgrade} className="underline font-bold hover:text-blue-600">
                                    Upgrade now
                                </button> to continue without interruption.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
