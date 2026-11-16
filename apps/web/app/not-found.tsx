import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">This page is not on SitePulse</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The address may be mistyped, or the report link may have been unpublished.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/">Go to the homepage</ButtonLink>
          <Link href="/#audit" className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-semibold">
            Run free audit
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
