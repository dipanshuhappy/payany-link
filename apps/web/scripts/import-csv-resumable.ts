import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface CSVRow {
  domain_name: string;
  last_name: string;
  resolved_address: string;
  registration_date: string;
  expiry_date: string;
  description: string;
  github: string;
  twitter: string;
  optin: string;
  block_confirmation: string;
}

interface ENSProfile {
  domain_name: string;
  resolved_address?: string;
  registration_date?: string;
  expiry_date?: string;
  description?: string;
  github?: string;
  twitter?: string;
  optin?: boolean;
  block_confirmation?: string;
  searchableText: string;
}

class ResumableCSVImporter {
  private client: ConvexHttpClient;
  private csvFilePath: string;
  private csvFileName: string;
  private batchSize: number;
  private totalRows: number = 0;
  private processedRows: number = 0;
  private lastProcessedIndex: number = -1;
  private progressCheckInterval: number = 100; // Check progress every N rows

  constructor(csvFilePath: string, convexUrl: string, batchSize: number = 100) {
    this.client = new ConvexHttpClient(convexUrl);
    this.csvFilePath = csvFilePath;
    this.csvFileName = path.basename(csvFilePath);
    this.batchSize = batchSize;
  }

  private async checkExistingProgress(): Promise<any> {
    console.log("Checking for existing import progress...");
    const progress = await this.client.query(api.importProgress.getImportProgress, {
      csvFileName: this.csvFileName,
    });

    if (progress) {
      console.log(`Found existing progress: ${progress.processedRows}/${progress.totalRows} rows processed`);
      if (progress.status === "completed") {
        console.log("Import already completed for this file!");
      }
    }

    return progress;
  }

