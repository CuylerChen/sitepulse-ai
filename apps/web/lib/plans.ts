import type { BillingPlan } from "@/lib/types";

export const STATIC_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price_monthly: 0,
    description: "A homepage audit you can run without a credit card.",
    features: [
      "Homepage audit with no app install",
      "SEO, content, and AI readiness checks",
      "Performance score only when a scan returns one",
      "Limited monthly audits",
    ],
    available: true,
  },
  {
    id: "pro",
    name: "Pro",
    price_monthly: 19,
    description: "For store owners who want the full report and a record of past scans.",
    features: [
      "30 audits each month",
      "Full AI suggestions",
      "Audit history",
      "PDF print",
      "Shareable report links",
      "Saved websites",
    ],
    available: true,
  },
  {
    id: "agency",
    name: "Agency",
    price_monthly: 49,
    description: "For freelancers watching more than one store. Not open for purchase yet.",
    features: [
      "Everything in Pro",
      "Built for several client sites",
      "Coming soon",
    ],
    available: false,
  },
];

export function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
