import User from "../models/User.js";

class SubscriptionService {
  constructor() {
    this.productId = process.env.GUMROAD_PRODUCT_ID;
  }

  // Note: Purchase verification is now handled by Gumroad webhooks
  // This method is kept for backward compatibility but no longer makes API calls
  async verifyPurchase(purchaseId) {
    console.log("Purchase verification requested for:", purchaseId);
    console.log("Note: Verification is now handled by Gumroad webhooks");

    return {
      success: false,
      error: "Purchase verification is handled by webhooks, not API calls",
    };
  }

  // Activate subscription for user
  // Note: This method is now primarily for manual activation/testing
  // Real subscription activation is handled by Gumroad webhooks
  async activateSubscription(userId, purchaseId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      console.log(
        "Manual subscription activation requested for user:",
        userId,
        "with purchase ID:",
        purchaseId
      );
      console.log(
        "Note: Real subscriptions are activated via Gumroad webhooks"
      );

      // Calculate expiration date (30 days from now for monthly subscription)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Update user subscription
      user.subscription = {
        status: "pro",
        gumroadId: purchaseId,
        expiresAt: expiresAt,
        createdAt: new Date(),
      };

      await user.save();

      console.log(
        "Manual subscription activated successfully for user:",
        userId
      );

      return {
        success: true,
        message: "Subscription activated successfully (manual activation)",
        expiresAt: expiresAt,
      };
    } catch (error) {
      console.error("Subscription activation error:", error);
      return {
        success: false,
        error: "Failed to activate subscription",
      };
    }
  }

  // Check subscription status
  async checkSubscriptionStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const isActive = user.isSubscriptionActive();

      return {
        success: true,
        subscription: {
          status: user.subscription.status,
          isActive: isActive,
          expiresAt: user.subscription.expiresAt,
          gumroadId: user.subscription.gumroadId,
        },
      };
    } catch (error) {
      console.error("Subscription status check error:", error);
      return {
        success: false,
        error: "Failed to check subscription status",
      };
    }
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Reset to free tier
      user.subscription = {
        status: "free",
        gumroadId: null,
        expiresAt: null,
        createdAt: null,
      };

      await user.save();

      return {
        success: true,
        message: "Subscription cancelled successfully",
      };
    } catch (error) {
      console.error("Subscription cancellation error:", error);
      return {
        success: false,
        error: "Failed to cancel subscription",
      };
    }
  }

  // Get download limits for user
  async getDownloadLimits(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const limitInfo = user.canDownload(0); // Check current limits without adding URLs

      return {
        success: true,
        limits: {
          current: limitInfo.current,
          remaining: limitInfo.remaining,
          limit: limitInfo.limit,
          subscription: user.subscription.status,
          isActive: user.isSubscriptionActive(),
        },
      };
    } catch (error) {
      console.error("Download limits check error:", error);
      return {
        success: false,
        error: "Failed to check download limits",
      };
    }
  }
}

export default new SubscriptionService();
