import type { Metadata } from "next";
import { WebsitesClient } from "@/components/websites-client";

export const metadata: Metadata = { title: { absolute: "SitePulse — Websites" } };

export default function WebsitesPage() {
  return <WebsitesClient />;
}
