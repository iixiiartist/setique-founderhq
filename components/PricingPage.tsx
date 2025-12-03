import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { 
    PLAN_PRICES, 
    SEAT_PRICES, 
    PLAN_LIMITS, 
    MINIMUM_TEAM_SEATS,
    formatPrice,
    formatBytes,
    calculateTeamPlanPrice,
    isTeamPlan,
    PlanType
} from '../lib/subscriptionConstants';
import { stripeEdgeFunctions } from '../src/services/stripeEdgeFunctions';

interface PricingPageProps {
    currentPlan?: PlanType;
    workspaceId?: string;
    onClose: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ currentPlan = 'free', workspaceId, onClose }) => {
    const [teamSeats, setTeamSeats] = useState(MINIMUM_TEAM_SEATS);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async (planType: PlanType) => {
        if (!workspaceId) {
            toast.error('No workspace found. Please refresh and try again.');
            return;
        }
        
        setIsLoading(true);
        try {
            const { url } = await stripeEdgeFunctions.createCheckoutSession({
                workspaceId,
                planType: 'team-pro',
                seatCount: teamSeats,
                successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: window.location.href,
            });
            
            window.location.href = url;
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            toast.error('Failed to start checkout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const planSubheading: Record<PlanType, string> = {
        'free': '25 Copilot requests every month • unlimited documents & storage',
        'team-pro': 'Unlimited Copilot, storage, and team collaboration for all seats',
    };

    const planBadgeText: Partial<Record<PlanType, string>> = {
        'free': 'NOW INCLUDES AI',
        'team-pro': 'BEST VALUE',
    };

    const renderPlanCard = (planType: PlanType, isPopular: boolean = false) => {
        const limits = PLAN_LIMITS[planType];
        const basePrice = PLAN_PRICES[planType];
        const seatPrice = isTeamPlan(planType) ? SEAT_PRICES['team-pro'] : 0;
        const totalPrice = isTeamPlan(planType) ? calculateTeamPlanPrice('team-pro', teamSeats) : basePrice;
        const isCurrentPlan = currentPlan === planType;

        return (
            <div 
                key={planType}
                className={`relative bg-white border border-gray-200 rounded-2xl shadow-lg p-6 ${isPopular ? 'ring-2 ring-slate-900' : ''}`}
            >
                {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            MOST POPULAR
                        </span>
                    </div>
                )}
                
                <div className="text-center mb-6">
                    <div className="flex flex-col items-center gap-2">
                        <h3 className="text-2xl font-bold text-slate-900">
                            {limits.name}
                        </h3>
                        {planBadgeText[planType] && (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-slate-700">
                                {planBadgeText[planType]}
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-slate-900">
                            {formatPrice(basePrice)}
                        </span>
                        <span className="text-slate-600">/month</span>
                    </div>
                    {isTeamPlan(planType) && (
                        <p className="text-sm text-slate-600 mt-1">
                            base (includes owner) + {formatPrice(seatPrice)}/extra user
                        </p>
                    )}
                    <p className="text-sm text-slate-600 mt-3">
                        {planSubheading[planType]}
                    </p>
                </div>

                {isTeamPlan(planType) && (
                    <div className="mb-6 border border-dashed border-gray-300 rounded-xl p-4">
                        <label className="block text-sm text-slate-700 font-semibold mb-2">
                            Team size (including you)
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTeamSeats(Math.max(MINIMUM_TEAM_SEATS, teamSeats - 1))}
                                className="bg-white border border-gray-200 text-slate-700 font-semibold px-3 py-1 rounded-xl hover:bg-gray-50 transition-colors"
                                disabled={teamSeats <= MINIMUM_TEAM_SEATS}
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={teamSeats}
                                onChange={(e) => setTeamSeats(Math.max(MINIMUM_TEAM_SEATS, parseInt(e.target.value) || MINIMUM_TEAM_SEATS))}
                                className="bg-white border border-gray-200 text-slate-700 text-center px-4 py-2 w-20 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                                min={MINIMUM_TEAM_SEATS}
                            />
                            <button
                                onClick={() => setTeamSeats(teamSeats + 1)}
                                className="bg-white border border-gray-200 text-slate-700 font-semibold px-3 py-1 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                            {teamSeats === 1 ? (
                                <span>Total: <span className="font-bold">{formatPrice(totalPrice)}/month</span> (just you)</span>
                            ) : (
                                <span>Total: <span className="font-bold">{formatPrice(totalPrice)}/month</span> ({teamSeats} users)</span>
                            )}
                        </p>
                    </div>
                )}

                <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span>
                            {limits.aiRequestsPerMonth === null ? 'Unlimited' : `${limits.aiRequestsPerMonth}`} AI requests/month
                            {isTeamPlan(planType) && ' per user'}
                        </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span>
                            {limits.fileCount === null ? 'Unlimited' : limits.fileCount.toLocaleString()} files
                            {isTeamPlan(planType) && ' per user'}
                        </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span>
                            {limits.storageBytes === null ? 'Unlimited storage' : `${formatBytes(limits.storageBytes)} storage`}
                            {isTeamPlan(planType) && ' shared'}
                        </span>
                    </li>
                    {limits.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={() => handleSubscribe(planType)}
                    disabled={isCurrentPlan || isLoading || planType === 'free'}
                    className={`w-full py-3 font-semibold uppercase rounded-xl transition-all ${
                        isCurrentPlan
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : planType === 'free'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : isPopular
                            ? 'bg-slate-900 text-white shadow-sm hover:shadow-md hover:bg-slate-800'
                            : 'bg-white text-slate-900 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50'
                    }`}
                >
                    {isCurrentPlan ? 'CURRENT PLAN' : planType === 'free' ? 'FREE FOREVER' : isLoading ? 'PROCESSING...' : 'SUBSCRIBE NOW'}
                </button>
            </div>
        );
    };

    const plans: PlanType[] = ['free', 'team-pro'];

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
            <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Choose Your Plan</h2>
                        <p className="text-slate-600 mt-1">Every plan includes Copilot access — start free with 25 monthly requests and unlimited storage.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-700 hover:bg-gray-100 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    {/* Simplified Pricing - Two Plans Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {plans.map((plan) => 
                            renderPlanCard(plan, plan === 'team-pro')
                        )}
                    </div>

                    {/* FAQ/Info Section */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Frequently Asked Questions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 mb-2">Can I change plans later?</h4>
                                <p className="text-sm text-slate-600">Yes! You can upgrade or downgrade anytime from your settings.</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 mb-2">What payment methods do you accept?</h4>
                                <p className="text-sm text-slate-600">We accept all major credit cards through Stripe.</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 mb-2">Is there a free trial?</h4>
                                <p className="text-sm text-slate-600">The Free plan is available forever! Upgrade when you're ready.</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 mb-2">How does team billing work?</h4>
                                <p className="text-sm text-slate-600">You pay a base price plus per-seat pricing. Add or remove seats anytime.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
