import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Cookie notice" },
  description: "Cookies SitePulse uses for login, and when optional analytics loads.",
};

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7 text-muted">
      <h1 className="text-3xl font-semibold text-ink">Cookie notice</h1>
      <p className="mt-2 text-xs">Last updated November 15, 2026</p>
      <p className="mt-6">
        SitePulse uses a small number of cookies and similar storage. This notice says what they are for. It is not a banner that pretends to offer fifty vendors.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Essential session cookie</h2>
      <p>
        When you log in, the API sets a session cookie. The browser sends it back to the SitePulse origin so account pages know who you are. The web app does not read the cookie in JavaScript. Logging out clears it. Without this cookie, dashboard, billing, and settings will send you to the login page.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Analytics</h2>
      <p>
        PostHog loads only when the site is configured with a public PostHog key. If that key is absent, the analytics script is not added and no analytics cookie is set by SitePulse. When the key is present, PostHog may set its own cookies to count visits and feature use. We use that to see which pages are confusing, not to sell a profile.
      </p>
      <h2 className="mt-8 text-xl font-semibold text-ink">What we do not use</h2>
      <p>We do not drop advertising cookies, and we do not embed a social feed that tracks you across other sites as part of the audit.</p>
      <h2 className="mt-8 text-xl font-semibold text-ink">Your choices</h2>
      <p>
        You can block cookies in your browser. Blocking the session cookie means you can still run a public audit, but you will not stay logged in. You can also use a private window. Questions about a specific cookie go to the <Link href="/contact" className="font-semibold text-primary">contact form</Link>. The broader handling of account data is in the <Link href="/legal/privacy" className="font-semibold text-primary">privacy policy</Link>.
      </p>
    </article>
  );
}
