interface TextRecord {
  id: string;
  key: string;
  value: string;
  blockNumber: number;
  transactionID: string;
  domain: {
    id: string;
    name: string;
    labelName: string;
    subdomainCount?: number;
  };
}

interface GraphQLResponse {
  data: {
    textChangeds?: TextRecord[];
    domains?: any[];
  };
  errors?: any[];
}

class ENSDataFetcher {
  private apiKey = "5ba500896634c26a14a3d25335499417";
  private endpoint =
    "https://gateway.thegraph.com/api/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH";
  private allTextRecords: TextRecord[] = [];
  private processedDomains = new Set<string>();

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

  // Strategy 1: Get text records from domains with high subdomain counts
  async fetchPopularDomainsTextRecords(
    minSubdomains: number = 5,
    limit: number = 1000,
  ): Promise<TextRecord[]> {
    const query = `
      query GetPopularDomainsTextRecords($minSubdomains: Int!, $limit: Int!, $skip: Int!) {
        textChangeds(
          first: $limit
          skip: $skip
          orderBy: blockNumber
          orderDirection: desc
          where: {
            resolver_: {
              domain_: {
                subdomainCount_gte: $minSubdomains
              }
            }
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
              subdomainCount
            }
          }
        }
      }
    `;

    const results: TextRecord[] = [];
    let skip = 0;
    let hasMore = true;

    console.log(
      `📈 Fetching text records from domains with ${minSubdomains}+ subdomains...`,
    );

    while (hasMore && results.length < 30000) {
      try {
        const response = await this.makeGraphQLRequest(query, {
          minSubdomains,
          limit: Math.min(1000, 30000 - results.length),
          skip,
        });

        if (response.errors) {
          console.error("GraphQL errors:", response.errors);
          break;
        }

        const textChangeds = response.data?.textChangeds || [];
        if (textChangeds.length === 0) {
          hasMore = false;
          break;
        }

        // Transform the data to match our interface
        const transformed = textChangeds.map((record: any) => ({
          id: record.id,
          key: record.key,
          value: record.value,
          blockNumber: record.blockNumber,
          transactionID: record.transactionID,
          domain: {
            id: record.resolver.domain.id,
            name: record.resolver.domain.name,
            labelName: record.resolver.domain.labelName,
            subdomainCount: record.resolver.domain.subdomainCount,
          },
        }));

        results.push(...transformed);
        skip += textChangeds.length;

        console.log(`  📊 Collected ${results.length} records so far...`);

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching batch at skip ${skip}:`, error);
        break;
      }
    }

    return results;
  }

  // Strategy 2: Get text records from recently active domains
  async fetchRecentlyActiveDomainsTextRecords(
    limit: number = 1000,
  ): Promise<TextRecord[]> {
    const query = `
      query GetRecentActiveTextRecords($limit: Int!, $skip: Int!) {
        textChangeds(
          first: $limit
          skip: $skip
          orderBy: blockNumber
          orderDirection: desc
          where: {
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
            }
          }
        }
      }
    `;

    const results: TextRecord[] = [];
    let skip = 0;
    let hasMore = true;

    console.log(`🔥 Fetching text records from recently active domains...`);

    while (hasMore && results.length < 40000) {
      try {
        const response = await this.makeGraphQLRequest(query, {
          limit: Math.min(1000, 40000 - results.length),
          skip,
        });

        if (response.errors) {
          console.error("GraphQL errors:", response.errors);
          break;
        }

        const textChangeds = response.data?.textChangeds || [];
        if (textChangeds.length === 0) {
          hasMore = false;
          break;
        }

        const transformed = textChangeds.map((record: any) => ({
          id: record.id,
          key: record.key,
          value: record.value,
          blockNumber: record.blockNumber,
          transactionID: record.transactionID,
          domain: {
            id: record.resolver.domain.id,
            name: record.resolver.domain.name,
            labelName: record.resolver.domain.labelName,
          },
        }));

        results.push(...transformed);
        skip += textChangeds.length;

        console.log(`  🔥 Collected ${results.length} records so far...`);

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching batch at skip ${skip}:`, error);
        break;
      }
    }

    return results;
  }

  // Strategy 3: Get text records from expensive registrations (premium domains)
  async fetchPremiumDomainsTextRecords(): Promise<TextRecord[]> {
    const query = `
      query GetPremiumDomainsTextRecords($skip: Int!) {
        textChangeds(
          first: 1000
          skip: $skip
          orderBy: blockNumber
          orderDirection: desc
          where: {
            resolver_: {
              domain_: {
                registration_: {
                  cost_gt: "1000000000000000000"
                }
              }
            }
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
              registration {
                cost
              }
            }
          }
        }
      }
    `;

    const results: TextRecord[] = [];
    let skip = 0;
    let hasMore = true;

    console.log(`💎 Fetching text records from premium domains...`);

    while (hasMore && results.length < 20000) {
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

        const transformed = textChangeds.map((record: any) => ({
          id: record.id,
          key: record.key,
          value: record.value,
          blockNumber: record.blockNumber,
          transactionID: record.transactionID,
          domain: {
            id: record.resolver.domain.id,
            name: record.resolver.domain.name,
            labelName: record.resolver.domain.labelName,
          },
        }));

        results.push(...transformed);
        skip += textChangeds.length;

        console.log(
          `  💎 Collected ${results.length} premium domain records so far...`,
        );

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching premium batch at skip ${skip}:`, error);
        break;
      }
    }

    return results;
  }

  // Strategy 4: Get text records by specific popular keys
  async fetchByPopularTextKeys(): Promise<TextRecord[]> {
    const popularKeys = [
      "email",
      "url",
      "avatar",
      "description",
      "display",
      "keywords",
      "com.github",
      "com.twitter",
      "com.discord",
      "org.telegram",
      "com.linkedin",
      "com.reddit",
      "location",
      "notice",
    ];

    const results: TextRecord[] = [];

    for (const key of popularKeys) {
      console.log(`🔑 Fetching records for key: ${key}`);

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
              }
            }
          }
        }
      `;

      let skip = 0;
      let hasMore = true;
      let keyResults = 0;

      while (hasMore && keyResults < 3000 && results.length < 100000) {
        try {
          const response = await this.makeGraphQLRequest(query, {
            key,
            limit: Math.min(1000, 3000 - keyResults),
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

          const transformed = textChangeds.map((record: any) => ({
            id: record.id,
            key: record.key,
            value: record.value,
            blockNumber: record.blockNumber,
            transactionID: record.transactionID,
            domain: {
              id: record.resolver.domain.id,
              name: record.resolver.domain.name,
              labelName: record.resolver.domain.labelName,
            },
          }));

          results.push(...transformed);
          keyResults += textChangeds.length;
          skip += textChangeds.length;

          console.log(
            `    📝 ${key}: ${keyResults} records, Total: ${results.length}`,
          );

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`Error fetching ${key} batch at skip ${skip}:`, error);
          break;
        }
      }
    }

    return results;
  }

  removeDuplicates(records: TextRecord[]): TextRecord[] {
    const seen = new Set<string>();
    return records.filter((record) => {
      const key = `${record.domain.id}-${record.key}-${record.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async fetchAllStrategies(): Promise<TextRecord[]> {
    console.log("🚀 Starting comprehensive ENS text records collection...\n");

    const strategies = [
      () => this.fetchPopularDomainsTextRecords(10, 1000), // High subdomain count
      () => this.fetchPopularDomainsTextRecords(5, 1000), // Medium subdomain count
      () => this.fetchRecentlyActiveDomainsTextRecords(1000),
      () => this.fetchPremiumDomainsTextRecords(),
      () => this.fetchByPopularTextKeys(),
    ];

    let allRecords: TextRecord[] = [];

    for (let i = 0; i < strategies.length; i++) {
      console.log(`\n📋 Strategy ${i + 1}/${strategies.length}:`);
      try {
        const strategyRecords = await strategies[i]();
        allRecords.push(...strategyRecords);
        console.log(
          `  ✅ Strategy ${i + 1} collected ${strategyRecords.length} records`,
        );
        console.log(
          `  📊 Total unique records so far: ${this.removeDuplicates(allRecords).length}\n`,
        );

        // Stop if we have enough records
        if (allRecords.length >= 120000) {
          console.log("🎯 Reached target record count, stopping early");
          break;
        }

        // Delay between strategies
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Strategy ${i + 1} failed:`, error);
      }
    }

    return this.removeDuplicates(allRecords);
  }

  async saveToFile(
    records: TextRecord[],
    filename: string = "ens_text_records.json",
  ): Promise<void> {
    try {
      await Bun.write(filename, JSON.stringify(records, null, 2));
      console.log(`💾 Saved ${records.length} records to ${filename}`);
    } catch (error) {
      console.error("Error saving file:", error);
    }
  }

  generateStatistics(records: TextRecord[]): void {
    console.log("\n📈 COLLECTION STATISTICS:");
    console.log("=".repeat(50));

    console.log(`📊 Total Records: ${records.length.toLocaleString()}`);

    // Unique domains
    const uniqueDomains = new Set(records.map((r) => r.domain.id)).size;
    console.log(`🏠 Unique Domains: ${uniqueDomains.toLocaleString()}`);

    // Key distribution
    const keyCount: { [key: string]: number } = {};
    records.forEach((record) => {
      keyCount[record.key] = (keyCount[record.key] || 0) + 1;
    });

    console.log(`\n🔑 Top Text Record Keys:`);
    Object.entries(keyCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .forEach(([key, count]) => {
        console.log(`  ${key.padEnd(20)} ${count.toLocaleString()}`);
      });

    // Domain name examples
    console.log(`\n🌟 Sample Domain Names:`);
    const sampleDomains = records
      .filter((r) => r.domain.name && r.domain.name.includes(".eth"))
      .slice(0, 10);

    sampleDomains.forEach((record) => {
      console.log(
        `  ${record.domain.name} -> ${record.key}: ${record.value.substring(0, 50)}${record.value.length > 50 ? "..." : ""}`,
      );
    });

    console.log("=".repeat(50));
  }
}

