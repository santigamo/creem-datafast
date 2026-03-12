export default function HomePage() {
  return (
    <main className="shell">
      <section className="card hero">
        <div className="hero-copy">
          <p className="eyebrow">creem-datafast / example-next</p>
          <h1>Track checkout intent before the redirect.</h1>
          <p>
            This example creates a Creem checkout on the server, injects
            <strong> DataFast tracking cookies </strong>
            into checkout metadata, and forwards supported webhook payments to
            DataFast from
            <strong> /api/webhook/creem</strong>.
          </p>
          <form action="/api/checkout" className="cta-form" method="POST">
            <button className="cta-button" type="submit">
              Launch test checkout
            </button>
            <a className="ghost-link" href="/success">
              Open success page
            </a>
          </form>
          <p className="note">
            The server reads <code>datafast_visitor_id</code> and
            <code>datafast_session_id</code> from the incoming request. No client
            script is required for the basic flow.
          </p>
        </div>

        <div className="stack">
          <article className="panel">
            <h2>Required env</h2>
            <ul className="env-list">
              <li>
                <code>CREEM_API_KEY</code> for the Core SDK client.
              </li>
              <li>
                <code>CREEM_WEBHOOK_SECRET</code> for verifying
                <code>creem-signature</code>.
              </li>
              <li>
                <code>DATAFAST_API_KEY</code> for
                <code>https://datafa.st/api/v1/payments</code>.
              </li>
              <li>
                <code>CREEM_PRODUCT_ID</code> for the checkout button.
              </li>
              <li>
                <code>APP_BASE_URL</code> for success and webhook URLs.
              </li>
            </ul>
          </article>

          <article className="panel">
            <h2>Flow</h2>
            <ol className="step-list">
              <li>
                <code>POST /api/checkout</code> creates a Creem checkout and
                redirects to <code>checkoutUrl</code>.
              </li>
              <li>
                Creem posts <code>checkout.completed</code> or
                <code>subscription.paid</code> to
                <code> /api/webhook/creem</code>.
              </li>
              <li>
                In development, the DataFast payload is logged before the request
                is forwarded.
              </li>
            </ol>
          </article>
        </div>
      </section>
    </main>
  );
}
