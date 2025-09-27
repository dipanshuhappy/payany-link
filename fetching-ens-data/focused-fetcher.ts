interface ENSRecord {
  id: string;
  domainName: string;
  labelName: string;
  resolvedAddress: string;
  registrationDate: string;
  expiryDate: string;
  textRecords: {
    description?: string;
    github?: string;
    twitter?: string;
    reddit?: string;
  };
  blockNumber: number;
  transactionID: string;
}

interface GraphQLResponse {
  data: {
    textChangeds?: any[];
    domains?: any[];
  };
  errors?: any[];
}

class FocusedENSFetcher {
  private apiKey = "5ba500896634c26a14a3d25335499417";
  private endpoint =
    "https://gateway.thegraph.com/api/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH";
  private targetKeys = ["description"];

  async makeGraphQLRequest(
    query: string,
    variables: any = {},
  ): Promise<GraphQLResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query,
        variables,
        operationName: "ENSQuery",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async fetchDescriptionsFromOldest(limit: number = 40000): Promise<any[]> {
    const query = `
      query GetDescriptionsFromOldest($limit: Int!, $skip: Int!) {
        textChangeds(
          first: $limit
          skip: $skip
          orderBy: blockNumber
          orderDirection: asc
          where: {
            key: "description"
            value_not: null
            value_not: ""
          }
        ) {
          id
          key
          value
          blockNumber
          transactionID
          resolver {
            domain {
              id
              name
              labelName
              createdAt
              registration {
                registrationDate
                expiryDate
              }
              resolvedAddress {
                id
              }
            }
          }
        }
      }
    `;

    const allRecords: any[] = [];
    let skip = 0;
    let hasMore = true;

    console.log(`📝 Fetching ${limit} descriptions starting from oldest...`);

    while (hasMore && allRecords.length < limit) {
      try {
        const response = await this.makeGraphQLRequest(query, {
          limit: Math.min(1000, limit - allRecords.length),
          skip,
        });

        if (response.errors) {
          console.error(`GraphQL errors:`, response.errors);
          break;
        }

        const textChangeds = response.data?.textChangeds || [];
        if (textChangeds.length === 0) {
          hasMore = false;
          break;
        }

        allRecords.push(...textChangeds);
        skip += textChangeds.length;

        console.log(
          `  📝 Descriptions: ${allRecords.length} records collected`,
        );

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching descriptions at skip ${skip}:`, error);
        break;
      }
    }

    return allRecords;
  }

  groupRecordsByDomain(records: any[]): Map<string, any[]> {
    const domainGroups = new Map<string, any[]>();

    for (const record of records) {
      // Skip records with null or missing resolver/domain data
      if (
        !record.resolver ||
        !record.resolver.domain ||
        !record.resolver.domain.id
      ) {
        continue;
      }

      const domainId = record.resolver.domain.id;
      if (!domainGroups.has(domainId)) {
        domainGroups.set(domainId, []);
      }
      domainGroups.get(domainId)!.push(record);
    }

    return domainGroups;
  }

  async processAndEnrichRecords(records: any[]): Promise<ENSRecord[]> {
    const domainGroups = this.groupRecordsByDomain(records);
    const enrichedRecords: ENSRecord[] = [];
    let processedCount = 0;

    console.log(`🔄 Processing ${domainGroups.size} unique domains...`);

    for (const [domainId, domainRecords] of domainGroups) {
      try {
        const firstRecord = domainRecords[0];

        // Additional safety check for resolver and domain
        if (!firstRecord.resolver || !firstRecord.resolver.domain) {
          continue;
        }

        const domain = firstRecord.resolver.domain;

        // Skip domains without resolved addresses
        if (!domain.resolvedAddress?.id) {
          continue;
        }

        // Group text records by key for this domain
        const textRecords: any = {};
        let latestBlockNumber = 0;
        let latestTransactionID = "";

        for (const record of domainRecords) {
          const key = record.key;
          const mappedKey =
            key === "com.github"
              ? "github"
              : key === "com.twitter"
                ? "twitter"
                : key === "com.reddit"
                  ? "reddit"
                  : key;

          if (this.targetKeys.includes(key)) {
            // Keep the most recent value for each key
            if (
              !textRecords[mappedKey] ||
              record.blockNumber > latestBlockNumber
            ) {
              textRecords[mappedKey] = record.value;
            }
          }

          if (record.blockNumber > latestBlockNumber) {
            latestBlockNumber = record.blockNumber;
            latestTransactionID = record.transactionID;
          }
        }

        // Only include domains that have at least one of our target text records
        if (Object.keys(textRecords).length === 0) {
          continue;
        }

        // Get registration dates
        const registrationDate =
          domain.registration?.registrationDate || domain.createdAt || "0";
        const expiryDate = domain.registration?.expiryDate || "0";

        const ensRecord: ENSRecord = {
          id: domainId,
          domainName: domain.name || "",
          labelName: domain.labelName || "",
          resolvedAddress: domain.resolvedAddress.id,
          registrationDate: new Date(
            parseInt(registrationDate) * 1000,
          ).toISOString(),
          expiryDate: new Date(parseInt(expiryDate) * 1000).toISOString(),
          textRecords: textRecords,
          blockNumber: latestBlockNumber,
          transactionID: latestTransactionID,
        };

        enrichedRecords.push(ensRecord);
        processedCount++;

        if (processedCount % 100 === 0) {
          console.log(
            `  ⚡ Processed ${processedCount} domains, enriched ${enrichedRecords.length} records`,
          );
          // Small delay for rate limiting
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Stop if we have enough records
        if (enrichedRecords.length >= 100000) {
          console.log("🎯 Reached target of 100,000 records!");
          break;
        }
      } catch (error) {
        console.error(`Error processing domain ${domainId}:`, error);
      }
    }

    return enrichedRecords;
  }

  async writeCsvIncremental(
    records: ENSRecord[],
    filename: string,
  ): Promise<void> {
    const cleanValue = (val: string | undefined) =>
      (val || "").replace(/"/g, '""').replace(/\n/g, " ");

    const csvContent = [
      "domain_name,label_name,resolved_address,registration_date,expiry_date,description,github,twitter,reddit,block_number",
      ...records.map((record) => {
        return `"${cleanValue(record.domainName)}","${cleanValue(record.labelName)}","${record.resolvedAddress}","${record.registrationDate}","${record.expiryDate}","${cleanValue(record.textRecords.description)}","${cleanValue(record.textRecords.github)}","${cleanValue(record.textRecords.twitter)}","${cleanValue(record.textRecords.reddit)}","${record.blockNumber}"`;
      }),
    ].join("\n");

    await Bun.write(filename, csvContent);
    console.log(`📋 Updated CSV with ${records.length} records to ${filename}`);
  }

  async fetchAllTargetRecords(): Promise<ENSRecord[]> {
    console.log("🚀 Starting ENS descriptions collection...");
    console.log("🎯 Target: 40,000 domains with descriptions");
    console.log("📈 Starting from oldest descriptions first\n");

    // Fetch 40k descriptions starting from oldest
    console.log("📋 Fetching 40,000 descriptions from oldest first...");
    const allRawRecords = await this.fetchDescriptionsFromOldest(40000);

    console.log(
      `\n📊 Total raw records collected: ${allRawRecords.length.toLocaleString()}`,
    );

    // Remove duplicates based on record ID
    const uniqueRecords = allRawRecords.filter(
      (record, index, self) =>
        index === self.findIndex((r) => r.id === record.id),
    );

    console.log(
      `📊 Unique records after deduplication: ${uniqueRecords.length.toLocaleString()}\n`,
    );

    // Process and enrich records
    const enrichedRecords = await this.processAndEnrichRecords(uniqueRecords);

    return enrichedRecords;
  }

  async saveToFile(
    records: ENSRecord[],
    filename: string = "focused_ens_records.json",
  ): Promise<void> {
    try {
      await Bun.write(filename, JSON.stringify(records, null, 2));
      console.log(`💾 Saved ${records.length} records to ${filename}`);
    } catch (error) {
      console.error("Error saving file:", error);
    }
  }

  generateStatistics(records: ENSRecord[]): void {
    console.log("\n📈 COLLECTION STATISTICS:");
    console.log("=".repeat(60));

    console.log(`📊 Total ENS Records: ${records.length.toLocaleString()}`);

    // Key distribution and age analysis
    const keyStats = { description: 0 };
    const registrationYears: { [key: string]: number } = {};
    let oldestDate = new Date();
    let newestDate = new Date(0);

    records.forEach((record) => {
      Object.keys(record.textRecords).forEach((key) => {
        if (key in keyStats) {
          keyStats[key as keyof typeof keyStats]++;
        }
      });

      const regDate = new Date(record.registrationDate);
      if (regDate < oldestDate) oldestDate = regDate;
      if (regDate > newestDate) newestDate = regDate;

      const year = regDate.getFullYear().toString();
      registrationYears[year] = (registrationYears[year] || 0) + 1;
    });

    console.log(`\n🔑 Text Record Distribution:`);
    console.log(`  Description: ${keyStats.description.toLocaleString()}`);

    console.log(`\n📅 Registration Date Statistics:`);
    console.log(`  Oldest domain: ${oldestDate.toISOString().split("T")[0]}`);
    console.log(`  Newest domain: ${newestDate.toISOString().split("T")[0]}`);

    console.log(`\n📊 Registration by Year:`);
    Object.entries(registrationYears)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, 10)
      .forEach(([year, count]) => {
        console.log(`  ${year}: ${count.toLocaleString()} domains`);
      });

    // Top domains by age (oldest first)
    const topByAge = records
      .sort(
        (a, b) =>
          new Date(a.registrationDate).getTime() -
          new Date(b.registrationDate).getTime(),
      )
      .slice(0, 10);

    console.log(`\n🏛️ Top 10 Oldest Domains:`);
    topByAge.forEach((record, index) => {
      console.log(
        `  ${index + 1}. ${record.domainName} - ${record.registrationDate.split("T")[0]}`,
      );
    });

    // Sample records
    console.log(`\n🌟 Sample Records:`);
    records.slice(0, 5).forEach((record) => {
      console.log(`  ${record.domainName}:`);
      console.log(`    Registered: ${record.registrationDate.split("T")[0]}`);
      Object.entries(record.textRecords).forEach(([key, value]) => {
        console.log(
          `    ${key}: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""}`,
        );
      });
      console.log("");
    });

    console.log("=".repeat(60));
  }
}

async function main() {
  console.log("🎯 ENS Descriptions Fetcher");
  console.log("Target: 40,000 ENS domains with descriptions");
  console.log("Strategy: Starting from oldest descriptions first");
  console.log("📋 Single CSV output with all results\n");

  const fetcher = new FocusedENSFetcher();

  try {
    const records = await fetcher.fetchAllTargetRecords();

    console.log(`\n🎉 Collection completed!`);
    console.log(
      `📊 Final count: ${records.length.toLocaleString()} enriched ENS records`,
    );

    // Generate statistics
    fetcher.generateStatistics(records);

    // Save to files
    await fetcher.saveToFile(records, "focused_ens_records.json");

    // Create final comprehensive CSV for analysis
    await fetcher.writeCsvIncremental(records, "focused_ens_records_final.csv");
    console.log(
      `📋 Saved final comprehensive CSV to focused_ens_records_final.csv`,
    );

    if (records.length >= 40000) {
      console.log("\n✅ SUCCESS: Collected 40,000+ ENS description records!");
    } else {
      console.log(
        `\n⚠️  Collected ${records.length} records (target was 40,000)`,
      );
      console.log("Consider running the script again to get more records.");
    }

    console.log("\n📂 Output files:");
    console.log("  📋 CSV: focused_ens_records_final.csv");
    console.log("  📄 JSON: focused_ens_records.json");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
