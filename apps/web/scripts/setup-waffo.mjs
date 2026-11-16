import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BillingPeriod, TaxCategory, WaffoPancake, WebhookEventType } from "@waffo/pancake-ts";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const root = resolve(web, "../..");
loadEnv(resolve(root, ".env"));
loadEnv(resolve(web, ".env.local"));
loadEnv(resolve(web, ".env"));

const merchantId = process.env.WAFFO_MERCHANT_ID || "MER_5ooHoLDs8e6BiJuoNToKys";
const storeId = process.env.WAFFO_STORE_ID || "STO_0aKlzB4pGlF2VcZDAOUtc8";
const privateKey =
  process.env.WAFFO_PRIVATE_KEY ||
  (process.env.WAFFO_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64, "base64").toString("utf8")
    : "");
const appUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

if (!privateKey) {
  console.error("Set WAFFO_PRIVATE_KEY or WAFFO_PRIVATE_KEY_BASE64 before running this script.");
  process.exit(1);
}

const client = new WaffoPancake({ merchantId, privateKey });

const { product } = await client.subscriptionProducts.create({
  storeId,
  name: "SitePulse Pro",
  billingPeriod: BillingPeriod.Monthly,
  prices: { USD: { amount: "19.00", taxCategory: TaxCategory.SaaS } },
  description: "30 homepage audits each month, full AI suggestions, history, and shareable reports.",
  successUrl: `${appUrl}/app/billing?checkout=success`,
});

console.log("Created subscription product:", product.id);
console.log("Add this to apps/web/.env.local:");
console.log(`WAFFO_PRO_PRODUCT_ID=${product.id}`);

if (appUrl.startsWith("https://")) {
  const { webhook } = await client.webhooks.add({
    storeId,
    channel: "http",
    url: `${appUrl}/api/webhooks/waffo`,
    events: [
      WebhookEventType.SubscriptionActivated,
      WebhookEventType.SubscriptionPaymentSucceeded,
      WebhookEventType.SubscriptionRenewed,
      WebhookEventType.SubscriptionRecovered,
      WebhookEventType.SubscriptionPlanChanged,
      WebhookEventType.SubscriptionCanceling,
      WebhookEventType.SubscriptionUncanceled,
      WebhookEventType.SubscriptionCanceled,
      WebhookEventType.SubscriptionPastDue,
      WebhookEventType.RefundSucceeded,
    ],
    testMode: false,
  });
  console.log("Registered webhook:", webhook.id, webhook.url);
} else {
  console.log("Skipped webhook registration because APP_BASE_URL is not https. Add https://sitepulse.ai/api/webhooks/waffo in the Waffo dashboard.");
}
