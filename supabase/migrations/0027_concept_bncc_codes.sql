-- ============================================================================
-- O grafo de conceitos passa a cobrir Matemática do 5º ano ao EM
-- (scripts/data/math-ef1.json, math-ef2.json, math-em.json).
--
-- [1] `concepts.code` continua sendo o identificador interno e estável do
--     conceito. A âncora oficial sai dele e vai para `bncc_codes`: um conceito
--     de tópico cobre uma ou mais habilidades (ex.: "Triângulos" cobre
--     EF07MA24, EF07MA25 e EF07MA26), e um código BNCC solto no `code` dava
--     falsa precisão — o 8º ano original tinha quatro conceitos com código de
--     habilidade que não era a deles.
--
-- [2] Renomeia esses códigos em vez de criar conceitos novos: o `id` não muda,
--     então learning_events, concept_mastery e cards continuam apontando para
--     o mesmo conceito. O seed faz upsert por (curriculum_version_id, code) e
--     passa a encontrar a linha renomeada.
--       EF08MA07  -> EF07MA-EQ1      equação do 1º grau é EF07MA18 (7º ano);
--                                    EF08MA07 é "equação linear ↔ reta"
--       EF08MA15  -> EF07MA-PARAL    paralelas e transversal é EF07MA23;
--                                    EF08MA15 é construção com régua e compasso
--       EF08MA02  -> EF09MA-PORCSUC  percentuais sucessivos é EF09MA05;
--                                    EF08MA02 é potenciação e radiciação
--       EF08MA-PN -> EF09MA-PN       produtos notáveis e fatoração são EF09MA09
--       EF08MA-FAT-> EF09MA-FAT
--       EF07MA-ANG-> EF06MA-ANG      ângulos são EF06MA25–27 (6º ano)
-- ============================================================================

alter table concepts
  add column bncc_codes text[] not null default '{}';

comment on column concepts.code is
  'Identificador interno estável do conceito. Pode coincidir com um código BNCC quando o conceito é exatamente aquela habilidade; a âncora oficial é bncc_codes.';
comment on column concepts.bncc_codes is
  'Habilidades da BNCC cobertas pelo conceito (ex.: {EF07MA24,EF07MA25}). Fonte: scripts/data/bncc-*.json.';

create index concepts_bncc_codes_idx on concepts using gin (bncc_codes);

update concepts set code = v.new_code
from (values
  ('EF08MA07',   'EF07MA-EQ1'),
  ('EF08MA15',   'EF07MA-PARAL'),
  ('EF08MA02',   'EF09MA-PORCSUC'),
  ('EF08MA-PN',  'EF09MA-PN'),
  ('EF08MA-FAT', 'EF09MA-FAT'),
  ('EF07MA-ANG', 'EF06MA-ANG')
) as v(old_code, new_code)
where concepts.code = v.old_code
  and concepts.subject = 'math';
