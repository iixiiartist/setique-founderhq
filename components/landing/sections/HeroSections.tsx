// Landing Page Section Components
// Hero, Navigation, and Footer sections

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Zap,
    Menu,
    X,
    Bot,
    Command
} from 'lucide-react';
import { useScrollState } from './hooks';

// Navigation Component
interface NavigationProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

export function Navigation({ mobileMenuOpen, setMobileMenuOpen }: NavigationProps) {
    const scrolled = useScrollState();

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white border-b-2 border-black' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black flex items-center justify-center">
                            <Command className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl font-mono text-black">FOUNDERHQ</span>
                    </Link>
                    
                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">FEATURES</a>
                        <a href="#ai" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">AI</a>
                        <a href="#pricing" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">PRICING</a>
                        <a href="#faq" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">FAQ</a>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/app" className="text-black hover:text-blue-600 transition-colors text-sm font-mono font-bold">
                            LOG IN
                        </Link>
                        <Link 
                            to="/app" 
                            className="px-4 py-2 bg-black border-2 border-black text-white font-mono font-bold text-sm shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                            GET STARTED FREE
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button 
                        className="md:hidden p-2 border-2 border-black"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t-2 border-black py-4">
                    <div className="flex flex-col gap-4 px-4">
                        <a href="#features" className="text-black font-mono font-bold py-2">FEATURES</a>
                        <a href="#ai" className="text-black font-mono font-bold py-2">AI</a>
                        <a href="#pricing" className="text-black font-mono font-bold py-2">PRICING</a>
                        <a href="#faq" className="text-black font-mono font-bold py-2">FAQ</a>
                        <hr className="border-black" />
                        <Link to="/app" className="text-black font-mono font-bold py-2">LOG IN</Link>
                        <Link to="/app" className="px-4 py-3 bg-black border-2 border-black text-white font-mono font-bold text-center">
                            GET STARTED FREE
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

// Hero Section
export function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 bg-yellow-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    {/* Badge */}
                    <div className="mb-8 flex justify-center">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-neo font-mono font-bold text-sm">
                            <Zap className="w-4 h-4" />
                            NOW WITH AI-POWERED DATA ENTRY
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-mono text-black leading-tight mb-6">
                        THE ALL-IN-ONE HUB FOR{' '}
                        <span className="bg-black text-yellow-100 px-4">
                            GTM
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl text-black mb-8 max-w-2xl mx-auto leading-relaxed">
                        Stop juggling 10 tools. CRM, team chat, financials, and AI—unified in one workspace. 
                        Ship faster. Close more. Scale without the chaos.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                        <Link
                            to="/app"
                            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-black border-2 border-black text-white font-mono font-bold text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                            START FREE TODAY
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#features"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-black text-black font-mono font-bold text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                            SEE FEATURES
                        </a>
                    </div>
                </div>

                {/* Hero Image / App Preview */}
                <HeroPreview />
            </div>
        </section>
    );
}

// Hero Preview Component
function HeroPreview() {
    return (
        <div className="mt-16 relative">
            <div className="relative mx-auto max-w-5xl bg-white border-2 border-black shadow-neo-lg overflow-hidden">
                <div className="aspect-[16/10] bg-gray-900 p-4 sm:p-8">
                    {/* Mock dashboard UI */}
                    <div className="h-full bg-gray-800 border-2 border-gray-600 overflow-hidden">
                        <div className="flex h-full">
                            {/* Sidebar */}
                            <div className="w-32 sm:w-48 bg-gray-900 border-r-2 border-gray-600 p-2 sm:p-4 hidden sm:block">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-6 h-6 bg-yellow-400" />
                                    <span className="text-white font-mono font-bold text-sm">FOUNDERHQ</span>
                                </div>
                                {['Dashboard', 'Pipeline', 'Contacts', 'Huddle', 'Calendar'].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-2 px-2 py-2 mb-1 ${i === 3 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                                        <div className="w-3 h-3 bg-current opacity-50" />
                                        <span className="text-xs font-mono">{item}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Main content */}
                            <div className="flex-1 p-2 sm:p-4">
                                <div className="flex flex-col sm:flex-row gap-4 h-full">
                                    {/* Chat area */}
                                    <div className="flex-1 bg-gray-700 p-2 sm:p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-2">
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500 flex-shrink-0" />
                                                <div className="bg-gray-600 px-3 py-2 text-xs sm:text-sm text-gray-200 font-mono">Just closed the Acme deal! 🎉</div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 flex-shrink-0 flex items-center justify-center">
                                                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                                </div>
                                                <div className="bg-blue-600 px-3 py-2 text-xs sm:text-sm text-white font-mono">
                                                    ✓ Logged as revenue. CRM updated.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Stats */}
                                    <div className="w-full sm:w-48 flex flex-row sm:flex-col gap-2 sm:gap-3">
                                        {[
                                            { label: 'Revenue', value: '$124,500', bg: 'bg-green-500' },
                                            { label: 'Pipeline', value: '$890,000', bg: 'bg-blue-500' },
                                            { label: 'Closed', value: '23 deals', bg: 'bg-purple-500' }
                                        ].map((stat, i) => (
                                            <div key={i} className={`${stat.bg} p-2 sm:p-3 flex-1 sm:flex-none`}>
                                                <div className="text-white/70 text-xs font-mono">{stat.label}</div>
                                                <div className="font-bold text-white font-mono text-sm sm:text-base">{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// CTA Section
export function CTASection() {
    return (
        <section className="py-24 bg-blue-500 border-t-2 border-black">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl md:text-5xl font-bold font-mono text-white mb-6">
                    READY TO TRANSFORM YOUR GTM?
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                    Start free today—no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/app"
                        className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-black text-black font-mono font-bold text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                        GET STARTED FREE
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

// Footer Component
export function Footer() {
    return (
        <footer className="bg-black text-white py-16 border-t-2 border-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-yellow-400 flex items-center justify-center">
                                <Command className="w-5 h-5 text-black" />
                            </div>
                            <span className="font-bold text-xl font-mono">FOUNDERHQ</span>
                        </Link>
                        <p className="text-gray-400 mb-4 max-w-xs">
                            The all-in-one GTM hub for founders, consultants, and small businesses.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-bold font-mono mb-4">PRODUCT</h4>
                        <ul className="space-y-2">
                            <li>
                                <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm font-mono">
                                    Features
                                </a>
                            </li>
                            <li>
                                <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm font-mono">
                                    Pricing
                                </a>
                            </li>
                            <li>
                                <Link to="/api-docs" className="text-gray-400 hover:text-white transition-colors text-sm font-mono">
                                    API Docs
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold font-mono mb-4">LEGAL</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm font-mono">
                                    Privacy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="text-gray-400 hover:text-white transition-colors text-sm font-mono">
                                    Terms
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t-2 border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm font-mono">
                        © {new Date().getFullYear()} FOUNDERHQ. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </div>
        </footer>
    );
}
