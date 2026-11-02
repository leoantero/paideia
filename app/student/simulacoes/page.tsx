import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { SimulacoesView } from "@/src/ui/student/simulations/SimulacoesView";

export const dynamic = "force-dynamic";

export default async function SimulacoesPage() {
  const { supabase } = await getVerifiedUser();
  // RLS: só as conclusões do próprio aluno.
  const { data } = await supabase
    .from("simulation_completions")
    .select("simulation_id");
  return (
    <SimulacoesView
      completed={(data ?? []).map((r) => r.simulation_id as string)}
    />
  );
}
