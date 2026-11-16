import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "h-11 w-full rounded-sm border border-line bg-white px-3 text-sm text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:bg-page";

export const labelClass = "mb-1.5 block text-sm font-medium text-ink";

const buttonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-primary text-white hover:bg-[#0b7459]",
  secondary: "border border-line bg-white text-ink hover:bg-page",
  ghost: "text-ink hover:bg-page",
  danger: "border border-red-200 bg-white text-error hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button type={type} className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${buttonBase} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-sm border border-line bg-white p-5 ${className}`}>{children}</div>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span
        className="inline-block h-4 w-4 rounded-full border-2 border-line border-t-primary motion-safe:animate-spin"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
