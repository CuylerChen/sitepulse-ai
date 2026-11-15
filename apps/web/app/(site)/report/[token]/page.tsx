import type { Metadata } from "next";
import Link from "next/link";
import { ReportView } from "@/components/report-view";
import { ButtonLink } from "@/components/ui";
import { getPublicReport } from "@/lib/public-report";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await getPublicReport(token);
  if (!result.ok) {
    return {
      title: { absolute: "SitePulse — Report unavailable" },
      robots: { index: false, follow: false },
    };
  }
  const domain = result.report.audit.domain || "Website";
  const description = result.report.ai_report?.summary?.description || result.report.disclaimer || `Audit report for ${domain}.`;
  return {
    title: { absolute: `SitePulse — ${domain} audit report` },
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${domain} audit report`,
      description,
      url: `/report/${token}`,
    },
  };
}

export default async function PublicReportPage({ params }: Props) {
  const { token } = await params;
  const result = await getPublicReport(token);

  if (!result.ok) {
    const missing = result.reason === "not_found";
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold">{missing ? "This report is unavailable" : "We could not load this report"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {missing
            ? "The link may be wrong, or the owner unpublished the report. Unpublished reports return a 404 and are not shown."
            : "The audit service did not respond. Wait a moment and refresh. If you own the report, open it from your audit history."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/">Go to SitePulse</ButtonLink>
          <Link href="/contact" className="inline-flex h-11 items-center text-sm font-semibold text-primary">Contact support</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ReportView report={result.report} mode="public" siteUrl={SITE_URL} publicToken={token} />
    </div>
  );
}
