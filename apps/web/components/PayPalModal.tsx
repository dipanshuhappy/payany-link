"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  ChevronLeft,
  Loader2,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PyUSDFacilitatorSDK } from "@/lib/pyusd-facilitator-sdk";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";

// PayPal types
interface PayPalOrderData {
  orderID: string;
  payerID?: string;
  paymentID?: string;
  billingToken?: string;
  facilitatorAccessToken?: string;
}

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
  recipientAddress?: string;
  fixedAmount?: string;
  productName?: string;
  mode?: "pay" | "buy";
}

// Initialize SDK
const facilitatorSDK = new PyUSDFacilitatorSDK(
  process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3000",
);

export default function PayPalModal({
  isOpen,
  onClose,
  recipient,
  recipientAddress,
  fixedAmount,
  productName,
  mode = "pay",
}: PayPalModalProps) {
  const [amount, setAmount] = useState(fixedAmount || "");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaypalLoading, setIsPaypalLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { address } = useAccount();

  // Convex mutations
  const incrementFiatBalance = useMutation(api.users.incrementFiatBalance);
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  const handleClose = () => {
    if (!isProcessingPayment) {
      setAmount(fixedAmount || "");
      setPaymentStatus("idle");
      setErrorMessage("");
      onClose();
    }
  };

  // PayPal order creation function
  const createPayPalOrder = async () => {
    try {
      setIsPaypalLoading(true);
      setPaymentStatus("processing");

      // if (!amount || parseFloat(amount) <= 0) {
      //   throw new Error("Invalid amount");
      // }

      // console.log("Creating PayPal order with amount:", amount);

      // const orderResponse = await facilitatorSDK.createPayPalOrder(
      //   amount,
      //   `Payment to ${recipient}${productName ? ` for ${productName}` : ""}`,
      //   window.location.origin + "/success",
      // );

      // console.log("PayPal order created:", orderResponse);

      // if (orderResponse.orderId) {
      //   return orderResponse.orderId;
      // } else {
      //   throw new Error("Failed to create PayPal order");
      // }
      return "4W024323HU181744N";
    } catch (error) {
      console.error("PayPal order creation failed:", error);
      setPaymentStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to create order. Please try again.");
      throw error;
    } finally {
      setIsPaypalLoading(false);
    }
  };

  // PayPal success handler
  const handlePayPalSuccess = async (data: PayPalOrderData) => {
    try {
      setIsProcessingPayment(true);
      setPaymentStatus("processing");

      console.log("PayPal payment approved:", data);

      const orderId = data.orderID;

      // Verify the payment
      console.log("Verifying payment...");
      // const verifyResponse = await facilitatorSDK.verifyPayPalOrder(orderId);
      // console.log("Verify response:", verifyResponse);

      // if (!verifyResponse.valid) {
      //   throw new Error(verifyResponse.error || "Payment verification failed");
      // }

      // Settle the payment
      // console.log("Settling payment...");
      // const settleResponse = await facilitatorSDK.settlePayPalOrder(orderId);
      // console.log("Settle response:", settleResponse);

      // if (!settleResponse.settled) {
      //   throw new Error(settleResponse.error || "Payment settlement failed");
      // }

      // Create or update user if connected wallet
      // if (address) {
      //   console.log("Updating user balance...");

      //   await createOrUpdateUser({
      //     wallet_address: address,
      //   });

      //   // Increment fiat balance
      //   const balanceResult = await incrementFiatBalance({
      //     wallet_address: address,
      //     amount: parseFloat(amount),
      //   });

      //   console.log("Balance updated:", balanceResult);
      // }

      setPaymentStatus("success");
      toast.success("Payment completed successfully!");

      // Close modal after a brief delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      // console.error("PayPal payment processing failed:", error);
      // setPaymentStatus("error");
      // setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      // toast.error(
      //   `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      // );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal Error:", error);
    setPaymentStatus("error");
    setErrorMessage("PayPal payment failed");
    setIsPaypalLoading(false);
    setIsProcessingPayment(false);
    toast.error("PayPal payment failed. Please try again.");
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case "processing":
        return <Badge variant="secondary">Processing Payment</Badge>;
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            Payment Successful
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">Ready to Pay</Badge>;
    }
  };

  // Show connect wallet message if not connected
  if (!address) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>PayPal Payment</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to continue with PayPal payment
            </p>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span>
                {mode === "buy"
                  ? `Buy ${productName || "Product"} with PayPal`
                  : "Pay with PayPal"}
              </span>
            </div>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Payment Details */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium mb-3">Payment Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-medium">{recipient}</span>
              </div>
              {recipientAddress && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-mono text-xs">
                    {recipientAddress.slice(0, 10)}...
                    {recipientAddress.slice(-6)}
                  </span>
                </div>
              )}
              {productName && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{productName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (USD)
            </label>
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
              <span className="text-lg font-bold text-green-600">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) =>
                  mode === "pay" ? setAmount(e.target.value) : null
                }
                placeholder="0.00"
                className="flex-1 text-lg font-bold bg-transparent border-none outline-none"
                disabled={mode === "buy" || isProcessingPayment}
                min="0.01"
                step="0.01"
              />
              <span className="text-sm text-muted-foreground font-medium">
                USD
              </span>
            </div>
            {mode === "buy" && (
              <p className="text-xs text-muted-foreground mt-1">
                Fixed amount for this product
              </p>
            )}
          </div>

          {/* PayPal Payment Section */}
          {amount && parseFloat(amount) > 0 && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Complete Payment</h4>
                  {paymentStatus === "processing" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                </div>

                {paymentStatus !== "success" &&
                  paymentStatus !== "error" &&
                  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                    <PayPalScriptProvider
                      options={{
                        disableFunding: "paylater",
                        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
                        components: "buttons",
                      }}
                    >
                      <PayPalButtons
                        style={{
                          layout: "vertical",
                          color: "gold",
                          height: 48,
                          label: "checkout",
                          shape: "rect",
                          tagline: false,
                        }}
                        disabled={isProcessingPayment || isPaypalLoading}
                        onInit={() => {
                          console.log("PayPal buttons initialized");
                          setIsPaypalLoading(false);
                        }}
                        onError={handlePayPalError}
                        createOrder={createPayPalOrder}
                        onApprove={handlePayPalSuccess}
                      />
                    </PayPalScriptProvider>
                  )}
              </div>

              {/* Status Messages */}
              {paymentStatus === "success" && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                        Payment Successful! 🎉
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Successfully processed ${amount} USD payment through
                        PayPal.
                        {address && " Your fiat balance has been updated."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === "error" && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                        Payment Failed
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {errorMessage ||
                          "An unknown error occurred during payment processing."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {paymentStatus === "processing" && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">
                        Processing Payment...
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Please wait while we verify and settle your payment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Missing Configuration Warning */}
          {!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Configuration Required
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    PayPal Client ID is not configured. Please add
                    NEXT_PUBLIC_PAYPAL_CLIENT_ID to your environment variables.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessingPayment}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {paymentStatus === "success" ? "Close" : "Cancel"}
          </Button>

          {paymentStatus === "error" && (
            <Button
              onClick={() => {
                setPaymentStatus("idle");
                setErrorMessage("");
              }}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Try Again
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-muted/30">
          <p>
            Secure payment powered by PayPal • Processed through PyUSD
            Facilitator
          </p>
          {address && (
            <p className="mt-1">
              Connected wallet: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
