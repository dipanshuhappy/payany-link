import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Grant access to a product after payment verification
export const grantProductAccess = mutation({
  args: {
    product_id: v.string(),
    buyer_address: v.string(),
    transaction_hash: v.string(),
    access_expires: v.optional(v.number()),
    max_downloads: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if access already exists for this transaction
    const existingAccess = await ctx.db
      .query("product_access")
      .withIndex("by_transaction", (q) =>
        q.eq("transaction_hash", args.transaction_hash),
      )
      .first();

    if (existingAccess) {
      return {
        success: false,
        error: "Access already granted for this transaction",
        accessId: existingAccess._id,
      };
    }

    const accessId = await ctx.db.insert("product_access", {
      ...args,
      purchase_date: Date.now(),
      download_count: 0,
    });

    // Increment sold count for the product
    await ctx.runMutation(api.products.incrementSoldCount, {
      product_id: args.product_id,
    });

    return {
      success: true,
      accessId,
    };
  },
});

// Check if buyer has access to a product
export const verifyProductAccess = query({
  args: {
    product_id: v.string(),
    buyer_address: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await ctx.db
      .query("product_access")
      .withIndex("by_product", (q) => q.eq("product_id", args.product_id))
      .filter((q) => q.eq(q.field("buyer_address"), args.buyer_address))
      .first();

    if (!access) {
      return { hasAccess: false };
    }

    // Check if access has expired
    if (access.access_expires && access.access_expires < Date.now()) {
      return { hasAccess: false, reason: "expired" };
    }

    // Check if download limit reached
    if (
      access.max_downloads &&
      access.download_count &&
      access.download_count >= access.max_downloads
    ) {
      return { hasAccess: false, reason: "download_limit_reached" };
    }

    return {
      hasAccess: true,
      access,
    };
  },
});

// Get all purchases by buyer
export const getPurchasesByBuyer = query({
  args: { buyer_address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("product_access")
      .withIndex("by_buyer", (q) => q.eq("buyer_address", args.buyer_address))
      .order("desc")
      .collect();
  },
});

// Get all purchases for a specific product
export const getPurchasesByProduct = query({
  args: { product_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("product_access")
      .withIndex("by_product", (q) => q.eq("product_id", args.product_id))
      .order("desc")
      .collect();
  },
});

// Record a download (increment download count)
export const recordDownload = mutation({
  args: {
    product_id: v.string(),
    buyer_address: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await ctx.db
      .query("product_access")
      .withIndex("by_product", (q) => q.eq("product_id", args.product_id))
      .filter((q) => q.eq(q.field("buyer_address"), args.buyer_address))
      .first();

    if (!access) {
      return { success: false, error: "Access not found" };
    }

    const currentCount = access.download_count || 0;
    await ctx.db.patch(access._id, {
      download_count: currentCount + 1,
    });

    return { success: true, download_count: currentCount + 1 };
  },
});

// Generate secure download link (action can use external APIs)
export const generateDownloadLink = action({
  args: {
    product_id: v.string(),
    buyer_address: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> => {
    // Verify access
    const accessCheck = await ctx.runQuery(
      api.productAccess.verifyProductAccess,
      {
        product_id: args.product_id,
        buyer_address: args.buyer_address,
      },
    );

    if (!accessCheck.hasAccess) {
      return {
        success: false,
        error: accessCheck.reason || "Access denied",
      };
    }

    // Get product details
    const product = await ctx.runQuery(api.products.getProductById, {
      product_id: args.product_id,
    });

    if (!product || !product.file_url) {
      return {
        success: false,
        error: "Product file not found",
      };
    }

    // Record the download
    await ctx.runMutation(api.productAccess.recordDownload, {
      product_id: args.product_id,
      buyer_address: args.buyer_address,
    });

    // For now, return the file URL directly
    // In production, you'd want to generate a time-limited signed URL
    return {
      success: true,
      downloadUrl: product.file_url,
    };
  },
});

// Store settings functions
export const getStoreSettings = query({
  args: { owner_address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("store_settings")
      .withIndex("by_owner", (q) => q.eq("owner_address", args.owner_address))
      .first();
  },
});

export const updateStoreSettings = mutation({
  args: {
    owner_address: v.string(),
    store_enabled: v.optional(v.boolean()),
    accepted_tokens: v.optional(v.array(v.string())),
    store_description: v.optional(v.string()),
    social_links: v.optional(
      v.object({
        twitter: v.optional(v.string()),
        discord: v.optional(v.string()),
        telegram: v.optional(v.string()),
      }),
    ),
    theme_color: v.optional(v.string()),
    isFiatEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { owner_address, ...updateData } = args;

    const existing = await ctx.db
      .query("store_settings")
      .withIndex("by_owner", (q) => q.eq("owner_address", owner_address))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
      return { success: true, settingsId: existing._id };
    } else {
      const settingsId = await ctx.db.insert("store_settings", {
        owner_address,
        store_enabled: true,
        accepted_tokens: ["ETH", "USDC"],
        ...updateData,
      });
      return { success: true, settingsId };
    }
  },
});

// Check if fiat payments are enabled for an owner
export const isFiatEnabled = query({
  args: {
    owner_address: v.string(),
  },
  handler: async (ctx, args) => {
    const storeSettings = await ctx.db
      .query("store_settings")
      .withIndex("by_owner", (q) => q.eq("owner_address", args.owner_address))
      .first();

    return {
      enabled: storeSettings?.isFiatEnabled ?? false,
      hasSettings: !!storeSettings,
    };
  },
});
