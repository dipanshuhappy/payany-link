"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alchemy, Network } from "alchemy-sdk";
import { useAccount } from "wagmi";

// Network mapping for Alchemy SDK
const getAlchemyNetwork = (chainId: number): Network => {
  switch (chainId) {
    case 1:
      return Network.ETH_MAINNET;
    case 137:
      return Network.MATIC_MAINNET;
    case 42161:
      return Network.ARB_MAINNET;
    case 8453:
      return Network.BASE_MAINNET;
    case 11155111:
      return Network.ETH_SEPOLIA;
    case 80001:
      return Network.MATIC_MUMBAI;
    case 421614:
      return Network.ARB_SEPOLIA;
    case 84532:
      return Network.BASE_SEPOLIA;
    default:
      return Network.ETH_MAINNET;
  }
};

// Get Alchemy API key from environment
const getAlchemyApiKey = (): string => {
  return (
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
    "RN9UaGzWUg0VsABXa24_rb-oS578IIqm"
  );
};

// Popular token whitelists to filter out scam tokens
const POPULAR_TOKENS: { [chainId: number]: string[] } = {
  // Polygon (137)
  137: [
    // Stablecoins
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC (bridged)
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC (native)
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", // DAI
    "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89", // FRAX

    // Major Cryptocurrencies
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH
    "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", // WBTC

    // DeFi Tokens
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", // AAVE
    "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", // QUICK
    "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", // LINK
    "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", // BAL
    "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7", // GHST

    // Gaming & NFT
    "0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5", // MANA
    "0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4", // SAND

    // Layer 2 & Polygon Ecosystem
    "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", // UNI
    "0xf88fc6b493eda7650e4bcf7a290bbde2822d25dd", // SUSHI
    "0x172370d5Cd63279eFa6d502DAB29171933a610AF", // CRV
    "0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec", // SHIB

    // Liquid Staking
    "0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4", // stMATIC
    "0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6", // MaticX
  ],

  // Arbitrum (42161)
  42161: [
    // Stablecoins
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC (native)
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC (bridged)
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI
    "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F", // FRAX

    // Major Cryptocurrencies
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC

    // DeFi Tokens
    "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", // GMX
    "0x912CE59144191C1204E64559FE8253a0e49E6548", // ARB
    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
    "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A", // JOE
    "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe", // weETH
    "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8", // rETH

    // Yield Tokens
    "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55", // DPX
    "0x32Eb7902D4134bf98A28b963D26de779AF92A212", // RDNT
    "0x539bdE0d7Dbd336b79148AA742883198BBF60342", // MAGIC
    "0x3082CC23568eA640225c2467653dB90e9250AaA0", // RDNT

    // Arbitrum Ecosystem
    "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A", // SUSHI
    "0x080F6AEd32Fc474DD5717105Dba5ea57268F46eb", // SYN
    "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978", // CRV
  ],

  // Base (8453)
  8453: [
    // Stablecoins
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
    "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT

    // Major Cryptocurrencies
    "0x4200000000000000000000000000000000000006", // WETH

    // DeFi Tokens
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631", // AERO
    "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", // DEGEN
    "0x0578292CB20a443bA1CdE459c985CE14Ca2bDEe5", // PRIME
    "0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71", // TOSHI
    "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", // EURC
    "0xd652C5425aea2Afd5fb142e120FeCf79e18fafc3", // WELL
    "0x532f27101965dd16442E59d40670FaF5eBB142E4", // BRETT
    "0x3bF93770f2d4a794c3d9EBEfBAeBAE2a8f09A5E5", // BALD
    "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376", // USD+

    // Base Ecosystem
    "0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9", // BSWAP
    "0x6985884C4392D348587B19cb9eAAf157F13271cd", // ZRO
    "0x27D2DECb4bFC9C76F0309b8E88dec3a601Fe25a8", // BOBER
    "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1", // BASED
  ],
};

export interface AlchemyToken {
  contractAddress: string;
  tokenBalance: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  logo?: string;
}

export interface TokenWithBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  logo?: string;
}

