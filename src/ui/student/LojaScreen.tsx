import { REWARDS } from "@/src/ui/student/gamification-data";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { Callout } from "@/src/ui/kit";

export function LojaScreen({ coins }: { coins: number }) {
  return (
    <ScreenBody>
      <ScreenHeader
        title="Loja"
        subtitle="Troque moedas por personalizações"
        action={
          <div className="rounded-[16px] border-2 border-gold bg-parchment px-3.5 py-1.5">
            <span className="font-display text-lg font-extrabold text-gold-deep">
              🪙 {coins}
            </span>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2.5">
        {REWARDS.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-[14px] border-[1.5px] border-line bg-surface px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-bg text-[22px]">
                {r.icon}
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">{r.name}</div>
                <div className="text-xs text-faint">
                  {coins >= r.cost
                    ? "Você já tem moedas suficientes"
                    : `Faltam ${r.cost - coins} 🪙`}
                </div>
              </div>
            </div>
            <span className="rounded-[10px] bg-line px-3.5 py-2 font-display text-xs font-bold text-faint">
              {r.cost} 🪙
            </span>
          </div>
        ))}
      </div>

      {/* Honestidade > efeito: o resgate ainda não existe, e a tela diz isso em
          vez de exibir um botão que não faz nada. */}
      <Callout>
        O resgate de recompensas ainda não está liberado — suas moedas continuam
        acumulando e valerão quando a loja abrir.
      </Callout>

      <p className="mt-4 text-center text-xs text-faint">
        Você ganha moedas estudando: 5 por dia de ofensiva, 2 por card de
        revisão e 20 ao completar a semana.
      </p>
    </ScreenBody>
  );
}
