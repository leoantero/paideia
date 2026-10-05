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
import { Callout, Segmented, Tag } from "@/src/ui/kit";
import { styleFor } from "@/src/ui/subject-styles";

type Tab = "escola" | "professores" | "responsaveis" | "desempenho";

const masteryTone = (pct: number): "strong" | "average" | "weak" =>
  pct >= 70 ? "strong" : pct >= 50 ? "average" : "weak";

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="mt-1 font-display text-[24px] font-extrabold leading-none text-ink">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

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
  const maxSessions = Math.max(1, ...daily.map((d) => d.sessions));

  return (
    <ScreenBody>
      <ScreenHeader title="Dashboard" subtitle={scopeLabel} />

      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "escola", label: "Escola" },
          { value: "professores", label: "Professores" },
          { value: "responsaveis", label: "Responsáveis" },
          { value: "desempenho", label: "Desempenho" },
        ]}
      />

      {/* ───────────────── ESCOLA ───────────────── */}
      {tab === "escola" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi
              label="Alunos ativos"
              value={overview.activeStudents}
              hint="matrícula ativa"
            />
            <Kpi
              label="Responsáveis"
              value={overview.linkedGuardians}
              hint="contas vinculadas"
            />
            <Kpi
              label="Professores"
              value={overview.teachers}
              hint="com turma atribuída"
            />
            <Kpi
              label="Sessões (7d)"
              value={overview.sessions7d}
              hint={`${overview.studentsActive7d} alunos ativos`}
            />
          </div>

          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Sessões por dia (14 dias)
            </div>
            <div className="rounded-[14px] border border-line bg-surface p-4">
              {daily.every((d) => d.sessions === 0) ? (
                <p className="text-[13px] text-muted">
                  Nenhuma sessão registrada nos últimos 14 dias.
                </p>
              ) : (
                <div className="flex h-[110px] items-end gap-1">
                  {daily.map((d) => (
                    <div
                      key={d.day}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="w-full rounded-t bg-ink transition-[height]"
                        style={{
                          height: `${Math.max((d.sessions / maxSessions) * 88, d.sessions > 0 ? 4 : 1)}px`,
                          opacity: d.sessions > 0 ? 1 : 0.25,
                        }}
                        title={`${d.day}: ${d.sessions} sessões`}
                      />
                      <span className="text-[9px] text-faint">
                        {d.day.slice(8, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Callout tone="warm">
            <strong>Privacidade:</strong> a gestão vê contagens e domínio
            agregado. Conversas do tutor e eventos individuais de aprendizagem
            não são acessíveis a nenhum perfil de gestão.
          </Callout>
        </div>
      )}

      {/* ───────────────── PROFESSORES ───────────────── */}
      {tab === "professores" && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] text-muted">
            Engajamento = média de sessões por aluno nas turmas do professor,
            nos últimos 7 dias.
          </p>
          {teachers.length === 0 ? (
            <Callout>
              Nenhum professor com turma atribuída nesta unidade.
            </Callout>
          ) : (
            teachers.map((t) => (
              <div
                key={t.teacherId}
                className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-4 py-3.5"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-semibold text-ink">
                    {t.teacherName}
                  </div>
                  <div className="mt-0.5 text-xs text-faint">
                    {t.classes} {t.classes === 1 ? "turma" : "turmas"} ·{" "}
                    {t.students} alunos · {t.sessions7d} sessões
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-[18px] font-extrabold text-ink">
                    {t.sessionsPerStudent.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-faint">sessões/aluno</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ───────────────── RESPONSÁVEIS ───────────────── */}
      {tab === "responsaveis" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi
              label="Com responsável"
              value={guardians.withGuardian}
              hint="conta vinculada"
            />
            <Kpi
              label="Sem responsável"
              value={guardians.withoutGuardian}
              hint="requer ação"
            />
          </div>

          <div className="rounded-[14px] border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">
                Cobertura de famílias
              </span>
              <span className="text-muted">
                {guardians.total > 0
                  ? Math.round((guardians.withGuardian / guardians.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-strong"
                style={{
                  width: `${guardians.total > 0 ? (guardians.withGuardian / guardians.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {guardians.withoutGuardian > 0 && (
            <Callout tone="warm">
              <strong>Ação recomendada:</strong> {guardians.withoutGuardian}{" "}
              {guardians.withoutGuardian === 1 ? "aluno está" : "alunos estão"}{" "}
              sem responsável vinculado. O vínculo é criado pela secretaria a
              partir do e-mail informado na matrícula.
            </Callout>
          )}
        </div>
      )}

      {/* ───────────────── DESEMPENHO ───────────────── */}
      {tab === "desempenho" && (
        <div className="flex flex-col gap-2.5">
          {subjects.length === 0 ? (
            <Callout>
              Ainda não há evidência suficiente para calcular domínio por
              matéria.
            </Callout>
          ) : (
            subjects.map((s) => {
              const st = styleFor(s.subject);
              return (
                <div
                  key={s.subject}
                  className="rounded-[14px] border border-line bg-surface p-4"
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span>{st.icon}</span>
                      {st.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-faint">
                        {s.students} alunos · {s.conceptsTracked} conceitos
                      </span>
                      <Tag tone={masteryTone(s.avgMasteryPct)}>
                        {s.avgMasteryPct}%
                      </Tag>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-bg">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.avgMasteryPct}%`,
                        background: st.color,
                      }}
                    />
                  </div>
                  {s.avgMasteryPct < 50 && (
                    <p className="mt-2 text-[11px] font-semibold text-weak">
                      ⚠ Abaixo de 50% — vale checar o planejamento desta
                      matéria.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </ScreenBody>
  );
}
