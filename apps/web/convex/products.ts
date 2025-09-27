import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Create a new product
export const createProduct = mutation({
  args: {
    owner_address: v.string(),
    owner_ens: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.string(),
    prices: v.optional(v.object({
      eth: v.optional(v.number()),
      usdc: v.optional(v.number()),
      matic: v.optional(v.number()),
      sol: v.optional(v.number()),
      btc: v.optional(v.number()),
    })),
    product_type: v.union(
      v.literal("digital_download"),
      v.literal("service"),
      v.literal("subscription"),
      v.literal("donation")
    ),
    image_url: v.optional(v.string()),
    file_url: v.optional(v.string()),
    preview_url: v.optional(v.string()),
    max_supply: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const product_id = `${args.owner_address}-${now}-${Math.random().toString(36).substr(2, 9)}`;

    const productId = await ctx.db.insert("products", {
      ...args,
      product_id,
      active: true,
      sold_count: 0,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      productId,
      product_id,
    };
  },
});

// Update an existing product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    prices: v.optional(v.object({
      eth: v.optional(v.number()),
      usdc: v.optional(v.number()),
      matic: v.optional(v.number()),
      sol: v.optional(v.number()),
      btc: v.optional(v.number()),
    })),
    image_url: v.optional(v.string()),
    file_url: v.optional(v.string()),
    preview_url: v.optional(v.string()),
    max_supply: v.optional(v.number()),
    active: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { productId, ...updateData } = args;

    await ctx.db.patch(productId, {
      ...updateData,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Get all products by owner address
export const getProductsByOwner = query({
  args: {
    owner_address: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("products")
        .withIndex("by_owner_active", (q) =>
          q.eq("owner_address", args.owner_address).eq("active", true)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("products")
      .withIndex("by_owner", (q) => q.eq("owner_address", args.owner_address))
      .order("desc")
      .collect();
  },
});

// Get single product by product_id
export const getProductById = query({
  args: { product_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.product_id))
      .first();
  },
});

// Get product by database ID
export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

// Toggle product active status
export const toggleProductStatus = mutation({
  args: {
    productId: v.id("products"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      active: args.active,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Delete a product
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.productId);
    return { success: true };
  },
});

// Increment sold count
export const incrementSoldCount = mutation({
  args: { product_id: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_product_id", (q) => q.eq("product_id", args.product_id))
      .first();

    if (!product) {
      throw new Error("Product not found");
    }

    const currentCount = product.sold_count || 0;
    await ctx.db.patch(product._id, {
      sold_count: currentCount + 1,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

// Get featured products for homepage/discovery
export const getFeaturedProducts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("products")
      .filter((q) => q.and(q.eq(q.field("active"), true), q.eq(q.field("featured"), true)))
      .order("desc")
      .take(limit);
  },
});