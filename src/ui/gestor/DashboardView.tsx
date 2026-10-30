"use client";

import { useState } from "react";
import type {
  DailySessions,
  GuardianCoverage,
  SchoolOverview,
  SubjectMastery,
  TeacherEngagement,
} from "@/src/features/user-profiles/gestor-service";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { Callout, PrivacyNote, UnderlineTabs } from "@/src/ui/kit";
import { styleFor } from "@/src/ui/subject-styles";

type Tab = "escola" | "professores" | "responsaveis" | "desempenho";

const band = (pct: number) =>
  pct >= 70
    ? { bar: "bg-glauco-mid", text: "text-glauco-ink" }
    : pct >= 50
      ? { bar: "bg-coin", text: "text-lamp-ink" }
      : { bar: "bg-coral-mid", text: "text-coral-ink" };

interface KpiItem {
  label: string;
  value: string | number;
  hint?: string;
}

/** Grade 2×N de números grandes num cartão só (prancha `GestorDashboard`). */
function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <section className="grid grid-cols-2 rounded-lg bg-surface tabular-nums">
      {items.map((k, i) => (
        <div
          key={k.label}
          className={`flex flex-col gap-0.5 px-[18px] py-4 ${
            i % 2 === 1 ? "border-l border-line" : ""
          } ${i >= 2 ? "border-t border-line" : ""}`}
        >
          <span className="font-display text-[28px] leading-tight">
            {k.value}
          </span>
          <span className="text-[13px] font-bold">{k.label}</span>
          {k.hint && <span className="text-xs text-muted">{k.hint}</span>}
        </div>
      ))}
    </section>
  );
}

