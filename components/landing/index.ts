// Landing Page Components Module
// Re-exports all landing page components and utilities

// Main component
export { LandingPageRefactored, default } from './LandingPageRefactored';

// Section components
export {
    Navigation,
    HeroSection,
    FeaturesSection,
    FeatureCard,
    AISection,
    PricingSection,
    PricingCard,
    FAQSection,
    CTASection,
    Footer
} from './sections';

// Constants
export {
    FEATURES,
    PRICING_PLANS,
    FAQS,
    AI_CAPABILITIES
} from './constants';

// Hooks
export {
    useIntersectionObserver,
    useScrollState
} from './hooks';
