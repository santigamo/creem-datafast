export default function SuccessPage() {
  return (
    <main className="shell success">
      <section className="card">
        <p className="eyebrow">success redirect</p>
        <h1>Checkout returned to your app.</h1>
        <p>
          This page is intentionally small. In a real integration you would fetch
          the order, thank the customer, and surface activation or onboarding
          details here.
        </p>
        <p className="note">
          The example only demonstrates the redirect target Creem uses after a
          successful checkout.
        </p>
        <a className="ghost-link" href="/">
          Back to the landing page
        </a>
      </section>
    </main>
  );
}
