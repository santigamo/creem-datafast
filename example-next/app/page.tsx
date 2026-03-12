export default function HomePage() {
  return (
    <main className="spread">
      <div className="spread-left">
        <div>
          <p className="eyebrow">creem-datafast</p>
          <h1>
            Track checkout
            <br />
            intent before
            <br />
            the redirect.
          </h1>
          <p className="subtitle">
            Creates a Creem checkout on the server, injects
            <strong> DataFast visitor tracking </strong>
            into metadata, and forwards webhook payments automatically.
          </p>
        </div>

        <form action="/api/checkout" className="cta-form" method="POST">
          <button className="cta-button" type="submit">
            Launch test checkout
          </button>
          <a className="ghost-link" href="/success">
            Success page
          </a>
        </form>

        <div className="setup-guides">
          <details className="guide">
            <summary>Set up DataFast</summary>
            <ol>
              <li>
                Create an account at{" "}
                <a href="https://datafa.st" target="_blank" rel="noopener noreferrer">
                  datafa.st
                </a>
              </li>
              <li>
                Add a website &mdash; the domain can be anything, e.g.{" "}
                <code>myapp.com</code>
              </li>
              <li>
                Copy the website ID (<code>dfid_...</code>) from the snippet
              </li>
              <li>
                Go to{" "}
                <a href="https://datafa.st/dashboard/settings" target="_blank" rel="noopener noreferrer">
                  Settings
                </a>{" "}
                and copy your API key
              </li>
            </ol>
          </details>

          <details className="guide">
            <summary>Set up Creem</summary>
            <ol>
              <li>
                Create an account at{" "}
                <a href="https://creem.io" target="_blank" rel="noopener noreferrer">
                  creem.io
                </a>
              </li>
              <li>
                Go to{" "}
                <a href="https://creem.io/dashboard/api-keys" target="_blank" rel="noopener noreferrer">
                  API Keys
                </a>{" "}
                and copy your test key
              </li>
              <li>
                Go to{" "}
                <a href="https://creem.io/dashboard/products" target="_blank" rel="noopener noreferrer">
                  Products
                </a>{" "}
                and create a test product
              </li>
              <li>
                Install{" "}
                <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer">
                  ngrok
                </a>{" "}
                and run <code>ngrok http 3000</code> to expose localhost
              </li>
              <li>
                Go to{" "}
                <a href="https://creem.io/dashboard/webhooks" target="_blank" rel="noopener noreferrer">
                  Webhooks
                </a>{" "}
                and set endpoint to{" "}
                <code>https://&lt;tunnel&gt;/api/webhook/creem</code>
              </li>
            </ol>
          </details>
        </div>
      </div>

      <div className="spread-right">
        <div className="panel">
          <h2 className="panel-title">Flow</h2>
          <div className="flow-track">
            <div className="flow-node">
              <span className="node-label">01</span>
              <div>
                <strong>Capture</strong>
                <p>
                  Server reads <code>datafast_visitor_id</code> from cookies and
                  injects it into Creem checkout metadata.
                </p>
              </div>
            </div>
            <div className="flow-node">
              <span className="node-label">02</span>
              <div>
                <strong>Pay</strong>
                <p>
                  Customer completes payment on Creem. Webhooks fire{" "}
                  <code>checkout.completed</code> and{" "}
                  <code>subscription.paid</code>.
                </p>
              </div>
            </div>
            <div className="flow-node">
              <span className="node-label">03</span>
              <div>
                <strong>Attribute</strong>
                <p>
                  Webhook handler verifies signature, maps payload, and forwards
                  payment to DataFast with visitor attribution.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Environment checklist</h2>
          <div className="env-checklist">
            <label className="env-check">
              <input type="checkbox" />
              <code>CREEM_API_KEY</code>
              <span>Core SDK client</span>
            </label>
            <label className="env-check">
              <input type="checkbox" />
              <code>CREEM_WEBHOOK_SECRET</code>
              <span>Signature verification</span>
            </label>
            <label className="env-check">
              <input type="checkbox" />
              <code>DATAFAST_API_KEY</code>
              <span>Payment forwarding</span>
            </label>
            <label className="env-check">
              <input type="checkbox" />
              <code>DATAFAST_WEBSITE_ID</code>
              <span>Tracking script</span>
            </label>
            <label className="env-check">
              <input type="checkbox" />
              <code>CREEM_PRODUCT_ID</code>
              <span>Checkout product</span>
            </label>
            <label className="env-check">
              <input type="checkbox" />
              <code>APP_BASE_URL</code>
              <span>Redirects &amp; webhooks</span>
            </label>
          </div>
          <p className="panel-note">
            Copy <code>.env.example</code> to <code>.env.local</code> and fill
            in your keys.
          </p>
        </div>
      </div>
    </main>
  );
}
