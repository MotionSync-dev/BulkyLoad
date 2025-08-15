# Gumroad Webhook Setup Guide

This application uses Gumroad webhooks to manage subscription status automatically. No API tokens or OAuth are required.

## Environment Variables

Add these to your `.env` file:

```bash
# Optional: Your Gumroad seller ID for webhook verification
GUMROAD_SELLER_ID=your_gumroad_seller_id_here

# Optional: Your Gumroad product ID (for frontend display)
GUMROAD_PRODUCT_ID=your_gumroad_product_id_here
```

## Webhook Configuration in Gumroad

1. **Log into your Gumroad account**
2. **Go to Settings → Advanced → Webhooks**
3. **Add a new webhook with these settings:**
   - **URL**: `https://yourdomain.com/api/gumroad-webhook`
   - **Events**: Select all subscription-related events:
     - `sale.created`
     - `subscription.activated`
     - `subscription.cancelled`
     - `subscription.failed`
     - `refund.created`

## How It Works

1. **When a user subscribes**: Gumroad sends a webhook to `/api/gumroad-webhook`
2. **The webhook handler**:
   - Finds the user by email
   - Updates their subscription status to 'pro'
   - Sets expiration date to 1 month from now
3. **When subscription is cancelled/refunded**:
   - Webhook updates status to 'free'
   - Removes subscription data
4. **Frontend checks**: User's subscription status to determine download limits

## Testing

- **Test endpoint**: `GET /api/gumroad-webhook/health`
- **Gumroad test mode**: Set `test=true` in webhook payload for testing
- **Local testing**: Use tools like ngrok to expose localhost to Gumroad

## Security Notes

- Webhooks are processed without authentication (as required by Gumroad)
- Optional seller ID verification can be enabled via `GUMROAD_SELLER_ID`
- All webhook responses return HTTP 200 to prevent retries
- Errors are logged but don't cause webhook failures

## Troubleshooting

- Check server logs for webhook processing details
- Verify webhook URL is accessible from internet
- Ensure user email matches between Gumroad and your app
- Test with Gumroad's webhook testing feature
