"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Settings, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAccount } from "wagmi";

interface StoreManagerProps {
  ownerAddress: string;
  displayName?: string;
}

export function StoreManager({ ownerAddress, displayName }: StoreManagerProps) {
  const { address } = useAccount();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user is the owner
  const isOwner = address?.toLowerCase() === ownerAddress.toLowerCase();

  // Query store settings and products
  const storeSettings = useQuery(
    api.productAccess.getStoreSettings,
    ownerAddress ? { owner_address: ownerAddress } : "skip"
  );

  const products = useQuery(
    api.products.getProductsByOwner,
    ownerAddress ? { owner_address: ownerAddress, activeOnly: false } : "skip"
  );

  const updateStoreSettings = useMutation(api.productAccess.updateStoreSettings);
  const toggleProductStatus = useMutation(api.products.toggleProductStatus);
  const deleteProduct = useMutation(api.products.deleteProduct);

  // keep only the fields we need: enabled, tokenAddress (symbol or address), preferred_chain, and resolved settlement_token
  const [settingsData, setSettingsData] = useState({
    store_enabled: true,
    // tokenAddress can be a symbol (PYUSD/USDC/USDT) or a contract address
    tokenAddress: "PYUSD",
    preferred_chain: "arbitrum",
    // settlement_token will hold the resolved token address (text) that we persist separately
    settlement_token: "",
  });

  // Sync when storeSettings loads
  useEffect(() => {
    if (storeSettings) {
      setSettingsData((prev) => ({
        ...prev,
        store_enabled: storeSettings.store_enabled ?? true,
        // Use first accepted token if available (may already be an address)
        tokenAddress:
          (Array.isArray(storeSettings.accepted_tokens) && storeSettings.accepted_tokens[0]) ||
          prev.tokenAddress ||
          "PYUSD",
        preferred_chain: (storeSettings as any).preferred_chain ?? "arbitrum",
        // If backend has a settlement_token field, prefer that as the resolved address.
        // If it's missing, prefer accepted_tokens[0], otherwise default to PYUSD address.
        settlement_token:
          (storeSettings as any).settlement_token ??
          (Array.isArray(storeSettings.accepted_tokens) && storeSettings.accepted_tokens[0]) ??
          "0x46850ad61c2b7d64d08c9c754f45254596696984",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSettings]);

  if (!isOwner) {
    return null;
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Resolve selected token symbols to known token addresses for the chosen chain.
      // If the owner pasted an address, use that address as-is.
      // NOTE: addresses below are the common Arbitrum token addresses (WETH/USDC/USDT).
      // If you need other chains, extend the mapping accordingly.
      const tokenInput = settingsData.tokenAddress?.trim() || "";

      const symbolToAddressByChain: Record<string, Record<string, string>> = {
        arbitrum: {
          // PYUSD (Arbitrum)
          PYUSD: "0x46850ad61c2b7d64d08c9c754f45254596696984",
          // USDC (Arbitrum)
          USDC: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
          // USDT (Arbitrum)
          USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        },
      };

      const chainMap = symbolToAddressByChain[settingsData.preferred_chain] || {};
      let resolvedAddress: string | undefined;

      const looksLikeAddress = (v: string) =>
        /^0x[a-fA-F0-9]{40}$/.test(v);

      if (looksLikeAddress(tokenInput)) {
        resolvedAddress = tokenInput;
      } else {
        // tokenInput may be a symbol like 'ETH' or 'USDC'
        const upper = tokenInput.toUpperCase();
        resolvedAddress = chainMap[upper];
      }

      // Fallback: if we couldn't resolve, store the raw input (owner may have custom tokens).
      // If still undefined, default to PYUSD address.
      const settlementTokenToSave = resolvedAddress || tokenInput || "0x46850ad61c2b7d64d08c9c754f45254596696984";

      // Save accepted_tokens as an array of the resolved address (or raw value)
      const acceptedTokensArray = settlementTokenToSave ? [settlementTokenToSave] : undefined;

      await updateStoreSettings({
        owner_address: ownerAddress,
        store_enabled: settingsData.store_enabled,
        accepted_tokens: acceptedTokensArray,
        // persist preferred chain (e.g. "arbitrum")
        preferred_chain: settingsData.preferred_chain || undefined,
        // new singular settlement_token field (text) — send resolved address/raw value
        settlement_token: settlementTokenToSave || undefined,
      });

      toast.success("Store settings updated!");
      setIsSettingsOpen(false);
    } catch (error) {
      // The mutation may throw - show a user friendly message
      // and log for debugging
      // eslint-disable-next-line no-console
      console.error("Error updating store settings:", error);
      toast.error("Failed to update store settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProduct = async (productId: string, currentStatus: boolean) => {
    try {
      await toggleProductStatus({
        productId: productId as any,
        active: !currentStatus,
      });

      toast.success(`Product ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error toggling product:", error);
      toast.error("Failed to update product status");
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (
      // use browser confirm to avoid adding extra UI complexity here
      !confirm(
        `Are you sure you want to delete "${productName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteProduct({ productId: productId as any });
      toast.success("Product deleted successfully");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 border-0 bg-card/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Store Management</h3>
            <p className="text-sm text-muted-foreground">Manage your store settings</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-xl bg-muted/50 border-border hover:bg-muted"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </Card>

      {/* Products Management */}
      {products && products.length > 0 && (
        <Card className="p-6 border-0 bg-card/50">
          <h3 className="text-xl font-semibold text-foreground mb-4">Your Products</h3>
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product._id}
                className="flex items-center justify-between p-4 bg-background/50 border border-border/50 rounded-xl hover:bg-background/80 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{product.name}</span>
                    <Badge
                      variant={product.active ? "default" : "secondary"}
                      className={`text-xs font-medium px-2 py-0.5 ${product.active
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {product.active ? "Active" : "Inactive"}
                    </Badge>
                    {product.featured && (
                      <Badge className="bg-accent/10 text-accent border-accent/20 text-xs font-medium px-2 py-0.5">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.price} {product.currency} • {product.sold_count || 0} sold
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleProduct(product._id, product.active)}
                    className="w-8 h-8 p-0 hover:bg-muted rounded-lg"
                  >
                    {product.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProduct(product._id, product.name)}
                    className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Store Settings</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={settingsData.store_enabled}
                onCheckedChange={(checked) =>
                  setSettingsData({ ...settingsData, store_enabled: checked as boolean })
                }
              />
              <Label>Enable Store</Label>
            </div>



            {/* Token selector + address input */}
            <div>
              <Label>Accepted Token (select or paste address)</Label>
              <div className="flex gap-2 items-center">
                <select
                  value={
                    // If tokenAddress looks like a symbol (ETH/USDC/USDT) keep it,
                    // otherwise default to empty so owner can paste address.
                    ["", "PYUSD", "USDC", "USDT"].includes(settingsData.tokenAddress)
                      ? settingsData.tokenAddress
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      // clear only the select side; keep any pasted address
                      setSettingsData((s) => ({ ...s, tokenAddress: "" }));
                    } else {
                      // set tokenAddress equal to symbol (owner can still edit input afterwards)
                      setSettingsData((s) => ({ ...s, tokenAddress: val }));
                    }
                  }}
                  className="px-3 py-2 rounded-md border border-border bg-transparent text-foreground"
                >
                  <option value="">-- pick --</option>
                  <option value="PYUSD">PYUSD</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>

                <Input
                  value={settingsData.tokenAddress}
                  onChange={(e) =>
                    setSettingsData((s) => ({ ...s, tokenAddress: e.target.value }))
                  }
                  placeholder="Paste token contract address or leave as symbol (PYUSD, USDC, USDT)"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You can pick a common token or paste any ERC-20 address. The value will be saved
                as the accepted token for your store.
              </p>
            </div>

            {/* Chain dropdown (only arbitrum for now) */}
            <div>
              <Label htmlFor="preferred_chain">Preferred Chain</Label>
              <select
                id="preferred_chain"
                value={settingsData.preferred_chain}
                onChange={(e) =>
                  setSettingsData((s) => ({ ...s, preferred_chain: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-foreground"
              >
                <option value="arbitrum">arbitrum</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Currently supported chain option for Convex schema: arbitrum
              </p>
            </div>



            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
