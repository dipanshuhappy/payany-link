/* eslint-env node */
// @ts-nocheck

import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { z } from "zod";

import { verify, settle } from "x402/facilitator";
import {
  PaymentRequirementsSchema as BasePaymentRequirementsSchema,
  type PaymentRequirements,
  type PaymentPayload,
  PaymentPayloadSchema,
  createConnectedClient,
  createSigner,
  Signer,
  ConnectedClient,
  SupportedPaymentKind,
} from "x402/types";

// PayPal SDK imports
import {
  Client,
  Environment,
  LogLevel,
  CheckoutPaymentIntent,
  OrdersController,
} from "@paypal/paypal-server-sdk";

config();

// Extended PaymentRequirementsSchema with method enums
const PaymentMethodEnum = z.enum(["crypto", "fiat-paypal"]);

export const PaymentRequirementsSchema = BasePaymentRequirementsSchema.extend({
  method: PaymentMethodEnum,
});

// Minimal schema for fiat-paypal that doesn't require much validation
export const FiatPaypalRequirementsSchema = z.object({
  method: z.literal("fiat-paypal"),
  orderId: z.string(),
});

export type ExtendedPaymentRequirements = z.infer<
  typeof PaymentRequirementsSchema
>;
export type FiatPaypalRequirements = z.infer<
  typeof FiatPaypalRequirementsSchema
>;

// Origin chain and token configuration
const ORIGIN_CHAIN = "arbitrum";
const ORIGIN_TOKEN_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"; // Placeholder token address
const ENABLED_METHODS = ["crypto", "fiat-paypal"];
const DEFAULT_METHOD = "crypto";
// Custom supported networks for bridging
const SUPPORTED_NETWORKS = ["base", "polygon", "arbitrum"];

// Mock bridge function
async function bridgeTokens(
  fromNetwork: string,
  toNetwork: string,
  tokenAddress: string,
  amount: string,
  recipient: string,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log(`Bridging ${amount} tokens from ${fromNetwork} to ${toNetwork}`);
  console.log(`Token: ${tokenAddress}, Recipient: ${recipient}`);
  return {
    success: true,
    txHash: `0x${"a".repeat(64)}`, // Mock transaction hash
  };
}

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || "";

// if (!EVM_PRIVATE_KEY) {
//   console.error("Missing required environment variables");
//   process.exit(1);
// }

// PayPal Client Setup
export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_SECRET,
  },
  timeout: 0,
  environment: Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
  },
});

const ordersController = new OrdersController(paypalClient);

const app = new Hono();

// Middleware
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://payany.link",
      "https://*.payany.link",
      "https://pyusd-402-plus-facilitator-jez1ljit3-dipanshuhappys-projects.vercel.app",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    credentials: true,
  }),
);
app.use("*", logger());
app.use("*", prettyJSON());

// ---------------- Types ----------------
type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements:
    | PaymentRequirements
    | ExtendedPaymentRequirements
    | FiatPaypalRequirements;
};

type SettleRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements:
    | PaymentRequirements
    | ExtendedPaymentRequirements
    | FiatPaypalRequirements;
};

// ---------------- Routes ----------------

// GET /verify
app.get("/verify", (c) => {
  return c.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      paymentPayload: "PaymentPayload",
      paymentRequirements: "PaymentRequirements",
    },
  });
});

