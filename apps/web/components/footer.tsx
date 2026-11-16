import Link from "next/link";
import { Logo } from "@/components/logo";
import { RANKING_DISCLAIMER } from "@/lib/site";

const product = [
  { href: "/website-audit", label: "Website audit" },
  { href: "/seo-checker", label: "SEO checker" },
  { href: "/ai-visibility-checker", label: "AI search readiness" },
  { href: "/ai-crawler-checker", label: "AI crawler checker" },
  { href: "/shopify-seo-checker", label: "Shopify SEO" },
  { href: "/website-grader", label: "Website grader" },
  { href: "/sample-report", label: "Sample report" },
  { href: "/pricing", label: "Pricing" },
];

const company = [
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/bot", label: "SitePulseBot" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/refund", label: "Refunds" },
  { href: "/legal/cookies", label: "Cookies" },
];

export function Footer() {
  return (
    <footer className="site-footer border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            Homepage audits for independent sites and Shopify stores. Scores, checks, and plain-language fixes.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Product</h2>
          <ul className="mt-3 space-y-2">
            {product.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-muted hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Company</h2>
          <ul className="mt-3 space-y-2">
            {company.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-muted hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm leading-6 text-muted">{RANKING_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
