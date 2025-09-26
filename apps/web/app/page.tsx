"use client";
import React from "react";
import { Button } from "@workspace/ui/components/button";
import CardNav, { CardNavItem } from "@/components/CardNav";
import Silk from "@/components/Silk";
import { createLogoDataUrl } from "@/components/Logo";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { DynamicSuffixSearchBar } from "@/components/DynamicSuffixSearchBar";

const cardNavItems: CardNavItem[] = [
  {
    label: "How It Works",
    bgColor: "#f8f9fa",
    textColor: "#212529",
    links: [
      {
        label: "Getting Started",
        href: "/getting-started",
        ariaLabel: "Learn how to get started",
      },
      {
        label: "Payment Process",
        href: "/payment-process",
        ariaLabel: "Understand our payment process",
      },
      {
        label: "Security",
        href: "/security",
        ariaLabel: "Learn about our security measures",
      },
    ],
  },
  {
    label: "Search",
    bgColor: "#e3f2fd",
    textColor: "#1565c0",
    links: [
      {
        label: "Find Recipients",
        href: "/search",
        ariaLabel: "Search for payment recipients",
      },
      {
        label: "Transaction History",
        href: "/history",
        ariaLabel: "View your transaction history",
      },
      {
        label: "Help Center",
        href: "/help",
        ariaLabel: "Get help and support",
      },
    ],
  },
  {
    label: "Connect Wallet",
    bgColor: "#f3e5f5",
    textColor: "#7b1fa2",
    links: [
      {
        label: "MetaMask",
        href: "/connect/metamask",
        ariaLabel: "Connect your MetaMask wallet",
      },
      {
        label: "WalletConnect",
        href: "/connect/walletconnect",
        ariaLabel: "Connect via WalletConnect",
      },
      {
        label: "Coinbase Wallet",
        href: "/connect/coinbase",
        ariaLabel: "Connect your Coinbase wallet",
      },
    ],
  },
];

export default function Page() {
  return (
    <>
      <div className="min-h-screen relative overflow-hidden bg-black">
        {/* Silk Background */}
        <div className="absolute inset-0 w-full h-full">
          <Silk
            speed={3}
            scale={2}
            color="#7B7481"
            noiseIntensity={1.2}
            rotation={0.1}
          />
        </div>

        {/* Background Overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/30 z-5"></div>

        {/* CardNav */}
        <CardNav
          logo={createLogoDataUrl(32)}
          logoAlt="PayAny Logo"
          items={cardNavItems}
          baseColor="rgba(255, 255, 255, 0.95)"
          menuColor="#000"
          buttonBgColor="#5b33b6"
          buttonTextColor="#fff"
          className="z-50"
        />

        {/* Hero Section */}
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center px-4 max-w-6xl mx-auto">
            {/* Hero Text */}
            <div className="mb-12">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl">
                  PAY ANYONE
                </h1>
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl">
                  ANYHOW
                </h1>
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl">
                  ANYWHERE
                </h1>
              </div>

              {/* Subtitle */}
              <p className="mt-8 text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
                The future of payments is here. Send money globally with zero
                friction, maximum security, and complete freedom.
              </p>
            </div>

            {/* CTA Button */}
            <DynamicSuffixSearchBar
              placeholderNames={["vitalik.eth", "jesse.base.eth"]}
              suffix={".payany.link"}
              buttonText="Pay"
              onPay={() => {}}
            />

            {/* Additional Info */}
            <div className="mt-8 text-sm text-white/70">
              No registration required • Instant transfers • Global coverage
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-5"></div>
      </div>
      <ConnectButton />
    </>
  );
}
