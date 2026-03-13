# DataFast Client Hardening Design

Date: 2026-03-13

## Scope

Harden the internal DataFast HTTP client with explicit timeouts, bounded retries, and richer error metadata without changing the package architecture or widening the adapter surface.

## Closed Decisions

- Extend `CreemDataFastOptions` with `timeoutMs` and `retry`.
- Default HTTP timeout: `8000ms`.
- Default retry policy: `1` retry with exponential backoff plus jitter.
- Retry only on network errors, timeout aborts, and HTTP `408`, `429`, `500`, `502`, `503`, `504`.
- Do not retry non-retryable `4xx` responses such as `400`, `401`, `403`, `404`, `422`.
- `DataFastRequestError` should expose `status`, `statusText`, `requestId`, `retryable`, and a truncated `responseBody`.

## Implementation Notes

- Keep the retry loop inside `src/core/datafast-client.ts` so adapters stay transport-only.
- Use `AbortController` per attempt and clear the timeout in a `finally` block.
- Sanitize large error bodies before attaching them to the error to keep logs and test snapshots compact.
- Cover timeout, retryable response retry, non-retryable response no-retry, and error metadata in unit tests.

## Validation Plan

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
