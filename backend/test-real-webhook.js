import axios from "axios";

// Test script for real Gumroad webhook simulation
const WEBHOOK_URL = "https://bulkyload.onrender.com/api/gumroad-webhook";

// Real webhook payload structure (based on Gumroad documentation)
const realWebhookPayload = {
  // Sale information
  sale_id: "real_sale_" + Date.now(),
  product_id: "ihwaqc",
  price_cents: 700,

  // Customer information
  email: "mustafayassin1125@gmail.com",
  purchaser_email: "mustafayassin1125@gmail.com",

  // Subscription information
  subscription_id: "real_sub_" + Date.now(),
  status: "completed",
  resource_name: "sale",

  // Additional fields
  seller_id: "lhvJDTsKXoWc93ijSnDorw==",
  test: "false", // Simulate real webhook
};

async function testRealWebhook() {
  try {
    console.log("🧪 Testing REAL webhook simulation...");
    console.log("📍 Webhook URL:", WEBHOOK_URL);
    console.log("📧 User Email:", realWebhookPayload.email);
    console.log("🆔 Product ID:", realWebhookPayload.product_id);
    console.log("💰 Price:", realWebhookPayload.price_cents + " cents");

    const response = await axios.post(WEBHOOK_URL, realWebhookPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("\n✅ Webhook Response:");
    console.log("Status:", response.status);
    console.log("Data:", response.data);

    if (response.data.action === "activated") {
      console.log("\n🎉 Subscription should now be ACTIVATED!");
      console.log('Check your app to see if user status changed to "pro"');
    }
  } catch (error) {
    console.error("\n❌ Webhook Error:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data || error.message);
  }
}

// Run the test
testRealWebhook();
