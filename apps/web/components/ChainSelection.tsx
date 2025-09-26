"use client";

import React from "react";
import { Card } from "@workspace/ui/components/card";
import { Check } from "lucide-react";

export type Chain = {
  id: number;
  name: string;
  logo: string;
  nativeCurrency: string;
};

interface ChainSelectionProps {
  chains: Chain[];
  selectedChain: Chain | null;
  onChainSelect: (chain: Chain) => void;
}

export const CHAINS: Chain[] = [
  {
    id: 1,
    name: "Ethereum",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    nativeCurrency: "ETH",
  },
  {
    id: 137,
    name: "Polygon",
    logo: "https://cryptologos.cc/logos/polygon-matic-logo.svg",
    nativeCurrency: "MATIC",
  },
  {
    id: 8453,
    name: "Base",
    logo: "https://cryptologos.cc/logos/coinbase-coin-logo.svg",
    nativeCurrency: "ETH",
  },
  {
    id: 42161,
    name: "Arbitrum",
    logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg",
    nativeCurrency: "ETH",
  },
  {
    id: 10,
    name: "Optimism",
    logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg",
    nativeCurrency: "ETH",
  },
];

export default function ChainSelection({
  chains,
  selectedChain,
  onChainSelect,
}: ChainSelectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">Select Chain</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
        {chains.map((chain) => (
          <Card
            key={chain.id}
            className={`p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedChain?.id === chain.id
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onChainSelect(chain)}
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <img
                src={chain.logo}
                alt={chain.name}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm sm:text-base truncate">
                  {chain.name}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Native: {chain.nativeCurrency}
                </p>
              </div>
              {selectedChain?.id === chain.id && (
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
