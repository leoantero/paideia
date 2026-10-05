-- ============================================================================
-- Fecha os avisos de segurança do linter do Supabase (`supabase db advisors`)
-- antes da demo pública.
--
-- [1] Funções security definer executáveis pela anon key.
--     O Supabase concede EXECUTE a `anon` em toda função nova do schema
--     public. Nenhuma das nossas funções privilegiadas foi feita para quem não
--     está logado: as de agregado (school_overview…) e os helpers de escopo
--     (accessible_class_ids…) só fazem sentido com auth.uid(). Tiramos o anon
--     de todas — exceto keepalive() (0022), que não é security definer.
--
-- [2] Funções de trigger também não precisam ser chamáveis por ninguém:
--     handle_new_user / sync_role_from_app_metadata rodam pelo trigger em
--     auth.users, com o dono da função. Chamá-las direto não tem uso legítimo.
--
-- [3] search_path fixo em toda função do schema public que não tinha. Sem
--     isso, quem consegue criar objeto num schema anterior do search_path
--     pode "sombrear" uma tabela ou função usada lá dentro.
--
-- Genérico de propósito (varre pg_proc) para cobrir também funções criadas
-- pelo painel, como rls_auto_enable, que não estão nas nossas migrations.
-- ============================================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.prosecdef, p.prorettype, p.proconfig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      -- funções de extensão não são nossas
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
      )
  loop
    -- [1]
    if f.prosecdef then
      execute format('revoke execute on function %s from public, anon', f.sig);
    end if;

    -- [2]
    if f.prorettype in ('trigger'::regtype, 'event_trigger'::regtype) then
      execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    end if;

    -- [3]
    if f.proconfig is null
       or not exists (select 1 from unnest(f.proconfig) c where c like 'search_path=%') then
      execute format('alter function %s set search_path = public', f.sig);
    end if;
  end loop;
end;
$$;

-- E daqui pra frente: função nova não nasce executável pela anon key. As
-- nossas migrations já fazem grant explícito para quem precisa.
alter default privileges in schema public revoke execute on functions from public, anon;
