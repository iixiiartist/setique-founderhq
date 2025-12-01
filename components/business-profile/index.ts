// Business Profile Module Exports
// Refactored components for multi-step business profile setup

// Main component
export { BusinessProfileSetupRefactored } from './BusinessProfileSetupRefactored';

// Step components
export {
    Step1CompanyBasics,
    Step2BusinessModel,
    Step3GoalsGrowth,
    Step4Metrics,
    Step5MarketPositioning,
    FieldInput,
    FieldTextarea,
    OptionButtons
} from './steps/StepComponents';

export {
    Step6Monetization,
    Step7ProductsTech,
    PricingTierItem,
    CoreProductItem,
    ServiceOfferingItem
} from './steps/AdvancedSteps';

// Hook
export { useBusinessProfileForm } from './hooks/useBusinessProfileForm';

// Constants
export {
    INDUSTRIES,
    COMPANY_SIZES,
    BUSINESS_MODELS,
    PRIMARY_GOALS,
    GROWTH_STAGES,
    MONETIZATION_MODELS,
    DEFAULT_DEAL_TYPES,
    DEFAULT_BILLING_CYCLE,
    BILLING_CYCLES,
    TOTAL_STEPS,
    REQUIRED_FIELDS
} from './constants';
