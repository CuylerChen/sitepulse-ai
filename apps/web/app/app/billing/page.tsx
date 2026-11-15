import type { Metadata } from "next";
import { BillingClient } from "@/components/billing-client";

export const metadata: Metadata = { title: { absolute: "SitePulse — Billing" } };

export default function BillingPage() {
  return <BillingClient />;
}
