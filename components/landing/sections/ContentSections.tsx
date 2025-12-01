// Landing Page Content Sections
// Features, AI, Pricing, and FAQ sections

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronDown,
    Zap,
    Bot,
    MessageSquare
} from 'lucide-react';
import { useIntersectionObserver } from '../hooks';
import { FEATURES, AI_CAPABILITIES, FAQS, PRICING_PLANS } from '../constants';

// Neo-brutalist feature card
interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    bgColor: string;
    delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, bgColor, delay = 0 }: FeatureCardProps) {
    const [ref, isVisible] = useIntersectionObserver();
    
    return (
        <div 
            ref={ref}
            className={`${bgColor} border-2 border-black shadow-neo p-6 transition-all duration-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="w-12 h-12 bg-black flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold font-mono text-black mb-2">{title}</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

// Features Section
export function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-white border-t-2 border-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border-2 border-black shadow-neo font-mono font-bold text-sm mb-6">
                        ALL-IN-ONE PLATFORM
                    </span>
                    <h2 className="text-4xl font-bold font-mono text-black mb-4">
                        EVERYTHING YOU NEED TO SCALE
                    </h2>
                    <p className="text-xl text-gray-700">
                        Stop juggling multiple tools. FounderHQ brings your CRM, communications, finances, and workflows into one platform.
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
        <div className="flex items-start gap-3 p-4 bg-gray-900 border-2 border-gray-700 hover:border-white transition-colors">
            <div className="w-10 h-10 bg-purple-500 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <p className="font-bold font-mono text-white text-sm">{label}</p>
                <p className="text-gray-400 text-xs">{description}</p>
            </div>
        </div>
    );
}

// AI Chat Mockup
function AIChatMockup() {
    return (
        <div className="relative">
            <div className="bg-gray-900 border-2 border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-700">
                    <div className="w-10 h-10 bg-purple-500 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold font-mono text-white">AI Assistant</p>
                        <p className="text-green-400 text-xs font-mono flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400" />
                            Online in #general
                        </p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                        <div className="bg-blue-600 px-4 py-2 max-w-xs">
                            <p className="text-white text-sm font-mono">@AI log expense $250 for client dinner with Acme Corp</p>
                        </div>
                    </div>
                    
                    {/* AI response */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gray-800 border-2 border-gray-700 px-4 py-3 max-w-xs">
                            <p className="text-white text-sm font-mono mb-2">✓ Done! Expense logged:</p>
                            <div className="bg-gray-900 p-3 text-xs font-mono">
                                <p className="text-gray-300"><span className="text-gray-500">Amount:</span> $250.00</p>
                                <p className="text-gray-300"><span className="text-gray-500">Category:</span> Client Entertainment</p>
                                <p className="text-gray-300"><span className="text-gray-500">Account:</span> Acme Corp</p>
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
        <section id="ai" className="py-24 bg-black text-white border-t-2 border-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Content */}
                    <div>
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 border-2 border-white font-mono font-bold text-sm mb-6">
                            <Bot className="w-4 h-4" />
                            AI-POWERED
                        </span>
                        <h2 className="text-4xl font-bold font-mono mb-4">
                            YOUR AI ASSISTANT THAT ACTUALLY GETS WORK DONE
                        </h2>
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                            Skip the busywork. Our AI assistant in Huddle chat understands natural language and can create contacts, log expenses, track revenue, and manage tasks—just by asking.
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
}

export function PricingCard({ 
    name, 
    price, 
    period, 
    description, 
    features, 
    cta, 
    popular = false,
    bgColor = 'bg-white'
}: PricingCardProps) {
    return (
        <div className={`relative ${bgColor} border-2 border-black shadow-neo p-6 ${popular ? 'ring-4 ring-blue-500' : ''}`}>
            {popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 border-2 border-black text-white text-xs font-bold font-mono px-3 py-1">
                        BEST VALUE
                    </span>
                </div>
            )}
            <h3 className="text-2xl font-bold font-mono text-black mb-1">{name}</h3>
            <p className="text-sm text-gray-600 font-mono mb-4">{description}</p>
            <div className="mb-6">
                <span className="text-4xl font-bold font-mono text-black">{price}</span>
                <span className="text-black font-mono">{period}</span>
            </div>
            <ul className="space-y-3 mb-8">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-black">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span className="font-mono">{feature}</span>
                    </li>
                ))}
            </ul>
            <Link
                to="/app"
                className={`block w-full py-3 font-mono font-bold border-2 border-black text-center transition-all ${popular ? 'bg-blue-500 text-white shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'}`}
            >
                {cta}
            </Link>
        </div>
    );
}

// Pricing Section
export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-green-100 border-t-2 border-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo font-mono font-bold text-sm mb-6">
                        <Zap className="w-4 h-4" />
                        SIMPLE PRICING
                    </span>
                    <h2 className="text-4xl font-bold font-mono text-black mb-4">
                        START FREE, SCALE WHEN READY
                    </h2>
                    <p className="text-xl text-gray-700">
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
        <div className="border-b-2 border-black last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 flex items-center justify-between text-left group"
            >
                <span className="font-bold font-mono text-black group-hover:text-blue-600 transition-colors">{question}</span>
                <ChevronDown className={`w-5 h-5 text-black transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}>
                <p className="text-gray-700 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

// FAQ Section
export function FAQSection() {
    return (
        <section id="faq" className="py-24 bg-white border-t-2 border-black">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 border-2 border-black shadow-neo font-mono font-bold text-sm mb-6">
                        <MessageSquare className="w-4 h-4" />
                        FAQ
                    </span>
                    <h2 className="text-4xl font-bold font-mono text-black">
                        FREQUENTLY ASKED QUESTIONS
                    </h2>
                </div>

                <div className="bg-white border-2 border-black shadow-neo">
                    {FAQS.map((faq, i) => (
                        <FAQItem key={i} {...faq} />
                    ))}
                </div>
            </div>
        </section>
    );
}
