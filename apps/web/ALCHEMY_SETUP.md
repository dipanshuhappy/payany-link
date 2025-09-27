# Alchemy SDK Setup

This application uses the Alchemy SDK to fetch real-time token balances for users across multiple blockchain networks.

## Setup Instructions

### 1. Get an Alchemy API Key

1. Visit [Alchemy.com](https://www.alchemy.com/)
2. Sign up for a free account
3. Create a new app in your dashboard
4. Copy your API key

### 2. Configure Environment Variables

Create a `.env.local` file in the `apps/web` directory:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

**Important**: The API key must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

### 3. Supported Networks

The application supports the following networks via Alchemy:

- **Ethereum Mainnet** (Chain ID: 1)
- **Polygon** (Chain ID: 137) 
- **Arbitrum** (Chain ID: 42161)
- **Base** (Chain ID: 8453)

### 4. Features

When properly configured, the Alchemy integration provides:

- ✅ Real-time token balances for connected wallets
- ✅ Token metadata (name, symbol, decimals, logo)
- ✅ Native token balances (ETH, MATIC, etc.)
- ✅ Top 20 ERC-20 tokens with non-zero balances
- ✅ Automatic token discovery per chain

### 5. Fallback Behavior

If Alchemy is not configured or fails:
- The app falls back to static token lists
- Basic tokens (ETH, USDC, USDT) are shown
- Balances show placeholder values

### 6. Development Notes

- Free tier provides 300M compute units per month
- Suitable for development and small-scale production
- For high-volume applications, consider upgrading to a paid plan

### 7. Troubleshooting

**No tokens showing up?**
- Check your API key is correctly set in `.env.local`
- Verify the API key has the correct permissions
- Check browser console for any errors

**Rate limiting?**
- Alchemy free tier has generous limits
- Consider implementing caching for production apps
- Monitor your usage in the Alchemy dashboard

### 8. Environment Variables

```bash
# Required for Alchemy integration
NEXT_PUBLIC_ALCHEMY_API_KEY=your_api_key_here

# Optional: For testing without Alchemy (uses demo key)
# Leave blank or set to "demo" for fallback behavior
```

### 9. Code Usage

The integration is handled automatically in the `PaymentModal` component:

```typescript
// Automatically fetches balances for selected chain
const { tokens, isLoading, error } = useAlchemyBalances(
  selectedChain?.id,
  !!selectedChain
);
```

No additional configuration needed in your components!