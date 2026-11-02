# Plano de implementação — Learning Graph

Backlog executável para o Claude Code. Ler `docs/LEARNING_GRAPH.md` antes.
O que já está no repo: as migrations `0007`–`0009`, `src/features/learning-graph/`
(`types.ts`, `bkt.ts` completo e testado, `concept-tagger.ts` e
`evidence-recorder.ts` como esqueleto).

Faça um passo por PR. Cada passo tem critério de aceite verificável.

---

## Passo 0 — aplicar as migrations

```bash
npx supabase db reset      # local
npx supabase db push       # remoto
```

Gotcha conhecido: `0009` usa `alter type user_role add value`. No Postgres isso
só funciona dentro de transação se o valor novo não for **usado** na mesma
transação — por isso os `insert` de papéis ficam no seed, não na migration. Se
o `db push` reclamar, separe o `alter type` numa migration própria.

Aceite: `supabase db reset` roda limpo e os testes de RLS existentes continuam passando.

---

## Passo 1 — seed do currículo (um recorte só)

Escopo deliberadamente pequeno: **matemática, 8º ano**. Não tente cobrir a BNCC
inteira; um recorte bem modelado vale mais que o currículo inteiro mal modelado,
e é o suficiente para o piloto.

Criar `scripts/seed-curriculum.ts`:

- lê os JSON em `scripts/data/math-*.json` (conceito + habilidades BNCC + pré-requisitos; o 8º ano original virou `math-ef2.json`)
- insere `curriculum_versions` (`bncc-2018-v1`), `concepts`, `concept_prerequisites`
- **valida que o grafo é um DAG antes de inserir** (DFS com detecção de ciclo).
  Ciclo em pré-requisito trava a recursão de `concept_prerequisite_closure`;
  o `check` da migration só barra auto-referência.
- idempotente: rodar duas vezes não duplica

Aceite: `select count(*) from concepts` > 30, e
`select * from concept_prerequisite_closure('<id de função afim>')` devolve
"operação com fração" com `depth >= 2`.

---

## Passo 2 — tagger de conceito

Implementar `tagTurn()` em `src/features/learning-graph/concept-tagger.ts`
(o TODO no arquivo lista os 6 passos e as duas regras inegociáveis).

Pontos onde isso costuma dar errado, nesta ordem de gravidade:

1. **UUID alucinado.** O modelo devolve id que não existe. Filtrar contra a
   lista de candidatos é obrigatório, não defensivo.
2. **Latência no caminho crítico.** Se o `await` do tagger ficar antes do
   `NextResponse.json`, você adicionou 1–2s à resposta do aluno. Não faça.
3. **Superclassificação.** O modelo quer sempre achar um conceito. O prompt já
   diz que `{"events":[]}` é resposta esperada — se na prática vier vazio em
   menos de ~20% dos turnos, o prompt está frouxo.

Aceite: teste com turnos gravados (fixtures) onde ao menos um caso deve
produzir `events: []`, e nenhum caso pode produzir `concept_id` fora dos candidatos.

---

## Passo 3 — ligar no chat

Em `app/api/tutor/chat/route.ts`, depois do `appendMessage` da resposta:

```ts
// dispara instrumentacao SEM bloquear a resposta do aluno
void tagTurn({
  supabase,
  studentMessage: message,
  tutorReply: guarded.text,
  subject,
  gradeBand,
  messageId,
})
  .then(({ events }) => recordEvidence(supabase, events))
  .catch((e) => console.warn("[tutor/chat] instrumentacao falhou:", e));

return NextResponse.json({
  conversationId: conversation.id,
  reply: guarded.text,
});
```

Cuidado com o runtime: em serverless a função pode ser congelada antes da
promise resolver. Use `after()` do Next 16 (ou `waitUntil`) em vez de `void`
solto — verifique a API atual em `node_modules/next/dist/docs/`.

`recordTutoringSession()` continua sendo chamada por enquanto: o dashboard do
pai ainda depende de `performance_records`. Removida no passo 6.

Aceite: uma conversa real gera linhas em `learning_events` e `concept_mastery`,
e o p95 de latência do endpoint não muda.

---

## Passo 4 — prompt socrático com estado

`buildSocraticSystemPrompt()` hoje recebe `(gradeBand, subject)` e devolve texto
estático. Passar a receber também os pré-requisitos fracos de
`diagnose_weak_prerequisites()` e injetar algo como:

```
CONTEXTO DESTE ALUNO (nunca mencione que voce tem esses dados):
- domina bem: <conceitos com mastery > 0.7 e confidence > 0.4>
- base fragil: <top 3 blocking_score>
Se ele travar, desca para a base fragil antes de insistir no conceito atual.
```

Isso é o que transforma "personalização" de claim de marketing em comportamento
observável — e é o que a coordenação vai testar na demo.

Regra dura: **nunca** expor o número de domínio para o aluno. Ele é para o
professor e para o pai, não é para virar nota velada na cara da criança.

Aceite: `system-prompt.test.ts` cobre que os conceitos frágeis entram no prompt
e que nenhum valor numérico de mastery vaza no texto.

---

## Passo 5 — backfill e recomputação

`scripts/recompute-mastery.ts`: percorre `learning_events` e reconstrói
`concept_mastery` inteiro via `replayMastery()`.

Isso não é utilitário de manutenção — é **a propriedade central do sistema**.
Quando o modelo mudar (`bkt-v2`, parâmetros por conceito calibrados nos dados
reais, DKT), esse script faz todo o histórico melhorar retroativamente. Escreva
com carinho e teste.

Aceite: rodar o script sobre uma base existente é idempotente (mesmo input,
mesmos números) e `model_version` fica coerente em todas as linhas.

---

## Passo 6 — dashboard de turma

É o que vende o contrato. As outras telas são o que faz renovar.

Uma tela, `app/teacher/class/[id]/page.tsx`:

- heatmap turma × conceito (eixo Y aluno, eixo X conceito, cor = mastery)
- lista "conceitos que a turma não fixou", ordenada por `avg(1 - mastery)`
- por aluno, o top-3 de `diagnose_weak_prerequisites()`

Regra de exibição: **nunca mostre `mastery` sem `confidence`.** `mastery = 0.9`
com `confidence = 0.1` é ruído, e um professor que for desmentido uma vez por
um número desses não confia mais em nenhum. Abaixo de `confidence < 0.3`,
mostre "sem dados suficientes", não um número.

Aceite: teste de RLS provando que professor da turma A não lê `concept_mastery`
de aluno da turma B, e que professor nenhum lê `learning_events` ou `messages`.

---

## O que NÃO fazer agora

- **RAG com vector DB.** O grafo de conceitos já ancora o suficiente para o
  piloto. RAG é otimização de qualidade de resposta; o grafo é o ativo. Ordem importa.
- **DKT / modelo neural.** Não há dado para treinar. BKT calibrado ganha.
- **App mobile.** Escola usa Chromebook e laboratório. Web responsivo resolve.
- **Gamificação.** Não move a decisão de compra da mantenedora e come sprint.
- **Cobrar do pai.** O modelo é assento pago pela rede. Plano família é upsell,
  depois de ter contrato.
