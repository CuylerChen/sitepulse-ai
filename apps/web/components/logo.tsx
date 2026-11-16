import Link from "next/link";

type LogoProps = {
  tone?: "dark" | "light";
  href?: string;
  className?: string;
};

export function LogoMark({ size = 28 }: { tone?: "dark" | "light"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="4" y="4" width="24" height="24" fill="#0E8F6E" />
      <path d="M10 16.5 14 20.5 22 11.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: LogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 text-ink ${className}`} aria-label="SitePulse home">
      <LogoMark />
      <span className="text-base font-semibold tracking-tight">SitePulse</span>
    </Link>
  );
}
