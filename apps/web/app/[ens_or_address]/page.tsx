"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Separator } from "@workspace/ui/components/separator";
import { useParams } from "next/navigation";
import { useEnsTexts } from "@/hooks/use-ens-texts";
import { useEnsAllAddresses } from "@/hooks/use-ens-all-addresses";
import { useEnsAvatar, useEnsName, useEnsText } from "wagmi";
import { isAddress } from "viem";
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface PageProps {
  params: {
    ens_or_address: string;
  };
}

export default function EnsOrAddressPage({ params }: PageProps) {
  const { ens_or_address } = params;
  const decodedParam = decodeURIComponent(ens_or_address);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Check if it's an address or ENS name
  const isEthAddress = isAddress(decodedParam);
  const isEnsName = decodedParam.includes(".") && !isEthAddress;

  // ENS hooks
  const { data: ensName } = useEnsName({
    address: isEthAddress ? (decodedParam as `0x${string}`) : undefined,
    chainId: 1,
  });

  const ensNameToUse = isEnsName ? decodedParam : ensName || undefined;

  const { data: ensAvatar } = useEnsAvatar({
    name: ensNameToUse,
    chainId: 1,
  });

  const { data: ensDescription } = useEnsText({
    name: ensNameToUse,
    key: "description",
    chainId: 1,
  });

  const { data: ensTwitter } = useEnsText({
    name: ensNameToUse,
    key: "com.twitter",
    chainId: 1,
  });

  const { data: ensGithub } = useEnsText({
    name: ensNameToUse,
    key: "com.github",
    chainId: 1,
  });

  const { data: ensWebsite } = useEnsText({
    name: ensNameToUse,
    key: "url",
    chainId: 1,
  });

  const { data: allAddresses, isLoading: addressesLoading } =
    useEnsAllAddresses({
      name: ensNameToUse || "",
    });

  const displayName = isEnsName ? decodedParam : ensName || decodedParam;
  const displayAddress = isEthAddress ? decodedParam : undefined;

  const handlePay = () => {
    console.log("Initiating payment to:", displayName);
    // Payment logic will be implemented here
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  if (!isEthAddress && !isEnsName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Invalid Input
          </h1>
          <p className="text-muted-foreground mb-6">
            Please provide a valid Ethereum address or ENS name.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={ensAvatar || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {displayName}
              </h1>
              {displayAddress && (
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  {displayAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {ensDescription && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  About
                </h2>
                <p className="text-muted-foreground">{ensDescription}</p>
              </Card>
            )}

            {/* Social Links */}
            {(ensTwitter || ensGithub || ensWebsite) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Links
                </h2>
                <div className="space-y-3">
                  {ensWebsite && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">Website</Badge>
                      <a
                        href={
                          ensWebsite.startsWith("http")
                            ? ensWebsite
                            : `https://${ensWebsite}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center space-x-1"
                      >
                        <span>{ensWebsite}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {ensTwitter && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">Twitter</Badge>
                      <a
                        href={`https://twitter.com/${ensTwitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center space-x-1"
                      >
                        <span>@{ensTwitter}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {ensGithub && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">GitHub</Badge>
                      <a
                        href={`https://github.com/${ensGithub}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center space-x-1"
                      >
                        <span>{ensGithub}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Addresses */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Addresses
              </h2>
              {addressesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="w-20 h-6" />
                      <Skeleton className="w-64 h-6" />
                    </div>
                  ))}
                </div>
              ) : allAddresses && allAddresses.length > 0 ? (
                <div className="space-y-3">
                  {/* Always show Ethereum address first */}
                  {displayAddress && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Badge variant="secondary">Ethereum</Badge>
                        <span className="font-mono text-sm text-foreground truncate">
                          {displayAddress}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(displayAddress)}
                        className="ml-2 shrink-0"
                      >
                        {copiedAddress === displayAddress ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}

                  {allAddresses.map(({ network, address }) => (
                    <div
                      key={network}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Badge variant="secondary">{network}</Badge>
                        <span className="font-mono text-sm text-foreground truncate">
                          {address}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(address || "")}
                        className="ml-2 shrink-0"
                      >
                        {copiedAddress === address ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No additional addresses found.
                </p>
              )}
            </Card>
          </div>

          {/* Payment Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
                Send Payment
              </h2>

              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Recipient
                  </p>
                  <p className="font-medium text-foreground break-all">
                    {displayName}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Ready to send crypto to this recipient
                    </p>
                  </div>

                  <Button
                    onClick={handlePay}
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    PAY
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Secure payments powered by blockchain technology
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
