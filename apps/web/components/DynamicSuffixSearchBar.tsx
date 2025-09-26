"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import type React from "react";
import { useState, useEffect } from "react";
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

  // useEffect for the placeholder typing animation
  useEffect(() => {
    // Pause animation if user is interacting
    if (userInput || isFocused) {
      setDisplayText(""); // Clear animated text when focused
      return;
    }

    const currentName = placeholderNames[currentNameIndex];

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
    <div className="relative">
      <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-2xl shadow-2xl max-w-3xl mx-auto">
        <div className="flex-1 flex items-center h-16 md:h-20 relative">
          {/* Animated Placeholder */}
          {showAnimation && (
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl md:text-3xl text-muted-foreground pointer-events-none"
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
            className="w-full h-full pl-4 pr-2 text-2xl md:text-3xl border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {/* Static Suffix UI Component */}
          <span className="text-2xl md:text-3xl text-muted-foreground pr-4 select-none">
            {suffix}
          </span>
        </div>

        <Button
          size="lg"
          onClick={handlePayClick}
          disabled={!userInput.trim()}
          className="h-12 md:h-16 px-8 md:px-12 text-lg md:text-xl font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
        >
          {buttonText}
        </Button>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl -z-10 scale-105" />
    </div>
  );
};
