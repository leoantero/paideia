# Paideia — Especificação do MVP

> Consolidação das decisões tomadas na sessão de design/produto de 2026-09-06.
> Fonte de verdade para o escopo do MVP. Complementa `docs/LEARNING_GRAPH.md`
> (o ativo defensável) e `docs/PEDAGOGY.md` (o método).

## 1. Posicionamento

- **Nome:** Paideia (educação como formação integral; combina com tutoria socrática).
- **Modelo:** B2B. A **mantenedora** (rede de escolas) assina o contrato e paga
  por **aluno matriculado** (`enrollment` ativo = assento faturável). Plano
  família é upsell futuro — não se cobra do pai no MVP.
- **Idioma:** português (pt-BR) em tudo — interface, prompts, conteúdo, seed.
- **Plataforma:** mobile-first. Layout único responsivo; no desktop, coluna
  centralizada (~420px) com a mesma navegação. Uso em laboratório/Chromebook
  fica implícito na mesma web responsiva — só vira prioridade se investidor pedir.

## 2. Identidade visual (travado)

| Item | Decisão |
|---|---|
| Display / wordmark | **Bricolage Grotesque** |
| Corpo | **Inter** |
| Tema | **Um tema claro só.** Sem dark mode (causava bug de contraste no `<select>`). |
| Paleta | ink `#1e3a8a` · gold `#e4bb02` · mist `#c8e0e3` · parchment `#fffac8` · fundo `#f4f9fa` |
| Regra do gold | Nunca texto pequeno sobre branco (contraste falha). Só fundo/borda; texto sobre gold é ink. |
| Gesto distintivo | O **"?" recorrente** (levemente desenhado) em estados vazios e divisórias. Kit "traço à mão" completo fica para depois. |
| Movimento | Com personalidade no app do aluno; sóbrio no do pai e no do professor. |
| Componentes | `src/ui/kit.tsx` (Button, Field, Input, Select, Card, Callout, BackLink). Toda tela nova usa o kit. |

## 3. Perfis e acesso

Perfis no MVP: **aluno**, **responsável**, **professor**. `coordinator` e
`director` existem no enum (migration `0009`) mas sem UI ainda.

### Tela inicial (não logado)
1. "Print" estático do chat de contraste (ver §6)
2. Linha grossa de separação
3. **"Paideia"** + o "?" como marca
4. Botões: **Sou aluno · Sou responsável · Sou professor**

### Aluno
- Login por **matrícula + senha**. Primeiro acesso: informa a matrícula →
  cria a senha → cai direto no chat.
- **Sem onboarding, sem escolher série** — a escola já definiu na matrícula.
- Matrícula é o identificador que a escola já usa (chave primária da ficha).
  Internamente vira um e-mail sintético (`<matricula>@aluno.paideia.app`) que
  o aluno nunca vê.

### Responsável
- **Não se cadastra do zero.** A matrícula do aluno traz o e-mail do
  responsável. O sistema envia um link de ativação para esse e-mail; só quem
  abre a caixa de entrada ativa a conta e define a senha. Isso impede um filho
  de se passar pelo responsável.
- Ao ativar, os filhos cujas matrículas listam aquele e-mail aparecem
  **vinculados automaticamente**. Sem código de vínculo.
- **Na demo:** contas de responsável são semeadas já ativadas, com senha
  conhecida.

### Professor
- Login **e-mail + senha** (semeado na demo).
- Escopo (quais turmas enxerga) vem de `staff_assignments` + `accessible_class_ids()`.

### Removido do scaffold anterior
- Cadastro único com toggle aluno/pai
- Onboarding do aluno / seletor de série em cards
- Página de código de vínculo + RPC `link_student_by_code`

## 4. App do aluno — nav inferior: **Chat · Revisão · Ajustes**

### Chat
- Tutor socrático (pt-BR). Lógica atual em `src/features/tutoring/`.
- **A cada turno**, fora do caminho crítico da resposta (`after()` do Next 16):
  dispara o **concept-tagger** (Haiku, barato) → grava `learning_events`
  (`source = 'tutor_turn'`, `confidence` no teto de 0.6 — chat é ruidoso).
- Falha da instrumentação **nunca** derruba o chat.

### Revisão (repetição espaçada, estilo Anki)
- **É uma feature distinta do diagnóstico.** Tem agendamento próprio por card
  (intervalo estilo SM-2). Não é derivada do `concept_mastery`.
- É uma **fonte de evidência**: cada resposta de review grava um
  `learning_event` (`source = 'retrieval_review'`, `confidence ~0.9` — sinal
  limpo) que abastece o diagnóstico.
