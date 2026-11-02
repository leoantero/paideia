"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  SimulationMeta,
  SimulationTone,
} from "@/src/features/simulations/catalog";
import {
  CheckIcon,
  ChevronLeftIcon,
  CoinDot,
  OwlLineIcon,
} from "@/src/ui/paideia/line-icons";

export const TONE_CLASSES: Record<
  SimulationTone,
  { soft: string; strong: string; ink: string }
> = {
  lamp: { soft: "bg-lamp-soft", strong: "bg-lamp", ink: "text-lamp-ink" },
  lavender: {
    soft: "bg-lavender-soft",
    strong: "bg-lavender",
    ink: "text-lavender-ink",
  },
  glauco: {
    soft: "bg-glauco-soft",
    strong: "bg-glauco",
    ink: "text-glauco-ink",
  },
  coral: { soft: "bg-coral-soft", strong: "bg-coral", ink: "text-coral-ink" },
};

export type MarkDone = (challengeId: string) => void;

/**
 * Casca de toda simulação: a pergunta-gancho da coruja, o palco interativo e
 * os desafios, que se marcam sozinhos quando o aluno chega lá mexendo.
 * Completar todos dá uma recompensa (uma vez por simulação, no servidor).
 */
export function SimulationFrame({
  meta,
  basePath,
  completeEndpoint,
  alreadyCompleted,
  children,
}: {
  meta: SimulationMeta;
  basePath: string;
  completeEndpoint: string;
  alreadyCompleted: boolean;
  children: (markDone: MarkDone) => ReactNode;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [reward, setReward] = useState<{
    points: number;
    coins: number;
  } | null>(null);
  const reported = useRef(alreadyCompleted);
  const tone = TONE_CLASSES[meta.tone];

  const markDone: MarkDone = useCallback((id) => {
    setDone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const allDone = meta.challenges.every((c) => done.has(c.id));

  useEffect(() => {
    if (!allDone || reported.current) return;
    reported.current = true;
    fetch(completeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulationId: meta.slug }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.awarded)
          setReward({ points: data.points, coins: data.coins });
      })
      .catch(() => {});
  }, [allDone, completeEndpoint, meta.slug]);

  const tutorHref = `${basePath}/tutor?sim=${meta.slug}`;

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`${basePath}/simulacoes`}
          className="-ml-1 flex h-9 items-center gap-0.5 self-start text-[13px] font-bold text-muted"
        >
          <ChevronLeftIcon size={18} /> Simulações
        </Link>
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          {meta.grade} · {meta.topic}
        </p>
        <h1 className="text-[28px] leading-tight">{meta.title}</h1>
      </div>

      <div className={`flex gap-3 rounded-[14px] px-4 py-3.5 ${tone.soft}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel text-glauco">
          <OwlLineIcon size={18} strokeWidth={1.9} />
        </span>
        <p className="font-display text-[17px] leading-[1.35]">{meta.hook}</p>
      </div>

      <section aria-label="Simulação" className="rounded-[16px] bg-surface p-4">
        {children(markDone)}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg">Desafios da coruja</h2>
        <ul className="flex flex-col rounded-[14px] bg-surface">
          {meta.challenges.map((c) => {
            const ok = done.has(c.id);
            return (
              <li
                key={c.id}
                className={`flex items-center gap-3 border-line px-4 py-3 [&+&]:border-t ${
                  ok ? "animate-coin-pop" : ""
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    ok
                      ? "bg-glauco text-on-glauco"
                      : "border-[1.5px] border-line-strong"
                  }`}
                  aria-hidden
                >
                  {ok && <CheckIcon size={15} strokeWidth={2.6} />}
                </span>
                <span
                  className={`text-[14.5px] leading-snug ${ok ? "text-muted line-through decoration-1" : "font-semibold"}`}
                >
                  {c.prompt}
                </span>
                <span className="sr-only">{ok ? "feito" : "a fazer"}</span>
              </li>
            );
          })}
        </ul>
        {allDone && (
          <p className="rounded-[12px] bg-lamp px-4 py-3 text-center text-sm font-bold text-on-lamp animate-coin-pop">
            {reward ? (
              <span className="inline-flex items-center gap-1.5">
                Todos os desafios! +{reward.points} pts e +{reward.coins}{" "}
                <CoinDot size={14} />
              </span>
            ) : (
              "Todos os desafios! Você pensou como matemático."
            )}
          </p>
        )}
      </section>

      <Link
        href={tutorHref}
        className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] border-input text-[15px] font-extrabold"
      >
        <OwlLineIcon size={19} /> Ficou curioso? Pergunte à coruja
      </Link>
    </div>
  );
}

/** Botão pequeno das simulações (alvo ≥ 44px). */
export function SimButton({
  children,
  onClick,
  disabled,
  pressed,
  label,
  variant = "outline",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  label?: string;
  variant?: "outline" | "solid";
}) {
  const active = pressed || variant === "solid";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className={`min-h-11 min-w-11 rounded-[12px] px-3 text-[14px] font-extrabold transition-colors disabled:opacity-35 ${
        active
          ? "bg-night text-on-night"
          : "border-[1.5px] border-line-strong bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}
