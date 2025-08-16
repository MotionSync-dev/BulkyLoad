import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Gumroad webhook handler for subscription management
router.post("/", async (req, res) => {
  try {
    const payload = req.body;

    console.log("Gumroad webhook received:", {
      timestamp: new Date().toISOString(),
      payload: payload,
    });

    const {
      sale_id,
      product_id,
      email,
      purchaser_email,
      price_cents,
      subscription_id,
      status,
      test,
      seller_id,
      resource_name,
      refunded,
    } = payload;

    // Optional: verify webhook source using seller ID if provided
    const expectedSellerId = process.env.GUMROAD_SELLER_ID;
    if (expectedSellerId && seller_id && seller_id !== expectedSellerId) {
      console.error("Invalid seller ID in webhook:", seller_id);
      // Return 200 so Gumroad doesn't retry, but log the issue
      return res
        .status(200)
        .json({ ignored: true, reason: "invalid_seller_id" });
    }

    // Allow processing test webhooks for diagnostics
    if (test === "true") {
      console.log("Processing Gumroad test webhook");
    }

    // Get the buyer's email
    const buyerEmail = purchaser_email || email;
    if (!buyerEmail) {
      console.log("No purchaser email present; acknowledging ping only");
      return res.status(200).json({ message: "Ping received" });
    }

    // Find user by email
    const user = await User.findByEmail(buyerEmail);
    if (!user) {
      console.log("User not found for email:", buyerEmail);
      return res
        .status(200)
        .json({ message: "User not found; ping acknowledged" });
    }

    console.log("Processing webhook for user:", {
      userId: user._id,
      email: user.email,
      currentSubscription: user.subscription,
      webhookData: {
        resource_name,
        status,
        subscription_id,
        sale_id,
        refunded,
      },
    });

    // Determine if this is a subscription activation
    const isSubscriptionActivation =
      status === "completed" ||
      status === "subscription_activated" ||
      status === "charge" ||
      (resource_name === "sale" && subscription_id && refunded !== "true");

    // Additional checks for subscription activation
    const hasValidSubscriptionId =
      subscription_id && subscription_id.length > 0;
    const isNotRefunded = refunded !== "true" && refunded !== true;
    const isSaleResource = resource_name === "sale";

    const isSubscriptionActivationComprehensive =
      isSubscriptionActivation ||
      (isSaleResource && hasValidSubscriptionId && isNotRefunded);

    // Fallback: if we have a subscription_id and it's not refunded, treat as activation
    const hasSubscriptionIdFallback = hasValidSubscriptionId && isNotRefunded;

    console.log("Subscription activation analysis:", {
      status,
      resource_name,
      subscription_id,
      refunded,
      isSubscriptionActivation,
      isSubscriptionActivationComprehensive,
      hasSubscriptionIdFallback,
    });

    if (isSubscriptionActivationComprehensive || hasSubscriptionIdFallback) {
      // Logic to activate subscription
      user.subscription = {
        status: "pro",
        gumroadId: subscription_id || sale_id || user.subscription.gumroadId || null,
        expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        createdAt: user.subscription.createdAt || new Date(),
      };
      await user.save();
      
      console.log(`✅ Subscription ACTIVATED for user: ${user.email}`);
      console.log(`   - Status: ${user.subscription.status}`);
      console.log(`   - Expires: ${user.subscription.expiresAt}`);
      console.log(`   - Gumroad ID: ${user.subscription.gumroadId}`);
      
      return res.status(200).json({ 
        message: "Webhook processed successfully",
        userEmail: user.email,
        action: "activated",
        subscription: {
          status: user.subscription.status,
          expiresAt: user.subscription.expiresAt,
          gumroadId: user.subscription.gumroadId
        }
      });
    } else if (
      status === "cancelled" || status === "subscription_cancelled" ||
      status === "refunded" || status === "failed" || refunded === "true"
    ) {
      // Logic to cancel subscription
      user.subscription = { status: "free", gumroadId: null, expiresAt: null, createdAt: null };
      await user.save();
      
      console.log(`❌ Subscription CANCELLED for user: ${user.email}`);
      console.log(`   - Status: ${user.subscription.status}`);
      
      return res.status(200).json({ 
        message: "Webhook processed successfully",
        userEmail: user.email,
        action: "cancelled",
        subscription: {
          status: user.subscription.status
        }
      });
    } else {
      console.log("Unhandled webhook status:", status);
      return res.status(200).json({ 
        message: "Webhook processed successfully",
        userEmail: user.email,
        action: "no_change",
        status: status
      });
    }
  } catch (error) {
    console.error("Gumroad webhook processing error:", error);
    // Return 200 so Gumroad doesn't retry excessively
    return res.status(200).json({
      error: "Error handled",
      message: error.message,
    });
  }
});

// Health check endpoint for the webhook
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Gumroad webhook endpoint is healthy",
  });
});

export default router;
