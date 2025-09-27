"use client";

import React, { useState } from "react";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Settings, Loader2, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAccount } from "wagmi";

interface StoreManagerProps {
  ownerAddress: string;
  displayName: string;
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

  const [settingsData, setSettingsData] = useState({
    store_enabled: storeSettings?.store_enabled ?? true,
    store_description: storeSettings?.store_description ?? "",
    accepted_tokens: storeSettings?.accepted_tokens?.join(", ") ?? "ETH, USDC",
    twitter: storeSettings?.social_links?.twitter ?? "",
    discord: storeSettings?.social_links?.discord ?? "",
    telegram: storeSettings?.social_links?.telegram ?? "",
    theme_color: storeSettings?.theme_color ?? "#000000",
  });

  // Update form when settings load
  React.useEffect(() => {
    if (storeSettings) {
      setSettingsData({
        store_enabled: storeSettings.store_enabled,
        store_description: storeSettings.store_description ?? "",
        accepted_tokens: storeSettings.accepted_tokens?.join(", ") ?? "ETH, USDC",
        twitter: storeSettings.social_links?.twitter ?? "",
        discord: storeSettings.social_links?.discord ?? "",
        telegram: storeSettings.social_links?.telegram ?? "",
        theme_color: storeSettings.theme_color ?? "#000000",
      });
    }
  }, [storeSettings]);

  if (!isOwner) {
    return null;
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateStoreSettings({
        owner_address: ownerAddress,
        store_enabled: settingsData.store_enabled,
        store_description: settingsData.store_description || undefined,
        accepted_tokens: settingsData.accepted_tokens
          .split(",")
          .map(token => token.trim())
          .filter(Boolean),
        social_links: {
          twitter: settingsData.twitter || undefined,
          discord: settingsData.discord || undefined,
          telegram: settingsData.telegram || undefined,
        },
        theme_color: settingsData.theme_color || undefined,
      });

      toast.success("Store settings updated!");
      setIsSettingsOpen(false);
    } catch (error) {
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
      console.error("Error toggling product:", error);
      toast.error("Failed to update product status");
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteProduct({ productId: productId as any });
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Store Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage your store settings and products
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {products?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {products?.filter(p => p.active).length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {products?.reduce((total, p) => total + (p.sold_count || 0), 0) || 0}
            </div>
            <div className="text-xs text-muted-foreground">Sales</div>
          </div>
        </div>
      </Card>

      {/* Products Management */}
      {products && products.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-4">Your Products</h3>
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product._id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{product.name}</span>
                    <Badge
                      variant={product.active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {product.active ? "Active" : "Inactive"}
                    </Badge>
                    {product.featured && (
                      <Badge variant="outline" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.price} {product.currency} • {product.sold_count || 0} sold
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleProduct(product._id, product.active)}
                  >
                    {product.active ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProduct(product._id, product.name)}
                    className="text-destructive hover:text-destructive"
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
                  setSettingsData({ ...settingsData, store_enabled: checked })
                }
              />
              <Label>Enable Store</Label>
            </div>

            <div>
              <Label htmlFor="store_description">Store Description</Label>
              <Textarea
                id="store_description"
                value={settingsData.store_description}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, store_description: e.target.value })
                }
                placeholder="Welcome to my store..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="accepted_tokens">Accepted Tokens</Label>
              <Input
                id="accepted_tokens"
                value={settingsData.accepted_tokens}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, accepted_tokens: e.target.value })
                }
                placeholder="ETH, USDC, MATIC"
              />
            </div>

            <div className="space-y-3">
              <Label>Social Links</Label>

              <Input
                placeholder="Twitter username"
                value={settingsData.twitter}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, twitter: e.target.value })
                }
              />

              <Input
                placeholder="Discord invite link"
                value={settingsData.discord}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, discord: e.target.value })
                }
              />

              <Input
                placeholder="Telegram link"
                value={settingsData.telegram}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, telegram: e.target.value })
                }
              />
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