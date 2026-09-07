import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { Callout } from "@/src/ui/kit";

export default function InsightsPage() {
  return (
    <ScreenBody>
      <ScreenHeader title="Insights da escola" subtitle="Perguntas sobre uso e desempenho da unidade" />
      <Callout>
        O assistente de insights (engajamento por turma, pré-requisitos críticos,
        uso por professor, ranking de domínio) entra aqui. Em construção.
      </Callout>
    </ScreenBody>
  );
}
