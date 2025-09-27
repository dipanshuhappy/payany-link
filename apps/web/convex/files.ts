import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for files
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Get file URL from storage ID
export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Store file metadata after upload
export const storeFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    uploadedBy: v.string(), // wallet address
    purpose: v.union(v.literal("product_image"), v.literal("product_file"), v.literal("preview_file")),
  },
  handler: async (ctx, args) => {
    // You could store file metadata in a separate table if needed
    // For now, we'll just return the storage URL
    const url = await ctx.storage.getUrl(args.storageId);
    return {
      storageId: args.storageId,
      url,
      filename: args.filename,
      fileType: args.fileType,
      fileSize: args.fileSize,
    };
  },
});

// Delete file from storage
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});