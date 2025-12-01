// BusinessProfileSetupRefactored
// Main component that orchestrates the multi-step business profile setup wizard

import React from 'react';
import { X } from 'lucide-react';
import { BusinessProfile } from '../../types';
import { useBusinessProfileForm } from './hooks/useBusinessProfileForm';
import {
    Step1CompanyBasics,
    Step2BusinessModel,
    Step3GoalsGrowth,
    Step4Metrics,
    Step5MarketPositioning
} from './steps/StepComponents';
import {
    Step6Monetization,
    Step7ProductsTech
} from './steps/AdvancedSteps';

interface BusinessProfileSetupProps {
    onComplete: (profile: Partial<BusinessProfile>) => void;
    onSkip?: () => void;
    initialData?: Partial<BusinessProfile>;
}

// Step Indicator Component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                    key={idx}
                    className={`h-2 w-12 rounded-full transition-colors ${
                        idx + 1 === currentStep
                            ? 'bg-blue-600'
                            : idx + 1 < currentStep
                            ? 'bg-blue-400'
                            : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
}

// Missing Fields Warning
function MissingFieldsWarning({ fields }: { fields: { key: string; label: string }[] }) {
    if (fields.length === 0) return null;
    
    return (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-semibold text-slate-900 mb-2">Almost there ⏱️</h2>
            <p className="text-sm text-slate-700">
                These fields power Copilot personalization. Please fill them in before finishing:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-900 mt-2 space-y-1">
                {fields.map(field => (
                    <li key={field.key}>{field.label}</li>
                ))}
            </ul>
        </div>
    );
}

export function BusinessProfileSetupRefactored({
    onComplete,
    onSkip,
    initialData = {}
}: BusinessProfileSetupProps) {
    const form = useBusinessProfileForm({ initialData, onComplete });

    const renderCurrentStep = () => {
        switch (form.step) {
            case 1:
                return (
                    <Step1CompanyBasics
                        formData={form.formData}
                        updateField={form.updateField}
                        validationErrors={form.validationErrors}
                        clearError={form.clearError}
                    />
                );
            case 2:
                return (
                    <Step2BusinessModel
                        formData={form.formData}
                        updateField={form.updateField}
                    />
                );
            case 3:
                return (
                    <Step3GoalsGrowth
                        formData={form.formData}
                        updateField={form.updateField}
                    />
                );
            case 4:
                return (
                    <Step4Metrics
                        formData={form.formData}
                        updateField={form.updateField}
                    />
                );
            case 5:
                return (
                    <Step5MarketPositioning
                        formData={form.formData}
                        updateField={form.updateField}
                    />
                );
            case 6:
                return (
                    <Step6Monetization
                        formData={form.formData}
                        updateField={form.updateField}
                        onAddTier={form.addPricingTier}
                        onUpdateTier={form.updatePricingTier}
                        onRemoveTier={form.removePricingTier}
                    />
                );
            case 7:
                return (
                    <Step7ProductsTech
                        formData={form.formData}
                        updateField={form.updateField}
                        onAddProduct={form.addCoreProduct}
                        onUpdateProduct={form.updateCoreProduct}
                        onRemoveProduct={form.removeCoreProduct}
                        onAddService={form.addServiceOffering}
                        onUpdateService={form.updateServiceOffering}
                        onRemoveService={form.removeServiceOffering}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center z-[100] p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div 
                className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-gray-200 p-6 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Business Profile Setup</h1>
                        <p className="text-sm text-gray-600">
                            Step {form.step} of {form.totalSteps} • 
                            <span className="text-green-600 ml-1">✓ Draft auto-saved</span>
                        </p>
                    </div>
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="p-2 hover:bg-gray-100 transition-colors"
                            title="Skip for now"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    <MissingFieldsWarning fields={form.missingFields} />
                    <StepIndicator currentStep={form.step} totalSteps={form.totalSteps} />
                    {renderCurrentStep()}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 flex items-center justify-between sticky bottom-0 bg-white rounded-b-2xl">
                    <div>
                        {form.step > 1 && (
                            <button
                                onClick={form.prevStep}
                                className="px-6 py-3 rounded-xl border border-gray-200 bg-white font-medium text-slate-700 hover:bg-gray-50 transition-colors"
                            >
                                ← Back
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {onSkip && form.step === 1 && (
                            <button
                                onClick={onSkip}
                                className="px-6 py-3 rounded-xl border border-gray-200 bg-white font-medium text-slate-700 hover:bg-gray-50 transition-colors"
                            >
                                Skip for now
                            </button>
                        )}
                        <button
                            onClick={form.nextStep}
                            disabled={!form.canProceed()}
                            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                                form.canProceed()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {form.step === form.totalSteps ? 'Complete Setup →' : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BusinessProfileSetupRefactored;
