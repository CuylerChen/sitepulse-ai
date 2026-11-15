import type { Metadata } from "next";
import { AuthGate } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Account" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
