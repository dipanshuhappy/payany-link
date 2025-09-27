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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  ownerAddress: string;
  ownerEns?: string;
  onProductCreated?: () => void;
}

export function ProductForm({
  isOpen,
  onClose,
  ownerAddress,
  ownerEns,
  onProductCreated
}: ProductFormProps) {
  const { address } = useAccount();
  const createProduct = useMutation(api.products.createProduct);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "ETH",
    product_type: "digital_download" as const,
    image_url: "",
    file_url: "",
    preview_url: "",
    max_supply: "",
    // Multi-chain pricing
    eth_price: "",
    usdc_price: "",
    matic_price: "",
    sol_price: "",
    btc_price: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user is the owner
  const isOwner = address?.toLowerCase() === ownerAddress.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      toast.error("You can only create products for your own profile");
      return;
    }

    if (!formData.name || !formData.description || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build prices object
      const prices: any = {};
      if (formData.eth_price) prices.eth = parseFloat(formData.eth_price);
      if (formData.usdc_price) prices.usdc = parseFloat(formData.usdc_price);
      if (formData.matic_price) prices.matic = parseFloat(formData.matic_price);
      if (formData.sol_price) prices.sol = parseFloat(formData.sol_price);
      if (formData.btc_price) prices.btc = parseFloat(formData.btc_price);

      const result = await createProduct({
        owner_address: ownerAddress,
        owner_ens: ownerEns,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        product_type: formData.product_type,
        image_url: formData.image_url || undefined,
        file_url: formData.file_url || undefined,
        preview_url: formData.preview_url || undefined,
        max_supply: formData.max_supply ? parseInt(formData.max_supply) : undefined,
        prices: Object.keys(prices).length > 0 ? prices : undefined,
      });

      if (result.success) {
        toast.success("Product created successfully!");

        // Reset form
        setFormData({
          name: "",
          description: "",
          price: "",
          currency: "ETH",
          product_type: "digital_download",
          image_url: "",
          file_url: "",
          preview_url: "",
          max_supply: "",
          eth_price: "",
          usdc_price: "",
          matic_price: "",
          sol_price: "",
          btc_price: "",
        });

        onProductCreated?.();
        onClose();
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome Product"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your product..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="MATIC">MATIC</SelectItem>
                    <SelectItem value="SOL">SOL</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="product_type">Product Type</Label>
              <Select value={formData.product_type} onValueChange={(value: any) => setFormData({ ...formData, product_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="digital_download">Digital Download</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Media & Files */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Media & Files</h3>

            <div>
              <Label htmlFor="image_url">Product Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="file_url">Download File URL</Label>
              <Input
                id="file_url"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://... (IPFS, secure storage, etc.)"
              />
            </div>

            <div>
              <Label htmlFor="preview_url">Preview URL</Label>
              <Input
                id="preview_url"
                value={formData.preview_url}
                onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Options</h3>

            <div>
              <Label htmlFor="max_supply">Max Supply (leave empty for unlimited)</Label>
              <Input
                id="max_supply"
                type="number"
                value={formData.max_supply}
                onChange={(e) => setFormData({ ...formData, max_supply: e.target.value })}
                placeholder="100"
              />
            </div>

            {/* Multi-chain pricing */}
            <div>
              <Label>Alternative Pricing (optional)</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="eth_price" className="text-sm">ETH Price</Label>
                  <Input
                    id="eth_price"
                    type="number"
                    step="0.001"
                    value={formData.eth_price}
                    onChange={(e) => setFormData({ ...formData, eth_price: e.target.value })}
                    placeholder="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="usdc_price" className="text-sm">USDC Price</Label>
                  <Input
                    id="usdc_price"
                    type="number"
                    step="0.01"
                    value={formData.usdc_price}
                    onChange={(e) => setFormData({ ...formData, usdc_price: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="matic_price" className="text-sm">MATIC Price</Label>
                  <Input
                    id="matic_price"
                    type="number"
                    step="0.01"
                    value={formData.matic_price}
                    onChange={(e) => setFormData({ ...formData, matic_price: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label htmlFor="sol_price" className="text-sm">SOL Price</Label>
                  <Input
                    id="sol_price"
                    type="number"
                    step="0.001"
                    value={formData.sol_price}
                    onChange={(e) => setFormData({ ...formData, sol_price: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddProductButton({
  ownerAddress,
  ownerEns,
  onProductCreated
}: {
  ownerAddress: string;
  ownerEns?: string;
  onProductCreated?: () => void;
}) {
  const { address } = useAccount();
  const router = useRouter();

  // Check if current user is the owner
  const isOwner = address?.toLowerCase() === ownerAddress.toLowerCase();

  if (!isOwner) {
    return null;
  }

  const handleAddProduct = () => {
    const params = new URLSearchParams();
    params.set("owner", ownerAddress);
    if (ownerEns) {
      params.set("ens", ownerEns);
    }
    router.push(`/create-product?${params.toString()}`);
  };

  return (
    <Button
      onClick={handleAddProduct}
      size="sm"
      className="rounded-full bg-foreground text-background hover:opacity-90 font-medium px-3 py-1.5 text-sm"
    >
      <Plus className="w-4 h-4 mr-1.5" />
      Add Product
    </Button>
  );
}