#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

interface ProcessingStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

class RagBackfiller {
  private client: ConvexHttpClient;
  private stats: ProcessingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };
  private delay: number = 200; // 200ms delay for OpenAI
  private batchSize: number = 50; // Process in batches

  constructor(
    convexUrl: string,
    options: { delay?: number; batchSize?: number } = {},
  ) {
    this.client = new ConvexHttpClient(convexUrl);
    this.delay = options.delay || 200;
    this.batchSize = options.batchSize || 50;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async addRagToExistingProfiles(): Promise<void> {
    console.log("🚀 Starting RAG backfill for existing profiles");
    console.log(`⏱️  Delay between profiles: ${this.delay}ms`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log("");

    // Get all existing profiles
    console.log("📊 Fetching all existing profiles...");
    const profiles = await this.client.query(api.ensProfiles.getAllProfiles, {
      limit: 999999, // Get all profiles
    });

    this.stats.total = profiles.length;
    console.log(`📈 Found ${this.stats.total} profiles to process`);
    console.log("");

    if (this.stats.total === 0) {
      console.log("ℹ️  No profiles found to process");
      return;
    }

    // Process profiles one by one
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      if (!profile?.domain_name) {
        this.stats.skipped++;
        console.log(`  ⏭️  Skipped (no domain name)`);
        continue;
      }

      console.log(
        `Processing [${i + 1}/${this.stats.total}]: ${profile.domain_name}`,
      );

      try {
        // Check if profile already has RAG embeddings
        // const hasEmbeddings = await this.client.action(
        //   api.ensProfiles.profileHasRagEmbeddings,
        //   {
        //     domain_name: profile.domain_name,
        //   },
        // );

        // if (hasEmbeddings) {
        //   this.stats.skipped++;
        //   console.log(`  ⏭️  Skipped (already has embeddings)`);
        // } else {
        // Add RAG embeddings
        const result = await this.client.action(
          api.ensProfiles.addRagToProfile,
          {
            profileId: profile._id,
          },
        );

        if (result.success) {
          this.stats.successful++;
          console.log(`  ✅ RAG embeddings added successfully`);
        } else {
          this.stats.failed++;
          console.log(`  ❌ Failed: ${result.error}`);
        }
        // }
      } catch (error: any) {
        this.stats.failed++;
        console.log(`  ❌ Error: ${error.message}`);
      }

      this.stats.processed++;

      // Progress update every 10 profiles
      if (this.stats.processed % 10 === 0) {
        const percentage = Math.round(
          (this.stats.processed / this.stats.total) * 100,
        );
        console.log(
          `\n📈 Progress: ${this.stats.processed}/${this.stats.total} (${percentage}%) | ✅ ${this.stats.successful} successful | ❌ ${this.stats.failed} failed\n`,
        );
      }

      // Add delay between profiles to avoid rate limits
      if (this.delay > 0 && i < profiles.length - 1) {
        await this.sleep(this.delay);
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 RAG BACKFILL COMPLETE");
    console.log("=".repeat(50));
    console.log(`Total Profiles:  ${this.stats.total}`);
    console.log(`Processed:       ${this.stats.processed}`);
    console.log(`✅ Successful:   ${this.stats.successful}`);
    console.log(`⏭️  Skipped:      ${this.stats.skipped}`);
    console.log(`❌ Failed:       ${this.stats.failed}`);

    const successRate = Math.round(
      (this.stats.successful / this.stats.total) * 100,
    );
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log("=".repeat(50));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error(
      "❌ Please set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable",
    );
    process.exit(1);
  }

  const delayIndex = args.indexOf("--delay");
  const delay = delayIndex > -1 ? parseInt(args[delayIndex + 1]!) : 200;

  const batchIndex = args.indexOf("--batch");
  const batchSize = batchIndex > -1 ? parseInt(args[batchIndex + 1]!) : 50;

  const backfiller = new RagBackfiller(convexUrl, {
    delay: isNaN(delay) ? 200 : delay,
    batchSize: isNaN(batchSize) ? 50 : batchSize,
  });

  try {
    await backfiller.addRagToExistingProfiles();
    process.exit(0);
  } catch (error) {
    console.error("❌ RAG backfill failed:", error);
    process.exit(1);
  }
}

// Show usage if --help is provided
if (process.argv.includes("--help")) {
  console.log("Usage: pnpm add-rag-existing [options]");
  console.log("\nOptions:");
  console.log(
    "  --delay <ms>     Delay between profiles in milliseconds (default: 200)",
  );
  console.log("  --batch <size>   Batch size for processing (default: 50)");
  console.log("\nExample:");
  console.log("  pnpm add-rag-existing --delay 100 --batch 25");
  process.exit(0);
}

// Run the backfill
main().catch(console.error);
