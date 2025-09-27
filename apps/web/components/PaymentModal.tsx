"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import ChainSelection, { CHAINS, Chain } from "./ChainSelection";
import TokenSelection, { TOKENS, Token } from "./TokenSelection";
import PaymentConfirmation from "./PaymentConfirmation";
import { useLifi, getBestRoute, getRouteEstimates } from "@/hooks/use-lifi";
import { useAccount, useBalance } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
  recipientAddress?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  recipient,
  recipientAddress,
}: PaymentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { address, chainId: currentChainId } = useAccount();

  // LI.FI integration for cross-chain payments
  const {
    routes,
    isLoading: routesLoading,
    execute,
    isExecuting,
    currentStep: executionStep,
    executionError,
    refetch: refetchRoutes,
  } = useLifi({
    fromChainId: currentChainId || 1,
    toChainId: selectedChain?.id || 1,
    fromTokenAddress:
      selectedToken?.address === "native"
        ? "0x0000000000000000000000000000000000000000"
        : selectedToken?.address || "",
    toTokenAddress:
      selectedToken?.address === "native"
        ? "0x0000000000000000000000000000000000000000"
        : selectedToken?.address || "",
    fromAmount:
      amount && selectedToken
        ? parseUnits(amount, selectedToken.decimals || 18).toString()
        : "0",
  });

  // Get user's balance for selected token
  const { data: balance } = useBalance({
    address,
    token:
      selectedToken?.address === "native"
        ? undefined
        : (selectedToken?.address as `0x${string}`),
    chainId: currentChainId,
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedChain(null);
    setSelectedToken(null);
    setAmount("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!routes.length || !selectedChain || !selectedToken || !amount) {
      toast.error("Please complete all payment details");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Get the best route from LI.FI
      const bestRoute = getBestRoute(routes);
      if (!bestRoute) {
        throw new Error("No route available for this payment");
      }

      // Execute the cross-chain route
      await execute(bestRoute);

      toast.success("Payment sent successfully!");
      handleClose();
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error(
        `Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Reset selection when chain changes
  useEffect(() => {
    if (selectedChain) {
      setSelectedToken(null); // Reset token when chain changes
    }
  }, [selectedChain]);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
              step <= currentStep
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground"
            } ${step === currentStep ? "ring-2 ring-primary/20" : ""}`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          <span
            className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline ${
              step <= currentStep ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {step === 1 && "Chain"}
            {step === 2 && "Token"}
            {step === 3 && "Confirm"}
          </span>
          {step < 3 && (
            <div
              className={`mx-1 sm:mx-2 w-8 sm:w-12 h-px ${
                step < currentStep ? "bg-primary" : "bg-border"
              } transition-colors duration-200`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const getTokensForChain = () => {
    return selectedChain ? TOKENS[selectedChain.id] || [] : [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Send Payment</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <ChainSelection
                chains={CHAINS}
                selectedChain={selectedChain}
                onChainSelect={setSelectedChain}
              />
            )}
            {currentStep === 2 && (
              <TokenSelection
                selectedChain={selectedChain}
                tokens={getTokensForChain()}
                selectedToken={selectedToken}
                onTokenSelect={setSelectedToken}
              />
            )}
            {currentStep === 3 && (
              <div className="space-y-6">
                <PaymentConfirmation
                  recipient={recipient}
                  recipientAddress={recipientAddress}
                  selectedChain={selectedChain}
                  selectedToken={selectedToken}
                  amount={amount}
                  onAmountChange={setAmount}
                />

                {/* LI.FI Route Information */}
                {routesLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      Finding best route...
                    </span>
                  </div>
                )}

                {routes.length > 0 && !routesLoading && selectedToken && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <span>Cross-chain Route</span>
                      <Badge variant="secondary" className="ml-2">
                        LI.FI
                      </Badge>
                    </h4>
                    {(() => {
                      const bestRoute = getBestRoute(routes);
                      if (!bestRoute) return null;

                      const estimates = getRouteEstimates(bestRoute);

                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Estimated time:
                            </span>
                            <span>
                              {estimates.executionTimeMinutes} minutes
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Gas cost:
                            </span>
                            <span>${estimates.gasCostUSD || "0.00"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Tools:
                            </span>
                            <span className="text-xs">{estimates.tools}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              You will receive:
                            </span>
                            <span className="font-medium">
                              {formatUnits(
                                BigInt(estimates.toAmount),
                                selectedToken.decimals || 18,
                              )}{" "}
                              {selectedToken.symbol}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {currentChainId !== selectedChain?.id &&
                  !routesLoading &&
                  routes.length === 0 &&
                  amount && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Cross-chain payment required. Please ensure you have
                        sufficient balance and gas fees.
                      </p>
                    </div>
                  )}

                {executionStep && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {executionStep}
                      </p>
                    </div>
                  </div>
                )}

                {executionError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Error: {executionError.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
              disabled={false}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            <Button
              onClick={currentStep === 3 ? handleConfirm : handleNext}
              disabled={
                (currentStep === 1 && !selectedChain) ||
                (currentStep === 2 && !selectedToken) ||
                (currentStep === 3 && (!amount || routesLoading)) ||
                isProcessingPayment ||
                isExecuting
              }
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessingPayment || isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {currentStep === 3 ? "Confirm Payment" : "Next"}
                  {currentStep < 3 && <ChevronRight className="w-4 h-4 ml-2" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
