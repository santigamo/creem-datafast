import { handleWebhookRequest } from "creem-datafast/next";

import { getCreemDataFastClient } from "../../../../lib/creem-datafast";

export const runtime = "nodejs";

const client = getCreemDataFastClient();

export async function POST(request: Request) {
  const result = await handleWebhookRequest(client, request);

  if (result.ignored) {
    console.info("[example-next] webhook ignored", {
      eventId: result.eventId,
      eventType: result.eventType,
      reason: result.reason
    });

    return new Response("Ignored", { status: 200 });
  }

  console.info("[example-next] webhook processed", {
    eventId: result.eventId,
    eventType: result.eventType,
    transactionId: result.payload.transaction_id
  });

  return new Response("OK", { status: 200 });
}
