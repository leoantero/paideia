# Plano do redesign (Figma) — execução

> Fonte de verdade para portar o protótipo `figma/` para o app real.
> Complementa (e onde conflita, **substitui**) `docs/MVP_SPEC.md`.
> Decisões abaixo confirmadas com o usuário em 2026‑09‑06/07.

## Estado atual (o que já está feito e commitado em `feat/paideia-mvp`)

| Commit    | Passo                                                                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `06ea7f5` | `figma/` importado como referência                                                                                                                                                                                                      |
| `50c4606` | **1. Sistema visual** — tokens (`globals.css`), `kit.tsx`, `AppShell`/`ScreenHeader`/`ScreenBody`, `BottomNav` (ícone 22px + ponto dourado), Bricolage 800                                                                              |
| `48820cb` | **2. Entrada + Login** — nova landing (headline "A IA que ensina a pensar."), `LoginForm` full‑column, **perfil Gestor** = role `director` (`ROLE_LABEL`, `ROLE_HOME`), `/entrar/gestor`, `/gestor/*` stub, `SettingsView` reconstruído |
| `5830dbb` | **3. App do aluno** — `TutorScreen` (home + drawer de histórico + chat, `/api/tutor/history`, título da conversa = 1ª msg), `RevisaoScreen` (grade → card‑flip), `GamificationBar` + loja, Ajustes do aluno                             |

Placeholders honestos hoje: `src/ui/student/gamification-data.ts`, `src/ui/student/revisao-data.ts`, painéis de responsável/professor/gestor.

`npm run dev` → localhost:3000. Demo: senha em `PAIDEIA_DEMO_PASSWORD` (`.env.local`); aluno `20250801`; resp. `responsavel.theo@exemplo.com`; prof. `professora.matematica@escola-demo.com`.

---

## Decisões confirmadas (12)

1. **Construtor do professor = banco + avaliação do aluno.** Questões geradas viram avaliações atribuíveis à turma; o aluno responde no app; acerto/erro → `learning_events` com `source='assessment_item'` (sinal limpo, confidence ~0.9).
2. **Gestor é hierárquico.** Diretor de unidade vê a escola; diretor de rede vê todas as escolas da rede. Escopo mora em `staff_assignments` (`school_id` = unidade, `organization_id` = rede) — a tabela já suporta.
3. **Dashboard do gestor: as 4 abas com dados reais** (Escola, Professores, Responsáveis, Desempenho).
4. **Métrica — engajamento do professor** = média de sessões de tutoria por aluno, nas turmas dele, nos últimos 7 dias (número, não %).
5. **Métrica — funil de responsáveis.** Criar e‑mail do responsável na matrícula (ver §Schema). `ativado` = conta criada · `pendente` = e‑mail cadastrado sem conta · `consultou` = abriu o painel na semana · `nunca acessou` = conta criada, 0 acessos.
6. **Avaliações do aluno = 4ª aba "Atividades"** na barra inferior do aluno → `Tutor · Revisão · Atividades · Ajustes`.
7. **Heatmap da Turma: primeiro nome + inicial** ("Ana B."). Migration nova dá ao professor leitura da identidade dos alunos das turmas dele.
8. **Revisão: 6 matérias, só Matemática ancorada** em `concept_id` (gera evidência). As outras 5 funcionam como flashcard solto por ora — **e começar a montar o grafo de conceitos delas** (BNCC 8º ano: Português, Física, História, Biologia, Química).
9. **Moedas:** +5 por dia de ofensiva · +2 por card de revisão acertado (máx 20/dia) · +20 ao completar a semana · +10 ao concluir uma atividade do professor · nada por usar o Tutor.
10. **Dia de ofensiva** = no dia: sessão de tutor com ≥3 trocas **OU** ≥1 card de revisão **OU** concluir uma atividade do professor.
11. **Loja: tema e avatar funcionam de verdade.** ≥1 tema alternativo + 1–2 avatares que mudam a aparência do app do aluno ao serem comprados (estado cosmético por aluno).
12. **Migrations: eu aplico via script** usando `SUPABASE_SERVICE_ROLE_KEY` do `.env.local`, **com confirmação do usuário antes de cada uma**.

---

## Passos restantes

### 4. App do responsável

- **Painel:** seletor de filho; por matéria (agregando `concept_mastery` de vários `concept_id` → matéria), barra + `%` + seta de tendência + "N sessões" + "média geral". `%` **sempre**, com selo discreto **"poucos dados"** quando `confidence < 0.3`. Tendência: derivar de sinal recente dos `learning_events` (sem histórico de snapshot ainda → `→` quando indeterminado).
- **Conselheiro:** rota `POST /api/parent/advisor` — system prompt "conselheiro" (não socrático), lê `concept_mastery` + `diagnose_weak_prerequisites()` do(s) filho(s), aconselha o responsável. Modelo Sonnet. Nunca vê `messages`/`learning_events` do filho.
- **Ajustes:** avatar, filhos vinculados, escola, notificações, Sair.

