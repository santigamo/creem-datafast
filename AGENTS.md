# AGENTS.md

## Repository Notes

- The publishable package lives at the repository root; runnable workspace examples live in `example-next/` and `example-express/`.
- Webhook verification depends on the exact raw body. For Express integrations use `express.raw({ type: "application/json" })`, not `express.json()`.
- `createCheckout()` tracking resolution is per-field and ordered as `params.tracking` -> metadata `datafast_*` -> `request.url` query params -> cookies; Express integrations that rely on the browser helper should pass `req.url`.
- Reserve `MissingTrackingError` for strict tracking failures; invalid Creem SDK responses should throw the generic `CreemDataFastError`.
- Map `refund.created` into a new DataFast payment with `refunded: true` and use the Creem refund id as `transaction_id`; do not reuse the original transaction id.
- `subscription.paid` should prefer hydrated transaction data from `last_transaction_id` and only fall back to `product.price` / `product.currency` if hydration fails.
- Ignore `checkout.completed` when it clearly represents an initial subscription purchase (`order.type === "recurring"` or `object.subscription` present); let `subscription.paid` own payment attribution for that first charge.
- Creem webhook payloads may send `object.customer` either as a hydrated object or as a string id; mapping code must preserve `customer_id` in both shapes.
- The default idempotency behavior is intentionally minimal; production consumers should pass a real `idempotencyStore` if they need dedupe across processes.
- Keep the root package export surface framework-agnostic and minimal; adapter/browser runtime APIs and their types belong on subpath entrypoints.
- Runtime error classes that consumers are expected to branch on with `instanceof` should be exported from the root package.
- The published package is ESM-only; keep README compatibility notes and package exports aligned so consumers do not assume `require()` support.
- For Next.js custom webhook responses, prefer `handleWebhookRequest()` from `creem-datafast/next`; it shares the adapter path and consumes the `Request` body stream once.
- Creem SDK transaction hydration uses numeric `createdAt` / `created_at` timestamps in milliseconds; fixtures should match that format so hydration tests catch unit mistakes.
- DataFast forwarding should use explicit timeouts and bounded retries in `src/core/datafast-client.ts`; retry only network errors, timeout aborts, and HTTP `408` / `429` / `5xx`, never broad `4xx`.
- If `package.json` claims Node compatibility through `engines`, the GitHub Actions matrix should exercise the minimum supported Node version plus the primary current version.
- Keep library CI separate from framework example CI when their Node requirements differ; `example-next` follows Next.js runtime minimums and should not dilute the root package's `node >=18` claim.
- `example-next` should consume the root workspace package through its published `exports`, not `../src/*`; rebuild the root package before running the example after library changes.
- Lightweight adapter demos should stay as small workspace apps: prefer `tsx` plus a tiny local `.env.local` loader over adding bundlers or `dotenv` when the example only needs to prove the integration shape.
- If the package claims `node >=18`, keep the test runner on a Node-18-compatible major; `vitest` 4 requires Node 20+ and breaks the minimum-version CI job.
- When `next build` updates `example-next/tsconfig.json` or `example-next/next-env.d.ts` with mandatory Next.js TypeScript settings, keep those generated changes so future builds stay clean.
- Example-app CI may use placeholder env vars strictly to prove the app typechecks/builds; keep that documented so nobody reads the example job as a live integration check.
- Keep GitHub Actions JavaScript actions on majors that support the current runner runtime; `actions/checkout@v5` and `actions/setup-node@v5` avoid the Node 20 deprecation warning.
- The root `SKILL.md` is consumer-facing documentation for AI coding agents; keep it aligned with the README quickstarts and the supported Next.js / Express integration patterns.
- Distribution regressions are easiest to catch by installing the packed `.tgz` into an isolated consumer fixture; keep `pnpm smoke:consumer` aligned with the published exports and subpaths.
- Keep `datafast_session_id` capture limited to Creem metadata until DataFast documents payment API support for it; webhook payment payloads should continue forwarding only `datafast_visitor_id`.
