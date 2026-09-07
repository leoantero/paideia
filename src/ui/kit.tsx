import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/**
 * Kit compartilhado do Paideia. Alinhado ao protótipo do Figma (figma/):
 * botões com rótulo em Bricolage, bordas de controle de 2px na cor mist,
 * cards de raio 16 só com hairline (sem sombra), callouts parchment/mist.
 * Tokens em app/globals.css (@theme).
 */

type ButtonVariant = "primary" | "secondary" | "gold" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-strong disabled:bg-mist",
  secondary:
    "border-2 border-mist bg-surface text-ink hover:border-ink disabled:opacity-50",
  gold: "bg-gold text-ink-strong hover:brightness-95 disabled:opacity-50",
  ghost:
    "border-2 border-line bg-transparent text-faint hover:text-ink disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-5 py-3 font-display text-sm font-bold tracking-tight transition-colors disabled:cursor-not-allowed";

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
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
    <Link href={href} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}>
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
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const CONTROL_CLASS =
  "w-full rounded-[var(--radius-sm)] border-2 border-mist bg-surface px-4 py-3 text-sm text-ink placeholder:text-faint transition-colors focus:border-ink";

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
      <select className={`${CONTROL_CLASS} appearance-none pr-10 ${className}`} {...props}>
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
    <div className={`rounded-[var(--radius-lg)] border border-line bg-surface p-[18px] ${className}`}>
      {children}
    </div>
  );
}

export function Callout({
  tone = "warm",
  className = "",
  children,
}: {
  tone?: "warm" | "cool";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    warm: "border-gold bg-parchment",
    cool: "border-transparent bg-mist",
  };
  return (
    <div
      className={`rounded-[var(--radius-sm)] border-[1.5px] ${tones[tone]} p-4 text-[13px] leading-relaxed text-ink ${className}`}
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
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}

/** Botão-voltar sem rota (fecha uma subview controlada por estado). */
export function BackButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </button>
  );
}

/** Seletor de pílulas (filho, turma, seção) — usado em vários painéis. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-colors ${
              active
                ? "border-ink bg-ink text-white"
                : "border-mist bg-surface text-ink hover:border-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Quadrado arredondado com a inicial — avatares de Ajustes/Painel. */
export function Avatar({
  initial,
  size = 44,
  tone = "mist",
}: {
  initial: string;
  size?: number;
  tone?: "mist" | "gold" | "ink";
}) {
  const tones = {
    mist: "bg-mist text-ink",
    gold: "bg-gold text-ink-strong",
    ink: "bg-ink text-gold",
  };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-[14px] font-display font-extrabold ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

/** Selo pequeno de metadado — dificuldade, tipo de questão, "poucos dados". */
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "strong" | "average" | "weak" | "ink";
}) {
  const tones = {
    neutral: "bg-bg text-muted",
    strong: "bg-strong-bg text-strong",
    average: "bg-average-bg text-average",
    weak: "bg-weak-bg text-weak",
    ink: "bg-ink-soft/40 text-ink",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
