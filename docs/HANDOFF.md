# Paideia — checkpoint (2026‑09‑07)

> Amanhã: `npm run dev`, abrir o app, e dar **"continue"**. O plano completo
> com as 12 decisões confirmadas está em `docs/REDESIGN_PLAN.md`.

## Onde estamos

Redesign do protótipo do Figma (`figma/`) para o app real, na branch
`feat/paideia-mvp`. **Passos 1–3 feitos e commitados** (sistema visual,
entrada+login com perfil Gestor, app do aluno inteiro). **Faltam os passos
4–7**: app do responsável, app do professor (com Construtor), app do gestor,
e o back‑end (migrations + rotas de IA + gamificação + avaliações + seed).

Ver `docs/REDESIGN_PLAN.md` §"Estado atual" e §"Passos restantes".

## Como testar agora

```
npm run dev            # localhost:3000
```

Senha única de demo: **`***REDACTED-ROTATED-2026-10-04***`**

| Perfil | Entrar com |
|---|---|
| Aluno | matrícula `20250801` … `20250805` |
| Responsável | `responsavel.theo@exemplo.com` (2 filhos) · `responsavel.marina@exemplo.com` · `responsavel.igor@exemplo.com` |
| Professor | `professora.matematica@escola-demo.com` |
| Gestor | ainda não há conta semeada — entra no passo 7 (seed) |

O que já dá pra ver: landing nova, os 4 logins, e o **app do aluno inteiro**
(Tutor com histórico + chat, Revisão com card‑flip, barra de gamificação +
loja, Ajustes). Dados de gamificação e baralhos são placeholder até o passo 7.

## Decisões confirmadas ontem

As 12 estão em `docs/REDESIGN_PLAN.md` §"Decisões confirmadas". Resumo dos
pontos que mudam escopo:

- Construtor do professor **inclui** a avaliação que o aluno responde no app
  (→ 4ª aba **"Atividades"** no aluno; acerto vira evidência).
- Gestor **hierárquico** (unidade × rede), dashboard com **as 4 abas reais**.
- Heatmap do professor mostra **primeiro nome + inicial** do aluno.
- Revisão: **6 matérias**, só Matemática ancorada em conceito por ora —
  começar a montar o grafo BNCC das outras (piloto: Português).
- Loja de moedas: **tema e avatar funcionam de verdade**.
- Migrations: **o Claude aplica via script**, com sua confirmação a cada uma.

## Pendências técnicas herdadas

- `middleware.ts` → convenção `proxy` (deprecação do Next 16).
- Testes pgTAP não rodam sem Docker; RLS verificado por script.
- `next-env.d.ts` entra nos commits (regenerado pelo `next dev`).
