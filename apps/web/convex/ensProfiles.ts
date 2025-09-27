import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { components, api } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import type { Doc, Id } from "./_generated/dataModel";

const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
  embeddingDimension: 1536,
  filterNames: ["profileId", "domain_name", "resolved_address"],
});

// Internal mutation to just save profile data (no external calls)
export const _addProfileData = mutation({
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
    // Check if profile already exists
    const existing = await ctx.db
      .query("ensProfiles")
      .withIndex("by_domain", (q) => q.eq("domain_name", args.domain_name))
      .first();

    if (existing) {
      return {
        success: false,
        error: "Profile already exists",
        id: existing._id,
        domain: args.domain_name,
      };
    }

    // Insert the profile into database
    const profileId = await ctx.db.insert("ensProfiles", args);

    return {
      success: true,
      id: profileId,
      domain: args.domain_name,
    };
  },
});

// Action that can use external APIs (fetch)
export const addProfile = action({
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
  handler: async (ctx, args): Promise<any> => {
    // First, save the profile data
    const result = await ctx.runMutation(api.ensProfiles._addProfileData, args);

    if (!result.success) {
      return result;
    }

    // Then add RAG embeddings (this can use fetch)
    try {
      await rag.add(ctx, {
        namespace: "ens-profiles",
        text: args.searchableText,
        filterValues: [
          { name: "profileId", value: result.id },
          { name: "domain_name", value: args.domain_name },
          { name: "resolved_address", value: args.resolved_address || "" },
        ],
      });

      return {
        success: true,
        id: result.id,
        domain: args.domain_name,
        ragStatus: "success",
      };
    } catch (ragError: any) {
      console.error(
        `RAG embedding failed for ${args.domain_name}:`,
        ragError.message,
      );

      // Delete the profile since RAG failed
      await ctx.runMutation(api.ensProfiles._deleteProfile, { id: result.id });

      throw new Error(`RAG failed: ${ragError.message}`);
    }
  },
});

// Helper mutation to delete a profile
export const _deleteProfile = mutation({
  args: { id: v.id("ensProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Removed bulkImportProfiles - now using individual addProfile calls for better error handling

export const searchProfiles = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    profiles: (Doc<"ensProfiles"> | null)[];
    searchText: string;
    total: number;
  }> => {
    const limit = args.limit ?? 10;

    const { results, text, entries } = await rag.search(ctx, {
      namespace: "ens-profiles",
      query: args.query,
      limit: limit * 2, // Get more results to filter after
      vectorScoreThreshold: 0.5,
    });

    console.log(entries, "ragEntries");

    // Only extract profileIds that are actually present and of the correct type
    const profileIds: Id<"ensProfiles">[] = entries
      .map((entry) => {
        const profileIdFilter = entry.filterValues?.find(
          (filter: any) => filter.name === "profileId",
        );
        return profileIdFilter?.value as Id<"ensProfiles"> | undefined;
      })
      .filter((id): id is Id<"ensProfiles"> => !!id) // Type guard to filter out undefined/null
      .slice(0, limit);

    // For domain fallback, handle separately
    const domains: string[] = entries
      .map((entry) => {
        if (
          !entry.filterValues?.find(
            (filter: any) => filter.name === "profileId",
          )
        ) {
          const domain = entry.text?.split(" ")[0];
          return domain?.endsWith(".eth") ? domain : null;
        }
        return null;
      })
      .filter((domain): domain is string => !!domain)
      .slice(0, limit);

    console.log(profileIds, "extractedProfileIds");
    console.log(domains, "extractedDomains");

    // Fetch profiles by ID
    const profilesById: (Doc<"ensProfiles"> | null)[] = await Promise.all(
      profileIds.map(async (id) =>
        ctx.runQuery(api.ensProfiles.getProfileById, { id }),
      ),
    );

    // Filter out nulls and duplicates by domain_name, keeping first occurrence
    const uniqueProfiles = new Map<string, Doc<"ensProfiles">>();
    profilesById
      .filter((profile): profile is Doc<"ensProfiles"> => profile !== null)
      .forEach((profile) => {
        if (!uniqueProfiles.has(profile.domain_name)) {
          uniqueProfiles.set(profile.domain_name, profile);
        }
      });

    const profiles = Array.from(uniqueProfiles.values()).slice(0, limit);
    console.log(profiles, "combinedProfiles");

    return {
      profiles: profiles,
      searchText: text,
      total: results.length,
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

// Add RAG embeddings to existing profile
export const addRagToProfile = action({
  args: { profileId: v.id("ensProfiles") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    domain?: string;
    profileId?: Id<"ensProfiles">;
    error?: string;
  }> => {
    try {
      // Get the profile
      const profile: Doc<"ensProfiles"> | null = await ctx.runQuery(
        api.ensProfiles.getProfileById,
        { id: args.profileId },
      );

      if (!profile) {
        return { success: false, error: "Profile not found" };
      }

      console.log(`Adding RAG embeddings for profile ${profile._id}`);

      // Add RAG embeddings with filterValues instead of metadata
      await rag.add(ctx, {
        namespace: "ens-profiles",
        text: profile.searchableText,
        filterValues: [
          { name: "profileId", value: profile._id },
          { name: "domain_name", value: profile.domain_name },
          { name: "resolved_address", value: profile.resolved_address || "" },
        ],
      });

      return {
        success: true,
        domain: profile.domain_name,
        profileId: profile._id,
      };
    } catch (error: any) {
      console.error(
        `RAG embedding failed for profile ${args.profileId}:`,
        error.message,
      );
      return { success: false, error: error.message };
    }
  },
});

// Check if profile already has RAG embeddings
export const profileHasRagEmbeddings = action({
  args: { domain_name: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    try {
      const results = await rag.search(ctx, {
        namespace: "ens-profiles",
        query: args.domain_name,
        limit: 1,
      });

      // Check if we found the exact domain in results
      const hasEmbedding = results.results.some((result) => {
        const text = result.content[0]?.text;
        const domain = text?.split(" ")[0];
        return domain === args.domain_name;
      });

      return hasEmbedding;
    } catch (error) {
      console.error(
        `Error checking RAG embeddings for ${args.domain_name}:`,
        error,
      );
      return false;
    }
  },
});

// // Clear RAG namespace to fix dimension mismatch issues
// export const clearRagNamespace = action({
//   args: {},
//   handler: async (ctx) => {
//     try {
//       await rag.clear(ctx, { namespace: "ens-profiles" });
//       return { success: true, message: "RAG namespace cleared successfully" };
//     } catch (error: any) {
//       console.error("Error clearing RAG namespace:", error);
//       return { success: false, error: error.message };
//     }
//   },
// });
