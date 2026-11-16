import { WaffoPancakeError } from "@waffo/pancake-ts";
import { currentUser, fail, ok, UpstreamError } from "@/lib/server-api";
import { WAFFO_STORE_ID, waffoClient, waffoReady } from "@/lib/waffo";

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
  if (!user) return fail(401, "UNAUTHORIZED", "Sign in to manage billing.");
  if (!waffoReady()) {
    return fail(503, "BILLING_NOT_CONFIGURED", "The billing portal is not configured yet.");
  }

  try {
    const { portalUrl } = await waffoClient().auth.createCustomerPortalLink({
      storeId: WAFFO_STORE_ID,
      buyerIdentity: user.id,
    });
    if (!portalUrl) {
      return fail(502, "BILLING_PORTAL_UNAVAILABLE", "The billing portal did not return a valid link.");
    }
    const response = ok({ portal_url: portalUrl });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (err) {
    if (err instanceof WaffoPancakeError) {
      const message = err.errors[0]?.message || "The billing portal could not be opened.";
      return fail(err.status >= 400 && err.status < 600 ? err.status : 502, "BILLING_PORTAL_UNAVAILABLE", message);
    }
    return fail(502, "BILLING_PORTAL_UNAVAILABLE", "The billing portal could not be opened.");
  }
}
