"use client";

import React, { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ExternalLink, Package } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { AddProductButton } from "./ProductForm";
import PaymentModal from "./PaymentModal";

interface StoreSectionProps {
  ownerAddress: string;
  displayName: string;
  ownerEns?: string;
}

export function StoreSection({
  ownerAddress,
  displayName,
  ownerEns,
}: StoreSectionProps) {
  const { address } = useAccount();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Query products for this address
  const products = useQuery(
    api.products.getProductsByOwner,
    ownerAddress
      ? {
          owner_address: ownerAddress,
          activeOnly: true,
        }
      : "skip",
  );

  // Query store settings
  const storeSettings = useQuery(
    api.productAccess.getStoreSettings,
    ownerAddress
      ? {
          owner_address: ownerAddress,
        }
      : "skip",
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
      <Card className="p-6 border-0 bg-card/50">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              No products yet
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
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
    setSelectedProduct(product);
    setIsPaymentModalOpen(true);
  };

  return (
    <Card className="p-6 border-0 bg-card/50">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {storeSettings?.store_description
              ? `${displayName}'s Store`
              : "Products"}
          </h2>
          {storeSettings?.store_description && (
            <p className="text-muted-foreground text-sm">
              {storeSettings.store_description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
            {products.length} {products.length === 1 ? "Product" : "Products"}
          </Badge>
          {isOwner && (
            <AddProductButton
              ownerAddress={ownerAddress}
              ownerEns={ownerEns}
              onProductCreated={handleProductCreated}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-card border border-border rounded-xl p-5 hover:ring-1 hover:ring-ring/30 transition-all duration-200"
          >
            {product.image_url && (
              <div className="mb-4">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Product header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                {product.name}
              </h3>
              {product.featured && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-medium shrink-0">
                  Featured
                </Badge>
              )}
            </div>

            {/* Product type badge */}
            <div className="mb-3">
              <Badge variant="outline" className="text-xs font-medium">
                {product.product_type.replace("_", " ")}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
              {product.description}
            </p>

            {/* Price section */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-2xl text-foreground">
                  {product.price}
                </span>
                <span className="font-medium text-lg text-muted-foreground">
                  {product.currency}
                </span>
              </div>
              {(product.sold_count && product.sold_count > 0) ||
              (product.max_supply && product.max_supply > 0) ? (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {product.sold_count && product.sold_count > 0 && (
                    <span>{product.sold_count} sold</span>
                  )}
                  {product.max_supply && (
                    <span>
                      {product.max_supply - (product.sold_count || 0)} remaining
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Stock bar (only if limited supply) */}
            {product.max_supply && (
              <div className="mb-4">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        ((product.sold_count || 0) / product.max_supply) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Multi-chain pricing (compact) */}
            {product.prices && Object.keys(product.prices).length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(product.prices).map(
                    ([currency, price]) =>
                      price && (
                        <Badge
                          key={currency}
                          variant="secondary"
                          className="text-xs"
                        >
                          {price} {currency.toUpperCase()}
                        </Badge>
                      ),
                  )}
                </div>
              </div>
            )}

            {/* Buy button */}
            <Button
              onClick={() => handleProductPurchase(product)}
              className="w-full rounded-full bg-foreground text-background hover:opacity-90 font-medium py-2.5"
              disabled={
                !!(
                  product.max_supply &&
                  (product.sold_count || 0) >= product.max_supply
                )
              }
            >
              {product.max_supply &&
              (product.sold_count || 0) >= product.max_supply
                ? "Sold Out"
                : "Buy Now"}
            </Button>
          </div>
        ))}
      </div>

      {/* Store social links */}
      {storeSettings?.social_links && (
        <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Store Links</h3>
          <div className="flex items-center gap-3">
            {storeSettings.social_links.twitter && (
              <a
                href={`https://twitter.com/${storeSettings.social_links.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium text-foreground hover:text-primary transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium text-foreground hover:text-primary transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium text-foreground hover:text-primary transition-colors"
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
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              Accepts:{" "}
              {storeSettings.accepted_tokens?.join(", ") || "ETH, USDC"}
            </span>
            {products.reduce(
              (total, product) => total + (product.sold_count || 0),
              0,
            ) > 0 && (
              <span className="font-medium">
                Total sales:{" "}
                {products.reduce(
                  (total, product) => total + (product.sold_count || 0),
                  0,
                )}
              </span>
            )}
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedProduct(null);
        }}
        recipient={displayName}
        recipientAddress={ownerAddress}
        mode="buy"
        fixedAmount={selectedProduct?.price?.toString()}
        productName={selectedProduct?.name}
      />
    </Card>
  );
}
