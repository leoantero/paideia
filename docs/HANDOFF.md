# Paideia — checkpoint (2026‑11‑01)

## Questões, Simulações e grafo de Matemática completo (2026‑10‑31 → 11‑01)

**Nada commitado ainda.** Plano aprovado em
`~/.claude/plans/sprightly-bubbling-church.md`; `tsc`, `lint` e 120 testes
limpos.

- **Questões** (`/student/questoes`): questões públicas (ENEM/SAEB/OBMEP) por
  área e conteúdo, direcionadas pela série da turma (série e as 3 anteriores;
  EM vê tudo até a 3ª). Tela minimalista, seleção + "Confirmar". **No erro a
  coruja abre sozinha** perguntando o porquê da escolha; gabarito só em "Ver
  resposta". Correção, pontos e evidência (`assessment_item`) no servidor.
  Migration `0026_questions_and_simulations.sql`: `public_questions` **sem
  policy de select** (só RPC), `question_attempts`, `simulation_completions`,
  `question_origin_settings` (origem só é servida depois de ligada — reservado
  para depois da checagem de licença). 13 testes PGlite em
  `src/tests/db/questions.test.ts`.
- **Simulações** (`/student/simulacoes`): 5 interativas (pizza, elevador e
  termômetro, balança, receita, cercado), desafios auto-marcados, recompensa
  única, "Pergunte à coruja" leva o contexto ao Tutor.
- **Grafo de Matemática do 5º ano ao EM**: `scripts/data/math-ef1.json`,
  `math-ef2.json`, `math-em.json` — 140 conceitos, 250 arestas, cobrindo as
  189 habilidades de Matemática (EF05–EF09 + EM13MAT). Texto oficial em
  `scripts/data/bncc-matematica.json` (dataset bncc.dev, CC BY 4.0, conferido
  contra o PDF do MEC). Migration `0027_concept_bncc_codes.sql` adiciona
  `concepts.bncc_codes` e **renomeia 6 códigos** que apontavam para a
  habilidade errada (EF08MA07→EF07MA-EQ1, EF08MA15→EF07MA-PARAL,
  EF08MA02→EF09MA-PORCSUC, EF08MA-PN/FAT→EF09MA-PN/FAT, EF07MA-ANG→EF06MA-ANG);
  o `id` não muda. `src/tests/curriculum-graph.test.ts` valida DAG, séries e
  cobertura BNCC nos dois sentidos. **Revisar as arestas** (pré-requisitos e
  forças foram rascunhados por IA) antes do seed em produção.
- Correção de bug antigo: evidência da Revisão se perdia quando o card tinha
  id em texto (`review-evidence.ts`).

**Próximos passos, nesta ordem:**

1. Aplicar `0026` e `0027` no banco hospedado (com confirmação) e rodar
   `npm run seed:curriculum` + `npm run audit:security` (adicionar
   `public_questions`/`question_attempts` ao `scripts/audit-security.ts`).
2. Importador do ENEM (`scripts/questions/`): confirmar endpoint e licença do
   dataset, copiar imagens para o bucket `question-media`, etiquetar com Sonnet
   (`bncc_codes` + série + dificuldade + alt), inserir como `pending_review`,
   CLI de revisão. Depois SAEB e OBMEP.
3. Grafos de Natureza, Linguagens e Humanas no mesmo formato (um
   `bncc-<area>.json` de referência + arquivos por segmento).
4. Teste de ponta a ponta com aluno real via `/dev` (learning_events gravado,
   conversa no histórico do Tutor, heatmap do professor).
5. Achado fora de escopo: `cards_select_approved` (0021) deixa o aluno ler
   `correct_choice` com select direto — mesmo modelo "só via RPC".

## Redesign Glaukópis pastel aplicado (2026‑10‑29)

Os tokens, fontes e todas as telas dos 4 perfis foram migrados para a paleta
`design/redesign-glaukopis/HANDOFF.md` (ordem sugerida 1–4 completa: tokens,
fontes, casca do aluno, telas do aluno/entrada/login/adultos). Validado tela a
tela no dev server (`/dev` → entrar como qualquer perfil), nos 4 perfis,
incluindo estados (card de revisão virado, loja, dashboard do gestor nas 4
abas, erro do tutor). `tsc`, `lint` e `build` limpos.

