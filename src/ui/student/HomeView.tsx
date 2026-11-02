import Link from "next/link";
import type { ReactNode } from "react";
import type {
  StudentProgress,
  LeaderboardEntry,
} from "@/src/features/gamification/types";
import type { DeckOverview } from "@/src/features/spaced-repetition/types";
import { subjectLabel } from "@/src/features/spaced-repetition/types";
import {
  AmphoraLineIcon,
  ArrowRightIcon,
  CardsIcon,
  ChevronRightIcon,
  CupIcon,
  FlameLineIcon,
  OwlLineIcon,
  QuestionsIcon,
} from "@/src/ui/paideia/line-icons";
import { SIMULATIONS } from "@/src/features/simulations/catalog";
import { subjectStyle } from "./subject-style";

export interface HomeViewProps {
  firstName: string;
  today: Date;
  progress: StudentProgress;
  myRank: LeaderboardEntry | null;
  classroomName: string | null;
  decks: DeckOverview[];
  /** Última conversa com o tutor, para o "Continuar a conversa". */
  lastConversation?: { id: string; title: string } | null;
  basePath?: string;
}

const TZ = "America/Sao_Paulo";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: TZ,
    }).format(now)
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** Início do aluno (prancha `TelaInicio`). */
export function HomeView({
  firstName,
  today,
  progress,
  myRank,
  classroomName,
  decks,
  lastConversation = null,
  basePath = "/student",
}: HomeViewProps) {
  const cardsToday = progress.due_today + progress.new_available;
  const goalSeconds = progress.daily_goal_minutes * 60;
  const goalProgress = Math.min(1, progress.study_seconds_today / goalSeconds);
  const minutesDone = Math.min(
    progress.daily_goal_minutes,
    Math.floor(progress.study_seconds_today / 60)
  );
  const minutesLeft = progress.daily_goal_minutes - minutesDone;
  const starters = decks.slice(0, 3);

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-0.5 animate-rise">
        <p className="text-[13px] text-faint first-letter:uppercase">
          {today.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: TZ,
          })}
        </p>
        <h1 className="text-[32px] leading-[1.1]">
          {greeting(today)}, {firstName}.
        </h1>
      </section>

      {/* Herói: o frontão com o tutor */}
      <section className="flex flex-col animate-rise [animation-delay:60ms]">
        <svg
          viewBox="0 0 350 36"
          preserveAspectRatio="none"
          className="-mb-px block h-9 w-full"
          aria-hidden
        >
          <path d="M0 36 L175 4 L350 36 Z" fill="var(--p-panel)" />
          <path
            d="M38 32 L175 9 L312 32"
            fill="none"
            stroke="var(--p-panel-muted)"
            strokeWidth="1.2"
            opacity="0.45"
          />
          <circle cx="175" cy="24" r="4.5" fill="var(--p-lamp)" />
        </svg>
        <div className="flex flex-col gap-4 rounded-b-lg bg-panel px-5 pb-[18px] pt-3.5 text-on-panel">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-glauco text-on-glauco">
              <OwlLineIcon size={22} strokeWidth={1.7} />
            </span>
            <span className="text-[13px] font-semibold text-panel-muted">
              Coruja de Atena, seu tutor
            </span>
          </div>
          <h2 className="text-[27px] leading-[1.15] text-on-panel">
            Sobre o que vamos pensar hoje?
          </h2>
          <form action={`${basePath}/tutor`} className="flex gap-2">
            <label htmlFor="duvida-inicio" className="sr-only">
              Sua dúvida
            </label>
            <input
              id="duvida-inicio"
              name="q"
              type="text"
              required
              maxLength={2000}
              placeholder="Escreva sua dúvida"
              className="h-12 min-w-0 flex-1 rounded-sm bg-panel-field px-3.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
            />
            <button
              type="submit"
              aria-label="Perguntar ao tutor"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-lamp text-on-lamp"
            >
              <ArrowRightIcon size={22} />
            </button>
          </form>
          {lastConversation && (
            <Link
              href={`${basePath}/tutor?c=${lastConversation.id}`}
              className="flex items-center gap-3 border-t border-panel-line pt-3.5"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-panel-muted">
                  Continuar a conversa
                </span>
                <span className="truncate text-[15px] font-bold">
                  {lastConversation.title}
                </span>
              </span>
              <ChevronRightIcon size={20} />
            </Link>
          )}
          {starters.length > 0 && (
            <p className="text-[13px] leading-relaxed text-panel-muted">
              Ou comece por{" "}
              {starters.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && (i === starters.length - 1 ? " ou " : ", ")}
                  <Link
                    href={`${basePath}/tutor?q=${encodeURIComponent(d.title)}`}
                    className="font-bold text-glauco underline underline-offset-2"
                  >
                    {d.title.charAt(0).toLowerCase() + d.title.slice(1)}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </section>

      {/* Seu dia */}
      <section className="flex flex-col gap-2.5 animate-rise [animation-delay:120ms]">
        <h2 className="text-xl">Seu dia</h2>
        <ul className="flex flex-col rounded-lg bg-surface">
          <DayRow
            href={cardsToday > 0 ? `${basePath}/revisao` : undefined}
            icon={<CardsIcon size={22} strokeWidth={1.7} />}
            tile="bg-lavender text-lavender-ink"
            title="Revisão"
            detail={
              cardsToday > 0
                ? `${plural(cardsToday, "card", "cards")}: ${progress.due_today} ${
                    progress.due_today === 1 ? "vencido" : "vencidos"
                  }, ${progress.new_available} ${
                    progress.new_available === 1 ? "novo" : "novos"
                  }`
                : "Tudo revisado por hoje. Sua memória agradece."
            }
            trailing={
              cardsToday > 0 ? (
                <span className="rounded-[8px] bg-night px-3 py-[9px] text-[13px] font-extrabold text-on-night">
                  Começar
                </span>
              ) : null
            }
          />
          <DayRow
            href={`${basePath}/questoes`}
            icon={<QuestionsIcon size={22} strokeWidth={1.7} />}
            tile="bg-glauco-soft text-glauco-ink"
            title="Questões"
            detail="Treine com provas de verdade, da sua série ao ENEM."
            trailing={
              <ChevronRightIcon size={18} className="shrink-0 text-faint" />
            }
          />
          <DayRow
            icon={<AmphoraLineIcon size={22} />}
            tile="bg-glauco-soft text-glauco-ink"
            title="Meta do dia"
            detail={
              progress.daily_goal_reached
                ? "Ânfora cheia! Meta cumprida hoje."
                : `${minutesDone} de ${progress.daily_goal_minutes} minutos. ${
                    minutesLeft === 1 ? "Falta 1" : `Faltam ${minutesLeft}`
                  } para encher a ânfora.`
            }
            trailing={
              <span
                className="h-1.5 w-[52px] shrink-0 overflow-hidden rounded-[3px] bg-line"
                role="progressbar"
                aria-label="Meta do dia"
                aria-valuenow={Math.round(goalProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  className="block h-1.5 bg-glauco-mid"
                  style={{ width: `${goalProgress * 100}%` }}
                />
              </span>
            }
          />
          <DayRow
            icon={<FlameLineIcon size={22} />}
            tile="bg-coral-soft text-coral-ink"
            title={
              progress.streak > 0
                ? `Ofensiva de ${plural(progress.streak, "dia", "dias")}`
                : "Comece uma ofensiva"
            }
            detail={[
              progress.active_today
                ? "Garantida hoje."
                : progress.streak > 0
                  ? "Estude hoje para não perder."
                  : "Estude hoje para acender a chama.",
              progress.streak_freezes > 0
                ? `Você tem ${plural(
                    progress.streak_freezes,
                    "congelamento guardado",
                    "congelamentos guardados"
                  )}.`
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
          />
          {classroomName ? (
            <DayRow
              href={`${basePath}/podio`}
              icon={<CupIcon size={22} strokeWidth={1.7} />}
              tile="bg-lamp-soft text-lamp-ink"
              title={
                myRank
                  ? `${myRank.position}º lugar no ${classroomName}`
                  : `Pódio do ${classroomName}`
              }
              detail={rankDetail(myRank)}
              trailing={
                <span className="text-sm font-bold tabular-nums text-muted">
                  {progress.weekly_points} pts
                </span>
              }
            />
          ) : (
            // No B2B quem matricula é a escola: não há código para o aluno digitar.
            <DayRow
              icon={<CupIcon size={22} strokeWidth={1.7} />}
              tile="bg-lamp-soft text-lamp-ink"
              title="Pódio da turma"
              detail="Assim que a escola concluir sua matrícula, você entra no pódio da sua turma."
            />
          )}
        </ul>
      </section>

      {/* Simulação em destaque (prancha TelaInicio) */}
      <Link
        href={`${basePath}/simulacoes/${SIMULATIONS[0].slug}`}
        className="flex items-center gap-4 rounded-lg bg-lamp px-5 py-4 text-on-lamp animate-rise [animation-delay:150ms]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-extrabold uppercase tracking-[0.08em]">
            Simulação nova
          </span>
          <span className="font-display text-[20px] leading-tight">
            {SIMULATIONS[0].title}
          </span>
          <span className="text-[13px] leading-snug">
            Corte, pegue fatias e veja a fração mudar.
          </span>
        </span>
        <ChevronRightIcon size={20} />
      </Link>

      {/* Baralhos */}
      <section className="flex flex-col gap-2.5 animate-rise [animation-delay:180ms]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl">Seus baralhos</h2>
          {classroomName && (
            <span className="text-[13px] text-muted">{classroomName}</span>
          )}
        </div>
        {decks.length === 0 ? (
          <p className="rounded-lg bg-surface p-4 text-sm text-muted">
            Nenhum baralho liberado ainda. Os baralhos aparecem aqui assim que
            um professor os aprovar.
          </p>
        ) : (
          <ul className="flex flex-col rounded-lg bg-surface">
            {decks.map((deck, i) => (
              <li key={deck.id} className={i > 0 ? "border-t border-line" : ""}>
                <DeckRow
                  deck={deck}
                  href={`${basePath}/revisao?deck=${deck.id}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function rankDetail(rank: LeaderboardEntry | null) {
  if (!rank) return "Estude esta semana para entrar no pódio.";
  if (rank.delta == null || rank.delta === 0) return "Mesma posição de ontem";
  const n = Math.abs(rank.delta);
  return `${rank.delta > 0 ? "Subiu" : "Desceu"} ${plural(
    n,
    "posição",
    "posições"
  )} desde ontem`;
}

function DayRow({
  href,
  icon,
  tile,
  title,
  detail,
  trailing,
}: {
  href?: string;
  icon: ReactNode;
  tile: string;
  title: string;
  detail: string;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-sm ${tile}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
      {trailing}
    </>
  );
  const cls = "flex items-center gap-3.5 px-4 py-3.5";
  return (
    <li className="border-line [&+&]:border-t">
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

export function DeckRow({ deck, href }: { deck: DeckOverview; href: string }) {
  const style = subjectStyle(deck.subject);
  const segments = 10;
  const total = Math.max(1, deck.total_cards);
  const mastered = Math.round((deck.mastered_cards / total) * segments);
  const seen = Math.round((deck.seen_cards / total) * segments);

  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] font-mark text-[21px]"
        style={{ background: style.tile, color: style.onTile }}
        aria-hidden
      >
        {style.glyph}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-bold" style={{ color: style.color }}>
          {subjectLabel(deck.subject)}
        </span>
        <span className="truncate text-[15px] font-bold">{deck.title}</span>
        <span
          className="mt-[5px] flex gap-[3px]"
          role="img"
          aria-label={`${deck.mastered_cards} de ${deck.total_cards} dominados`}
        >
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              className="h-[5px] flex-1 rounded-[1px]"
              style={{
                background:
                  i < mastered
                    ? style.bar
                    : i < seen
                      ? style.barSoft
                      : "var(--p-line)",
              }}
            />
          ))}
        </span>
      </span>
      {deck.due_cards > 0 ? (
        <span
          className="w-5 text-right text-[13px] font-extrabold tabular-nums text-coral-ink"
          aria-label={`${deck.due_cards} para revisar`}
        >
          {deck.due_cards}
        </span>
      ) : (
        <span className="w-5" />
      )}
    </Link>
  );
}
