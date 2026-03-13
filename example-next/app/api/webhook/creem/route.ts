import { InvalidCreemSignatureError } from "creem-datafast";
import { handleWebhookRequest } from "creem-datafast/next";

import { getCreemDataFastClient } from "../../../../lib/creem-datafast";

export const runtime = "nodejs";

const client = getCreemDataFastClient();

function getUnexpectedErrorMeta(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      message: error.message
    };
  }

  return { error };
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    if (error instanceof InvalidCreemSignatureError) {
      return new Response("Invalid signature", { status: 400 });
    }

    console.error("[example-next] webhook failed", getUnexpectedErrorMeta(error));
    return new Response("Internal error", { status: 500 });
  }
}