### 5. App do professor

- **Turma:** heatmap aluno × conceito (nome+inicial), seletor de turma, filtro de conceitos, legenda por faixa, lista "conceitos que a turma não fixou", top‑3 `diagnose_weak_prerequisites` por aluno. Callout de privacidade.
- **Construtor:** grade de tópicos → chat com IA (`POST /api/teacher/builder`, Sonnet) que propõe questões (múltipla escolha / discursiva / V‑F, dificuldade); botão **"Adicionar"** por questão proposta salva no banco. Montar avaliação e **atribuir à turma**.
- **Ajustes:** escola, turmas, matéria, alunos, Sair.

### 6. App do gestor (`/gestor/*`)

- **Insights:** rota `POST /api/gestor/insights` (Sonnet) — lê agregados da(s) escola(s) no escopo do gestor; responde sobre engajamento por turma, pré‑requisitos críticos, uso por professor, ranking de domínio.
- **Dashboard (4 abas reais):**
  - _Escola:_ KPIs (alunos ativos, responsáveis, professores, sessões/semana) + "sessões por dia".
  - _Professores:_ lista com a métrica da decisão #4 + nº de turmas.
  - _Responsáveis:_ funil da decisão #5 + ação recomendada.
  - _Desempenho:_ domínio médio por matéria + flag de atenção.
- **Ajustes:** escola/rede, contrato, versão, callout LGPD, Sair.

### 7. Back-end (migrations + rotas + seed)

**Migrations novas** (`supabase/migrations/00XX_*.sql`, aplicadas via script com confirmação):

- **Identidade p/ professor:** policy dando ao professor `select` em `students`/`profiles.full_name` dos alunos com enrollment ativo nas turmas de `accessible_class_ids()`.
- **Escopo do gestor:** funções `accessible_school_ids()` / `accessible_org_ids()` a partir de `staff_assignments`; policies de leitura agregada em `concept_mastery`, `learning_events` (contagem só), `enrollments`, `staff_assignments` para `director`.
- **E‑mail do responsável na matrícula:** coluna `guardian_email` em `enrollments` (ou tabela `enrollment_guardians`), + `activated_at`. Alimenta o funil.
- **Gamificação:** `student_streak` (last_active_date, current_len, week bitmap), `coin_ledger` (append‑only: student_id, delta, reason, ref, created_at), `coin_balance` (derivado/view), `student_cosmetics` (owned itens + `active_theme`, `active_avatar`). Regras das decisões #9/#10.
- **Avaliações:** `assessment_topics` (teacher_id, subject, topic), `questions` (topic_id, type, difficulty, stem, options jsonb, answer_key), `assessments` (teacher_id, class_id, title), `assessment_questions` (join), `assessment_submissions` (student_id, assessment_id, answers jsonb, score, submitted_at). Submissão grava `learning_events` `source='assessment_item'`.
- **Currículo das outras matérias:** novos `curriculum_version` + `concepts` + `concept_prerequisites` para Português/Física/História/Biologia/Química 8º ano (BNCC). Começar por 1 matéria como piloto (sugestão: Português), estrutura do `scripts/data/math-ef8.json`.

**Rotas de IA novas:** `/api/parent/advisor`, `/api/teacher/builder`, `/api/gestor/insights`. Todas server‑only, lêem só agregado/derivado, nunca `messages` de terceiros.

**Revisão → evidência:** `POST /api/student/review` grava `retrieval_review` (signal do botão Sabia/Difícil, confidence ~0.9) para cards ancorados; dispara `recomputeMastery`.

**`scripts/seed-demo.ts`:** + conta de gestor (`gestor@escola-demo.com`, `staff_assignments.school_id`) · + `concept_mastery` realista para os 5 alunos (pra painéis não ficarem vazios) · + `guardian_email` nas enrollments a partir de `PARENTS` · + 1 avaliação de exemplo · + streak/moedas iniciais. `scripts/seed-curriculum.ts`: + a matéria‑piloto.

---

## Ordem sugerida amanhã

4 (responsável, front) → 7a (migrations de leitura: professor + gestor + guardian_email) → 5 (professor, front+builder) → 6 (gestor, front+insights) → 7b (gamificação + avaliações + evidência + seed) → screenshot pass + `/code-review ultra`.
