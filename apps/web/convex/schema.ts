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
});