import React, { useMemo } from 'react';
import { BusinessProfile } from '../../types';
import { Building2, CheckCircle2, Clock } from 'lucide-react';

interface AiContextSummary {
    percent: number;
    completed: number;
    total: number;
    missing: Array<{ key: keyof BusinessProfile; label: string }>;
    highlights: Array<{ label: string; value: string | undefined }>;
    lastUpdated: string;
}

const AI_CONTEXT_REQUIRED_FIELDS: Array<{ key: keyof BusinessProfile; label: string }> = [
    { key: 'companyName', label: 'Company name' },
    { key: 'industry', label: 'Industry' },
    { key: 'targetCustomerProfile', label: 'Ideal customer profile' },
    { key: 'marketPositioning', label: 'Market positioning' },
    { key: 'monetizationModel', label: 'Monetization model' },
    { key: 'competitiveAdvantages', label: 'Competitive advantages' },
    { key: 'keyDifferentiators', label: 'Key differentiators' },
];

interface BusinessProfileSectionProps {
    businessProfile: BusinessProfile | null;
    isOwner: boolean;
    onEditProfile: () => void;
}

export function BusinessProfileSection({ businessProfile, isOwner, onEditProfile }: BusinessProfileSectionProps) {
    const aiContextSummary = useMemo((): AiContextSummary | null => {
        if (!businessProfile) return null;

        const completedFields = AI_CONTEXT_REQUIRED_FIELDS.filter(({ key }) => {
            const value = businessProfile[key];
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === 'string') return value.trim().length > 0;
            return value !== undefined && value !== null;
        });

        const completedKeys = new Set(completedFields.map(field => field.key));
        const missing = AI_CONTEXT_REQUIRED_FIELDS.filter(field => !completedKeys.has(field.key));

        const highlights = [
            { label: 'Ideal Customer', value: businessProfile.targetCustomerProfile },
            { label: 'Positioning', value: businessProfile.marketPositioning },
            { label: 'Monetization', value: businessProfile.monetizationModel },
            { label: 'Top Differentiators', value: (businessProfile.keyDifferentiators || []).slice(0, 3).join(', ') },
            { label: 'Competitive Edge', value: (businessProfile.competitiveAdvantages || []).slice(0, 3).join(', ') },
        ].filter(item => item.value && item.value.toString().trim().length > 0);

        const percent = Math.round((completedFields.length / AI_CONTEXT_REQUIRED_FIELDS.length) * 100);
        const lastUpdated = businessProfile.updatedAt
            ? new Date(businessProfile.updatedAt).toLocaleDateString()
            : 'Not yet saved';

        return { percent, completed: completedFields.length, total: AI_CONTEXT_REQUIRED_FIELDS.length, missing, highlights, lastUpdated };
    }, [businessProfile]);

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600">
                Keep one source of truth for your ICP, positioning, pricing, and operating metrics. Copilot, notifications, and calendar deadlines all pull from the same autosaving profile.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    {businessProfile && aiContextSummary ? (
                        <>
                            <div>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-slate-700">{aiContextSummary.completed} of {aiContextSummary.total} key fields complete</span>
                                    <span className="font-medium text-slate-900">{aiContextSummary.percent}%</span>
                                </div>
                                <div className="h-3 border border-slate-200 rounded-full bg-slate-100">
                                    <div
                                        className="h-full bg-slate-900 rounded-full transition-all"
                                        style={{ width: `${aiContextSummary.percent}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Last updated {aiContextSummary.lastUpdated}</p>
                            </div>

                            {aiContextSummary.highlights.length > 0 && (
                                <div className="grid grid-cols-1 gap-3">
                                    {aiContextSummary.highlights.map(({ label, value }) => (
                                        <div key={label} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                                            <div className="text-xs uppercase text-slate-500">{label}</div>
                                            <div className="text-sm font-medium text-slate-900 mt-1 whitespace-pre-wrap">
                                                {value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {aiContextSummary.missing.length > 0 && (
                                <div>
                                    <div className="text-xs uppercase text-slate-500 mb-1">Suggested next fields</div>
                                    <div className="flex flex-wrap gap-2">
                                        {aiContextSummary.missing.map(field => (
                                            <span key={field.key} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-100">
                                                {field.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                            <p className="text-sm text-slate-600">
                                You haven't saved a full AI context yet. Share your ICP, positioning, and pricing so Copilot can tailor answers.
                            </p>
                        </div>
                    )}
                </div>

                <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Profile</h3>
                        {businessProfile?.isComplete ? (
                            <span className="text-xs font-medium text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Complete</span>
                        ) : (
                            <span className="text-xs font-medium text-amber-600">Draft</span>
                        )}
                    </div>
                    <dl className="grid grid-cols-1 gap-3">
                        <div>
                            <dt className="text-xs uppercase text-slate-500">Company</dt>
                            <dd className="text-sm font-medium text-slate-900">{businessProfile?.companyName || 'Not set'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase text-slate-500">Industry</dt>
                            <dd className="text-sm font-medium text-slate-900">{businessProfile?.industry || 'Not set'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase text-slate-500">Team Size</dt>
                            <dd className="text-sm font-medium text-slate-900">{businessProfile?.teamSize || businessProfile?.companySize || 'Not set'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase text-slate-500">Growth Stage</dt>
                            <dd className="text-sm font-medium text-slate-900">{businessProfile?.growthStage || 'Not set'}</dd>
                        </div>
                    </dl>
                    <p className="text-xs text-slate-600">
                        All changes autosave immediately and update Copilot context.
                    </p>
                </div>
            </div>

            {isOwner ? (
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onEditProfile}
                        className="bg-slate-900 text-white border border-slate-900 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                    >
                        Edit Business Profile & AI Context
                    </button>
                    <span className="text-xs text-slate-500">Need to finish later? Close the modal—your draft stays synced.</span>
                </div>
            ) : (
                <p className="text-xs text-gray-500 font-mono">
                    Only workspace owners can edit the shared business profile.
                </p>
            )}
        </div>
    );
}
