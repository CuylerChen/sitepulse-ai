import type { Metadata } from "next";
import { AuditsClient } from "@/components/audits-client";

export const metadata: Metadata = { title: { absolute: "SitePulse — Audit history" } };

export default function AuditsPage() {
  return <AuditsClient />;
}
