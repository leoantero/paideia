# Learning Graph — o sistema de registro da aprendizagem

> Documento de arquitetura de domínio. Leia antes de mexer em qualquer coisa
> sob `src/features/learning-graph/` ou nas migrations `0007`–`0018`.

> **Estado em 2026-09-07 — o que mudou desde a redação original.**
> Este documento descreve a decisão de projeto e continua válido no raciocínio.
> Três pontos do texto abaixo já foram executados e ficaram diferentes:
>
> 1. `performance_records` e `record_tutoring_session()` **não são mais legado
>    convivendo com o novo** — foram removidos em `0013_harden_privileges.sql`.
>    O painel do responsável lê `concept_mastery`. Fonte de verdade única.
> 2. `record_learning_events()` e `upsert_concept_mastery()` **não existem
>    mais como RPC**. Eram executáveis por `authenticated`, o que permitia ao
>    aluno forjar o próprio domínio. A escrita é server-only via service-role
>    (`evidence-recorder.ts`). Ver `docs/SECURITY_REVIEW.md` §1.3.
> 3. A revisão espaçada **já alimenta o grafo**: cada card respondido vira
>    `retrieval_review` (`0014_concept_cards.sql`, `/api/student/review`).

## Por que isso existe

Hoje o produto guarda duas coisas:

1. `messages` — transcrição bruta da conversa.
2. `performance_records` — heurística grosseira por matéria (`strong|average|weak`).

Nenhuma das duas é um ativo. Transcrição é texto que qualquer um consegue
gerar; a heurística é uma contagem de sessões disfarçada de métrica.

O problema estratégico: tutoria socrática por LLM **não é defensável**. Em 24
meses um modelo de fronteira faz isso de graça e melhor. O que nenhum modelo
de fundação tem — e não vai ter — é o **histórico longitudinal, por aluno e
por conceito, ligado a resultado real** dentro de uma rede de escolas. Esse
histórico é cumulativo, é gerado pelo uso e cada ano de operação aumenta a
distância para quem chegar depois.

Então: o chat é o cavalo de Troia. O grafo é a empresa.

Consequência prática, e é a razão deste documento existir agora: se as
interações não forem ancoradas num grafo de conceitos **desde já**, o produto
acumula transcrição em vez de evidência de aprendizagem. Transcrição não é
recuperável retroativamente — reprocessar 2 anos de conversa livre para
extrair domínio de conceito é caro, ruidoso e provavelmente inviável. É uma
decisão de arquitetura barata agora e muito cara depois.

## As quatro camadas

```
[4] Tenancy          organizations > schools > classes > enrollments
                     (quem paga, quem vê o quê, quantos assentos)
                                  |
[1] Currículo        concepts + concept_prerequisites  (o grafo, DAG)
                     versionado, ancorado em código BNCC
                                  |
[2] Evidência        learning_events  (append-only, imutável)
                     "aluno X deu sinal Y sobre conceito Z, origem W"
                                  |
[3] Estado inferido  concept_mastery  (derivado, 100% recomputável)
                     posterior de domínio + agenda de revisão
```

A propriedade que importa: **[3] é sempre recomputável a partir de [2]**.
Quando o modelo de inferência melhorar (BKT -> DKT -> o que for), você
reprocessa todo o histórico e o produto inteiro fica melhor retroativamente,
sem pedir nada a mais para nenhum aluno. Isso é composição de vantagem. Por
isso `learning_events` é append-only e nunca sofre `update`.

### [1] Currículo

`concepts` é a unidade atômica de "coisa que se aprende". Ancore em código
BNCC (`EF08MA06`) sempre que existir — é o vocabulário que a coordenação
pedagógica da escola já fala, e é o que permite mapear para o material
didático que a rede já usa (Bernoulli, Poliedro, sistema próprio).

`concept_prerequisites` é a aresta. É o que permite a única frase que vale
R$60/aluno/mês:

> "A Marina não travou em função afim. Ela travou em operação com fração,
> duas séries atrás, e isso está bloqueando outros 7 conceitos."

Sem o DAG você tem um dashboard. Com o DAG você tem diagnóstico causal.

