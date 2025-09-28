"use client";

import React, { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PyUSDFacilitatorSDK } from "@/lib/pyusd-facilitator-sdk";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

// PayPal types
interface PayPalOrderData {
  orderID: string;
  payerID?: string;
  paymentID?: string;
  billingToken?: string;
  facilitatorAccessToken?: string;
}

// Initialize SDK
const facilitatorSDK = new PyUSDFacilitatorSDK(
  process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3000",
);

export default function PayPalTest() {
  const [amount, setAmount] = useState("10.00");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { address } = useAccount();

  // Convex mutations
  const incrementFiatBalance = useMutation(api.users.incrementFiatBalance);
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  // Test PayPal order creation
  const createPayPalOrder = async () => {
    try {
      setIsLoading(true);
      setPaymentStatus("processing");

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount");
      }

      console.log("Creating PayPal order with amount:", amount);

      const orderResponse = await facilitatorSDK.createPayPalOrder(
        amount,
        "PayPal Integration Test Payment",
        window.location.origin + "/success",
      );

      console.log("PayPal order created:", orderResponse);
      setOrderDetails(orderResponse);

      if (orderResponse.orderId) {
        return orderResponse.orderId;
      } else {
        throw new Error("Failed to create PayPal order");
      }
    } catch (error) {
      console.error("PayPal order creation failed:", error);
      setPaymentStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to create order. Please try again.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PayPal payment success
  const handlePayPalSuccess = async (data: PayPalOrderData) => {
    try {
      setPaymentStatus("processing");
      console.log("PayPal payment approved:", data);

      const orderId = data.orderID;

      // Verify the payment
      console.log("Verifying payment...");
      const verifyResponse = await facilitatorSDK.verifyPayPalOrder(orderId);
      console.log("Verify response:", verifyResponse);

      if (!verifyResponse.valid) {
        throw new Error(verifyResponse.error || "Payment verification failed");
      }

      // Settle the payment
      console.log("Settling payment...");
      const settleResponse = await facilitatorSDK.settlePayPalOrder(orderId);
      console.log("Settle response:", settleResponse);

      if (!settleResponse.settled) {
        throw new Error(settleResponse.error || "Payment settlement failed");
      }

      // Update user balance if wallet is connected
      if (address) {
        console.log("Updating user balance...");

        await createOrUpdateUser({
          wallet_address: address,
        });

        const balanceResult = await incrementFiatBalance({
          wallet_address: address,
          amount: parseFloat(amount),
        });

        console.log("Balance updated:", balanceResult);
      }

      setPaymentStatus("success");
      toast.success("Payment completed successfully!");
    } catch (error) {
      console.error("PayPal payment processing failed:", error);
      setPaymentStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      toast.error(
        `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal Error:", error);
    setPaymentStatus("error");
    setErrorMessage("PayPal payment failed");
    toast.error("PayPal payment failed. Please try again.");
  };

  const resetTest = () => {
    setPaymentStatus("idle");
    setOrderDetails(null);
    setErrorMessage("");
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
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "success":
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            PayPal Integration Test
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Connection Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Wallet Connected:</span>
                <span className={address ? "text-green-600" : "text-red-600"}>
                  {address ? "✓ Connected" : "✗ Not Connected"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Facilitator URL:</span>
                <span className="text-muted-foreground">
                  {process.env.NEXT_PUBLIC_FACILITATOR_URL || "http://localhost:3000"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PayPal Client ID:</span>
                <span className={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? "text-green-600" : "text-red-600"}>
                  {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? "✓ Configured" : "✗ Missing"}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Test Amount (USD)</label>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                className="flex-1 px-3 py-2 border rounded-md"
                disabled={paymentStatus === "processing"}
                min="0.01"
                step="0.01"
              />
              <span className="text-muted-foreground">USD</span>
            </div>
          </div>

          {/* PayPal Buttons */}
          {amount && parseFloat(amount) > 0 && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center">
                PayPal Payment Test
                {getStatusIcon()}
              </h4>

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
                  disabled={paymentStatus === "processing"}
                  onInit={() => {
                    console.log("PayPal buttons initialized");
                  }}
                  onError={handlePayPalError}
                  createOrder={createPayPalOrder}
                  onApprove={handlePayPalSuccess}
                />
              </PayPalScriptProvider>
            </div>
          )}

          {/* Status Messages */}
          {paymentStatus === "success" && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                Payment Successful! 🎉
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Successfully processed ${amount} USD payment through PayPal.
                {address && " User fiat balance has been updated."}
              </p>
            </div>
          )}

          {paymentStatus === "error" && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Payment Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorMessage || "An unknown error occurred during payment processing."}
              </p>
            </div>
          )}

          {/* Order Details */}
          {orderDetails && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Order Details</h4>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                {JSON.stringify(orderDetails, null, 2)}
              </pre>
            </div>
          )}

          {/* Reset Button */}
          {(paymentStatus === "success" || paymentStatus === "error") && (
            <Button onClick={resetTest} variant="outline" className="w-full">
              Reset Test
            </Button>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Test Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Connect your wallet (optional, but required for balance updates)</li>
              <li>Enter a test amount (e.g., $10.00)</li>
              <li>Click the PayPal button and complete the sandbox payment</li>
              <li>Check the console for detailed logs</li>
              <li>Verify the payment status and any error messages</li>
            </ol>
            <p className="pt-2">
              <strong>Note:</strong> Make sure the PyUSD Facilitator service is running and PayPal credentials are configured.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
