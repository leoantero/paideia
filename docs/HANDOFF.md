# Paideia — checkpoint (2026‑09‑07, noite)

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

Senha única de demo: **`***REDACTED-ROTATED-2026-10-04***`** (também há o painel `/dev`).

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
