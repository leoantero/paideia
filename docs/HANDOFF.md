# Retomada — repetição espaçada + gamificação (2026-09-29)

Guia para continuar o trabalho em outra máquina. Se você é o Claude Code lendo isto: siga "Como subir" abaixo, na ordem, e só pergunte ao usuário o que depender dele (Docker, chaves).

## O que já está pronto

- **Repetição espaçada (estilo Anki):** SM-2 no Postgres (`supabase/migrations/0009_spaced_repetition.sql`), fila do dia, limite de cards novos por série, cards de múltipla escolha / resposta curta (corrigidos no servidor) e abertos (avaliados pelo tutor socrático em `app/api/study/open`).
- **Gamificação:** pontos, dracmas, ofensiva com congelamento (50 dracmas, até 2), ranking semanal da turma com setas de posição desde ontem (`0008_gamification.sql`). Recompensas só via funções `security definer`.
- **Escolas/turmas:** `0007_schools_classrooms.sql`; aluno entra por código (`join_classroom`).
- **UI do aluno** (tema geométrico grego, claro/escuro): Início, Revisar, Tutor, Pódio · Loja (`src/ui/student/`, `src/ui/paideia/`).
- **Conteúdo:** 4 baralhos do 8º ano em `content/decks/*.json` → `supabase/seed.sql` via `npm run seed:build`. Seed inclui turma fictícia "8º ano A" (código **8A-DEMO**) com 23 colegas simulados.
- **Tutor** usa `claude-haiku-4-5` (`src/core/ai-integration/anthropic-client.ts`).
- **Testes:** `npm test` → 44 testes, incluindo migrations/RLS/funções SQL rodando num Postgres em memória (PGlite, `src/tests/db/`). Não precisa de Docker.

## Como subir

### 1. Ver as telas rapidamente (sem Supabase, sem chaves)

```bash
npm install
```

Crie `.env.local` com valores fictícios (o middleware só precisa que existam):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
```

```bash
npm run dev
```

Abra **http://localhost:3000/preview** — mesmas telas do aluno com dados de exemplo e APIs falsas (só em desenvolvimento; em produção `/preview` é 404). Rotas: `/preview`, `/preview/study`, `/preview/tutor`, `/preview/arena`, `/preview/arena?tab=loja`.

### 2. App completo (precisa de Docker)

1. Docker Desktop rodando.
2. `npx supabase start` → anote `API URL`, `anon key`.
3. `.env.local` com esses valores + `ANTHROPIC_API_KEY=...` (não commitar).
4. Liberar os baralhos para testar: em cada `content/decks/*.json` troque `"reviewStatus": "pending_review"` por `"approved"` **(só depois de um professor revisar o conteúdo — ver pendências)**, então `npm run seed:build`.
5. `npx supabase db reset` (aplica migrations + seed).
6. `npm run dev` → cadastre um aluno em `/signup` → na tela de boas-vindas use o código **8A-DEMO** → aparece no pódio com os colegas simulados.

Os dados simulados de pontos são relativos ao momento do `db reset`; rode de novo para "atualizar" a semana.

## Pendências / próximos passos

- [ ] **Revisão humana dos 51 cards** em `content/decks/` (redigidos com auxílio de IA, alinhados à BNCC). Não foram encontrados baralhos escolares em PT-BR com licença aberta; baralhos do AnkiWeb pertencem aos autores.
- [ ] Testar o tutor e a avaliação de cards abertos com a API real (só foram testados com respostas simuladas).
- [ ] Rodar os testes pgTAP antigos (`supabase/tests/`) contra o Supabase local.
- [ ] Erros de lint pré-existentes (apóstrofos) em `app/(auth)/*` e `app/parent/*`; telas dos pais ainda em inglês.
- [ ] Next.js avisa que `middleware.ts` virou `proxy` (codemod: `npx @next/codemod@canary middleware-to-proxy .`).
- [ ] Ideias: alimentar o tutor com os pontos fracos da repetição espaçada; loja com itens reais; papéis de professor/diretor (criar turmas e aprovar baralhos).
