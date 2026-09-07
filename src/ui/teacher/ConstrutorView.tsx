"use client";

import { useState } from "react";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { BackButton, Callout, Segmented, Tag } from "@/src/ui/kit";
import { styleFor } from "@/src/ui/student/revisao-data";

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

export function ConstrutorView({
  concepts,
  saved,
}: {
  concepts: BuilderConcept[];
  saved: SavedQuestion[];
}) {
  const [concept, setConcept] = useState<BuilderConcept | null>(null);
  const [type, setType] = useState<Generated["type"]>("multiple_choice");
  const [questions, setQuestions] = useState<Generated[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savedCount, setSavedCount] = useState(saved.length);

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

        {savedCount > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-[12px] border border-line bg-surface px-4 py-3">
            <span className="text-[13px] text-muted">No seu banco</span>
            <span className="font-display text-sm font-bold text-ink">
              {savedCount} {savedCount === 1 ? "questão" : "questões"}
            </span>
          </div>
        )}

        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
          Escolha um conceito
        </div>
        <div className="flex flex-col gap-2">
          {concepts.map((c) => {
            const st = styleFor(c.subject);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setConcept(c)}
                className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-4 py-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span>{st.icon}</span>
                  <span className="truncate text-sm font-medium text-ink">
                    {c.name}
                  </span>
                </span>
                <span className="ml-2 shrink-0 text-[11px] text-faint">
                  {c.code}
                </span>
              </button>
            );
          })}
        </div>
      </ScreenBody>
    );
  }

  // ─────────────── geração ───────────────
  return (
    <ScreenBody>
      <BackButton
        onClick={() => {
          setConcept(null);
          setQuestions([]);
          setError(null);
        }}
      >
        Conceitos
      </BackButton>

      <div className="mb-4 mt-4">
        <h1 className="font-display text-[18px] font-extrabold text-ink">
          {concept.name}
        </h1>
        <p className="text-[13px] text-muted">{concept.code}</p>
      </div>

      <Segmented
        className="mb-3"
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
        className="mb-4 w-full rounded-[12px] bg-ink py-3 font-display text-sm font-bold text-white disabled:bg-mist"
      >
        {loading
          ? "Gerando…"
          : questions.length > 0
            ? "Gerar outras"
            : "Gerar questões"}
      </button>

      {error && <p className="mb-3 text-sm font-medium text-weak">{error}</p>}

      <div className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <div
            key={i}
            className="rounded-[14px] border border-line bg-surface p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <Tag tone="ink">{TYPE_LABEL[q.type] ?? q.type}</Tag>
              <Tag>dificuldade {Math.round(q.difficulty * 100)}%</Tag>
            </div>
            <p className="text-sm font-medium leading-snug text-ink">
              {q.stem}
            </p>

            {q.options && q.options.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-1">
                {q.options.map((o, j) => (
                  <li
                    key={j}
                    className={`rounded-[8px] px-2.5 py-1.5 text-[13px] ${
                      o === q.answer_key
                        ? "bg-strong-bg font-semibold text-ink"
                        : "bg-bg text-muted"
                    }`}
                  >
                    {String.fromCharCode(97 + j)}) {o}
                  </li>
                ))}
              </ul>
            )}

            {!q.options && (
              <p className="mt-2 rounded-[8px] bg-strong-bg px-2.5 py-1.5 text-[13px] text-ink">
                <strong>Gabarito:</strong> {q.answer_key}
              </p>
            )}

            {q.rationale && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {q.rationale}
              </p>
            )}

            <button
              type="button"
              onClick={() => save(q, i)}
              disabled={savedIds.has(i)}
              className={`mt-3 w-full rounded-[10px] py-2.5 text-[13px] font-semibold ${
                savedIds.has(i)
                  ? "bg-strong-bg text-strong"
                  : "border-2 border-mist bg-surface text-ink hover:border-ink"
              }`}
            >
              {savedIds.has(i) ? "✓ No seu banco" : "Adicionar ao banco"}
            </button>
          </div>
        ))}
      </div>

      {questions.length > 0 && (
        <Callout className="mt-4">
          Revise antes de usar em prova — a IA erra. Montar avaliação e atribuir
          à turma (o que transforma a resposta do aluno em evidência) é o
          próximo passo do Construtor.
        </Callout>
      )}
    </ScreenBody>
  );
}
