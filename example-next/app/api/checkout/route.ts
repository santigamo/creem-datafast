import { NextResponse } from "next/server";

import { getCreemDataFastClient, getExampleConfig } from "../../../lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const client = getCreemDataFastClient();
  const config = getExampleConfig();
  const { checkoutUrl } = await client.createCheckout(
    {
      productId: config.productId,
      successUrl: new URL("/success", config.appBaseUrl).toString()
    },
    {
      request
    }
  );

  return NextResponse.redirect(checkoutUrl, { status: 303 });
}
