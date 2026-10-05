-- ============================================================================
-- Keep-alive: o plano gratuito do Supabase pausa o projeto depois de 7 dias
-- sem atividade. O workflow .github/workflows/supabase-keepalive.yml chama
-- esta função a cada 2 dias com a anon key.
--
-- Por que uma função e não um select numa tabela: com RLS, um select anônimo
-- volta vazio sem garantir que houve consulta de verdade, e liberar leitura
-- anônima de qualquer tabela só para isso seria abrir dado. Aqui o anon só
-- ganha o relógio do servidor — nada de dado de aluno.
-- ============================================================================
create function keepalive() returns timestamptz
language sql
stable
as $$
  select now()
$$;

revoke execute on function keepalive() from public;
grant execute on function keepalive() to anon, authenticated;
