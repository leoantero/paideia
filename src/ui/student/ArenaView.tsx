"use client";

import { useState, type ReactNode } from "react";
import type {
  Leaderboard,
  LeaderboardEntry,
  StudentProgress,
} from "@/src/features/gamification/types";
import { FreezeIcon, Laurel, LockIcon } from "@/src/ui/paideia/icons";
import { CoinDot, OwlLineIcon } from "@/src/ui/paideia/line-icons";

type Tab = "ranking" | "loja";

export interface ArenaViewProps {
  leaderboard: Leaderboard;
  progress: StudentProgress;
  initialTab: Tab;
  freezeEndpoint?: string;
}

/** Pódio da semana + Loja (prancha `TelaPodio`; a Loja não tem prancha). */
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

  const classroom = leaderboard.classroom;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-tight">
          {tab === "ranking" ? "Pódio da semana" : "Loja"}
        </h1>
        {classroom && (
          <p className="text-sm text-muted">
            {classroom.name} · {classroom.school}
          </p>
        )}
      </div>

      <div
        role="tablist"
        className="grid grid-cols-2 border-b border-line-strong"
      >
        {(
          [
            ["ranking", "Pódio"],
            ["loja", "Loja"],
          ] as const
        ).map(([value, label]) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(value)}
              className={`-mb-px h-[46px] text-[15px] ${
                active
                  ? "border-b-[2.5px] border-night font-extrabold text-ink"
                  : "font-semibold text-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "ranking" ? (
        <RankingPanel leaderboard={leaderboard} />
      ) : (
        <StorePanel progress={progress} freezeEndpoint={freezeEndpoint} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pódio                                                                */
/* ------------------------------------------------------------------ */

function RankingPanel({ leaderboard }: { leaderboard: Leaderboard }) {
  if (!leaderboard.classroom) {
    // No B2B quem matricula é a escola: não há código para o aluno digitar.
    return (
      <p className="rounded-lg bg-surface p-5 text-sm leading-relaxed text-muted">
        Você ainda não aparece em nenhuma turma. Assim que a escola concluir sua
        matrícula, você entra no pódio da sua turma.
      </p>
    );
  }

  // Entries are the top 10 in order, plus the student's own row appended when outside it.
  const entries = leaderboard.entries;
  const me = entries.find((e) => e.is_me) ?? null;
  const top10 = entries.slice(0, 10);
  const meOutside = me && entries.indexOf(me) >= 10 ? me : null;

  return (
    <div className="flex flex-col gap-5 animate-rise">
      {me && <MyStanding me={me} entries={entries} />}

      <div className="flex flex-col">
        <Podium entries={entries.slice(0, 3)} />
        <ol className="flex flex-col rounded-b-lg bg-surface tabular-nums">
          {top10.map((entry, i) => (
            <RankRow
              key={`${entry.position}-${entry.name}`}
              entry={entry}
              first={i === 0}
            />
          ))}
          {meOutside && (
            <>
              <li
                className="border-t border-line py-1 text-center text-muted"
                aria-hidden
              >
                ⋯
              </li>
              <RankRow entry={meOutside} />
            </>
          )}
        </ol>
      </div>
      <p className="text-center text-xs leading-relaxed text-muted">
        O pódio recomeça toda segunda-feira. Os números à direita mostram
        quantas posições cada um mudou desde ontem.
      </p>
    </div>
  );
}

function MyStanding({
  me,
  entries,
}: {
  me: LeaderboardEntry;
  entries: LeaderboardEntry[];
}) {
  const parts: string[] = [];
  if (me.delta === null) parts.push("Primeiro dia da semana: tudo em aberto!");
  else if (me.delta > 0)
    parts.push(`Subiu ${me.delta} ${me.delta === 1 ? "posição" : "posições"}.`);
  else if (me.delta < 0)
    parts.push(
      `Desceu ${-me.delta} ${me.delta === -1 ? "posição" : "posições"}.`
    );
  else parts.push("Mesma posição de ontem.");

  const ahead = entries.find((e) => e.position === me.position - 1);
  if (ahead) {
    const gap = ahead.weekly_points - me.weekly_points + 1;
    parts.push(`Faltam ${gap} pts para o ${ahead.position}º lugar.`);
  } else if (me.position === 1) {
    parts.push("Você lidera a turma.");
  }

  return (
    <section className="flex items-center gap-[18px] rounded-lg bg-panel px-5 py-[18px] text-on-panel">
      <span className="font-display text-5xl leading-none">{me.position}º</span>
      <div className="flex flex-col gap-[3px]">
        <span className="text-base font-extrabold tabular-nums">
          {me.weekly_points} pts esta semana
        </span>
        <span className="text-[13px] leading-[1.4] text-panel-muted">
          {parts.join(" ")}
        </span>
      </div>
    </section>
  );
}

const PODIUM_LAYOUT = [
  {
    index: 1,
    height: 84,
    avatar: "h-[50px] w-[50px] border-2 border-lavender-deep text-xl",
    step: "bg-lavender text-lavender-ink text-[22px]",
  },
  {
    index: 0,
    height: 114,
    avatar: "h-[58px] w-[58px] border-[2.5px] border-coin text-2xl",
    step: "bg-lamp text-on-lamp-accent text-[26px]",
  },
  {
    index: 2,
    height: 62,
    avatar: "h-[50px] w-[50px] border-2 border-coral-mid text-xl",
    step: "bg-coral text-on-coral text-[22px]",
  },
];

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section
      aria-label="Pódio da semana"
      className="flex items-end justify-center gap-2 pt-1.5"
    >
      {PODIUM_LAYOUT.map(({ index, height, avatar, step }) => {
        const entry = entries[index];
        if (!entry) return <div key={index} className="w-[106px]" />;
        return (
          <div
            key={index}
            className="flex w-[106px] min-w-0 flex-col items-center gap-0.5 animate-rise"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <span
              className={`grid place-items-center rounded-full bg-surface font-display ${avatar}`}
            >
              {entry.name.charAt(0)}
            </span>
            <span className="mt-1 max-w-full truncate text-sm font-bold">
              {entry.is_me ? "Você" : entry.name}
            </span>
            <span className="text-xs tabular-nums text-muted">
              {entry.weekly_points} pts
            </span>
            <div
              className={`mt-2 flex w-full justify-center rounded-t-[6px] pt-2.5 font-display ${step}`}
              style={{ height }}
            >
              {entry.position}º
            </div>
          </div>
        );
      })}
    </section>
  );
}

function RankRow({
  entry,
  first = false,
}: {
  entry: LeaderboardEntry;
  first?: boolean;
}) {
  const d = entry.delta;
  return (
    <li
      className={`flex items-center gap-3 px-4 py-[13px] ${
        first ? "" : "border-t border-line"
      } ${entry.is_me ? "bg-lavender-soft" : ""}`}
    >
      <span
        className={`w-[26px] font-display text-base ${
          entry.is_me ? "text-lavender-ink" : "text-muted"
        }`}
      >
        {entry.position}º
      </span>
      <span className="min-w-0 flex-1 truncate font-bold">
        {entry.name}
        {entry.is_me && (
          <span className="ml-1.5 text-xs font-extrabold text-lavender-ink">
            você
          </span>
        )}
      </span>
      <span className="text-sm font-bold">{entry.weekly_points}</span>
      <span
        className={`w-[30px] text-right text-[13px] ${
          d == null
            ? "font-bold text-muted"
            : d > 0
              ? "font-extrabold text-glauco-ink"
              : d < 0
                ? "font-extrabold text-coral-ink"
                : "font-bold text-muted"
        }`}
        aria-label={
          d == null
            ? "Novo no pódio"
            : d > 0
              ? `Subiu ${d}`
              : d < 0
                ? `Desceu ${-d}`
                : "Mesma posição"
        }
      >
        {d == null ? "·" : d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "="}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Loja                                                                 */
/* ------------------------------------------------------------------ */

function StorePanel({
  progress,
  freezeEndpoint,
}: {
  progress: StudentProgress;
  freezeEndpoint: string;
}) {
  const [coins, setCoins] = useState(progress.coins);
  const [freezes, setFreezes] = useState(progress.streak_freezes);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

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
      setMessage({
        tone: "ok",
        text: "Congelamento guardado! Sua chama está protegida.",
      });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Não foi possível comprar.",
      });
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <section className="flex items-center gap-4 rounded-lg bg-lamp px-5 py-[18px] text-on-lamp">
        <CoinDot size={44} />
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[40px] leading-none tabular-nums">
            {coins}
          </span>
          <span className="text-[13px] font-semibold">dracmas para gastar</span>
        </div>
      </section>
      <p className="-mt-3 text-[13px] leading-relaxed text-muted">
        Você ganha dracmas acertando cards, cumprindo a meta do dia e mantendo a
        ofensiva.
      </p>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl">Disponível</h2>
        <article className="flex flex-col gap-4 rounded-lg bg-surface p-4">
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-lavender text-lavender-ink">
              <FreezeIcon size={28} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="font-sans text-[15px] font-bold">
                Congelar ofensiva
              </h3>
              <p className="text-[13px] leading-relaxed text-muted">
                Se você perder um dia, o congelamento protege sua chama
                automaticamente. Guarde até {progress.max_streak_freezes}.
              </p>
              <div
                className="mt-1 flex items-center gap-1.5"
                aria-label={`${freezes} de ${progress.max_streak_freezes} guardados`}
              >
                {Array.from({ length: progress.max_streak_freezes }).map(
                  (_, i) => (
                    <FreezeIcon
                      key={i}
                      size={18}
                      className={
                        i < freezes ? "text-lavender-ink" : "text-line-strong"
                      }
                    />
                  )
                )}
                <span className="ml-1 text-xs font-semibold text-muted">
                  {freezes}/{progress.max_streak_freezes} guardados
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={buyFreeze}
            disabled={buying || atMax || tooPoor}
            className="flex h-12 items-center justify-center gap-2 rounded-sm bg-night text-[15px] font-extrabold text-on-night disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {atMax ? (
              "Estoque cheio"
            ) : (
              <>
                {buying ? "Comprando…" : "Comprar por"} <CoinDot size={16} />{" "}
                {cost}
              </>
            )}
          </button>
          {tooPoor && !atMax && (
            <p className="text-center text-xs text-muted">
              Faltam {cost - coins} dracmas. Que tal uma revisão?
            </p>
          )}
          {message && (
            <p
              role="status"
              className={`text-center text-sm font-semibold ${
                message.tone === "ok" ? "text-glauco-ink" : "text-coral-ink"
              }`}
            >
              {message.text}
            </p>
          )}
        </article>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl">Em breve</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <LockedItem
            title="Coroa de louros"
            price={300}
            art={<Laurel size={44} color="var(--p-glauco-mid)" />}
          />
          <LockedItem
            title="Coruja de Atena"
            price={450}
            art={<OwlLineIcon size={36} className="text-glauco-deep" />}
          />
          <LockedItem
            title="Tema Noite no Egeu"
            price={200}
            art={
              <span className="flex gap-1">
                {[
                  "var(--p-night)",
                  "var(--p-lavender-deep)",
                  "var(--p-lamp)",
                ].map((c) => (
                  <span
                    key={c}
                    className="h-8 w-4 rounded-sm"
                    style={{ background: c }}
                  />
                ))}
              </span>
            }
          />
          <LockedItem
            title="Moldura de meandro"
            price={150}
            art={
              <svg
                width="64"
                height="14"
                aria-hidden
                className="text-coral-mid"
              >
                <defs>
                  <pattern
                    id="loja-meandro"
                    width="12"
                    height="8"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M0 7.5H10.5V.5H3.5V5H7.5V3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </pattern>
                </defs>
                <rect width="64" height="8" y="3" fill="url(#loja-meandro)" />
              </svg>
            }
          />
        </div>
      </section>
    </div>
  );
}

function LockedItem({
  title,
  price,
  art,
}: {
  title: string;
  price: number;
  art: ReactNode;
}) {
  return (
    <article className="relative flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface p-4 text-center">
      <span className="absolute right-3 top-3 text-faint">
        <LockIcon size={15} />
      </span>
      <div className="flex h-12 items-center justify-center opacity-70">
        {art}
      </div>
      <p className="text-sm font-bold">{title}</p>
      <p className="flex items-center gap-1 text-xs font-bold tabular-nums text-muted">
        <CoinDot size={12} /> {price}
      </p>
    </article>
  );
}
