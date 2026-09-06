# Paideia — status da sessão de 2026-09-06

> Onde o MVP parou. Para ler com calma e testar. Próxima sessão continua daqui.

## Como testar agora

1. Ligar o servidor (na pasta do projeto):
   ```
   npm run dev
   ```
   Abrir `http://localhost:3000`.
2. Se o banco/seed precisar ser refeito: `npm run seed`.

**Senha única de todas as contas de demo:** `***REDACTED-ROTATED-2026-10-04***`

| Perfil | Como entrar | Observação |
|---|---|---|
| Aluno | matrícula `20250801` (Marina Rocha) … até `20250805` (Lívia) | login por matrícula |
| Responsável | `responsavel.theo@exemplo.com` | vê 2 filhos (Théo + Bruna) |
| Responsável | `responsavel.marina@exemplo.com` | vê 1 filho (Marina) |
| Responsável | `responsavel.igor@exemplo.com` | vê 1 filho (Igor) |
| Professora | `professora.matematica@escola-demo.com` | turma "8º ano B" |

> A aluna Lívia (`20250805`) foi deixada **sem responsável** de propósito, para
> testar o caso de borda no painel.

Verificado por script: o responsável enxerga só os filhos dele e **0 mensagens**
do chat; a professora enxerga a turma dela e **0 mensagens**. A barreira de
privacidade (RLS) está funcionando.

## O que foi feito nesta sessão

Branch: **`feat/paideia-mvp`** — 6 commits, ainda **não enviado ao GitHub**.

| # | Entrega |
|---|---|
| 1 | Migrations `0007`–`0010` aplicadas no Supabase hospedado: grafo de conceitos (DAG BNCC), `learning_events` (append-only) + `concept_mastery` (BKT), tenancy (rede→escola→turma→matrícula), drop da RPC de código de vínculo |
| 2 | `docs/MVP_SPEC.md` — especificação consolidada de tudo que decidimos na grelha |
| 3 | Seeds: `scripts/seed-curriculum.ts` (33 conceitos de matemática 8º ano, DAG validado) e `scripts/seed-demo.ts` (rede/escola/turma/5 alunos/3 responsáveis/1 professora) |
| 4 | Auth B2B: tela de entrada com o "print" de contraste (padaria/frações), linha grossa, "Paideia" + "?", e seletor **Sou aluno / Sou responsável / Sou professor**. Aluno entra por matrícula (vira e-mail sintético interno), responsável e professor por e-mail. Removidos: cadastro com toggle, onboarding de série do aluno, página de código de vínculo |
| 5 | Casca mobile: coluna centralizada + **barra de navegação inferior** por perfil. Aluno: Tutor · Revisão · Ajustes. Responsável: Painel · Conselheiro · Ajustes. Professor: Turma · Ajustes. "Sair" mora nos Ajustes |
| 6 | Identidade: fonte trocada para **Bricolage Grotesque**; app inteiro em pt-BR; tema claro único |

Design travado (não muda): Bricolage + Inter, paleta ink/gold/mist/parchment,
tema claro, landing de contraste, mobile-first, motivo "?" recorrente.

As telas **Revisão**, **Conselheiro** e **Turma** ainda são placeholder — mas
placeholder honesto (a de Turma já lista a turma real da professora). Nada é
botão morto.

## O que falta (passos 6–10 do `docs/MVP_SPEC.md`)

6. **Chat do aluno completo:** implementar o `concept-tagger` (modelo Haiku
   rodando em paralelo, fora do caminho crítico), gravar `learning_events`,
   ligar o BKT; e traduzir o prompt do tutor para pt-BR.
7. **Revisão espaçada** estilo Anki + baralhos-semente de 8º ano; cada resposta
   de revisão vira evidência que abastece o diagnóstico.
8. **Painel do responsável** migrando de `performance_records` para
   `concept_mastery`; **chat consultivo** do responsável (rota de API nova,
   prompt de "conselheiro", não socrático, lê o domínio do filho e aconselha).
9. **Dashboard de turma** do professor: mapa de calor conceito × aluno +
   diagnóstico de pré-requisito. Precisa de uma migration nova dando ao
   professor acesso de leitura à identidade dos alunos da turma dele (hoje ele
   vê `concept_mastery` e matrículas, mas não os nomes).
10. Acabamento: motivo "?", movimento, polish visual.

## Pendências técnicas menores

- `middleware.ts` → convenção `proxy` (deprecação do Next 16) — fazer junto do passo 6
- Testes pgTAP (`supabase/tests/`) não rodam sem Docker; RLS foi verificado por
  script à mão. Rever quando houver Docker ou CI.
- Fluxo real de primeiro acesso do aluno (criar senha) e de ativação do
  responsável por link de e-mail: só o atalho de demo (contas pré-criadas)
  existe hoje.
