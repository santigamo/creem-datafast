# AGENTS.md

## Repository Notes

- The publishable package lives at the repository root; the runnable merchant example lives in `example-next/`.
- Webhook verification depends on the exact raw body. For Express integrations use `express.raw({ type: "application/json" })`, not `express.json()`.
- `subscription.paid` should prefer hydrated transaction data from `last_transaction_id` and only fall back to `product.price` / `product.currency` if hydration fails.
- Creem webhook payloads may send `object.customer` either as a hydrated object or as a string id; mapping code must preserve `customer_id` in both shapes.
- The Next.js example uses TypeScript path aliases to point `creem-datafast` subpaths at `../src/*`, so example builds do not depend on prebuilt `dist/`.
- The default idempotency behavior is intentionally minimal; production consumers should pass a real `idempotencyStore` if they need dedupe across processes.
- Keep the root package export surface framework-agnostic and minimal; adapter/browser runtime APIs and their types belong on subpath entrypoints.
- For Next.js custom webhook responses, prefer `handleWebhookRequest()` from `creem-datafast/next`; it shares the adapter path and consumes the `Request` body stream once.
- The root `SKILL.md` is consumer-facing documentation for AI coding agents; keep it aligned with the README quickstarts and the supported Next.js / Express integration patterns.
