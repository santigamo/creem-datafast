import { InvalidCreemSignatureError } from "../core/errors.js";
import type {
  CreemDataFastClient,
  NextWebhookHandlerOptions
} from "../core/types.js";

export function createNextWebhookHandler(
  client: CreemDataFastClient,
  options: NextWebhookHandlerOptions = {}
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      const rawBody = await request.text();
      await client.handleWebhook({
        rawBody,
        headers: request.headers
      });

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
