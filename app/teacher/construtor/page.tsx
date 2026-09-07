import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { Callout } from "@/src/ui/kit";

export default function ConstrutorPage() {
  return (
    <ScreenBody>
      <ScreenHeader
        title="Construtor"
        subtitle="Questões criadas com IA por conteúdo"
      />
      <Callout>
        O construtor de questões com IA (múltipla escolha, discursiva, V ou F,
        por matéria e tópico) entra aqui. Em construção.
      </Callout>
    </ScreenBody>
  );
}