- Conteúdo: ~3 baralhos-semente de **matemática, 8º ano** (redigidos a partir
  de material aberto / domínio público, marcados como conteúdo-semente mock) +
  **criação manual** de card (formulário frente/verso).
- Ingestão real de livros da escola = trabalho futuro (a escola abastece).

### Ajustes
- Nome, **sair**.

## 5. App do responsável — nav inferior: **Painel · Chat · Ajustes**

### Painel
- Domínio por conceito/matéria + tendência, derivado de `concept_mastery`.
- **Nunca** mostra `mastery` sem `confidence`. Abaixo de `confidence < 0.3`:
  "sem dados suficientes", não um número.
- **Nunca** vê `learning_events` crus nem `messages`. Barreira idêntica à de
  `conversations` no schema atual.
- Migração: hoje o painel lê `performance_records`; passa a ler
  `concept_mastery`. `performance_records` vira legado.

### Chat (consultivo — NÃO socrático)
- Assistente que **lê o `concept_mastery` + `diagnose_weak_prerequisites()`**
  do(s) filho(s) e dá conselho concreto e acionável para o responsável
  ("as frações da Marina estão frágeis e isso trava função afim; em casa,
  tente...").
- **Rota de API nova**, system prompt de "conselheiro", distinto do tutor.
- **Não** vê as conversas do filho.

### Ajustes
- Nome, **sair**.

## 6. App do professor — nav inferior: **Turma · Aluno · Ajustes**

### Turma (é o que vende o contrato)
- Heatmap **turma × conceito** (eixo Y aluno, eixo X conceito, cor = mastery).
- Lista "conceitos que a turma não fixou", ordenada por `avg(1 - mastery)`.
- Por aluno, o top-3 de `diagnose_weak_prerequisites()`.
- **Regra de exibição:** nunca `mastery` sem `confidence`; abaixo de 0.3,
  "sem dados suficientes".

### Aluno (detalhe)
- Domínio por conceito de um aluno da turma + diagnóstico de pré-requisito.
- **Não** vê `learning_events` nem `messages` — domínio agregado e diagnóstico só.

### Ajustes
- Nome, **sair**.

## 7. Learning Graph — o que entra no MVP

Decisão: **captura de dados + tenancy agora** (`0007`–`0009`); dashboard de
turma logo em seguida.

1. Aplicar migrations `0007` (currículo/DAG), `0008` (evidência + domínio),
   `0009` (tenancy). Cuidado com `alter type ... add value` da `0009` — separar
   em migration própria se o `db push` reclamar.
2. `scripts/seed-curriculum.ts` — matemática 8º ano, 30+ conceitos + pré-
   requisitos, **valida DAG** (detecção de ciclo) antes de inserir, idempotente.
3. `scripts/seed-demo.ts` — 1 mantenedora → 1 escola → 1 turma (8º ano) →
   ~5 alunos + contas demo de aluno/responsável/professor (credenciais conhecidas).
4. Implementar `tagTurn()` (concept-tagger): filtra UUID alucinado contra os
   candidatos, `confidence` teto 0.6 para `tutor_turn`, fora do caminho crítico.
5. Ligar `recordEvidence()` → `recomputeMastery()` (BKT já pronto em `bkt.ts`).
6. `record_tutoring_session()` continua chamada por ora (painel do pai ainda
   depende de `performance_records`); removida quando o painel migrar.

## 8. Ordem de construção

1. ~~Commit do design pass + scaffold do learning graph~~ ✅
2. ~~Este documento~~ ✅
3. Migrations `0007`–`0009` + seeds (currículo + demo)
4. Rework de entrada: matrícula (aluno), e-mail (pai/professor), role picker;
   remover cadastro-toggle, onboarding de série, código de vínculo
5. Redesenhar telas no design system + pt-BR + bottom nav (3 perfis)
6. Chat do aluno + concept-tagger + evidência + BKT
7. Revisão espaçada (Anki) + baralhos-semente
8. Painel do pai (migrar para `concept_mastery`) + chat consultivo do pai
9. Dashboard de turma do professor
10. Motivo "?", movimento, polish

## 9. Fora de escopo do MVP

- App nativo / PWA (web responsiva resolve)
- RAG com vector DB (o grafo de conceitos ancora o suficiente)
- DKT / modelo neural de domínio (sem dado para treinar; BKT calibrado ganha)
- Gamificação / moedas (não move a decisão de compra da mantenedora)
- Cobrança do responsável (modelo é assento pago pela rede)
- UI de coordenação/direção
- Ingestão automática de livros didáticos
