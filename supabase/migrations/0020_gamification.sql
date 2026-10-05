-- ============================================================================
-- Gamificação: pontos (ranking semanal da turma), dracmas (loja) e ofensiva
-- diária com congelamentos compráveis.
--
-- Substitui a economia DERIVADA de activity-service.ts (moedas recalculadas
-- de learning_events a cada render) por um ledger de verdade — era o passo
-- que aquele arquivo já anunciava ("quando a economia real entrar, isto vira
-- a migração inicial de saldo"). Comprar algo exige saldo que diminui, e um
-- valor recalculado do histórico não diminui.
--
-- Recompensa só vem de ação de aprendizado legítima (docs/PEDAGOGY.md) e toda
-- escrita acontece dentro de funções security definer: não existe policy de
-- escrita para o cliente, então o aluno não se dá pontos nem moedas.
--
-- A "turma" do ranking é a MATRÍCULA ativa (enrollments → school_classes,
-- 0009). Não existe código de turma: no modelo B2B quem matricula é a escola.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Relógio. Toda lógica de "dia" (ofensiva, vencimento, meta diária, semana do
-- ranking) usa o calendário local da escola, não UTC. `paideia.now` é override
-- só de teste: o PostgREST não dá ao cliente como setar isso.
-- ----------------------------------------------------------------------------
create function app_now() returns timestamptz
language sql stable
as $$
  select coalesce(nullif(current_setting('paideia.now', true), '')::timestamptz, now())
$$;

create function app_today() returns date
language sql stable
as $$
  select (app_now() at time zone 'America/Sao_Paulo')::date
$$;

create function app_day_start(p_day date) returns timestamptz
language sql immutable
as $$
  select p_day::timestamp at time zone 'America/Sao_Paulo'
$$;

create function app_week_start() returns timestamptz
language sql stable
as $$
  select app_day_start(date_trunc('week', app_today())::date)
$$;

-- "Ana Souza" -> "Ana S." — colega de turma só vê esta forma curta (mesma
-- regra do heatmap do professor: primeiro nome + inicial).
create function short_display_name(p_full_name text) returns text
language sql immutable
as $$
  select case
    when p_full_name is null or btrim(p_full_name) = '' then 'Aluno'
    when array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1) = 1 then btrim(p_full_name)
    else split_part(btrim(p_full_name), ' ', 1) || ' '
         || upper(left((regexp_split_to_array(btrim(p_full_name), '\s+'))[array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1)], 1)) || '.'
  end
$$;

-- Turma atual do aluno: a matrícula ativa do ano letivo mais recente.
create function current_class_id(p_student uuid) returns uuid
language sql stable
security definer
set search_path = public
as $$
  select e.class_id
  from enrollments e
  join school_classes sc on sc.id = e.class_id
  where e.student_id = p_student and e.status = 'active'
  order by sc.academic_year desc, e.started_at desc
  limit 1
$$;

