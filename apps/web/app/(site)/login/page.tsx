import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Log in" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted">Loading the form…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
