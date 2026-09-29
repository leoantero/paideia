"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import type { GradeBand } from "@/src/core/auth/types";
import { Meander } from "@/src/ui/paideia/ornaments";

const GRADE_OPTIONS: { value: GradeBand; label: string }[] = [
  { value: "elementary_1", label: "Fundamental I (1º ao 5º ano)" },
  { value: "elementary_2", label: "Fundamental II (6º ao 9º ano)" },
  { value: "high_school", label: "Ensino Médio" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [classCode, setClassCode] = useState("");
  const [classroomName, setClassroomName] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState<GradeBand>("elementary_2");
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("students")
        .select("linking_code, grade_level")
        .eq("id", user.id)
        .single();
      if (data) {
        setLinkingCode(data.linking_code);
        if (data.grade_level) {
          setGradeLevel(data.grade_level);
          setSaved(true);
        }
      }
    }
    load();
  }, [supabase]);

  async function joinClassroom(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("join_classroom", { p_code: classCode });
    setLoading(false);
    if (rpcError) {
      setError("Código de turma não encontrado. Confira com a sua escola.");
      return;
    }
    setClassroomName(`${data.classroom_name} · ${data.school_name}`);
    setSaved(true);
  }

  async function saveGradeOnly() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("students").update({ grade_level: gradeLevel }).eq("id", user.id);
    }
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta">Boas-vindas</p>
        <h1 className="font-display text-4xl">Vamos começar.</h1>
      </header>

      <form onSubmit={joinClassroom} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
        <label htmlFor="class-code" className="font-display text-xl">
          Código da sua turma
        </label>
        <p className="text-sm text-ink-soft">A escola entrega esse código. Com ele você entra no pódio da sua sala.</p>
        <div className="flex gap-2">
          <input
            id="class-code"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="EX: 8A-DEMO"
            className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-marble px-4 py-3 font-mono font-bold tracking-widest outline-none focus:border-aegean"
          />
          <button
            type="submit"
            disabled={loading || !classCode.trim()}
            className="rounded-2xl bg-aegean px-5 font-extrabold text-marble disabled:opacity-40"
          >
            Entrar
          </button>
        </div>
        {classroomName && <p className="text-sm font-bold text-olive">Você entrou em {classroomName}!</p>}
        {error && <p className="text-sm font-semibold text-terracotta">{error}</p>}
      </form>

      {!classroomName && (
        <details className="rounded-3xl border border-line bg-surface p-5">
          <summary className="cursor-pointer font-semibold">Ainda não tenho código</summary>
          <div className="mt-3 flex flex-col gap-3">
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value as GradeBand)}
              className="rounded-2xl border-2 border-line bg-marble px-4 py-3"
            >
              {GRADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveGradeOnly}
              disabled={loading}
              className="rounded-2xl border-2 border-ink px-4 py-3 font-bold"
            >
              Salvar série
            </button>
          </div>
        </details>
      )}

      {linkingCode && (
        <section className="overflow-hidden rounded-3xl bg-ink text-marble">
          <Meander height={10} color="var(--gold)" className="opacity-50" />
          <div className="p-5">
            <p className="text-sm text-marble/70">Mostre este código para sua família acompanhar seu progresso:</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-gold">{linkingCode}</p>
          </div>
        </section>
      )}

      {saved && (
        <button
          onClick={() => router.push("/student")}
          className="rounded-full bg-terracotta px-6 py-4 text-lg font-extrabold text-marble shadow-[0_6px_0_0_var(--terracotta-deep)]"
        >
          Ir para o início →
        </button>
      )}
    </div>
  );
}
