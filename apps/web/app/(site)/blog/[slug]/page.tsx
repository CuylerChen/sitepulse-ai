import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle, readingMinutes } from "@/lib/blog";
import { formatDay } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: { absolute: "SitePulse — Article not found" } };
  return {
    title: { absolute: `SitePulse — ${article.title}` },
    description: article.description,
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-muted">
        <Link href="/blog" className="font-semibold text-primary">Blog</Link>
        <span> · {formatDay(article.published)} · {readingMinutes(article)} min read</span>
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{article.title}</h1>
      <p className="mt-4 text-base leading-7 text-muted">{article.description}</p>
      <div className="mt-8 space-y-4 text-base leading-7 text-ink">
        {article.blocks.map((block, index) => {
          if (block.type === "h2") return <h2 key={index} className="pt-4 text-2xl font-semibold">{block.text}</h2>;
          if (block.type === "p") return <p key={index}>{block.text}</p>;
          if (block.type === "ul") {
            return (
              <ul key={index} className="list-disc space-y-2 pl-5">
                {block.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            );
          }
          return (
            <ol key={index} className="list-decimal space-y-2 pl-5">
              {block.items.map((item) => <li key={item}>{item}</li>)}
            </ol>
          );
        })}
      </div>
    </article>
  );
}
