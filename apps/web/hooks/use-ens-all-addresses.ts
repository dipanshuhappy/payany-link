import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

export type ChainAddress = {
  network: string;
  coinType: number;
  address: string | null;
};

export type UseEnsAllAddressesProps = {
  name: string;
};

const CHAIN_COIN_TYPES = [
  { network: "Bitcoin", coinType: 0 },
  { network: "Litecoin", coinType: 2 },
  { network: "Dogecoin", coinType: 3 },
  { network: "Ethereum", coinType: 60 },
  { network: "Solana", coinType: 501 },
  { network: "OP Mainnet", coinType: 2147483658 },
  { network: "Polygon", coinType: 2147483785 },
  { network: "Base", coinType: 2147492101 },
  { network: "Arbitrum One", coinType: 2147525809 },
];

export function useEnsAllAddresses({ name }: UseEnsAllAddressesProps) {
  const client = usePublicClient({ chainId: 1 });

  return useQuery({
    queryKey: ["ens-all-addresses", name],
    queryFn: async () => {
      if (!client || !name) return [];

      const promises = CHAIN_COIN_TYPES.map(async ({ network, coinType }) => {
        try {
          // @ts-ignore - wagmi types may not be up to date
          const address = await client.getEnsAddress({ name, coinType });
          return {
            network,
            coinType,
            address,
          };
        } catch (error) {
          return {
            network,
            coinType,
            address: null,
          };
        }
      });

      const results = await Promise.all(promises);
      return results.filter((result) => result.address !== null);
    },
    enabled: !!client && !!name,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
