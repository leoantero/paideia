import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/**
 * Kit compartilhado do Paideia, na identidade Glaukópis
 * (design/redesign-glaukopis/): botões "noite" com rótulo em Manrope 800,
 * inputs com borda de 1.5px, cartões brancos sem borda (raio 14), callouts em
 * lamparina/glauco. Tokens em app/globals.css.
 */

type ButtonVariant = "primary" | "secondary" | "gold" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-night text-on-night hover:opacity-90 disabled:bg-line disabled:text-muted",
  secondary:
    "border-[1.5px] border-input bg-surface text-ink hover:border-night disabled:opacity-50",
  gold: "bg-lamp text-on-lamp hover:brightness-95 disabled:opacity-50",
  ghost: "bg-transparent text-muted hover:text-ink disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius)] px-5 text-[15px] font-extrabold transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
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
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
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
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const CONTROL_CLASS =
  "h-12 w-full rounded-[var(--radius-sm)] border-[1.5px] border-input bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-night focus:outline-none";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
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
      className={`rounded-[var(--radius-lg)] bg-surface p-[18px] ${className}`}
    >
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
    warm: "bg-lamp-soft",
    cool: "bg-glauco-soft",
  };
  return (
    <div
      className={`rounded-[var(--radius-sm)] ${tones[tone]} p-4 text-[13px] leading-relaxed text-ink ${className}`}
    >
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-semibold text-coral-ink">
      {children}
    </p>
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
    >
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {children}
    </Link>
  );
}

/** Botão-voltar sem rota (fecha uma subview controlada por estado). */
export function BackButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
    >
      <svg
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
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
            className={`min-h-11 rounded-full px-4 text-[14px] font-bold transition-colors ${
              active
                ? "bg-night text-on-night"
                : "bg-surface text-muted ring-1 ring-line-strong hover:text-ink"
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
    mist: "bg-lavender text-lavender-ink",
    gold: "bg-lamp text-on-lamp-accent",
    ink: "bg-panel text-glauco",
  };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-display ${tones[tone]}`}
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
    ink: "bg-lavender text-lavender-ink",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Cartão de linhas rótulo → valor, com divisória (prancha `Ajustes`). Use para
 * dados de conta, escola, contrato.
 */
export function InfoList({
  rows,
  className = "",
}: {
  rows: { label: ReactNode; value?: ReactNode; detail?: ReactNode }[];
  className?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section
      className={`flex flex-col rounded-[var(--radius-lg)] bg-surface ${className}`}
    >
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-[18px] py-3.5 ${
            i > 0 ? "border-t border-line" : ""
          }`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-bold">{r.label}</span>
            {r.detail && (
              <span className="text-[13px] text-muted">{r.detail}</span>
            )}
          </span>
          {r.value != null && (
            <span className="max-w-[60%] text-right text-sm text-muted">
              {r.value}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

/** Abas sublinhadas (pranchas `TelaPodio`, `GestorDashboard`). */
export function UnderlineTabs<T extends string>({
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
    <div
      role="tablist"
      className={`flex justify-between gap-2 border-b border-line-strong ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`-mb-px h-11 px-0.5 text-[13.5px] ${
              active
                ? "border-b-[2.5px] border-night font-extrabold text-ink"
                : "font-semibold text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pílulas de escolha (filho, turma), pranchas `PaisPainel` e `ProfTurma`. */
export function ChoiceTabs({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: { value: string; label: ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`${
              size === "md"
                ? "h-10 rounded-[var(--radius-sm)] px-4 text-sm"
                : "h-9 rounded-[9px] px-3.5 text-[13px]"
            } ${
              active
                ? "bg-night font-extrabold text-on-night"
                : "border-[1.5px] border-input bg-surface font-bold text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Linha de privacidade com cadeado, no rodapé dos painéis. */
export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2.5 text-[13px] leading-normal text-muted">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="mt-px shrink-0"
      >
        <path d="M6 10.5h12v10H6zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