  private async updateProgress(
    processedRows: number,
    lastProcessedDomain?: string,
    lastProcessedIndex: number = 0,
    status: "in_progress" | "completed" | "failed" | "paused" = "in_progress",
    errorCount: number = 0
  ) {
    await this.client.mutation(api.importProgress.updateImportProgress, {
      csvFileName: this.csvFileName,
      totalRows: this.totalRows,
      processedRows,
      lastProcessedDomain,
      lastProcessedIndex,
      status,
      errorCount,
    });
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
        i++; // Skip next quote
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
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
      let count = -1; // Start at -1 to exclude header
      const stream = fs.createReadStream(this.csvFilePath);
      const rl = readline.createInterface({ input: stream });

      rl.on("line", () => count++);
      rl.on("close", () => resolve(count));
      rl.on("error", reject);
    });
  }

  private transformToProfile(row: CSVRow): ENSProfile {
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
      optin: row.optin === "true" ? true : row.optin === "false" ? false : undefined,
      block_confirmation: row.block_confirmation || undefined,
      searchableText,
    };
  }

  async import(forceReset: boolean = false): Promise<void> {
    if (!fs.existsSync(this.csvFilePath)) {
      console.error(`CSV file not found: ${this.csvFilePath}`);
      process.exit(1);
    }

    // Check existing progress
    const existingProgress = await this.checkExistingProgress();

    if (existingProgress) {
      if (existingProgress.status === "completed" && !forceReset) {
        const answer = await this.promptUser(
          "Import already completed. Do you want to reset and start over? (y/n): "
        );
        if (answer.toLowerCase() !== "y") {
          console.log("Exiting without changes.");
          return;
        }
        await this.resetProgress();
      } else if (existingProgress.status === "in_progress") {
        const answer = await this.promptUser(
          `Resume from row ${existingProgress.processedRows}? (y to resume, n to restart): `
        );
        if (answer.toLowerCase() !== "y") {
          await this.resetProgress();
        } else {
          this.processedRows = existingProgress.processedRows;
          this.lastProcessedIndex = existingProgress.lastProcessedIndex;
        }
      }
    }

    // Count total rows
    this.totalRows = await this.countTotalRows();
    console.log(`Total rows to process: ${this.totalRows}`);

    // Process CSV
    await this.processCSV();
  }

  private async processCSV(): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.csvFilePath);
      const rl = readline.createInterface({ input: stream });

      let headers: string[] = [];
      let currentIndex = -1;
      let batch: ENSProfile[] = [];
      let errorCount = 0;

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

        // Pause reading while processing batch
        rl.pause();

        try {
          const values = this.parseCSVLine(line);
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          const profile = this.transformToProfile(row as CSVRow);

          // Check if domain already exists
          const exists = await this.client.query(api.importProgress.checkDomainExists, {
            domain_name: profile.domain_name,
          });

          if (!exists) {
            batch.push(profile);
          } else {
            console.log(`Skipping duplicate: ${profile.domain_name}`);
            this.processedRows++;
          }

          // Process batch when it's full
          if (batch.length >= this.batchSize) {
            await this.processBatch(batch, currentIndex, errorCount);
            batch = [];
          }

          // Update progress periodically
          if (this.processedRows % this.progressCheckInterval === 0) {
            await this.updateProgress(
              this.processedRows,
              profile.domain_name,
              currentIndex,
              "in_progress",
              errorCount
            );
            console.log(`Progress: ${this.processedRows}/${this.totalRows} (${Math.round(this.processedRows / this.totalRows * 100)}%)`);
          }

        } catch (error) {
          console.error(`Error processing row ${currentIndex}:`, error);
          errorCount++;
        }

        rl.resume();
      });

      rl.on("close", async () => {
        // Process remaining batch
        if (batch.length > 0) {
          await this.processBatch(batch, currentIndex, errorCount);
        }

        // Mark as completed
        await this.updateProgress(
          this.processedRows,
          undefined,
          currentIndex,
          "completed",
          errorCount
        );

        console.log("\n=== Import Complete ===");
        console.log(`Total processed: ${this.processedRows}/${this.totalRows}`);
        console.log(`Errors: ${errorCount}`);

        if (errorCount > 0) {
          const errors = await this.client.query(api.importProgress.getImportErrors, {
            csvFileName: this.csvFileName,
          });
          console.log("\nFailed imports:");
          errors.forEach(e => {
            console.log(`- ${e.domain_name} (row ${e.rowIndex}): ${e.error}`);
          });
        }

        resolve();
      });

      rl.on("error", (error) => {
        console.error("Error reading file:", error);
        reject(error);
      });
    });
  }

  private async processBatch(
    batch: ENSProfile[],
    lastIndex: number,
    errorCount: number
  ): Promise<void> {
    try {
      console.log(`Processing batch of ${batch.length} profiles...`);

      const result = await this.client.mutation(api.ensProfiles.bulkImportProfiles, {
        profiles: batch,
      });

      this.processedRows += result.imported;
      console.log(`Imported ${result.imported}/${batch.length} profiles`);

      // Update progress after successful batch
      await this.updateProgress(
        this.processedRows,
        batch[batch.length - 1]?.domain_name,
        lastIndex,
        "in_progress",
        errorCount
      );

    } catch (error: any) {
      console.error("Batch import error:", error);

      // Log errors for each profile in the failed batch
      for (const profile of batch) {
        await this.client.mutation(api.importProgress.logImportError, {
          csvFileName: this.csvFileName,
          domain_name: profile.domain_name,
          rowIndex: lastIndex,
          error: error.message || "Unknown error",
        });
      }

      // Try importing one by one as fallback
      console.log("Attempting individual imports for failed batch...");
      for (const profile of batch) {
        try {
          await this.client.mutation(api.ensProfiles.addProfile, profile);
          this.processedRows++;
        } catch (individualError) {
          console.error(`Failed to import ${profile.domain_name}:`, individualError);
        }
      }
    }
  }

  private async resetProgress(): Promise<void> {
    console.log("Resetting import progress...");
    await this.client.mutation(api.importProgress.resetImportProgress, {
      csvFileName: this.csvFileName,
    });
    this.processedRows = 0;
    this.lastProcessedIndex = -1;
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
  const csvPath = process.argv[2];
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  const forceReset = process.argv.includes("--reset");
  const batchSize = process.argv.includes("--batch")
    ? parseInt(process.argv[process.argv.indexOf("--batch") + 1])
    : 100;

  if (!csvPath) {
    console.error("Please provide a CSV file path");
    console.error("Usage: npm run import-csv-resume path/to/your/file.csv [--reset] [--batch 200]");
    process.exit(1);
  }

  if (!convexUrl) {
    console.error("Please set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable");
    process.exit(1);
  }

  console.log("=== Resumable CSV Import ===");
  console.log(`File: ${csvPath}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Force reset: ${forceReset}`);
  console.log("");

  const importer = new ResumableCSVImporter(csvPath, convexUrl, batchSize);

  try {
    await importer.import(forceReset);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);