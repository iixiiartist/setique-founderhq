import React from 'react';
import { Priority } from '../../../types';

export interface AccountFormData {
    company: string;
    priority: Priority;
    status: string;
    nextAction: string;
    nextActionDate: string;
    nextActionTime: string;
    website?: string;
    industry?: string;
    description?: string;
    // Type-specific fields
    checkSize?: number;
    stage?: string; // For investors: Seed, Series A, B, C, etc.
    dealValue?: number;
    dealStage?: string; // For customers: Prospect, Qualified, Proposal, etc.
    opportunity?: string;
    partnerType?: string; // For partners: Technology, Marketing, Distribution, etc.
}

interface AccountFormProps {
    formData: AccountFormData;
    onFormDataChange: (data: AccountFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    crmType: 'investors' | 'customers' | 'partners' | 'accounts';
    crmTypeLabel: string;
    mode: 'add' | 'edit';
}

export function AccountForm({
    formData,
    onFormDataChange,
    onSubmit,
    onCancel,
    crmType,
    crmTypeLabel,
    mode
}: AccountFormProps) {
    const idPrefix = mode === 'add' ? 'add' : 'edit';

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label htmlFor={`${idPrefix}-company`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Company Name *
                </label>
                <input
                    id={`${idPrefix}-company`}
                    name={`${idPrefix}-company`}
                    type="text"
                    value={formData.company}
                    onChange={(e) => onFormDataChange({ ...formData, company: e.target.value })}
                    placeholder="e.g., Acme Corp"
                    required
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor={`${idPrefix}-priority`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Priority
                    </label>
                    <select
                        id={`${idPrefix}-priority`}
                        name={`${idPrefix}-priority`}
                        value={formData.priority}
                        onChange={(e) => onFormDataChange({ ...formData, priority: e.target.value as Priority })}
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-status`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Status
                    </label>
                    <input
                        id={`${idPrefix}-status`}
                        name={`${idPrefix}-status`}
                        type="text"
                        value={formData.status}
                        onChange={(e) => onFormDataChange({ ...formData, status: e.target.value })}
                        placeholder="e.g., Active, Prospect"
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor={`${idPrefix}-website`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Website
                    </label>
                    <input
                        id={`${idPrefix}-website`}
                        name={`${idPrefix}-website`}
                        type="url"
                        value={formData.website || ''}
                        onChange={(e) => onFormDataChange({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-industry`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Industry
                    </label>
                    <input
                        id={`${idPrefix}-industry`}
                        name={`${idPrefix}-industry`}
                        type="text"
                        value={formData.industry || ''}
                        onChange={(e) => onFormDataChange({ ...formData, industry: e.target.value })}
                        placeholder="e.g., SaaS, Fintech"
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div>
                <label htmlFor={`${idPrefix}-description`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Description
                </label>
                <textarea
                    id={`${idPrefix}-description`}
                    name={`${idPrefix}-description`}
                    value={formData.description || ''}
                    onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the company..."
                    rows={3}
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
            </div>

            {/* Type-specific fields - Investors */}
            {crmType === 'investors' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`${idPrefix}-check-size`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Check Size ($)
                        </label>
                        <input
                            id={`${idPrefix}-check-size`}
                            name={`${idPrefix}-check-size`}
                            type="number"
                            value={formData.checkSize || ''}
                            onChange={(e) => onFormDataChange({ ...formData, checkSize: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="e.g., 100000"
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${idPrefix}-stage`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Investment Stage
                        </label>
                        <select
                            id={`${idPrefix}-stage`}
                            name={`${idPrefix}-stage`}
                            value={formData.stage || ''}
                            onChange={(e) => onFormDataChange({ ...formData, stage: e.target.value })}
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select stage...</option>
                            <option value="Pre-Seed">Pre-Seed</option>
                            <option value="Seed">Seed</option>
                            <option value="Series A">Series A</option>
                            <option value="Series B">Series B</option>
                            <option value="Series C+">Series C+</option>
                            <option value="Growth">Growth</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Type-specific fields - Customers */}
            {crmType === 'customers' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`${idPrefix}-deal-value`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Deal Value ($)
                        </label>
                        <input
                            id={`${idPrefix}-deal-value`}
                            name={`${idPrefix}-deal-value`}
                            type="number"
                            value={formData.dealValue || ''}
                            onChange={(e) => onFormDataChange({ ...formData, dealValue: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="e.g., 50000"
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${idPrefix}-deal-stage`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Deal Stage
                        </label>
                        <select
                            id={`${idPrefix}-deal-stage`}
                            name={`${idPrefix}-deal-stage`}
                            value={formData.dealStage || ''}
                            onChange={(e) => onFormDataChange({ ...formData, dealStage: e.target.value })}
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select stage...</option>
                            <option value="Lead">Lead</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Proposal">Proposal</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Closed Won">Closed Won</option>
                            <option value="Closed Lost">Closed Lost</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Type-specific fields - Partners */}
            {crmType === 'partners' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`${idPrefix}-opportunity`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Opportunity
                        </label>
                        <input
                            id={`${idPrefix}-opportunity`}
                            name={`${idPrefix}-opportunity`}
                            type="text"
                            value={formData.opportunity || ''}
                            onChange={(e) => onFormDataChange({ ...formData, opportunity: e.target.value })}
                            placeholder="e.g., Co-marketing campaign"
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${idPrefix}-partner-type`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Partner Type
                        </label>
                        <select
                            id={`${idPrefix}-partner-type`}
                            name={`${idPrefix}-partner-type`}
                            value={formData.partnerType || ''}
                            onChange={(e) => onFormDataChange({ ...formData, partnerType: e.target.value })}
                            className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select type...</option>
                            <option value="Technology">Technology</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Distribution">Distribution</option>
                            <option value="Integration">Integration</option>
                            <option value="Referral">Referral</option>
                            <option value="Strategic">Strategic</option>
                        </select>
                    </div>
                </div>
            )}

            <div>
                <label htmlFor={`${idPrefix}-next-action`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Next Action
                </label>
                <input
                    id={`${idPrefix}-next-action`}
                    name={`${idPrefix}-next-action`}
                    type="text"
                    value={formData.nextAction}
                    onChange={(e) => onFormDataChange({ ...formData, nextAction: e.target.value })}
                    placeholder="e.g., Send intro email"
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor={`${idPrefix}-next-action-date`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Next Action Date
                    </label>
                    <input
                        id={`${idPrefix}-next-action-date`}
                        name={`${idPrefix}-next-action-date`}
                        type="date"
                        value={formData.nextActionDate}
                        onChange={(e) => onFormDataChange({ ...formData, nextActionDate: e.target.value })}
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-next-action-time`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Next Action Time
                    </label>
                    <input
                        id={`${idPrefix}-next-action-time`}
                        name={`${idPrefix}-next-action-time`}
                        type="time"
                        value={formData.nextActionTime}
                        onChange={(e) => onFormDataChange({ ...formData, nextActionTime: e.target.value })}
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <button
                    type="submit"
                    className={`flex-1 font-semibold text-white py-2 px-4 rounded-xl cursor-pointer transition-all shadow-sm ${
                        mode === 'add' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                    {mode === 'add' ? `Create ${crmTypeLabel}` : 'Save Changes'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 font-semibold bg-white text-slate-700 py-2 px-4 rounded-xl cursor-pointer transition-all border border-gray-200 shadow-sm hover:bg-gray-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default AccountForm;