export function useAlchemyBalances(chainId?: number, enabled: boolean = true) {
  const { address } = useAccount();

  const {
    data: tokenBalances,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["alchemy-balances", address, chainId],
    queryFn: async (): Promise<TokenWithBalance[]> => {
      if (!address || !chainId) {
        return [];
      }

      const config = {
        apiKey: getAlchemyApiKey(),
        network: getAlchemyNetwork(chainId),
      };

      const alchemy = new Alchemy(config);

      try {
        // Get token balances
        const balances = await alchemy.core.getTokenBalances(address);

        // Get native token balance
        const nativeBalance = await alchemy.core.getBalance(address, "latest");

        const tokens: TokenWithBalance[] = [];

        // Add native token
        const nativeToken = getNativeTokenInfo(chainId);
        tokens.push({
          address: "native",
          symbol: nativeToken.symbol,
          name: nativeToken.name,
          decimals: 18,
          balance: nativeBalance.toString(),
          formattedBalance: formatBalance(nativeBalance.toString(), 18),
        });

        // Get whitelist for current chain
        const chainWhitelist = POPULAR_TOKENS[chainId] || [];

        // DEBUGGING: Show all tokens temporarily
        console.log("=== DEBUGGING TOKEN BALANCES ===");
        console.log("Chain ID:", chainId);
        console.log("Total tokens found:", balances.tokenBalances.length);
        console.log("Whitelist length:", chainWhitelist.length);

        balances.tokenBalances.forEach((token, index) => {
          console.log(`Token ${index + 1}:`, {
            address: token.contractAddress,
            balance: token.tokenBalance,
            isZero: token.tokenBalance === "0x0",
          });
        });

        // Process ALL tokens with balance > 0 (temporarily disable filtering)
        const tokenPromises = balances.tokenBalances
          .filter((token) => token.tokenBalance !== "0x0")
          .slice(0, 20) // Show top 20 tokens
          .map(async (token) => {
            try {
              // Get token metadata
              const metadata = await alchemy.core.getTokenMetadata(
                token.contractAddress,
              );

              const balance = BigInt(token.tokenBalance || "0");
              const decimals = metadata.decimals || 18;

              return {
                address: token.contractAddress,
                symbol: metadata.symbol || "UNKNOWN",
                name: metadata.name || "Unknown Token",
                decimals,
                balance: balance.toString(),
                formattedBalance: formatBalance(balance.toString(), decimals),
                logo: metadata.logo || undefined,
              };
            } catch (error) {
              console.warn(
                `Failed to get metadata for token ${token.contractAddress}:`,
                error,
              );
              return null;
            }
          });

        const tokenResults = await Promise.all(tokenPromises);
        const validTokens = tokenResults.filter(
          (token): token is any => token !== null,
        );

        tokens.push(...validTokens);

        // Sort by balance value (descending)
        return tokens.sort((a, b) => {
          const balanceA = parseFloat(a.formattedBalance) || 0;
          const balanceB = parseFloat(b.formattedBalance) || 0;
          return balanceB - balanceA;
        });
      } catch (error) {
        console.error("Error fetching token balances:", error);
        throw error;
      }
    },
    enabled: enabled && !!address && !!chainId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  return {
    tokens: tokenBalances || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// Helper function to get native token info
function getNativeTokenInfo(chainId: number) {
  switch (chainId) {
    case 1:
    case 11155111:
      return { symbol: "ETH", name: "Ethereum" };
    case 137:
    case 80001:
      return { symbol: "MATIC", name: "Polygon" };
    case 42161:
    case 421614:
      return { symbol: "ETH", name: "Arbitrum ETH" };
    case 8453:
    case 84532:
      return { symbol: "ETH", name: "Base ETH" };
    default:
      return { symbol: "ETH", name: "Ethereum" };
  }
}

// Helper function to format balance
function formatBalance(balance: string, decimals: number): string {
  try {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;

    // Convert to decimal string
    const wholeStr = wholePart.toString();
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");

    // Combine and trim trailing zeros
    const combined = `${wholeStr}.${fractionalStr}`;
    const trimmed = combined.replace(/\.?0+$/, "");

    // Return "0" if empty after trimming
    return trimmed || "0";
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "0";
  }
}

// Hook for a specific chain (convenience wrapper)
export function useAlchemyBalancesForChain(chainId: number) {
  return useAlchemyBalances(chainId, !!chainId);
}
