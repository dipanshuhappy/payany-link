"use client";

import { ENSSearch } from "@/components/ens-search";

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold text-foreground">
            ENS Discovery
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore and discover ENS profiles across the ecosystem. Find developers, creators, and innovators in Web3.
          </p>
        </div>

        <ENSSearch />
      </div>
    </div>
  );
}