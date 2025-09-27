# ENS Profile RAG Implementation

This document describes the RAG (Retrieval-Augmented Generation) implementation for ENS profile search functionality in PayAny.Link.

## Overview

The RAG system allows semantic search across ENS profiles stored in a CSV file, enabling users to find profiles by description, social accounts, or domain names using natural language queries.

## Architecture

### Components
- **Convex Database**: Stores ENS profile data with schema validation
- **RAG Component**: Provides vector embeddings and semantic search capabilities
- **Search Frontend**: React component for user search interface
- **Profile Enhancement**: Enhanced profile pages with additional data

### Data Flow
1. CSV data → Processing Script → Convex Database + RAG Embeddings
2. User Query → RAG Search → Profile Results → Enhanced Display

## Setup Instructions

### 1. Environment Variables
Add these to your `.env.local` file:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
CONVEX_URL=your_convex_deployment_url

# Google AI (for Gemini embeddings)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

### 2. Convex Deployment
```bash
# Install Convex CLI if not already installed
npm install -g convex

# Initialize and deploy
npx convex dev
```

### 3. Import CSV Data
```bash
# Place your CSV file in the project root or specify path
pnpm import-csv path/to/your/ens-profiles.csv
```

### 4. Access the Features
- Search page: `/search`
- Enhanced profile pages: `{ens-name}.payany.link`

## CSV Data Format

Your CSV should contain these columns:
- `domain_name`: ENS domain (e.g., "vitalik.eth")
- `resolved_address`: Ethereum address
- `registration_date`: Domain registration date
- `expiry_date`: Domain expiration date
- `description`: Profile description
- `github`: GitHub username
- `twitter`: Twitter handle
- `optin`: Boolean for user opt-in
- `block_confirmation`: Blockchain confirmation

## Files Structure

```
convex/
├── schema.ts              # Database schema definition
├── ensProfiles.ts         # RAG functions and queries
└── convex.config.js       # RAG component configuration

components/
├── ens-search.tsx         # Search interface component
└── providers/
    └── convex-provider.tsx # Convex client setup

scripts/
└── import-csv.ts          # CSV import utility

app/
├── search/
│   └── page.tsx          # Search page
└── sub/[ens_or_address]/
    └── page.tsx          # Enhanced profile page
```

## API Reference

### Convex Functions

#### `addProfile`
Add a single ENS profile to the database and RAG system.

#### `bulkImportProfiles`
Import multiple profiles from CSV data.

#### `searchProfiles` (Action)
Perform semantic search across profiles.
- Input: `{ query: string, limit?: number }`
- Output: `{ profiles: Profile[], searchText: string, total: number }`

#### `getProfileByDomain`
Retrieve profile by ENS domain name.

#### `getProfileByAddress`
Retrieve profiles by Ethereum address.

### React Components

#### `ENSSearch`
Main search interface component with:
- Real-time search input
- Semantic search results
- Profile cards with social links
- Direct navigation to profile pages

## Search Capabilities

### Supported Queries
- **Domain names**: "vitalik.eth", "ens.eth"
- **Descriptions**: "DeFi developer", "NFT creator", "Ethereum builder"
- **Technologies**: "Solidity", "Web3", "blockchain"
- **Social context**: "Twitter active", "GitHub contributor"

### Search Features
- Semantic understanding of queries
- Relevance ranking
- Profile metadata display
- Social link integration
- Direct profile navigation

## Integration with Existing Features

### Enhanced Profile Pages
- Combines live ENS data with stored profile information
- Shows registration/expiry dates from database
- Displays social links from both ENS records and CSV data
- Maintains existing payment functionality

### Subdomain Routing
- Preserves existing `{domain}.payany.link` routing
- Adds search functionality as complementary feature
- Links search results to profile pages

## Performance Considerations

- RAG embeddings are generated once during import
- Search results cached for improved performance
- Batch processing for large CSV imports
- Optimized database queries with proper indexing

## Troubleshooting

### Common Issues

1. **Search not working**: Check Google AI API key and Convex deployment
2. **CSV import fails**: Verify CSV format and column names
3. **Profile data missing**: Ensure Convex functions are properly deployed
4. **Performance issues**: Consider reducing search result limits

### Debugging

- Check Convex logs in dashboard
- Verify environment variables are set (especially `GOOGLE_GENERATIVE_AI_API_KEY`)
- Test individual Convex functions
- Monitor search query performance

### Getting Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Add the key to your `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY`

## Future Enhancements

- Advanced filtering (registration date, expiry, social presence)
- Profile recommendations based on similarity
- Real-time profile updates from ENS changes
- Analytics on search patterns and popular profiles