-- ============================================================================
-- Guarda de uso das rotas de IA: separa ALUNO de MELIANTE.
--
-- 0019 só tinha teto por hora em cada rota. Isso freia um script, mas não
-- avisa ninguém, e quem roda um script com uma credencial vazada simplesmente
-- espera a hora virar e continua — a fatura cresce em silêncio.
--
-- Agora são três camadas, decididas numa só chamada atômica (ai_guard):
--
--   1. por rota, por hora   (o de 0019; a rota passa o teto dela)
--   2. por usuário, por dia, somando TODAS as rotas de IA: 200 chamadas.
--      Um aluno que estuda muito faz algo como 40–120 por dia (40 é o teto
--      de uma hora inteira de chat). Chegar a 200 não é estudo, é automação.
--   3. global, por dia: 3000 chamadas no app inteiro. Disjuntor de custo — se
--      várias credenciais forem usadas ao mesmo tempo, a conta para aqui.
--      (~US$ 0,002 por chamada no Haiku 4.5 → teto de poucos dólares/dia.)
--
-- Toda negação vira linha em ai_usage_alerts (uma por usuário/tipo/hora).
-- Bater no teto por hora de vez em quando é normal; o sinal de meliante é
-- bater no teto DIÁRIO, ou no teto por hora em 3+ horas diferentes no mesmo
-- dia. ai_usage_check() resume isso só com contagens (nenhum id, nenhum nome)
-- para o monitor do GitHub Actions; scripts/usage-report.ts mostra quem foi.
-- ============================================================================

create table ai_usage_alerts (
  id bigint generated always as identity primary key,
  user_id uuid,
  kind text not null check (kind in ('hourly_limit', 'daily_limit', 'global_limit')),
  route text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_alerts_time_idx on ai_usage_alerts (created_at desc);
create index ai_route_calls_day_idx on ai_route_calls (created_at desc);

-- Mesmo padrão de ai_route_calls: RLS ligada e nenhuma policy = só service-role.
alter table ai_usage_alerts enable row level security;

create table ai_usage_limits (
  id boolean primary key default true check (id),
  user_daily_limit integer not null,
  global_daily_limit integer not null,
  -- sha256 do token do monitor; o token em si fica só no secret do GitHub
  monitor_token_hash bytea
);

alter table ai_usage_limits enable row level security;

insert into ai_usage_limits (user_daily_limit, global_daily_limit) values (200, 3000);

-- ----------------------------------------------------------------------------
-- A decisão. Só service-role (rate-limit.ts via admin client).
-- ----------------------------------------------------------------------------
create function ai_guard(p_user uuid, p_route text, p_hourly_limit integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limits ai_usage_limits%rowtype;
  v_hour_start timestamptz := now() - interval '1 hour';
  v_day_start timestamptz := now() - interval '24 hours';
  v_kind text;
  v_oldest timestamptz;
  v_retry integer;
begin
  select * into v_limits from ai_usage_limits;

  -- serializa a decisão por usuário: duas abas em paralelo não furam o teto
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  if (select count(*) from ai_route_calls where created_at >= v_day_start) >= v_limits.global_daily_limit then
    v_kind := 'global_limit';
    select min(created_at) into v_oldest from ai_route_calls where created_at >= v_day_start;
    v_retry := extract(epoch from (v_oldest + interval '24 hours' - now()));
  elsif (select count(*) from ai_route_calls where user_id = p_user and created_at >= v_day_start) >= v_limits.user_daily_limit then
    v_kind := 'daily_limit';
    select min(created_at) into v_oldest from ai_route_calls where user_id = p_user and created_at >= v_day_start;
    v_retry := extract(epoch from (v_oldest + interval '24 hours' - now()));
  elsif (select count(*) from ai_route_calls where user_id = p_user and route = p_route and created_at >= v_hour_start) >= p_hourly_limit then
    v_kind := 'hourly_limit';
    select min(created_at) into v_oldest from ai_route_calls
      where user_id = p_user and route = p_route and created_at >= v_hour_start;
    v_retry := extract(epoch from (v_oldest + interval '1 hour' - now()));
  end if;

  if v_kind is not null then
    insert into ai_usage_alerts (user_id, kind, route)
    select p_user, v_kind, p_route
    where not exists (
      select 1 from ai_usage_alerts
      where user_id = p_user and kind = v_kind and created_at >= now() - interval '1 hour'
    );
    return json_build_object('allowed', false, 'kind', v_kind, 'retry_after_seconds', greatest(1, coalesce(v_retry, 60)));
  end if;

  insert into ai_route_calls (user_id, route) values (p_user, p_route);
  -- retenção: 8 dias bastam para os tetos e para investigar um alerta
  delete from ai_route_calls where created_at < now() - interval '8 days';
  return json_build_object('allowed', true);
end;
$$;

revoke execute on function ai_guard(uuid, text, integer) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- O resumo para o monitor. Chamável com a anon key, mas só devolve algo com o
-- token certo, e mesmo assim apenas contagens.
-- ----------------------------------------------------------------------------
create function ai_usage_check(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash bytea;
  v_since timestamptz := now() - interval '24 hours';
begin
  select monitor_token_hash into v_hash from ai_usage_limits;
  if v_hash is null or p_token is null or sha256(convert_to(p_token, 'UTF8')) <> v_hash then
    raise exception 'Not authorized.';
  end if;

  return json_build_object(
    'calls_24h', (select count(*) from ai_route_calls where created_at >= v_since),
    'global_daily_limit', (select global_daily_limit from ai_usage_limits),
    'users_at_daily_limit', (
      select count(distinct user_id) from ai_usage_alerts
      where kind = 'daily_limit' and created_at >= v_since
    ),
    'users_hitting_hourly_limit_3h', (
      select count(*) from (
        select user_id from ai_usage_alerts
        where kind = 'hourly_limit' and created_at >= v_since
        group by user_id
        having count(distinct date_trunc('hour', created_at)) >= 3
      ) s
    ),
    'global_limit_hit', exists (
      select 1 from ai_usage_alerts where kind = 'global_limit' and created_at >= v_since
    )
  );
end;
$$;

revoke execute on function ai_usage_check(text) from public;
grant execute on function ai_usage_check(text) to anon, authenticated;
