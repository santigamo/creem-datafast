import express, { type Express } from "express";
import { createExpressWebhookHandler } from "creem-datafast/express";
import type { CreemDataFastClient } from "creem-datafast";

import {
  getCreemDataFastClient,
  getExampleConfig,
  getOptionalExampleDataFastScriptConfig
} from "./creem-datafast.js";

type ExampleExpressCheckoutConfig = {
  appBaseUrl: string;
  productId: string;
};

type ExampleExpressDataFastScriptConfig = {
  domain?: string;
  websiteId: string;
};

type ExampleExpressAppOptions = {
  client?: CreemDataFastClient;
  checkoutConfig?: ExampleExpressCheckoutConfig;
  dataFastScriptConfig?: ExampleExpressDataFastScriptConfig;
};

export function createExampleExpressApp(options: ExampleExpressAppOptions = {}): Express {
  const app = express();
  const client = options.client ?? getCreemDataFastClient();
  const checkoutConfig = options.checkoutConfig;
  const dataFastScriptConfig =
    options.dataFastScriptConfig ?? getOptionalExampleDataFastScriptConfig();

  app.disable("x-powered-by");

  app.get("/", (_req, res) => {
    res.type("html").send(renderPage(dataFastScriptConfig));
  });

  app.post("/api/checkout", async (req, res, next) => {
    try {
      const config = checkoutConfig ?? getExampleCheckoutConfig();
      const { checkoutUrl } = await client.createCheckout(
        {
          productId: config.productId,
          successUrl: new URL("/success", config.appBaseUrl).toString()
        },
        {
          request: {
            headers: req.headers,
            url: req.originalUrl
          }
        }
      );

      res.redirect(303, checkoutUrl);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/webhook/creem",
    express.raw({ type: "application/json" }),
    createExpressWebhookHandler(client, {
      onError(error) {
        console.error("[example-express] webhook failed", error);
      }
    })
  );

  app.get("/success", (_req, res) => {
    res.type("html").send(renderSuccessPage());
  });

  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[example-express] request failed", error);
      res.status(500).type("html").send(renderErrorPage());
    }
  );

  return app;
}

function getExampleCheckoutConfig(): ExampleExpressCheckoutConfig {
  const config = getExampleConfig();

  return {
    appBaseUrl: config.appBaseUrl,
    productId: config.productId
  };
}

function renderDataFastScript(config: ExampleExpressDataFastScriptConfig | undefined): string {
  if (!config) {
    return "";
  }

  const domainAttribute = config.domain ? ` data-domain="${config.domain}"` : "";

  return `
    <script
      defer
      src="https://datafa.st/js/script.js"
      data-website-id="${config.websiteId}"${domainAttribute}
      data-disable-payments="true"
      data-allow-localhost="true"
    ></script>`;
}

