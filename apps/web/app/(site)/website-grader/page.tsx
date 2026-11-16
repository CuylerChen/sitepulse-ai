import type { Metadata } from "next";
import Link from "next/link";
import { UrlForm } from "@/components/url-form";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Website grader" },
  description:
    "Grade your homepage from 0 to 100. SitePulse explains the band, the category scores, and what a grade is not.",
};

const bands = [
  { range: "90–100", grade: "Excellent", label: "Strong technical foundation" },
  { range: "75–89", grade: "Good", label: "Good, but needs work" },
  { range: "60–74", grade: "Needs work", label: "Several important gaps" },
  { range: "40–59", grade: "Poor", label: "Significant issues to fix" },
  { range: "0–39", grade: "Critical", label: "Major blockers found" },
];

export default function WebsiteGraderPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Score first</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">A website grade you can explain without a glossary</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        A grade is a summary, not a verdict on the business. SitePulse scores the page you submit from 0 to 100 and attaches a short label. The number is there so you can compare this month to last month. The label is there so you can tell a partner what it means without opening a spreadsheet.
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        Category scores sit next to the overall grade: SEO, performance, AI readiness, and content. If performance data is missing, that card says Not available. It is not scored as zero, and it should not drag a story you cannot support.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Grade this homepage</h2>
        <p className="mb-4 mt-1 text-sm text-muted">This run is score-focused. You still get the checks that produced the grade.</p>
        <UrlForm focus="grader" id="grader-url" buttonLabel="Grade my site" />
      </div>
      <h2 className="mt-12 text-2xl font-semibold">Grade bands</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[520px] border-collapse bg-card text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-3 py-2 font-medium">Grade</th>
            <th className="px-3 py-2 font-medium">What it means</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band) => (
            <tr key={band.grade} className="border-b border-line last:border-b-0">
              <td className="px-3 py-3 font-semibold">{band.range}</td>
              <td className="px-3 py-3">{band.grade}</td>
              <td className="px-3 py-3 text-muted">{band.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <h2 className="mt-10 text-2xl font-semibold">What moves the grade</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Blockers move it more than polish. A noindex directive, a page that fails to load, or a homepage that never says what you sell will matter more than a title that is ten characters too long. AI readiness is part of the picture and is still not a ranking in ChatGPT, Google, or Perplexity.
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">
        Use the grade to decide what to fix this week. Use the <Link href="/website-audit" className="font-semibold text-primary">full audit</Link> when you want the checklist, and the <Link href="/pricing" className="font-semibold text-primary">Pro plan</Link> when you want to keep the history and print it.
      </p>
    </div>
  );
}