**Próxima sessão:** varrer o app em busca de pontos onde o visual novo e o
antigo ficaram "meio a meio" — classes/cores antigas (`ink`, `muted`, `gold`,
`mist`, `strong`, `weak`, variáveis `--terracotta`/`--aegean` do tema grego)
que `app/globals.css` mantém mapeadas por compatibilidade mas que não
deveriam mais aparecer soltas em componentes não tocados por este redesign,
e qualquer tela/componente fora da lista do `design/redesign-glaukopis/
HANDOFF.md` que ainda não foi revisado. Objetivo: unificar tudo num design
system só, sem resquício do antigo.

- ~~Telas novas sem rota ainda (`TelaQuestoes`, `TelaSimulacoes`)~~ — feitas
  em 2026‑10‑31 (ver topo).
- `src/ui/paideia/line-icons.tsx` (novo set de ícones) e `nextsteps/` (plano
  de negócio/técnico, não versionado ainda) seguem fora deste commit —
  decidir o que fazer com eles.

## Integração do redesign do `main` (2026‑10‑04)

O trabalho que estava só na `main` (commit `beb1c7a`: repetição espaçada
SM-2, gamificação, UI grega do aluno) foi **portado** para esta branch. Não foi
um merge direto, porque os dois lados criaram tabelas `schools` incompatíveis
e cada um tinha o seu sistema de revisão. A pasta `paideia-main` deixou de
existir: tudo vive aqui.

- **Banco:** `0020_gamification.sql` (dracmas, pontos, ofensiva com
  congelamento, ranking semanal) e `0021_spaced_repetition.sql` (baralhos,
  SM-2 por card, cards de múltipla escolha, resposta curta, abertos avaliados
  pelo tutor e **flashcards autoavaliados**). O ranking usa a **matrícula
  ativa** (`enrollments`), não código de turma.
- **`concept_cards` (0014) foi migrada** para `decks`/`cards` como
  flashcards, mantendo id e conceito, e a tabela foi removida. Toda revisão de
  card ancorado em conceito continua virando `retrieval_review` no learning
  graph (`study-service.ts` → `evidence-recorder.ts`, dentro de `after()`).
  Só a primeira revisão do card no dia vira evidência.
- **App do aluno:** Início (`/student`), Revisar (`/student/revisao`), Tutor
  (com histórico), Pódio · Loja (`/student/podio`) e Ajustes (engrenagem no
  topo). `/student/loja` redireciona. O tema grego (`.theme-greek` em
  `globals.css`) vale só para o aluno; os outros perfis seguem com a paleta
  do Figma.
- **Seeds:** `npm run seed` agora também roda `seed:decks` (4 baralhos de
  `content/decks/`, **pending_review** até um professor aprovar) e
  `seed:gamification` (pontos da semana para os alunos da demo).
- **Testes:** `npm test` sobe todas as migrations num Postgres em memória
  (PGlite, `src/tests/db/`), sem Docker, incluindo a migração de
  `concept_cards`.
- **`/preview`** (só em dev): telas do aluno com dados falsos, sem Supabase.

**Antes de usar no banco hospedado:** aplicar `0020` e `0021` (com
confirmação, como as outras), depois `npm run seed:decks` e
`npm run seed:gamification`.

---

## Checkpoint anterior (2026‑09‑07, noite)

> Amanhã: `npm run dev`, abrir o app, dar **"continue"**. A gente revisa o
> estado real e decide os próximos passos. Plano + 12 decisões:
> `docs/REDESIGN_PLAN.md`.

## Onde estamos

Redesign do protótipo do Figma (`figma/`) para o app real, na branch
`feat/paideia-mvp` (não mergeada na `main`). Último commit: `b53cce0`.

**Os passos 1–7 do `REDESIGN_PLAN.md` estão essencialmente feitos** — o doc
§"Passos restantes" está desatualizado. O que já landou na branch:

