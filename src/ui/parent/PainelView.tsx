"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  LinkedChild,
  SubjectMastery,
} from "@/src/features/user-profiles/parent-profile-service";
import { GRADE_BAND_LABELS_PT } from "@/src/core/auth/types";
import { Callout, ChoiceTabs, PrivacyNote } from "@/src/ui/kit";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { ChevronRightIcon, LampIcon } from "@/src/ui/paideia/line-icons";
import { subjectStyle } from "@/src/ui/student/subject-style";

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

const TREND_LABEL: Record<SubjectMastery["trend"], string> = {
  up: "subindo",
  down: "caindo",
  stable: "estável",
};

/** Faixa de domínio → cor da barra e do número. */
const band = (pct: number) =>
  pct >= 70
    ? { bar: "bg-glauco-mid", text: "text-glauco-ink" }
    : pct >= 50
      ? { bar: "bg-coin", text: "text-lamp-ink" }
      : { bar: "bg-coral-mid", text: "text-coral-ink" };

/** Painel do responsável (prancha `PaisPainel`). */
export function PainelView({
  students,
  masteryByChild,
}: {
  students: LinkedChild[];
  masteryByChild: Map<string, SubjectMastery[]>;
}) {
  const [selected, setSelected] = useState(students[0]?.id ?? "");
  const child = students.find((c) => c.id === selected) ?? students[0];
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

  const firstName = child.full_name.split(" ")[0];

  return (
    <ScreenBody>
      <ScreenHeader title="Painel" subtitle="Domínio por matéria e conceito" />

      <div className="flex flex-col gap-5">
        {students.length > 1 && (
          <ChildTabs
            students={students}
            selected={child.id}
            onSelect={setSelected}
          />
        )}

        <div className="flex items-center gap-3.5 rounded-lg bg-surface px-[18px] py-4">
          <span
            aria-hidden
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[12px] bg-lavender font-display text-[22px] text-lavender-ink"
          >
            {child.full_name.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-base font-extrabold">
              {child.full_name}
            </span>
            <span className="text-[13px] text-muted">
              {child.grade_level
                ? GRADE_BAND_LABELS_PT[child.grade_level]
                : child.school_name}
            </span>
          </div>
          {overall !== null && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted">Média geral</span>
              <span className="font-display text-[26px] leading-[1.1] tabular-nums">
                {overall}%
              </span>
            </div>
          )}
        </div>

        {subjects.length === 0 ? (
          <Callout>
            Nenhuma sessão registrada ainda. O painel aparece assim que{" "}
            {firstName} começar a usar o tutor ou a revisão.
          </Callout>
        ) : (
          <section className="flex flex-col rounded-lg bg-surface">
            {subjects.map((s, i) => {
              const style = subjectStyle(s.subject);
              const tone = band(s.masteryPct);
              return (
                <div
                  key={s.subject}
                  className={`flex flex-col gap-[9px] px-[18px] py-3.5 ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="w-[18px] font-mark text-lg"
                      style={{ color: style.color }}
                    >
                      {style.glyph}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                      {subjectLabel(s.subject)}
                    </span>
                    {s.fewData && (
                      <span className="rounded bg-line px-1.5 py-0.5 text-[11px] font-bold text-muted">
                        poucos dados
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted">
                      {s.sessionCount}{" "}
                      {s.sessionCount === 1 ? "sessão" : "sessões"}
                      {s.fewData ? "" : ` · ${TREND_LABEL[s.trend]}`}
                    </span>
                    <span
                      className={`w-[42px] text-right text-sm font-extrabold tabular-nums ${tone.text}`}
                    >
                      {s.masteryPct}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-[3px] bg-line"
                    role="progressbar"
                    aria-label={`Domínio em ${subjectLabel(s.subject)}`}
                    aria-valuenow={s.masteryPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-1.5 rounded-[3px] transition-[width] duration-500 ${tone.bar}`}
                      style={{ width: `${s.masteryPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <Link
          href="/parent/chat"
          className="flex items-center gap-3.5 rounded-lg bg-lamp px-[18px] py-4 text-on-lamp"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-white/45 text-on-lamp-accent">
            <LampIcon size={23} />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">
              Como apoiar {firstName} em casa?
            </span>
            <span className="text-[13px] text-on-lamp-accent">
              Pergunte ao Conselheiro
            </span>
          </span>
          <ChevronRightIcon size={20} />
        </Link>

        <PrivacyNote>
          Você vê domínio e tendência, nunca as conversas de {firstName} com o
          tutor.
        </PrivacyNote>
      </div>
    </ScreenBody>
  );
}

/** Abas de filho (responsável com mais de um filho matriculado). */
export function ChildTabs({
  students,
  selected,
  onSelect,
  size = "md",
}: {
  students: { id: string; full_name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  size?: "md" | "sm";
}) {
  return (
    <ChoiceTabs
      label="Filhos"
      size={size}
      value={selected}
      onChange={onSelect}
      options={students.map((c) => ({
        value: c.id,
        label: c.full_name.split(" ")[0],
      }))}
    />
  );
}
