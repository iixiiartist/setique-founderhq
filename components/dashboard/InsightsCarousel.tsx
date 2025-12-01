import React from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Briefcase, Megaphone, Wallet, Activity, Mail } from 'lucide-react';

export type InsightIcon = 'briefcase' | 'megaphone' | 'wallet' | 'activity' | 'mail';

export interface InsightSlide {
    id: string;
    label: string;
    title: string;
    metric: string;
    metricHint?: string;
    detail: string;
    metaLabel?: string;
    metaValue?: string;
    accent: string;
    icon: InsightIcon;
    action?: {
        label: string;
        href: string;
    };
}

interface InsightsCarouselProps {
    slides: InsightSlide[];
    activeIndex: number;
    onSlideChange: (direction: 'prev' | 'next') => void;
}

const renderSlideIcon = (icon: InsightIcon) => {
    switch (icon) {
        case 'briefcase':
            return <Briefcase className="w-6 h-6" />;
        case 'megaphone':
            return <Megaphone className="w-6 h-6" />;
        case 'wallet':
            return <Wallet className="w-6 h-6" />;
        case 'activity':
            return <Activity className="w-6 h-6" />;
        case 'mail':
        default:
            return <Mail className="w-6 h-6" />;
    }
};

export const InsightsCarousel: React.FC<InsightsCarouselProps> = ({
    slides,
    activeIndex,
    onSlideChange
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
            {/* Header */}
            <div className="bg-black text-white p-4 rounded-t-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="text-xl font-bold tracking-wide">OPERATIONAL INTEL</div>
                    <div className="hidden sm:block h-4 w-[1px] bg-gray-600"></div>
                    <div className="text-xs text-gray-400">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
                    </div>
                </div>
                <div className="text-xs text-gray-400">Updated live from your workspace</div>
            </div>

            {/* Carousel Content */}
            <div className="relative overflow-hidden">
                {/* Navigation */}
                <div className="flex items-center justify-between px-4 pt-4">
                    <button
                        className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
                        onClick={() => onSlideChange('prev')}
                        disabled={slides.length <= 1}
                        aria-label="Previous insight"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                        {slides.map((slide, idx) => (
                            <span
                                key={slide.id}
                                className={`h-1 w-8 rounded-full ${idx === activeIndex ? 'bg-black' : 'bg-gray-200'}`}
                            />
                        ))}
                    </div>
                    <button
                        className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
                        onClick={() => onSlideChange('next')}
                        disabled={slides.length <= 1}
                        aria-label="Next insight"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Slides */}
                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-500"
                        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                    >
                        {slides.map((slide) => (
                            <div key={slide.id} className="w-full flex-shrink-0 p-6 grid gap-4 md:grid-cols-[auto,1fr] items-center">
                                <div className={`p-4 border border-gray-200 rounded-xl bg-white shadow-sm ${slide.accent}`}>
                                    {renderSlideIcon(slide.icon)}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-widest text-gray-500">{slide.label}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{slide.title}</h3>
                                    <div className="flex items-baseline gap-3 flex-wrap">
                                        <span className={`text-4xl font-bold ${slide.accent}`}>{slide.metric}</span>
                                        {slide.metricHint && (
                                            <span className="text-sm font-medium text-gray-600">{slide.metricHint}</span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-sm md:text-base">{slide.detail}</p>
                                    {(slide.metaLabel || slide.action) && (
                                        <div className="flex flex-wrap gap-4 text-sm font-medium">
                                            {slide.metaLabel && (
                                                <span className="uppercase text-gray-500">
                                                    {slide.metaLabel}: <span className="text-gray-900">{slide.metaValue}</span>
                                                </span>
                                            )}
                                            {slide.action && (
                                                <a
                                                    href={slide.action.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-gray-900 border-b border-gray-900 hover:bg-black hover:text-white transition px-2 rounded"
                                                >
                                                    {slide.action.label}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
