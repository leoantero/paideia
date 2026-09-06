import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/**
 * Small shared UI kit for Paideia. Kept deliberately minimal — just enough
 * shared primitives that every page looks like the same product. Styling
 * uses the design tokens defined in app/globals.css (@theme).
 */

type ButtonVariant = "primary" | "secondary" | "gold";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-white hover:bg-ink-strong disabled:opacity-50",
  secondary:
    "border border-line bg-surface text-ink hover:bg-mist-soft disabled:opacity-50",
  gold: "bg-gold text-ink-strong font-semibold hover:brightness-95 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-body">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const CONTROL_CLASS =
  "w-full rounded-[var(--radius)] border border-line bg-surface px-3.5 py-2.5 text-sm text-body placeholder:text-muted focus:border-ink";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL_CLASS} ${className}`} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`${CONTROL_CLASS} appearance-none pr-10 ${className}`}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink"
      >
        ▾
      </span>
    </div>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(30,58,138,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Callout({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-gold-soft bg-parchment p-4 text-sm text-body ${className}`}
    >
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-weak">
      {children}
    </p>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-ink-strong"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
