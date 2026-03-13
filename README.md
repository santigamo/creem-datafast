# creem-datafast

[![CI](https://github.com/santigamo/creem-datafast/actions/workflows/ci.yml/badge.svg)](https://github.com/santigamo/creem-datafast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

Wraps the official `creem` Core SDK and forwards the payment events you care about to DataFast. It gives you a Framework-agnostic core, automatically captures DataFast tracking cookies during checkout creation, and ships with Next.js and Express adapters included.

## What It Does

`creem-datafast` focuses on four jobs:

- Create Creem checkouts with automatic DataFast visitor attribution.
- Read `datafast_visitor_id` and `datafast_session_id` from the request and inject them into Creem checkout metadata.
- Verify Creem webhooks with the raw body, map supported payments, and forward them to DataFast.
- Forward Creem refunds to DataFast as refunded payment events.

## Why It Exists

Connecting Creem payments to DataFast requires capturing visitor cookies at checkout, verifying webhooks, and mapping event data into DataFast's payment API. This package handles all three so you do not rebuild that glue in every project.

## How The Flow Works

1. Your backend calls `createCheckout()` with the incoming `Request` or cookie header.
2. The package injects `datafast_visitor_id` and `datafast_session_id` into Creem metadata without dropping the rest of your metadata.
3. Creem redirects the customer to `checkoutUrl`.
4. Creem sends `checkout.completed`, `subscription.paid`, and `refund.created` webhooks back to your server.
5. `handleWebhook()` verifies `creem-signature`, atomically claims the event id, maps the payload, and forwards the payment or refund to DataFast.

During checkout capture, both tracking ids are preserved in Creem metadata. During webhook forwarding, only `datafast_visitor_id` is sent to DataFast because the current DataFast payment API documents `datafast_visitor_id` but not `datafast_session_id`.

## Supported Events

- `checkout.completed`
- `subscription.paid`
- `refund.created`
- Any other Creem event is ignored and returns `200 OK` so unsupported deliveries do not trigger unnecessary retries.
- Initial subscription `checkout.completed` deliveries are acknowledged but ignored so the first subscription payment is attributed only once through `subscription.paid`.

## Installation

```bash
pnpm add creem-datafast
```

Internally the package wraps the official `creem` Core SDK, so you do not need to install `creem` separately in a normal consumer app.

## Compatibility

- Library runtime: Node 18+
- `example-express`: Node 18+ because it uses plain Express
- `example-next`: Node 20.9+ because it uses Next.js 16
- ESM-only package. Import with `import`, not `require()`.
- Next.js Route Handlers on the Node runtime
- Express webhook routes using `express.raw({ type: "application/json" })`
- Supported webhook events: `checkout.completed`, `subscription.paid`, `refund.created`
- Refunds are forwarded as DataFast payments with `refunded: true`

## Quickstart Next.js

Install the package, create a shared client, then use the included route handler adapter.

```ts
// lib/creem-datafast.ts
import { createCreemDataFast } from "creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true
});
```

```ts
// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { checkoutUrl } = await creemDataFast.createCheckout(
    {
      productId: process.env.CREEM_PRODUCT_ID!,
      successUrl: `${process.env.APP_BASE_URL!}/success`
    },
    { request }
  );

  return NextResponse.redirect(checkoutUrl, { status: 303 });
}
```

```ts
// app/api/webhook/creem/route.ts
import { createNextWebhookHandler } from "creem-datafast/next";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";
export const POST = createNextWebhookHandler(creemDataFast);
```

## Quickstart Express

Use the Framework-agnostic core in your app layer and keep the webhook route on raw body middleware.

```ts
import express from "express";
import { createCreemDataFast } from "creem-datafast";
import { createExpressWebhookHandler } from "creem-datafast/express";

const app = express();
const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true
});

app.post("/api/checkout", async (req, res) => {
  const { checkoutUrl } = await creemDataFast.createCheckout(
    {
      productId: process.env.CREEM_PRODUCT_ID!,
      successUrl: `${process.env.APP_BASE_URL!}/success`
    },
    {
      request: { headers: req.headers, url: req.url }
    }
  );

  res.redirect(303, checkoutUrl);
});

app.post(
  "/api/webhook/creem",
  express.raw({ type: "application/json" }),
  createExpressWebhookHandler(creemDataFast)
);
```

## Client-Side Helper

Use the browser helper when your checkout request originates from the browser and cookies are not automatically forwarded to your backend (e.g. cross-origin fetch calls). If your backend passes the incoming `{ request }` into `createCheckout()`, the server reads `datafast_visitor_id` and `datafast_session_id` from the request query string automatically. In same-origin setups the server-side cookie capture handles this automatically.

```ts
import { appendDataFastTracking, getDataFastTracking } from "creem-datafast/client";

const tracking = getDataFastTracking();
const checkoutEndpoint = appendDataFastTracking("/api/checkout", tracking);
```

Tracking precedence during checkout creation is:

1. `params.tracking`
2. `params.metadata.datafast_*`
3. `request.url` query params
4. cookies, using `request.headers.cookie` first and `cookieHeader` only to fill missing tracking fields

Only `datafast_visitor_id` is forwarded in webhook payment payloads today. `datafast_session_id` is still worth capturing because it is stored in Creem metadata and can be forwarded later if DataFast adds documented support for it in the payment API.

## Advanced

### Custom webhook response logic (Next.js)

If you need custom response logic in Next.js, use `handleWebhookRequest()` instead of `createNextWebhookHandler()`. It reads the raw body for you and forwards the webhook through the same core path. Note that it consumes the request body stream. Since `handleWebhookRequest()` is a low-level helper, you are responsible for catching `InvalidCreemSignatureError` (→ 400) and unexpected errors (→ 500).

```ts
import { handleWebhookRequest } from "creem-datafast/next";
import { InvalidCreemSignatureError } from "creem-datafast";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await handleWebhookRequest(creemDataFast, request);

    if (result.ignored) {
      return new Response("Ignored", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    if (error instanceof InvalidCreemSignatureError) {
      return new Response("Invalid signature", { status: 400 });
    }

    return new Response("Internal error", { status: 500 });
  }
}
```

## Environment Variables

Package / integration:

- `CREEM_API_KEY`: Creem Core SDK API key.
- `CREEM_WEBHOOK_SECRET`: secret used to validate `creem-signature`.
- `DATAFAST_API_KEY`: bearer token for DataFast payments.

Example app only:

- `CREEM_PRODUCT_ID`: product used by your checkout endpoint.
- `APP_BASE_URL`: base URL for success redirects and local webhook setup.
- `CREEM_TEST_MODE`: example-app env var that maps to the `testMode` constructor option. Set it to `true` to target `https://test-api.creem.io`.
- `DATAFAST_WEBSITE_ID`: DataFast website ID (e.g. `dfid_xxx`) for the tracking script.
- `DATAFAST_DOMAIN`: domain registered in your DataFast dashboard.

Optional constructor hardening:

- `timeoutMs`: per-request timeout for DataFast forwarding. Defaults to `8000`.
- `retry.retries`: additional retry attempts after the initial DataFast request, so `1` means up to `2` total attempts. Defaults to `1`.
- `retry.baseDelayMs`: base backoff delay in milliseconds. Defaults to `250`.
- `retry.maxDelayMs`: maximum backoff delay in milliseconds. Defaults to `2000`.

## Testing Local

Package checks:

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm smoke:consumer
```

These same checks run in GitHub Actions on every push and pull request.

GitHub Actions validates the root package and workspace examples like this:

- `package` runs on Node 18 and 20 and checks `build`, `typecheck`, `test`, and `smoke:consumer`.
- `package` also typechecks `example-express` on Node 18 after building the root package, so the lightweight Express example stays compatible without needing a separate job.
- `example-next` runs on Node 20.9+ because Next.js 16 requires it, builds the root package first, then checks `typecheck` plus `build`.
- The `example-next` CI job uses placeholder env values so it validates compilation of the workspace package integration only; it does not call real Creem or DataFast services.

`pnpm smoke:consumer` packs the real `.tgz`, installs it into an isolated TypeScript consumer fixture, runs `tsc --noEmit`, and verifies the root plus `next`, `express`, and `client` subpath imports at runtime.

Runnable examples:

```bash
cp example-express/.env.example example-express/.env.local
pnpm build
pnpm --filter example-express dev
```

```bash
cp example-next/.env.example example-next/.env.local
pnpm build
pnpm --filter example-next dev
```

Both examples consume the built workspace package from the repository root, so rerun `pnpm build` after changing library source before restarting or rebuilding either example.

For `example-express`, open `http://localhost:3000` and use the landing page button to start a checkout. For `example-next`, use the same port and flow as before.

Then configure the Creem webhook endpoint to `http://localhost:3000/api/webhook/creem` through your tunnel of choice.

### Verified Local Flow

1. Copy either `example-express/.env.example` or `example-next/.env.example` into the matching `.env.local` file and fill in real Creem and DataFast test credentials.
2. Run `pnpm build` at the repository root so `dist/` reflects your current library changes.
3. Start the example with `pnpm --filter example-express dev` or `pnpm --filter example-next dev`.
4. Expose `http://localhost:3000` through a tunnel such as `ngrok http 3000`.
5. Set the Creem webhook endpoint to `https://<your-tunnel>/api/webhook/creem`.
6. Open the example app, start a checkout, and complete a payment in Creem test mode.
7. Expect the example server logs to show the payload forwarded to DataFast; the Next example also logs processed versus ignored webhook outcomes explicitly.

## Production Idempotency

By default no idempotency store is configured, so duplicate webhook deliveries are forwarded to DataFast every time. For production, pass a durable atomic store so deduplication survives process restarts and blocks concurrent deliveries across multiple instances.

See [`docs/production-idempotency.md`](./docs/production-idempotency.md) for the atomic `IdempotencyStore` contract, a copy-paste Redis / Upstash recipe, TTL guidance, and how to wire it into `createCreemDataFast()`.

## Troubleshooting

- Invalid webhook signature: make sure the handler reads the raw request body, not parsed JSON.
- Missing `creem-signature` header: `verifyWebhookSignature()` and `handleWebhook()` throw `InvalidCreemSignatureError` because the request is malformed.
- Missing visitor tracking: the checkout still works by default; enable `strictTracking` if you want the request to fail instead.
- Wrong amount format: Creem amounts are interpreted as minor units and converted into decimal major units before sending to DataFast.
- Refund semantics: `refund.created` forwards the refunded amount as a new DataFast payment with `refunded: true` and uses the Creem refund id as `transaction_id`.
- Duplicate forwards: pass a real atomic `idempotencyStore` in production if you need dedupe across processes and concurrent deliveries. See [`docs/production-idempotency.md`](./docs/production-idempotency.md).
- Slow or flaky DataFast responses: forwarding uses an `8000ms` timeout by default and retries only network errors, timeouts, and `408` / `429` / `5xx` responses.

## API Reference

```ts
import { createCreemDataFast } from "creem-datafast";
import { createNextWebhookHandler } from "creem-datafast/next";
import { createExpressWebhookHandler } from "creem-datafast/express";
import { appendDataFastTracking, getDataFastTracking } from "creem-datafast/client";
```

Root API:

- `createCreemDataFast(options)`
- `client.createCheckout(params, context?)`
- `client.handleWebhook({ rawBody, headers })`
- `client.verifyWebhookSignature(rawBody, headers)` returns `true` or `false` for signature validity and throws `InvalidCreemSignatureError` when `creem-signature` is missing.

Subpaths:

- `creem-datafast/next`
- `creem-datafast/express`
- `creem-datafast/client`

Next.js helpers:

- `createNextWebhookHandler(client, options?)`
- `handleWebhookRequest(client, request)`

## Integrate with AI Agents

Paste this prompt into Claude Code, Cursor, Codex, or any AI coding agent:

```text
Use curl to download, read and follow: https://raw.githubusercontent.com/santigamo/creem-datafast/main/SKILL.md
```
