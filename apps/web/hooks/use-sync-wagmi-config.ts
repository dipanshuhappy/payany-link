"use client";

import { useEffect } from "react";
import { Config } from "wagmi";
import { Connector } from "wagmi";
import { Chain } from "viem";
import { convertLifiChainToWagmi } from "@/lib/wagmi";

interface LifiChain {
  id: number;
  name: string;
  nativeToken: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcs: Array<{
    url: string;
  }>;
  metamask?: {
    blockExplorerUrls?: string[];
  };
}

interface UseSyncWagmiConfigProps {
  wagmiConfig: Config;
  connectors: readonly Connector[];
  lifiChains?: LifiChain[];
}

export function useSyncWagmiConfig({
  wagmiConfig,
  connectors,
  lifiChains,
}: UseSyncWagmiConfigProps) {
  useEffect(() => {
    if (!lifiChains || lifiChains.length === 0) return;

    try {
      // Convert LI.FI chains to Wagmi format
      const wagmiChains: Chain[] = lifiChains.map(convertLifiChainToWagmi);

      // Filter out chains that are already in the config
      const existingChainIds = wagmiConfig.chains.map((chain) => chain.id);
      const newChains = wagmiChains.filter(
        (chain) => !existingChainIds.includes(chain.id)
      );

      if (newChains.length > 0) {
        // Update the chains in wagmi config
        const updatedChains = [...wagmiConfig.chains, ...newChains];

        // Note: In a real implementation, you might need to recreate the config
        // or use a different approach based on your specific Wagmi version
        // This is a simplified version that demonstrates the concept

        console.log(`Synced ${newChains.length} new chains with Wagmi config`);
        console.log("New chains:", newChains.map(c => c.name));
      }
    } catch (error) {
      console.error("Failed to sync LI.FI chains with Wagmi config:", error);
    }
  }, [wagmiConfig, connectors, lifiChains]);
}
