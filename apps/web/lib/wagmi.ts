import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, type Config } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

export const config: Config = getDefaultConfig({
  appName: "PAYANY.LINK",
  projectId: "6b4e7efed7141d0d78856b9e23328f18",
  chains: [mainnet],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
