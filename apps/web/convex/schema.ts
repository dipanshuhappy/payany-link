import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ensProfiles: defineTable({
    domain_name: v.string(),
    resolved_address: v.optional(v.string()),
    registration_date: v.optional(v.string()),
    expiry_date: v.optional(v.string()),
    description: v.optional(v.string()),
    github: v.optional(v.string()),
    twitter: v.optional(v.string()),
    optin: v.optional(v.boolean()),
    block_confirmation: v.optional(v.string()),
    searchableText: v.string(),
  })
    .index("by_domain", ["domain_name"])
    .index("by_address", ["resolved_address"])
    .searchIndex("search_profiles", {
      searchField: "searchableText",
      filterFields: ["domain_name", "resolved_address"],
    }),

  importProgress: defineTable({
    csvFileName: v.string(),
    totalRows: v.number(),
    processedRows: v.number(),
    lastProcessedDomain: v.optional(v.string()),
    lastProcessedIndex: v.number(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("paused"),
    ),
    startedAt: v.number(),
    lastUpdatedAt: v.number(),
    errorCount: v.optional(v.number()),
  })
    .index("by_file", ["csvFileName"])
    .index("by_status", ["status"]),

  importErrors: defineTable({
    csvFileName: v.string(),
    domain_name: v.string(),
    rowIndex: v.number(),
    error: v.string(),
    attemptedAt: v.number(),
    retryCount: v.optional(v.number()),
  })
    .index("by_file", ["csvFileName"])
    .index("by_domain", ["domain_name"]),

  products: defineTable({
    // Owner info
    owner_address: v.string(),
    owner_ens: v.optional(v.string()),

    // Product details
    product_id: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),

    // Multi-chain pricing
    prices: v.optional(
      v.object({
        eth: v.optional(v.number()),
        usdc: v.optional(v.number()),
        matic: v.optional(v.number()),
        sol: v.optional(v.number()),
        btc: v.optional(v.number()),
      }),
    ),

    // Product type & files
    product_type: v.union(
      v.literal("digital_download"),
      v.literal("service"),
      v.literal("subscription"),
      v.literal("donation"),
    ),

    // Media & files
    image_url: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    file_url: v.optional(v.string()),
    file_storage_id: v.optional(v.id("_storage")),
    preview_url: v.optional(v.string()),
    preview_storage_id: v.optional(v.id("_storage")),

    // Status & metadata
    active: v.boolean(),
    featured: v.optional(v.boolean()),
    max_supply: v.optional(v.number()),
    sold_count: v.optional(v.number()),

    // Timestamps
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_owner", ["owner_address"])
    .index("by_owner_active", ["owner_address", "active"])
    .index("by_product_id", ["product_id"]),

  product_access: defineTable({
    product_id: v.string(),
    buyer_address: v.string(),
    transaction_hash: v.string(),
    purchase_date: v.number(),
    access_expires: v.optional(v.number()),
    download_count: v.optional(v.number()),
    max_downloads: v.optional(v.number()),
  })
    .index("by_product", ["product_id"])
    .index("by_buyer", ["buyer_address"])
    .index("by_transaction", ["transaction_hash"]),

  store_settings: defineTable({
    owner_address: v.string(),
    store_enabled: v.boolean(),
    accepted_tokens: v.array(v.string()),
    store_description: v.optional(v.string()),
    social_links: v.optional(
      v.object({
        twitter: v.optional(v.string()),
        discord: v.optional(v.string()),
        telegram: v.optional(v.string()),
      }),
    ),
    theme_color: v.optional(v.string()),
  }).index("by_owner", ["owner_address"]),

  users: defineTable({
    // Core identity
    wallet_address: v.string(),
    ens_names: v.array(v.string()),

    // KYC Status (for future use)
    kyc_status: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),

    // Feature flags
    fiat_enabled: v.boolean(),
    fiat_balance: v.optional(v.number()),

    // Payment preferences - simplified
    preferred_currency: v.union(
      v.literal("ETH"),
      v.literal("USDC"),
      v.literal("USDT"),
    ),

    preferred_chain_id: v.number(), // 1 for Ethereum, 8453 for Base, 137 for Polygon, etc.

    // Profile settings
    profile_settings: v.optional(
      v.object({
        display_name: v.optional(v.string()),
        bio: v.optional(v.string()),
        website: v.optional(v.string()),
        twitter: v.optional(v.string()),
        discord: v.optional(v.string()),
        telegram: v.optional(v.string()),
      }),
    ),

    // Timestamps
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_wallet", ["wallet_address"])
    .index("by_kyc_status", ["kyc_status"]),
});
