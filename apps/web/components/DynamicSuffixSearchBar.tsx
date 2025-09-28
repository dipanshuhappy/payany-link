"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import type React from "react";
import { useState, useEffect } from "react";
import { useEnsTexts } from "@/hooks/use-ens-texts";
import { isAddress } from "viem";
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

  const showAnimation = !userInput && !isFocused;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
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

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-primary/5 rounded-xl blur-lg -z-10 scale-105" />
    </div>
  );
};
