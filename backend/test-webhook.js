import axios from 'axios';

// Test script for Gumroad webhook
const WEBHOOK_URL = 'http://localhost:3001/api/gumroad-webhook';

// Sample webhook payloads for testing
const testPayloads = {
  subscriptionActivation: {
    sale_id: 'test_sale_123',
    product_id: 'test_product_456',
    email: 'test@example.com',
    purchaser_email: 'test@example.com',
    price_cents: 700,
    subscription_id: 'test_sub_789',
    status: 'completed',
    resource_name: 'sale',
    test: 'true'
  },
  
  subscriptionCancellation: {
    sale_id: 'test_sale_123',
    product_id: 'test_product_456',
    email: 'test@example.com',
    purchaser_email: 'test@example.com',
    subscription_id: 'test_sub_789',
    status: 'cancelled',
    resource_name: 'subscription',
    test: 'true'
  },
  
  subscriptionRefund: {
    sale_id: 'test_sale_123',
    product_id: 'test_product_456',
    email: 'test@example.com',
    purchaser_email: 'test@example.com',
    subscription_id: 'test_sub_789',
    status: 'refunded',
    resource_name: 'sale',
    refunded: 'true',
    test: 'true'
  }
};

async function testWebhook(payload, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function testHealthEndpoint() {
  try {
    console.log('\n🏥 Testing health endpoint...');
    const response = await axios.get(`${WEBHOOK_URL}/health`);
    console.log('✅ Health check:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Gumroad webhook tests...');
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
  
  // Test health endpoint
  await testHealthEndpoint();
  
  // Test subscription activation
  await testWebhook(testPayloads.subscriptionActivation, 'Subscription Activation');
  
  // Test subscription cancellation
  await testWebhook(testPayloads.subscriptionCancellation, 'Subscription Cancellation');
  
  // Test subscription refund
  await testWebhook(testPayloads.subscriptionRefund, 'Subscription Refund');
  
  console.log('\n✨ Webhook tests completed!');
  console.log('\n📝 Note: These are test payloads. In production, Gumroad will send real webhooks.');
  console.log('🔗 Make sure your server is running on port 3001 before running these tests.');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testWebhook, testHealthEndpoint, testPayloads };
