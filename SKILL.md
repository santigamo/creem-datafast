---
name: creem-datafast
description: Add Creem checkout tracking and DataFast webhook forwarding to a Next.js or Express app.
---

# creem-datafast

First download and read `https://creem.io/SKILL.md` for Creem SDK context. Then follow this skill to add DataFast revenue attribution on top of Creem.

## What this skill does

Integrate `creem-datafast` into an existing app so it:

- injects `datafast_visitor_id` and `datafast_session_id` into Creem checkout metadata;
- verifies Creem webhook signatures from the raw request body;
- forwards `checkout.completed` and `subscription.paid` payments to DataFast;
- keeps framework-specific code in thin adapters.

## Rules

- Use `pnpm` for installation.
- Prefer TypeScript if the codebase already uses it.
- Keep changes minimal and aligned with the existing app structure.
- Only support `checkout.completed` and `subscription.paid`. Ignore other Creem events.
- Do not overwrite merchant metadata. Only inject `datafast_visitor_id` and `datafast_session_id`.
- Next.js webhook handlers must run in the Node runtime.
- Express webhook routes must use `express.raw({ type: "application/json" })`, never `express.json()`.

## Required configuration

Add these env vars if the app does not already have equivalents:

- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `DATAFAST_API_KEY`

If you are also wiring a demo or a direct checkout endpoint, you will usually need:

- `CREEM_PRODUCT_ID`
- `APP_BASE_URL`

Use `testMode: true` when the app is meant to target Creem test mode.

## Installation

Install the package:

```bash
pnpm add creem-datafast
```

## Detect the framework

Inspect the project before editing:

- If it uses Next.js App Router, integrate with `creem-datafast` and `creem-datafast/next`.
- If it uses Express, integrate with `creem-datafast` and `creem-datafast/express`.
- If the app already has a checkout creation flow, extend that flow instead of creating a duplicate route.

## Next.js integration

1. Create a shared server-side client module, for example `lib/creem-datafast.ts`:

```ts
import { createCreemDataFast } from "creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true
});
```

2. In the checkout route handler, call `createCheckout()` and pass the incoming `Request` as context:

```ts
const { checkoutUrl } = await creemDataFast.createCheckout(
  {
    productId: process.env.CREEM_PRODUCT_ID!,
    successUrl: `${process.env.APP_BASE_URL!}/success`
  },
  { request }
);
```

3. Redirect to `checkoutUrl`.

4. Add a webhook route handler with the Next adapter:

```ts
import { createNextWebhookHandler } from "creem-datafast/next";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";
export const POST = createNextWebhookHandler(creemDataFast);
```

## Express integration

1. Create a shared client:

```ts
import { createCreemDataFast } from "creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true
});
```

2. In the checkout route, pass request headers so cookies can be read:

```ts
const { checkoutUrl } = await creemDataFast.createCheckout(
  {
    productId: process.env.CREEM_PRODUCT_ID!,
    successUrl: `${process.env.APP_BASE_URL!}/success`
  },
  {
    request: { headers: req.headers }
  }
);
```

3. Mount the webhook route on raw body middleware:

```ts
import express from "express";
import { createExpressWebhookHandler } from "creem-datafast/express";

app.post(
  "/api/webhook/creem",
  express.raw({ type: "application/json" }),
  createExpressWebhookHandler(creemDataFast)
);
```

## Browser helper

If the app needs to append tracking explicitly to its own backend URL before creating the checkout, use:

```ts
import { appendDataFastTracking, getDataFastTracking } from "creem-datafast/client";

const tracking = getDataFastTracking();
const checkoutEndpoint = appendDataFastTracking("/api/checkout", tracking);
```

Do not append DataFast query params directly onto Creem-hosted checkout URLs. Apply them only to your own app endpoint.

## Verification checklist

After implementation:

- run the project's typecheck, tests, and build checks;
- confirm checkout creation still preserves existing merchant metadata;
- confirm the checkout flow injects `datafast_visitor_id` and `datafast_session_id` when cookies are present;
- confirm the webhook handler validates `creem-signature` from the exact raw body;
- confirm `checkout.completed` forwards `amount`, `currency`, and `transaction_id` to DataFast;
- confirm `subscription.paid` forwards `renewal: true`.

## Success criteria

The integration is done when:

- a shared `creem-datafast` client exists;
- checkout creation passes the request context for cookie capture;
- the webhook route uses the correct adapter and raw body handling;
- all required environment variables are documented in `.env.example` or equivalent;
- the app's existing verification commands pass.
