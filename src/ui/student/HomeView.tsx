import Link from "next/link";
import type {
  StudentProgress,
  LeaderboardEntry,
} from "@/src/features/gamification/types";
import type { DeckOverview } from "@/src/features/spaced-repetition/types";
import { subjectLabel } from "@/src/features/spaced-repetition/types";
import {
  DrachmaCoin,
  FlameIcon,
  FreezeIcon,
  Laurel,
} from "@/src/ui/paideia/icons";
import { AmphoraGauge, Meander } from "@/src/ui/paideia/ornaments";
import { DeltaChip } from "./DeltaChip";
import { subjectStyle } from "./subject-style";

export interface HomeViewProps {
  firstName: string;
  today: Date;
  progress: StudentProgress;
  myRank: LeaderboardEntry | null;
  classroomName: string | null;
  decks: DeckOverview[];
  basePath?: string;
}

export function HomeView({
  firstName,
  today,
  progress,
  myRank,
  classroomName,
  decks,
  basePath = "/student",
}: HomeViewProps) {
  const cardsToday = progress.due_today + progress.new_available;
  const goalProgress = Math.min(
    1,
    progress.study_seconds_today / (progress.daily_goal_minutes * 60)
  );
  const minutesDone = Math.floor(progress.study_seconds_today / 60);

  return (
    <div className="flex flex-col gap-6">
      <section className="animate-rise">
        <p className="text-sm font-medium text-ink-soft first-letter:uppercase">
          {today.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="font-display text-4xl leading-tight">
          Olá, {firstName}.
        </h1>
      </section>

      {/* Hero: a temple pediment holding today's study */}
      <section className="animate-rise [animation-delay:60ms]">
        <svg
          viewBox="0 0 400 44"
          className="-mb-px block w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 44 L200 4 L400 44 Z" fill="var(--terracotta)" />
          <path
            d="M40 40 L200 10 L360 40"
            fill="none"
            stroke="var(--terracotta-soft)"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <circle cx="200" cy="30" r="5" fill="var(--gold)" />
        </svg>
        <div className="relative overflow-hidden rounded-b-3xl bg-terracotta px-6 pb-6 pt-3 text-marble">
          <Meander
            height={10}
            color="var(--terracotta-soft)"
            className="mb-4 opacity-40"
          />
          {cardsToday > 0 ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-terracotta-soft">
                Hoje
              </p>
              <p className="mt-1 font-display text-5xl leading-none">
                {cardsToday} <span className="text-2xl">cards</span>
              </p>
              <p className="mt-2 text-sm text-terracotta-soft">
                {progress.due_today} para revisar · {progress.new_available}{" "}
                novos
              </p>
              <Link
                href={`${basePath}/revisao`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-marble px-5 py-3 text-sm font-extrabold text-terracotta-deep shadow-[0_6px_0_0_var(--terracotta-deep)] transition-transform active:translate-y-1 active:shadow-none"
              >
                Começar revisão <span aria-hidden>→</span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Laurel size={72} color="var(--gold-soft)" />
              <div>
                <p className="font-display text-3xl leading-tight">
                  Tudo revisado!
                </p>
                <p className="mt-1 text-sm text-terracotta-soft">
                  Sua memória agradece. Volte amanhã, ou converse com o tutor.
                </p>
              </div>
            </div>
          )}
          <div
            className="pointer-events-none absolute -right-6 bottom-0 top-8 flex gap-3 opacity-15"
            aria-hidden
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-5 rounded-t-sm"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, var(--marble) 0 3px, transparent 3px 6px)",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-3 animate-rise [animation-delay:120ms]">
        <div className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-3">
          <FlameIcon size={30} lit={progress.active_today} />
          <p className="font-display text-3xl leading-none">
            {progress.streak}
          </p>
          <p className="text-[11px] font-semibold leading-tight text-ink-soft">
            {progress.streak === 1 ? "dia de ofensiva" : "dias de ofensiva"}
          </p>
          <div
            className="mt-1 flex items-center gap-1"
            title="Congelamentos de ofensiva"
          >
            {Array.from({ length: progress.max_streak_freezes }).map((_, i) => (
              <FreezeIcon
                key={i}
                size={14}
                className={
                  i < progress.streak_freezes ? "text-aegean" : "text-line"
                }
              />
            ))}
          </div>
          {!progress.active_today && progress.streak > 0 && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-terracotta">
              estude hoje!
            </p>
          )}
        </div>

        <Link
          href={`${basePath}/podio?tab=loja`}
          className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-gold"
        >
          <DrachmaCoin size={30} />
          <p className="gold-shimmer font-display text-3xl leading-none">
            {progress.coins}
          </p>
          <p className="text-[11px] font-semibold leading-tight text-ink-soft">
            dracmas
          </p>
          <p className="mt-auto text-[11px] font-bold text-gold-deep">loja →</p>
        </Link>

        <Link
          href={`${basePath}/podio`}
          className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-aegean"
        >
          <span className="font-display text-sm text-aegean">Pódio</span>
          <p className="font-display text-3xl leading-none">
            {myRank ? `${myRank.position}º` : "—"}
          </p>
          <p className="text-[11px] font-semibold leading-tight text-ink-soft">
            {progress.weekly_points} pts na semana
          </p>
          {myRank && (
            <div className="mt-auto">
              <DeltaChip delta={myRank.delta} />
            </div>
          )}
        </Link>
      </section>

      {!classroomName && (
        // No B2B quem matricula é a escola — não há código para o aluno digitar.
        <p className="rounded-2xl border-2 border-dashed border-aegean/40 bg-aegean-soft p-4 text-sm font-semibold text-aegean">
          Você ainda não aparece em nenhuma turma. Assim que a escola concluir
          sua matrícula, você entra no pódio da sua turma.
        </p>
      )}

      {/* Daily goal amphora */}
      <section className="flex items-center gap-5 rounded-3xl border border-line bg-surface p-5 animate-rise [animation-delay:180ms]">
        <AmphoraGauge progress={goalProgress} size={112} />
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
            Meta do dia
          </p>
          <p className="mt-1 font-display text-3xl leading-none">
            {Math.min(minutesDone, progress.daily_goal_minutes)}
            <span className="text-lg text-ink-soft">
              {" "}
              / {progress.daily_goal_minutes} min
            </span>
          </p>
          {progress.daily_goal_reached ? (
            <p className="mt-2 text-sm font-semibold text-olive">
              Ânfora cheia! Meta cumprida hoje.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              Encha a ânfora e ganhe <b className="text-ink">+30 pontos</b> e{" "}
              <b className="text-gold-deep">+10 dracmas</b>.
            </p>
          )}
        </div>
      </section>

      {/* Decks */}
      <section className="flex flex-col gap-3 animate-rise [animation-delay:240ms]">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl">Seus baralhos</h2>
          {classroomName && (
            <span className="text-xs font-semibold text-ink-soft">
              {classroomName}
            </span>
          )}
        </div>
        {decks.length === 0 && (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-soft">
            Nenhum baralho liberado ainda. Os baralhos aparecem aqui assim que
            um professor os aprovar.
          </p>
        )}
        {decks.map((deck) => (
          <DeckRow
            key={deck.id}
            deck={deck}
            href={`${basePath}/revisao?deck=${deck.id}`}
          />
        ))}
      </section>
    </div>
  );
}

export function DeckRow({ deck, href }: { deck: DeckOverview; href: string }) {
  const style = subjectStyle(deck.subject);
  const segments = 10;
  const mastered = Math.round(
    (deck.mastered_cards / deck.total_cards) * segments
  );
  const seen = Math.round((deck.seen_cards / deck.total_cards) * segments);

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-transform hover:-translate-y-0.5"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-2xl"
        style={{ background: style.soft, color: style.color }}
        aria-hidden
      >
        {style.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: style.color }}
        >
          {subjectLabel(deck.subject)}
        </p>
        <p className="truncate font-semibold">{deck.title}</p>
        <div
          className="mt-2 flex gap-[3px]"
          aria-label={`${deck.mastered_cards} de ${deck.total_cards} dominados`}
        >
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-[1px]"
              style={{
                background:
                  i < mastered
                    ? style.color
                    : i < seen
                      ? style.soft
                      : "var(--marble-deep)",
              }}
            />
          ))}
        </div>
      </div>
      {deck.due_cards > 0 ? (
        <span className="rounded-full bg-terracotta px-2.5 py-1 text-xs font-extrabold text-marble">
          {deck.due_cards}
        </span>
      ) : (
        <span
          className="text-ink-soft transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      )}
    </Link>
  );
}
