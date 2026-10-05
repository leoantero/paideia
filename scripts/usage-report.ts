import { admin } from "./lib/admin";

/**
 * Quem está usando a IA, e quem disparou alerta (ai_usage_alerts, 0025).
 * Rode quando o monitor do GitHub Actions avisar: ele só sabe contagens; o
 * nome de quem foi fica aqui, com a service-role, na sua máquina.
 *
 *   npm run usage:report            # últimas 24h
 *   npm run usage:report -- 72      # últimas 72h
 */
async function main() {
  const hours = Number(process.argv[2] ?? 24);
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const [
    { data: calls, error: cErr },
    { data: alerts, error: aErr },
    { data: limits },
  ] = await Promise.all([
    admin
      .from("ai_route_calls")
      .select("user_id, route, created_at")
      .gte("created_at", since),
    admin
      .from("ai_usage_alerts")
      .select("user_id, kind, route, created_at")
      .gte("created_at", since)
      .order("created_at"),
    admin
      .from("ai_usage_limits")
      .select("user_daily_limit, global_daily_limit")
      .single(),
  ]);
  if (cErr) throw cErr;
  if (aErr) throw aErr;

  const ids = [
    ...new Set(
      [...(calls ?? []), ...(alerts ?? [])]
        .map((r) => r.user_id)
        .filter(Boolean)
    ),
  ];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("id", ids);
  const who = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.full_name ?? "?"} (${p.role})`])
  );

  const perUser = new Map<
    string,
    { total: number; routes: Map<string, number>; hours: Set<string> }
  >();
  for (const c of calls ?? []) {
    const u = perUser.get(c.user_id) ?? {
      total: 0,
      routes: new Map(),
      hours: new Set(),
    };
    u.total += 1;
    u.routes.set(c.route, (u.routes.get(c.route) ?? 0) + 1);
    u.hours.add(c.created_at.slice(0, 13));
    perUser.set(c.user_id, u);
  }

  console.log(
    `\nUso de IA nas últimas ${hours}h — ${calls?.length ?? 0} chamadas ` +
      `(teto global/dia: ${limits?.global_daily_limit}, por usuário/dia: ${limits?.user_daily_limit})\n`
  );
  const rows = [...perUser.entries()].sort((a, b) => b[1].total - a[1].total);
  if (rows.length === 0) console.log("  ninguém usou.");
  for (const [id, u] of rows) {
    const routes = [...u.routes.entries()]
      .map(([r, n]) => `${r} ${n}`)
      .join(", ");
    console.log(
      `  ${String(u.total).padStart(4)}  ${who.get(id) ?? id}  ·  ${u.hours.size}h ativas  ·  ${routes}`
    );
  }

  console.log(`\nAlertas (${alerts?.length ?? 0}):`);
  if (!alerts?.length) console.log("  nenhum — uso compatível com aluno.");
  for (const a of alerts ?? []) {
    console.log(
      `  ${a.created_at.slice(0, 16).replace("T", " ")}  ${a.kind.padEnd(13)} ${a.route.padEnd(18)} ${who.get(a.user_id) ?? a.user_id ?? "—"}`
    );
  }
  console.log(
    "\nSinal de meliante: daily_limit, global_limit, ou hourly_limit em 3+ horas no mesmo dia." +
      "\nPara bloquear de vez: troque a senha da demo (npm run demo:rotate-password).\n"
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
