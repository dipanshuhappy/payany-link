import { useSyncWagmiConfig } from "@lifi/wallet-management";
import { getChains, ChainType } from "@lifi/sdk";
import { useQuery } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { FC, PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";

export const CustomWagmiProvider: FC<PropsWithChildren> = ({ children }) => {
  // Load EVM chains from LI.FI API using getChains action from LI.FI SDK
  const { data: chains } = useQuery({
    queryKey: ["chains"] as const,
    queryFn: async () => {
      const chains = await getChains({
        chainTypes: [ChainType.EVM],
      });
      // Update chain configuration for LI.FI SDK
      config.setState((x) => ({
        ...x,
        chains: chains,
      }));
      return chains;
    },
  });
  console.log({ chains });

  // Synchronize fetched chains with Wagmi config and update connectors
  useSyncWagmiConfig(config, config.connectors as any, chains);

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      {children}
    </WagmiProvider>
  );
};
