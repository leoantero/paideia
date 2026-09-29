"use client";

import { useState, type ReactNode } from "react";
import type { Leaderboard, LeaderboardEntry, StudentProgress } from "@/src/features/gamification/types";
import {
  ArrowDeltaIcon,
  DrachmaCoin,
  FlameIcon,
  FreezeIcon,
  Laurel,
  LockIcon,
  OwlIcon,
  TrophyIcon,
} from "@/src/ui/paideia/icons";
import { Meander } from "@/src/ui/paideia/ornaments";
import { DeltaChip } from "./DeltaChip";

type Tab = "ranking" | "loja";

export interface ArenaViewProps {
  leaderboard: Leaderboard;
  progress: StudentProgress;
  initialTab: Tab;
  freezeEndpoint?: string;
}

export function ArenaView({
  leaderboard,
  progress,
  initialTab,
  freezeEndpoint = "/api/store/streak-freeze",
}: ArenaViewProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  function select(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-6">
      <SplitTabs tab={tab} onSelect={select} />
      {tab === "ranking" ? (
        <RankingPanel leaderboard={leaderboard} progress={progress} />
      ) : (
        <StorePanel progress={progress} freezeEndpoint={freezeEndpoint} />
      )}
    </div>
  );
}

/** Two tabs separated by the same diagonal cut as the nav icon. */
function SplitTabs({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  const segment = (value: Tab, label: string, icon: ReactNode, clip: string) => {
    const active = tab === value;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => onSelect(value)}
        className={`flex flex-1 items-center justify-center gap-2 py-3 font-display text-lg transition-colors ${
          active ? (value === "ranking" ? "bg-aegean text-marble" : "bg-gold text-ink") : "bg-surface text-ink-soft hover:text-ink"
        }`}
        style={{ clipPath: clip }}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div role="tablist" className="flex overflow-hidden rounded-2xl border border-line bg-surface">
      {segment(
        "ranking",
        "Pódio",
        <TrophyIcon size={22} />,
        "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)"
      )}
      {segment("loja", "Tesouro", <DrachmaCoin size={20} />, "polygon(18px 0, 100% 0, 100% 100%, 0 100%)")}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking                                                              */
/* ------------------------------------------------------------------ */

function RankingPanel({ leaderboard, progress }: { leaderboard: Leaderboard; progress: StudentProgress }) {
  if (!leaderboard.classroom) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-soft">
        Você ainda não está em uma turma. Peça o código à sua escola e entre pela tela de boas-vindas.
      </p>
    );
  }

  // Entries are the top 10 in order, plus the student's own row appended when outside it.
  const me = leaderboard.entries.find((e) => e.is_me) ?? null;
  const podium = leaderboard.entries.slice(0, 3);
  const rest = leaderboard.entries.slice(3, 10);
  const meOutside = me && leaderboard.entries.indexOf(me) >= 10 ? me : null;

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          {leaderboard.classroom.school}
        </p>
        <h1 className="font-display text-3xl">{leaderboard.classroom.name} · semana</h1>
      </header>

      {me && <MyStanding me={me} progress={progress} memberCount={leaderboard.member_count} />}

      <Podium entries={podium} />

      <ol className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        {rest.map((entry) => (
          <RankRow key={`${entry.position}-${entry.name}`} entry={entry} />
        ))}
        {meOutside && (
          <>
            <li className="py-1 text-center text-ink-soft" aria-hidden>
              ⋯
            </li>
            <RankRow entry={meOutside} />
          </>
        )}
      </ol>
      <p className="text-center text-xs text-ink-soft">
        O pódio recomeça toda segunda-feira. As setas mostram quantas posições cada um mudou desde ontem.
      </p>
    </div>
  );
}

