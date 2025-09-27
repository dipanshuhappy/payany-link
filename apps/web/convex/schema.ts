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
      filterFields: ["domain_name", "resolved_address"]
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
      v.literal("paused")
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
});