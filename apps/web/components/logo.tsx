import Link from "next/link";

type LogoProps = {
  tone?: "dark" | "light";
  href?: string;
  className?: string;
};

export function LogoMark({ tone = "dark", size = 28 }: { tone?: "dark" | "light"; size?: number }) {
  const track = tone === "light" ? "rgba(255,255,255,0.28)" : "#DBEAFE";
  const arc = tone === "light" ? "#FFFFFF" : "#2563EB";
  const dot = tone === "light" ? "#C7D2FE" : "#6366F1";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <circle cx="16" cy="16" r="11" fill="none" stroke={track} strokeWidth="3" />
      <path
        d="M16 5a11 11 0 0 1 9.53 5.5"
        fill="none"
        stroke={arc}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="25.2" cy="11.1" r="2.35" fill={dot} />
    </svg>
  );
}

export function Logo({ tone = "dark", href = "/", className = "" }: LogoProps) {
  const color = tone === "light" ? "text-white" : "text-ink";
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${color} ${className}`} aria-label="SitePulse home">
      <LogoMark tone={tone} />
      <span className="text-base font-semibold tracking-tight">SitePulse</span>
    </Link>
  );
}