function MyStanding({ me, progress, memberCount }: { me: LeaderboardEntry; progress: StudentProgress; memberCount: number }) {
  let movement = "Primeiro dia da semana: tudo em aberto!";
  if (me.delta !== null) {
    if (me.delta > 0) movement = `Subiu ${me.delta} ${me.delta === 1 ? "posição" : "posições"} desde ontem`;
    else if (me.delta < 0) movement = `Desceu ${-me.delta} ${me.delta === -1 ? "posição" : "posições"} desde ontem`;
    else movement = "Mesma posição de ontem";
  }
  const up = (me.delta ?? 0) > 0;
  const down = (me.delta ?? 0) < 0;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-aegean p-5 text-marble">
      <Meander height={10} color="var(--aegean-soft)" className="absolute inset-x-0 top-0 opacity-30" />
      <div className="mt-2 flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-2 border-aegean-soft/60">
          <span className="font-display text-4xl leading-none">{me.position}º</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-aegean-soft">de {memberCount}</span>
        </div>
        <div className="flex-1">
          <p
            className={`flex items-center gap-1.5 text-sm font-extrabold ${
              up ? "text-olive-soft" : down ? "text-terracotta-soft" : "text-aegean-soft"
            }`}
          >
            {(up || down) && <ArrowDeltaIcon direction={up ? "up" : "down"} size={14} />}
            {movement}
          </p>
          <p className="mt-1 font-display text-3xl leading-none">{me.weekly_points} pts</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-aegean-soft">
            <FlameIcon size={14} lit={progress.active_today} /> {progress.streak} dias de ofensiva
          </p>
        </div>
      </div>
    </section>
  );
}

