# example-next

Minimal Next.js app-router example for `creem-datafast`.

## Run it

```bash
cp example-next/.env.example example-next/.env.local
pnpm install
pnpm --filter example-next dev
```

Open [http://localhost:3000](http://localhost:3000), press the checkout button, and point your Creem webhook to `http://localhost:3000/api/webhook/creem`.

## What it shows

- Server-side checkout creation with `createCreemDataFast()`
- Request cookie capture through `createCheckout(..., { request })`
- Webhook handling with `createNextWebhookHandler()`
- Development-time logging of the payload forwarded to DataFast
