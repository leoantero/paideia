import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  ConstrutorView,
  type BuilderConcept,
  type SavedQuestion,
} from "@/src/ui/teacher/ConstrutorView";

export const dynamic = "force-dynamic";

export default async function ConstrutorPage() {
  const { supabase, user } = await getVerifiedUser();

  // A matéria do professor vem do vínculo, não de um seletor livre.
  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("subject")
    .eq("profile_id", user?.id ?? "");

  const subjects = [
    ...new Set(
      (assignments ?? []).map((a) => a.subject as string).filter(Boolean)
    ),
  ];

  let conceptQuery = supabase
    .from("concepts")
    .select("id, code, name, subject")
    .order("grade_year")
    .order("name");
  if (subjects.length > 0) conceptQuery = conceptQuery.in("subject", subjects);

  const [{ data: concepts }, { data: saved }] = await Promise.all([
    conceptQuery,
    supabase
      .from("questions")
      .select("id, stem, type, concepts(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const savedQuestions: SavedQuestion[] = (
    (saved ?? []) as Record<string, unknown>[]
  ).map((q) => {
    const rel = q.concepts as { name: string } | { name: string }[] | null;
    const concept = Array.isArray(rel) ? rel[0] : rel;
    return {
      id: q.id as string,
      stem: q.stem as string,
      type: q.type as string,
      concept_name: concept?.name ?? null,
    };
  });

  return (
    <ConstrutorView
      concepts={(concepts ?? []) as BuilderConcept[]}
      saved={savedQuestions}
    />
  );
}
