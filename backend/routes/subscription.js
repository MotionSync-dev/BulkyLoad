import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get subscription status
router.get("/status", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User subscription data:", {
      userId: user._id,
      email: user.email,
      subscription: user.subscription,
      isSubscriptionActive: user.isSubscriptionActive(),
    });

    const subscriptionStatus = {
      status: user.subscription.status,
      isActive:
        user.subscription.status === "pro" && user.isSubscriptionActive(),
      expiresAt: user.subscription.expiresAt,
      createdAt: user.subscription.createdAt,
      gumroadId: user.subscription.gumroadId,
    };

    console.log("Returning subscription status:", subscriptionStatus);

    res.json({ subscription: subscriptionStatus });
  } catch (error) {
    console.error("Subscription status error:", error);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

// Note: Gumroad webhook handling has been moved to /api/gumroad-webhook
// This endpoint is kept for backward compatibility but redirects to the new location
router.get("/webhook/gumroad/test", (req, res) => {
  console.log(
    "Legacy Gumroad test endpoint hit - redirecting to new webhook endpoint"
  );
  res.json({
    message:
      "This endpoint is deprecated. Use /api/gumroad-webhook/health instead.",
    newEndpoint: "/api/gumroad-webhook/health",
    redirect: true,
  });
});

// Legacy webhook endpoint - redirects to new location
router.all("/webhook/gumroad", (req, res) => {
  console.log(
    "Legacy Gumroad webhook endpoint hit - redirecting to new webhook endpoint"
  );
  res.json({
    message: "This endpoint is deprecated. Use /api/gumroad-webhook instead.",
    newEndpoint: "/api/gumroad-webhook",
    redirect: true,
  });
});

// Get Gumroad product info
router.get("/gumroad/product", async (req, res) => {
  try {
    const productId = process.env.GUMROAD_PRODUCT_ID;

    console.log("🔍 Environment variables check:");
    console.log("  - GUMROAD_PRODUCT_ID:", process.env.GUMROAD_PRODUCT_ID);
    console.log("  - GUMROAD_SELLER_ID:", process.env.GUMROAD_SELLER_ID);
    console.log("  - NODE_ENV:", process.env.NODE_ENV);

    if (!productId) {
      console.error("❌ GUMROAD_PRODUCT_ID not found in environment variables");
      return res
        .status(500)
        .json({ error: "Gumroad product ID not configured" });
    }

    const checkoutUrl = `https://gumroad.com/l/${productId}`;
    console.log("✅ Generated checkout URL:", checkoutUrl);

    res.json({
      productId,
      checkoutUrl,
      price: "$7",
      period: "monthly",
    });
  } catch (error) {
    console.error("Gumroad product info error:", error);
    res.status(500).json({ error: "Failed to get product info" });
  }
});

// Manual subscription activation (for testing)
router.post("/activate", authenticateToken, async (req, res) => {
  try {
    const { gumroadId } = req.body;

    if (!gumroadId) {
      return res.status(400).json({ error: "Gumroad ID is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    user.subscription = {
      status: "pro",
      gumroadId,
      expiresAt,
      createdAt: new Date(),
    };

    await user.save();

    res.json({
      message: "Subscription activated successfully",
      subscription: {
        status: user.subscription.status,
        isActive: true,
        expiresAt: user.subscription.expiresAt,
      },
    });
  } catch (error) {
    console.error("Subscription activation error:", error);
    res.status(500).json({ error: "Failed to activate subscription" });
  }
});

// Manual subscription refresh (force update from database)
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Manual refresh - User subscription data:", {
      userId: user._id,
      email: user.email,
      subscription: user.subscription,
      isSubscriptionActive: user.isSubscriptionActive(),
    });

    const subscriptionStatus = {
      status: user.subscription.status,
      isActive:
        user.subscription.status === "pro" && user.isSubscriptionActive(),
      expiresAt: user.subscription.expiresAt,
      createdAt: user.subscription.createdAt,
      gumroadId: user.subscription.gumroadId,
    };

    res.json({
      message: "Subscription status refreshed",
      subscription: subscriptionStatus,
    });
  } catch (error) {
    console.error("Subscription refresh error:", error);
    res.status(500).json({ error: "Failed to refresh subscription status" });
  }
});

// Debug endpoint - list all users and their subscription status (remove in production)
router.get("/debug/users", async (req, res) => {
  try {
    const users = await User.find({}, "email username subscription createdAt");

    const userList = users.map((u) => ({
      id: u._id,
      email: u.email,
      username: u.username,
      subscription: u.subscription,
      createdAt: u.createdAt,
    }));

    res.json({
      totalUsers: userList.length,
      users: userList,
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: "Failed to get debug info" });
  }
});

// Test endpoint to manually update a user's subscription (remove in production)
router.post("/test-update/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Before update - User subscription:", user.subscription);

    // Test updating subscription
    user.subscription = {
      status: "pro",
      gumroadId: "test-123",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date(),
    };

    console.log("Setting test subscription:", user.subscription);

    await user.save();

    console.log("After update - User subscription:", user.subscription);

    // Verify the update
    const updatedUser = await User.findById(user._id);
    console.log("Verified from database:", updatedUser.subscription);

    res.json({
      message: "Test subscription update completed",
      before: user.subscription,
      after: updatedUser.subscription,
    });
  } catch (error) {
    console.error("Test update error:", error);
    res
      .status(500)
      .json({ error: "Test update failed", details: error.message });
  }
});

// Force update subscription status for a specific user (for debugging)
router.post("/force-update/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { status, gumroadId } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Force updating subscription for:", email);
    console.log("Current subscription:", user.subscription);
    console.log("New status:", status, "New gumroadId:", gumroadId);

    if (status === "pro") {
      user.subscription = {
        status: "pro",
        gumroadId: gumroadId || "force-update-" + Date.now(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
      };
    } else {
      user.subscription = {
        status: "free",
        gumroadId: null,
        expiresAt: null,
        createdAt: null,
      };
    }

    await user.save();

    console.log("Updated subscription:", user.subscription);

    res.json({
      message: "Subscription force-updated successfully",
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Force update error:", error);
    res
      .status(500)
      .json({ error: "Force update failed", details: error.message });
  }
});

export default router;
