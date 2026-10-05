# Revisão de segurança — 2026-09-07

Auditoria completa do app + banco, feita contra o projeto Supabase hospedado
(`ai-startup`), com as contas reais da demo e a **anon key** — ou seja,
exatamente o que qualquer pessoa tem no console do navegador.

Reprodutível a qualquer momento: `npm run audit:security`.

---

## 1. Vulnerabilidades encontradas e corrigidas

### 1.1 CRÍTICA — qualquer pessoa na internet criava conta de gestor

`handle_new_user()` (0006) lia o papel de `raw_user_meta_data`, que é
literalmente o objeto que o cliente envia em
`supabase.auth.signUp({ options: { data } })`. Com o signup público habilitado
no projeto, um `POST /auth/v1/signup` com `{"role":"director"}` criava um
perfil **director**.

**Confirmado empiricamente**, não deduzido: um signup anônimo gerou o perfil
`{"role":"director","full_name":"Probe Escalation"}`. A conta de teste foi
removida em seguida.

_Raio de alcance na época:_ limitado — as policies de 0009 dependem de
`staff_assignments`/matrícula, não do papel isolado, então o director forjado
não alcançava dado de aluno nenhum. Mas é uma conta de papel confiável dentro
do tenant, e qualquer policy futura escrita em cima de `role` viraria
vazamento imediato.

**Correção (0013):** o papel passa a vir de `raw_app_meta_data`, que só a
service-role escreve. Signup público agora só consegue criar `student`.

### 1.2 CRÍTICA — qualquer usuário logado virava gestor com um UPDATE

`profiles_update_own` permite o usuário atualizar a própria linha, e o papel
`authenticated` tinha privilégio de UPDATE na tabela inteira — incluindo a
coluna `role`. Um aluno logado executava, do console:

```js
supabase.from("profiles").update({ role: "director" }).eq("id", meuId);
```

**Confirmado empiricamente** antes da correção.

**Correção (0013):** privilégio de coluna. RLS decide QUAIS LINHAS; `GRANT`
decide QUAIS CAMPOS.

```sql
revoke update on public.profiles from authenticated;
grant  update (full_name) on public.profiles to authenticated;
```

Idem em `students` (só `grade_level`, `school_name`).

### 1.3 ALTA — o aluno conseguia forjar o próprio domínio

`record_learning_events()` e `upsert_concept_mastery()` eram `security definer`
com `grant execute ... to authenticated`. O aluno chamava direto e inventava
`insight` com confidence alta, ou escrevia `mastery = 0.99` sem passar pelo BKT.

Isso não é "trapaça de aluno": é a destruição do ativo. O que a rede compra é o
número ser derivado de evidência real; um número que o próprio avaliado
escreve não vale nada num contrato.

**Correção (0013):** as duas RPCs foram **removidas** em vez de blindadas — não
existe mais caminho de escrita do learning graph alcançável pelo cliente. Quem
grava é o servidor (`src/lib/supabase/admin.ts`), com service-role, dentro do
`after()` da rota, sempre com o `student_id` da sessão autenticada e nunca um
id vindo do corpo da requisição.

### 1.4 MÉDIA — `recomputeMastery` misturava alunos

O replay filtrava `learning_events` só por `concept_id`, sem `student_id`.
Rodando com a sessão do aluno a RLS mascarava o defeito (só voltavam as linhas
dele). Ao mover a escrita para service-role — que ignora RLS — o mesmo código
teria calculado o domínio de um aluno com a evidência da turma inteira.

Achado durante a refatoração de 1.3, antes de ir para produção.

**Correção:** filtro por `student_id` explícito em `evidence-recorder.ts`.

---

## 2. O que foi auditado e está correto

`npm run audit:security` — 22 verificações, todas passando:

| Perfil      | Verificação                                                       |
| ----------- | ----------------------------------------------------------------- |
| Aluno       | não lê evidência, domínio ou mensagem de outro aluno              |
| Aluno       | não escala o próprio papel (`42501`)                              |
| Aluno       | não lê o banco de questões do professor                           |
| Responsável | vê **somente** o próprio filho                                    |
| Responsável | **não** lê `learning_events` nem `messages` do filho              |
| Professor   | **não** lê `learning_events` nem `messages`                       |
| Professor   | vê domínio apenas dos alunos das turmas dele                      |
| Professor   | não consegue reescrever domínio de aluno                          |
| Gestor      | **não** lê `learning_events`, `messages` nem o banco do professor |
| Gestor      | vê agregados só da própria unidade                                |
| Anônimo     | não lê nenhuma das 8 tabelas sensíveis                            |

A promessa do `docs/PEDAGOGY.md` ("o que os pais NÃO veem") é enforced no
banco, não na interface: o cliente Supabase do responsável não consegue
`select` em `conversations`/`messages` de jeito nenhum.

---

## 3. Pendências — decisão do time, não bugs

### 3.1 Signup público continua habilitado (recomendação: desligar)

Depois de 1.1 um signup anônimo só cria `student` sem matrícula, que não
enxerga nada. Mas no modelo B2B **ninguém deveria se auto-cadastrar** — a
escola provisiona. Deixar aberto permite criação de contas-lixo.

Como desligar: Supabase Dashboard → Authentication → Sign In / Providers →
desabilitar "Allow new users to sign up". Não fiz porque é mudança de
configuração do projeto, não de código.

### 3.2 Contas de teste antigas na base

Restam perfis de desenvolvimento (`jose`, `Maria Souza`, `paidojose`,
`Joao da Silva`, `Pai da Maria`). Não poluem métrica nenhuma — todas as
funções agregadas escopam por matrícula ativa, e nenhuma delas tem — mas são
lixo numa base que vai ser mostrada. Remoção é destrutiva; deixei a decisão
para o time.

### 3.3 Rotação de credenciais

O `SUPABASE_ACCESS_TOKEN` usado nesta sessão foi digitado no terminal e está
no histórico da conversa. Rotacionar em
https://supabase.com/dashboard/account/tokens.

### 3.4 Senha única na demo

(antes fixa no repositório; desde 2026‑10‑04 só em `PAIDEIA_DEMO_PASSWORD` no `.env.local`) para todas as contas. Aceitável para demo; inaceitável no
primeiro piloto com escola real.
