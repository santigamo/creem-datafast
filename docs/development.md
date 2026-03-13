# Development

## Package Checks

```bash
pnpm build
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm smoke:consumer
```

These same checks run in GitHub Actions on every push and pull request.

## CI Pipeline

GitHub Actions validates the root package and workspace examples:

- `package` runs on Node 18 and 20 and checks `build`, `lint`, `typecheck`, and `smoke:consumer`.
- `package` runs plain `pnpm test` on Node 18 and `pnpm test:coverage` on Node 20, so CI keeps the minimum-runtime signal while also printing a readable coverage summary in logs.
- `package` also typechecks `example-express` on Node 18 after building the root package, so the lightweight Express example stays compatible without needing a separate job.
- `cloudflare-workers-smoke` runs the built root package inside workerd via a bundled Cloudflare Worker smoke with injected Creem/DataFast boundaries.
- `bun-smoke` packs the real tarball, installs it into an isolated Bun fixture, and exercises the async signature + webhook core flow with injected external boundaries.
- `example-next` runs on Node 20.9+ because Next.js 16 requires it, builds the root package first, then checks `typecheck` plus `build`.
- The `example-next` CI job uses placeholder env values so it validates compilation of the workspace package integration only; it does not call real Creem or DataFast services.
- `pnpm test` now includes an automated integration test that boots the real `example-express` app over HTTP and covers the full server-side attribution flow with stubbed Creem/DataFast edges.

Those Bun and Cloudflare smoke checks validate portability of the core package surface, not a live third-party Creem/DataFast integration.

`pnpm format:check` validates formatting through Biome, and `pnpm test:coverage` writes reports to `coverage/` while printing the summary table shown in CI logs.

`pnpm smoke:consumer` packs the real `.tgz`, installs it into an isolated TypeScript consumer fixture, runs `tsc --noEmit`, and verifies the root plus `next`, `express`, and `client` subpath imports at runtime.

## Automated Integration Coverage

- Runs against the real `example-express` runtime app over local HTTP.
- Covers checkout creation, tracking injection, webhook signature verification, event mapping, and DataFast forwarding.
- Stubs only the external Creem SDK calls and outbound DataFast request, so this remains an integration test rather than a browser E2E.
- The Express example app factory also accepts injected checkout config in tests, so runtime coverage does not depend on example env vars just to exercise `/api/checkout`.

## Runnable Examples

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

For `example-express`, open `http://localhost:3000`, confirm the landing page loads the optional DataFast script when `DATAFAST_WEBSITE_ID` is set, and use the button to start a checkout. For `example-next`, open the same URL and try both landing-page flows: the same-origin server-cookie form post and the browser-helper button that appends tracking onto `POST /api/checkout`.

Then configure the Creem webhook endpoint to `http://localhost:3000/api/webhook/creem` through your tunnel of choice.

## Manual Local Verification

1. Copy either `example-express/.env.example` or `example-next/.env.example` into the matching `.env.local` file and fill in real Creem and DataFast test credentials.
2. Run `pnpm build` at the repository root so `dist/` reflects your current library changes.
3. Start the example with `pnpm --filter example-express dev` or `pnpm --filter example-next dev`.
4. Expose `http://localhost:3000` through a tunnel such as `ngrok http 3000`.
5. Set the Creem webhook endpoint to `https://<your-tunnel>/api/webhook/creem`.
6. Open the example app, confirm the landing page script is present when `DATAFAST_WEBSITE_ID` is configured, start a checkout, and complete a payment in Creem test mode. In `example-next`, verify both the same-origin server-cookie path and the browser-helper path.
7. Expect the example server logs to show the payload forwarded to DataFast; the Next example also logs processed versus ignored webhook outcomes explicitly.
