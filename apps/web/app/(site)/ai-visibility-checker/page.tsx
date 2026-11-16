import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";
import { RANKING_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — AI search readiness checker" },
  description:
    "Check AI search readiness, not ChatGPT rankings. SitePulse looks at crawler access and whether your homepage can be understood.",
};

export default function AiVisibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Readiness, not tracking</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Check whether AI search can read your site</h1>
      <div className="mt-5 rounded-xl border border-line border-l-4 border-l-primary bg-card px-4 py-3 text-sm leading-6">
        This is not a visibility tracker. SitePulse does not watch mentions in ChatGPT, Google AI Overviews, or Perplexity. {RANKING_DISCLAIMER} Allowing a crawler does not mean you will be cited.
      </div>
      <p className="mt-5 text-base leading-7 text-muted">
        Store owners keep asking why a competitor shows up in an AI answer and they do not. There is no public rank report for that. What you can check is narrower and more honest: can a crawler fetch the homepage, and does the HTML say what you sell without requiring a person to click around?
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        The readiness score combines those technical facts. A blocked crawler, a page that is mostly images, or structured data that does not match the visible text will lower it. A clean robots.txt and a clear H1 will not, by themselves, create demand.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Run an AI readiness check</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Focus is AI access and understandability. It will not tell you how often you are mentioned.</p>
        <UrlForm focus="ai" id="ai-visibility-url" buttonLabel="Check readiness" />
      </div>
      <h2 className="mt-12 text-2xl font-semibold">What “ready” means here</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>The page returns HTML, not only a client-side shell with no text.</li>
        <li>robots.txt has a readable rule for the major AI crawlers, or no rule that blocks them by accident.</li>
        <li>The title, H1, and opening copy name the business and the offer.</li>
        <li>Structured data, if present, parses and matches facts a shopper can see.</li>
      </ul>
      <h2 className="mt-10 text-2xl font-semibold">What this page will not claim</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        We will not show a share of voice, a list of prompts you rank for, or a forecast of traffic from ChatGPT. If a vendor sells that as a guarantee, treat it as marketing. Use this check to remove technical blockers, then judge results in your own analytics.
      </p>
      <p className="mt-6 text-sm text-muted">
        To see each crawler separately, open the <Link href="/ai-crawler-checker" className="font-semibold text-primary">AI crawler checker</Link>. The article <Link href="/blog/what-is-ai-search-readiness" className="font-semibold text-primary">What is AI search readiness?</Link> explains the idea without the form.
      </p>
    </div>
  );
}
