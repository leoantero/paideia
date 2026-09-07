"use client";

import { useState } from "react";
import type {
  ClassHeatmap,
  TeacherClass,
} from "@/src/features/user-profiles/teacher-profile-service";
import { Callout, Segmented, Tag } from "@/src/ui/kit";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";

const masteryTone = (pct: number): "strong" | "average" | "weak" =>
  pct >= 70 ? "strong" : pct >= 50 ? "average" : "weak";

const masteryBg = (pct: number) =>
  pct >= 70 ? "bg-strong-bg" : pct >= 50 ? "bg-average-bg" : "bg-weak-bg";

export function TurmaHeatmap({
  classes,
  heatmapByClass,
}: {
  classes: TeacherClass[];
  heatmapByClass: Map<string, ClassHeatmap>;
}) {
  const [selected, setSelected] = useState(classes[0]?.id ?? "");
  const heatmap = heatmapByClass.get(selected);

  if (classes.length === 0) {
    return (
      <ScreenBody>
        <ScreenHeader title="Turma" subtitle="Domínio por conceito" />
        <Callout>Nenhuma turma atribuída a você ainda.</Callout>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody>
      <ScreenHeader title="Turma" subtitle="Domínio por conceito" />

      {classes.length > 1 && (
        <Segmented
          className="mb-4"
          value={selected}
          onChange={setSelected}
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}

      {!heatmap || heatmap.students.length === 0 ? (
        <Callout>Nenhum aluno matriculado nesta turma ainda.</Callout>
      ) : heatmap.concepts.length === 0 ? (
        <Callout>
          Nenhuma sessão registrada ainda. O heatmap aparece assim que os alunos
          começarem a usar o Tutor ou a Revisão.
        </Callout>
      ) : (
        <>
          <div className="mb-5 overflow-x-auto rounded-[14px] border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">
                    Aluno
                  </th>
                  {heatmap.concepts.map((c) => (
                    <th
                      key={c.id}
                      className="min-w-[92px] border-l border-line bg-surface px-2 py-2 text-center text-[10px] font-semibold leading-tight text-muted"
                      title={c.name}
                    >
                      {c.name}
                    </th>
                  ))}
                  <th className="min-w-[80px] border-l border-line bg-bg px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-faint">
                    Média
                  </th>
                </tr>
              </thead>
              <tbody>
                {heatmap.students.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 text-[13px] font-medium text-ink">
                      {s.label}
                    </td>
                    {heatmap.concepts.map((c) => {
                      const cell = heatmap.cells.get(s.id)?.get(c.id);
                      if (!cell) {
                        return (
                          <td
                            key={c.id}
                            className="border-l border-line px-2 py-2 text-center text-faint"
                          >
                            —
                          </td>
                        );
                      }
                      const pct = Math.round(cell.mastery * 100);
                      return (
                        <td
                          key={c.id}
                          className={`border-l border-line px-2 py-2 text-center ${masteryBg(pct)}`}
                        >
                          <span className="text-[12px] font-semibold text-ink">
                            {pct}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-l border-line bg-bg px-2 py-2 text-center">
                      {s.avgMastery !== null ? (
                        <Tag tone={masteryTone(Math.round(s.avgMastery * 100))}>
                          {Math.round(s.avgMastery * 100)}%
                        </Tag>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Legenda
          </div>
          <div className="mb-5 flex flex-wrap gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-strong-bg" /> ≥70% domínio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-average-bg" /> 50–69%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-weak-bg" /> &lt;50%
            </span>
          </div>

          {heatmap.weakConcepts.length > 0 && (
            <div className="mb-5">
              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Conceitos que a turma não fixou
              </div>
              <div className="flex flex-col gap-2">
                {heatmap.weakConcepts.map((w) => (
                  <div
                    key={w.concept.id}
                    className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-ink">
                      {w.concept.name}
                    </span>
                    <Tag tone="weak">
                      {Math.round(w.avgMastery * 100)}% turma
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Callout tone="warm">
        <strong>Privacidade:</strong> Você vê domínio agregado por conceito —
        nunca as conversas dos alunos com o Tutor.
      </Callout>
    </ScreenBody>
  );
}