async function main() {
  console.log("🎯 ENS Text Records Fetcher");
  console.log("Target: 100,000+ text records from popular ENS domains\n");

  const fetcher = new ENSDataFetcher();

  try {
    const records = await fetcher.fetchAllStrategies();

    console.log(`\n🎉 Collection completed!`);
    console.log(
      `📊 Final count: ${records.length.toLocaleString()} unique text records`,
    );

    // Generate statistics
    fetcher.generateStatistics(records);

    // Save to files
    await fetcher.saveToFile(records, "ens_text_records_full.json");

    // Save a smaller sample for quick testing
    const sample = records.slice(0, 1000);
    await fetcher.saveToFile(sample, "ens_text_records_sample.json");

    // Create CSV version for easy analysis
    const csvContent = [
      "domain_id,domain_name,label_name,text_key,text_value,block_number,transaction_id",
      ...records
        .slice(0, 10000)
        .map(
          (record) =>
            `"${record.domain.id}","${record.domain.name || ""}","${record.domain.labelName || ""}","${record.key}","${record.value.replace(/"/g, '""')}","${record.blockNumber}","${record.transactionID}"`,
        ),
    ].join("\n");

    await Bun.write("ens_text_records.csv", csvContent);
    console.log(`📋 Saved CSV sample (10k records) to ens_text_records.csv`);

    if (records.length >= 100000) {
      console.log("\n✅ SUCCESS: Collected 100,000+ ENS text records!");
    } else {
      console.log(
        `\n⚠️  Collected ${records.length} records (target was 100,000)`,
      );
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
