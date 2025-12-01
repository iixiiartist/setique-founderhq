// Landing Page Refactored
// Main component that orchestrates all landing page sections

import React from 'react';
import {
    Navigation,
    HeroSection,
    FeaturesSection,
    AISection,
    PricingSection,
    FAQSection,
    CTASection,
    Footer
} from './sections';

export function LandingPageRefactored() {
    return (
        <div className="min-h-screen bg-white">
            <Navigation />
            <main>
                <HeroSection />
                <FeaturesSection />
                <AISection />
                <PricingSection />
                <FAQSection />
                <CTASection />
            </main>
            <Footer />
        </div>
    );
}

export default LandingPageRefactored;
