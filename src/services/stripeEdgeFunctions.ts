// src/services/stripeEdgeFunctions.ts
// Stripe Edge Functions wrapper using centralized API client

import {
  createCheckoutSession as apiCreateCheckout,
  createPortalSession as apiCreatePortal,
  updateSubscriptionSeats as apiUpdateSeats,
  cancelSubscription as apiCancel,
  reactivateSubscription as apiReactivate,
  type CheckoutParams,
  type PortalParams,
  type UpdateSeatsParams,
  type CancelParams,
  type ReactivateParams,
} from "../../lib/services/apiClient";

export const stripeEdgeFunctions = {
  /**
   * Create a Stripe Checkout session for a new subscription
   */
  async createCheckoutSession(params: CheckoutParams): Promise<{ sessionId: string; url: string }> {
    const { data, error } = await apiCreateCheckout(params);
    if (error || !data) {
      throw new Error(error || 'Failed to create checkout session');
    }
    return data;
  },

  /**
   * Create a Stripe Customer Portal session for managing subscriptions
   */
  async createPortalSession(params: PortalParams): Promise<{ url: string }> {
    const { data, error } = await apiCreatePortal(params);
    if (error || !data) {
      throw new Error(error || 'Failed to create portal session');
    }
    return data;
  },

  /**
   * Update the seat count for a team subscription
   */
  async updateSubscriptionSeats(params: UpdateSeatsParams): Promise<{ success: boolean }> {
    const { data, error } = await apiUpdateSeats(params);
    if (error || !data) {
      throw new Error(error || 'Failed to update subscription seats');
    }
    return data;
  },

  /**
   * Cancel a subscription (immediate or at period end)
   */
  async cancelSubscription(params: CancelParams): Promise<{ success: boolean; status: string }> {
    const { data, error } = await apiCancel(params);
    if (error || !data) {
      throw new Error(error || 'Failed to cancel subscription');
    }
    return data;
  },

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(params: ReactivateParams): Promise<{ success: boolean; status: string }> {
    const { data, error } = await apiReactivate(params);
    if (error || !data) {
      throw new Error(error || 'Failed to reactivate subscription');
    }
    return data;
  },
};
