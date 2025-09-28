"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useEnsTexts } from "@/hooks/use-ens-texts";
import { isAddress } from "viem";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePublicClient } from "wagmi";
// Define the component's props for reusability
interface DynamicSuffixSearchBarProps {
  placeholderNames: string[];
  suffix: string;
  buttonText: string;
  onPay: (value: string) => void;
}

export const DynamicSuffixSearchBar: React.FC<DynamicSuffixSearchBarProps> = ({
  placeholderNames,
  suffix,
  buttonText,
  onPay,
}) => {
  const [currentNameIndex, setCurrentNameIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if input is valid ENS name or address
  const isValidInput = userInput.trim().length > 0;
  const isEthAddress = isAddress(userInput.trim());
  const isEnsName = userInput.includes(".") && !isEthAddress;

  // Fetch ENS avatar if it's an ENS name
  const { data: ensTexts } = useEnsTexts({
    name: isEnsName ? userInput.trim() : "",
    keys: ["avatar"],
  });

  const avatarUrl = ensTexts?.find(text => text.key === "avatar")?.value;

  // Convex search action and ENS client
  const searchAction = useAction(api.ensProfiles.searchProfiles);
  const publicClient = usePublicClient({ chainId: 1 });

  // Debounced search effect
  useEffect(() => {
    if (userInput.trim().length >= 2 && isFocused) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const query = userInput.trim();
          const combinedResults: any[] = [];

          // If it looks like an ENS name, try to resolve it directly
          if (query.includes('.') && !isAddress(query)) {
            try {
              const resolvedAddress = await publicClient?.getEnsAddress({ name: query });
              if (resolvedAddress) {
                // Add direct ENS result at top
                combinedResults.push({
                  _id: `direct_${query}`,
                  domain_name: query,
                  resolved_address: resolvedAddress,
                  description: 'ENS Name',
                  isDirect: true
                });
              }
            } catch (ensError) {
              // ENS resolution failed, continue with database search
            }
          }

          // Get database results
          const results = await searchAction({ query, limit: 4 }); // Reduce to 4 to make room for direct ENS
          const dbResults = (results.profiles || []).filter(profile =>
            profile && !combinedResults.some(direct => direct.domain_name === profile.domain_name)
          );

          setSearchSuggestions([...combinedResults, ...dbResults]);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [userInput, isFocused, searchAction, publicClient]);

  // useEffect for the placeholder typing animation
  useEffect(() => {
    // Pause animation if user is interacting
    if (userInput || isFocused) {
      setDisplayText(""); // Clear animated text when focused
      return;
    }

    const currentName = placeholderNames[currentNameIndex];

    // Early return if no current name available
    if (!currentName) {
      return;
    }

    if (isTyping) {
      // Typing animation
      if (charIndex < currentName.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentName.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => setIsTyping(false), 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      // Deleting animation
      if (charIndex > 0) {
        const timeout = setTimeout(() => {
          setDisplayText(currentName.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setCurrentNameIndex((prev) => (prev + 1) % placeholderNames.length);
          setIsTyping(true);
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [
    currentNameIndex,
    isTyping,
    charIndex,
    userInput,
    isFocused,
    placeholderNames,
  ]);

  const handlePayClick = () => {
    if (userInput.trim()) {
      onPay(`${userInput.trim()}${suffix}`);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setUserInput(suggestion.domain_name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < searchSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchSuggestions.length) {
          handleSuggestionClick(searchSuggestions[selectedIndex]);
        } else {
          handlePayClick();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showAnimation = !userInput && !isFocused;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl shadow-lg">
        <div className="flex-1 flex items-center h-14 relative">
          {/* Profile Picture */}
          {avatarUrl && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-7 h-7 rounded-md object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          {/* Animated Placeholder */}
          {showAnimation && (
            <span
              className={`absolute ${avatarUrl ? 'left-12' : 'left-4'} top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none`}
              aria-hidden="true"
            >
              {displayText}
              <span className="text-primary animate-pulse">|</span>
            </span>
          )}

          {/* Actual User Input */}
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isFocused ? "Enter ENS or address" : ""}
            className={`w-full h-full ${avatarUrl ? 'pl-12' : 'pl-4'} pr-2 text-lg border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0`}
          />

          {/* Static Suffix UI Component */}
          <span className="text-lg text-muted-foreground pr-4 select-none">
            {suffix}
          </span>
        </div>

        <Button
          size="default"
          onClick={handlePayClick}
          disabled={!userInput.trim()}
          className="h-10 px-6 text-sm rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
        >
          {buttonText}
        </Button>
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (searchSuggestions.length > 0 || isSearching) && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : searchSuggestions.length > 0 ? (
            searchSuggestions.map((suggestion, index) => (
              <div
                key={suggestion._id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`p-3 flex items-center gap-3 cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50 ${
                  selectedIndex === index ? 'bg-muted' : ''
                }`}
              >
                {/* Suggestion Avatar */}
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                  suggestion.isDirect ? 'bg-primary/20 text-primary' : 'bg-muted'
                }`}>
                  {suggestion.isDirect ? '🌐' : suggestion.domain_name.slice(0, 2).toUpperCase()}
                </div>

                {/* Suggestion Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className={`font-medium truncate ${
                    suggestion.isDirect ? 'text-primary' : 'text-foreground'
                  }`}>
                    {suggestion.domain_name}
                    {suggestion.isDirect && <span className="ml-2 text-xs bg-primary/10 px-1.5 py-0.5 rounded text-primary">ENS</span>}
                  </div>
                  {suggestion.description && (
                    <div className="text-sm text-muted-foreground truncate">
                      {suggestion.description}
                    </div>
                  )}
                  {suggestion.resolved_address && (
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {suggestion.resolved_address.slice(0, 10)}...{suggestion.resolved_address.slice(-4)}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : null}
        </div>
      )}

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-primary/5 rounded-xl blur-lg -z-10 scale-105" />
    </div>
  );
};
