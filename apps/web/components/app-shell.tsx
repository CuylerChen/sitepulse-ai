"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { planLabel } from "@/lib/format";
import { RANKING_DISCLAIMER } from "@/lib/site";
import type { User } from "@/lib/types";
import { Spinner } from "@/components/ui";

const links = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/audits", label: "Audits" },
  { href: "/app/websites", label: "Websites" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/settings", label: "Settings" },
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<User>("/users/me")
      .then((me) => {
        if (cancelled) return;
        if (!me.authenticated) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setUser(me);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // A failed logout still returns the visitor to the public site.
    }
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div id="main" className="mx-auto flex min-h-screen max-w-6xl items-center px-4">
        <Spinner label="Checking your account…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="site-header border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Logo href="/app/dashboard" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Account">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium ${
                  pathname === link.href ? "bg-page text-ink" : "text-muted hover:bg-page hover:text-ink"
                }`}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <p className="text-sm text-muted">
              {user.name || user.email}
              <span className="text-muted"> · </span>
              {planLabel(user.plan)}
            </p>
            <button type="button" onClick={() => void logout()} className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink hover:bg-page">
              Log out
            </button>
          </div>
          <button type="button" className="inline-flex h-11 items-center rounded-xl border border-line px-3 text-sm font-semibold md:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            Menu
          </button>
        </div>
        {open ? (
          <div className="border-t border-line px-4 py-3 md:hidden">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="flex h-11 items-center text-sm font-medium text-ink">
                {link.label}
              </Link>
            ))}
            <button type="button" onClick={() => void logout()} className="flex h-11 items-center text-sm font-semibold text-ink">
              Log out
            </button>
          </div>
        ) : null}
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="site-footer border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted">{RANKING_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
