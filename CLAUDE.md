# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

PayAny.Link is a Turborepo monorepo with pnpm workspaces, built around a sophisticated subdomain routing system for ENS-based payment pages.

### Core Structure
- `/apps/web` - Next.js 15.4.5 app with App Router (React 19.1.1)
- `/packages/ui` - Shared shadcn/ui component library
- `/packages/typescript-config` - Shared TypeScript configurations

### Subdomain Routing System

The application's defining feature is its subdomain-to-ENS routing:

**How it works:**
1. User visits `vitalik.eth.payany.link`
2. Middleware (`/apps/web/middleware.ts`) detects subdomain
3. Rewrites internally to `/sub/vitalik.eth`
4. Dynamic route at `/app/sub/[ens_or_address]/page.tsx` handles the request

**Configuration:**
- `ROOT_DOMAIN`: Configurable via env var (defaults to "payany.link")
- `RESERVED`: Set of blocked subdomains `["www", "app", "api", "admin", "dashboard", "support"]`
- Only checks first subdomain part against reserved list (allows `api.eth.payany.link`)

**Critical middleware logic:**
- Parses host into parts and extracts all subdomain parts before root domain
- Joins subdomain parts with dots to form complete ENS names
- Routes to `/sub/{full-subdomain-chain}`

## Development Commands

### Monorepo (run from root)
```bash
pnpm dev        # Start all apps in development mode
pnpm build      # Build all packages and apps
pnpm format     # Format code with Prettier
```

### Web App (run from /apps/web)
```bash
pnpm dev        # Next.js dev with Turbopack enabled
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # Run TypeScript type checking
```

## Web3 & ENS Integration

**Tech Stack:**
- Wagmi v2.17.5 + RainbowKit v2.2.8 + Viem
- TanStack Query for state management
- Convex for backend (real-time database)

**Key configurations:**
- Primary chain: Mainnet (with Polygon, Optimism, Arbitrum, Base support)
- RainbowKit project ID: `6b4e7efed7141d0d78856b9e23328f18`
- Custom ENS hooks: `useEnsTexts()`, `useEnsAllAddresses()`

**Address/ENS detection pattern:**
```typescript
const isEthAddress = isAddress(decodedParam);
const isEnsName = decodedParam.includes(".") && !isEthAddress;
```

## UI & Styling Architecture

**Design System:**
- Tailwind CSS v4 with OKLCH color space
- Custom CSS properties for theme consistency
- Geist Sans + Geist Mono fonts
- `1.5rem` default radius with calculated variants

**Component Structure:**
- Base components in `/packages/ui` (shadcn/ui implementation)
- App-specific components in `/apps/web/components`
- Custom components: `DynamicSuffixSearchBar`, `Silk` (3D backgrounds), `CardNav`

**Theme Management:**
- Light/dark mode via next-themes
- Provider setup in `providers.tsx`

## Key Development Patterns

### File Organization
- App Router structure: `/app/layout.tsx`, `/app/page.tsx`, `/app/sub/[ens_or_address]/page.tsx`
- Middleware handles all subdomain routing logic
- Custom hooks in `/apps/web/hooks`
- Web3 config centralized in `/lib/wagmi.ts`

### State Management
- React Query for server state and ENS data caching (5-min stale time)
- Local state with React useState for UI interactions
- Nested provider pattern for Web3 and theme management

### Error Handling
- Middleware uses try-catch with `NextResponse.next()` fallbacks
- ENS queries have graceful fallbacks for failed lookups
- User input validation for address/ENS format detection

## Important Notes

- **TypeScript**: Uses workspace TypeScript config, type checking via `pnpm typecheck`
- **Client Components**: Most pages use `"use client"` directive for Web3 integration
- **Dynamic Routes**: Use `useParams()` hook instead of page props for client components
- **Performance**: Turbopack enabled for development, query caching for ENS data
- **Multi-chain**: Supports Bitcoin, Litecoin, Dogecoin, Ethereum, Solana, and L2s
- **Payment Logic**: Currently placeholder (`handlePay()` function ready for implementation)

## Troubleshooting

- For subdomain routing issues, check middleware logs and ensure DNS wildcard `*.payany.link` is configured
- For Web3 connection issues, verify wagmi config and RainbowKit provider setup
- For build errors, run `pnpm typecheck` first to isolate TypeScript issues
- ENS resolution failures should gracefully fallback to address display