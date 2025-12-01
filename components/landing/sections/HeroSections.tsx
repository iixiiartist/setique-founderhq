// Landing Page Section Components
// Hero, Navigation, and Footer sections - Black and white aesthetic

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Zap,
    Menu,
    X,
    Bot,
    Command,
    Search,
    BarChart3,
    FileText,
    Globe
} from 'lucide-react';
import { useScrollState } from '../hooks';

// Navigation Component
interface NavigationProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

export function Navigation({ mobileMenuOpen, setMobileMenuOpen }: NavigationProps) {
    const scrolled = useScrollState();

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                            <Command className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl text-black">FOUNDERHQ</span>
                    </Link>
                    
                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-gray-600 hover:text-black transition-colors text-sm font-medium">Features</a>
                        <a href="#ai" className="text-gray-600 hover:text-black transition-colors text-sm font-medium">AI</a>
                        <a href="#pricing" className="text-gray-600 hover:text-black transition-colors text-sm font-medium">Pricing</a>
                        <a href="#faq" className="text-gray-600 hover:text-black transition-colors text-sm font-medium">FAQ</a>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/app" className="text-gray-600 hover:text-black transition-colors text-sm font-medium">
                            Log in
                        </Link>
                        <Link 
                            to="/app" 
                            className="px-5 py-2.5 bg-black text-white font-medium text-sm rounded-full hover:bg-gray-800 transition-all"
                        >
                            Get Started Free
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button 
                        className="md:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6 text-black" /> : <Menu className="w-6 h-6 text-black" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 py-4 shadow-lg">
                    <div className="flex flex-col gap-2 px-4">
                        <a href="#features" className="text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors">Features</a>
                        <a href="#ai" className="text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors">AI</a>
                        <a href="#pricing" className="text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors">Pricing</a>
                        <a href="#faq" className="text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors">FAQ</a>
                        <hr className="my-2 border-gray-200" />
                        <Link to="/app" className="text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors">Log in</Link>
                        <Link to="/app" className="py-3 px-4 bg-black text-white font-medium text-center rounded-xl">
                            Get Started Free
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}

// Animated floating shapes component
function FloatingShapes() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated gradient orbs */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-gray-100 to-gray-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
            
            {/* Animated vector lines */}
            <svg className="absolute top-1/4 left-0 w-full h-32 opacity-10" viewBox="0 0 1200 100" preserveAspectRatio="none">
                <path d="M0,50 Q300,0 600,50 T1200,50" stroke="black" strokeWidth="1" fill="none" className="animate-[dash_20s_linear_infinite]" strokeDasharray="10 5" />
                <path d="M0,60 Q300,100 600,60 T1200,60" stroke="black" strokeWidth="0.5" fill="none" className="animate-[dash_25s_linear_infinite]" strokeDasharray="5 10" />
            </svg>
            
            {/* Floating geometric shapes */}
            <div className="absolute top-1/3 left-20 w-8 h-8 border-2 border-gray-300 rotate-45 animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute top-1/2 right-32 w-6 h-6 bg-gray-200 rounded-full animate-[float_4s_ease-in-out_infinite_0.5s]" />
            <div className="absolute bottom-1/3 left-1/4 w-4 h-4 border-2 border-gray-300 rounded-full animate-[float_5s_ease-in-out_infinite_1s]" />
            <div className="absolute top-2/3 right-1/4 w-10 h-10 border border-gray-200 rotate-12 animate-[float_7s_ease-in-out_infinite_0.3s]" />
        </div>
    );
}

