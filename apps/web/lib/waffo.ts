import { BillingPeriod, TaxCategory, WaffoPancake } from "@waffo/pancake-ts";

export const WAFFO_MERCHANT_ID = process.env.WAFFO_MERCHANT_ID || "MER_5ooHoLDs8e6BiJuoNToKys";
export const WAFFO_STORE_ID = process.env.WAFFO_STORE_ID || "STO_0aKlzB4pGlF2VcZDAOUtc8";

type ListedProduct = {
  id: string;
  name: string;
  billingPeriod?: string;
  status?: string;
  prices?: Array<{ currency: string; priceInfo?: { amount: string } }>;
};

let cachedProductId = process.env.WAFFO_PRO_PRODUCT_ID || "";
let resolvingProduct: Promise<string> | null = null;

function privateKey(): string {
  const raw = process.env.WAFFO_PRIVATE_KEY || "";
  if (raw) return raw;
  const encoded = process.env.WAFFO_PRIVATE_KEY_BASE64 || "";
  if (encoded) return Buffer.from(encoded, "base64").toString("utf8");
  return "";
}

export function waffoReady(): boolean {
  return Boolean(WAFFO_MERCHANT_ID && privateKey() && WAFFO_STORE_ID);
}

export function waffoClient(): WaffoPancake {
  const key = privateKey();
  if (!WAFFO_MERCHANT_ID || !key) {
    throw new Error("Waffo Pancake is not configured");
  }
  return new WaffoPancake({ merchantId: WAFFO_MERCHANT_ID, privateKey: key });
}

export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function checkoutSuccessUrl(): string | undefined {
  const origin = appOrigin();
  if (!origin.startsWith("https://")) return undefined;
  return `${origin}/app/billing?checkout=success`;
}

function isProProduct(product: ListedProduct): boolean {
  const name = (product.name || "").toLowerCase();
  const period = (product.billingPeriod || "").toLowerCase();
  const usd = product.prices?.find((price) => price.currency === "USD")?.priceInfo?.amount;
  if (name.includes("sitepulse pro")) return true;
  return name.includes("pro") && period === "monthly" && (usd === "19.00" || usd === "19");
}

export async function resolveProProductId(client: WaffoPancake): Promise<string> {
  if (cachedProductId) return cachedProductId;
  if (!resolvingProduct) {
    resolvingProduct = lookupOrCreateProProduct(client).finally(() => {
      resolvingProduct = null;
    });
  }
  return resolvingProduct;
}

async function lookupOrCreateProProduct(client: WaffoPancake): Promise<string> {
  try {
    const listed = await client.graphql.query<{ subscriptionProducts: ListedProduct[] }>({
      query: `query ($storeId: String!) {
        subscriptionProducts(storeId: $storeId) {
          id name billingPeriod status
          prices { currency priceInfo { amount taxCategory } }
        }
      }`,
      variables: { storeId: WAFFO_STORE_ID },
    });
    const match = (listed.data?.subscriptionProducts || []).find(isProProduct);
    if (match?.id) {
      cachedProductId = match.id;
      return cachedProductId;
    }
  } catch {
    /* create below */
  }

  const created = await client.subscriptionProducts.create({
    storeId: WAFFO_STORE_ID,
    name: "SitePulse Pro",
    billingPeriod: BillingPeriod.Monthly,
    prices: { USD: { amount: "19.00", taxCategory: TaxCategory.SaaS } },
    description: "30 homepage audits each month, full AI suggestions, history, and shareable reports.",
    ...(checkoutSuccessUrl() ? { successUrl: checkoutSuccessUrl() } : {}),
  });
  const product = created.product;
  cachedProductId = product.id;
  return cachedProductId;
}
