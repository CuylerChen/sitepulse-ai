import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Refund policy" },
  description: "How SitePulse handles Pro subscription charges, cancellations, and refund requests.",
};

export default function RefundPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-muted">
      <h1 className="text-3xl font-semibold text-ink">Refund policy</h1>
      <p className="mt-2 text-xs">Last updated November 15, 2026</p>
      <p className="mt-6">
        SitePulse sells a software subscription, not a custom SEO engagement. This page explains what happens if you cancel or if a charge should not have gone through.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Free and Agency</h2>
      <p>The Free plan is $0. There is nothing to refund. Agency is marked coming soon and is not purchasable, so there is no Agency charge to reverse.</p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Pro</h2>
      <p>
        Pro is $19 per month, billed in advance when checkout is available. It includes 30 audits, full AI suggestions, history, PDF print, and share. You can cancel in the billing portal. Cancellation stops the next renewal. Access continues through the period you already paid for.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Refund window</h2>
      <p>
        If the product did not work as described, email us through the <Link href="/contact" className="font-semibold text-primary">contact form</Link> within 14 days of the first charge. Include the account email and the charge date. We will refund that first charge if we cannot provide the paid features, or if you were charged because checkout was misconfigured. We do not refund unused audit credits after that window, and we do not refund partial months after you have used the paid export and sharing features through the period.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Failed checkout</h2>
      <p>
        If the service returns BILLING_NOT_CONFIGURED, no subscription was created. You should not see a charge. If your card was charged anyway, contact us and we will help you reverse it.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">What a refund does not cover</h2>
      <p>
        A refund is not compensation for search rankings, AI citations, or sales. The audit is a technical report. Paying for Pro does not buy placement in Google or ChatGPT.
      </p>
    </article>
  );
}
