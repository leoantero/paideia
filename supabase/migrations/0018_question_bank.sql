-- ============================================================================
-- Banco de questões do professor (Construtor).
--
-- Escopo desta migration: GERAR e GUARDAR questões ancoradas em conceito. A
-- montagem de avaliação, a atribuição à turma e a submissão do aluno (que
-- viram evidência `assessment_item`, o sinal mais limpo do learning graph)
-- são o passo seguinte — e a UI diz isso ao professor em vez de fingir que
-- já atribui.
--
-- Ancorar em `concept_id` desde já não é detalhe: é o que fará a questão
-- respondida virar evidência no mesmo grafo que o tutor e a revisão
-- alimentam, em vez de virar mais um dado solto.
-- ============================================================================
create type question_type as enum ('multiple_choice', 'open_ended', 'true_false');

create table questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid references concepts(id) on delete set null,
  type question_type not null,
  difficulty real not null default 0.5 check (difficulty >= 0 and difficulty <= 1),
  stem text not null,
  -- alternativas de múltipla escolha; null nas demais
  options jsonb,
  answer_key text not null,
  -- por que a resposta é essa — o professor revisa antes de usar em prova
  rationale text,
  created_at timestamptz not null default now()
);

create index questions_author_idx on questions (author_id, created_at desc);
create index questions_concept_idx on questions (concept_id);

alter table questions enable row level security;

-- O professor é dono do que ele gerou. Sem acesso cruzado entre professores
-- nesta fase: o banco compartilhado da rede é decisão de produto, não default.
create policy questions_owner_all on questions
  for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
