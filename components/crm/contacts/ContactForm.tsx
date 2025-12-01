import React from 'react';
import { AnyCrmItem } from '../../../types';

interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    title: string;
    linkedin: string;
    linkedCrmId: string;
    newAccountName: string;
}

interface ContactFormProps {
    formData: ContactFormData;
    onFormDataChange: (data: Partial<ContactFormData>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    crmItems: AnyCrmItem[];
    crmTypeLabel: string;
    isEdit?: boolean;
}

export function ContactForm({
    formData,
    onFormDataChange,
    onSubmit,
    onCancel,
    crmItems,
    crmTypeLabel,
    isEdit = false
}: ContactFormProps) {
    const idPrefix = isEdit ? 'edit' : 'add';

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label htmlFor={`${idPrefix}-contact-name`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Contact Name *
                </label>
                <input
                    id={`${idPrefix}-contact-name`}
                    name={`${idPrefix}-contact-name`}
                    type="text"
                    value={formData.name}
                    onChange={(e) => onFormDataChange({ name: e.target.value })}
                    placeholder="e.g., John Smith"
                    required
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div>
                <label htmlFor={`${idPrefix}-contact-email`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Email *
                </label>
                <input
                    id={`${idPrefix}-contact-email`}
                    name={`${idPrefix}-contact-email`}
                    type="email"
                    value={formData.email}
                    onChange={(e) => onFormDataChange({ email: e.target.value })}
                    placeholder="e.g., john@example.com"
                    required
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div>
                <label htmlFor={`${idPrefix}-contact-phone`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Phone
                </label>
                <input
                    id={`${idPrefix}-contact-phone`}
                    name={`${idPrefix}-contact-phone`}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => onFormDataChange({ phone: e.target.value })}
                    placeholder="e.g., (555) 123-4567"
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div>
                <label htmlFor={`${idPrefix}-contact-title`} className="block font-mono text-sm font-semibold text-black mb-1">
                    Job Title
                </label>
                <input
                    id={`${idPrefix}-contact-title`}
                    name={`${idPrefix}-contact-title`}
                    type="text"
                    value={formData.title}
                    onChange={(e) => onFormDataChange({ title: e.target.value })}
                    placeholder="e.g., CEO, VP of Sales"
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <div>
                <label htmlFor={`${idPrefix}-contact-linkedin`} className="block font-mono text-sm font-semibold text-black mb-1">
                    LinkedIn Profile
                </label>
                <input
                    id={`${idPrefix}-contact-linkedin`}
                    name={`${idPrefix}-contact-linkedin`}
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => onFormDataChange({ linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {!isEdit && (
                <div className="border-t-2 border-gray-300 pt-4">
                    <label htmlFor={`${idPrefix}-contact-link-crm`} className="block font-mono text-sm font-semibold text-black mb-2">
                        Link to {crmTypeLabel} Account
                    </label>
                    <select
                        id={`${idPrefix}-contact-link-crm`}
                        name={`${idPrefix}-contact-link-crm`}
                        value={formData.linkedCrmId}
                        onChange={(e) => onFormDataChange({ linkedCrmId: e.target.value })}
                        className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    >
                        <option value="">-- Select existing account or create new --</option>
                        {crmItems.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.company}
                            </option>
                        ))}
                    </select>

                    {!formData.linkedCrmId && (
                        <div>
                            <label htmlFor={`${idPrefix}-contact-new-account`} className="block font-mono text-xs text-gray-600 mb-1">
                                Or create new {crmTypeLabel.toLowerCase()} account:
                            </label>
                            <input
                                id={`${idPrefix}-contact-new-account`}
                                name={`${idPrefix}-contact-new-account`}
                                type="text"
                                value={formData.newAccountName}
                                onChange={(e) => onFormDataChange({ newAccountName: e.target.value })}
                                placeholder={`e.g., New ${crmTypeLabel} Company`}
                                className="w-full bg-white border border-gray-200 text-slate-900 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-2 pt-4">
                <button
                    type="submit"
                    className={`flex-1 font-semibold text-white py-2 px-4 rounded-xl cursor-pointer transition-all shadow-sm ${
                        isEdit ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                    {isEdit ? 'Save Changes' : 'Create Contact'}
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

export default ContactForm;
