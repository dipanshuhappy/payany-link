"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoutes,
  executeRoute,
  getStatus,
  getTokens,
  RoutesRequest,
  Route,
  Token,
  ChainType,
  Substatus,
} from "@lifi/sdk";
import { useAccount, useWalletClient } from "wagmi";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { lifiConfig } from "@/components/providers";

export interface UseLifiOptions {
  fromChainId?: number;
  toChainId?: number;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  fromAmount?: string;
}

export interface LifiQuoteResult {
  routes: Route[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface LifiExecutionResult {
  execute: (route: Route) => Promise<void>;
  isExecuting: boolean;
  executionStatus: string | null;
  error: Error | null;
  reset: () => void;
}

export function useLifiQuote({
  fromChainId,
  toChainId,
  fromTokenAddress,
  toTokenAddress,
  fromAmount,
}: UseLifiOptions): LifiQuoteResult {
  const { address } = useAccount();

  const {
    data: routes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "lifi-quote",
      fromChainId,
      toChainId,
      fromTokenAddress,
      toTokenAddress,
      fromAmount,
      address,
    ],
    queryFn: async () => {
      if (
        !fromChainId ||
        !toChainId ||
        !fromTokenAddress ||
        !toTokenAddress ||
        !fromAmount ||
        !address
      ) {
        return [];
      }

      const routeRequest: RoutesRequest = {
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        fromAmount,
        fromAddress: address,
        toAddress: address,
        options: {
          slippage: 0.03, // 3% slippage
          order: "RECOMMENDED",
          allowSwitchChain: true,
        },
      };

      const result = await getRoutes(routeRequest);
      return result.routes || [];
    },
    enabled: Boolean(
      fromChainId &&
        toChainId &&
        fromTokenAddress &&
        toTokenAddress &&
        fromAmount &&
        address,
    ),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });

  return {
    routes,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useLifiExecution(): LifiExecutionResult {
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);

  const {
    mutateAsync: execute,
    isPending: isExecuting,
    error,
    reset,
  } = useMutation({
    mutationFn: async (route: Route) => {
      if (!walletClient) {
        throw new Error("Wallet not connected");
      }

      setExecutionStatus(null);

      // Execute the route
      const result = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          console.log("Route updated:", updatedRoute);
          // Update the current step status
          const currentStep = updatedRoute.steps.find(
            (step) => step.execution?.status === "PENDING",
          );
          if (currentStep && currentStep.execution?.status) {
            setExecutionStatus(currentStep.execution.status);
          }
        },
      });

      // Poll for final status if transaction hash is available
      if (result && route.steps.length > 0) {
        try {
          const finalStatus = await getStatus({
            bridge: route.steps[0].tool,
            fromChain: route.fromChainId,
            toChain: route.toChainId,
            txHash: (result as any).transactionHash || "",
          });

          if (finalStatus && finalStatus.substatus) {
            setExecutionStatus(finalStatus.substatus as string);
          }
        } catch (statusError) {
          console.warn("Failed to get transaction status:", statusError);
        }
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Transaction completed successfully!");
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["lifi-quote"] });
      queryClient.invalidateQueries({ queryKey: ["token-balances"] });
    },
    onError: (error: Error) => {
      toast.error(`Transaction failed: ${error.message}`);
      console.error("LI.FI execution error:", error);
    },
  });

  const handleExecute = useCallback(
    async (route: Route) => {
      try {
        await execute(route);
      } catch (error) {
        console.error("Failed to execute route:", error);
        throw error;
      }
    },
    [execute],
  );

  return {
    execute: handleExecute,
    isExecuting,
    executionStatus,
    error: error as Error | null,
    reset: () => {
      reset();
      setExecutionStatus(null);
    },
  };
}

export function useLifiTokens(chainId?: number) {
  const {
    data: tokens = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["lifi-tokens", chainId],
    queryFn: async () => {
      if (!chainId) return [];

      const result = await getTokens({
        chains: [chainId],
        chainTypes: [ChainType.EVM],
      });

      return result.tokens[chainId] || [];
    },
    enabled: Boolean(chainId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    tokens,
    isLoading,
    error: error as Error | null,
  };
}

export function useLifiSwap({
  fromChainId,
  fromTokenAddress,
  toTokenAddress,
  fromAmount,
}: Omit<UseLifiOptions, "toChainId">): LifiQuoteResult {
  return useLifiQuote({
    fromChainId,
    toChainId: fromChainId, // Same chain swap
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
  });
}

export function useLifiBridge({
  fromChainId,
  toChainId,
  tokenAddress,
  fromAmount,
}: {
  fromChainId?: number;
  toChainId?: number;
  tokenAddress?: string;
  fromAmount?: string;
}): LifiQuoteResult {
  return useLifiQuote({
    fromChainId,
    toChainId,
    fromTokenAddress: tokenAddress,
    toTokenAddress: tokenAddress, // Same token bridge
    fromAmount,
  });
}

// Helper function to get the best route from results
export function getBestRoute(routes: Route[]): Route | null {
  if (!routes.length) return null;

  // Sort by total time and gas cost
  return routes.reduce((best, current) => {
    const bestTime = best.steps.reduce(
      (sum, step) => sum + (step.estimate?.executionDuration || 0),
      0,
    );
    const currentTime = current.steps.reduce(
      (sum, step) => sum + (step.estimate?.executionDuration || 0),
      0,
    );

    const bestGasCost = parseFloat(best.gasCostUSD || "0");
    const currentGasCost = parseFloat(current.gasCostUSD || "0");

    // Prefer lower gas cost, then lower time
    if (currentGasCost < bestGasCost) return current;
    if (currentGasCost === bestGasCost && currentTime < bestTime)
      return current;

    return best;
  });
}

// Helper function to format route information
export function formatRouteInfo(route: Route) {
  const totalTime = route.steps.reduce(
    (sum, step) => sum + (step.estimate?.executionDuration || 0),
    0,
  );

  const tools = route.steps.map((step) => step.tool).join(" → ");

  return {
    totalTimeMinutes: Math.ceil(totalTime / 60),
    tools,
    gasCostUSD: route.gasCostUSD,
    fromAmount: route.fromAmount,
    toAmount: route.toAmount,
    toAmountMin: route.toAmountMin,
  };
}
