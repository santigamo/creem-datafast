import { InvalidCreemSignatureError } from "../core/errors.js";
import type {
  CreemDataFastClient,
  HandleWebhookResult,
  NextWebhookHandlerOptions
} from "../core/types.js";

/**
 * Runs the core webhook flow from a standard Web `Request`.
 *
 * Prefer this when you want custom Next.js response logic but do not want to
 * manually read `request.text()` and pass the raw body through yourself.
 *
 * Note: this consumes the request body stream.
 */
export async function handleWebhookRequest(
  client: CreemDataFastClient,
  request: Request
): Promise<HandleWebhookResult> {
  const rawBody = await request.text();
  return client.handleWebhook({
    rawBody,
    headers: request.headers
  });
}

/**
 * Returns a ready-to-export Next.js route handler for the default webhook path.
 *
 * Prefer this for the minimal integration. Use `handleWebhookRequest()` instead
 * when you need to branch on the webhook result or craft your own response.
 */
export function createNextWebhookHandler(
  client: CreemDataFastClient,
  options: NextWebhookHandlerOptions = {}
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      await handleWebhookRequest(client, request);

      return new Response("OK", { status: 200 });
    } catch (error) {
      await options.onError?.(error);

      if (error instanceof InvalidCreemSignatureError) {
        return new Response("Invalid signature", { status: 400 });
      }

      return new Response("Internal error", { status: 500 });
    }
  };
}
