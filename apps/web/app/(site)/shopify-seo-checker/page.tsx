import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Shopify SEO checker" },
  description:
    "Check Shopify SEO from the public storefront. No app install, no admin access. Built around product-page issues store owners can fix.",
};

const productIssues = [
  { title: "Theme default titles", body: "A product page titled only with the theme name, or “Home”, wastes the one line shoppers see in search. Put the product name and a useful qualifier in the title field, not in an app slogan." },
  { title: "Descriptions copied from the supplier", body: "The same paragraph on ten stores does not help a shopper choose you. Rewrite the opening so it matches how you actually ship, size, and support the item." },
  { title: "Variant URLs and canonicals", body: "Color and size parameters can create many addresses for one product. The canonical should point at the URL you want kept, and the visible product should match that choice." },
  { title: "Product structured data", body: "Shopify often emits Product JSON-LD. If an app or a custom theme removes it, or the price in the script does not match the price on the page, the check will say so." },
  { title: "Apps that add noindex", body: "Coming-soon apps, markets, and password pages sometimes leave a noindex tag on a live product. That is a storefront problem, and you do not need to install SitePulse to see it." },
  { title: "Images without alt text", body: "The first product image is often the one a crawler and a screen reader both meet. Name the product in the alt text. Do not stuff keywords into every angle." },
];

export default function ShopifySeoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Shopify storefront, no install</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">A Shopify SEO check that never asks for admin access</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        You should not have to install an app to learn whether a product page has a title, a description, and markup a crawler can read. Paste the public URL. SitePulse fetches that page the way a visitor’s browser would, then looks for Shopify signals in the HTML. There is no OAuth screen and no theme edit.
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        The useful work on Shopify is usually on the product template, not on a blog post about keywords. Collection pages and the homepage matter, but a product URL is where price, availability, and unique copy either show up or do not. Submit a product page if that is the template you want judged. Submit the homepage if you want the front door.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Check a Shopify URL</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Use your public store domain, not the admin. A product URL is welcome. Nothing is installed on the shop.</p>
        <UrlForm focus="shopify" id="shopify-url" buttonLabel="Check Shopify SEO" />
      </div>
      <h2 className="mt-12 text-2xl font-semibold">Product-page issues this is built to catch</h2>
      <div className="mt-4 space-y-4">
        {productIssues.map((item) => (
          <section key={item.title}>
            <h3 className="text-base font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 rounded-xl bg-card p-4 text-sm leading-6 text-muted">
        SitePulse does not change your theme, create redirects, or edit products. If a check fails, the recommendation is something you or your theme developer can do in Shopify admin. For a walkthrough, read <Link href="/blog/how-to-improve-shopify-product-page-seo" className="font-semibold text-primary">how to improve Shopify product page SEO</Link>.
      </p>
    </div>
  );
}
