import React from 'react';
import { Wand2, Sparkles, RefreshCw, List, AlignCenter, Lightbulb, Globe, Search } from 'lucide-react';

// Font sizes for the dropdown
export const FONT_SIZES = [
    { label: 'Small', value: '12px' },
    { label: 'Normal', value: '14px' },
    { label: 'Medium', value: '16px' },
    { label: 'Large', value: '18px' },
    { label: 'X-Large', value: '24px' },
    { label: 'XX-Large', value: '32px' },
];

// Text colors
export const TEXT_COLORS = [
    { label: 'Default', value: '#000000' },
    { label: 'Gray', value: '#6B7280' },
    { label: 'Red', value: '#DC2626' },
    { label: 'Orange', value: '#EA580C' },
    { label: 'Yellow', value: '#CA8A04' },
    { label: 'Green', value: '#16A34A' },
    { label: 'Blue', value: '#2563EB' },
    { label: 'Purple', value: '#9333EA' },
    { label: 'Pink', value: '#DB2777' },
];

// Highlight colors
export const HIGHLIGHT_COLORS = [
    { label: 'None', value: '' },
    { label: 'Yellow', value: '#FEF08A' },
    { label: 'Green', value: '#BBF7D0' },
    { label: 'Blue', value: '#BFDBFE' },
    { label: 'Purple', value: '#DDD6FE' },
    { label: 'Pink', value: '#FBCFE8' },
    { label: 'Orange', value: '#FED7AA' },
];

// Font family options
export const FONT_FAMILIES = [
    { id: 'system', label: 'System Default', stack: 'ui-sans-serif, system-ui, sans-serif' },
    { id: 'inter', label: 'Inter', stack: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    { id: 'roboto', label: 'Roboto', stack: 'Roboto, ui-sans-serif, system-ui, sans-serif' },
    { id: 'georgia', label: 'Georgia', stack: 'Georgia, ui-serif, serif' },
    { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
    { id: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
    { id: 'courier', label: 'Courier New', stack: '"Courier New", Courier, monospace' },
    { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
];

// Line spacing options
export const LINE_SPACING_OPTIONS = [
    { label: 'Single', value: 1.0 },
    { label: '1.15', value: 1.15 },
    { label: '1.5', value: 1.5 },
    { label: 'Double', value: 2.0 },
];

// Email templates for quick access
export const EMAIL_TEMPLATES = [
    {
        id: 'follow-up',
        name: 'Follow-up',
        icon: '📬',
        subject: 'Following up on our conversation',
        content: `<p>Hi [Name],</p>
<p>I wanted to follow up on our recent conversation about [topic]. I hope you've had a chance to consider what we discussed.</p>
<p>Would you be available for a quick call this week to continue our discussion?</p>
<p>Best regards,<br/>[Your Name]</p>`,
    },
    {
        id: 'introduction',
        name: 'Introduction',
        icon: '👋',
        subject: 'Introduction - [Your Name] from [Company]',
        content: `<p>Hi [Name],</p>
<p>I hope this email finds you well. My name is [Your Name] and I'm reaching out from [Company].</p>
<p>I noticed that [observation/reason for reaching out] and thought it might be valuable to connect.</p>
<p>[Brief value proposition]</p>
<p>Would you be open to a brief conversation?</p>
<p>Best regards,<br/>[Your Name]</p>`,
    },
    {
        id: 'meeting-request',
        name: 'Meeting Request',
        icon: '📅',
        subject: 'Meeting Request - [Topic]',
        content: `<p>Hi [Name],</p>
<p>I'd like to schedule a meeting to discuss [topic/purpose].</p>
<p><strong>Proposed Times:</strong></p>
<ul>
<li>[Option 1: Day, Date, Time]</li>
<li>[Option 2: Day, Date, Time]</li>
<li>[Option 3: Day, Date, Time]</li>
</ul>
<p>Please let me know which time works best for you, or suggest an alternative.</p>
<p>Best regards,<br/>[Your Name]</p>`,
    },
    {
        id: 'thank-you',
        name: 'Thank You',
        icon: '🙏',
        subject: 'Thank you for [topic]',
        content: `<p>Hi [Name],</p>
<p>Thank you so much for [reason - meeting, opportunity, help, etc.]. I really appreciate your time and [specific thing you're grateful for].</p>
<p>[Next steps or closing thought]</p>
<p>Best regards,<br/>[Your Name]</p>`,
    },
    {
        id: 'proposal',
        name: 'Proposal',
        icon: '📄',
        subject: 'Proposal: [Project Name]',
        content: `<p>Hi [Name],</p>
<p>Thank you for the opportunity to submit this proposal for [project/service].</p>
<p><strong>Overview:</strong></p>
<p>[Brief description of what you're proposing]</p>
<p><strong>Key Deliverables:</strong></p>
<ul>
<li>[Deliverable 1]</li>
<li>[Deliverable 2]</li>
<li>[Deliverable 3]</li>
</ul>
<p><strong>Timeline:</strong> [Expected duration]</p>
<p><strong>Investment:</strong> [Price or pricing structure]</p>
<p>I'm happy to discuss this proposal in more detail at your convenience.</p>
<p>Best regards,<br/>[Your Name]</p>`,
    },
    {
        id: 'cold-outreach',
        name: 'Cold Outreach',
        icon: '🎯',
        subject: '[Personalized Hook] - Quick Question',
        content: `<p>Hi [Name],</p>
<p>[Personalized opening line based on their work/company]</p>
<p>I'm reaching out because [specific reason relevant to them]. At [Your Company], we help [target audience] achieve [key benefit].</p>
<p>[Brief case study or proof point]</p>
<p>Would you be open to a 15-minute call to explore if this could be valuable for [Their Company]?</p>
<p>Best,<br/>[Your Name]</p>`,
    },
];

export interface AIAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    action: 'draft' | 'improve' | 'shorten' | 'expand' | 'formal' | 'friendly' | 'research' | 'suggest';
}

export const AI_ACTIONS: AIAction[] = [
    { id: 'draft', label: 'Draft Reply', icon: <Wand2 size={14} />, description: 'Generate a complete reply', action: 'draft' },
    { id: 'improve', label: 'Improve Writing', icon: <Sparkles size={14} />, description: 'Enhance clarity and tone', action: 'improve' },
    { id: 'shorten', label: 'Make Shorter', icon: <RefreshCw size={14} />, description: 'Condense the message', action: 'shorten' },
    { id: 'expand', label: 'Expand', icon: <List size={14} />, description: 'Add more detail', action: 'expand' },
    { id: 'formal', label: 'More Formal', icon: <AlignCenter size={14} />, description: 'Professional tone', action: 'formal' },
    { id: 'friendly', label: 'More Friendly', icon: <Lightbulb size={14} />, description: 'Casual, warm tone', action: 'friendly' },
    { id: 'research', label: 'Research Topic', icon: <Globe size={14} />, description: 'Web search for context', action: 'research' },
    { id: 'suggest', label: 'Suggest Points', icon: <Search size={14} />, description: 'Key points to include', action: 'suggest' },
];
