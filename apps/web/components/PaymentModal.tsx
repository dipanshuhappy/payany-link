"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import ChainSelection, { CHAINS, Chain } from "./ChainSelection";
import TokenSelection, { TOKENS, Token } from "./TokenSelection";
import PaymentConfirmation from "./PaymentConfirmation";

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

  const handleConfirm = () => {
    // Handle payment confirmation logic here
    console.log("Payment confirmed:", {
      chain: selectedChain,
      token: selectedToken,
      amount,
      recipient,
      recipientAddress,
    });
    handleClose();
  };

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
              <PaymentConfirmation
                recipient={recipient}
                recipientAddress={recipientAddress}
                selectedChain={selectedChain}
                selectedToken={selectedToken}
                amount={amount}
                onAmountChange={setAmount}
              />
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
                (currentStep === 3 && !amount)
              }
              className="bg-primary hover:bg-primary/90"
            >
              {currentStep === 3 ? "Confirm Payment" : "Next"}
              {currentStep < 3 && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
