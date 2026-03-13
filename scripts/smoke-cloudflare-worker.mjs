import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

import { build } from "esbuild";
import { Miniflare } from "miniflare";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distEntry = path.join(repoRoot, "dist", "index.js");
const distUpstashEntry = path.join(repoRoot, "dist", "idempotency", "upstash.js");

if (!existsSync(distEntry)) {
  throw new Error("Missing dist/index.js. Run `pnpm build` before `pnpm smoke:cloudflare-worker`.");
}

if (!existsSync(distUpstashEntry)) {
  throw new Error(
    "Missing dist/idempotency/upstash.js. Run `pnpm build` before `pnpm smoke:cloudflare-worker`."
  );
}

const checkoutCompletedPayload = {
  id: "evt_cloudflare_checkout",
  eventType: "checkout.completed",
  object: {
    customer: {
      email: "worker@example.com",
      id: "cus_worker",
      name: "Worker User"
    },
    metadata: {
      datafast_visitor_id: "visitor_from_webhook"
    },
    order: {
      amount: 1999,
      currency: "USD",
      id: "order_worker",
      type: "one_time"
    }
  }
};

const rawBody = JSON.stringify(checkoutCompletedPayload);
const webhookSecret = "cloudflare_worker_secret";
const signature = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
const tempDir = mkdtempSync(path.join(tmpdir(), "creem-datafast-cloudflare-smoke-"));
const workerEntryPath = path.join(tempDir, "worker-entry.mjs");
const workerBundlePath = path.join(tempDir, "worker-bundle.mjs");

const workerScript = `
import { createCreemDataFast } from ${JSON.stringify(distEntry)};
import { createUpstashIdempotencyStore } from ${JSON.stringify(distUpstashEntry)};

export default {
  async fetch(request) {
    let forwardedPayload;
    const idempotencyValues = new Map();

    const client = createCreemDataFast({
      creemClient: {
        checkouts: {
          async create(input) {
            return {
              checkoutUrl: "https://creem.test/checkout/worker",
              id: "checkout_worker",
              metadata: input.metadata
            };
          }
        },
        transactions: {
          async getById(transactionId) {
            return {
              amount: 1999,
              createdAt: 1710000000000,
              currency: "USD",
              id: transactionId
            };
          }
        }
      },
      creemWebhookSecret: "cloudflare_worker_secret",
      datafastApiKey: "datafast_key",
      idempotencyStore: createUpstashIdempotencyStore({
        async del(key) {
          idempotencyValues.delete(key);
          return 1;
        },
        async set(key, value, options = {}) {
          if (options.nx && idempotencyValues.has(key)) {
            return null;
          }

          idempotencyValues.set(key, value);
          return "OK";
        }
      }),
      fetch: async (_input, init) => {
        forwardedPayload = JSON.parse(init.body);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }
    });

    const receivedRawBody = await request.text();
    const isValid = await client.verifyWebhookSignature(receivedRawBody, {
      "creem-signature": request.headers.get("x-creem-signature") ?? ""
    });

    const checkout = await client.createCheckout(
      {
        productId: "prod_worker",
        successUrl: "https://example.com/success"
      },
      {
        request: {
          headers: {
            cookie: "datafast_visitor_id=visitor_from_cookie"
          },
          url: "https://example.com/api/checkout"
        }
      }
    );

    const webhookResult = await client.handleWebhook({
      rawBody: receivedRawBody,
      headers: {
        "creem-signature": request.headers.get("x-creem-signature") ?? ""
      }
    });

    return Response.json({
      checkoutUrl: checkout.checkoutUrl,
      injectedVisitorId: checkout.finalMetadata.datafast_visitor_id,
      idempotencyStatus: idempotencyValues.get("creem:event:evt_cloudflare_checkout"),
      isValid,
      webhookIgnored: webhookResult.ignored,
      forwardedPayload
    });
  }
};
`;

writeFileSync(workerEntryPath, workerScript);

await build({
  bundle: true,
  entryPoints: [workerEntryPath],
  format: "esm",
  outfile: workerBundlePath,
  platform: "browser",
  target: "es2022"
});

writeFileSync(
  workerBundlePath,
  readFileSync(workerBundlePath, "utf8")
    .replace(/^\/\/ \.\.\/.*$\n/gmu, "")
    .replace(/\n\/\/# sourceMappingURL=.*$/u, "")
);

const mf = new Miniflare({
  compatibilityDate: "2025-03-01",
  modules: true,
  modulesRoot: tempDir,
  scriptPath: workerBundlePath
});

try {
  const response = await mf.dispatchFetch("https://worker-smoke.example", {
    body: rawBody,
    headers: {
      "content-type": "application/json",
      "x-creem-signature": signature
    },
    method: "POST"
  });

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.isValid, true);
  assert.equal(body.idempotencyStatus, "processed");
  assert.equal(body.injectedVisitorId, "visitor_from_cookie");
  assert.equal(body.checkoutUrl, "https://creem.test/checkout/worker");
  assert.equal(body.webhookIgnored, false);
  assert.deepEqual(body.forwardedPayload, {
    amount: 19.99,
    currency: "USD",
    customer_id: "cus_worker",
    datafast_visitor_id: "visitor_from_webhook",
    email: "worker@example.com",
    name: "Worker User",
    renewal: false,
    transaction_id: "order_worker"
  });
} finally {
  await mf.dispose();
  rmSync(tempDir, { force: true, recursive: true });
}
