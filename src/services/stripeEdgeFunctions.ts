import { supabase } from "../../lib/supabase";

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface CheckoutSessionParams {
  workspaceId: string;
  planType: 'power-individual' | 'team-pro';
  seatCount?: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

interface PortalSessionParams {
  customerId: string;
  returnUrl: string;
}

interface UpdateSeatsParams {
  subscriptionId: string;
  workspaceId: string;
  seatCount: number;
}

interface CancelSubscriptionParams {
  subscriptionId: string;
  workspaceId: string;
  immediate?: boolean;
}

interface ReactivateSubscriptionParams {
  subscriptionId: string;
  workspaceId: string;
}

export const stripeEdgeFunctions = {
  /**
   * Create a Stripe Checkout session for a new subscription
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<{ sessionId: string; url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${FUNCTIONS_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return response.json();
  },

  /**
   * Create a Stripe Customer Portal session for managing subscriptions
   */
  async createPortalSession(params: PortalSessionParams): Promise<{ url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${FUNCTIONS_BASE_URL}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create portal session');
    }

    return response.json();
  },

  /**
   * Update the seat count for a team subscription
   */
  async updateSubscriptionSeats(params: UpdateSeatsParams): Promise<{ success: boolean }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${FUNCTIONS_BASE_URL}/update-subscription-seats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update subscription seats');
    }

    return response.json();
  },

  /**
   * Cancel a subscription (immediate or at period end)
   */
  async cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean; status: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${FUNCTIONS_BASE_URL}/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel subscription');
    }

    return response.json();
  },

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(params: ReactivateSubscriptionParams): Promise<{ success: boolean; status: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${FUNCTIONS_BASE_URL}/reactivate-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reactivate subscription');
    }

    return response.json();
  },
};
