import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { components, api } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { google } from "@ai-sdk/google";
import type { Doc, Id } from "./_generated/dataModel";

const rag = new RAG(components.rag, {
  textEmbeddingModel: google.textEmbedding("gemini-embedding-001"),
  embeddingDimension: 768,
});

export const addProfile = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const profileId = await ctx.db.insert("ensProfiles", args);

    await rag.add(ctx, {
      namespace: "ens-profiles",
      text: args.searchableText,
      metadata: {
        profileId: profileId,
        domain_name: args.domain_name,
        resolved_address: args.resolved_address || null,
      },
    });

    return profileId;
  },
});

export const bulkImportProfiles = mutation({
  args: {
    profiles: v.array(
      v.object({
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
      }),
    ),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const profile of args.profiles) {
      try {
        const existingProfile = await ctx.db
          .query("ensProfiles")
          .withIndex("by_domain", (q) =>
            q.eq("domain_name", profile.domain_name),
          )
          .first();

        if (existingProfile) {
          console.log(
            `Profile ${profile.domain_name} already exists, skipping`,
          );
          continue;
        }

        const profileId = await ctx.db.insert("ensProfiles", profile);

        await rag.add(ctx, {
          namespace: "ens-profiles",
          text: profile.searchableText,
          metadata: {
            profileId: profileId,
            domain_name: profile.domain_name,
            resolved_address: profile.resolved_address || null,
          },
        });

        results.push(profileId);
      } catch (error) {
        console.error(`Error adding profile ${profile.domain_name}:`, error);
      }
    }

    return { imported: results.length, total: args.profiles.length };
  },
});

export const searchProfiles = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    profiles: (Doc<"ensProfiles"> | null)[];
    searchText: string;
    total: number;
  }> => {
    const limit = args.limit ?? 10;

    const ragResults = await rag.search(ctx, {
      namespace: "ens-profiles",
      query: args.query,
      limit: limit * 2, // Get more results to filter after
    });

    const profileIds: Id<"ensProfiles">[] = ragResults.results
      .map((result) => {
        const content = result.content[0];
        return content?.metadata?.profileId as Id<"ensProfiles">;
      })
      .filter(Boolean)
      .slice(0, limit);

    const profiles: (Doc<"ensProfiles"> | null)[] = await Promise.all(
      profileIds.map(async (id: Id<"ensProfiles">): Promise<Doc<"ensProfiles"> | null> => {
        const profile = await ctx.runQuery(api.ensProfiles.getProfileById, { id });
        return profile;
      }),
    );

    return {
      profiles: profiles.filter(Boolean),
      searchText: ragResults.text,
      total: ragResults.results.length,
    };
  },
});

export const getProfileById = query({
  args: { id: v.id("ensProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getProfileByDomain = query({
  args: { domain_name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ensProfiles")
      .withIndex("by_domain", (q) => q.eq("domain_name", args.domain_name))
      .first();
  },
});

export const getProfileByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ensProfiles")
      .withIndex("by_address", (q) => q.eq("resolved_address", args.address))
      .collect();
  },
});

export const getAllProfiles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db.query("ensProfiles").order("desc").take(limit);
  },
});
