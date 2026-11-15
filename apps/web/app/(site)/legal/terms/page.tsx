import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Terms of service" },
  description: "Terms for using SitePulse website audits, accounts, and paid plans.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-muted">
      <h1 className="text-3xl font-semibold text-ink">Terms of service</h1>
      <p className="mt-2 text-xs">Last updated November 15, 2026</p>
      <p className="mt-6">
        These terms cover the SitePulse website and audit service. By creating an account or running a scan, you agree to them. If you do not agree, do not use the service.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">The service</h2>
      <p>
        SitePulse fetches a public URL you submit, plus robots.txt and a sitemap reference, and returns scores and recommendations. It is an informational tool for site owners. It is not legal advice, not an SEO retainer, and not a ranking in Google, ChatGPT, or Perplexity. AI Readiness measures whether crawlers can access and understand the site. It is not a promise of traffic.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Your use</h2>
      <p>
        Submit URLs you have a legitimate reason to review, such as your own site or a site a client asked you to audit. Do not use SitePulse to probe private networks, to overwhelm another site, or to bypass access controls. Do not attempt to break the service, scrape it in bulk, or share account passwords. We may suspend an account that abuses rate limits or the scan pipeline.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Accounts and plans</h2>
      <p>
        You are responsible for activity under your login. Free and anonymous use may be limited by a monthly allowance. Pro is described on the pricing page. Agency is not for sale while it is marked coming soon. Plan limits shown in the product control how many audits you can run. Unused audits do not roll over unless the product says they do.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Reports you publish</h2>
      <p>
        A public report link shows the scan to anyone who has the URL. Do not publish a report if you do not want that page to be readable. You can unshare the link. You keep responsibility for the site you scanned. SitePulse does not claim ownership of your content.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Disclaimer and liability</h2>
      <p>
        The service is provided as available. Scores can be wrong if a page blocks the fetch, if markup is unusual, or if a third-party performance source does not return data. A missing metric is shown as not available and is not a zero. To the extent the law allows, SitePulse is not liable for lost profits, lost rankings, or decisions you make from a report. Some states do not allow certain limits, and those rights stay with you.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Billing</h2>
      <p>
        Paid plans are billed as described at checkout and in the <Link href="/legal/refund" className="font-semibold text-primary">refund policy</Link>. If billing is not configured, checkout will fail and you will not be charged.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Changes</h2>
      <p>
        We may update these terms. The date at the top will change. Continued use after an update means you accept the revised terms. Questions go through the <Link href="/contact" className="font-semibold text-primary">contact form</Link>. These terms are governed by the laws of the United States, except where consumer law where you live gives you additional rights.
      </p>
    </article>
  );
}
