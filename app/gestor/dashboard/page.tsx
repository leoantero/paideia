import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { Callout } from "@/src/ui/kit";

export default function GestorDashboardPage() {
  return (
    <ScreenBody>
      <ScreenHeader title="Dashboard" subtitle="Visão completa da escola" />
      <Callout>
        Os painéis de escola, professores, responsáveis e desempenho por matéria
        entram aqui, a partir dos agregados da rede. Em construção.
      </Callout>
    </ScreenBody>
  );
}
