# Quick Start: Gumroad Webhook Integration

## 🚀 Get Running in 5 Minutes

### 1. Start Your Backend Server
```bash
cd backend
npm run dev
```

### 2. Test the Webhook Endpoint
```bash
# In another terminal
node test-webhook.js
```

### 3. Check Health Endpoint
```bash
curl http://localhost:3001/api/gumroad-webhook/health
```

## 🔧 Production Setup

### 1. Configure Environment Variables
Add to your `.env` file:
```bash
GUMROAD_SELLER_ID=your_seller_id_here
GUMROAD_PRODUCT_ID=your_product_id_here
```

### 2. Set Up Gumroad Webhook
1. Go to Gumroad → Settings → Advanced → Webhooks
2. Add webhook: `https://yourdomain.com/api/gumroad-webhook`
3. Select events: `sale.created`, `subscription.*`, `refund.created`

### 3. Deploy and Test
1. Deploy your backend
2. Test webhook with Gumroad's testing feature
3. Monitor logs for webhook processing

## 📋 What's Working Now

✅ **Webhook endpoint**: `/api/gumroad-webhook`  
✅ **Health check**: `/api/gumroad-webhook/health`  
✅ **Subscription management**: Automatic via webhooks  
✅ **User lookup**: By email from webhook payload  
✅ **Status updates**: Pro/Free based on webhook events  
✅ **Download limits**: Enforced based on subscription status  

## 🧪 Testing Commands

```bash
# Test webhook health
curl http://localhost:3001/api/gumroad-webhook/health

# Test subscription status
curl http://localhost:3001/api/subscription/status

# Run full webhook tests
node test-webhook.js
```

## 📚 Next Steps

1. **Read**: `GUMROAD_SETUP.md` for detailed setup
2. **Review**: `IMPLEMENTATION_SUMMARY.md` for complete overview
3. **Test**: Use the test script to validate functionality
4. **Deploy**: Set up production webhook URL
5. **Monitor**: Watch logs for webhook processing

## 🆘 Need Help?

- Check server logs for webhook details
- Verify webhook URL is accessible
- Ensure user emails match between systems
- Use test script for local validation
