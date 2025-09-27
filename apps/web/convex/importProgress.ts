import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const getImportProgress = query({
  args: { csvFileName: v.string() },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("importProgress")
      .withIndex("by_file", (q) => q.eq("csvFileName", args.csvFileName))
      .first();

    return progress;
  },
});

export const updateImportProgress = mutation({
  args: {
    csvFileName: v.string(),
    totalRows: v.number(),
    processedRows: v.number(),
    lastProcessedDomain: v.optional(v.string()),
    lastProcessedIndex: v.number(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("paused")
    ),
    errorCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("importProgress")
      .withIndex("by_file", (q) => q.eq("csvFileName", args.csvFileName))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        lastUpdatedAt: now,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("importProgress", {
        ...args,
        startedAt: now,
        lastUpdatedAt: now,
        errorCount: args.errorCount || 0,
      });
      return id;
    }
  },
});

export const resetImportProgress = mutation({
  args: { csvFileName: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("importProgress")
      .withIndex("by_file", (q) => q.eq("csvFileName", args.csvFileName))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Also clear any errors for this file
    const errors = await ctx.db
      .query("importErrors")
      .withIndex("by_file", (q) => q.eq("csvFileName", args.csvFileName))
      .collect();

    for (const error of errors) {
      await ctx.db.delete(error._id);
    }

    return { cleared: true };
  },
});

export const logImportError = mutation({
  args: {
    csvFileName: v.string(),
    domain_name: v.string(),
    rowIndex: v.number(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("importErrors")
      .withIndex("by_domain", (q) => q.eq("domain_name", args.domain_name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        error: args.error,
        attemptedAt: Date.now(),
        retryCount: (existing.retryCount || 0) + 1,
      });
    } else {
      await ctx.db.insert("importErrors", {
        ...args,
        attemptedAt: Date.now(),
        retryCount: 0,
      });
    }
  },
});

export const getImportErrors = query({
  args: { csvFileName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("importErrors")
      .withIndex("by_file", (q) => q.eq("csvFileName", args.csvFileName))
      .collect();
  },
});

export const getImportedDomains = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1000;
    const offset = args.offset ?? 0;

    const profiles = await ctx.db
      .query("ensProfiles")
      .order("asc")
      .collect();

    const domains = profiles
      .slice(offset, offset + limit)
      .map(p => p.domain_name);

    return {
      domains,
      total: profiles.length,
      hasMore: profiles.length > offset + limit,
    };
  },
});

export const checkDomainExists = query({
  args: { domain_name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ensProfiles")
      .withIndex("by_domain", (q) => q.eq("domain_name", args.domain_name))
      .first();

    return !!existing;
  },
});