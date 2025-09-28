# PayAny.link

A comprehensive Web3 payment platform built as a Turborepo monorepo that enables ENS-based payment pages with support for both cryptocurrency and fiat payments (PYUSD via PayPal).
LIVE LINK https://payany.link

## Architecture Overview

This monorepo consists of three main components:

### 🌐 Web Application (`/apps/web`)
The main Next.js 15 application that provides the PayAny.Link platform with sophisticated subdomain routing.

**Key Features:**
- **ENS-based Payment Pages**: Visit `vitalik.eth.payany.link` to access payment pages
- **Subdomain Routing**: Automatic ENS resolution through middleware
- **Multi-chain Support**: Ethereum, Bitcoin, Solana, and L2s (Polygon, Optimism, Arbitrum, Base)
- **Web3 Integration**: Wagmi v2 + RainbowKit + Viem for wallet connections
- **Real-time Database**: Convex backend for data persistence
- **Modern UI**: Tailwind CSS with shadcn/ui components and dark/light mode

**Tech Stack:**
- Next.js 15.4.5 with App Router
- React 19.1.1
- TypeScript
- Wagmi + RainbowKit + Viem
- Convex (real-time database)
- TanStack Query

### 💰 PYUSD 402+ Facilitator (`/apps/pyusd-402-plus-facilitator`)
A Hono-based API server that facilitates HTTP 402 (Payment Required) transactions using PYUSD through PayPal integration.

**Key Features:**
- **HTTP 402 Protocol**: Implementation of payment-required status for web resources
- **PYUSD Integration**: PayPal's stablecoin payment processing
- **Crypto + Fiat**: Supports both cryptocurrency and PayPal fiat payments
- **Payment Verification**: Verify and settle payment transactions
- **Token Bridging**: Cross-chain token bridging capabilities

**Tech Stack:**
- Hono (lightweight web framework)
- PayPal Server SDK
- x402 protocol implementation
- TypeScript

### 📊 ENS Data Fetcher (`/fetching-ens-data`)
A Bun-based data collection tool that fetches comprehensive ENS text records from The Graph protocol.

**Key Features:**
- **Multi-strategy Collection**: 5 different strategies to gather ENS data
- **Popular Domains**: Targets domains with high subdomain counts
- **Recent Activity**: Fetches from recently active domains
- **Premium Domains**: Collects from expensive ENS registrations
- **Text Record Mining**: Focuses on popular keys like email, avatar, social profiles
- **Data Export**: Outputs JSON and CSV formats

**Collection Strategies:**
1. High subdomain count domains (10+ subdomains)
2. Medium subdomain count domains (5+ subdomains)
3. Recently active domains
4. Premium domains (expensive registrations)
5. Popular text record keys (email, social media, etc.)

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm (recommended package manager)
- Bun (for ENS data fetching)

### Installation
```bash
# Clone and install dependencies
git clone <repository-url>
cd payany-money
pnpm install
