interface ENSRecord {
  id: string;
  domainName: string;
  labelName: string;
  resolvedAddress: string;
  balance: string;
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
  private endpoint = "https://gateway.thegraph.com/api/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH";
  private targetKeys = ["description", "com.github", "com.twitter", "com.reddit"];
  private ethRpcUrl = "https://eth-mainnet.g.alchemy.com/v2/demo"; // Using public demo endpoint

  async makeGraphQLRequest(query: string, variables: any = {}): Promise<GraphQLResponse> {
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

  async getEthBalance(address: string): Promise<string> {
    try {
      const response = await fetch(this.ethRpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [address, "latest"],
          id: 1,
        }),
      });

      const data = await response.json();
      if (data.result) {
        // Convert from wei to ETH
        const balanceWei = BigInt(data.result);
        const balanceEth = Number(balanceWei) / Math.pow(10, 18);
        return balanceEth.toFixed(6);
      }
      return "0";
    } catch (error) {
      console.warn(`Failed to get balance for ${address}:`, error);
      return "0";
    }
  }

  async fetchTextRecordsByKey(key: string, limit: number = 1000): Promise<any[]> {
    const query = `
      query GetTextRecordsByKey($key: String!, $limit: Int!, $skip: Int!) {
        textChangeds(
          first: $limit
          skip: $skip
          orderBy: blockNumber
          orderDirection: desc
          where: {
            key: $key
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

    console.log(`🔑 Fetching records for key: ${key}`);

    while (hasMore && allRecords.length < 25000) {
      try {
        const response = await this.makeGraphQLRequest(query, {
          key,
          limit: Math.min(1000, 25000 - allRecords.length),
          skip,
        });

        if (response.errors) {
          console.error(`GraphQL errors for key ${key}:`, response.errors);
          break;
        }

        const textChangeds = response.data?.textChangeds || [];
        if (textChangeds.length === 0) {
          hasMore = false;
          break;
        }

        allRecords.push(...textChangeds);
        skip += textChangeds.length;

        console.log(`  📝 ${key}: ${allRecords.length} records collected`);

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching ${key} batch at skip ${skip}:`, error);
        break;
      }
    }

    return allRecords;
  }

  async fetchPopularDomainsWithTextRecords(): Promise<any[]> {
    const query = `
      query GetPopularDomainsWithTextRecords($skip: Int!) {
        textChangeds(
          first: 1000
          skip: $skip
          orderBy: blockNumber
          orderDirection: desc
          where: {
            OR: [
              { key: "description" },
              { key: "com.github" },
              { key: "com.twitter" },
              { key: "com.reddit" }
            ]
            value_not: null
            value_not: ""
            resolver_: {
              domain_: {
                subdomainCount_gte: 1
              }
            }
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
              subdomainCount
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

    console.log(`🏆 Fetching popular domains with target text records...`);

    while (hasMore && allRecords.length < 50000) {
      try {
        const response = await this.makeGraphQLRequest(query, { skip });

        if (response.errors) {
          console.error("GraphQL errors:", response.errors);
          break;
        }

        const textChangeds = response.data?.textChangeds || [];
        if (textChangeds.length === 0) {
          hasMore = false;
          break;
        }

        allRecords.push(...textChangeds);
        skip += textChangeds.length;

        console.log(`  🏆 Popular domains: ${allRecords.length} records collected`);

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching popular domains at skip ${skip}:`, error);
        break;
      }
    }

    return allRecords;
  }

  groupRecordsByDomain(records: any[]): Map<string, any[]> {
    const domainGroups = new Map<string, any[]>();

    for (const record of records) {
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
          const mappedKey = key === "com.github" ? "github" :
                           key === "com.twitter" ? "twitter" :
                           key === "com.reddit" ? "reddit" : key;

          if (this.targetKeys.includes(key)) {
            // Keep the most recent value for each key
            if (!textRecords[mappedKey] || record.blockNumber > latestBlockNumber) {
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

        // Get ETH balance
        const balance = await this.getEthBalance(domain.resolvedAddress.id);

        const ensRecord: ENSRecord = {
          id: domainId,
          domainName: domain.name || "",
          labelName: domain.labelName || "",
          resolvedAddress: domain.resolvedAddress.id,
          balance: balance,
          textRecords: textRecords,
          blockNumber: latestBlockNumber,
          transactionID: latestTransactionID,
        };

        enrichedRecords.push(ensRecord);
        processedCount++;

        if (processedCount % 100 === 0) {
          console.log(`  ⚡ Processed ${processedCount} domains, enriched ${enrichedRecords.length} records`);
          // Small delay to avoid overwhelming the ETH RPC
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

  async fetchAllTargetRecords(): Promise<ENSRecord[]> {
    console.log("🚀 Starting focused ENS data collection...");
    console.log(`🎯 Target keys: ${this.targetKeys.join(", ")}`);
    console.log("💰 Including ETH balance for each domain\n");

    let allRawRecords: any[] = [];

    // Strategy 1: Fetch popular domains with any of our target keys
    console.log("📋 Strategy 1: Popular domains with target text records");
    const popularRecords = await this.fetchPopularDomainsWithTextRecords();
    allRawRecords.push(...popularRecords);

    // Strategy 2: Fetch by each specific key
    console.log("\n📋 Strategy 2: Fetch by individual keys");
    for (const key of this.targetKeys) {
      const keyRecords = await this.fetchTextRecordsByKey(key, 1000);
      allRawRecords.push(...keyRecords);

      // Break early if we have too many records
      if (allRawRecords.length > 200000) {
        console.log("⚠️ Large dataset detected, moving to processing phase");
        break;
      }
    }

    console.log(`\n📊 Total raw records collected: ${allRawRecords.length.toLocaleString()}`);

    // Remove duplicates based on record ID
    const uniqueRecords = allRawRecords.filter((record, index, self) =>
      index === self.findIndex((r) => r.id === record.id)
    );

    console.log(`📊 Unique records after deduplication: ${uniqueRecords.length.toLocaleString()}\n`);

    // Process and enrich records
    const enrichedRecords = await this.processAndEnrichRecords(uniqueRecords);

    return enrichedRecords;
  }

  async saveToFile(records: ENSRecord[], filename: string = "focused_ens_records.json"): Promise<void> {
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

    // Key distribution
    const keyStats = { description: 0, github: 0, twitter: 0, reddit: 0 };
    let totalBalance = 0;
    let recordsWithBalance = 0;

    records.forEach((record) => {
      Object.keys(record.textRecords).forEach((key) => {
        if (key in keyStats) {
          keyStats[key as keyof typeof keyStats]++;
        }
      });

      const balance = parseFloat(record.balance);
      if (balance > 0) {
        totalBalance += balance;
        recordsWithBalance++;
      }
    });

    console.log(`\n🔑 Text Record Distribution:`);
    console.log(`  Description: ${keyStats.description.toLocaleString()}`);
    console.log(`  GitHub:      ${keyStats.github.toLocaleString()}`);
    console.log(`  Twitter:     ${keyStats.twitter.toLocaleString()}`);
    console.log(`  Reddit:      ${keyStats.reddit.toLocaleString()}`);

    console.log(`\n💰 Balance Statistics:`);
    console.log(`  Records with balance > 0: ${recordsWithBalance.toLocaleString()}`);
    console.log(`  Total ETH across all domains: ${totalBalance.toFixed(2)} ETH`);
    console.log(`  Average ETH per domain: ${(totalBalance / records.length).toFixed(6)} ETH`);

    // Top domains by balance
    const topByBalance = records
      .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
      .slice(0, 10);

    console.log(`\n🏆 Top 10 Domains by Balance:`);
    topByBalance.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.domainName} - ${record.balance} ETH`);
    });

    // Sample records
    console.log(`\n🌟 Sample Records:`);
    records.slice(0, 5).forEach((record) => {
      console.log(`  ${record.domainName}:`);
      console.log(`    Balance: ${record.balance} ETH`);
      Object.entries(record.textRecords).forEach(([key, value]) => {
        console.log(`    ${key}: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""}`);
      });
      console.log("");
    });

    console.log("=".repeat(60));
  }
}

async function main() {
  console.log("🎯 Focused ENS Text Records Fetcher");
  console.log("Target: 100,000+ ENS domains with social media text records");
  console.log("Keys: description, github, twitter, reddit");
  console.log("Including: ETH balance for each domain\n");

  const fetcher = new FocusedENSFetcher();

  try {
    const records = await fetcher.fetchAllTargetRecords();

    console.log(`\n🎉 Collection completed!`);
    console.log(`📊 Final count: ${records.length.toLocaleString()} enriched ENS records`);

    // Generate statistics
    fetcher.generateStatistics(records);

    // Save to files
    await fetcher.saveToFile(records, "focused_ens_records.json");

    // Create CSV for analysis
    const csvContent = [
      "domain_name,label_name,resolved_address,eth_balance,description,github,twitter,reddit,block_number",
      ...records.map((record) => {
        const cleanValue = (val: string | undefined) =>
          (val || "").replace(/"/g, '""').replace(/\n/g, " ");

        return `"${cleanValue(record.domainName)}","${cleanValue(record.labelName)}","${record.resolvedAddress}","${record.balance}","${cleanValue(record.textRecords.description)}","${cleanValue(record.textRecords.github)}","${cleanValue(record.textRecords.twitter)}","${cleanValue(record.textRecords.reddit)}","${record.blockNumber}"`;
      }),
    ].join("\n");

    await Bun.write("focused_ens_records.csv", csvContent);
    console.log(`📋 Saved CSV to focused_ens_records.csv`);

    if (records.length >= 100000) {
      console.log("\n✅ SUCCESS: Collected 100,000+ focused ENS records!");
    } else {
      console.log(`\n⚠️  Collected ${records.length} records (target was 100,000)`);
      console.log("Consider running the script again or adjusting the filtering criteria.");
    }

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
