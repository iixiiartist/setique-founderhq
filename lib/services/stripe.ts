import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '../supabase';
import { PlanType } from '../../types';
import { STRIPE_PRICE_IDS, calculateTeamPlanPrice } from '../subscriptionConstants';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Stripe publishable key not found in environment variables');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export interface CheckoutSessionParams {
  workspaceId: string;
  planType: PlanType;
  seatCount?: number; // Required for team plans
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeSession {
  sessionId: string;
  url: string;
}

export class StripeService {
  /**
   * Create a Stripe Checkout Session for subscription
   */
  static async createCheckoutSession(params: CheckoutSessionParams): Promise<StripeSession | null> {
    try {
      const {
        workspaceId,
        planType,
        seatCount = 1,
        successUrl = `${window.location.origin}?subscription=success`,
        cancelUrl = `${window.location.origin}?subscription=canceled`
      } = params;

      // Validate team plan seat count
      if ((planType === 'team-starter' || planType === 'team-pro') && seatCount < 2) {
        throw new Error('Team plans require at least 2 seats');
      }

      // Get Stripe price IDs based on plan
      let priceId: string | undefined;
      let lineItems: Array<{ price: string; quantity: number }> = [];

      if (planType === 'pro-individual') {
        priceId = STRIPE_PRICE_IDS['pro-individual'];
        lineItems = [{ price: priceId!, quantity: 1 }];
      } else if (planType === 'power-individual') {
        priceId = STRIPE_PRICE_IDS['power-individual'];
        lineItems = [{ price: priceId!, quantity: 1 }];
      } else if (planType === 'team-starter') {
        // Team Starter: Base price + per-seat price
        const basePriceId = STRIPE_PRICE_IDS['team-starter-base'];
        const seatPriceId = STRIPE_PRICE_IDS['team-starter-seat'];
        lineItems = [
          { price: basePriceId!, quantity: 1 },
          { price: seatPriceId!, quantity: seatCount }
        ];
      } else if (planType === 'team-pro') {
        // Team Pro: Base price + per-seat price
        const basePriceId = STRIPE_PRICE_IDS['team-pro-base'];
        const seatPriceId = STRIPE_PRICE_IDS['team-pro-seat'];
        lineItems = [
          { price: basePriceId!, quantity: 1 },
          { price: seatPriceId!, quantity: seatCount }
        ];
      } else {
        throw new Error('Free plan does not require checkout');
      }

      // Validate price IDs are configured
      if (lineItems.some(item => !item.price)) {
        throw new Error(`Stripe price IDs not configured for ${planType}. Please set environment variables.`);
      }

      // Get user info for Stripe customer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call Supabase Edge Function to create Stripe session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          workspaceId,
          planType,
          seatCount,
          lineItems,
          customerEmail: user.email,
          successUrl,
          cancelUrl,
          metadata: {
            workspace_id: workspaceId,
            plan_type: planType,
            seat_count: seatCount,
            user_id: user.id
          }
        }
      });

      if (error) throw error;

      return {
        sessionId: data.sessionId,
        url: data.url
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return null;
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  static async redirectToCheckout(params: CheckoutSessionParams): Promise<void> {
    try {
      const session = await this.createCheckoutSession(params);
      if (!session) {
        throw new Error('Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe Customer Portal session for managing subscription
   */
  static async createCustomerPortalSession(workspaceId: string): Promise<string | null> {
    try {
      // Get current subscription to verify Stripe customer exists
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('workspace_id', workspaceId)
        .single();

      if (!subscription?.stripe_customer_id) {
        throw new Error('No active Stripe subscription found');
      }

      // Call Supabase Edge Function to create portal session
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId: subscription.stripe_customer_id,
          returnUrl: window.location.origin
        }
      });

      if (error) throw error;

      return data.url;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      return null;
    }
  }

  /**
   * Redirect to Stripe Customer Portal
   */
  static async redirectToCustomerPortal(workspaceId: string): Promise<void> {
    try {
      const portalUrl = await this.createCustomerPortalSession(workspaceId);
      if (!portalUrl) {
        throw new Error('Failed to create customer portal session');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = portalUrl;
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      throw error;
    }
  }

  /**
   * Update seat count for team subscription
   */
  static async updateSeatCount(workspaceId: string, newSeatCount: number): Promise<boolean> {
    try {
      if (newSeatCount < 2) {
        throw new Error('Team plans require at least 2 seats');
      }

      // Get current subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (!subscription) {
        throw new Error('No subscription found');
      }

      if (subscription.plan_type !== 'team-starter' && subscription.plan_type !== 'team-pro') {
        throw new Error('Seat count can only be updated for team plans');
      }

      if (!subscription.stripe_subscription_id) {
        throw new Error('No Stripe subscription found');
      }

      // Call Supabase Edge Function to update subscription
      const { data, error } = await supabase.functions.invoke('update-subscription-seats', {
        body: {
          subscriptionId: subscription.stripe_subscription_id,
          seatCount: newSeatCount,
          workspaceId
        }
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating seat count:', error);
      return false;
    }
  }

  /**
   * Calculate price preview for plan
   */
  static calculatePrice(planType: PlanType, seatCount: number = 1): number {
    if (planType === 'free') return 0;
    
    if (planType === 'team-starter' || planType === 'team-pro') {
      return calculateTeamPlanPrice(planType, seatCount);
    }

    // Individual plans
    const prices: Record<PlanType, number> = {
      'free': 0,
      'pro-individual': 2900,
      'power-individual': 9900,
      'team-starter': 0, // Calculated above
      'team-pro': 0 // Calculated above
    };

    return prices[planType];
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(workspaceId: string, immediate: boolean = false): Promise<boolean> {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('workspace_id', workspaceId)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No active Stripe subscription found');
      }

      // Call Supabase Edge Function to cancel subscription
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: subscription.stripe_subscription_id,
          immediate,
          workspaceId
        }
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  static async reactivateSubscription(workspaceId: string): Promise<boolean> {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('workspace_id', workspaceId)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No Stripe subscription found');
      }

      // Call Supabase Edge Function to reactivate subscription
      const { data, error } = await supabase.functions.invoke('reactivate-subscription', {
        body: {
          subscriptionId: subscription.stripe_subscription_id,
          workspaceId
        }
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return false;
    }
  }

  /**
   * Check if Stripe is properly configured
   */
  static isConfigured(): boolean {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    return !!publishableKey;
  }

  /**
   * Get Stripe instance
   */
  static async getStripeInstance(): Promise<Stripe | null> {
    return await getStripe();
  }
}

export default StripeService;
