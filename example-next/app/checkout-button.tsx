"use client";

import { useState } from "react";

import { appendDataFastTracking, getDataFastTracking } from "creem-datafast/client";

export function buildClientCheckoutPath(cookieSource?: string): string {
  return appendDataFastTracking("/api/checkout", getDataFastTracking(cookieSource));
}

export function CheckoutButton() {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(buildClientCheckoutPath(), {
        method: "POST",
        redirect: "manual"
      });
      const location = response.headers.get("Location");

      if (!response.ok || !location) {
        throw new Error(
          `Expected redirect Location header from /api/checkout, received ${response.status}`
        );
      }

      window.location.assign(location);
    } catch (error) {
      console.error("[example-next] client-helper checkout failed", error);
      setErrorMessage("Client helper checkout failed. Check the browser console for details.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="cta-helper">
      <button
        className="ghost-link"
        disabled={isPending}
        type="button"
        onClick={() => {
          void handleClick();
        }}
      >
        {isPending ? "Preparing tracked checkout..." : "Launch checkout with client helper"}
      </button>
      <p className="cta-caption">
        Reads <code>datafast_visitor_id</code> from <code>document.cookie</code>, appends it to{" "}
        <code>/api/checkout</code>, then follows the redirect returned by the server.
      </p>
      {errorMessage ? (
        <output className="cta-error" aria-live="polite">
          {errorMessage}
        </output>
      ) : null}
    </div>
  );
}
