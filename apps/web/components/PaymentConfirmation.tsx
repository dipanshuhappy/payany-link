"use client";

import React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Chain } from "./ChainSelection";
import { Token } from "./TokenSelection";

interface PaymentConfirmationProps {
  recipient: string;
  recipientAddress?: string;
  selectedChain: Chain | null;
  selectedToken: Token | null;
  amount: string;
  onAmountChange: (amount: string) => void;
}

export default function PaymentConfirmation({
  recipient,
  recipientAddress,
  selectedChain,
  selectedToken,
  amount,
  onAmountChange,
}: PaymentConfirmationProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-center">Confirm Payment</h3>

      <div className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-3">Payment Details</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">To:</span>
              <span className="font-medium">{recipient}</span>
            </div>
            {recipientAddress && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono text-sm">
                  {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Chain:</span>
              <div className="flex items-center space-x-2">
                <img
                  src={selectedChain?.logo}
                  alt={selectedChain?.name}
                  className="w-5 h-5 rounded-full"
                />
                <span>{selectedChain?.name}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Token:</span>
              <div className="flex items-center space-x-2">
                <img
                  src={selectedToken?.logo}
                  alt={selectedToken?.symbol}
                  className="w-5 h-5 rounded-full"
                />
                <span>{selectedToken?.symbol}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Amount</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="flex-1 px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Badge variant="outline">{selectedToken?.symbol}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Available: {selectedToken?.balance} {selectedToken?.symbol}
          </p>
        </div>

        <Separator />

        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount:</span>
            <span className="font-bold">
              {amount || "0.00"} {selectedToken?.symbol}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
