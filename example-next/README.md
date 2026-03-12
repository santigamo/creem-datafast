# example-next

Minimal Next.js app-router example for `creem-datafast`.

## Run it

```bash
cp example-next/.env.example example-next/.env.local
# Fill in your real keys in .env.local
pnpm install
pnpm --filter example-next dev
```

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