app.post("/request", async (c) => {
  try {
    const body = await c.req.json();

    // Validate the request body against the extended schema
    const validationResult = PaymentRequirementsSchema.pars(body);

    if (!validationResult.success) {
      return c.json(
        {
          error: `Invalid request body: ${validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        },
        400,
      );
    }

    const paymentRequirements = validationResult.data;

    // Check the method and return appropriate response
    if (paymentRequirements.method === "crypto") {
      // Return fallback text for crypto payments
      return c.json({
        message: "Fallback to 402x in order to proceed with payment",
        type: "crypto",
      });
    } else if (paymentRequirements.method === "fiat-paypal") {
      // Check if PayPal credentials are available
      if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
        return c.json(
          {
            error: "PayPal credentials not configured",
          },
          500,
        );
      }

      try {
        // Create PayPal order using the provided schema data
        const metadataId = `metadata_${Date.now()}`;
        // Extract amount from paymentRequirements or use default
        const amount = (paymentRequirements as any).amount || "10.00";
        // Extract description from paymentRequirements or use default
        const description =
          (paymentRequirements as any).description ||
          "Payment via PayAny Money";

        const { result } = await ordersController.createOrder({
          body: {
            intent: CheckoutPaymentIntent.Capture,
            purchaseUnits: [
              {
                customId: metadataId,
                amount: {
                  currencyCode: "USD",
                  value: amount,
                  breakdown: {
                    itemTotal: {
                      currencyCode: "USD",
                      value: amount,
                    },
                  },
                },
                description: description,
                items: [
                  {
                    name: "PayAny Money Payment",
                    unitAmount: {
                      currencyCode: "USD",
                      value: amount,
                    },
                    description: description,
                    quantity: "1",
                  },
                ],
              },
            ],
            applicationContext: {
              returnUrl:
                (body as any).success_url || "https://example.com/success",
            },
            paymentSource: {
              paypal: {
                experienceContext: {
                  brandName: "PayAny Money",
                },
              },
            },
          },
          prefer: "return=minimal",
        });

        return c.json({
          orderId: result.id,
          type: "fiat-paypal",
          message: "PayPal payment order created successfully",
          amount: amount,
          approvalUrl: result.links?.find((link: any) => link.rel === "approve")
            ?.href,
          status: result.status,
          // Return in format suitable for verify/settle endpoints
          paymentRequirements: {
            method: "fiat-paypal",
            orderId: result.id,
          },
        });
      } catch (paypalError) {
        console.error("PayPal order creation error:", paypalError);
        return c.json(
          {
            error: "Failed to create PayPal order",
            details:
              paypalError instanceof Error
                ? paypalError.message
                : "Unknown error",
          },
          500,
        );
      }
    } else {
      return c.json({ error: "Unsupported payment method" }, 400);
    }
  } catch (error) {
    console.error("error", error);
    return c.json({ error: "Invalid request" }, 400);
  }
});
// POST /verify
app.post("/verify", async (c) => {
  try {
    const body: VerifyRequest = await c.req.json();

    // Check if this is a fiat-paypal payment
    if (
      body.paymentRequirements &&
      (body.paymentRequirements as any).method === "fiat-paypal"
    ) {
      const fiatPaypalRequirements = FiatPaypalRequirementsSchema.parse(
        body.paymentRequirements,
      );

      // For fiat-paypal, capture the PayPal order if not captured
      try {
        const order = await ordersController.captureOrder({
          id: fiatPaypalRequirements.orderId,
        });

        return c.json({
          valid: true,
          paypal_order_status: order.result.status,
          message: "PayPal order captured successfully",
        });
      } catch (paypalError) {
        console.error("PayPal capture error:", paypalError);
        return c.json({
          valid: false,
          error: "Failed to capture PayPal order",
          details:
            paypalError instanceof Error
              ? paypalError.message
              : "Unknown error",
        });
      }
    }

    // For crypto payments, use existing verification
    const paymentRequirements = BasePaymentRequirementsSchema.parse(
      body.paymentRequirements,
    );
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    // Skip network and asset validation for verify - allow any network/asset
    const client = createConnectedClient(paymentRequirements.network as any);

    //@ts-ignore
    const valid = await verify(client, paymentPayload, paymentRequirements);
    return c.json(valid);
  } catch (error) {
    console.error("error", error);
    return c.json({ error: "Invalid request" }, 400);
  }
});

// GET /settle
app.get("/settle", (c) => {
  return c.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments",
    body: {
      paymentPayload: "PaymentPayload",
      paymentRequirements: "PaymentRequirements",
    },
  });
});

// GET /supported
app.get("/supported", async (c) => {
  let kinds: SupportedPaymentKind[] = [];

  if (EVM_PRIVATE_KEY) {
    // Add all supported networks
    SUPPORTED_NETWORKS.forEach((network) => {
      kinds.push({
        x402Version: 1,
        scheme: "exact" as const,
        network: network as any,
      } as any);
    });
  }

  return c.json({ kinds });
});

// POST /settle
app.post("/settle", async (c) => {
  try {
    const body: SettleRequest = await c.req.json();

    // Check if this is a fiat-paypal payment
    if (
      body.paymentRequirements &&
      (body.paymentRequirements as any).method === "fiat-paypal"
    ) {
      const fiatPaypalRequirements = FiatPaypalRequirementsSchema.parse(
        body.paymentRequirements,
      );

      // For fiat-paypal, check if order exists and is settled
      try {
        const order = await ordersController.getOrder({
          id: fiatPaypalRequirements.orderId,
        });

        if (order.result.status === "COMPLETED") {
          return c.json({
            settled: true,
            paypal_order_id: fiatPaypalRequirements.orderId,
            paypal_order_status: order.result.status,
            message: "PayPal order is already settled",
          });
        } else {
          return c.json({
            settled: false,
            paypal_order_id: fiatPaypalRequirements.orderId,
            paypal_order_status: order.result.status,
            message: "PayPal order is not yet completed",
          });
        }
      } catch (paypalError) {
        console.error("PayPal order check error:", paypalError);
        return c.json({
          settled: false,
          error: "Failed to check PayPal order status",
          details:
            paypalError instanceof Error
              ? paypalError.message
              : "Unknown error",
        });
      }
    }

    // For crypto payments, use existing settlement logic
    const paymentRequirements = BasePaymentRequirementsSchema.parse(
      body.paymentRequirements,
    );
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    // Check if bridging is needed
    const needsBridging = (paymentRequirements.network as any) !== ORIGIN_CHAIN;

    let response;
    if (needsBridging) {
      // Bridge tokens to origin chain first
      console.log(
        `Bridging required: ${paymentRequirements.network} -> ${ORIGIN_CHAIN}`,
      );

      const bridgeResult = await bridgeTokens(
        paymentRequirements.network as string,
        ORIGIN_CHAIN,
        paymentRequirements.asset as string,
        paymentRequirements.amount as string,
        typeof paymentPayload.payload === "string"
          ? paymentPayload.payload
          : JSON.stringify(paymentPayload.payload),
      );

      if (!bridgeResult.success) {
        throw new Error(`Bridge failed: ${bridgeResult.error}`);
      }

      console.log(`Bridge successful: ${bridgeResult.txHash}`);

      // After bridging, settle on origin chain
      const signer = await createSigner(ORIGIN_CHAIN as any, EVM_PRIVATE_KEY);
      response = await settle(signer, paymentPayload, paymentRequirements);

      // Add bridge info to response
      (response as any).bridged = true;
      (response as any).bridgeTxHash = bridgeResult.txHash;
    } else {
      // Direct settlement on origin chain
      const signer = await createSigner(
        paymentRequirements.network as any,
        EVM_PRIVATE_KEY,
      );
      response = await settle(signer, paymentPayload, paymentRequirements);
      (response as any).bridged = false;
    }

    return c.json(response);
  } catch (error) {
    console.error("error", error);
    return c.json({ error: `Invalid request: ${error}` }, 400);
  }
});

// GET /order-status/:orderId - Check PayPal order status
app.get("/order-status/:orderId", async (c) => {
  const orderId = c.req.param("orderId");

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return c.json(
      {
        error: "PayPal credentials not configured",
      },
      500,
    );
  }

  try {
    const order = await ordersController.getOrder({
      id: orderId,
    });

    return c.json({
      orderId: orderId,
      status: order.result.status,
      amount: order.result.purchaseUnits?.[0]?.amount?.value,
      currency: order.result.purchaseUnits?.[0]?.amount?.currencyCode,
      links: EVM_PRIVATE_KEYorder.result.links,
    });
  } catch (paypalError) {
    console.error("PayPal order status check error:", paypalError);
    return c.json(
      {
        error: "Failed to get PayPal order status",
        orderId: orderId,
        details:
          paypalError instanceof Error ? paypalError.message : "Unknown error",
      },
      404,
    );
  }
});

// GET /test - Generate a random PayPal order for testing
app.get("/test", async (c) => {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    return c.json(
      {
        error: "PayPal credentials not configured",
      },
      500,
    );
  }

  try {
    // Generate random test data
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const testDescription = `Test payment - ${testId}`;

    const { result } = await ordersController.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            customId: testId,
            amount: {
              currencyCode: "USD",
              value: 100,
              breakdown: {
                itemTotal: {
                  currencyCode: "USD",
                  value: 100,
                },
              },
            },
            description: testDescription,
            items: [
              {
                name: "Test Payment Item",
                unitAmount: {
                  currencyCode: "USD",
                  value: testAmount,
                },
                description: testDescription,
                quantity: "1",
              },
            ],
          },
        ],
        applicationContext: {
          returnUrl: "https://example.com/test-success",
        },
        paymentSource: {
          paypal: {
            experienceContext: {
              brandName: "PayAny Money Test",
            },
          },
        },
      },
      prefer: "return=minimal",
    });

    return c.json({
      success: true,
      testOrderId: result.id,
      amount: testAmount,
      currency: "USD",
      status: result.status,
      approvalUrl: result.links?.find((link: any) => link.rel === "approve")
        ?.href,
      description: testDescription,
      message: "Test PayPal order created successfully",
      paymentRequirements: {
        method: "fiat-paypal",
        orderId: result.id,
      },
      usage: {
        verify: `POST /verify with paymentRequirements: {"method": "fiat-paypal", "orderId": "${result.id}"}`,
        settle: `POST /settle with paymentRequirements: {"method": "fiat-paypal", "orderId": "${result.id}"}`,
        status: `GET /order-status/${result.id}`,
      },
    });
  } catch (paypalError) {
    console.error("Test PayPal order creation error:", paypalError);
    return c.json(
      {
        error: "Failed to create test PayPal order",
        details:
          paypalError instanceof Error ? paypalError.message : "Unknown error",
      },
      500,
    );
  }
});

// ---------------- Start ----------------
export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
