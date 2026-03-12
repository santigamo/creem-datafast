# creem-datafast

[![CI](https://github.com/santigamo/creem-datafast/actions/workflows/ci.yml/badge.svg)](https://github.com/santigamo/creem-datafast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

Wraps the official `creem` Core SDK and forwards the payment events you care about to DataFast. It gives you a Framework-agnostic core, automatically captures DataFast tracking cookies during checkout creation, and ships with Next.js and Express adapters included.

## What It Does

`creem-datafast` focuses on three jobs:

- Create Creem checkouts with automatic DataFast visitor attribution.
- Read `datafast_visitor_id` and `datafast_session_id` from the request and inject them into Creem checkout metadata.
- Verify Creem webhooks with the raw body, map supported payments, and forward them to DataFast.

## Why It Exists

Connecting Creem payments to DataFast requires capturing visitor cookies at checkout, verifying webhooks, and mapping event data into DataFast's payment API. This package handles all three so you do not rebuild that glue in every project.

## How The Flow Works

1. Your backend calls `createCheckout()` with the incoming `Request` or cookie header.
2. The package injects `datafast_visitor_id` and `datafast_session_id` into Creem metadata without dropping the rest of your metadata.
3. Creem redirects the customer to `checkoutUrl`.
4. Creem sends `checkout.completed` and `subscription.paid` webhooks back to your server.
5. `handleWebhook()` verifies `creem-signature`, deduplicates by event id, maps the payload, and forwards the payment to DataFast.

## Supported Events

- `checkout.completed`
- `subscription.paid`
- Any other Creem event is ignored and returns `200 OK` so unsupported deliveries do not trigger unnecessary retries.

## Installation

```bash
pnpm add creem-datafast
```

Internally the package wraps the official `creem` Core SDK, so you do not need to install `creem` separately in a normal consumer app.

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
      request: { headers: req.headers }
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

Use the browser helper when your checkout request originates from the browser and cookies are not automatically forwarded to your backend (e.g. cross-origin fetch calls). In same-origin setups the server-side cookie capture handles this automatically.

```ts
import { appendDataFastTracking, getDataFastTracking } from "creem-datafast/client";

const tracking = getDataFastTracking();
const checkoutEndpoint = appendDataFastTracking("/api/checkout", tracking);
```

## Advanced

### Custom webhook response logic (Next.js)

If you need custom response logic in Next.js, use `handleWebhookRequest()` instead of `createNextWebhookHandler()`. It reads the raw body for you and forwards the webhook through the same core path. Note that it consumes the request body stream.

```ts
import { handleWebhookRequest } from "creem-datafast/next";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const result = await handleWebhookRequest(creemDataFast, request);

  if (result.ignored) {
    return new Response("Ignored", { status: 200 });
  }

  return new Response("OK", { status: 200 });
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

## Testing Local

Package checks:

```bash
pnpm build
pnpm test
pnpm typecheck
```

These same checks run in GitHub Actions on every push and pull request.

Example app:

```bash
cp example-next/.env.example example-next/.env.local
pnpm --filter example-next dev
```

Then configure the Creem webhook endpoint to `http://localhost:3000/api/webhook/creem` through your tunnel of choice.

## Troubleshooting

- Invalid webhook signature: make sure the handler reads the raw request body, not parsed JSON.
- Missing visitor tracking: the checkout still works by default; enable `strictTracking` if you want the request to fail instead.
- Wrong amount format: Creem amounts are interpreted as minor units and converted into decimal major units before sending to DataFast.
- Duplicate forwards: pass a real `idempotencyStore` in production if you need dedupe across processes.

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
- `client.verifyWebhookSignature(rawBody, headers)`

Subpaths:

- `creem-datafast/next`
- `creem-datafast/express`
- `creem-datafast/client`

Next.js helpers:

- `createNextWebhookHandler(client, options?)`
- `handleWebhookRequest(client, request)`

## Adoption Note

This package is designed for easy adoption under `@creem_io/datafast` or any official Creem scope. The architecture keeps core logic separate from framework adapters to simplify future maintenance and namespace migration.

## Integrate with AI Agents

Paste this prompt into Claude Code, Cursor, Codex, or any AI coding agent:

```text
Use curl to download, read and follow: https://raw.githubusercontent.com/santigamo/creem-datafast/main/SKILL.md
```
