"use client";

import { useEffect, useState } from "react";
import { ApiError, api, asApiError } from "@/lib/api";
import { formatDay, planLabel } from "@/lib/format";
import { STATIC_PLANS, money } from "@/lib/plans";
import type { BillingPlan, Subscription, User } from "@/lib/types";
import { ErrorNote } from "@/components/error-note";
import { Button, Card, Spinner } from "@/components/ui";

const showDevUpgrade = process.env.NEXT_PUBLIC_APP_ENV !== "production";

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function BillingClient() {
  const [plans, setPlans] = useState<BillingPlan[]>(STATIC_PLANS);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [me, sub, planData] = await Promise.all([
        api<User>("/users/me"),
        api<Subscription>("/billing/subscription").catch(() => null),
        api<{ plans: BillingPlan[] }>("/billing/plans").catch(() => null),
      ]);
      setUser(me);
      setSubscription(sub);
      if (planData?.plans?.length) setPlans(planData.plans);
      return { me, sub };
    } catch (err) {
      setError(asApiError(err));
      return { me: null, sub: null };
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") !== "success") return;
    setNotice("Confirming your Pro subscription…");
    let n = 0;
    let timer = 0;
    let cancelled = false;

    async function tick() {
      n += 1;
      try {
        const [me, sub] = await Promise.all([
          api<User>("/users/me"),
          api<Subscription>("/billing/subscription").catch(() => null),
        ]);
        if (cancelled) return;
        setUser(me);
        if (sub) setSubscription(sub);
        if (me.plan === "pro" || me.plan === "agency") {
          setNotice("Pro is active.");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (cancelled) return;
      if (n >= 15) {
        setNotice("Payment received. If Pro is not active yet, refresh this page in a minute.");
        return;
      }
      timer = window.setTimeout(() => void tick(), 2000);
    }

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  async function checkout(planId: string) {
    setPending(planId);
    setError(null);
    setNotice(null);
    try {
      const data = await api<{ checkout_url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });
      const url = safeHttpUrl(data.checkout_url);
      if (!url) throw new ApiError("Checkout did not return a valid link.", "BILLING_NOT_CONFIGURED");
      window.location.assign(url);
    } catch (err) {
      setError(asApiError(err));
      setPending(null);
    }
  }

  async function portal() {
    setPending("portal");
    setError(null);
    try {
      const data = await api<{ portal_url: string }>("/billing/portal", { method: "POST", body: JSON.stringify({}) });
      const url = safeHttpUrl(data.portal_url);
      if (!url) throw new ApiError("The billing portal did not return a valid link.", "BILLING_NOT_CONFIGURED");
      window.location.assign(url);
    } catch (err) {
      setError(asApiError(err));
      setPending(null);
    }
  }

  async function devUpgrade() {
    setPending("dev");
    setError(null);
    setNotice(null);
    try {
      await api("/billing/dev-upgrade", { method: "POST", body: JSON.stringify({}) });
      setNotice("Development upgrade applied. Refreshing your plan.");
      await load();
    } catch (err) {
      setError(asApiError(err));
    } finally {
      setPending(null);
    }
  }

  if (loading) return <Spinner label="Loading billing…" />;

  const currentPlan = subscription?.plan || user?.plan || "free";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Current plan: {planLabel(currentPlan)}
          {subscription?.status ? ` · ${subscription.status}` : ""}
          {subscription?.current_period_end ? ` · Renews or ends ${formatDay(subscription.current_period_end)}` : ""}
        </p>
      </div>
      <ErrorNote error={error} />
      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const comingSoon = plan.id === "agency" || plan.available === false;
          return (
            <Card key={plan.id} className="flex flex-col">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-semibold">
                {money(plan.price_monthly)}
                <span className="text-sm font-medium text-muted">/mo</span>
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="mt-5">
                {plan.id === "free" ? (
                  <p className="text-sm text-muted">Your starting plan. No card required.</p>
                ) : comingSoon ? (
                  <Button variant="secondary" disabled>
                    Coming soon
                  </Button>
                ) : currentPlan === plan.id ? (
                  <p className="text-sm text-success">This is your current plan.</p>
                ) : (
                  <Button onClick={() => void checkout(plan.id)} disabled={pending === plan.id || currentPlan === "pro"}>
                    {pending === plan.id ? "Opening checkout…" : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Billing portal</h2>
          <p className="text-sm text-muted">Update a card or cancel. Cancellation keeps access through the period already paid.</p>
        </div>
        <Button variant="secondary" onClick={() => void portal()} disabled={pending === "portal"}>
          {pending === "portal" ? "Opening…" : "Open billing portal"}
        </Button>
      </Card>
      {showDevUpgrade ? (
        <Card>
          <h2 className="text-base font-semibold">Development upgrade</h2>
          <p className="mt-1 text-sm text-muted">Visible only outside production. This does not charge a card.</p>
          <Button className="mt-3" variant="secondary" onClick={() => void devUpgrade()} disabled={pending === "dev"}>
            {pending === "dev" ? "Upgrading…" : "Apply dev upgrade"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