function renderPage(dataFastScriptConfig: ExampleExpressDataFastScriptConfig | undefined): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>creem-datafast Express example</title>
    ${renderDataFastScript(dataFastScriptConfig)}
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: #fffaf2;
        --ink: #17212b;
        --muted: #5a6570;
        --accent: #c84c2d;
        --line: #d8c9b4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(200, 76, 45, 0.18), transparent 28rem),
          linear-gradient(180deg, #fcf8f2 0%, var(--bg) 100%);
        color: var(--ink);
        font-family: Georgia, "Times New Roman", serif;
      }
      main {
        width: min(960px, calc(100vw - 2rem));
        margin: 0 auto;
        padding: 3rem 0 4rem;
      }
      .eyebrow {
        margin: 0 0 1rem;
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        max-width: 14ch;
        font-size: clamp(2.8rem, 9vw, 5.4rem);
        line-height: 0.94;
      }
      .subtitle {
        max-width: 40rem;
        color: var(--muted);
        font-size: 1.1rem;
        line-height: 1.7;
      }
      .hero {
        display: grid;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.9rem;
      }
      button, a.link {
        border-radius: 999px;
        padding: 0.95rem 1.35rem;
        font: inherit;
        text-decoration: none;
      }
      button {
        border: 0;
        background: var(--accent);
        color: white;
        cursor: pointer;
      }
      a.link {
        border: 1px solid var(--line);
        color: var(--ink);
      }
      .grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .panel {
        min-height: 100%;
        border: 1px solid var(--line);
        border-radius: 1.5rem;
        background: rgba(255, 250, 242, 0.82);
        padding: 1.35rem;
        backdrop-filter: blur(10px);
      }
      h2 {
        margin: 0 0 1rem;
        font-size: 1.15rem;
      }
      ol, ul {
        margin: 0;
        padding-left: 1.2rem;
        color: var(--muted);
        line-height: 1.6;
      }
      code {
        font-family: "SFMono-Regular", Consolas, monospace;
        font-size: 0.95em;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">creem-datafast / express</p>
        <h1>Browser tracking. Server checkout. Raw-body webhook.</h1>
        <p class="subtitle">
          This example keeps the full flow tangible with plain Express: the landing page can load
          the DataFast browser script, <code>POST /api/checkout</code> creates the hosted Creem
          checkout on the server, and the webhook is still verified through
          <code>express.raw({ type: "application/json" })</code>.
        </p>
        <div class="actions">
          <form action="/api/checkout" method="post">
            <button type="submit">Launch test checkout</button>
          </form>
          <a class="link" href="/success">Open success page</a>
        </div>
      </section>

      <section class="grid">
        <article class="panel">
          <h2>Flow</h2>
          <ol>
            <li>The landing page loads the DataFast script when <code>DATAFAST_WEBSITE_ID</code> is configured, with browser-side payment capture disabled.</li>
            <li><code>POST /api/checkout</code> calls <code>createCheckout()</code> with request headers and URL context.</li>
            <li>Creem redirects the customer to the hosted checkout.</li>
            <li><code>POST /api/webhook/creem</code> validates the raw body and forwards the payment to DataFast.</li>
          </ol>
        </article>

        <article class="panel">
          <h2>Local setup</h2>
          <ol>
            <li>Copy <code>example-express/.env.example</code> to <code>.env.local</code>.</li>
            <li>Run <code>pnpm build</code> at the repo root after library changes.</li>
            <li>Start the app with <code>pnpm --filter example-express dev</code>.</li>
            <li>Expose <code>http://localhost:3000</code> with a tunnel and point Creem webhook deliveries to <code>/api/webhook/creem</code>.</li>
          </ol>
        </article>

        <article class="panel">
          <h2>What to verify</h2>
          <ul>
            <li>The landing page source includes the DataFast script when you set <code>DATAFAST_WEBSITE_ID</code>.</li>
            <li>Server logs show the DataFast payload in development.</li>
            <li>Webhook requests return <code>400</code> for invalid signatures, <code>500</code> for unexpected failures, and <code>200 OK</code> when delivery is accepted or intentionally ignored.</li>
            <li>The payment appears in DataFast with the transaction and attribution fields.</li>
          </ul>
        </article>
      </section>
    </main>
  </body>
</html>`;
}

function renderSuccessPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment confirmed</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f2efe8;
        color: #17212b;
        font-family: Georgia, "Times New Roman", serif;
      }
      main {
        width: min(42rem, calc(100vw - 2rem));
        border: 1px solid #d8c9b4;
        border-radius: 1.5rem;
        background: #fffaf2;
        padding: 2rem;
      }
      h1 { margin-top: 0; font-size: clamp(2.3rem, 8vw, 4rem); }
      p { color: #5a6570; line-height: 1.7; }
      a { color: #c84c2d; }
      code { font-family: "SFMono-Regular", Consolas, monospace; }
    </style>
  </head>
  <body>
    <main>
      <p>checkout complete</p>
      <h1>Payment confirmed.</h1>
      <p>
        Creem redirected the browser back to your app. The browser script can identify the visitor
        before checkout, but the payment attribution still comes from the webhook: check the
        Express logs for the forwarded DataFast payload and confirm the delivery hit
        <code>/api/webhook/creem</code> successfully.
      </p>
      <a href="/">Back to landing</a>
    </main>
  </body>
</html>`;
}

function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Example failed</title>
  </head>
  <body>
    <main style="font-family: sans-serif; margin: 3rem auto; max-width: 40rem; line-height: 1.6;">
      <h1>Example failed.</h1>
      <p>Check the server logs for the missing environment variable or request error.</p>
      <p><a href="/">Back to landing</a></p>
    </main>
  </body>
</html>`;
}