/** Sessões por dia; fim de semana mais claro, hoje em destaque. */
function DailyChart({ daily }: { daily: DailySessions[] }) {
  const max = Math.max(1, ...daily.map((d) => d.sessions));
  const last = daily.length - 1;
  const total = daily.reduce((a, d) => a + d.sessions, 0);
  if (total === 0) {
    return (
      <p className="text-[13px] text-muted">
        Nenhuma sessão registrada nos últimos 14 dias.
      </p>
    );
  }
  return (
    <div
      role="img"
      aria-label={`Sessões por dia nos últimos ${daily.length} dias; hoje ${daily[last]?.sessions ?? 0}`}
      className="flex h-[150px] items-end gap-1.5"
    >
      {daily.map((d, i) => {
        const weekday = new Date(`${d.day}T12:00:00`).getDay();
        const weekend = weekday === 0 || weekday === 6;
        const today = i === last;
        const h = Math.max((d.sessions / max) * 100, d.sessions > 0 ? 4 : 1);
        return (
          <div
            key={d.day}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${d.day}: ${d.sessions} sessões`}
          >
            {today && (
              <span className="text-[10px] font-extrabold tabular-nums">
                {d.sessions}
              </span>
            )}
            <div
              className={`w-full rounded-[2px] ${
                today ? "bg-night" : "bg-lavender-strong"
              } ${weekend && !today ? "opacity-60" : ""}`}
              style={{ height: `${h}px` }}
            />
            <span
              className={`text-[10px] tabular-nums ${
                today ? "font-extrabold text-ink" : "text-muted"
              } ${(last - i) % 2 === 0 ? "" : "invisible"}`}
            >
              {Number(d.day.slice(8, 10))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Dashboard do gestor (prancha `GestorDashboard`; só a aba Escola tem prancha). */
export function DashboardView({
  scopeLabel,
  overview,
  daily,
  teachers,
  subjects,
  guardians,
}: {
  scopeLabel: string;
  overview: SchoolOverview;
  daily: DailySessions[];
  teachers: TeacherEngagement[];
  subjects: SubjectMastery[];
  guardians: GuardianCoverage;
}) {
  const [tab, setTab] = useState<Tab>("escola");
  const coverage =
    guardians.total > 0
      ? Math.round((guardians.withGuardian / guardians.total) * 100)
      : 0;

  return (
    <ScreenBody>
      <ScreenHeader title="Dashboard" subtitle={scopeLabel} />

      <div className="flex flex-col gap-[18px]">
        <UnderlineTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "escola", label: "Escola" },
            { value: "professores", label: "Professores" },
            { value: "responsaveis", label: "Responsáveis" },
            { value: "desempenho", label: "Desempenho" },
          ]}
        />

        {tab === "escola" && (
          <>
            <KpiGrid
              items={[
                {
                  label: "Alunos ativos",
                  value: overview.activeStudents,
                  hint: "matrícula ativa",
                },
                {
                  label: "Responsáveis",
                  value: overview.linkedGuardians,
                  hint: "contas vinculadas",
                },
                {
                  label: "Professores",
                  value: overview.teachers,
                  hint: "com turma atribuída",
                },
                {
                  label: "Sessões em 7 dias",
                  value: overview.sessions7d,
                  hint: `${overview.studentsActive7d} alunos ativos`,
                },
              ]}
            />
            <section className="flex flex-col gap-3 rounded-lg bg-surface px-[18px] py-4">
              <h2 className="text-lg">Sessões por dia</h2>
              <DailyChart daily={daily} />
              <p className="text-xs text-muted">
                Últimos {daily.length} dias. Barras claras são fins de semana.
              </p>
            </section>
          </>
        )}

        {tab === "professores" && (
          <>
            <p className="text-[13px] leading-normal text-muted">
              Engajamento é a média de sessões por aluno nas turmas do
              professor, nos últimos 7 dias.
            </p>
            {teachers.length === 0 ? (
              <Callout>
                Nenhum professor com turma atribuída nesta unidade.
              </Callout>
            ) : (
              <section className="flex flex-col rounded-lg bg-surface">
                {teachers.map((t, i) => (
                  <div
                    key={t.teacherId}
                    className={`flex items-center gap-3 px-[18px] py-3.5 ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold">
                        {t.teacherName}
                      </span>
                      <span className="text-[13px] text-muted">
                        {t.classes} {t.classes === 1 ? "turma" : "turmas"} ·{" "}
                        {t.students} alunos · {t.sessions7d} sessões
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="font-display text-[22px] leading-tight tabular-nums">
                        {t.sessionsPerStudent.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-muted">
                        sessões/aluno
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {tab === "responsaveis" && (
          <>
            <KpiGrid
              items={[
                {
                  label: "Com responsável",
                  value: guardians.withGuardian,
                  hint: "conta vinculada",
                },
                {
                  label: "Sem responsável",
                  value: guardians.withoutGuardian,
                  hint: "requer ação",
                },
              ]}
            />
            <section className="flex flex-col gap-[9px] rounded-lg bg-surface px-[18px] py-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold">
                  Cobertura de famílias
                </span>
                <span className="text-sm font-extrabold tabular-nums">
                  {coverage}%
                </span>
              </div>
              <div className="h-1.5 rounded-[3px] bg-line">
                <div
                  className="h-1.5 rounded-[3px] bg-glauco-mid"
                  style={{ width: `${coverage}%` }}
                />
              </div>
            </section>
            {guardians.withoutGuardian > 0 && (
              <Callout tone="warm">
                <strong>Ação recomendada:</strong> {guardians.withoutGuardian}{" "}
                {guardians.withoutGuardian === 1
                  ? "aluno está"
                  : "alunos estão"}{" "}
                sem responsável vinculado. O vínculo é criado pela secretaria a
                partir do e-mail informado na matrícula.
              </Callout>
            )}
          </>
        )}

        {tab === "desempenho" &&
          (subjects.length === 0 ? (
            <Callout>
              Ainda não há evidência suficiente para calcular domínio por
              matéria.
            </Callout>
          ) : (
            <section className="flex flex-col rounded-lg bg-surface">
              {subjects.map((s, i) => {
                const st = styleFor(s.subject);
                const tone = band(s.avgMasteryPct);
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
                        style={{ color: st.color }}
                      >
                        {st.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                        {st.label}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {s.students} alunos · {s.conceptsTracked} conceitos
                      </span>
                      <span
                        className={`w-[42px] text-right text-sm font-extrabold tabular-nums ${tone.text}`}
                      >
                        {s.avgMasteryPct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-[3px] bg-line">
                      <div
                        className={`h-1.5 rounded-[3px] ${tone.bar}`}
                        style={{ width: `${s.avgMasteryPct}%` }}
                      />
                    </div>
                    {s.avgMasteryPct < 50 && (
                      <p className="text-xs font-semibold text-coral-ink">
                        Abaixo de 50%. Vale checar o planejamento desta matéria.
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          ))}

        <PrivacyNote>
          A gestão vê contagens e domínio agregado. Conversas do tutor e eventos
          individuais de aprendizagem não aparecem para nenhum perfil de gestão.
        </PrivacyNote>
      </div>
    </ScreenBody>
  );
}
