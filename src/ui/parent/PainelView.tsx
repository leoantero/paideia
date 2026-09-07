"use client";

import { useState } from "react";
import type {
  LinkedChild,
  SubjectMastery,
} from "@/src/features/user-profiles/parent-profile-service";
import { GRADE_BAND_LABELS_PT } from "@/src/core/auth/types";
import { Avatar, Callout, Segmented, Tag } from "@/src/ui/kit";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";

const SUBJECT_LABELS: Record<string, string> = {
  math: "Matemática",
  science: "Ciências",
  language: "Português",
  history: "História",
  physics: "Física",
  biology: "Biologia",
  chemistry: "Química",
  general: "Geral",
};

const subjectLabel = (subject: string) =>
  SUBJECT_LABELS[subject] ?? subject.charAt(0).toUpperCase() + subject.slice(1);

const trendIcon: Record<SubjectMastery["trend"], string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

const masteryTone = (pct: number): "strong" | "average" | "weak" =>
  pct >= 70 ? "strong" : pct >= 50 ? "average" : "weak";

const masteryBarColor = (pct: number) =>
  pct >= 70 ? "bg-strong" : pct >= 50 ? "bg-gold" : "bg-weak";

export function PainelView({
  children,
  masteryByChild,
}: {
  children: LinkedChild[];
  masteryByChild: Map<string, SubjectMastery[]>;
}) {
  const [selected, setSelected] = useState(children[0]?.id ?? "");
  const child = children.find((c) => c.id === selected) ?? children[0];
  const subjects = child ? (masteryByChild.get(child.id) ?? []) : [];

  const overall =
    subjects.length > 0
      ? Math.round(
          subjects.reduce((acc, s) => acc + s.masteryPct, 0) / subjects.length
        )
      : null;

  if (!child) {
    return (
      <ScreenBody>
        <ScreenHeader
          title="Painel"
          subtitle="Domínio por matéria e conceito"
        />
        <Callout>
          Nenhuma criança vinculada ainda. O vínculo é feito pela escola, a
          partir do e-mail informado na matrícula.
        </Callout>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody>
      <ScreenHeader title="Painel" subtitle="Domínio por matéria e conceito" />

      {children.length > 1 && (
        <Segmented
          className="mb-4"
          value={selected}
          onChange={setSelected}
          options={children.map((c) => ({ value: c.id, label: c.full_name }))}
        />
      )}

      <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-[18px]">
        <Avatar initial={child.full_name.charAt(0).toUpperCase()} tone="mist" />
        <div className="min-w-0">
          <div className="font-display text-[16px] font-bold text-ink">
            {child.full_name}
          </div>
          <div className="text-[13px] text-muted">
            {child.grade_level
              ? GRADE_BAND_LABELS_PT[child.grade_level]
              : child.school_name}
          </div>
        </div>
        {overall !== null && (
          <div className="ml-auto text-right">
            <div className="text-[11px] text-faint">Média geral</div>
            <div className="font-display text-[22px] font-extrabold text-ink">
              {overall}%
            </div>
          </div>
        )}
      </div>

      {subjects.length === 0 ? (
        <Callout>
          Nenhuma sessão registrada ainda. O painel aparece assim que{" "}
          {child.full_name.split(" ")[0]} começar a usar o Tutor ou a Revisão.
        </Callout>
      ) : (
        <div className="flex flex-col gap-2.5">
          {subjects.map((s) => (
            <div
              key={s.subject}
              className="rounded-[14px] border border-line bg-surface p-4"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  {subjectLabel(s.subject)}
                </span>
                <div className="flex items-center gap-2">
                  {s.fewData && <Tag>poucos dados</Tag>}
                  <span className="text-xs text-faint">
                    {s.sessionCount} sessões
                  </span>
                  <span className="text-base font-bold text-muted">
                    {trendIcon[s.trend]}
                  </span>
                  <Tag tone={masteryTone(s.masteryPct)}>{s.masteryPct}%</Tag>
                </div>
              </div>
              <div className="h-2 rounded-full bg-bg">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${masteryBarColor(s.masteryPct)}`}
                  style={{ width: `${s.masteryPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Callout tone="warm" className="mt-4">
        <strong>Privacidade:</strong> Você vê domínio e tendência — nunca as
        conversas do seu filho com o Tutor.
      </Callout>
    </ScreenBody>
  );
}
