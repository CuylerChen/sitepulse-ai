import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — SEO checker for your homepage" },
  description:
    "Check homepage SEO without a rank tracker. SitePulse reviews title, meta description, headings, canonical, and indexability.",
};

const looks = [
  { name: "Title", why: "The blue link in search is often the title tag. We note if it is missing, very short, or long enough to be cut off." },
  { name: "Meta description", why: "Not a ranking lever by itself, but it is the sentence you control in many results. A missing one lets the engine pick a snippet." },
  { name: "H1", why: "The main heading should match the page. Multiple H1s, or none, make the topic harder to confirm." },
  { name: "Canonical", why: "If the canonical points at a different host or a redirected URL, the page you are editing may not be the one search keeps." },
  { name: "Index directives", why: "A leftover noindex from a staging theme will keep a finished store out of search. We surface that as a fail, not a suggestion." },
  { name: "Status and redirects", why: "A 404, a soft 200 that is really an error template, or a long redirect chain is an SEO problem before any keyword work matters." },
];

export default function SeoCheckerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">On-page SEO</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">An SEO checker for the page you actually control</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Most SEO checkers either demand a whole-site crawl or try to guess which keywords you should buy. This one does neither. It reads the HTML of the URL you paste and tells you whether the basic on-page signals are present, conflicting, or missing.
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        That is the right first pass for an independent shop. If the homepage is noindex, or the title is still the theme default, keyword research will not help. Fix the page, then measure traffic in Search Console, which this tool does not replace.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Check SEO on this URL</h2>
        <p className="mb-4 mt-1 text-sm text-muted">The scan focuses on SEO signals. Other categories may still appear if the service returns them, but the brief is on-page search.</p>
        <UrlForm focus="seo" id="seo-url" buttonLabel="Check SEO" />
      </div>
      <h2 className="mt-12 text-2xl font-semibold">How to read pass, warning, and fail</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-sm font-semibold text-success">Pass</p>
          <p className="mt-2 text-sm leading-6 text-muted">The signal is present and not obviously broken. A pass is not a ranking.</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-sm font-semibold text-warning">Needs attention</p>
          <p className="mt-2 text-sm leading-6 text-muted">Something is thin, long, or inconsistent. Worth a look this week.</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-sm font-semibold text-error">Fail</p>
          <p className="mt-2 text-sm leading-6 text-muted">A blocker such as a missing title, a noindex, or a page that did not return HTML.</p>
        </div>
      </div>
      <h2 className="mt-12 text-2xl font-semibold">What we look at</h2>
      <ul className="mt-4 space-y-4">
        {looks.map((item) => (
          <li key={item.name}>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{item.why}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm leading-6 text-muted">
        We do not estimate keyword difficulty, domain authority, or backlink counts. If you want the broader homepage picture, run a <Link className="font-semibold text-primary" href="/website-audit">full website audit</Link>. For product templates, see the <Link className="font-semibold text-primary" href="/shopify-seo-checker">Shopify SEO checker</Link>.
      </p>
    </div>
  );
}
