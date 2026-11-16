import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Free website audit" },
  description:
    "Run a free website audit of your homepage. SitePulse checks SEO, performance when available, AI crawler access, and content clarity.",
};

const checklist = [
  { title: "HTTP status and final URL", detail: "We record the status code and whether the address redirected before the HTML arrived." },
  { title: "Title tag", detail: "Presence and length. A missing or very long title is called out in plain language." },
  { title: "Meta description", detail: "Whether the page has one, and whether it is long enough to be useful." },
  { title: "H1 and heading outline", detail: "One clear H1 is easier to summarize than three competing headlines." },
  { title: "Canonical and index directives", detail: "A noindex tag or a canonical that points elsewhere changes what search engines should keep." },
  { title: "robots.txt", detail: "Rules for the homepage path, including separate AI crawler groups when they exist." },
  { title: "Sitemap reference", detail: "Whether robots.txt points at a sitemap. We do not download every URL in it." },
  { title: "Structured data", detail: "JSON-LD that parses, and the types it declares. Invalid markup is not treated as a pass." },
  { title: "Homepage copy", detail: "Whether the visible text says what the business sells, not only a slogan." },
  { title: "Image alt text on this page", detail: "Images in the fetched HTML that have no alt attribute." },
  { title: "AI crawler access", detail: "Allowed, blocked, or unknown for GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, and PerplexityBot." },
  { title: "Performance, when returned", detail: "A score and metrics only if the scan includes them. Otherwise the report says Not available." },
  { title: "Shopify signals", detail: "If the HTML looks like a Shopify storefront, Shopify-specific checks are included. No app install." },
];

export default function WebsiteAuditPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Free website audit</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Audit the homepage your customers land on</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        A website audit is only useful if you know what was actually opened. SitePulse fetches the URL you submit, then reads robots.txt and the sitemap reference. It does not log into Shopify, install a pixel, or crawl the catalog.
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        Use it when a redesign just shipped, a theme app started adding tags, or you want a second opinion before hiring an SEO freelancer. The result is a score plus a list of checks. Critical and high issues are listed first, with steps you can hand to whoever edits the theme.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Run the full homepage audit</h2>
        <p className="mb-4 mt-1 text-sm text-muted">This form uses the full check set: SEO, performance when available, AI readiness, content, and Shopify signals if they apply.</p>
        <UrlForm focus="full" id="website-audit-url" />
      </div>
      <h2 className="mt-12 text-2xl font-semibold">What this audit covers</h2>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {checklist.map((item) => (
          <li key={item.title} className="px-4 py-3">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-12 text-2xl font-semibold">What it does not cover</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Backlinks, keyword rankings, Search Console impressions, and checkout conversion are outside this audit. A high score does not mean page one. A low score does not mean the store is failing. It means the homepage has specific technical gaps.
      </p>
      <p className="mt-6 text-sm text-muted">
        Need a narrower check? Use the <Link href="/seo-checker" className="font-semibold text-primary">SEO checker</Link>, the <Link href="/website-grader" className="font-semibold text-primary">website grader</Link>, or read the <Link href="/blog/website-seo-audit-15-things-to-check" className="font-semibold text-primary">15-point SEO list</Link>.
      </p>
    </div>
  );
}
