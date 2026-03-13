# example-next

Minimal Next.js app-router example for `creem-datafast`.

## Compatibility

- Next.js 16 example
- Node 20.9+ required for local development and CI
- Consumes the built `creem-datafast` workspace package from the repository root `dist/`

## Run it

```bash
cp example-next/.env.example example-next/.env.local
# Fill in your real keys in .env.local
pnpm install
pnpm build
pnpm --filter example-next dev
```

If you change library source under the repository root, rerun `pnpm build` before rebuilding or restarting the example so `dist/` stays current.

For webhooks to reach your local machine, expose localhost through a tunnel:

```bash
ngrok http 3000
```

Then point your Creem webhook endpoint to `https://<your-tunnel>/api/webhook/creem`.

Open [http://localhost:3000](http://localhost:3000) and press the checkout button.

## What it shows

- DataFast tracking script injecting `datafast_visitor_id` cookies
- Server-side checkout creation with `createCreemDataFast()`
- Automatic cookie capture through `createCheckout(..., { request })`
- Custom webhook handling with `handleWebhookRequest()`
- Branching on `result.ignored` before returning the final response
- Development-time logging of the payload forwarded to DataFast
