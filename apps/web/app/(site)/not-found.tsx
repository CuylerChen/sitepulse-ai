import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function SiteNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-16">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold">This page is not on SitePulse</h1>
      <p className="mt-3 text-sm leading-6 text-muted">The address may be mistyped, or the article may have moved.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Go to the homepage</ButtonLink>
        <Link href="/#audit" className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-semibold">
          Run free audit
        </Link>
      </div>
    </div>
  );
}
