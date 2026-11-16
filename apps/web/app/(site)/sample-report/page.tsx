import type { Metadata } from "next";
import Link from "next/link";
import { ReportView } from "@/components/report-view";
import { sampleReport } from "@/lib/sample-report";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Sample audit report" },
  description: "A sample homepage audit report. Scores, checks, and fixes without a live scan.",
};

export default function SampleReportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-muted">
        This is sample data so you can see the report layout.{" "}
        <Link href="/#audit" className="font-semibold text-primary">
          Run a live audit
        </Link>
        .
      </p>
      <div className="mt-6">
        <ReportView report={sampleReport} mode="sample" />
      </div>
    </div>
  );
}
