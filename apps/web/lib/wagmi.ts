// import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import {  type Config } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";
import {
  ChainType,
  EVM,
  config as lifiInternalConfig,
  createConfig as createConfigLifi,
  getChains,
} from "@lifi/sdk";
import { getWalletClient, switchChain } from "wagmi/actions";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
const chains = await getChains({
  chainTypes: [ChainType.EVM],
});
export const config: Config = getDefaultConfig({
  appName: "PAYANY.LINK",
  projectId: "6b4e7efed7141d0d78856b9e23328f18",
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
});
// export const config = createConfig({
//   chains: [mainnet as any],
//   transports: {
//     [mainnet.id]: http(),
//   },
// });

export const lifiConfig = createConfigLifi({
  integrator: "payany-link",

  chains: chains,
  providers: [
    EVM({
      getWalletClient: () => getWalletClient(config),
      switchChain: async (chainId) => {
        try {
          const chain = await switchChain(config, { chainId });
          return getWalletClient(config, { chainId: chain.id });
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
