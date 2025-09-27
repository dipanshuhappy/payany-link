"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoutes,
  executeRoute,
  type Route,
  type RoutesRequest,
} from "@lifi/sdk";
import { useAccount } from "wagmi";
import { toast } from "sonner";

export interface LifiRouteParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
}

export interface UseLifiQuoteOptions extends LifiRouteParams {
  enabled?: boolean;
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
  currentStep: string | null;
  error: Error | null;
  reset: () => void;
}

// Hook for getting LI.FI routes/quotes
export function useLifiQuote({
  fromChainId,
  toChainId,
  fromTokenAddress,
  toTokenAddress,
  fromAmount,
  enabled = true,
}: UseLifiQuoteOptions): LifiQuoteResult {
  const { address } = useAccount();

  const {
    data: routes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "lifi-routes",
      fromChainId,
      toChainId,
      fromTokenAddress,
      toTokenAddress,
      fromAmount,
      address,
    ],
    queryFn: async (): Promise<Route[]> => {
      if (!address) {
        throw new Error("Wallet address is required");
      }

      const routesRequest: RoutesRequest = {
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        fromAmount,
        fromAddress: address,
      };

      const result = await getRoutes(routesRequest);
      return result.routes || [];
    },
    enabled:
      enabled &&
      Boolean(
        fromChainId &&
          toChainId &&
          fromTokenAddress &&
          toTokenAddress &&
          fromAmount &&
          address,
      ),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  return {
    routes,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// Hook for executing LI.FI routes
export function useLifiExecution(): LifiExecutionResult {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const {
    mutateAsync: execute,
    isPending: isExecuting,
    error,
    reset,
  } = useMutation({
    mutationFn: async (route: Route) => {
      setCurrentStep("Starting transaction...");

      const executedRoute = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          console.log("Route update:", updatedRoute);

          // Find the current executing step
          const currentStepInfo = updatedRoute.steps.find(
            (step) =>
              step.execution?.status === "PENDING" ||
              step.execution?.status === "ACTION_REQUIRED",
          );

          if (currentStepInfo) {
            const stepName = currentStepInfo.action?.fromToken?.symbol
              ? `${currentStepInfo.action.fromToken.symbol} → ${currentStepInfo.action?.toToken?.symbol}`
              : currentStepInfo.tool;
            setCurrentStep(`Processing ${stepName}...`);
          } else {
            // Check if all steps are completed
            const completedSteps = updatedRoute.steps.filter(
              (step) => step.execution?.status === "DONE",
            );
            if (completedSteps.length === updatedRoute.steps.length) {
              setCurrentStep("Transaction completed!");
            }
          }
        },
      });

      return executedRoute;
    },
    onSuccess: () => {
      setCurrentStep("Success!");
      toast.success("Bridge transaction completed successfully!");

      // Invalidate related queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ["lifi-routes"] });
      queryClient.invalidateQueries({ queryKey: ["token-balance"] });

      // Reset step after success
      setTimeout(() => setCurrentStep(null), 3000);
    },
    onError: (error: Error) => {
      setCurrentStep(null);
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

  const handleReset = useCallback(() => {
    reset();
    setCurrentStep(null);
  }, [reset]);

  return {
    execute: handleExecute,
    isExecuting,
    currentStep,
    error: error as Error | null,
    reset: handleReset,
  };
}

// Combined hook for both quote and execution
export function useLifi(params: LifiRouteParams) {
  const quote = useLifiQuote(params);
  const execution = useLifiExecution();

  return {
    // Quote functionality
    routes: quote.routes,
    isLoading: quote.isLoading,
    error: quote.error,
    refetch: quote.refetch,

    // Execution functionality
    execute: execution.execute,
    isExecuting: execution.isExecuting,
    currentStep: execution.currentStep,
    executionError: execution.error,
    resetExecution: execution.reset,
  };
}

// Utility functions
export function getBestRoute(routes: Route[]): Route | null {
  if (!routes || routes.length === 0) return null;

  // Return the first route (LI.FI returns routes sorted by recommendation)
  return routes[0];
}

export function getRouteEstimates(route: Route) {
  const totalTime = route.steps.reduce(
    (sum, step) => sum + (step.estimate?.executionDuration || 0),
    0,
  );

  return {
    executionTimeSeconds: totalTime,
    executionTimeMinutes: Math.ceil(totalTime / 60),
    gasCostUSD: route.gasCostUSD,
    fromAmount: route.fromAmount,
    toAmount: route.toAmount,
    toAmountMin: route.toAmountMin,
    tools: route.steps.map((step) => step.tool).join(" → "),
  };
}

// Simple hook for same-chain swaps
export function useLifiSwap({
  chainId,
  fromTokenAddress,
  toTokenAddress,
  fromAmount,
}: {
  chainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
}) {
  return useLifi({
    fromChainId: chainId,
    toChainId: chainId, // Same chain
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
  });
}

// Simple hook for cross-chain bridging (same token)
export function useLifiBridge({
  fromChainId,
  toChainId,
  tokenAddress,
  fromAmount,
}: {
  fromChainId: number;
  toChainId: number;
  tokenAddress: string;
  fromAmount: string;
}) {
  return useLifi({
    fromChainId,
    toChainId,
    fromTokenAddress: tokenAddress,
    toTokenAddress: tokenAddress, // Same token
    fromAmount,
  });
}
