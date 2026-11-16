import { WaffoPancakeError } from "@waffo/pancake-ts";
import { currentUser, fail, ok, UpstreamError } from "@/lib/server-api";
import { checkoutSuccessUrl, resolveProProductId, waffoClient, waffoReady } from "@/lib/waffo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let user;
  try {
    user = await currentUser(request);
  } catch (err) {
    if (err instanceof UpstreamError) {
      return fail(502, "UPSTREAM_UNAVAILABLE", "The account service is temporarily unavailable. Try again in a moment.");
    }
    throw err;
  }
  if (!user) return fail(401, "UNAUTHORIZED", "Create an account before upgrading.");
  if (user.plan === "pro" || user.plan === "agency") {
    return fail(409, "ALREADY_SUBSCRIBED", "This account already has a paid plan.");
  }
  if (!waffoReady()) {
    return fail(503, "BILLING_NOT_CONFIGURED", "Checkout is not configured yet. Add WAFFO_PRIVATE_KEY to enable Pro payments.");
  }

  let plan = "pro";
  try {
    const body = (await request.json()) as { plan?: string };
    if (body?.plan) plan = body.plan;
  } catch {
    plan = "pro";
  }
  if (plan !== "pro") return fail(400, "INVALID_INPUT", "Only the Pro plan can be purchased.");

  try {
    const client = waffoClient();
    const productId = await resolveProProductId(client);
    const session = await client.checkout.authenticated.create({
      productId,
      currency: "USD",
      buyerIdentity: user.id,
      buyerEmail: user.email,
      language: "en",
      successUrl: checkoutSuccessUrl(),
      metadata: { user_id: user.id, plan: "pro" },
      orderMerchantExternalId: user.id,
    });
    if (!session.checkoutUrl) {
      return fail(502, "BILLING_FAILED", "Checkout did not return a URL.");
    }
    return ok({ checkout_url: session.checkoutUrl });
  } catch (err) {
    if (err instanceof WaffoPancakeError) {
      const message = err.errors[0]?.message || "Checkout could not be created.";
      return fail(err.status >= 400 && err.status < 600 ? err.status : 502, "BILLING_FAILED", message);
    }
    return fail(502, "BILLING_FAILED", "Checkout could not be created.");
  }
}
