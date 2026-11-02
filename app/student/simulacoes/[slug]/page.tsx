import { notFound } from "next/navigation";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { findSimulation } from "@/src/features/simulations/catalog";
import { SimulationScreen } from "@/src/ui/student/simulations/SimulationScreen";

export const dynamic = "force-dynamic";

export default async function SimulacaoPage({
  params,
}: PageProps<"/student/simulacoes/[slug]">) {
  const { slug } = await params;
  if (!findSimulation(slug)) notFound();

  const { supabase } = await getVerifiedUser();
  const { data } = await supabase
    .from("simulation_completions")
    .select("simulation_id")
    .eq("simulation_id", slug)
    .maybeSingle();

  return <SimulationScreen slug={slug} alreadyCompleted={Boolean(data)} />;
}
