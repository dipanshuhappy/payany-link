"use client";

import React, { useState, useCallback, Suspense } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
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
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  File,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";

interface FileUpload {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  storageId?: string;
  url?: string;
}

function CreateProductForm() {
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerAddress = searchParams.get("owner") || address || "";

  const generateUploadUrl = useMutation(api.files.createUploadUrl);
  const storeFileMetadata = useMutation(api.files.storeFileMetadata);
  const createProduct = useMutation(api.products.createProduct);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "PYUSD",
    product_type: "digital_download" as const,
    max_supply: "",
  });

  const [uploads, setUploads] = useState<{
    image?: FileUpload;
    productFile?: FileUpload;
    preview?: FileUpload;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload handler
  const uploadFile = async (
    file: File,
    purpose: "product_image" | "product_file" | "preview_file",
  ): Promise<{ storageId: string; url: string }> => {
    const uploadUrl = await generateUploadUrl();

    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    const { storageId } = await result.json();

    const fileMetadata = await storeFileMetadata({
      storageId,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: ownerAddress || "",
      purpose,
    });

    return { storageId, url: fileMetadata.url ?? '' };
  };

  // Image upload dropzone
  const onImageDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const fileUpload: FileUpload = {
        file,
        progress: 0,
        status: "uploading",
      };

      setUploads((prev) => ({ ...prev, image: fileUpload }));

      try {
        const result = await uploadFile(file, "product_image");
        setUploads((prev) => ({
          ...prev,
          image: {
            ...fileUpload,
            progress: 100,
            status: "completed",
            storageId: result.storageId,
            url: result.url,
          },
        }));
        toast.success("Image uploaded successfully!");
      } catch (error) {
        console.error("Image upload failed:", error);
        setUploads((prev) => ({
          ...prev,
          image: { ...fileUpload, status: "error" },
        }));
        toast.error("Image upload failed");
      }
    },
    [ownerAddress],
  );

  // Product file upload dropzone
  const onProductFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const fileUpload: FileUpload = {
        file,
        progress: 0,
        status: "uploading",
      };

      setUploads((prev) => ({ ...prev, productFile: fileUpload }));

      try {
        const result = await uploadFile(file, "product_file");
        setUploads((prev) => ({
          ...prev,
          productFile: {
            ...fileUpload,
            progress: 100,
            status: "completed",
            storageId: result.storageId,
            url: result.url,
          },
        }));
        toast.success("Product file uploaded successfully!");
      } catch (error) {
        console.error("Product file upload failed:", error);
        setUploads((prev) => ({
          ...prev,
          productFile: { ...fileUpload, status: "error" },
        }));
        toast.error("Product file upload failed");
      }
    },
    [ownerAddress],
  );

  const imageDropzone = useDropzone({
    onDrop: onImageDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const productFileDropzone = useDropzone({
    onDrop: onProductFileDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
      "text/*": [".txt", ".md"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.name || !formData.description || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createProduct({
        owner_address: ownerAddress,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        product_type: formData.product_type,
        image_url: uploads.image?.url,
        image_storage_id: uploads.image?.storageId as any,
        file_url: uploads.productFile?.url,
        file_storage_id: uploads.productFile?.storageId as any,
        preview_url: uploads.preview?.url,
        preview_storage_id: uploads.preview?.storageId as any,
        max_supply: formData.max_supply
          ? parseInt(formData.max_supply)
          : undefined,
      });

      if (result.success) {
        toast.success("Product created successfully!");
        router.push(`/sub/${ownerAddress}?created=true`);
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeUpload = (type: keyof typeof uploads) => {
    setUploads((prev) => ({ ...prev, [type]: undefined }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl hover:bg-muted/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Create New Product
            </h1>
            <p className="text-muted-foreground text-sm">
              Add a new product to your store
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Basic Information */}
              <Card className="p-6 border-0 bg-card/50">
                <h2 className="text-xl font-semibold mb-6 text-foreground">
                  Basic Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-foreground"
                    >
                      Product Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter product name"
                      className="mt-1.5 rounded-xl border-border bg-muted/50 focus:bg-background"
                      required
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-foreground"
                    >
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe your product in detail..."
                      rows={4}
                      className="mt-1.5 rounded-xl border-border bg-muted/50 focus:bg-background resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="price"
                        className="text-sm font-medium text-foreground"
                      >
                        Price *
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.001"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="0.1"
                        className="mt-1.5 rounded-xl border-border bg-muted/50 focus:bg-background"
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="currency"
                        className="text-sm font-medium text-foreground"
                      >
                        Currency
                      </Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) =>
                          setFormData({ ...formData, currency: value })
                        }
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl border-border bg-muted/50 focus:bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border">
                          <SelectItem value="PYUSD">PYUSD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product_type">Product Type</Label>
                      <Select
                        value={formData.product_type}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, product_type: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="digital_download">
                            Digital Download
                          </SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="subscription">
                            Subscription
                          </SelectItem>
                          <SelectItem value="donation">Donation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="max_supply">Max Supply (optional)</Label>
                      <Input
                        id="max_supply"
                        type="number"
                        value={formData.max_supply}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_supply: e.target.value,
                          })
                        }
                        placeholder="Leave empty for unlimited"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* File Uploads */}
              <Card className="p-6 border-0 bg-card/50">
                <h2 className="text-xl font-semibold mb-6 text-foreground">
                  Media & Files
                </h2>

                <div className="space-y-4">
                  {/* Product Image */}
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      Product Image
                    </Label>
                    <div
                      {...imageDropzone.getRootProps()}
                      className={`mt-1.5 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                        ${imageDropzone.isDragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30"}
                        ${uploads.image ? "border-primary bg-primary/5" : ""}
                        hover:border-primary hover:bg-primary/5
                      `}
                    >
                      <input {...imageDropzone.getInputProps()} />

                      {uploads.image ? (
                        <div className="space-y-3">
                          {uploads.image.status === "completed" &&
                            uploads.image.url && (
                              <img
                                src={uploads.image.url}
                                alt="Product preview"
                                className="w-32 h-32 object-cover rounded-lg mx-auto"
                              />
                            )}
                          <div className="flex items-center justify-center space-x-2">
                            {uploads.image.status === "uploading" && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {uploads.image.status === "completed" && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {uploads.image.status === "error" && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              {uploads.image.file.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUpload("image");
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              Drop your product image here
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product File */}
                  {formData.product_type === "digital_download" && (
                    <div>
                      <Label>Product File</Label>
                      <div
                        {...productFileDropzone.getRootProps()}
                        className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                          ${productFileDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                          ${uploads.productFile ? "border-green-500 bg-green-50" : ""}
                        `}
                      >
                        <input {...productFileDropzone.getInputProps()} />

                        {uploads.productFile ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center space-x-2">
                              {uploads.productFile.status === "uploading" && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                              {uploads.productFile.status === "completed" && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {uploads.productFile.status === "error" && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-sm font-medium">
                                {uploads.productFile.file.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeUpload("productFile");
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <File className="w-12 h-12 mx-auto text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                Drop your product file here
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PDF, ZIP, Images up to 50MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4 border-0 bg-card/50">
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                  Preview
                </h2>

                <div className="space-y-4">
                  {uploads.image?.url && (
                    <img
                      src={uploads.image.url}
                      alt="Product preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}

                  <div>
                    <h3 className="font-semibold text-lg">
                      {formData.name || "Product Name"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.description ||
                        "Product description will appear here..."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg">
                        {formData.price || "0"} {formData.currency}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {formData.product_type.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {uploads.productFile && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4" />
                        <span className="text-sm">
                          Digital download included
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full rounded-full bg-foreground text-background font-medium"
                    disabled
                  >
                    Preview - Buy Now
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl bg-muted/50 border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.name ||
                !formData.description ||
                !formData.price
              }
              className="min-w-[140px] rounded-full bg-foreground text-background hover:opacity-90 font-medium"
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateProductForm />
    </Suspense>
  );
}
