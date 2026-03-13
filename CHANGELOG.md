# Changelog

## 0.1.0 — Initial Release

### Features

- **Core factory** — `createCreemDataFast()` wires up checkout attribution and webhook forwarding in a single call
- **Checkout tracking** — auto-reads `datafast_visitor_id` and `datafast_session_id` from cookies, query params, or explicit input and injects them into Creem metadata
- **Webhook handler** — verifies `creem-signature` with Web Crypto HMAC-SHA256, deduplicates events, maps payloads, and forwards to DataFast
- **Supported events** — `checkout.completed`, `subscription.paid`, `refund.created`
- **Subscription dedup** — initial subscription `checkout.completed` is ignored so the first payment is attributed only once through `subscription.paid`
- **Refund support** — `refund.created` forwards as a DataFast payment with `refunded: true`
- **Currency-aware** — correctly converts zero-decimal (JPY, KRW) and three-decimal (KWD, BHD) currencies
- **Retry with backoff** — DataFast client retries network errors, timeouts, and 408/429/5xx with exponential backoff and jitter
- **Idempotency** — in-memory store for dev, official Upstash Redis adapter (`creem-datafast/idempotency/upstash`) for production
- **Typed errors** — `InvalidCreemSignatureError`, `MissingTrackingError`, `DataFastRequestError` with `.retryable`, `.status`, `.requestId`
- **Transaction hydration** — `subscription.paid` hydrates amount from `last_transaction_id` via Creem API, falls back to product pricing
- **Verify standalone** — `verifyWebhookSignature()` for signature checks without full webhook processing
- **Unsupported events** — unrecognized Creem events return `200 OK` so deliveries do not trigger unnecessary retries
- **Tracking precedence** — per-field resolution: `params.tracking` > `metadata.datafast_*` > query params > cookies
- **Strict tracking** — optional mode that rejects checkouts without `datafast_visitor_id`
- **Test mode** — `testMode: true` targets `https://test-api.creem.io`
- **Creem client injection** — bring your own configured `Creem` SDK instance via `creemClient`
- **Configurable internals** — injectable `logger`, `fetch`, `timeoutMs`, and `retry` config
- **`onError` callback** — optional error hook on Next.js and Express webhook handlers

### Framework Adapters

- **Next.js** (`creem-datafast/next`) — `createNextWebhookHandler()` for one-liner route export, `handleWebhookRequest()` for custom response logic
- **Express** (`creem-datafast/express`) — `createExpressWebhookHandler()` for raw-body webhook routes
- **Browser** (`creem-datafast/client`) — `getDataFastTracking()` and `appendDataFastTracking()` for cross-origin checkout flows
- **Framework-agnostic** — `handleWebhook({ rawBody, headers })` works with any runtime

### Examples

- **Next.js 16** — App Router with server cookie capture, browser helper flow, and custom webhook handler
- **Express 5** — raw-body webhook handler with DataFast script integration

### Infrastructure

- ESM-only, Node 18+, TypeScript 5.9 strict mode
- CI: Node 18/20 matrix, Bun smoke, Cloudflare Workers smoke, Next.js build validation
- 98 tests, 88% statement coverage
- Biome for linting and formatting
