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
import { useAccount, useBalance } from "wagmi";
import { useAlchemyBalances } from "@/hooks/use-alchemy-balances";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import { readContract } from "wagmi/actions";
import { config, lifiConfig } from "@/lib/wagmi";
import { getRoutes, executeRoute } from "@lifi/sdk";
import { getWalletClient, switchChain } from "wagmi/actions";
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
  console.log({ recipientAddress });
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { address, chainId: currentChainId } = useAccount();

  // Get token balances from Alchemy for selected chain
  const {
    tokens: alchemyTokens,
    isLoading: tokensLoading,
    error: tokensError,
  } = useAlchemyBalances(selectedChain?.id, !!selectedChain && !!address);

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
    if (!selectedChain || !selectedToken || !amount) {
      toast.error("Please complete all payment details");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const quotes = await getRoutes({
        fromAmount: parseUnits(amount, selectedToken.decimals || 18).toString(),
        fromChainId: selectedChain?.id,
        fromTokenAddress: selectedToken.address as `0x${string}`,
        toChainId: 42161,
        fromAddress: address,
        toAddress: recipientAddress,
        toTokenAddress: "0x46850ad61c2b7d64d08c9c754f45254596696984", // PYUSD
      });
      console.log({ quotes });
      const route = quotes.routes[0];

      const executedRoute = await executeRoute(route as any, {
        updateRouteHook(route) {
          console.log(route);
        },
      });

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

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

  // Show connect wallet message if not connected
  if (!address) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-center">Send Payment</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to continue
            </p>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Convert Alchemy tokens to Token format
  const tokensForSelection: Token[] = alchemyTokens.map((token) => ({
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logo:
      token.logo ||
      `https://cryptologos.cc/logos/${token.symbol.toLowerCase()}-logo.svg`,
    balance: token.formattedBalance,
  }));

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
    return tokensForSelection;
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
                isLoading={tokensLoading}
                error={tokensError}
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

                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <span>Payment to Arbitrum</span>
                    <Badge variant="secondary" className="ml-2">
                      Cross-chain
                    </Badge>
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <p>Destination: PYUSD on Arbitrum</p>
                    <p>Recipient: {recipient}</p>
                    {recipientAddress && (
                      <p>
                        Address: {recipientAddress.slice(0, 10)}...
                        {recipientAddress.slice(-6)}
                      </p>
                    )}
                  </div>
                </div>

                {currentChainId !== 42161 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Cross-chain payment to Arbitrum required. Please ensure
                      you have sufficient balance and gas fees.
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
              // disabled={
              //   (currentStep === 1 && !selectedChain) ||
              //   (currentStep === 2 && (!selectedToken || tokensLoading)) ||
              //   (currentStep === 3 && !amount) ||
              //   isProcessingPayment ||
              //   !address
              // }
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessingPayment ? (
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
