-- ============================================================================
-- Cards de revisão ancorados em conceito.
--
-- Até aqui a Revisão era uma tela bonita ligada a um array hardcoded no
-- cliente (src/ui/student/revisao-data.ts): o aluno respondia tudo e NADA
-- virava evidência. Ou seja, a metade "repetição espaçada" do produto não
-- alimentava o learning graph — e o responsável/professor/gestor nunca via
-- nenhum efeito de uma sessão de revisão.
--
-- Com o card ancorado em `concept_id`, cada resposta vira um
-- `retrieval_review` (sinal limpo, confidence ~0.9) e entra no mesmo BKT que
-- o chat socrático. Diagnóstico e agenda de revisão continuam sendo a MESMA
-- inferência — não duas features com dois estados divergentes.
-- Ver docs/LEARNING_GRAPH.md.
--
-- Dado de referência, igual a `concepts`: sem PII, leitura liberada para
-- autenticado, escrita só por service-role (seed).
-- ============================================================================
create table concept_cards (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  front text not null,
  back text not null,
  -- ordem de apresentação dentro do conceito
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (concept_id, front)
);

create index concept_cards_concept_idx on concept_cards (concept_id, position);

alter table concept_cards enable row level security;

create policy concept_cards_read on concept_cards
  for select to authenticated using (true);
