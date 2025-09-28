/**
 * PyUSD Facilitator API SDK
 * Minimal client for interacting with the PyUSD 402+ facilitator service
 */

export interface PaymentRequirements {
  method: "crypto" | "fiat-paypal";
  amount?: string;
  description?: string;
  success_url?: string;
  network?: string;
  asset?: string;
  recipient?: string;
}

export interface FiatPaypalRequirements {
  method: "fiat-paypal";
  orderId: string;
}

export interface PaymentPayload {
  // x402 payment payload structure
  [key: string]: any;
}

export interface CreateOrderResponse {
  orderId: string;
  type: "fiat-paypal" | "crypto";
  message: string;
  amount?: string;
  approvalUrl?: string;
  status?: string;
  paymentRequirements?: FiatPaypalRequirements;
}

export interface VerifyResponse {
  valid: boolean;
  paypal_order_status?: string;
  message?: string;
  error?: string;
  details?: string;
}

export interface SettleResponse {
  settled: boolean;
  paypal_order_id?: string;
  paypal_order_status?: string;
  message?: string;
  error?: string;
  details?: string;
}

export interface SupportedPaymentKind {
  x402Version: number;
  scheme: "exact";
  network: string;
}

export interface SupportedResponse {
  kinds: SupportedPaymentKind[];
}

export class PyUSDFacilitatorSDK {
  private baseUrl: string;

  constructor(
    baseUrl: string = "https://pyusd-402-plus-facilitator-jez1ljit3-dipanshuhappys-projects.vercel.app",
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Create a payment request (order)
   */
  async createPaymentRequest(
    requirements: PaymentRequirements,
  ): Promise<CreateOrderResponse> {
    const response = await fetch(`${this.baseUrl}/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requirements),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(`Request failed: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verify a payment
   */
  async verifyPayment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements | FiatPaypalRequirements,
  ): Promise<VerifyResponse> {
    const response = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(`Verify failed: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Settle a payment
   */
  async settlePayment(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements | FiatPaypalRequirements,
  ): Promise<SettleResponse> {
    const response = await fetch(`${this.baseUrl}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(`Settle failed: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get supported payment kinds
   */
  async getSupportedPayments(): Promise<SupportedResponse> {
    const response = await fetch(`${this.baseUrl}/supported`);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Supported failed: ${error.error || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Create a PayPal payment order
   */
  async createPayPalOrder(
    amount: string,
    description?: string,
    successUrl?: string,
  ): Promise<CreateOrderResponse> {
    return this.createPaymentRequest({
      method: "fiat-paypal",
      amount,
      description,
      success_url: successUrl,
    });
  }

  /**
   * Create a crypto payment request
   */
  async createCryptoPayment(requirements: {
    network?: string;
    asset?: string;
    recipient?: string;
    amount?: string;
  }): Promise<CreateOrderResponse> {
    return this.createPaymentRequest({
      method: "crypto",
      ...requirements,
    });
  }

  /**
   * Verify PayPal order by order ID
   */
  async verifyPayPalOrder(orderId: string): Promise<VerifyResponse> {
    return this.verifyPayment({}, { method: "fiat-paypal", orderId });
  }

  /**
   * Settle PayPal order by order ID
   */
  async settlePayPalOrder(orderId: string): Promise<SettleResponse> {
    return this.settlePayment({}, { method: "fiat-paypal", orderId });
  }
}

// Default instance
export const facilitatorSDK = new PyUSDFacilitatorSDK();

// Named export for custom instances
export { PyUSDFacilitatorSDK as FacilitatorSDK };
