"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ClassHeatmap,
  TeacherClass,
} from "@/src/features/user-profiles/teacher-profile-service";
import { Callout, ChoiceTabs, PrivacyNote } from "@/src/ui/kit";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";

/** Faixa de domínio → célula e texto (prancha `ProfTurma`). */
const band = (pct: number) =>
  pct >= 70
    ? { cell: "bg-glauco-soft text-glauco-ink", text: "text-glauco-ink" }
    : pct >= 50
      ? { cell: "bg-lamp-soft text-lamp-ink", text: "text-lamp-ink" }
      : { cell: "bg-coral-soft text-coral-ink", text: "text-coral-ink" };

/** Turma do professor: heatmap aluno × conceito (prancha `ProfTurma`). */
export function TurmaHeatmap({
  classes,
  heatmapByClass,
  subtitle = "Domínio por conceito",
}: {
  classes: TeacherClass[];
  heatmapByClass: Map<string, ClassHeatmap>;
  subtitle?: string;
}) {
  const [selected, setSelected] = useState(classes[0]?.id ?? "");
  const heatmap = heatmapByClass.get(selected);

  if (classes.length === 0) {
    return (
      <ScreenBody>
        <ScreenHeader title="Turma" subtitle={subtitle} />
        <Callout>Nenhuma turma atribuída a você ainda.</Callout>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody>
      <ScreenHeader title="Turma" subtitle={subtitle} />

      <div className="flex flex-col gap-[18px]">
        {classes.length > 1 && (
          <ChoiceTabs
            label="Turmas"
            value={selected}
            onChange={setSelected}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}

        {!heatmap || heatmap.students.length === 0 ? (
          <Callout>Nenhum aluno matriculado nesta turma ainda.</Callout>
        ) : heatmap.concepts.length === 0 ? (
          <Callout>
            Nenhuma sessão registrada ainda. O heatmap aparece assim que os
            alunos começarem a usar o tutor ou a revisão.
          </Callout>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="overflow-x-auto rounded-lg bg-surface">
                <table className="w-full min-w-max border-collapse text-[13px] tabular-nums">
                  <thead>
                    <tr className="text-center text-[11.5px] text-muted">
                      <th className="sticky left-0 z-10 w-[84px] bg-surface py-2.5 pl-3.5 pr-2.5 text-left font-bold">
                        Aluno
                      </th>
                      {heatmap.concepts.map((c) => (
                        <th
                          key={c.id}
                          className="max-w-[96px] px-1 py-2.5 font-bold leading-[1.2]"
                          title={c.name}
                        >
                          <span className="line-clamp-2">{c.name}</span>
                        </th>
                      ))}
                      <th className="px-1.5 py-2.5 font-bold">Média</th>
                    </tr>
                  </thead>
                  <tbody className="text-center font-bold">
                    {heatmap.students.map((s) => {
                      const avg =
                        s.avgMastery !== null
                          ? Math.round(s.avgMastery * 100)
                          : null;
                      return (
                        <tr key={s.id} className="border-t border-line">
                          <th className="sticky left-0 z-10 whitespace-nowrap bg-surface py-1.5 pl-3.5 pr-2.5 text-left font-bold">
                            {s.label}
                          </th>
                          {heatmap.concepts.map((c) => {
                            const cell = heatmap.cells.get(s.id)?.get(c.id);
                            if (!cell) {
                              return (
                                <td
                                  key={c.id}
                                  className="min-w-[64px] px-[3px] py-1 text-faint"
                                  aria-label="sem dados"
                                >
                                  —
                                </td>
                              );
                            }
                            const pct = Math.round(cell.mastery * 100);
                            return (
                              <td
                                key={c.id}
                                className="min-w-[64px] px-[3px] py-1"
                              >
                                <span
                                  className={`block rounded-[6px] py-[7px] ${band(pct).cell}`}
                                >
                                  {pct}%
                                </span>
                              </td>
                            );
                          })}
                          <td
                            className={`px-1.5 py-1 ${
                              avg !== null ? band(avg).text : "text-faint"
                            }`}
                          >
                            {avg !== null ? `${avg}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="flex flex-wrap gap-3.5 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] bg-glauco-soft" />
                  70% ou mais
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] bg-lamp-soft" />
                  50–69%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] bg-coral-soft" />
                  abaixo de 50%
                </span>
                {heatmap.concepts.length > 3 && (
                  <span>Arraste para ver mais conceitos.</span>
                )}
              </p>
            </div>

            {heatmap.weakConcepts.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <h2 className="text-[19px]">Conceitos que a turma não fixou</h2>
                <div className="flex flex-col rounded-lg bg-surface">
                  {heatmap.weakConcepts.map((w, i) => (
                    <Link
                      key={w.concept.id}
                      href={`/teacher/construtor?conceito=${w.concept.id}`}
                      className={`flex items-center gap-3 px-4 py-3.5 ${
                        i > 0 ? "border-t border-line" : ""
                      }`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-bold">
                          {w.concept.name}
                        </span>
                        <span className="text-[13px] text-muted">
                          {w.concept.code} · gerar questões sobre isto
                        </span>
                      </span>
                      <span className="text-sm font-extrabold tabular-nums text-coral-ink">
                        {Math.round(w.avgMastery * 100)}%
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <PrivacyNote>
          Você vê domínio por conceito, nunca as conversas dos alunos com o
          tutor.
        </PrivacyNote>
      </div>
    </ScreenBody>
  );
}
