# creem-datafast Design

Date: 2026-03-12

## Scope

Build a framework-agnostic TypeScript package that wraps the official `creem` Core SDK, injects DataFast tracking into Creem checkout metadata, verifies Creem webhooks manually, maps supported payment events into DataFast's payment API payload, and ships thin Next.js and Express adapters plus a small browser helper.

## Closed Decisions

- Runtime dependency: `creem` only.
- Supported webhook events: `checkout.completed` and `subscription.paid`.
- Tracking precedence: explicit `params.tracking`, explicit `metadata.datafast_*`, request cookies, then empty.
- Captured tracking keys: `datafast_visitor_id` and `datafast_session_id`.
- Webhook verification: `creem-signature` HMAC-SHA256 over the exact raw body with timing-safe comparison.
- Idempotency key: `creem:event:${eventId}`.
- `subscription.paid` hydrates `last_transaction_id` when available and falls back to product pricing on failure.
- Amount normalization converts Creem minor units into DataFast major-unit decimals using an ISO exponent table.

## Architecture

- `src/core/`: pure utilities, clients, mappers, orchestration.
- `src/adapters/`: thin transport adapters for Next.js and Express.
- `src/client/`: browser-only cookie helpers.
- `tests/unit/`: focused unit coverage for each critical path.
- `example-next/`: minimal merchant-facing integration example.

## Validation Plan

- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm --filter example-next typecheck`
- `pnpm --filter example-next build`
