// CTA Section Component
// Final call-to-action section for landing page - Black and white aesthetic with vector art

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTASection() {
    return (
        <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden relative">
            {/* Animated decorative background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Animated gradient orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                
                {/* Dot grid pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="cta-dots" width="5" height="5" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="0.3" fill="white" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#cta-dots)" />
                    </svg>
                </div>
                
                {/* Animated flowing lines */}
                <svg className="absolute top-0 left-0 w-full h-full opacity-20" viewBox="0 0 1200 400" preserveAspectRatio="none">
                    <path d="M0,200 Q300,100 600,200 T1200,200" stroke="white" strokeWidth="0.5" fill="none" className="animate-[dash_20s_linear_infinite]" strokeDasharray="8 4" />
                    <path d="M0,250 Q400,150 800,250 T1200,250" stroke="white" strokeWidth="0.3" fill="none" className="animate-[dash_25s_linear_infinite]" strokeDasharray="4 8" />
                </svg>
                
                {/* Floating geometric shapes */}
                <div className="absolute top-1/4 left-16 w-6 h-6 border border-white/20 rotate-45 animate-[float_7s_ease-in-out_infinite]" />
                <div className="absolute bottom-1/3 right-20 w-4 h-4 bg-white/10 rounded-full animate-[float_5s_ease-in-out_infinite_0.5s]" />
                <div className="absolute top-1/2 right-1/4 w-8 h-8 border border-white/10 rounded-full animate-[float_8s_ease-in-out_infinite_1s]" />
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 border border-white/20">
                    <Sparkles className="w-4 h-4" />
                    READY TO START?
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                    YOUR ENTIRE GTM.
                    <br />
                    <span className="text-gray-300">ONE AI-POWERED WORKSPACE.</span>
                </h2>
                
                <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
                    Join founders and teams who've unified their GTM stack. CRM, marketing, documents, calendar, chat, and more—all with AI built in.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/app"
                        className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold rounded-2xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
                    >
                        GET STARTED FREE
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        to="/pricing"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl hover:bg-white/20 transition-all border border-white/20"
                    >
                        VIEW PRICING
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default CTASection;
