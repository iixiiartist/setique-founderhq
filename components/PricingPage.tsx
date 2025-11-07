import React, { useState } from 'react';
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
import { StripeService } from '../lib/services/stripe';

interface PricingPageProps {
    currentPlan?: PlanType;
    workspaceId?: string;
    onClose: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ currentPlan = 'free', workspaceId, onClose }) => {
    const [planCategory, setPlanCategory] = useState<'individual' | 'team'>('individual');
    const [teamSeats, setTeamSeats] = useState(MINIMUM_TEAM_SEATS);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async (planType: PlanType) => {
        if (!workspaceId) {
            alert('No workspace found. Please refresh and try again.');
            return;
        }
        
        setIsLoading(true);
        try {
            
            await StripeService.redirectToCheckout({
                workspaceId,
                planType,
                ...(isTeamPlan(planType) && { seatCount: teamSeats })
            });
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            alert('Failed to start checkout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderPlanCard = (planType: PlanType, isPopular: boolean = false) => {
        const limits = PLAN_LIMITS[planType];
        const basePrice = PLAN_PRICES[planType];
        const seatPrice = isTeamPlan(planType) ? SEAT_PRICES[planType as 'team-starter' | 'team-pro'] : 0;
        const totalPrice = isTeamPlan(planType) ? calculateTeamPlanPrice(planType as 'team-starter' | 'team-pro', teamSeats) : basePrice;
        const isCurrentPlan = currentPlan === planType;

        return (
            <div 
                key={planType}
                className={`relative bg-white border-2 border-black shadow-neo p-6 ${isPopular ? 'ring-4 ring-blue-500' : ''}`}
            >
                {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 border-2 border-black text-white text-xs font-bold font-mono px-3 py-1">
                            MOST POPULAR
                        </span>
                    </div>
                )}
                
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold font-mono text-black mb-2">
                        {limits.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold font-mono text-black">
                            {formatPrice(isTeamPlan(planType) ? basePrice : totalPrice)}
                        </span>
                        <span className="text-black font-mono">/month</span>
                    </div>
                    {isTeamPlan(planType) && (
                        <p className="text-sm text-black font-mono mt-1">
                            + {formatPrice(seatPrice)}/user/month
                        </p>
                    )}
                </div>

                {isTeamPlan(planType) && (
                    <div className="mb-6 border-2 border-dashed border-black p-4">
                        <label className="block text-sm text-black font-mono font-bold mb-2">
                            Number of seats
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTeamSeats(Math.max(MINIMUM_TEAM_SEATS, teamSeats - 1))}
                                className="bg-white border-2 border-black text-black font-mono font-bold px-3 py-1 shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                                disabled={teamSeats <= MINIMUM_TEAM_SEATS}
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={teamSeats}
                                onChange={(e) => setTeamSeats(Math.max(MINIMUM_TEAM_SEATS, parseInt(e.target.value) || MINIMUM_TEAM_SEATS))}
                                className="bg-white border-2 border-black text-black font-mono text-center px-4 py-2 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min={MINIMUM_TEAM_SEATS}
                            />
                            <button
                                onClick={() => setTeamSeats(teamSeats + 1)}
                                className="bg-white border-2 border-black text-black font-mono font-bold px-3 py-1 shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-sm text-black font-mono mt-2">
                            Total: <span className="font-bold">{formatPrice(totalPrice)}/month</span>
                        </p>
                    </div>
                )}

                <ul className="space-y-3 mb-6">
                    {planType !== 'free' && (
                        <li className="flex items-start gap-2 text-sm text-black">
                            <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                            <span className="font-mono">
                                {limits.aiRequestsPerMonth === null ? 'Unlimited' : limits.aiRequestsPerMonth} AI requests/month
                                {isTeamPlan(planType) && ' per user'}
                            </span>
                        </li>
                    )}
                    <li className="flex items-start gap-2 text-sm text-black">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span className="font-mono">
                            {limits.fileCount === null ? 'Unlimited' : limits.fileCount} files
                            {isTeamPlan(planType) && ' per user'}
                        </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-black">
                        <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                        <span className="font-mono">
                            {formatBytes(limits.storageBytes)} storage
                            {isTeamPlan(planType) && ' shared'}
                        </span>
                    </li>
                    {limits.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-black">
                            <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                            <span className="font-mono">{feature}</span>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={() => handleSubscribe(planType)}
                    disabled={isCurrentPlan || isLoading || planType === 'free'}
                    className={`w-full py-3 font-mono font-bold border-2 border-black transition-all ${
                        isCurrentPlan
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : planType === 'free'
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : isPopular
                            ? 'bg-blue-500 text-white shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                            : 'bg-white text-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                    }`}
                >
                    {isCurrentPlan ? 'CURRENT PLAN' : planType === 'free' ? 'FREE FOREVER' : isLoading ? 'PROCESSING...' : 'SUBSCRIBE NOW'}
                </button>
            </div>
        );
    };

    const individualPlans: PlanType[] = ['free', 'power-individual'];
    const teamPlans: PlanType[] = ['team-pro'];

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
            <div className="bg-white border-2 border-black shadow-neo rounded-none max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b-2 border-black p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-3xl font-bold text-black font-mono">Choose Your Plan</h2>
                        <p className="text-gray-700 mt-1">Select the perfect plan for your needs</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-black hover:bg-gray-200 text-2xl font-bold w-10 h-10 flex items-center justify-center border-2 border-black"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    {/* Plan Category Tabs */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex border-2 border-black">
                            <button
                                onClick={() => setPlanCategory('individual')}
                                className={`px-6 py-2 font-mono font-semibold transition border-r-2 border-black ${
                                    planCategory === 'individual'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-black hover:bg-gray-100'
                                }`}
                            >
                                Individual Plans
                            </button>
                            <button
                                onClick={() => setPlanCategory('team')}
                                className={`px-6 py-2 font-mono font-semibold transition ${
                                    planCategory === 'team'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-black hover:bg-gray-100'
                                }`}
                            >
                                Team Plans
                            </button>
                        </div>
                    </div>

                    {/* Individual Plans */}
                    {planCategory === 'individual' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {individualPlans.map((plan, idx) => 
                                renderPlanCard(plan, plan === 'power-individual')
                            )}
                        </div>
                    )}

                    {/* Team Plans */}
                    {planCategory === 'team' && (
                        <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
                            {teamPlans.map((plan, idx) => 
                                renderPlanCard(plan, plan === 'team-pro')
                            )}
                        </div>
                    )}

                    {/* FAQ/Info Section */}
                    <div className="mt-12 pt-8 border-t-2 border-black">
                        <h3 className="text-2xl font-bold text-black mb-6 text-center font-mono">Frequently Asked Questions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            <div className="bg-yellow-100 border-2 border-black p-4 shadow-neo">
                                <h4 className="font-bold text-black mb-2 font-mono">Can I change plans later?</h4>
                                <p className="text-sm text-black">Yes! You can upgrade or downgrade anytime from your settings.</p>
                            </div>
                            <div className="bg-pink-100 border-2 border-black p-4 shadow-neo">
                                <h4 className="font-bold text-black mb-2 font-mono">What payment methods do you accept?</h4>
                                <p className="text-sm text-black">We accept all major credit cards through Stripe.</p>
                            </div>
                            <div className="bg-green-100 border-2 border-black p-4 shadow-neo">
                                <h4 className="font-bold text-black mb-2 font-mono">Is there a free trial?</h4>
                                <p className="text-sm text-black">The Free plan is available forever! Upgrade when you're ready.</p>
                            </div>
                            <div className="bg-purple-100 border-2 border-black p-4 shadow-neo">
                                <h4 className="font-bold text-black mb-2 font-mono">How does team billing work?</h4>
                                <p className="text-sm text-black">You pay a base price plus per-seat pricing. Add or remove seats anytime.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
