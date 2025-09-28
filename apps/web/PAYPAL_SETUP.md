# PayPal Integration Setup Guide

This guide explains how to set up and use the PayPal payment integration with the PyUSD Facilitator in the PayAny Money application.

## Overview

The PayPal integration allows users to pay with fiat currency (USD) through PayPal, which then gets processed through the PyUSD 402+ Facilitator service. Upon successful payment, the user's fiat balance is incremented in the Convex database.

## Prerequisites

1. **PayPal Developer Account**: Create an account at [developer.paypal.com](https://developer.paypal.com)
2. **PyUSD Facilitator Service**: Running instance of the facilitator API
3. **Environment Variables**: Properly configured environment variables

## Setup Steps

### 1. PayPal Developer Setup

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/developer/applications/)
2. Create a new application:
   - **Application Name**: PayAny Money
   - **Merchant**: Your business account
   - **Features**: Accept payments
3. Copy your **Client ID** and **Client Secret**

### 2. Environment Variables

Create a `.env.local` file in `/apps/web/` with the following variables:

```env
# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# PyUSD Facilitator API
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3000

# Other required variables
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

### 3. PyUSD Facilitator Service

Ensure the PyUSD 402+ Facilitator service is running with:

```bash
cd apps/pyusd-402-plus-facilitator
npm install
npm start
```

The service should be available at `http://localhost:3000` by default.

### 4. Database Schema

The integration uses the `users` table with a `fiat_balance` field. This is already configured in the Convex schema.

## How It Works

### Payment Flow

1. **Payment Method Selection**: User chooses between "crypto" or "fiat" payment
2. **Amount Entry**: For fiat payments, user enters USD amount
3. **PayPal Integration**: 
   - Creates order via PyUSD Facilitator SDK
   - Displays PayPal buttons using `@paypal/react-paypal-js`
   - User completes payment on PayPal
4. **Payment Processing**:
   - Verifies payment with facilitator
   - Settles payment with facilitator  
   - Increments user's `fiat_balance` in database

### Component Integration

The `PaymentModal.tsx` component handles the entire flow:

```typescript
// SDK instance
const facilitatorSDK = new PyUSDFacilitatorSDK(
  process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3000"
);

// PayPal buttons with order creation and approval
<PayPalButtons
  createOrder={createPayPalOrder}
  onApprove={handlePayPalSuccess}
  onError={handlePayPalError}
/>
```

### Key Functions

#### `createPayPalOrder()`
- Calls `facilitatorSDK.createPayPalOrder(amount, description, successUrl)`
- Returns PayPal order ID for the buttons component

#### `handlePayPalSuccess(orderID)`
- Verifies payment: `facilitatorSDK.verifyPayPalOrder(orderID)`
- Settles payment: `facilitatorSDK.settlePayPalOrder(orderID)`
- Updates user balance: `incrementFiatBalance({ wallet_address, amount })`

### Database Mutations

The integration uses these Convex mutations:

```typescript
// Create/update user record
const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

// Increment fiat balance after successful payment
const incrementFiatBalance = useMutation(api.users.incrementFiatBalance);
```

## Testing

### Sandbox Testing

1. Use PayPal's sandbox environment for testing
2. Create sandbox buyer and seller accounts
3. Use sandbox credentials in development

### Test Flow

1. Open PaymentModal component
2. Select "Pay with PayPal" 
3. Enter test amount (e.g., $10.00)
4. Complete sandbox PayPal flow
5. Verify balance increment in database

## API Endpoints

The PyUSD Facilitator provides these endpoints:

- `POST /request` - Create payment order
- `POST /verify` - Verify payment completion  
- `POST /settle` - Settle completed payment
- `GET /supported` - Get supported payment methods

## Error Handling

Common error scenarios and handling:

1. **PayPal Order Creation Failed**
   - Check facilitator service is running
   - Verify PayPal credentials
   - Check network connectivity

2. **Payment Verification Failed**
   - Ensure PayPal payment was actually completed
   - Check facilitator logs for details
   - Verify order ID matches

3. **Database Update Failed**
   - Check Convex connection
   - Verify user exists or can be created
   - Check wallet address format

## Security Considerations

1. **Client ID Only**: Only expose PayPal Client ID on frontend
2. **Server-Side Verification**: All payment verification happens on facilitator service
3. **Amount Validation**: Validate amounts on both client and server
4. **User Authentication**: Ensure user is connected with wallet before balance updates

## Troubleshooting

### Common Issues

1. **PayPal buttons not loading**
   - Check `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set
   - Verify PayPal script provider configuration
   - Check browser console for errors

2. **Facilitator service errors**
   - Ensure service is running on correct port
   - Check `NEXT_PUBLIC_FACILITATOR_URL` points to correct endpoint
   - Verify facilitator has PayPal credentials configured

3. **Database updates failing**
   - Check Convex connection and authentication
   - Verify user table schema includes `fiat_balance` field
   - Check mutation permissions

### Debug Steps

1. **Enable console logging**:
   ```typescript
   console.log('Order created:', orderResponse);
   console.log('Payment verified:', verifyResponse);
   console.log('Payment settled:', settleResponse);
   ```

2. **Check facilitator logs**: Monitor the PyUSD facilitator service logs for API calls

3. **Verify database updates**: Check Convex dashboard for user record changes

## Production Deployment

1. **Switch to Production PayPal**: Update to production PayPal credentials
2. **HTTPS Required**: PayPal requires HTTPS in production
3. **Domain Verification**: Ensure domain is registered with PayPal
4. **Environment Variables**: Use secure environment variable management
5. **Error Monitoring**: Set up error tracking and monitoring

## Support

For issues with:
- **PayPal Integration**: Check PayPal Developer documentation
- **Facilitator Service**: Check service logs and API responses  
- **Database Issues**: Verify Convex setup and schema
- **React Components**: Check browser console and React dev tools

## Additional Resources

- [PayPal Developer Docs](https://developer.paypal.com/docs/)
- [PayPal React SDK](https://paypal.github.io/react-paypal-js/)
- [Convex Documentation](https://docs.convex.dev/)
- [PyUSD Facilitator GitHub](https://github.com/your-repo/pyusd-facilitator)