import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings-client";

export const metadata: Metadata = { title: { absolute: "SitePulse — Settings" } };

export default function SettingsPage() {
  return <SettingsClient />;
}
