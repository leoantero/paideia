"use client";

import { useState } from "react";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { UnderlineTabs } from "@/src/ui/kit";
import { CheckIcon, ChevronLeftIcon } from "@/src/ui/paideia/line-icons";
import { styleFor } from "@/src/ui/subject-styles";

export interface BuilderConcept {
  id: string;
  code: string;
  name: string;
  subject: string;
}

export interface SavedQuestion {
  id: string;
  stem: string;
  type: string;
  concept_name: string | null;
}

interface Generated {
  type: "multiple_choice" | "open_ended" | "true_false";
  difficulty: number;
  stem: string;
  options?: string[];
  answer_key: string;
  rationale?: string;
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "Múltipla escolha",
  open_ended: "Discursiva",
  true_false: "V ou F",
};

const plural = (n: number) => `${n} ${n === 1 ? "questão" : "questões"}`;

/** Construtor de questões do professor (prancha `ProfConstrutor`). */
export function ConstrutorView({
  concepts,
  saved,
  initialConceptId,
}: {
  concepts: BuilderConcept[];
  saved: SavedQuestion[];
  /** Vindo da Turma (`?conceito=`): abre direto no conceito. */
  initialConceptId?: string;
}) {
  const [concept, setConcept] = useState<BuilderConcept | null>(
    () => concepts.find((c) => c.id === initialConceptId) ?? null
  );
  const [type, setType] = useState<Generated["type"]>("multiple_choice");
  const [questions, setQuestions] = useState<Generated[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savedCount, setSavedCount] = useState(saved.length);
  const [savedByConcept, setSavedByConcept] = useState(() => {
    const m = new Map<string, number>();
    for (const q of saved)
      if (q.concept_name)
        m.set(q.concept_name, (m.get(q.concept_name) ?? 0) + 1);
    return m;
  });

  async function generate(c: BuilderConcept) {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setSavedIds(new Set());
    try {
      const res = await fetch("/api/teacher/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: c.id, type, count: 3 }),
      });
      if (!res.ok)
        throw new Error((await res.json())?.error ?? "Algo deu errado.");
      const data = await res.json();
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setLoading(false);
    }
  }

  async function save(q: Generated, index: number) {
    if (!concept || savedIds.has(index)) return;
    try {
      const res = await fetch("/api/teacher/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...q, conceptId: concept.id }),
      });
      if (!res.ok)
        throw new Error((await res.json())?.error ?? "Não consegui salvar.");
      setSavedIds((s) => new Set(s).add(index));
      setSavedCount((n) => n + 1);
      setSavedByConcept((m) =>
        new Map(m).set(concept.name, (m.get(concept.name) ?? 0) + 1)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui salvar.");
    }
  }

  // ─────────────── lista de conceitos ───────────────
  if (!concept) {
    return (
      <ScreenBody>
        <ScreenHeader
          title="Construtor"
          subtitle="Questões geradas por IA, ancoradas em conceito"
        />

        <div className="flex flex-col gap-[18px]">
          {savedCount > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-surface px-[18px] py-3.5">
              <span className="text-[15px] font-bold">No seu banco</span>
              <span className="text-sm text-muted">{plural(savedCount)}</span>
            </div>
          )}

          <section className="flex flex-col gap-2.5">
            <h2 className="text-[19px]">Escolha um conceito</h2>
            <div className="flex flex-col rounded-lg bg-surface">
              {concepts.map((c, i) => {
                const st = styleFor(c.subject);
                const n = savedByConcept.get(c.name) ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConcept(c)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-left ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className="w-[18px] font-mark text-lg"
                      style={{ color: st.color }}
                    >
                      {st.icon}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{c.name}</span>
                      <span className="text-[13px] text-muted">
                        {c.code}
                        {n > 0 ? ` · ${plural(n)} no banco` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </ScreenBody>
    );
  }

  // ─────────────── geração ───────────────
  const inBank = savedByConcept.get(concept.name) ?? 0;

  return (
    <ScreenBody>
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            setConcept(null);
            setQuestions([]);
            setError(null);
          }}
          className="-ml-1.5 flex min-h-11 items-center gap-1 self-start text-sm font-bold text-muted hover:text-ink"
        >
          <ChevronLeftIcon size={20} />
          Conceitos
        </button>

        <div className="-mt-1.5 flex flex-col gap-1">
          <h1 className="text-[26px] leading-[1.15]">{concept.name}</h1>
          <p className="text-[13px] text-muted">
            {concept.code} · {plural(inBank)} no seu banco
          </p>
        </div>

        <UnderlineTabs
          className="[&>button]:flex-1"
          value={type}
          onChange={(v) => setType(v as Generated["type"])}
          options={[
            { value: "multiple_choice", label: "Múltipla escolha" },
            { value: "true_false", label: "V ou F" },
            { value: "open_ended", label: "Discursiva" },
          ]}
        />

        <button
          type="button"
          onClick={() => generate(concept)}
          disabled={loading}
          className="h-12 rounded-sm bg-night text-[15px] font-extrabold text-on-night disabled:opacity-50"
        >
          {loading
            ? "Gerando…"
            : questions.length > 0
              ? "Gerar outras"
              : "Gerar questões"}
        </button>

        {error && (
          <p role="alert" className="text-sm font-semibold text-coral-ink">
            {error}
          </p>
        )}

        {questions.map((q, i) => (
          <article
            key={i}
            className="flex flex-col gap-3 rounded-lg bg-surface px-[18px] py-4"
          >
            <span className="text-xs text-muted">
              {TYPE_LABEL[q.type] ?? q.type} · dificuldade{" "}
              {Math.round(q.difficulty * 100)}%
            </span>
            <p className="text-base font-bold leading-[1.4]">{q.stem}</p>

            {q.options && q.options.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-sm tabular-nums">
                {q.options.map((o, j) => (
                  <li
                    key={j}
                    className={`rounded-[8px] px-3 py-2 ${
                      o === q.answer_key
                        ? "bg-glauco font-extrabold text-on-glauco"
                        : "bg-bg"
                    }`}
                  >
                    {String.fromCharCode(97 + j)}) {o}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[8px] bg-glauco-soft px-3 py-2 text-sm">
                <strong>Gabarito:</strong> {q.answer_key}
              </p>
            )}

            {q.rationale && (
              <p className="text-[13px] leading-normal text-muted">
                {q.rationale}
              </p>
            )}

            {savedIds.has(i) ? (
              <p className="flex h-11 items-center justify-center gap-1.5 rounded-sm bg-glauco-soft text-sm font-extrabold text-glauco-ink">
                <CheckIcon size={18} strokeWidth={2.4} />
                No seu banco
              </p>
            ) : (
              <button
                type="button"
                onClick={() => save(q, i)}
                className="h-11 rounded-sm border-[1.5px] border-input bg-surface text-sm font-extrabold hover:border-night"
              >
                Adicionar ao banco
              </button>
            )}
          </article>
        ))}

        {questions.length > 0 && (
          <p className="rounded-[12px] bg-lamp-soft px-4 py-3.5 text-[13px] leading-normal">
            Revise antes de usar em prova: a IA erra. O próximo passo é montar
            uma avaliação com estas questões e atribuir à turma.
          </p>
        )}
      </div>
    </ScreenBody>
  );
}
