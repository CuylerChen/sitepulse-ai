import type { Metadata } from "next";
import Link from "next/link";
import { USER_AGENT } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — SitePulseBot" },
  description: "SitePulseBot fetches only the submitted homepage, robots.txt, and sitemap when someone requests an audit.",
};

export default function BotPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">SitePulseBot</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        SitePulse does not wander the web. A request happens only after someone submits a URL in the product. The user agent on that request is:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-ink">{USER_AGENT}</pre>
      <h2 className="mt-10 text-2xl font-semibold">What we fetch</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>The page at the URL the visitor submitted. That is usually a homepage, and it can be a product URL if that is what they pasted.</li>
        <li>robots.txt on that host, so we can report crawler rules.</li>
        <li>The sitemap referenced from robots.txt, when one is listed. We use it as a reference. We do not fetch every URL inside it.</li>
      </ul>
      <h2 className="mt-10 text-2xl font-semibold">What we do not fetch</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        We do not crawl the rest of the site, open checkout, sign into customer accounts, or connect to Shopify admin. There is no app to install and no ongoing spider. If you see this user agent, someone asked SitePulse to look at that public URL.
      </p>
      <h2 className="mt-10 text-2xl font-semibold">If you want to identify or limit the bot</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        You can match the user agent token SitePulseBot in your logs. A robots.txt group looks like this:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 text-sm">{`User-agent: SitePulseBot
Disallow: /`}</pre>
      <p className="mt-3 text-sm leading-6 text-muted">
        That group tells well-behaved clients to stay out. A scan still starts only when a person submits a URL. If a request from this agent is a problem, use the <Link href="/contact" className="font-semibold text-primary">contact form</Link> and include the time and URL from your logs.
      </p>
      <p className="mt-6 text-sm text-muted">
        Other crawlers your own robots.txt may mention are covered in the <Link href="/ai-crawler-checker" className="font-semibold text-primary">AI crawler checker</Link>.
      </p>
    </div>
  );
}