- **Sistema visual + entrada/login** (passos 1–2): tokens, `kit.tsx`, AppShell,
  BottomNav, landing, 4 logins, papel Gestor = `director`.
- **App do aluno** (passo 3): Tutor (histórico + chat), Revisão (card‑flip),
  barra de gamificação + loja, Ajustes.
- **App do responsável** (passo 4, commit `f9cb56b`): Painel sobre o learning
  graph, Conselheiro (`/api/parent/advisor`), Ajustes.
- **App do professor** (passo 5): Turma + heatmap (nome+inicial), Construtor
  (`/api/teacher/builder`, `/api/teacher/questions`), Ajustes.
- **App do gestor** (passo 6): `/gestor/{dashboard,insights,ajustes}`,
  `/api/gestor/insights`.
- **Back‑end** (passo 7): migrations `0011`–`0019` (parent read, teacher
  identity, harden privileges, concept cards, gestor scope, role sync,
  question bank, rate limits), `/api/student/review`, seed de gestor
  (`gestor@escola-demo.com`), rate limit nas rotas de IA.
- **Extras desta rodada:** rename Yellow AI → Paideia, painel `/dev` (entra em
  qualquer perfil), 2 turmas + 3 professores pra demo, fixes de segurança
  (escalação de papel, loop aluno→família→escola), `docs/DEPLOY.md`.
- **`design/canvas/`** versionado (`b53cce0`): re-seed source do Claude Design
  canvas (`.dc.html` + `canvas.json`). Bundle seedado fica gitignored.

## O que ainda falta / verificar amanhã

- **4ª aba "Atividades" do aluno** (decisão #1): o Construtor do professor
  monta avaliação, mas ainda **não há tela do aluno respondendo** nem
  `assessment_submissions` gravando `learning_events` `source='assessment_item'`.
  (Migration `0018_question_bank.sql` existe — conferir se cobre submissões.)
- **Currículo BNCC das outras 5 matérias** (piloto: Português) — Revisão só
  tem Matemática ancorada em conceito.
- **Screenshot pass dos 4 apps** + `npm run audit:security` + `/code-review ultra`
  antes de merge na `main`.
- Atualizar `docs/REDESIGN_PLAN.md` §"Estado atual"/"Passos restantes".

## Como testar

```
npm run dev            # localhost:3000
```

Senha única de demo: a de `PAIDEIA_DEMO_PASSWORD` no `.env.local` (trocada em 2026‑10‑04; para trocar de novo, `npm run demo:rotate-password`). Também há o painel `/dev`, só local.

| Perfil      | Entrar com                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aluno       | matrícula `20250801`…`20250805` (8º B) · `20250811`…`20250813` (8º A)                                                                                |
| Responsável | `responsavel.theo@exemplo.com` (2 filhos) · `responsavel.marina@exemplo.com` · `responsavel.igor@exemplo.com` · `responsavel.rafael@exemplo.com` (2) |
| Professor   | `professora.matematica@escola-demo.com` · `professor.portugues@escola-demo.com` · `professora.ciencias@escola-demo.com`                              |
| Gestor      | `gestor@escola-demo.com`                                                                                                                             |

## Pendências técnicas herdadas

- `middleware.ts` → convenção `proxy` (deprecação do Next 16).
- Testes pgTAP não rodam sem Docker; RLS verificado por `npm run audit:security`.
- `next-env.d.ts` entra nos commits (regenerado pelo `next dev`).

## Decisões confirmadas (resumo — 12 completas em `REDESIGN_PLAN.md`)

- Construtor do professor **inclui** a avaliação que o aluno responde no app
  (→ 4ª aba **"Atividades"**; acerto vira evidência).
- Gestor **hierárquico** (unidade × rede), dashboard com **as 4 abas reais**.
- Heatmap do professor mostra **primeiro nome + inicial** do aluno.
- Revisão: **6 matérias**, só Matemática ancorada por ora (piloto: Português).
- Loja de moedas: **tema e avatar funcionam de verdade**.
- Migrations: **o Claude aplica via script**, com confirmação a cada uma.
