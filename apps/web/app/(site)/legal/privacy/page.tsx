import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Privacy policy" },
  description: "What SitePulse collects when you run an audit or create an account, and how to ask for a copy or deletion.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-muted">
      <h1 className="text-3xl font-semibold text-ink">Privacy policy</h1>
      <p className="mt-2 text-xs">Last updated November 15, 2026</p>
      <p className="mt-6">
        This policy describes how SitePulse handles information when you use the website audit product. It is written for store owners in the United States. It is not a promise that every possible integration is turned on in your environment.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Information you give us</h2>
      <p>
        If you create an account, we store the name, email address, and password credentials you submit, plus the plan attached to the account. We do not ask you to send a Shopify admin password. Audit requests include the URL you paste. Contact messages include the name, email, and message you type into the form.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Information from a scan</h2>
      <p>
        When you submit a URL, SitePulseBot fetches that public page, robots.txt, and the sitemap reference. The report stores the checks, scores, and recommendations produced from that public HTML. We do not crawl the rest of the site and we do not collect customer lists from your store.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Cookies and analytics</h2>
      <p>
        A session cookie keeps you logged in. It is required for account pages. If the operator has set a PostHog key, the site may load PostHog to understand product usage. If that key is absent, PostHog is not loaded. See the <Link href="/legal/cookies" className="font-semibold text-primary">cookie notice</Link>.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">How we use it</h2>
      <p>
        We use account data to authenticate you, apply plan limits, and reply to support requests. We use scan data to show you a report and, if you publish it, to show that report to anyone with the link. We do not sell personal information. We do not use your store URL as a lead to sell to unrelated advertisers.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Sharing</h2>
      <p>
        Payment processing, if you upgrade, is handled by Waffo Pancake. We share only the account email and a stable customer id that checkout needs. A published report is visible to anyone with the URL until you unshare it. We may disclose information if the law requires it.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Retention and your requests</h2>
      <p>
        Reports stay while the account keeps them. You can delete an audit or a saved website from the account pages. To ask for a copy or deletion of account data, use the <Link href="/contact" className="font-semibold text-primary">contact form</Link> from the email on the account. We may keep a record of a billing transaction where tax or accounting rules require it.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Children</h2>
      <p>SitePulse is a business tool. It is not directed at children under 13, and we do not knowingly collect their information.</p>
    </article>
  );
}
