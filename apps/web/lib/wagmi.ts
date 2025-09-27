import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, type Config } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

export const config: Config = getDefaultConfig({
  appName: "PAYANY.LINK",
  projectId: "6b4e7efed7141d0d78856b9e23328f18",
  chains: initialChains,
  ssr: true,
});

// LI.FI SDK config with Wagmi integration
export const lifiConfig = createConfig({
  integrator: "PAYANY.LINK",
  providers: [
    EVM({
      getWalletClient: () => getWalletClient(wagmiConfig),
      switchChain: async (chainId) => {
        try {
          const chain = await switchChain(wagmiConfig, { chainId });
          return getWalletClient(wagmiConfig, { chainId: chain.id });
        } catch (error) {
          console.error("Failed to switch chain:", error);
          throw error;
        }
      },
    }),
  ],
  preloadChains: false,
});

// Function to get LI.FI chains
export const getLifiChains = async () => {
  try {
    const chains = await getChains({
      chainTypes: [ChainType.EVM],
    });

    // Update LI.FI SDK chain configuration
    if (chains && chains.length > 0) {
      console.log(`✅ LI.FI: Loaded ${chains.length} chains`);
    }

    return chains || [];
  } catch (error) {
    console.error("Failed to load LI.FI chains:", error);
    return [];
  }
};

// Helper function to convert LI.FI chain to Wagmi chain format
export const convertLifiChainToWagmi = (lifiChain: any): Chain => {
  return {
    id: lifiChain.id,
    name: lifiChain.name,
    nativeCurrency: {
      name: lifiChain.nativeToken?.name || "Unknown",
      symbol: lifiChain.nativeToken?.symbol || "UNKNOWN",
      decimals: lifiChain.nativeToken?.decimals || 18,
    },
    rpcUrls: {
      default: {
        http:
          lifiChain.rpcs
            ?.filter((rpc: any) => rpc.url?.startsWith("http"))
            ?.map((rpc: any) => rpc.url) || [],
      },
    },
    blockExplorers: lifiChain.metamask?.blockExplorerUrls?.[0]
      ? {
          default: {
            name: lifiChain.name + " Explorer",
            url: lifiChain.metamask.blockExplorerUrls[0],
          },
        }
      : undefined,
  } as Chain;
};

// Export the original config for backward compatibility
export const config: Config = wagmiConfig;
