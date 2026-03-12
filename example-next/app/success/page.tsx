export default function SuccessPage() {
  return (
    <main className="spread">
      <div className="spread-left">
        <div>
          <p className="eyebrow">checkout complete</p>
          <h1>
            Payment
            <br />
            confirmed.
          </h1>
          <p className="subtitle">
            Creem redirected the customer back to your app. The webhook handler
            verifies the signature and forwards the payment to DataFast with
            visitor attribution.
          </p>
        </div>
        <a className="ghost-link" href="/">
          Back to landing
        </a>
      </div>

      <div className="spread-right">
        <div className="panel">
          <h2 className="panel-title">What to check</h2>
          <div className="flow-track">
            <div className="flow-node">
              <span className="node-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong>Server logs</strong>
                <p>
                  Look for <code>forwarding payload to DataFast</code> with the
                  visitor ID and transaction details.
                </p>
              </div>
            </div>
            <div className="flow-node">
              <span className="node-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong>DataFast dashboard</strong>
                <p>
                  The payment appears under the visitor journey with amount,
                  currency, and attribution source.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">In production</h2>
          <p className="panel-body">
            Fetch the order, thank the customer, and surface activation or
            onboarding details. This page only demonstrates the redirect target
            Creem uses after a successful checkout.
          </p>
        </div>
      </div>
    </main>
  );
}
