"use client";

import { ENSSearch } from "@/components/ens-search";

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <ENSSearch />
      </div>
    </div>
  );
}