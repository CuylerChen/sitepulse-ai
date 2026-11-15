import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Contact" },
  description: "Contact SitePulse about a scan, a bill, or a privacy request.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Contact</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Questions about a scan, a bill, or your account. Include the site URL if you are writing about a report. We reply by email.
      </p>
      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