revoke execute on function current_class_id(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Estado e ledger
-- ----------------------------------------------------------------------------
create type reward_source as enum ('card_review', 'daily_goal', 'tutor_session', 'streak_freeze_purchase');

create table student_progress (
  student_id uuid primary key references students(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  total_points integer not null default 0,
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  last_active_on date,
  streak_freezes integer not null default 0 check (streak_freezes between 0 and 2),
  updated_at timestamptz not null default now()
);

-- Append-only. Os pontos da semana são somados daqui, o que também torna
-- "posições ganhas desde ontem" calculável sem job de snapshot.
create table reward_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  source reward_source not null,
  ref text,
  points integer not null default 0,
  coins integer not null default 0,
  created_at timestamptz not null default app_now()
);

create index reward_events_student_time_idx on reward_events (student_id, created_at);

alter table student_progress enable row level security;
alter table reward_events enable row level security;

create policy student_progress_select_own on student_progress
  for select using (auth.uid() = student_id);

create policy reward_events_select_own on reward_events
  for select using (auth.uid() = student_id);

-- Meta diária por segmento (CLAUDE.md: fundamental I=5, II=10, médio=20 min).
create function daily_goal_minutes(p_grade grade_band) returns integer
language sql immutable
as $$
  select case p_grade
    when 'elementary_2' then 10
    when 'high_school' then 20
    else 5
  end
$$;

-- Ofensiva como o aluno deve vê-la AGORA: dia perdido coberto por um
-- congelamento ainda mantém a ofensiva; o congelamento só é consumido de fato
-- na próxima atividade (register_activity).
create function effective_streak(p_last_active date, p_streak integer, p_freezes integer, p_today date)
returns integer
language sql immutable
as $$
  select case
    when p_last_active is null then 0
    when p_last_active >= p_today - 1 then p_streak
    when (p_today - p_last_active - 1) <= p_freezes then p_streak
    else 0
  end
$$;

-- Interno: qualquer estudo num dia do calendário conta para a ofensiva.
create function register_activity(p_student uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress student_progress%rowtype;
  v_today date := app_today();
  v_missed integer;
  v_streak integer;
  v_freezes integer;
begin
  insert into student_progress (student_id) values (p_student) on conflict do nothing;
  select * into v_progress from student_progress where student_id = p_student for update;

  if v_progress.last_active_on = v_today then
    return;
  end if;

  v_freezes := v_progress.streak_freezes;
  if v_progress.last_active_on is null then
    v_streak := 1;
  else
    v_missed := v_today - v_progress.last_active_on - 1;
    if v_missed = 0 then
      v_streak := v_progress.streak_current + 1;
    elsif v_missed <= v_progress.streak_freezes then
      v_streak := v_progress.streak_current + 1;
      v_freezes := v_progress.streak_freezes - v_missed;
    else
      v_streak := 1;
    end if;
  end if;

  update student_progress
     set streak_current = v_streak,
         streak_best = greatest(streak_best, v_streak),
         streak_freezes = v_freezes,
         last_active_on = v_today,
         updated_at = now()
   where student_id = p_student;
end;
$$;

-- Interno: o ÚNICO lugar onde pontos/dracmas são creditados.
create function award_reward(
  p_student uuid,
  p_source reward_source,
  p_points integer,
  p_coins integer,
  p_ref text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into student_progress (student_id) values (p_student) on conflict do nothing;

  insert into reward_events (student_id, source, ref, points, coins)
  values (p_student, p_source, p_ref, p_points, p_coins);

  update student_progress
     set coins = coins + p_coins,
         total_points = total_points + p_points,
         updated_at = now()
   where student_id = p_student;
end;
$$;

revoke execute on function register_activity(uuid) from public, anon, authenticated;
revoke execute on function award_reward(uuid, reward_source, integer, integer, text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Loja: o congelamento de ofensiva é, por ora, o único item comprável.
-- ----------------------------------------------------------------------------
create function buy_streak_freeze()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_cost constant integer := 50;
  v_progress student_progress%rowtype;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'Only students can buy items.';
  end if;

  insert into student_progress (student_id) values (auth.uid()) on conflict do nothing;
  select * into v_progress from student_progress where student_id = auth.uid() for update;

  if v_progress.streak_freezes >= 2 then
    raise exception 'You already have the maximum number of streak freezes.';
  end if;
  if v_progress.coins < c_cost then
    raise exception 'Not enough coins.';
  end if;

  insert into reward_events (student_id, source, points, coins)
  values (auth.uid(), 'streak_freeze_purchase', 0, -c_cost);

  update student_progress
     set coins = coins - c_cost,
         streak_freezes = streak_freezes + 1,
         updated_at = now()
   where student_id = auth.uid()
  returning * into v_progress;

  return json_build_object('coins', v_progress.coins, 'streak_freezes', v_progress.streak_freezes);
end;
$$;

revoke execute on function buy_streak_freeze() from public, anon;
grant execute on function buy_streak_freeze() to authenticated;

-- ----------------------------------------------------------------------------
-- Tutoria: uma sessão conta quando o aluno de fato se engajou (3+ mensagens),
-- não por uma pergunta solta. Teto diário para que abrir várias conversas não
-- vire fazenda de moedas.
-- ----------------------------------------------------------------------------
create function reward_tutor_session(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_points constant integer := 15;
  c_coins constant integer := 3;
  c_daily_cap constant integer := 3;
  v_messages integer;
begin
  if not exists (
    select 1 from conversations where id = p_conversation_id and student_id = auth.uid()
  ) then
    raise exception 'Conversation not found.';
  end if;

  select count(*) into v_messages
  from messages where conversation_id = p_conversation_id and role = 'student';

  if v_messages < 3
     or exists (
       select 1 from reward_events
       where student_id = auth.uid() and source = 'tutor_session' and ref = p_conversation_id::text
     )
     or (
       select count(*) from reward_events
       where student_id = auth.uid() and source = 'tutor_session'
         and created_at >= app_day_start(app_today())
     ) >= c_daily_cap
  then
    return json_build_object('awarded', false);
  end if;

  perform award_reward(auth.uid(), 'tutor_session', c_points, c_coins, p_conversation_id::text);
  perform register_activity(auth.uid());

  return json_build_object('awarded', true, 'points', c_points, 'coins', c_coins);
end;
$$;

revoke execute on function reward_tutor_session(uuid) from public, anon;
grant execute on function reward_tutor_session(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Ranking semanal da turma (zera segunda 00:00, horário da escola).
-- Expõe só o nome curto e os pontos da semana dos colegas — nunca id, dracmas
-- ou histórico de estudo. `delta` compara com o ranking no fim de ontem; null
-- quando não há com o que comparar (segunda, ou aluno sem pontos na semana).
-- ----------------------------------------------------------------------------
create function get_class_leaderboard()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_class uuid := current_class_id(auth.uid());
  v_week_start timestamptz := app_week_start();
  v_today_start timestamptz := app_day_start(app_today());
  v_result json;
begin
  if v_class is null then
    return json_build_object('classroom', null, 'entries', '[]'::json, 'member_count', 0);
  end if;

  with members as (
    select e.student_id as id, short_display_name(p.full_name) as name
    from enrollments e
    join profiles p on p.id = e.student_id
    where e.class_id = v_class and e.status = 'active'
  ),
  totals as (
    select
      m.id,
      m.name,
      coalesce(sum(r.points), 0)::integer as points_now,
      coalesce(sum(r.points) filter (where r.created_at < v_today_start), 0)::integer as points_before_today
    from members m
    left join reward_events r on r.student_id = m.id and r.created_at >= v_week_start
    group by m.id, m.name
  ),
  ranked as (
    select
      t.*,
      rank() over (order by t.points_now desc) as position_now,
      rank() over (order by t.points_before_today desc) as position_before,
      row_number() over (order by t.points_now desc, t.name, t.id) as ordinal
    from totals t
  )
  select json_build_object(
    'classroom', (
      select json_build_object('name', sc.name, 'school', s.name)
      from school_classes sc join schools s on s.id = sc.school_id
      where sc.id = v_class
    ),
    'week_start', v_week_start,
    'member_count', count(*),
    'entries', coalesce(
      json_agg(
        json_build_object(
          'position', position_now,
          'name', name,
          'weekly_points', points_now,
          'delta', case
            when v_today_start <= v_week_start or points_before_today = 0 then null
            else position_before - position_now
          end,
          'is_me', id = auth.uid()
        ) order by ordinal
      ) filter (where ordinal <= 10 or id = auth.uid()),
      '[]'::json
    )
  )
  into v_result
  from ranked;

  return v_result;
end;
$$;

revoke execute on function get_class_leaderboard() from public, anon;
grant execute on function get_class_leaderboard() to authenticated;
