import { verifyWebhook } from "@waffo/pancake-ts";
import { applyBillingEvent } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-waffo-signature");

  let event;
  try {
    event = verifyWebhook(body, signature);
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const result = await applyBillingEvent(event);
    if (!result.ok) {
      return new Response("Webhook could not be processed", { status: result.status >= 500 ? 500 : 502 });
    }
    return Response.json({ received: true });
  } catch {
    return new Response("Webhook could not be processed", { status: 500 });
  }
}
