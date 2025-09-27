#!/usr/bin/env tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

interface CSVRow {
  domain_name: string;
  last_name?: string;
  resolved_address: string;
  registration_date: string;
  expiry_date: string;
  description: string;
  github: string;
  twitter: string;
  optin: string;
  block_confirmation: string;
}

interface ProcessingStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  ragFailed: number;
}

class SimpleCSVImporter {
  private client: ConvexHttpClient;
  private csvFilePath: string;
  private csvFileName: string;
  private stats: ProcessingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    ragFailed: 0,
  };
  private maxRetries: number = 3;
  private retryDelay: number = 60000; // 1 minute
  private delay: number = 200; // milliseconds between profiles (default 200ms for OpenAI)
  private lastProcessedIndex: number = -1;
  private failedDomains: string[] = [];

  constructor(
    csvFilePath: string,
    convexUrl: string,
    options: { delay?: number } = {},
  ) {
    this.client = new ConvexHttpClient(convexUrl);
    this.csvFilePath = csvFilePath;
    this.csvFileName = path.basename(csvFilePath);
    this.delay = options.delay || 200;
  }

  private async checkExistingProgress(): Promise<any> {
    try {
      const progress = await this.client.query(
        api.importProgress.getImportProgress,
        {
          csvFileName: this.csvFileName,
        },
      );

      if (progress && progress.status !== "completed") {
        // Check actual database count vs tracked progress
        const dbCount = await this.getDatabaseCount();

        console.log(
          `📊 Found existing progress: ${progress.processedRows}/${progress.totalRows} rows tracked`,
        );
        console.log(`🗄️  Database has: ${dbCount} actual profiles`);

        if (dbCount !== progress.processedRows) {
          console.log(`⚠️  Progress mismatch detected! Correcting...`);
          // Use database count as the real progress
          this.stats.successful = dbCount;
        } else {
          this.stats.successful = progress.processedRows;
        }

        this.lastProcessedIndex = progress.lastProcessedIndex;
        return progress;
      }
      return null;
    } catch (error) {
      console.log("No existing progress found, starting fresh import");
      return null;
    }
  }

  private async getDatabaseCount(): Promise<number> {
    try {
      const profiles = await this.client.query(api.ensProfiles.getAllProfiles, { limit: 999999 });
      return profiles.length;
    } catch (error) {
      console.log("Could not get database count, assuming 0");
      return 0;
    }
  }

  private async updateProgress(domain: string, index: number) {
    try {
      await this.client.mutation(api.importProgress.updateImportProgress, {
        csvFileName: this.csvFileName,
        totalRows: this.stats.total,
        processedRows: this.stats.successful, // Only count successful saves
        lastProcessedDomain: domain,
        lastProcessedIndex: index,
        status: "in_progress",
        errorCount: this.stats.failed,
      });
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  private async countTotalRows(): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = -1; // Exclude header
      const stream = fs.createReadStream(this.csvFilePath);
      const rl = readline.createInterface({ input: stream });

      rl.on("line", () => count++);
      rl.on("close", () => resolve(count));
      rl.on("error", reject);
    });
  }

  private transformToProfile(row: CSVRow) {
    const description = row.description || "";
    const github = row.github || "";
    const twitter = row.twitter || "";
    const domain = row.domain_name || "";

    const searchableText = [
      domain,
      description,
      github && `github: ${github}`,
      twitter && `twitter: ${twitter}`,
      row.resolved_address && `address: ${row.resolved_address}`,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      domain_name: domain,
      resolved_address: row.resolved_address || undefined,
      registration_date: row.registration_date || undefined,
      expiry_date: row.expiry_date || undefined,
      description: description || undefined,
      github: github || undefined,
      twitter: twitter || undefined,
      optin:
        row.optin === "true" ? true : row.optin === "false" ? false : undefined,
      block_confirmation: row.block_confirmation || undefined,
      searchableText,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async import(): Promise<void> {
    if (!fs.existsSync(this.csvFilePath)) {
      console.error(`❌ CSV file not found: ${this.csvFilePath}`);
      process.exit(1);
    }

    console.log("🚀 Starting CSV Import with RAG");
    console.log(`📁 File: ${this.csvFileName}`);
    console.log(`⏱️  Delay between profiles: ${this.delay}ms`);
    console.log(`🔄 Max retries per profile: ${this.maxRetries}`);
    console.log(`⏳ Retry delay: ${this.retryDelay / 1000} seconds`);
    console.log("");

    // Check for existing progress
    const existingProgress = await this.checkExistingProgress();
    if (existingProgress) {
      const answer = await this.promptUser(
        `Resume from row ${this.lastProcessedIndex + 1}? (y/n): `,
      );
      if (answer.toLowerCase() !== "y") {
        this.lastProcessedIndex = -1;
        this.stats.processed = 0;
        await this.resetProgress();
      }
    }

    // Count total rows
    this.stats.total = await this.countTotalRows();
    console.log(`📊 Total rows to process: ${this.stats.total}`);
    console.log("");

    // Process CSV
    await this.processCSV();
  }

  private async processCSV(): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.csvFilePath);
      const rl = readline.createInterface({ input: stream });

      let headers: string[] = [];
      let currentIndex = -1;

      rl.on("line", async (line) => {
        currentIndex++;

        // Skip header
        if (currentIndex === 0) {
          headers = this.parseCSVLine(line);
          return;
        }

        // Skip already processed rows
        if (currentIndex <= this.lastProcessedIndex) {
          return;
        }

        // Pause the stream while processing
        rl.pause();

        try {
          const values = this.parseCSVLine(line);
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          const profile = this.transformToProfile(row as CSVRow);

          // Process single profile
          console.log(
            `Processing [${currentIndex}/${this.stats.total}]: ${profile.domain_name}`,
          );

          // Try to add profile with retries
          let retries = 0;
          let success = false;

          while (!success && retries <= this.maxRetries) {
            try {
              const result = await this.client.action(
                api.ensProfiles.addProfile,
                profile,
              );

              if (result.success) {
                this.stats.successful++;
                console.log(`  ✅ Profile saved with embeddings`);
                success = true;
              } else if (result.error === "Profile already exists") {
                this.stats.skipped++;
                console.log(`  ⏭️  Skipped (already exists)`);
                success = true; // Don't retry for existing profiles
              } else {
                throw new Error(result.error);
              }
            } catch (actionError: any) {
              // Handle rate limiting separately from other errors
              if (actionError.message && actionError.message.includes("TooManyConcurrentRequests")) {
                console.log(`  ⚠️  Rate limited, waiting 30s before retry...`);
                await this.sleep(30000); // Wait 30 seconds for rate limit
                // Don't increment retries for rate limits, just try again
                continue;
              }

              retries++;

              if (actionError.message.includes("RAG failed")) {
                if (retries <= this.maxRetries) {
                  console.log(`  ⚠️  RAG failed, waiting ${this.retryDelay / 1000}s before retry ${retries}/${this.maxRetries}...`);
                  await this.sleep(this.retryDelay);
                } else {
                  console.log(`  ❌ RAG failed after ${this.maxRetries} retries. Stopping import.`);
                  console.log(`\n⚠️  Fix the issue and run the import again to resume from row ${currentIndex}.`);
                  process.exit(1);
                }
              } else {
                console.log(`  ❌ Error: ${actionError.message}`);
                this.stats.failed++;
                this.failedDomains.push(profile.domain_name);
                break; // Don't retry for other errors
              }
            }
          }

          // Update progress every 10 successful saves
          if (this.stats.successful % 10 === 0) {
            await this.updateProgress(profile.domain_name, currentIndex);
            const percentage = Math.round(
              (this.stats.successful / this.stats.total) * 100,
            );
            console.log(
              `\n📈 Progress: ${this.stats.successful} saved/${this.stats.total} total (${percentage}%)\n`,
            );
          }

          // Add delay between profiles
          if (this.delay > 0) {
            await this.sleep(this.delay);
          }
        } catch (error: any) {
          console.error(
            `❌ Error processing row ${currentIndex}:`,
            error.message,
          );
          this.stats.failed++;
        }

        // Resume reading
        rl.resume();
      });

      rl.on("close", async () => {
        // Final progress update
        await this.updateProgress("", currentIndex);

        // Mark as completed
        await this.client.mutation(api.importProgress.updateImportProgress, {
          csvFileName: this.csvFileName,
          totalRows: this.stats.total,
          processedRows: this.stats.successful, // Only successful saves
          lastProcessedDomain: "",
          lastProcessedIndex: currentIndex,
          status: "completed",
          errorCount: this.stats.failed,
        });

        // Print final summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 IMPORT COMPLETE");
        console.log("=".repeat(50));
        console.log(`Total Rows:      ${this.stats.total}`);
        console.log(`Processed:       ${this.stats.processed}`);
        console.log(`✅ Successful:   ${this.stats.successful}`);
        console.log(`⏭️  Skipped:      ${this.stats.skipped}`);
        console.log(`❌ Failed:       ${this.stats.failed}`);
        if (this.stats.ragFailed > 0) {
          console.log(`⚠️  RAG Failed:   ${this.stats.ragFailed}`);
        }

        if (this.failedDomains.length > 0) {
          console.log("\n❌ Failed Domains:");
          this.failedDomains.slice(0, 10).forEach((domain) => {
            console.log(`  - ${domain}`);
          });
          if (this.failedDomains.length > 10) {
            console.log(`  ... and ${this.failedDomains.length - 10} more`);
          }
        }

        console.log("=".repeat(50));
        resolve();
      });

      rl.on("error", (error) => {
        console.error("❌ Error reading file:", error);
        reject(error);
      });
    });
  }

  private async resetProgress(): Promise<void> {
    console.log("🔄 Resetting import progress...");
    await this.client.mutation(api.importProgress.resetImportProgress, {
      csvFileName: this.csvFileName,
    });
  }

  private promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find((arg) => !arg.startsWith("--"));

  if (!csvPath) {
    console.error("❌ Please provide a CSV file path");
    console.error("\nUsage: pnpm import-csv-simple <file.csv> [options]");
    console.error("\nOptions:");
    console.error(
      "  --delay <ms>       Delay between profiles in milliseconds (default: 200)",
    );
    console.error("\nExample:");
    console.error(
      "  pnpm import-csv-simple public/data.csv --delay 100",
    );
    process.exit(1);
  }

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

  const importer = new SimpleCSVImporter(csvPath, convexUrl, {
    delay: isNaN(delay) ? 200 : delay,
  });

  try {
    await importer.import();
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);
