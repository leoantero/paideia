import { findSimulation } from "@/src/features/simulations/catalog";
import { TutorScreen } from "@/src/ui/student/TutorScreen";

export default async function PreviewTutor({
  searchParams,
}: PageProps<"/preview/tutor">) {
  const { q, sim } = await searchParams;
  const simulation = typeof sim === "string" ? findSimulation(sim) : undefined;
  return (
    <div className="-mb-6 flex h-[calc(100dvh-156px)] min-h-[420px] flex-col">
      <TutorScreen
        firstName="Ana"
        conversations={[]}
        endpoint="/preview/api/chat"
        initialQuestion={typeof q === "string" ? q : undefined}
        simulation={
          simulation
            ? { id: simulation.slug, title: simulation.title }
            : undefined
        }
      />
    </div>
  );
}
