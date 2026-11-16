import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";
import { ButtonLink, Card } from "@/components/ui";
import { RANKING_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Discover why your website isn't ranking" },
  description:
    "Get a comprehensive SEO and AI visibility audit with actionable insights. One free analysis — paste your URL.",
};

const modules = [
  {
    title: "SEO Foundation Audit",
    body: "On-page, technical & content quality analysis",
    href: "/seo-checker",
    icon: "shield",
  },
  {
    title: "AI Visibility Engine",
    body: "Optimized for ChatGPT, Gemini & AI Overviews",
    href: "/ai-visibility-checker",
    icon: "nodes",
  },
  {
    title: "Backlink Intelligence",
    body: "Authority profile & link quality analysis",
    href: "/website-audit",
    icon: "link",
  },
  {
    title: "Competitor Intelligence",
    body: "Gap analysis & competitive benchmarking",
    href: "/website-grader",
    icon: "user",
  },
  {
    title: "Ranking Predictor",
    body: "Data-driven ranking potential estimation",
    href: "/website-grader",
    icon: "chart",
  },
  {
    title: "Smart Action Plan",
    body: "Prioritized, actionable improvement steps",
    href: "/website-audit",
    icon: "bolt",
  },
] as const;

const faqs = [
  {
    q: "What does the free analysis include?",
    a: "One homepage scan, plus robots.txt and the sitemap reference. You get scores, checks, and a prioritized fix list. It is not a full-site crawl.",
  },
  {
    q: "Do I need to sign up?",
    a: "No. The first analysis runs without an account. An account keeps history and unlocks Pro.",
  },
  {
    q: "Is the score a Google or ChatGPT ranking?",
    a: "No. The score explains technical readiness and on-page gaps. It is not a ranking in Google, ChatGPT, Gemini, or Perplexity, and it is not a promise of traffic.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-line bg-white px-4 pb-20 pt-16 md:pb-24 md:pt-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="inline-flex items-center gap-2 bg-primary px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            AI-Powered SEO & Visibility Analysis
          </p>
          <h1 className="mt-8 max-w-4xl text-4xl font-semibold tracking-tight text-ink sm:text-6xl sm:leading-[1.08]">
            Discover Why Your
            <br />
            Website <span className="text-primary">Isn&apos;t Ranking</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Get a comprehensive SEO & AI visibility audit with actionable insights. 1 free analysis — just paste your URL.
          </p>
          <div id="audit" className="mt-10 w-full">
            <UrlForm focus="full" id="home-url" variant="hero" buttonLabel="Analyze" />
          </div>
          <ul className="mt-6 flex flex-col items-center gap-3 text-sm text-muted sm:flex-row sm:gap-6">
            <li className="inline-flex items-center gap-2">
              <SparkIcon /> AI-powered analysis
            </li>
            <li className="inline-flex items-center gap-2">
              <GlobeMini /> 1 free analysis — no signup needed
            </li>
            <li className="inline-flex items-center gap-2">
              <ClockIcon /> Actionable insights in minutes
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">6 Modules. One Complete Audit.</h2>
          <p className="mt-3 text-muted">Every angle of your search visibility analyzed and scored.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group border border-line bg-white p-6 hover:border-primary"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center bg-primary text-white">
                <ModuleIcon name={item.icon} />
              </span>
              <h3 className="mt-8 text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-2 text-3xl font-semibold">$0</p>
          <p className="mt-2 text-sm leading-6 text-muted">One homepage analysis, no card. Create an account when you want history.</p>
          <ButtonLink href="/#audit" className="mt-5">Analyze a site</ButtonLink>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Pro</h2>
          <p className="mt-2 text-3xl font-semibold">$19<span className="text-sm font-medium text-muted">/mo</span></p>
          <p className="mt-2 text-sm leading-6 text-muted">30 audits, full suggestions, history, PDF print, and shareable report links.</p>
          <ButtonLink href="/pricing" variant="secondary" className="mt-5">Compare plans</ButtonLink>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-2xl font-semibold">Questions</h2>
        <div className="mt-4 divide-y divide-line border border-line bg-white">
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

function ModuleIcon({ name }: { name: (typeof modules)[number]["icon"] }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (name === "shield") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 3 5 6v6c0 4.5 2.8 7.4 7 9 4.2-1.6 7-4.5 7-9V6l-7-3z" />
      </svg>
    );
  }
  if (name === "nodes") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="7" cy="8" r="2" />
        <circle cx="17" cy="7" r="2" />
        <circle cx="12" cy="17" r="2" />
        <path d="M9 9.2 11 15M15 8.8 13 15M9 8h6" />
      </svg>
    );
  }
  if (name === "link") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.1.1l1.4-1.4a5 5 0 0 0-7.1-7.1L10 6" />
        <path d="M14 11a5 5 0 0 0-7.1-.1L5.5 12.3a5 5 0 0 0 7.1 7.1L14 18" />
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.4-3 3.6-4.5 7-4.5S17.6 16 19 19" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 19h16M7 16l3.2-4 2.6 2.2L17 8" />
        <path d="M14 8h3v3" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M13 3 6 13h5l-1 8 8-12h-5l0-6z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E8F6E" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

function GlobeMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E8F6E" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2 2.4 3 5 3 8s-1 5.6-3 8c-2-2.4-3-5-3-8s1-5.6 3-8z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E8F6E" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}
