import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Create an account" },
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted">Loading the form…</p>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
