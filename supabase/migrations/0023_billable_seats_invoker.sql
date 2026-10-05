-- ============================================================================
-- billable_seats (0009) era uma view comum, e view no Postgres roda com as
-- permissões de quem a criou (postgres), ignorando a RLS das tabelas por
-- baixo. Somado ao grant padrão do Supabase para anon/authenticated, qualquer
-- pessoa com a anon key — que é pública, vai no bundle do site — lia a fatura
-- de toda rede: nome da mantenedora, assentos e preço contratado. Confirmado
-- contra o banco hospedado antes desta migration (linter do Supabase:
-- "Security Definer View").
--
-- security_invoker faz a view respeitar a RLS de quem consulta: a direção vê a
-- própria rede (organizations_select_scoped, 0009), mais ninguém. Anônimo
-- perde o acesso de vez. A service-role (scripts) segue lendo tudo.
-- ============================================================================
alter view billable_seats set (security_invoker = true);

revoke all on billable_seats from anon;
revoke all on billable_seats from authenticated;
grant select on billable_seats to authenticated;
