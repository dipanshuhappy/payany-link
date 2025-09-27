"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Search, Github, Twitter, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

interface ENSProfile {
  _id: string;
  domain_name: string;
  resolved_address?: string;
  registration_date?: string;
  expiry_date?: string;
  description?: string;
  github?: string;
  twitter?: string;
  optin?: boolean;
  block_confirmation?: string;
  searchableText: string;
}

export function ENSSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchAction = useAction(api.ensProfiles.searchProfiles);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchAction({ query: searchQuery, limit: 20 });
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const visitProfile = (domain: string) => {
    const url = `https://${domain}.payany.link`;
    window.open(url, "_blank");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">ENS Profile Search</h1>
        <p className="text-muted-foreground">
          Search for ENS profiles by name, description, or social accounts
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search ENS profiles (e.g., 'DeFi developer', 'vitalik', 'ethereum')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
          <Search className="w-4 h-4 mr-2" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      {searchResults && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Search Results ({searchResults.profiles.length})
            </h2>
            {searchResults.total > searchResults.profiles.length && (
              <p className="text-sm text-muted-foreground">
                Showing top {searchResults.profiles.length} of{" "}
                {searchResults.total} results
              </p>
            )}
          </div>

          <div className="grid gap-4">
            {searchResults.profiles.map((profile: ENSProfile) => (
              <Card
                key={profile._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-blue-600">
                        {profile.domain_name}
                      </CardTitle>
                      {profile.resolved_address && (
                        <CardDescription className="font-mono text-sm mt-1">
                          {profile.resolved_address}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => visitProfile(profile.domain_name)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit
                      </Button>
                      {profile.resolved_address && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(profile.resolved_address!)
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {profile.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {profile.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {profile.github && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Github className="w-3 h-3" />
                        <a
                          href={`https://github.com/${profile.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {profile.github}
                        </a>
                      </Badge>
                    )}
                    {profile.twitter && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Twitter className="w-3 h-3" />
                        <a
                          href={`https://twitter.com/${profile.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {profile.twitter}
                        </a>
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    {profile.registration_date && (
                      <span>Registered: {profile.registration_date}</span>
                    )}
                    {profile.expiry_date && (
                      <span>Expires: {profile.expiry_date}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {searchResults.profiles.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No profiles found for "{searchQuery}". Try different
                keywords.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
