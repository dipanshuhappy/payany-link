import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Create or update a user
export const createOrUpdateUser = mutation({
  args: {
    wallet_address: v.string(),
    ens_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update ENS names if provided
      if (args.ens_name && !existingUser.ens_names.includes(args.ens_name)) {
        await ctx.db.patch(existingUser._id, {
          ens_names: [...existingUser.ens_names, args.ens_name],
          updated_at: now,
        });
      }
      return existingUser._id;
    }

    // Create new user with defaults
    const userId = await ctx.db.insert("users", {
      wallet_address: args.wallet_address.toLowerCase(),
      ens_names: args.ens_name ? [args.ens_name] : [],
      kyc_status: "not_started",
      fiat_enabled: false, // Default: crypto only
      preferred_currency: "USDC",
      preferred_chain_id: 1, // Default: Ethereum Mainnet
      created_at: now,
      updated_at: now,
    });

    return userId;
  },
});

// Get user by wallet address
export const getUserByWallet = query({
  args: {
    wallet_address: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();
  },
});

// Get user by ID
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Add ENS name to user
export const addEnsToUser = mutation({
  args: {
    wallet_address: v.string(),
    ens_name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.ens_names.includes(args.ens_name)) {
      await ctx.db.patch(user._id, {
        ens_names: [...user.ens_names, args.ens_name],
        updated_at: Date.now(),
      });
    }

    return { success: true };
  },
});

// Remove ENS name from user
export const removeEnsFromUser = mutation({
  args: {
    wallet_address: v.string(),
    ens_name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      ens_names: user.ens_names.filter(name => name !== args.ens_name),
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Update KYC status
export const updateKycStatus = mutation({
  args: {
    wallet_address: v.string(),
    kyc_status: v.union(
      v.literal("not_started"),
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      kyc_status: args.kyc_status,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Toggle fiat enabled
export const toggleFiatEnabled = mutation({
  args: {
    wallet_address: v.string(),
    fiat_enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if KYC is approved before enabling fiat
    if (args.fiat_enabled && user.kyc_status !== "approved") {
      throw new Error("KYC must be approved to enable fiat payments");
    }

    await ctx.db.patch(user._id, {
      fiat_enabled: args.fiat_enabled,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Update preferred currency
export const updatePreferredCurrency = mutation({
  args: {
    wallet_address: v.string(),
    preferred_currency: v.union(
      v.literal("ETH"),
      v.literal("USDC"),
      v.literal("USDT")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      preferred_currency: args.preferred_currency,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Update preferred chain
export const updatePreferredChain = mutation({
  args: {
    wallet_address: v.string(),
    preferred_chain_id: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Validate chain ID
    const validChainIds = [1, 137, 8453, 10, 42161, 56];
    if (!validChainIds.includes(args.preferred_chain_id)) {
      throw new Error("Invalid chain ID");
    }

    await ctx.db.patch(user._id, {
      preferred_chain_id: args.preferred_chain_id,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Update profile settings
export const updateProfileSettings = mutation({
  args: {
    wallet_address: v.string(),
    profile_settings: v.object({
      display_name: v.optional(v.string()),
      bio: v.optional(v.string()),
      website: v.optional(v.string()),
      twitter: v.optional(v.string()),
      discord: v.optional(v.string()),
      telegram: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("wallet_address", args.wallet_address.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      profile_settings: args.profile_settings,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Get all users (admin function)
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("users")
      .order("desc")
      .take(limit);
  },
});

// Get users by KYC status
export const getUsersByKycStatus = query({
  args: {
    kyc_status: v.union(
      v.literal("not_started"),
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("users")
      .withIndex("by_kyc_status", (q) => q.eq("kyc_status", args.kyc_status))
      .order("desc")
      .take(limit);
  },
});

// Helper to get chain name from ID
export const getChainName = (chainId: number): string => {
  const chainMap: Record<number, string> = {
    1: "Ethereum",
    137: "Polygon",
    8453: "Base",
    10: "Optimism",
    42161: "Arbitrum",
    56: "BNB Chain",
  };
  return chainMap[chainId] || "Unknown";
};