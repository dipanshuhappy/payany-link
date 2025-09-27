"use client";

import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ExternalLink, Package } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { AddProductButton } from "./ProductForm";

interface StoreSectionProps {
  ownerAddress: string;
  displayName: string;
  ownerEns?: string;
}

export function StoreSection({ ownerAddress, displayName, ownerEns }: StoreSectionProps) {
  const { address } = useAccount();

  // Query products for this address
  const products = useQuery(
    api.products.getProductsByOwner,
    ownerAddress ? {
      owner_address: ownerAddress,
      activeOnly: true,
    } : "skip"
  );

  // Query store settings
  const storeSettings = useQuery(
    api.productAccess.getStoreSettings,
    ownerAddress ? {
      owner_address: ownerAddress,
    } : "skip"
  );

  const handleProductCreated = () => {
    // Force refresh the products query
    // The query will automatically refetch due to Convex reactivity
  };

  const isOwner = address?.toLowerCase() === ownerAddress.toLowerCase();

  // Show empty state for owners, nothing for non-owners
  if (!products || products.length === 0) {

    if (!isOwner) {
      return null; // Don't show anything to non-owners when no products
    }

    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No products yet</h3>
            <p className="text-muted-foreground text-sm">
              Start building your store by creating your first product
            </p>
          </div>
          <AddProductButton
            ownerAddress={ownerAddress}
            ownerEns={ownerEns}
            onProductCreated={handleProductCreated}
          />
        </div>
      </Card>
    );
  }

  const handleProductPurchase = (product: any) => {
    // TODO: Implement actual purchase logic
    toast.success("Product purchase coming soon!");
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {storeSettings?.store_description ? `${displayName}'s Store` : "Products"}
        </h2>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">
            {products.length} {products.length === 1 ? "Product" : "Products"}
          </Badge>
        </div>
      </div>

      <AddProductButton
        ownerAddress={ownerAddress}
        ownerEns={ownerEns}
        onProductCreated={handleProductCreated}
      />

      {storeSettings?.store_description && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground text-sm">
            {storeSettings.store_description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product) => (
          <div
            key={product._id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {product.image_url && (
              <div className="mb-3">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{product.name}</h3>
                {product.featured && (
                  <Badge variant="default" className="text-xs">
                    Featured
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-lg">
                      {product.price} {product.currency}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {product.product_type.replace("_", " ")}
                    </Badge>
                  </div>
                  {product.sold_count && product.sold_count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {product.sold_count} sold
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleProductPurchase(product)}
                  className="bg-primary hover:bg-primary/90"
                  disabled={
                    product.max_supply &&
                    (product.sold_count || 0) >= product.max_supply
                  }
                >
                  {product.max_supply && (product.sold_count || 0) >= product.max_supply
                    ? "Sold Out"
                    : "Buy Now"}
                </Button>
              </div>

              {product.max_supply && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Stock</span>
                    <span>
                      {product.max_supply - (product.sold_count || 0)} / {product.max_supply}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{
                        width: `${
                          ((product.sold_count || 0) / product.max_supply) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Multi-chain pricing */}
              {product.prices && Object.keys(product.prices).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Alternative pricing:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.prices).map(([currency, price]) => (
                      price && (
                        <Badge key={currency} variant="outline" className="text-xs">
                          {price} {currency.toUpperCase()}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Store social links */}
      {storeSettings?.social_links && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-medium text-foreground mb-3">Store Links</h3>
          <div className="flex items-center space-x-4">
            {storeSettings.social_links.twitter && (
              <a
                href={`https://twitter.com/${storeSettings.social_links.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center space-x-1"
              >
                <span>Twitter</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {storeSettings.social_links.discord && (
              <a
                href={storeSettings.social_links.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center space-x-1"
              >
                <span>Discord</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {storeSettings.social_links.telegram && (
              <a
                href={storeSettings.social_links.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center space-x-1"
              >
                <span>Telegram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Store stats */}
      {storeSettings && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Accepts: {storeSettings.accepted_tokens?.join(", ") || "ETH, USDC"}
            </span>
            {products.reduce((total, product) => total + (product.sold_count || 0), 0) > 0 && (
              <span>
                Total sales: {products.reduce((total, product) => total + (product.sold_count || 0), 0)}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}