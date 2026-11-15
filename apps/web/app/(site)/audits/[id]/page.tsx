import type { Metadata } from "next";
import { AuditRunner } from "@/components/audit-runner";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Audit report" },
  robots: { index: false, follow: false },
};

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eta?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AuditRunner id={id} eta={query.eta} />
    </div>
  );
}
