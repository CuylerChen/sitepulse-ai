import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — AI crawler checker" },
  description:
    "See whether GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, and PerplexityBot are allowed, blocked, or unknown on your homepage.",
};

const bots = [
  {
    name: "GPTBot",
    role: "OpenAI training crawler",
    body: "GPTBot is the user agent OpenAI documents for collecting content that may be used to train models. A Disallow rule for GPTBot is a training choice. It is not the same switch as search.",
  },
  {
    name: "OAI-SearchBot",
    role: "OpenAI search crawler",
    body: "OAI-SearchBot is a separate user agent associated with search features. You can allow search and block training, or the reverse. A rule written only for GPTBot does not automatically apply to OAI-SearchBot.",
  },
  {
    name: "ClaudeBot",
    role: "Anthropic training crawler",
    body: "ClaudeBot is Anthropic's crawler for model training. Blocking it does not, by itself, describe what Claude's search crawler is allowed to do.",
  },
  {
    name: "Claude-SearchBot",
    role: "Anthropic search crawler",
    body: "Claude-SearchBot is the search-oriented agent. Treat it as its own group in robots.txt. Copying a ClaudeBot disallow into the wrong group is a common way to block the wrong thing.",
  },
  {
    name: "PerplexityBot",
    role: "Perplexity crawler",
    body: "PerplexityBot is Perplexity's documented crawler. It is not a synonym for GPTBot or ClaudeBot. If your file only mentions Googlebot and a wildcard, this agent may fall through to the wildcard group.",
  },
];

export default function AiCrawlerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">robots.txt, read per crawler</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Which AI crawlers can open your homepage?</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        A single “block AI” line in a plugin often hides five different user agents behind one toggle. SitePulse reads robots.txt and evaluates the homepage path for each crawler on its own. The result is allowed, blocked, or unknown. Unknown means we could not read a clear rule, not that the bot was seen visiting.
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        robots.txt is a request, not a lock. It does not stop a person from opening the page, and it does not guarantee that every crawler will obey it. It is still the file these vendors tell you to edit.
      </p>
      <div className="mt-8 space-y-3">
        {bots.map((bot) => (
          <article key={bot.name} className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-lg font-semibold">{bot.name}</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{bot.role}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{bot.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Check these crawlers on your homepage</h2>
        <p className="mb-4 mt-1 text-sm text-muted">The check uses the AI focus and reports each agent separately. It does not simulate a crawl from those companies.</p>
        <UrlForm focus="ai" id="crawler-url" buttonLabel="Check crawlers" />
      </div>
      <h2 className="mt-12 text-2xl font-semibold">How to read the three states</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
        <li><span className="font-semibold text-ink">Allowed.</span> The matching rule permits the homepage path, or no group blocks it.</li>
        <li><span className="font-semibold text-ink">Blocked.</span> A matching disallow covers the path and is not overridden by a more specific allow.</li>
        <li><span className="font-semibold text-ink">Unknown.</span> robots.txt could not be fetched or parsed into a clear decision. Do not treat unknown as a pass.</li>
      </ul>
      <p className="mt-6 text-sm leading-6 text-muted">
        Related: <Link href="/blog/gptbot-vs-oai-searchbot" className="font-semibold text-primary">GPTBot vs OAI-SearchBot</Link> and <Link href="/bot" className="font-semibold text-primary">how SitePulseBot identifies itself</Link>. ChatGPT-User, which fetches a page during a chat, is a different agent and is not one of the five above.
      </p>
    </div>
  );
}
