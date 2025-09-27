/* eslint-env node */
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { verify, settle } from "x402/facilitator";
import {
  PaymentRequirementsSchema,
  type PaymentRequirements,
  type PaymentPayload,
  PaymentPayloadSchema,
  createConnectedClient,
  createSigner,
  Signer,
  ConnectedClient,
  SupportedPaymentKind,
} from "x402/types";

config();

// Origin chain and token configuration
const ORIGIN_CHAIN = "arbitrum";
const ORIGIN_TOKEN_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"; // Placeholder token address

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

  // Simulate bridge delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock successful bridge transaction
  return {
    success: true,
    txHash: `0x${"a".repeat(64)}`, // Mock transaction hash
  };
}

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || "";

if (!EVM_PRIVATE_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", prettyJSON());

// ---------------- Types ----------------
type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

type SettleRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
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

// POST /verify
app.post("/verify", async (c) => {
  try {
    const body: VerifyRequest = await c.req.json();

    const paymentRequirements = PaymentRequirementsSchema.parse(
      body.paymentRequirements,
    );
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    // Skip network and asset validation for verify - allow any network/asset
    const client = createConnectedClient(paymentRequirements.network as any);

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
        scheme: "exact",
        network: network as any,
        asset: ORIGIN_TOKEN_ADDRESS,
      });
    });
  }

  return c.json({ kinds });
});

// POST /settle
app.post("/settle", async (c) => {
  try {
    const body: SettleRequest = await c.req.json();
    const paymentRequirements = PaymentRequirementsSchema.parse(
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
        paymentRequirements. as string,
        paymentPayload.payload
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

// ---------------- Start ----------------
export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
