"use client";

import React from "react";
import { Card } from "@workspace/ui/components/card";
import { Check } from "lucide-react";
import { Chain } from "./ChainSelection";

export type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  balance?: string;
};

interface TokenSelectionProps {
  selectedChain: Chain | null;
  tokens: Token[];
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
}

export const TOKENS: { [chainId: number]: Token[] } = {
  1: [
    {
      address: "native",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
      balance: "2.45",
    },
    {
      address: "0xA0b86a33E6441d7b8E9cA8C9C19DdAbfC1e2af62",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
      balance: "1,250.00",
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      logo: "https://cryptologos.cc/logos/tether-usdt-logo.svg",
      balance: "890.50",
    },
  ],
  137: [
    {
      address: "native",
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      logo: "https://cryptologos.cc/logos/polygon-matic-logo.svg",
      balance: "450.20",
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
      balance: "750.00",
    },
  ],
  8453: [
    {
      address: "native",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
      balance: "1.25",
    },
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
      balance: "500.00",
    },
  ],
  42161: [
    {
      address: "native",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
      balance: "0.85",
    },
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
      balance: "320.00",
    },
  ],
  10: [
    {
      address: "native",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
      balance: "1.50",
    },
    {
      address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
      balance: "600.00",
    },
  ],
};

export default function TokenSelection({
  selectedChain,
  tokens,
  selectedToken,
  onTokenSelect,
}: TokenSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Select Token</h3>
        <p className="text-sm text-muted-foreground">
          On {selectedChain?.name}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
        {tokens.map((token) => (
          <Card
            key={token.address}
            className={`p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedToken?.address === token.address
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onTokenSelect(token)}
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <img
                src={token.logo}
                alt={token.symbol}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm sm:text-base truncate">
                    {token.symbol}
                  </h4>
                  <span className="text-xs sm:text-sm text-muted-foreground ml-2">
                    {token.balance}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {token.name}
                </p>
              </div>
              {selectedToken?.address === token.address && (
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
