import React, { useState, useEffect } from 'react';
import { MarketingItem, AppActions, ProductService, WorkspaceMember } from '../../types';
import Modal from '../shared/Modal';

interface CampaignFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (campaignData: Partial<MarketingItem>) => Promise<void>;
    editingCampaign?: MarketingItem | null;
    productsServices?: ProductService[];
    workspaceMembers?: WorkspaceMember[];
    triggerRef?: React.RefObject<HTMLElement>;
}

export function CampaignFormModal({
    isOpen,
    onClose,
    onSave,
    editingCampaign,
    productsServices = [],
    workspaceMembers = [],
    triggerRef
}: CampaignFormModalProps) {
    const [formData, setFormData] = useState<Partial<MarketingItem>>({
        title: '',
        type: 'Blog Post',
        status: 'Planned',
        dueDate: '',
        dueTime: '',
        campaignBudget: 0,
        actualSpend: 0,
        targetAudience: '',
        channels: [],
        goals: '',
        targetRevenue: 0,
        productServiceIds: [],
        assignedTo: '',
        tags: []
    });

    const [newTag, setNewTag] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingCampaign) {
            setFormData({
                title: editingCampaign.title || '',
                type: editingCampaign.type || 'Blog Post',
                status: editingCampaign.status || 'Planned',
                dueDate: editingCampaign.dueDate || '',
                dueTime: editingCampaign.dueTime || '',
                campaignBudget: editingCampaign.campaignBudget || 0,
                actualSpend: editingCampaign.actualSpend || 0,
                targetAudience: editingCampaign.targetAudience || '',
                channels: editingCampaign.channels || [],
                goals: editingCampaign.goals || '',
                targetRevenue: editingCampaign.targetRevenue || 0,
                productServiceIds: editingCampaign.productServiceIds || [],
                assignedTo: editingCampaign.assignedTo || '',
                tags: editingCampaign.tags || []
            });
        } else {
            // Reset for new campaign
            setFormData({
                title: '',
                type: 'Blog Post',
                status: 'Planned',
                dueDate: '',
                dueTime: '',
                campaignBudget: 0,
                actualSpend: 0,
                targetAudience: '',
                channels: [],
                goals: '',
                targetRevenue: 0,
                productServiceIds: [],
                assignedTo: '',
                tags: []
            });
        }
        setNewTag('');
    }, [editingCampaign, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            setError('Campaign title is required');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            await onSave(formData);
            // onSave will close modal on success via handleSaveCampaign
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save campaign');
            setIsSubmitting(false);
        }
    };

    const handleChannelToggle = (channel: 'email' | 'social' | 'paid_ads' | 'content' | 'events') => {
        const current = formData.channels || [];
        const updated = current.includes(channel)
            ? current.filter(c => c !== channel)
            : [...current, channel];
        setFormData({ ...formData, channels: updated });
    };

    const handleProductToggle = (productId: string) => {
        const current = formData.productServiceIds || [];
        const updated = current.includes(productId)
            ? current.filter(id => id !== productId)
            : [...current, productId];
        setFormData({ ...formData, productServiceIds: updated });
    };

    const handleAddTag = () => {
        if (newTag.trim() && !(formData.tags || []).includes(newTag.trim())) {
            setFormData({ ...formData, tags: [...(formData.tags || []), newTag.trim()] });
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({ ...formData, tags: (formData.tags || []).filter(t => t !== tag) });
    };

    const channelOptions: { value: 'email' | 'social' | 'paid_ads' | 'content' | 'events'; label: string; icon: string }[] = [
        { value: 'email', label: 'Email', icon: '📧' },
        { value: 'social', label: 'Social Media', icon: '📱' },
        { value: 'paid_ads', label: 'Paid Ads', icon: '💰' },
        { value: 'content', label: 'Content Marketing', icon: '📝' },
        { value: 'events', label: 'Events', icon: '🎉' }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            triggerRef={triggerRef}
        >
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm font-semibold">
                        {error}
                    </div>
                )}
                
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b-2 border-black pb-2">Basic Information</h3>
                    
                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">
                            Campaign Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Q1 Product Launch Campaign"
                            required
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Type *</label>
                            <select
                                value={formData.type || 'Blog Post'}
                                onChange={e => setFormData({ ...formData, type: e.target.value as MarketingItem['type'] })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none h-full"
                            >
                                <option>Blog Post</option>
                                <option>Newsletter</option>
                                <option>Social Campaign</option>
                                <option>Webinar</option>
                                <option>Product Launch</option>
                                <option>Event</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Status *</label>
                            <select
                                value={formData.status || 'Planned'}
                                onChange={e => setFormData({ ...formData, status: e.target.value as MarketingItem['status'] })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none h-full"
                            >
                                <option>Planned</option>
                                <option>In Progress</option>
                                <option>Completed</option>
                                <option>Published</option>
                                <option>Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Assigned To</label>
                            <select
                                value={formData.assignedTo || ''}
                                onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none h-full"
                            >
                                <option value="">Unassigned</option>
                                {workspaceMembers.map(member => (
                                    <option key={member.userId} value={member.userId}>
                                        {member.fullName || member.email || 'Unknown'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Launch Date</label>
                            <input
                                type="date"
                                value={formData.dueDate || ''}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Launch Time</label>
                            <input
                                type="time"
                                value={formData.dueTime || ''}
                                onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Campaign Details */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b-2 border-black pb-2">Campaign Details</h3>
                    
                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">Target Audience</label>
                        <input
                            type="text"
                            value={formData.targetAudience || ''}
                            onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                            placeholder="e.g., Small business owners, Tech startups, etc."
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-1">Campaign Goals & KPIs</label>
                        <textarea
                            value={formData.goals || ''}
                            onChange={e => setFormData({ ...formData, goals: e.target.value })}
                            placeholder="e.g., Generate 500 leads, Increase brand awareness by 30%, etc."
                            rows={3}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Marketing Channels */}
                    <div>
                        <label className="block font-mono text-sm font-semibold text-black mb-2">Marketing Channels</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {channelOptions.map(channel => (
                                <label
                                    key={channel.value}
                                    className={`flex items-center gap-2 p-2 border-2 cursor-pointer transition-colors ${
                                        (formData.channels || []).includes(channel.value)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={(formData.channels || []).includes(channel.value)}
                                        onChange={() => handleChannelToggle(channel.value)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-lg">{channel.icon}</span>
                                    <span className="text-sm font-medium">{channel.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Budget & Revenue */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b-2 border-black pb-2">Budget & Revenue Targets</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Budget ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.campaignBudget || 0}
                                onChange={e => setFormData({ ...formData, campaignBudget: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Actual Spend ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.actualSpend || 0}
                                onChange={e => setFormData({ ...formData, actualSpend: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-sm font-semibold text-black mb-1">Revenue Target ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.targetRevenue || 0}
                                onChange={e => setFormData({ ...formData, targetRevenue: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    {(formData.campaignBudget || 0) > 0 && (formData.actualSpend || 0) > 0 && (
                        <div className="p-3 bg-gray-100 border-2 border-black">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-sm font-semibold">Budget Utilization:</span>
                                <span className="font-mono font-bold">
                                    {((formData.actualSpend || 0) / (formData.campaignBudget || 1) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-300 h-2 border border-black">
                                <div
                                    className={`h-full ${
                                        ((formData.actualSpend || 0) / (formData.campaignBudget || 1)) > 1
                                            ? 'bg-red-600'
                                            : 'bg-green-600'
                                    }`}
                                    style={{ width: `${Math.min(((formData.actualSpend || 0) / (formData.campaignBudget || 1) * 100), 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Promoted Products/Services */}
                {productsServices.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b-2 border-black pb-2">Promoted Products/Services</h3>
                        <p className="text-sm text-gray-600">Select products or services this campaign will promote</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 border-2 border-gray-300">
                            {productsServices
                                .filter(p => p.status === 'active')
                                .map(product => (
                                    <label
                                        key={product.id}
                                        className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                                            (formData.productServiceIds || []).includes(product.id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-400'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(formData.productServiceIds || []).includes(product.id)}
                                            onChange={() => handleProductToggle(product.id)}
                                            className="mt-1 w-4 h-4"
                                        />
                                        <div className="flex-grow">
                                            <div className="font-semibold">{product.name}</div>
                                            <div className="text-xs text-gray-600">
                                                {product.category} • {product.type}
                                            </div>
                                        </div>
                                        <div className="font-mono font-semibold text-blue-700">
                                            ${product.basePrice.toFixed(2)}
                                        </div>
                                    </label>
                                ))}
                        </div>
                        {(formData.productServiceIds || []).length > 0 && (
                            <div className="text-sm font-semibold text-blue-900">
                                ✓ {formData.productServiceIds!.length} product{formData.productServiceIds!.length !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>
                )}

                {/* Tags */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold border-b-2 border-black pb-2">Tags</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="Add tag (e.g., Q1, Social Media, Lead Gen)"
                            className="flex-grow bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-4 py-2 bg-black text-white border-2 border-black font-mono font-semibold"
                        >
                            Add
                        </button>
                    </div>
                    {(formData.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.tags!.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 border-2 border-black text-sm font-mono"
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-1 text-red-600 hover:text-red-800 font-bold"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t-2 border-gray-300">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex-1 font-mono font-semibold py-3 px-6 rounded-none transition-all border-2 border-black shadow-neo-btn ${
                            isSubmitting 
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                                : 'bg-black text-white cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                    >
                        {isSubmitting ? 'Saving...' : (editingCampaign ? 'Save Changes' : 'Create Campaign')}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className={`flex-1 font-mono font-semibold bg-white text-black py-3 px-6 rounded-none transition-all border-2 border-black shadow-neo-btn ${
                            isSubmitting 
                                ? 'cursor-not-allowed opacity-50' 
                                : 'cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default CampaignFormModal;
