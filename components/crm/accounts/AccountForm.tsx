import React from 'react';
import { Priority } from '../../../types';
import { CompanyEnrichmentButton } from './CompanyEnrichmentButton';
import { showSuccess } from '../../../lib/utils/toast';

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
    // Enrichment fields
    location?: string;
    companySize?: string;
    foundedYear?: string;
    linkedin?: string;
    twitter?: string;
    // Type selection (used when creating from "all accounts" view)
    accountType?: 'investor' | 'customer' | 'partner';
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

    // Handle enrichment data application
    const handleEnrichmentComplete = (data: {
        description?: string;
        industry?: string;
        location?: string;
        companySize?: string;
        foundedYear?: string;
        linkedin?: string;
        twitter?: string;
    }) => {
        const updates: Partial<AccountFormData> = {};
        
        if (data.description && !formData.description) {
            updates.description = data.description;
        }
        if (data.industry && !formData.industry) {
            updates.industry = data.industry;
        }
        if (data.location && !formData.location) {
            updates.location = data.location;
        }
        if (data.companySize && !formData.companySize) {
            updates.companySize = data.companySize;
        }
        if (data.foundedYear && !formData.foundedYear) {
            updates.foundedYear = data.foundedYear;
        }
        if (data.linkedin && !formData.linkedin) {
            updates.linkedin = data.linkedin;
        }
        if (data.twitter && !formData.twitter) {
            updates.twitter = data.twitter;
        }
        
        if (Object.keys(updates).length > 0) {
            onFormDataChange({
                ...formData,
                ...updates,
            });
        }
    };

    // Determine effective type for showing type-specific fields
    const effectiveType = crmType === 'accounts' ? formData.accountType : crmType;

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

            {/* Account Type Selector - Only shown when creating from "All Accounts" view */}
            {crmType === 'accounts' && mode === 'add' && (
                <div>
                    <label htmlFor={`${idPrefix}-account-type`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Account Type *
                    </label>
                    <select
                        id={`${idPrefix}-account-type`}
                        name={`${idPrefix}-account-type`}
                        value={formData.accountType || ''}
                        onChange={(e) => onFormDataChange({ ...formData, accountType: e.target.value as 'investor' | 'customer' | 'partner' })}
                        required
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select account type...</option>
                        <option value="investor">Investor</option>
                        <option value="customer">Customer</option>
                        <option value="partner">Partner</option>
                    </select>
                </div>
            )}

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
                    <select
                        id={`${idPrefix}-status`}
                        name={`${idPrefix}-status`}
                        value={formData.status}
                        onChange={(e) => onFormDataChange({ ...formData, status: e.target.value })}
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="Prospecting">Prospecting</option>
                        <option value="Active">Active</option>
                        <option value="Engaged">Engaged</option>
                        <option value="Negotiating">Negotiating</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Closed">Closed</option>
                        <option value="Churned">Churned</option>
                    </select>
                </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label htmlFor={`${idPrefix}-website`} className="block font-mono text-sm font-semibold text-black">
                            Website
                        </label>
                        <CompanyEnrichmentButton
                            websiteUrl={formData.website || ''}
                            onEnrichmentComplete={handleEnrichmentComplete}
                            size="sm"
                        />
                    </div>
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

            {/* Company Details */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label htmlFor={`${idPrefix}-location`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Location
                    </label>
                    <input
                        id={`${idPrefix}-location`}
                        name={`${idPrefix}-location`}
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => onFormDataChange({ ...formData, location: e.target.value })}
                        placeholder="e.g., San Francisco, CA"
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-company-size`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Company Size
                    </label>
                    <input
                        id={`${idPrefix}-company-size`}
                        name={`${idPrefix}-company-size`}
                        type="text"
                        value={formData.companySize || ''}
                        onChange={(e) => onFormDataChange({ ...formData, companySize: e.target.value })}
                        placeholder="e.g., 50-200 employees"
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-founded-year`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Founded
                    </label>
                    <input
                        id={`${idPrefix}-founded-year`}
                        name={`${idPrefix}-founded-year`}
                        type="text"
                        value={formData.foundedYear || ''}
                        onChange={(e) => onFormDataChange({ ...formData, foundedYear: e.target.value })}
                        placeholder="e.g., 2020"
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor={`${idPrefix}-linkedin`} className="block font-mono text-sm font-semibold text-black mb-1">
                        LinkedIn
                    </label>
                    <input
                        id={`${idPrefix}-linkedin`}
                        name={`${idPrefix}-linkedin`}
                        type="url"
                        value={formData.linkedin || ''}
                        onChange={(e) => onFormDataChange({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/company/..."
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor={`${idPrefix}-twitter`} className="block font-mono text-sm font-semibold text-black mb-1">
                        Twitter / X
                    </label>
                    <input
                        id={`${idPrefix}-twitter`}
                        name={`${idPrefix}-twitter`}
                        type="url"
                        value={formData.twitter || ''}
                        onChange={(e) => onFormDataChange({ ...formData, twitter: e.target.value })}
                        placeholder="https://twitter.com/..."
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Type-specific fields - Investors */}
            {(effectiveType === 'investors' || effectiveType === 'investor') && (
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
            {(effectiveType === 'customers' || effectiveType === 'customer') && (
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
            {(effectiveType === 'partners' || effectiveType === 'partner') && (
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