const PODIUM_LAYOUT = [
  { index: 1, height: 96, tone: "var(--marble-deep)" },
  { index: 0, height: 132, tone: "var(--gold-soft)" },
  { index: 2, height: 72, tone: "var(--terracotta-soft)" },
];

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section aria-label="Pódio da semana" className="flex items-end justify-center gap-3 pt-4">
      {PODIUM_LAYOUT.map(({ index, height, tone }) => {
        const entry = entries[index];
        if (!entry) return <div key={index} className="w-24" />;
        const first = index === 0;
        return (
          <div key={index} className="flex w-24 flex-col items-center animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
            <div className="relative mb-2 flex flex-col items-center">
              {first && <Laurel size={84} className="absolute -top-4" color="var(--gold-deep)" />}
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 font-display text-2xl ${
                  entry.is_me ? "border-aegean bg-aegean text-marble" : "border-ink/20 bg-surface text-ink"
                }`}
              >
                {entry.name.charAt(0)}
              </span>
              <span className="mt-1 max-w-24 truncate text-sm font-bold">
                {entry.is_me ? "Você" : entry.name}
              </span>
              <span className="text-xs font-semibold text-ink-soft">{entry.weekly_points} pts</span>
              <span className="mt-0.5">
                <DeltaChip delta={entry.delta} compact />
              </span>
            </div>
            <Column height={height} tone={tone} label={`${entry.position}º`} />
          </div>
        );
      })}
    </section>
  );
}

/** A fluted Doric column used as a podium step. */
function Column({ height, tone, label }: { height: number; tone: string; label: string }) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="h-2.5 w-full rounded-sm border border-ink/20" style={{ background: tone }} />
      <div className="h-1.5 w-[86%] border-x border-ink/20" style={{ background: tone }} />
      <div
        className="relative flex w-[76%] items-start justify-center border-x border-ink/20 pt-2"
        style={{
          height,
          background: `repeating-linear-gradient(90deg, ${tone} 0 7px, color-mix(in srgb, ${tone} 70%, var(--ink)) 7px 8.5px)`,
        }}
      >
        <span className="rounded bg-surface/85 px-1.5 font-display text-xl text-ink">{label}</span>
      </div>
      <div className="h-2.5 w-full rounded-sm border border-ink/20" style={{ background: tone }} />
    </div>
  );
}

function RankRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li
      className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
        entry.is_me ? "bg-aegean-soft" : ""
      }`}
    >
      <span className="w-8 font-display text-xl text-ink-soft">{entry.position}º</span>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-lg ${
          entry.is_me ? "bg-aegean text-marble" : "bg-marble-deep text-ink"
        }`}
      >
        {entry.name.charAt(0)}
      </span>
      <span className="flex-1 truncate font-semibold">
        {entry.name}
        {entry.is_me && <span className="ml-2 text-xs font-bold text-aegean">você</span>}
      </span>
      <span className="text-sm font-bold tabular-nums">{entry.weekly_points}</span>
      <span className="w-10 text-right">
        <DeltaChip delta={entry.delta} compact />
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

function StorePanel({ progress, freezeEndpoint }: { progress: StudentProgress; freezeEndpoint: string }) {
  const [coins, setCoins] = useState(progress.coins);
  const [freezes, setFreezes] = useState(progress.streak_freezes);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const cost = progress.streak_freeze_cost;
  const atMax = freezes >= progress.max_streak_freezes;
  const tooPoor = coins < cost;

  async function buyFreeze() {
    setBuying(true);
    setMessage(null);
    try {
      const res = await fetch(freezeEndpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível comprar.");
      setCoins(data.coins);
      setFreezes(data.streak_freezes);
      setMessage({ tone: "ok", text: "Congelamento guardado! Sua chama está protegida." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Não foi possível comprar." });
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-marble">
        <Meander height={10} color="var(--gold)" className="absolute inset-x-0 top-0 opacity-50" />
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-gold">Seu tesouro</p>
        <div className="mt-2 flex items-center gap-3">
          <DrachmaCoin size={52} className="animate-coin-pop" />
          <p className="gold-shimmer font-display text-6xl leading-none">{coins}</p>
        </div>
        <p className="mt-3 text-sm text-marble/70">
          Você ganha dracmas acertando cards, cumprindo a meta do dia e conversando com o tutor.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Disponível</h2>
        <article className="flex flex-col gap-4 rounded-3xl border-2 border-aegean/30 bg-surface p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-aegean-soft text-aegean">
              <FreezeIcon size={40} />
            </span>
            <div className="flex-1">
              <h3 className="font-display text-xl">Congelar ofensiva</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Se você perder um dia, o congelamento protege sua chama automaticamente. Guarde até{" "}
                {progress.max_streak_freezes}.
              </p>
              <div className="mt-2 flex items-center gap-1.5" aria-label={`${freezes} de ${progress.max_streak_freezes} guardados`}>
                {Array.from({ length: progress.max_streak_freezes }).map((_, i) => (
                  <FreezeIcon key={i} size={20} className={i < freezes ? "text-aegean" : "text-line"} />
                ))}
                <span className="ml-1 text-xs font-semibold text-ink-soft">
                  {freezes}/{progress.max_streak_freezes} guardados
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={buyFreeze}
            disabled={buying || atMax || tooPoor}
            className="flex items-center justify-center gap-2 rounded-full bg-aegean px-5 py-3 font-extrabold text-marble shadow-[0_5px_0_0_var(--aegean-deep)] transition-transform active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-marble-deep disabled:text-ink-soft disabled:shadow-none"
          >
            {atMax ? (
              "Estoque cheio"
            ) : (
              <>
                {buying ? "Comprando…" : "Comprar por"} <DrachmaCoin size={20} /> {cost}
              </>
            )}
          </button>
          {tooPoor && !atMax && (
            <p className="text-center text-xs text-ink-soft">Faltam {cost - coins} dracmas. Que tal uma revisão?</p>
          )}
          {message && (
            <p
              role="status"
              className={`text-center text-sm font-semibold ${message.tone === "ok" ? "text-olive" : "text-terracotta"}`}
            >
              {message.text}
            </p>
          )}
        </article>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Em breve</h2>
        <div className="grid grid-cols-2 gap-3">
          <LockedItem title="Coroa de louros" price={300} art={<Laurel size={46} />} />
          <LockedItem title="Coruja de Atena" price={450} art={<OwlIcon size={40} className="text-ink" />} />
          <LockedItem
            title="Tema Noite no Egeu"
            price={200}
            art={
              <span className="flex gap-1">
                {["var(--aegean-deep)", "var(--aegean)", "var(--gold)"].map((c) => (
                  <span key={c} className="h-8 w-4 rounded-sm" style={{ background: c }} />
                ))}
              </span>
            }
          />
          <LockedItem
            title="Moldura de meandro"
            price={150}
            art={
              <span className="w-16">
                <Meander height={14} color="var(--terracotta)" />
              </span>
            }
          />
        </div>
      </section>
    </div>
  );
}

function LockedItem({ title, price, art }: { title: string; price: number; art: ReactNode }) {
  return (
    <article className="relative flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface/60 p-4 text-center">
      <span className="absolute right-3 top-3 text-ink-soft">
        <LockIcon size={16} />
      </span>
      <div className="flex h-14 items-center justify-center opacity-60 grayscale-[35%]">{art}</div>
      <p className="text-sm font-bold">{title}</p>
      <p className="flex items-center gap-1 text-xs font-bold text-ink-soft">
        <DrachmaCoin size={14} /> {price}
      </p>
    </article>
  );
}
