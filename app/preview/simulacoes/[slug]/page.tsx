import { notFound } from "next/navigation";
import { findSimulation } from "@/src/features/simulations/catalog";
import { SimulationScreen } from "@/src/ui/student/simulations/SimulationScreen";

export default async function PreviewSimulacao({
  params,
}: PageProps<"/preview/simulacoes/[slug]">) {
  const { slug } = await params;
  if (!findSimulation(slug)) notFound();
  return (
    <SimulationScreen
      slug={slug}
      basePath="/preview"
      completeEndpoint="/preview/api/simulation-complete"
      alreadyCompleted={false}
    />
  );
}