// Hero Section
export function HeroSection() {
    return (
        <section className="relative pt-28 pb-16 bg-gradient-to-b from-white via-gray-50/50 to-white overflow-hidden">
            {/* Animated background elements */}
            <FloatingShapes />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center max-w-4xl mx-auto">
                    {/* Badge */}
                    <div className="mb-8 flex justify-center">
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                            <Zap className="w-4 h-4 text-gray-900" />
                            AI-POWERED GTM WORKSPACE
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
                        THE ALL-IN-ONE HUB FOR{' '}
                        <span className="relative inline-block">
                            <span className="relative z-10 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                                GTM
                            </span>
                            <span className="absolute bottom-2 left-0 right-0 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 -z-0 rounded" />
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        CRM, pipeline, marketing, email, documents, calendar, financials, and team chat—all powered by AI. 
                        One focused workspace that scales with you.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <Link
                            to="/app"
                            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-900 to-black text-white font-semibold text-lg rounded-2xl hover:from-gray-800 hover:to-gray-900 shadow-lg hover:shadow-xl transition-all"
                        >
                            START FREE TODAY
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#features"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 font-semibold text-lg rounded-2xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
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

// Hero Preview Component - Isometric style inspired
function HeroPreview() {
    return (
        <div className="mt-8 relative">
            {/* Central platform with isometric feel */}
            <div className="relative mx-auto max-w-4xl">
                {/* Main dashboard card */}
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                    <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-8">
                        {/* Mock dashboard UI */}
                        <div className="h-full bg-white rounded-2xl shadow-inner overflow-hidden border border-gray-200">
                            <div className="flex h-full">
                                {/* Sidebar */}
                                <div className="w-48 bg-gradient-to-b from-gray-900 to-black p-4 hidden sm:block">
                                    <div className="flex items-center gap-2 mb-8">
                                        <div className="w-8 h-8 bg-white rounded-lg" />
                                        <span className="text-white font-bold text-sm">FOUNDERHQ</span>
                                    </div>
                                    {['Dashboard', 'Pipeline', 'Contacts', 'Huddle', 'Calendar'].map((item, i) => (
                                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl ${i === 3 ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'} transition-colors`}>
                                            <div className={`w-2 h-2 rounded-full ${i === 3 ? 'bg-white' : 'bg-current opacity-50'}`} />
                                            <span className="text-sm font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Main content */}
                                <div className="flex-1 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100/50">
                                    <div className="flex flex-col sm:flex-row gap-4 h-full">
                                        {/* Chat area */}
                                        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex-shrink-0" />
                                                    <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-md text-sm text-gray-700">Just closed the Acme deal! 🎉</div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black rounded-xl flex-shrink-0 flex items-center justify-center">
                                                        <Bot className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2.5 rounded-2xl rounded-tl-md text-sm text-white">
                                                        ✓ Logged as revenue. CRM updated.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Stats */}
                                        <div className="w-full sm:w-44 flex flex-row sm:flex-col gap-3">
                                            {[
                                                { label: 'Revenue', value: '$124,500', gradient: 'from-gray-800 to-gray-900' },
                                                { label: 'Pipeline', value: '$890,000', gradient: 'from-gray-700 to-gray-800' },
                                                { label: 'Closed', value: '23 deals', gradient: 'from-gray-900 to-black' }
                                            ].map((stat, i) => (
                                                <div key={i} className={`bg-gradient-to-br ${stat.gradient} p-4 rounded-2xl flex-1 sm:flex-none`}>
                                                    <div className="text-gray-300 text-xs font-medium">{stat.label}</div>
                                                    <div className="font-bold text-white text-lg">{stat.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating decorative elements - isometric style with animations */}
                <div className="absolute -left-8 top-1/4 hidden lg:block animate-[float_6s_ease-in-out_infinite]">
                    <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-xl flex items-center justify-center">
                                <Search className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-xs">
                                <div className="font-semibold text-gray-800">Search</div>
                                <div className="text-gray-500">Find anything</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute -right-8 top-1/3 hidden lg:block animate-[float_5s_ease-in-out_infinite_0.5s]">
                    <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200 transform rotate-6 hover:rotate-0 transition-transform duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-xs">
                                <div className="font-semibold text-gray-800">Analytics</div>
                                <div className="text-gray-500">Track growth</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute -left-4 bottom-1/4 hidden lg:block animate-[float_7s_ease-in-out_infinite_1s]">
                    <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-xs">
                                <div className="font-semibold text-gray-800">Documents</div>
                                <div className="text-gray-500">Organized files</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute -right-4 bottom-1/4 hidden lg:block animate-[float_6s_ease-in-out_infinite_0.3s]">
                    <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl flex items-center justify-center">
                                <Globe className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-xs">
                                <div className="font-semibold text-gray-800">Connect</div>
                                <div className="text-gray-500">Integrations</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Footer Component
export function Footer() {
    return (
        <footer className="bg-gradient-to-b from-gray-900 to-black text-white py-16 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100" height="100" fill="url(#grid)" />
                </svg>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                                <Command className="w-5 h-5 text-black" />
                            </div>
                            <span className="font-bold text-xl">FOUNDERHQ</span>
                        </Link>
                        <p className="text-gray-300 mb-4 max-w-xs leading-relaxed">
                            The AI-powered GTM workspace. CRM, marketing, email, documents, calendar, and chat—unified for teams that scale.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold mb-4 text-gray-200">PRODUCT</h4>
                        <ul className="space-y-3">
                            <li>
                                <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">
                                    Features
                                </a>
                            </li>
                            <li>
                                <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
                                    Pricing
                                </a>
                            </li>
                            <li>
                                <Link to="/api-docs" className="text-gray-400 hover:text-white transition-colors text-sm">
                                    API Docs
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4 text-gray-200">LEGAL</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                                    Privacy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                                    Terms
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} FOUNDERHQ. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
