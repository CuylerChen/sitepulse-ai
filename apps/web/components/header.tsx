"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { ButtonLink } from "@/components/ui";

const features = [
  { href: "/website-audit", label: "Website audit", detail: "SEO, speed, content, and AI readiness" },
  { href: "/seo-checker", label: "SEO checker", detail: "Titles, indexability, and on-page basics" },
  { href: "/ai-visibility-checker", label: "AI readiness", detail: "Access and clarity, not mention tracking" },
  { href: "/ai-crawler-checker", label: "AI crawler checker", detail: "GPTBot, ClaudeBot, PerplexityBot, and more" },
  { href: "/shopify-seo-checker", label: "Shopify", detail: "Product-page SEO without an app install" },
  { href: "/website-grader", label: "Website grader", detail: "A score you can explain" },
];

export function Header() {
  const pathname = usePathname();
  const menuId = useId();
  const featuresId = useId();
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api<User>("/users/me")
      .then((user) => {
        if (!cancelled) setAuthed(Boolean(user.authenticated));
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    setFeaturesOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setFeaturesOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFeaturesOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <div className="relative" ref={wrapRef}>
            <button
              type="button"
              className="inline-flex h-11 items-center px-3 text-sm font-medium text-ink hover:bg-page"
              aria-expanded={featuresOpen}
              aria-controls={featuresId}
              onClick={() => setFeaturesOpen((value) => !value)}
            >
              Features
            </button>
            {featuresOpen ? (
              <div id={featuresId} className="absolute left-0 top-12 w-80 border border-line bg-white p-1">
                {features.map((item) => (
                  <Link key={item.href} href={item.href} className="block px-3 py-2 hover:bg-page">
                    <span className="block text-sm font-medium text-ink">{item.label}</span>
                    <span className="block text-xs text-muted">{item.detail}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <Link href="/pricing" className="inline-flex h-11 items-center px-3 text-sm font-medium text-ink hover:bg-page">
            Pricing
          </Link>
          <Link href="/blog" className="inline-flex h-11 items-center px-3 text-sm font-medium text-ink hover:bg-page">
            Blog
          </Link>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {authed ? (
            <Link href="/app/dashboard" className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink">
              Login
            </Link>
          )}
          <ButtonLink href="/#audit">Analyze</ButtonLink>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center border border-line lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1" aria-hidden="true">
            <span className="block h-0.5 w-4 bg-ink" />
            <span className="block h-0.5 w-4 bg-ink" />
            <span className="block h-0.5 w-4 bg-ink" />
          </span>
        </button>
      </div>
      {open ? (
        <div id={menuId} className="border-t border-line bg-page px-4 py-3 lg:hidden">
          <div className="flex flex-col">
            {features.map((item) => (
              <Link key={item.href} href={item.href} className="flex h-11 items-center text-sm font-medium text-ink">
                {item.label}
              </Link>
            ))}
            <Link href="/pricing" className="flex h-11 items-center text-sm font-medium text-ink">
              Pricing
            </Link>
            <Link href="/blog" className="flex h-11 items-center text-sm font-medium text-ink">
              Blog
            </Link>
            {authed ? (
              <Link href="/app/dashboard" className="flex h-11 items-center text-sm font-medium text-ink">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="flex h-11 items-center text-sm font-medium text-ink">
                Login
              </Link>
            )}
            <ButtonLink href="/#audit" className="mt-2">
              Analyze
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}
