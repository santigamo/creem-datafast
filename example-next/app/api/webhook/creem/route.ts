import { createNextWebhookHandler } from "creem-datafast/next";

import { getCreemDataFastClient } from "../../../../lib/creem-datafast";

export const runtime = "nodejs";

const client = getCreemDataFastClient();

export const POST = createNextWebhookHandler(client);
