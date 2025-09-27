import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

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

function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0]?.split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: any = {};
    headers?.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row as CSVRow;
  });
}

function transformToProfile(row: CSVRow): ENSProfile {
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

async function importCSV(csvFilePath: string, convexUrl: string) {
  const client = new ConvexHttpClient(convexUrl);

  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, "utf-8");
  const rows = parseCSV(csvContent);

  console.log(`Found ${rows.length} rows in CSV`);

  const profiles = rows.map(transformToProfile);

  const batchSize = 100;
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    console.log(
      `Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profiles.length / batchSize)}...`,
    );

    try {
      await client.mutation(api.ensProfiles.bulkImportProfiles, {
        profiles: batch,
      });
      console.log(`Successfully imported ${batch.length} profiles`);
    } catch (error) {
      console.error(`Error importing batch:`, error);
    }
  }

  console.log("CSV import completed!");
}

// Usage: npm run import-csv path/to/your/file.csv
const csvPath = process.argv[2];
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

if (!csvPath) {
  console.error("Please provide a CSV file path");
  console.error("Usage: npm run import-csv path/to/your/file.csv");
  process.exit(1);
}

if (!convexUrl) {
  console.error(
    "Please set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable",
  );
  process.exit(1);
}

importCSV(csvPath, convexUrl).catch(console.error);
