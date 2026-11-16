import type { Metadata } from "next";
import Link from "next/link";
import { articles, readingMinutes } from "@/lib/blog";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Blog" },
  description: "Practical notes on homepage SEO, AI crawler access, Shopify product pages, and structured data.",
};

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Notes for store owners</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Short, practical articles about the checks SitePulse runs. None of them promise a ranking in Google or ChatGPT.
      </p>
      <ul className="mt-8 space-y-4">
        {articles.map((article) => (
          <li key={article.slug} className="rounded-xl border border-line bg-card p-5">
            <p className="text-xs text-muted">{formatDay(article.published)} · {readingMinutes(article)} min read</p>
            <h2 className="mt-1 text-xl font-semibold">
              <Link href={`/blog/${article.slug}`} className="hover:text-primary">{article.title}</Link>
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{article.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
