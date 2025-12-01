// CTA Section Component
// Final call-to-action section for landing page

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export function CTASection() {
    return (
        <section className="py-24 bg-black text-white border-t-2 border-black">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 border-2 border-white font-mono font-bold text-sm mb-8">
                    <Zap className="w-4 h-4" />
                    READY TO START?
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold font-mono mb-6">
                    STOP JUGGLING TOOLS.
                    <br />
                    <span className="text-blue-400">START BUILDING.</span>
                </h2>
                
                <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                    Join thousands of founders who've simplified their workflow with FounderHQ. 
                    Start free, no credit card required.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/app"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-500 border-2 border-white text-white font-mono font-bold shadow-[4px_4px_0_0_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                        GET STARTED FREE
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        to="/pricing"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white font-mono font-bold hover:bg-white/10 transition-all"
                    >
                        VIEW PRICING
                    </Link>
                </div>
                
                {/* Trust badges */}
                <div className="mt-16 pt-12 border-t border-gray-800">
                    <p className="text-gray-500 font-mono text-sm mb-6">TRUSTED BY FOUNDERS AT</p>
                    <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
                        <div className="font-mono font-bold text-xl text-gray-400">YC</div>
                        <div className="font-mono font-bold text-xl text-gray-400">TECHSTARS</div>
                        <div className="font-mono font-bold text-xl text-gray-400">500</div>
                        <div className="font-mono font-bold text-xl text-gray-400">ANTLER</div>
                        <div className="font-mono font-bold text-xl text-gray-400">ON DECK</div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default CTASection;
