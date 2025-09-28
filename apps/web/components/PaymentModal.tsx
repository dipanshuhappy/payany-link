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
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  CreditCard,
} from "lucide-react";
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
import PayPalModal from "./PayPalModal";
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
  recipientAddress?: string;
  mode?: "pay" | "buy";
  fixedAmount?: string;
  productName?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  recipient,
  recipientAddress,
  mode = "pay",
  fixedAmount,
  productName,
}: PaymentModalProps) {
  console.log({ recipientAddress });
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState(fixedAmount || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "fiat">(
    "crypto",
  );
  const [isPaypalModalOpen, setIsPaypalModalOpen] = useState(false);

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
    setPaymentMethod("crypto");
    if (mode === "pay") {
      setAmount("");
    }
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

  // Set fixed amount when in buy mode
  useEffect(() => {
    if (mode === "buy" && fixedAmount) {
      setAmount(fixedAmount);
    }
  }, [mode, fixedAmount]);

  const handlePayPalSelect = () => {
    handleClose();
    setIsPaypalModalOpen(true);
  };

  // Show connect wallet message if not connected
  if (!address) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {mode === "buy"
                ? `Buy ${productName || "Product"}`
                : "Send Payment"}
            </DialogTitle>
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
          <DialogTitle className="text-center">
            {mode === "buy"
              ? `Buy ${productName || "Product"}`
              : "Send Payment"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium mb-2">
                    Choose Payment Method
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select how you'd like to pay
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setPaymentMethod("crypto")}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      paymentMethod === "crypto"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                        <span className="text-orange-600 dark:text-orange-400">
                          ₿
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">Pay with Crypto</h4>
                        <p className="text-sm text-muted-foreground">
                          Use your crypto wallet (cross-chain supported)
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handlePayPalSelect}
                    className="p-4 rounded-lg border-2 transition-all duration-200 text-left border-border hover:border-primary/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Pay with PayPal</h4>
                        <p className="text-sm text-muted-foreground">
                          Use PayPal, credit card, or bank account
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {paymentMethod === "crypto" && (
                  <div className="mt-6">
                    <ChainSelection
                      chains={CHAINS}
                      selectedChain={selectedChain}
                      onChainSelect={setSelectedChain}
                    />
                  </div>
                )}

                {paymentMethod === "fiat" && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Enter Amount</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) =>
                            mode === "pay" ? setAmount(e.target.value) : null
                          }
                          placeholder="0.00"
                          className="flex-1 text-lg font-bold bg-transparent border-none outline-none"
                          disabled={mode === "buy"}
                        />
                        <span className="text-muted-foreground">USD</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentStep === 2 && paymentMethod === "crypto" && (
              <TokenSelection
                selectedChain={selectedChain}
                tokens={getTokensForChain()}
                selectedToken={selectedToken}
                onTokenSelect={setSelectedToken}
                isLoading={tokensLoading}
                error={tokensError}
              />
            )}
            {currentStep === 3 && paymentMethod === "crypto" && (
              <div className="space-y-6">
                <PaymentConfirmation
                  recipient={recipient}
                  recipientAddress={recipientAddress}
                  selectedChain={selectedChain}
                  selectedToken={selectedToken}
                  amount={amount}
                  onAmountChange={mode === "pay" ? setAmount : undefined}
                  isAmountEditable={mode === "pay"}
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
              disabled={isProcessingPayment}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            {/* Only show Next/Confirm for crypto payments, PayPal handles its own flow */}
            {paymentMethod === "crypto" && (
              <Button
                onClick={currentStep === 3 ? handleConfirm : handleNext}
                disabled={
                  (currentStep === 1 && !selectedChain) ||
                  (currentStep === 2 && (!selectedToken || tokensLoading)) ||
                  (currentStep === 3 && !amount) ||
                  isProcessingPayment ||
                  !address
                }
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
                    {currentStep < 3 && (
                      <ChevronRight className="w-4 h-4 ml-2" />
                    )}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* PayPal Modal */}
      <PayPalModal
        isOpen={isPaypalModalOpen}
        onClose={() => setIsPaypalModalOpen(false)}
        recipient={recipient}
        recipientAddress={recipientAddress}
        fixedAmount={fixedAmount}
        productName={productName}
        mode={mode}
      />
    </Dialog>
  );
}
