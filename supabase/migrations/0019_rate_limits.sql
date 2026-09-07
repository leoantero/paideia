-- ============================================================================
-- Controle de taxa das rotas de IA.
--
-- Com a base fechada (0 cadastro público, credenciais fixas distribuídas),
-- o risco financeiro que resta não é "estranho cria conta" — é "uma das
-- credenciais conhecidas vaza ou alguém deixa um script rodando em loop
-- contra o tutor". Sem teto, isso é fatura da Anthropic sem limite.
--
-- Tabela pura de controle interno — não é dado de aluno, não é dado de
-- domínio. RLS ligada e SEM NENHUMA POLICY: só a service-role (que ignora
-- RLS) lê e escreve aqui. Mesmo padrão de "tabela sem policy = negada por
-- padrão" já usado no schema.
-- ============================================================================
create table ai_route_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index ai_route_calls_lookup_idx on ai_route_calls (user_id, route, created_at desc);

alter table ai_route_calls enable row level security;
