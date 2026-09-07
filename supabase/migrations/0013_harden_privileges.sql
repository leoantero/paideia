-- ============================================================================
-- ENDURECIMENTO DE PRIVILÉGIOS
--
-- Três furos reais, verificados contra o banco hospedado antes desta migration:
--
--  1. ESCALAÇÃO DE PAPEL NO CADASTRO. handle_new_user() lia o papel de
--     `raw_user_meta_data`, que é exatamente o que o cliente manda em
--     supabase.auth.signUp({ options: { data } }). Com signup público
--     habilitado, qualquer pessoa na internet criava uma conta com
--     role='director'. (Confirmado: um signup anônimo gerou um profile
--     director; a conta de teste foi removida.)
--
--  2. ESCALAÇÃO DE PAPEL DEPOIS DO LOGIN. `profiles_update_own` permite
--     update na própria linha, e o papel `authenticated` tinha UPDATE na
--     tabela inteira — inclusive na coluna `role`. Qualquer aluno logado
--     virava gestor com um update no console do navegador.
--
--  3. FALSIFICAÇÃO DA EVIDÊNCIA. record_learning_events() e
--     upsert_concept_mastery() eram executáveis por `authenticated`. O aluno
--     podia inventar `insight` com confidence alta, ou escrever mastery=0.99
--     direto — quebrando a única coisa que a rede compra: o número ser
--     derivado de evidência real.
--
-- Isolamento entre alunos/famílias/turmas foi auditado no mesmo teste e está
-- correto (nenhum vazamento cross-tenant em learning_events, concept_mastery,
-- messages). Ver docs/SECURITY_REVIEW.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- [1] O papel passa a vir de raw_app_meta_data, que SÓ a service-role escreve
-- (admin.auth.admin.createUser({ app_metadata })). `raw_user_meta_data` segue
-- sendo do usuário — e por isso nunca mais decide autorização.
--
-- Consequência desejada: um signup público só consegue criar 'student'. E um
-- aluno sem enrollment não enxerga nada (as policies de 0009 dependem de
-- matrícula/vínculo, não do papel isolado).
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- fonte confiável: só a service-role consegue gravar app_metadata
  v_role user_role := coalesce(
    (new.raw_app_meta_data ->> 'role')::user_role,
    'student'::user_role
  );
begin
  insert into profiles (id, role, full_name)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name');

  if v_role = 'student' then
    insert into students (id, linking_code)
    values (new.id, upper(substr(md5(random()::text || new.id::text), 1, 6)));
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- [2] Privilégio de coluna. RLS diz QUAIS LINHAS; grant de coluna diz QUAIS
-- CAMPOS. `role` deixa de ser gravável pelo cliente em qualquer circunstância.
-- ----------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Mesma ideia em students: o aluno ajusta série/escola no onboarding, e nada
-- mais. `linking_code` (dormente desde 0010) deixa de ser gravável.
revoke update on public.students from authenticated;
grant update (grade_level, school_name) on public.students to authenticated;

-- ----------------------------------------------------------------------------
-- [3] A escrita do learning graph sai do alcance do cliente.
--
-- Não existe mais RPC de escrita: quem grava evidência é o servidor Next
-- (src/lib/supabase/admin.ts), com service-role, dentro do after() da rota de
-- tutoria/revisão, sempre com o student_id da sessão autenticada.
--
-- Isso remove duas funções security-definer da superfície de ataque em vez de
-- tentar blindá-las. A imutabilidade de learning_events continua garantida
-- pelo trigger de 0008 (vale inclusive para a service-role).
-- ----------------------------------------------------------------------------
drop function if exists record_learning_events(jsonb);
drop function if exists upsert_concept_mastery(uuid, real, real, timestamptz, real, text);

-- ----------------------------------------------------------------------------
-- [4] Remoção do caminho legado de performance.
--
-- performance_records era o stub heurístico da fase 1 (contador de sessão com
-- "trend" fabricado). Foi substituído por concept_mastery (BKT sobre evidência)
-- e não tinha mais nenhum leitor no app — só continuava sendo escrito em
-- paralelo pela rota de tutoria, produzindo um segundo "desempenho" que nunca
-- batia com o primeiro. Duas fontes de verdade divergentes é pior que uma.
-- ----------------------------------------------------------------------------
drop function if exists record_tutoring_session(text);
drop table if exists performance_records;
