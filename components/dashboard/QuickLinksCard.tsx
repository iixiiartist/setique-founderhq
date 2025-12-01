import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface QuickLink {
    id: string;
    href: string;
    text: string;
    iconChar?: string;
    iconBg?: string;
    iconColor?: string;
}

interface QuickLinkItemProps {
    href: string;
    text: string;
    iconChar?: string;
    iconBg?: string;
    iconColor?: string;
}

export const QuickLinkItem: React.FC<QuickLinkItemProps> = ({
    href,
    text,
    iconChar = '↗',
    iconBg = '#fff',
    iconColor = '#000'
}) => (
    <li>
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 p-3 bg-gray-50 hover:bg-white border border-gray-200 rounded-lg transition-all shadow-sm"
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: iconBg, color: iconColor }}
                >
                    {iconChar}
                </div>
                <span className="font-medium text-sm sm:text-base text-gray-900">{text}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
        </a>
    </li>
);

interface QuickLinksCardProps {
    links: QuickLink[];
}

export const QuickLinksCard: React.FC<QuickLinksCardProps> = ({ links }) => {
    if (!links || links.length === 0) return null;

    return (
        <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
            <ul className="space-y-3">
                {links.map((link) => (
                    <QuickLinkItem
                        key={link.id}
                        href={link.href}
                        text={link.text}
                        iconChar={link.iconChar}
                        iconBg={link.iconBg}
                        iconColor={link.iconColor}
                    />
                ))}
            </ul>
        </div>
    );
};
