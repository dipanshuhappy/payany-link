#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function clearRagNamespace() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

  if (!convexUrl) {
    console.error("❌ Please set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);

  console.log("🧹 Clearing RAG namespace to fix dimension mismatch...");

  try {
    const result = await client.action(api.ensProfiles.clearRagNamespace, {});

    if (result.success) {
      console.log("✅ RAG namespace cleared successfully");
      console.log("📝 You can now run the import script with OpenAI embeddings");
    } else {
      console.error("❌ Failed to clear RAG namespace:", result.error);
    }
  } catch (error: any) {
    console.error("❌ Error clearing RAG namespace:", error.message);
  }
}

clearRagNamespace().catch(console.error);