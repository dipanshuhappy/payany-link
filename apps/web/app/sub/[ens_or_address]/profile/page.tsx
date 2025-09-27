"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useEnsName } from "wagmi";
import { isAddress } from "viem";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Separator } from "@workspace/ui/components/separator";
import { toast } from "sonner";
import { ArrowLeft, Shield, Wallet } from "lucide-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const CHAIN_OPTIONS = [
  { id: 1, name: "Ethereum", symbol: "ETH" },
  { id: 137, name: "Polygon", symbol: "MATIC" },
  { id: 8453, name: "Base", symbol: "ETH" },
  { id: 10, name: "Optimism", symbol: "ETH" },
  { id: 42161, name: "Arbitrum", symbol: "ETH" },
];

const CURRENCY_OPTIONS = ["ETH", "USDC", "USDT"] as const;

export default function ProfilePage() {
  const { ens_or_address } = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const decodedParam = decodeURIComponent(ens_or_address as string);
  const isEthAddress = isAddress(decodedParam);
  const isEnsName = decodedParam.includes(".") && !isEthAddress;

  // Get ENS name if address is provided
  const { data: ensName } = useEnsName({
    address: isEthAddress ? (decodedParam as `0x${string}`) : undefined,
    chainId: 1,
  });

  // Query user data
  const userQuery = useQuery(
    api.users.getUserByWallet,
    address ? { wallet_address: address } : "skip"
  );

  // Mutations
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const toggleFiatEnabled = useMutation(api.users.toggleFiatEnabled);
  const updatePreferredCurrency = useMutation(api.users.updatePreferredCurrency);
  const updatePreferredChain = useMutation(api.users.updatePreferredChain);

  // Form state
  const [preferredCurrency, setPreferredCurrency] = useState<"ETH" | "USDC" | "USDT">("USDC");
  const [preferredChainId, setPreferredChainId] = useState(1);
  const [fiatEnabled, setFiatEnabled] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (userQuery) {
      setPreferredCurrency(userQuery.preferred_currency || "USDC");
      setPreferredChainId(userQuery.preferred_chain_id || 1);
      setFiatEnabled(userQuery.fiat_enabled || false);
    }
  }, [userQuery]);

  // Create user if doesn't exist
  useEffect(() => {
    if (isConnected && address && !userQuery) {
      createOrUpdateUser({
        wallet_address: address,
        ens_name: isEnsName ? decodedParam : ensName,
      });
    }
  }, [isConnected, address, userQuery, createOrUpdateUser, isEnsName, decodedParam, ensName]);

  // Check if current user owns this profile
  const isOwner = address &&
    (isEthAddress ? address.toLowerCase() === decodedParam.toLowerCase() :
     userQuery?.ens_names?.includes(decodedParam));


  const handleCurrencyChange = async (currency: "ETH" | "USDC" | "USDT") => {
    if (!address) return;

    try {
      await updatePreferredCurrency({
        wallet_address: address,
        preferred_currency: currency,
      });
      setPreferredCurrency(currency);
      toast.success("Preferred currency updated!");
    } catch (error) {
      toast.error("Failed to update currency preference");
      console.error(error);
    }
  };

  const handleChainChange = async (chainId: string) => {
    if (!address) return;

    const id = parseInt(chainId);
    try {
      await updatePreferredChain({
        wallet_address: address,
        preferred_chain_id: id,
      });
      setPreferredChainId(id);
      toast.success("Preferred chain updated!");
    } catch (error) {
      toast.error("Failed to update chain preference");
      console.error(error);
    }
  };

  const handleFiatToggle = async (enabled: boolean) => {
    if (!address) return;

    try {
      await toggleFiatEnabled({
        wallet_address: address,
        fiat_enabled: enabled,
      });
      setFiatEnabled(enabled);
      toast.success(enabled ? "Fiat payments enabled!" : "Fiat payments disabled");
    } catch (error: any) {
      toast.error(error.message || "Failed to update fiat setting");
      console.error(error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to manage your profile settings.
          </p>
          <Button onClick={openConnectModal} size="lg">
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to edit this profile.
          </p>
          <Button onClick={() => router.back()} variant="outline">
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
        <div className="flex items-center justify-between mb-8 pt-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
          </div>
          <Badge variant="outline" className="text-sm">
            {decodedParam}
          </Badge>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">
              <Wallet className="w-4 h-4 mr-2" />
              Payment Preferences
            </TabsTrigger>
            <TabsTrigger value="kyc">
              <Shield className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
          </TabsList>


          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Payment Preferences</h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="preferred_currency">Preferred Currency</Label>
                  <Select
                    value={preferredCurrency}
                    onValueChange={(value) => handleCurrencyChange(value as "ETH" | "USDC" | "USDT")}
                  >
                    <SelectTrigger id="preferred_currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will be your default payment currency
                  </p>
                </div>

                <div>
                  <Label htmlFor="preferred_chain">Preferred Chain</Label>
                  <Select
                    value={preferredChainId.toString()}
                    onValueChange={handleChainChange}
                  >
                    <SelectTrigger id="preferred_chain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAIN_OPTIONS.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id.toString()}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your preferred blockchain for receiving payments
                  </p>
                </div>

                <Separator />

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Current Settings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Default Currency:</span>
                      <Badge variant="outline">{preferredCurrency}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Default Chain:</span>
                      <Badge variant="outline">
                        {CHAIN_OPTIONS.find(c => c.id === preferredChainId)?.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crypto Payments:</span>
                      <Badge className="bg-green-500">Enabled</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Linked ENS Names</h2>
              <div className="space-y-2">
                {userQuery?.ens_names && userQuery.ens_names.length > 0 ? (
                  userQuery.ens_names.map((ens) => (
                    <div key={ens} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-mono">{ens}</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No ENS names linked to this wallet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Features</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h3 className="font-medium">KYC Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Required for fiat payment features
                    </p>
                  </div>
                  <Badge variant={userQuery?.kyc_status === "approved" ? "default" : "secondary"}>
                    {userQuery?.kyc_status || "Not Started"}
                  </Badge>
                </div>

                {userQuery?.kyc_status !== "approved" && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm">
                      KYC verification is coming soon. Once available, you'll be able to complete
                      verification here to unlock fiat payment features.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Feature Flags</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Fiat Payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Accept traditional currency payments
                    </p>
                  </div>
                  <Switch
                    checked={fiatEnabled}
                    onCheckedChange={handleFiatToggle}
                    disabled={userQuery?.kyc_status !== "approved"}
                  />
                </div>

                {userQuery?.kyc_status !== "approved" && (
                  <p className="text-xs text-muted-foreground">
                    Complete KYC verification to enable fiat payments
                  </p>
                )}

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Cryptocurrency Payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Accept crypto payments (always enabled)
                    </p>
                  </div>
                  <Badge className="bg-green-500">Enabled</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}