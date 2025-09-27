"use client";
"4c45c2ee-0be4-440b-a0e5-38ddf0fb19e6.7044c53d-24e1-47ee-a7c6-0ebdbe675364";
"payany-link";
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
import { useEnsAvatar, useEnsName } from "wagmi";
import { isAddress } from "viem";
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import PaymentModal from "@/components/PaymentModal";

export default function EnsOrAddressPage() {
  const { ens_or_address } = useParams();
  const decodedParam = decodeURIComponent(ens_or_address as string);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Check if it's an address or ENS name
  const isEthAddress = isAddress(decodedParam);
  const isEnsName = decodedParam.includes(".") && !isEthAddress;

  // ENS hooks
  const { data: ensName, isLoading: ensNameLoading } = useEnsName({
    address: isEthAddress ? (decodedParam as `0x${string}`) : undefined,
    chainId: 1,
  });

  const ensNameToUse = isEnsName ? decodedParam : ensName || undefined;

  const { data: ensAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: ensNameToUse,
    chainId: 1,
  });

  const { data: ensTexts, isLoading: textsLoading } = useEnsTexts({
    name: ensNameToUse || "",
    keys: ["description", "com.twitter", "com.github", "url"],
  });

  // Extract individual values from the batch response
  const ensDescription = ensTexts?.find((t) => t.key === "description")?.value;
  const ensTwitter = ensTexts?.find((t) => t.key === "com.twitter")?.value;
  const ensGithub = ensTexts?.find((t) => t.key === "com.github")?.value;
  const ensWebsite = ensTexts?.find((t) => t.key === "url")?.value;
  console.log(ensGithub, "github");

  const { data: allAddresses, isLoading: addressesLoading } =
    useEnsAllAddresses({
      name: ensNameToUse || "",
    });

  const displayName = isEnsName ? decodedParam : ensName || decodedParam;
  const displayAddress = isEthAddress ? decodedParam : undefined;

  // Generate Dicebear avatar for addresses
  const getDicebearAvatar = (address: string) => {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
  };

  const avatarSrc = isEthAddress
    ? getDicebearAvatar(decodedParam)
    : ensAvatar || undefined;

  const isLoadingProfile = isEthAddress
    ? false // For addresses, we don't need to load ENS data
    : ensNameLoading || avatarLoading || textsLoading;
  const isLoadingSocials = isEthAddress
    ? false // For addresses, we don't load social data
    : textsLoading;

  const handlePay = () => {
    setIsPaymentModalOpen(true);
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
            {isLoadingProfile ? (
              <Skeleton className="w-24 h-24 rounded-full" />
            ) : (
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="text-center">
              {isLoadingProfile ? (
                <>
                  <Skeleton className="h-9 w-48 mx-auto mb-2" />
                  {displayAddress && <Skeleton className="h-5 w-64 mx-auto" />}
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-foreground">
                    {displayName}
                  </h1>
                  {displayAddress && (
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                      {displayAddress}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description - Only show for ENS names */}
            {!isEthAddress &&
              (textsLoading ? (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">
                    About
                  </h2>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ) : (
                ensDescription && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                      About
                    </h2>
                    <p className="text-muted-foreground">{ensDescription}</p>
                  </Card>
                )
              ))}

            {/* Social Links - Only show for ENS names */}
            {!isEthAddress &&
              (isLoadingSocials ? (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Links
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-16 h-6" />
                      <Skeleton className="w-32 h-4" />
                    </div>
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-16 h-6" />
                      <Skeleton className="w-32 h-4" />
                    </div>
                  </div>
                </Card>
              ) : (
                (ensTwitter || ensGithub || ensWebsite) && (
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
                )
              ))}

            {/* Addresses */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {isEthAddress ? "Address" : "Addresses"}
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
              ) : (
                <div className="space-y-3">
                  {/* Show Ethereum address for both scenarios */}
                  {(isEthAddress || displayAddress) && (
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Badge
                          variant="default"
                          className="bg-primary text-primary-foreground"
                        >
                          Ethereum
                        </Badge>
                        <span className="font-mono text-sm text-foreground truncate">
                          {isEthAddress ? decodedParam : displayAddress}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            isEthAddress ? decodedParam : displayAddress || "",
                          )
                        }
                        className="ml-2 shrink-0 hover:bg-primary/20"
                      >
                        {copiedAddress ===
                        (isEthAddress ? decodedParam : displayAddress) ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Show additional addresses for ENS names */}
                  {!isEthAddress && allAddresses && allAddresses.length > 0 && (
                    <>
                      <div className="flex items-center space-x-2 mt-4 mb-2">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-xs text-muted-foreground px-2">
                          Multi-chain Addresses
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>
                      {allAddresses.map(({ network, address }) => (
                        <div
                          key={network}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Badge variant="outline">{network}</Badge>
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
                    </>
                  )}
                </div>
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

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        recipient={displayName}
        recipientAddress={isEthAddress ? decodedParam : displayAddress}
      />
    </div>
  );
}
