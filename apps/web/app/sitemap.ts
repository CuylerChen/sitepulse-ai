import type { MetadataRoute } from "next";
import { articles } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

const paths = [
  "/",
  "/website-audit",
  "/seo-checker",
  "/ai-visibility-checker",
  "/ai-crawler-checker",
  "/shopify-seo-checker",
  "/website-grader",
  "/pricing",
  "/contact",
  "/blog",
  "/bot",
  "/legal/privacy",
  "/legal/terms",
  "/legal/refund",
  "/legal/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...paths.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...articles.map((article) => ({
      url: `${SITE_URL}/blog/${article.slug}`,
      lastModified: new Date(article.published),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
