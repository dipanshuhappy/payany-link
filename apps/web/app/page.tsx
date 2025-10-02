"use client";
import React from "react";
import Silk from "@/components/Silk";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { DynamicSuffixSearchBar } from "@/components/DynamicSuffixSearchBar";

export default function Page() {
  return (
    <>
      <div className="min-h-screen relative overflow-hidden bg-black">
        <div className="absolute inset-0 w-full h-full">
          <Silk
            speed={3}
            scale={2}
            color="#7B7481"
            noiseIntensity={1.2}
            rotation={0.1}
          />
        </div>

        <div className="absolute inset-0 bg-black/30 z-5"></div>

        <div className="absolute top-6 right-6 z-50">
          <ConnectButton />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center px-4 max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl">
                  PAY ANYONE
                </h1>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl">
                  ANYHOW
                </h1>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-2xl">
                  ANYWHERE
                </h1>
              </div>

              <p className="mt-6 text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
                Send crypto to anyone using their ENS name or wallet address
              </p>
            </div>

            <div className="mb-8">
              <DynamicSuffixSearchBar
                placeholderNames={["vitalik.eth", "jesse.base.eth"]}
                suffix={".payany.link"}
                buttonText="Pay"
                onPay={(value) => {
                  window.location.href = `https://${value}`;
                }}
              />
            </div>

            <div className="text-sm text-white/70">
              No registration required • Instant transfers • Global coverage
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-5"></div>
      </div>
    </>
  );
}
