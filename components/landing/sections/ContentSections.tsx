// Landing Page Content Sections
// Features, AI, Pricing, and FAQ sections - Black and white aesthetic

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronDown,
    Zap,
    Bot,
    MessageSquare,
    Sparkles
} from 'lucide-react';
import { useIntersectionObserver } from '../hooks';
import { FEATURES, AI_CAPABILITIES, FAQS, PRICING_PLANS } from '../constants';

// Feature card with black and white styling
interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    bgColor: string;
    gradient: string;
    delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, bgColor, gradient, delay = 0 }: FeatureCardProps) {
    const [ref, isVisible] = useIntersectionObserver();
    
    return (
        <div 
            ref={ref}
            className={`group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-black rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <Icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

// Features Section
export function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient orbs */}
                <div className="absolute top-20 right-10 w-80 h-80 bg-gradient-to-br from-gray-100 to-gray-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
                
                {/* Decorative vector lines */}
                <svg className="absolute top-1/3 left-0 w-full h-48 opacity-5" viewBox="0 0 1200 200" preserveAspectRatio="none">
                    <path d="M0,100 C200,50 400,150 600,100 S1000,50 1200,100" stroke="black" strokeWidth="2" fill="none" />
                    <path d="M0,120 C300,70 600,170 900,120 S1100,70 1200,120" stroke="black" strokeWidth="1" fill="none" />
                </svg>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full text-sm font-medium text-gray-700 mb-6 shadow-sm border border-gray-200">
                        <Sparkles className="w-4 h-4 text-gray-900" />
                        COMPLETE GTM TOOLKIT
                    </span>
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        EVERY TOOL YOU NEED, ONE WORKSPACE
                    </h2>
                    <p className="text-xl text-gray-600">
                        From pipeline to payment, marketing to meetings—FounderHQ unifies your entire GTM stack with AI woven throughout.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURES.map((feature, i) => (
                        <FeatureCard key={i} {...feature} delay={i * 100} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// AI Capability Card
function AICapabilityCard({ icon: Icon, label, description }: { icon: React.ElementType; label: string; description: string }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/15 transition-all duration-300 border border-white/10 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                <Icon className="w-6 h-6 text-gray-900" />
            </div>
            <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-gray-200 text-sm">{description}</p>
            </div>
        </div>
    );
}

// AI Chat Mockup
function AIChatMockup() {
    return (
        <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 blur-2xl rounded-3xl" />
            
            <div className="relative bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                        <Bot className="w-6 h-6 text-gray-900" />
                    </div>
                    <div>
                        <p className="font-bold text-white">AI Assistant</p>
                        <p className="text-gray-200 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Online in #general
                        </p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                        <div className="bg-white px-5 py-3 rounded-2xl rounded-br-md max-w-xs shadow-lg">
                            <p className="text-gray-900 text-sm font-medium">@AI log expense $250 for client dinner with Acme Corp</p>
                        </div>
                    </div>
                    
                    {/* AI response */}
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Bot className="w-5 h-5 text-gray-900" />
                        </div>
                        <div className="bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-sm rounded-2xl rounded-tl-md px-5 py-4 max-w-sm border border-white/20">
                            <p className="text-white text-sm mb-3 font-medium">✓ Done! Expense logged:</p>
                            <div className="bg-black/40 rounded-xl p-4 text-sm space-y-2">
                                <p className="text-white"><span className="text-gray-300">Amount:</span> $250.00</p>
                                <p className="text-white"><span className="text-gray-300">Category:</span> Client Entertainment</p>
                                <p className="text-white"><span className="text-gray-300">Account:</span> Acme Corp</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// AI Section
export function AISection() {
    return (
        <section id="ai" className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden relative">
            {/* Animated decorative background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Animated gradient orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                
                {/* Animated grid pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="ai-dots" width="4" height="4" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="0.3" fill="white" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#ai-dots)" />
                    </svg>
                </div>
                
                {/* Animated flowing lines */}
                <svg className="absolute top-0 left-0 w-full h-full opacity-20" viewBox="0 0 1200 600" preserveAspectRatio="none">
                    <path d="M0,300 Q300,200 600,300 T1200,300" stroke="white" strokeWidth="0.5" fill="none" className="animate-[dash_15s_linear_infinite]" strokeDasharray="5 5" />
                    <path d="M0,350 Q400,250 800,350 T1200,350" stroke="white" strokeWidth="0.3" fill="none" className="animate-[dash_20s_linear_infinite]" strokeDasharray="3 7" />
                </svg>
                
                {/* Floating geometric shapes */}
                <div className="absolute top-1/4 left-10 w-6 h-6 border border-white/20 rotate-45 animate-[float_8s_ease-in-out_infinite]" />
                <div className="absolute bottom-1/4 right-16 w-4 h-4 bg-white/10 rounded-full animate-[float_6s_ease-in-out_infinite_1s]" />
                <div className="absolute top-1/2 right-1/4 w-8 h-8 border border-white/10 rounded-full animate-[float_7s_ease-in-out_infinite_0.5s]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Content */}
                    <div>
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-white mb-6 border border-white/20">
                            <Bot className="w-4 h-4" />
                            AI THROUGHOUT
                        </span>
                        <h2 className="text-4xl font-bold mb-4 text-white">
                            AI THAT WORKS ACROSS YOUR ENTIRE GTM
                        </h2>
                        <p className="text-xl text-gray-200 mb-8 leading-relaxed">
                            Not just an assistant—AI is embedded throughout FounderHQ. Generate content, automate data entry, get strategic insights, research prospects, and let your team collaborate smarter.
                        </p>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                            {AI_CAPABILITIES.map((cap, i) => (
                                <AICapabilityCard key={i} {...cap} />
                            ))}
                        </div>
                    </div>

                    {/* Chat mockup */}
                    <AIChatMockup />
                </div>
            </div>
        </section>
    );
}

// Pricing Card
interface PricingCardProps {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    cta: string;
    popular?: boolean;
    bgColor?: string;
    gradient?: string;
}

export function PricingCard({ 
    name, 
    price, 
    period, 
    description, 
    features, 
    cta, 
    popular = false,
    gradient = 'from-gray-50 to-white'
}: PricingCardProps) {
    return (
        <div className={`relative bg-white rounded-3xl p-8 shadow-xl ${popular ? 'ring-2 ring-gray-900 shadow-2xl' : 'border border-gray-200'} hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}>
            {popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-gray-900 to-black text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                        BEST VALUE
                    </span>
                </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{name}</h3>
            <p className="text-sm text-gray-500 mb-4">{description}</p>
            <div className="mb-6">
                <span className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{price}</span>
                <span className="text-gray-500">{period}</span>
            </div>
            <ul className="space-y-3 mb-8">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="w-5 h-5 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <span className="text-white text-xs font-bold">✓</span>
                        </span>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            <Link
                to="/app"
                className={`block w-full py-4 font-semibold text-center rounded-xl transition-all ${popular ? 'bg-gradient-to-r from-gray-900 to-black text-white hover:from-gray-800 hover:to-gray-900 shadow-lg' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
            >
                {cta}
            </Link>
        </div>
    );
}

// Pricing Section
export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden relative">
            {/* Subtle background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-gray-100 to-gray-200/30 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-br from-gray-50 to-gray-100/30 rounded-full blur-3xl opacity-50" />
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full text-sm font-medium text-gray-700 mb-6 shadow-sm border border-gray-200">
                        <Zap className="w-4 h-4 text-gray-900" />
                        SIMPLE PRICING
                    </span>
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        START FREE, SCALE WHEN READY
                    </h2>
                    <p className="text-xl text-gray-600">
                        No credit card required. Upgrade when you need more power.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {PRICING_PLANS.map((plan, i) => (
                        <PricingCard key={i} {...plan} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-5 flex items-center justify-between text-left group"
            >
                <span className="font-semibold text-gray-900 group-hover:text-black transition-colors pr-4">{question}</span>
                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-black group-hover:text-white transition-colors`}>
                    <ChevronDown className={`w-5 h-5 transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                <p className="text-gray-600 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

// FAQ Section
export function FAQSection() {
    return (
        <section id="faq" className="py-24 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700 mb-6">
                        <MessageSquare className="w-4 h-4" />
                        FAQ
                    </span>
                    <h2 className="text-4xl font-bold text-black">
                        FREQUENTLY ASKED QUESTIONS
                    </h2>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-2">
                    <div className="divide-y divide-gray-100 px-6">
                        {FAQS.map((faq, i) => (
                            <FAQItem key={i} {...faq} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
