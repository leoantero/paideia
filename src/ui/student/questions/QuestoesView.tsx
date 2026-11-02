import Link from "next/link";
import {
  AREA_GLYPHS,
  AREA_LABELS,
  QUESTION_AREAS,
  WEAK_ACCURACY,
  type ConceptOverview,
  type QuestionArea,
  type QuestionOverview,
} from "@/src/features/questions/types";
import { ChevronRightIcon } from "@/src/ui/paideia/line-icons";

/** Lista de questões por área e conteúdo (prancha `TelaQuestoes`). */
export function QuestoesView({
  overview,
  basePath = "/student",
}: {
  overview: QuestionOverview;
  basePath?: string;
}) {
  const area = overview.area;
  const totals = new Map(overview.areas.map((a) => [a.area, a.total]));
  const sessionHref = (concept?: string) =>
    `${basePath}/questoes/sessao?area=${area}${concept ? `&conceito=${concept}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] leading-tight">Questões</h1>
        <p className="text-sm leading-[1.45] text-muted">
          Questões de provas de verdade, da sua série ao ENEM. Errou? A coruja
          pergunta o que você pensou antes de mostrar a resposta.
        </p>
      </div>

      <nav
        role="tablist"
        aria-label="Áreas"
        className="grid grid-cols-4 border-b border-line-strong"
      >
        {QUESTION_AREAS.map((a) => {
          const active = a === area;
          return (
            <Link
              key={a}
              role="tab"
              aria-selected={active}
              href={`${basePath}/questoes?area=${a}`}
              scroll={false}
              className={`-mb-px flex h-[52px] flex-col items-center justify-center gap-0.5 border-b-[2.5px] text-[12.5px] ${
                active
                  ? "border-night font-extrabold text-ink"
                  : "border-transparent font-semibold text-muted"
              }`}
            >
              <span className="font-mark text-[15px] leading-none">
                {AREA_GLYPHS[a]}
              </span>
              {AREA_LABELS[a]}
            </Link>
          );
        })}
      </nav>

      {overview.total === 0 ? (
        <ComingSoon
          area={area}
          otherAreas={QUESTION_AREAS.filter(
            (a) => a !== area && (totals.get(a) ?? 0) > 0
          )}
          basePath={basePath}
        />
      ) : (
        <>
          <Link
            href={sessionHref()}
            className="flex items-center gap-4 rounded-[14px] bg-panel px-5 py-5 text-on-panel"
          >
            <span className="font-mark text-[34px] leading-none text-glauco">
              {AREA_GLYPHS[area]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-display text-[19px]">
                Toda a {AREA_LABELS[area]}
              </span>
              <span className="text-[13px] text-panel-muted">
                {overview.total} questões de todos os conteúdos, misturadas
              </span>
            </span>
            <ChevronRightIcon size={20} />
          </Link>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-lg">Por conteúdo</h2>
            <ul className="flex flex-col rounded-[14px] bg-surface">
              {overview.concepts.map((c) => (
                <ConceptRow
                  key={c.concept_id}
                  concept={c}
                  href={sessionHref(c.concept_id)}
                />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function ConceptRow({
  concept,
  href,
}: {
  concept: ConceptOverview;
  href: string;
}) {
  const weak = concept.accuracy !== null && concept.accuracy < WEAK_ACCURACY;
  const done = Math.min(1, concept.answered / Math.max(concept.total, 1));
  const detail =
    concept.answered === 0
      ? `Ainda não começou · ${concept.total} ${concept.total === 1 ? "questão" : "questões"}`
      : `${concept.answered} de ${concept.total} feitas · ${concept.accuracy}% de acerto${weak ? ", vale rever" : ""}`;

  return (
    <li className="border-line [&+&]:border-t">
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold leading-snug">
            {concept.name}
          </span>
          <span
            className={`text-[13px] ${weak ? "font-semibold text-coral-ink" : "text-muted"}`}
          >
            {detail}
          </span>
        </span>
        <span
          className="h-[5px] w-14 shrink-0 overflow-hidden rounded-full bg-line"
          aria-hidden
        >
          <span
            className={`block h-full rounded-full ${weak ? "bg-coral-mid" : "bg-lavender-deep"}`}
            style={{ width: `${Math.round(done * 100)}%` }}
          />
        </span>
      </Link>
    </li>
  );
}

function ComingSoon({
  area,
  otherAreas,
  basePath,
}: {
  area: QuestionArea;
  otherAreas: QuestionArea[];
  basePath: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] bg-surface px-6 py-10 text-center">
      <span className="font-mark text-[34px] text-faint">
        {AREA_GLYPHS[area]}
      </span>
      <h2 className="text-lg">{AREA_LABELS[area]}: em breve</h2>
      <p className="text-sm text-muted">
        As questões desta área para a sua série ainda estão sendo revisadas.
      </p>
      {otherAreas.length > 0 && (
        <p className="mt-2 text-sm">
          Enquanto isso, que tal{" "}
          {otherAreas.map((a, i) => (
            <span key={a}>
              {i > 0 && (i === otherAreas.length - 1 ? " ou " : ", ")}
              <Link
                href={`${basePath}/questoes?area=${a}`}
                className="font-bold text-glauco-deep underline"
              >
                {AREA_LABELS[a]}
              </Link>
            </span>
          ))}
          ?
        </p>
      )}
    </div>
  );
}
