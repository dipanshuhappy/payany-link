"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { CustomWagmiProvider } from "components/CustomWagmiProvider";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@workspace/ui/components/sonner";
import { config } from "@/lib/wagmi";
import ConvexProviderWrapper from "./providers/convex-provider";
const queryClient = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
        <ConvexProviderWrapper>
        <QueryClientProvider client={queryClient}>
          <CustomWagmiProvider>
          <RainbowKitProvider>
              {children}
              <Toaster />
            </RainbowKitProvider>
          </CustomWagmiProvider>
      </QueryClientProvider>
        </ConvexProviderWrapper>
    </NextThemesProvider>
  );
}
