import type { Metadata } from "next";
import Link from "next/link";
import { ReportView } from "@/components/report-view";
import { sampleReport } from "@/lib/sample-report";
import { UrlForm } from "@/components/url-form";
import { ButtonLink, Card } from "@/components/ui";
import { RANKING_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Website audit and AI search readiness" },
  description:
    "Find SEO issues, performance problems, and AI search readiness gaps in seconds. Free homepage audit for independent sites and Shopify stores.",
};

const features = [
  {
    title: "SEO",
    body: "See whether the title, description, headings, canonical, and indexing directives on the page you submit are working together. This is an on-page check, not a rank tracker.",
  },
  {
    title: "Performance",
    body: "When a scan returns lab data, you get a performance score and the usual speed metrics. If it does not, the report says Not available. We never turn a missing number into a zero.",
  },
  {
    title: "AI readiness",
    body: "Check whether known AI crawlers are allowed, blocked, or unknown, and whether the page states what you sell in HTML a crawler can read. This is readiness, not a citation tracker.",
  },
  {
    title: "Content",
    body: "A short page with a vague heading is hard to summarize. The content checks look at headings, description length, and whether the page explains the offer in plain language.",
  },
];

const steps = [
  { title: "Enter a homepage", body: "Paste a domain or a full URL. No account, theme edit, or Shopify app is required to start." },
  { title: "We open that page", body: "SitePulseBot fetches the submitted page, robots.txt, and the sitemap reference. It does not walk the rest of the store." },
  { title: "Read the fix list", body: "You get a score, the checks behind it, and recommendations written for a store owner, not a search engineer." },
];

const faqs = [
  {
    q: "What does the free audit include?",
    a: "A scan of the page you submit, plus robots.txt and the sitemap reference. You see scores, checks, and recommendations. It is not a full-site crawl and it does not connect to Shopify admin.",
  },
  {
    q: "Do I need to sign up?",
    a: "No. You can run a homepage audit without an account. An account is for history, saved websites, and paid plans.",
  },
  {
    q: "Is AI Readiness a ChatGPT ranking?",
    a: "No. AI Readiness measures whether crawlers can access and understand the site. It is not a ranking in ChatGPT, Google, or Perplexity, and it is not a promise of traffic.",
  },
  {
    q: "Why would performance say Not available?",
    a: "Some scans do not return a performance score. We leave the field blank and explain that. A blank score is not a zero and should not be treated as a failure by itself.",
  },
  {
    q: "Can I share or print the report?",
    a: "You can publish a public link from the report and revoke it later. PDF print is included with Pro. Free scans still show the full report in the browser.",
  },
];

const faqJson = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function HomePage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson).replace(/</g, "\\u003c") }} />
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 md:pt-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Homepage audit for store owners</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">Is your website ready for search?</h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Find SEO issues, performance problems, and AI search readiness gaps in seconds.
          </p>
        </div>
        <div id="audit" className="mt-8 max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
          <UrlForm focus="full" id="home-url" />
          <p className="mt-4 text-sm text-muted">No signup required · Homepage only · Free website audit</p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white" aria-label="What a scan covers">
        <ul className="mx-auto grid max-w-6xl gap-4 px-4 py-5 text-sm text-ink sm:grid-cols-2 lg:grid-cols-4">
          <li>No signup required for a first scan</li>
          <li>Homepage, robots.txt, and sitemap only</li>
          <li>Built for independent stores and Shopify</li>
          <li>Scores explained in plain language</li>
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">What the audit looks at</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-primary">0{index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="sample" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">What a report looks like</h2>
            <p className="mt-1 text-sm text-muted">The numbers below are a static preview so you can see the layout before you scan.</p>
          </div>
          <Link href="/website-audit" className="text-sm font-semibold text-primary">See what a live audit covers</Link>
        </div>
        <ReportView report={sampleReport} mode="sample" />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold">Free</h3>
            <p className="mt-2 text-3xl font-semibold">$0</p>
            <p className="mt-2 text-sm leading-6 text-muted">Run a homepage audit without a credit card. A limited monthly allowance applies once you create an account.</p>
            <ButtonLink href="/#audit" className="mt-5">Run free audit</ButtonLink>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">Pro</h3>
            <p className="mt-2 text-3xl font-semibold">$19<span className="text-sm font-medium text-muted">/mo</span></p>
            <p className="mt-2 text-sm leading-6 text-muted">30 audits, full AI suggestions, history, PDF print, and shareable report links.</p>
            <ButtonLink href="/pricing" variant="secondary" className="mt-5">Compare plans</ButtonLink>
          </Card>
        </div>
        <p className="mt-3 text-sm text-muted">Agency is $49/mo and marked coming soon. It is not available to purchase yet.</p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-2xl font-semibold">Questions</h2>
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {faqs.map((item) => (
            <details key={item.q} className="px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
              <p className="mt-2 text-sm leading-6 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{RANKING_DISCLAIMER}</p>
      </section>
    </div>
  );
}
