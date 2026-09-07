import { createClient } from "@/src/lib/supabase/server";
import { SettingsView } from "@/src/ui/SettingsView";
import { Callout } from "@/src/ui/kit";

export const dynamic = "force-dynamic";

const currency = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function GestorAjustesPage() {
  const supabase = await createClient();

  // RLS (0009) já escopa para a rede/unidade do gestor.
  const [{ data: orgs }, { data: schools }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, seat_price_cents, contract_started_at")
      .limit(1),
    supabase.from("schools").select("name, city, state").limit(1),
  ]);

  const org = orgs?.[0];
  const school = schools?.[0];

  const rows = [
    school && { label: "Unidade", value: school.name as string },
    school?.city && {
      label: "Cidade",
      value: `${school.city}${school.state ? `/${school.state}` : ""}`,
    },
    org && { label: "Rede", value: org.name as string },
    org?.seat_price_cents && {
      label: "Contrato",
      value: `${currency(org.seat_price_cents as number)} por aluno/mês`,
    },
    org?.contract_started_at && {
      label: "Início do contrato",
      value: new Date(org.contract_started_at as string).toLocaleDateString(
        "pt-BR"
      ),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <SettingsView
      extra={
        <>
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-[18px] py-3.5"
            >
              <span className="text-[13px] text-muted">{r.label}</span>
              <span className="text-sm font-medium text-ink">{r.value}</span>
            </div>
          ))}

          <Callout tone="warm">
            <strong>LGPD:</strong> o acesso da gestão é limitado a dados
            agregados. Conversas com o tutor e eventos individuais de
            aprendizagem não são acessíveis a nenhum perfil de gestão — a
            restrição é aplicada no banco, não apenas na interface.
          </Callout>
        </>
      }
    />
  );
}