### [2] Evidência

Todo turno de tutoria, toda revisão espaçada, todo item de avaliação vira
zero ou mais `learning_events`. Campos que não podem faltar:

- `signal` — `correct | partial | incorrect | struggling | insight`
- `confidence` — o quanto o tagger confia que essa evidência é real (0–1).
  Evidência de chat é ruidosa; de item de prova é limpa. Pese diferente.
- `source` + `source_ref` — rastreabilidade até a mensagem que originou.
- `difficulty` — dificuldade do que foi tentado, senão o modelo de domínio
  não distingue acertar o fácil de acertar o difícil.

Nunca faça `update` nem `delete` aqui (fora de anonimização por LGPD).

### [3] Estado inferido

Comece com **BKT (Bayesian Knowledge Tracing)**. É o certo para o estágio:
4 parâmetros por conceito (`p_init`, `p_learn`, `p_guess`, `p_slip`),
atualização online O(1), posterior interpretável — e "interpretável" aqui não
é preciosismo, é requisito comercial: você vai ter que explicar o número para
uma coordenadora pedagógica cética.

DKT/SAKT (modelos neurais) só depois de ter volume real de dados. Você não
tem dado para treinar rede agora, e BKT com priors decentes ganha de rede mal
treinada com folga.

A agenda de revisão espaçada (`next_review_at`) sai do mesmo posterior, o que
unifica duas features que hoje o projeto trata como separadas: repetição
espaçada e diagnóstico são a mesma inferência.

### [4] Tenancy

O modelo de negócio é **contrato de rede, cobrado por aluno matriculado, da
mantenedora**. Isso é requisito de schema, não detalhe comercial:

- `organizations` = mantenedora (a rede). É a entidade do contrato.
- `schools` = unidade. É o que a coordenação enxerga.
- `school_classes` + `enrollments` = turma. É o escopo do professor **e** a
  contagem de assentos que gera a fatura.

Um `enrollment` ativo é um assento. A fatura é `count(enrollments ativos)`.
Não invente uma tabela de billing separada que possa divergir da matrícula.

## Como isso muda o que já existe

| Hoje                                           | Vira                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `detectSubject()` — keyword match em 5 baldes  | tagger de conceito (chamada barata a modelo pequeno) que devolve `concept_id[]` + sinal |
| `performance_records` (heurística por matéria) | view derivada de `concept_mastery`; a tabela vira legado                                |
| `record_tutoring_session()` (conta sessão)     | `record_learning_events()` (registra evidência)                                         |
| prompt socrático estático por série/matéria    | prompt recebe o estado de domínio atual e os pré-requisitos frágeis                     |
| `students.school_name text`                    | FK para `schools` via `enrollments`                                                     |

`performance_records` **não é apagada agora** — o dashboard do pai depende
dela. Ela passa a ser alimentada a partir de `concept_mastery` e é removida
quando a UI do pai for migrada.

## Privacidade (LGPD) — não negociável

- `learning_events` é dado de aprendizagem de menor. Pai vê **derivado**
  (domínio por conceito, tendência), nunca o evento cru nem a mensagem.
  Isso já é o padrão do schema atual (RLS em `conversations`) — mantenha.
- Professor vê os alunos das turmas dele. Coordenação vê a unidade.
  Mantenedora vê agregado. Tudo por RLS, nunca por código de aplicação.
- Retenção: evidência sobrevive ao ano letivo (é o ativo). Transcrição de
  chat tem TTL. Defina o TTL antes de assinar o primeiro contrato de rede —
  vai ser perguntado no DPA.

## Ordem de implementação

1. `0007` currículo + seed de um recorte (uma série, uma matéria)
2. `0008` evidência + domínio + RLS
3. tagger de conceito, rodando **em paralelo** à resposta socrática
4. BKT online + backfill
5. `0009` tenancy + papéis professor/coordenação
6. dashboard de turma (é o que vende o contrato)

Detalhe de latência no passo 3: o tagger **não pode** entrar no caminho
crítico da resposta ao aluno. Dispare em paralelo, persista quando voltar.
