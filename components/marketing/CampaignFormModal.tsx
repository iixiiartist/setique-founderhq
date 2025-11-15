import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { MarketingItem, ProductService, WorkspaceMember } from '../../types';
import Modal from '../shared/Modal';
import { Form } from '../forms/Form';
import { FormField } from '../forms/FormField';
import { FormSection } from '../forms/FormSection';
import { SelectField } from '../forms/SelectField';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

// Zod validation schema
const campaignSchema = z.object({
    title: z.string().min(1, 'Campaign title is required').max(200, 'Title is too long'),
    type: z.enum(['Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Product Launch', 'Event', 'Other']),
    status: z.enum(['Planned', 'In Progress', 'Completed', 'Published', 'Cancelled']),
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
    campaignBudget: z.number().min(0, 'Budget must be positive').optional(),
    actualSpend: z.number().min(0, 'Spend must be positive').optional(),
    targetAudience: z.string().max(500).optional(),
    channels: z.array(z.enum(['email', 'social', 'paid_ads', 'content', 'events'])).optional(),
    goals: z.string().max(1000).optional(),
    targetRevenue: z.number().min(0, 'Revenue target must be positive').optional(),
    productServiceIds: z.array(z.string()).optional(),
    assignedTo: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

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
    // Local state for multi-selects and tags (not in form)
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [globalError, setGlobalError] = useState<string | null>(null);

    // Prepare default values from editingCampaign
    const defaultValues: CampaignFormData = {
        title: editingCampaign?.title || '',
        type: editingCampaign?.type || 'Blog Post',
        status: editingCampaign?.status || 'Planned',
        dueDate: editingCampaign?.dueDate || '',
        dueTime: editingCampaign?.dueTime || '',
        campaignBudget: editingCampaign?.campaignBudget || 0,
        actualSpend: editingCampaign?.actualSpend || 0,
        targetAudience: editingCampaign?.targetAudience || '',
        channels: editingCampaign?.channels || [],
        goals: editingCampaign?.goals || '',
        targetRevenue: editingCampaign?.targetRevenue || 0,
        productServiceIds: editingCampaign?.productServiceIds || [],
        assignedTo: editingCampaign?.assignedTo || '',
        tags: editingCampaign?.tags || [],
    };

    // Initialize multi-selects when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedChannels(new Set(editingCampaign?.channels || []));
            setSelectedProducts(new Set(editingCampaign?.productServiceIds || []));
            setTags(editingCampaign?.tags || []);
            setNewTag('');
            setGlobalError(null);
        }
    }, [isOpen, editingCampaign]);

    const handleSubmit = async (data: CampaignFormData) => {
        try {
            setGlobalError(null);
            // Merge form data with multi-selects
            const campaignData: Partial<MarketingItem> = {
                ...data,
                channels: Array.from(selectedChannels) as any[],
                productServiceIds: Array.from(selectedProducts),
                tags,
            };
            await onSave(campaignData);
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Failed to save campaign');
            throw err; // Re-throw so form knows submission failed
        }
    };

    const handleChannelToggle = (channel: string) => {
        setSelectedChannels(prev => {
            const next = new Set(prev);
            if (next.has(channel)) {
                next.delete(channel);
            } else {
                next.add(channel);
            }
            return next;
        });
    };

    const handleProductToggle = (productId: string) => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const handleAddTag = () => {
        const trimmed = newTag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const channelOptions = [
        { value: 'email', label: 'Email', icon: '📧' },
        { value: 'social', label: 'Social Media', icon: '📱' },
        { value: 'paid_ads', label: 'Paid Ads', icon: '💰' },
        { value: 'content', label: 'Content Marketing', icon: '📝' },
        { value: 'events', label: 'Events', icon: '🎉' }
    ];

    const budgetUtilization = (defaultValues.campaignBudget || 0) > 0 && (defaultValues.actualSpend || 0) > 0
        ? ((defaultValues.actualSpend || 0) / (defaultValues.campaignBudget || 1) * 100)
        : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            size="lg"
            triggerRef={triggerRef}
        >
            <Form
                schema={campaignSchema}
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
            >
                {({ formState, watch }) => {
                    const campaignBudget = watch('campaignBudget') || 0;
                    const actualSpend = watch('actualSpend') || 0;
                    const liveBudgetUtilization = campaignBudget > 0 && actualSpend > 0
                        ? (actualSpend / campaignBudget * 100)
                        : 0;

                    return (
                        <div className="space-y-6">
                            {/* Global Error */}
                            {globalError && (
                                <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-sm font-semibold">
                                    {globalError}
                                </div>
                            )}

                            {/* Basic Information */}
                            <FormSection
                                title="Basic Information"
                                description="Core details about this marketing campaign"
                            >
                                <FormField
                                    name="title"
                                    label="Campaign Title"
                                    placeholder="e.g., Q1 Product Launch Campaign"
                                    required
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SelectField
                                        name="type"
                                        label="Type"
                                        required
                                        options={[
                                            { value: 'Blog Post', label: 'Blog Post' },
                                            { value: 'Newsletter', label: 'Newsletter' },
                                            { value: 'Social Campaign', label: 'Social Campaign' },
                                            { value: 'Webinar', label: 'Webinar' },
                                            { value: 'Product Launch', label: 'Product Launch' },
                                            { value: 'Event', label: 'Event' },
                                            { value: 'Other', label: 'Other' },
                                        ]}
                                    />
                                    <SelectField
                                        name="status"
                                        label="Status"
                                        required
                                        options={[
                                            { value: 'Planned', label: 'Planned' },
                                            { value: 'In Progress', label: 'In Progress' },
                                            { value: 'Completed', label: 'Completed' },
                                            { value: 'Published', label: 'Published' },
                                            { value: 'Cancelled', label: 'Cancelled' },
                                        ]}
                                    />
                                    <SelectField
                                        name="assignedTo"
                                        label="Assigned To"
                                        options={[
                                            { value: '', label: 'Unassigned' },
                                            ...workspaceMembers.map(member => ({
                                                value: member.userId,
                                                label: member.fullName || member.email || 'Unknown'
                                            }))
                                        ]}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        name="dueDate"
                                        label="Launch Date"
                                        type="date"
                                    />
                                    <FormField
                                        name="dueTime"
                                        label="Launch Time"
                                        type="time"
                                    />
                                </div>
                            </FormSection>

                            {/* Campaign Details */}
                            <FormSection
                                title="Campaign Details"
                                description="Target audience, goals, and marketing channels"
                            >
                                <FormField
                                    name="targetAudience"
                                    label="Target Audience"
                                    placeholder="e.g., Small business owners, Tech startups, etc."
                                />

                                <FormField
                                    name="goals"
                                    label="Campaign Goals & KPIs"
                                    type="text"
                                    placeholder="e.g., Generate 500 leads, Increase brand awareness by 30%, etc."
                                    helpText="Describe measurable objectives for this campaign"
                                />

                                {/* Marketing Channels */}
                                <div>
                                    <label className="block font-mono text-sm font-semibold text-black mb-2">
                                        Marketing Channels
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {channelOptions.map(channel => (
                                            <label
                                                key={channel.value}
                                                className={`flex items-center gap-2 p-2 border-2 cursor-pointer transition-colors ${
                                                    selectedChannels.has(channel.value)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-300 bg-white hover:border-gray-400'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedChannels.has(channel.value)}
                                                    onChange={() => handleChannelToggle(channel.value)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-lg">{channel.icon}</span>
                                                <span className="text-sm font-medium">{channel.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </FormSection>

                            {/* Budget & Revenue */}
                            <FormSection
                                title="Budget & Revenue Targets"
                                description="Financial planning and tracking"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        name="campaignBudget"
                                        label="Budget ($)"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                    />
                                    <FormField
                                        name="actualSpend"
                                        label="Actual Spend ($)"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                    />
                                    <FormField
                                        name="targetRevenue"
                                        label="Revenue Target ($)"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                    />
                                </div>

                                {liveBudgetUtilization > 0 && (
                                    <div className="p-3 bg-gray-100 border-2 border-black">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-mono text-sm font-semibold">Budget Utilization:</span>
                                            <span className="font-mono font-bold">
                                                {liveBudgetUtilization.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-300 h-2 border border-black">
                                            <div
                                                className={`h-full ${
                                                    liveBudgetUtilization > 100 ? 'bg-red-600' : 'bg-green-600'
                                                }`}
                                                style={{ width: `${Math.min(liveBudgetUtilization, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </FormSection>

                            {/* Promoted Products/Services */}
                            {productsServices.length > 0 && (
                                <FormSection
                                    title="Promoted Products/Services"
                                    description="Select products or services this campaign will promote"
                                >
                                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 border-2 border-gray-300">
                                        {productsServices
                                            .filter(p => p.status === 'active')
                                            .map(product => (
                                                <label
                                                    key={product.id}
                                                    className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                                                        selectedProducts.has(product.id)
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 bg-white hover:border-gray-400'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.has(product.id)}
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
                                    {selectedProducts.size > 0 && (
                                        <div className="text-sm font-semibold text-blue-900">
                                            ✓ {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </FormSection>
                            )}

                            {/* Tags */}
                            <FormSection title="Tags" description="Add tags to organize and filter campaigns">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={e => setNewTag(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="Add tag (e.g., Q1, Social Media, Lead Gen)"
                                        className="flex-grow bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                    />
                                    <Button type="button" onClick={handleAddTag}>
                                        Add
                                    </Button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <Badge key={tag} variant="default" onRemove={() => handleRemoveTag(tag)}>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </FormSection>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t-2 border-gray-300">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1"
                                    loading={formState.isSubmitting}
                                >
                                    {editingCampaign ? 'Save Changes' : 'Create Campaign'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={formState.isSubmitting}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    );
                }}
            </Form>
        </Modal>
    );
}

export default CampaignFormModal;
