import { SimulacoesView } from "@/src/ui/student/simulations/SimulacoesView";

export default function PreviewSimulacoes() {
  return (
    <SimulacoesView completed={["termometro-elevador"]} basePath="/preview" />
  );
}
