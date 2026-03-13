# example-express

Minimal runnable Express app for `creem-datafast`.

## Compatibility

- Express 5 example
- Node 18+ for local development
- Consumes the built `creem-datafast` workspace package from the repository root `dist/`

## Run it

```bash
cp example-express/.env.example example-express/.env.local
# Fill in your real keys in .env.local
pnpm install
pnpm build
pnpm --filter example-express dev
```

The example reads `example-express/.env.local` automatically, so you do not need `dotenv` or extra CLI flags for local runs.

If you change library source under the repository root, rerun `pnpm build` before restarting the example so `dist/` stays current.

For webhooks to reach your local machine, expose localhost through a tunnel:

```bash
ngrok http 3000
```

Then point your Creem webhook endpoint to `https://<your-tunnel>/api/webhook/creem`.

Open [http://localhost:3000](http://localhost:3000) and press the checkout button.

## What it shows

- Express checkout route calling `createCheckout(..., { request })`
- Raw-body webhook verification via `express.raw({ type: "application/json" })`
- `createExpressWebhookHandler()` wired as the real webhook adapter
- Development-time logging of the payload forwarded to DataFast
- Minimal success page so the redirect target is visible end to end
