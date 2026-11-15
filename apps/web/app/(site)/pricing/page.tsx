import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { STATIC_PLANS, money } from "@/lib/plans";
import { RANKING_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "SitePulse — Pricing" },
  description: "Free homepage audits, Pro at $19 per month, and Agency at $49 marked coming soon. No app install.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Simple pricing for a homepage audit</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
        Start without a card. Upgrade when you want 30 audits a month, full suggestions, history, PDF print, and a link you can send to a developer.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {STATIC_PLANS.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-semibold">
              {money(plan.price_monthly)}
              <span className="text-sm font-medium text-muted">/mo</span>
            </p>
            {plan.id === "agency" ? <p className="mt-2 text-sm font-semibold text-warning">Coming soon</p> : null}
            <p className="mt-2 text-sm leading-6 text-muted">{plan.description}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="mt-6">
              {plan.id === "free" ? <ButtonLink href="/#audit">Run free audit</ButtonLink> : null}
              {plan.id === "pro" ? <ButtonLink href="/app/billing">Upgrade to Pro</ButtonLink> : null}
              {plan.id === "agency" ? (
                <button type="button" disabled className="inline-flex h-11 cursor-not-allowed items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-muted">
                  Coming soon
                </button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold">Before you upgrade</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <p>Pro is $19 per month and includes 30 audits, full AI suggestions, history, PDF print, and share. Agency is $49 and is not purchasable. The button on this page does not start an Agency checkout.</p>
          <p>Checkout runs from the billing page after you log in. If billing is not configured on this environment, you will see that error instead of a charge.</p>
          <p>{RANKING_DISCLAIMER} Paying for Pro does not buy rankings or citations.</p>
          <p>
            Questions about a charge? Read the <Link href="/legal/refund" className="font-semibold text-primary">refund policy</Link> or <Link href="/contact" className="font-semibold text-primary">contact us</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
