# Deploy — checklist para a demo pública

O banco (Supabase) já existe e já está com a base fechada de 16 contas
(ver `scripts/seed-demo.ts`). Este documento é só sobre colocar o **app**
atrás de uma URL pública, apontado pro mesmo banco, sem abrir a porta que
fechamos em `docs/SECURITY_REVIEW.md`.

## 1. Vercel — variáveis de ambiente

Crie o projeto na Vercel a partir deste repositório e configure exatamente
estas variáveis (Settings → Environment Variables, ambiente **Production**):

| Variável                        | Valor                      | Observação                            |
| ------------------------------- | -------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | do projeto hospedado       | mesma do `.env.local`                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | do projeto hospedado       | mesma do `.env.local`                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | do projeto hospedado       | **secret** — nunca com `NEXT_PUBLIC_` |
| `ANTHROPIC_API_KEY`             | sua chave de produção      | **secret**                            |
| `PAIDEIA_DEV_PANEL`             | **não crie esta variável** | ver §3                                |

Nenhuma outra variável é lida pelo app.

## 2. Supabase — apontar para o domínio público

O projeto Supabase por padrão não sabe que existe uma URL pública. Painel do
projeto → **Authentication → URL Configuration**:

- **Site URL**: `https://<seu-dominio-vercel>.vercel.app`
- **Redirect URLs**: adicione a mesma URL (e o domínio custom, se/quando houver)

Sem isso, qualquer fluxo que gere link por e-mail (recuperação de senha,
convite) aponta pra `localhost` na produção.

## 3. Manter a base fechada

A decisão foi: sem cadastro aberto, credenciais fixas distribuídas por vocês
(ver `docs/SECURITY_REVIEW.md` §3.1 e a conversa que motivou
`scripts/seed-demo.ts` ter 2 turmas e 3 professores).

- **Authentication → Sign In / Providers** → desabilite "Allow new users to
  sign up". Depois de `0013_harden_privileges.sql` um cadastro anônimo só
  cria `student` sem matrícula (não vê nada), mas ainda é lixo na base.
- **Não crie `PAIDEIA_DEV_PANEL` no ambiente da Vercel.** Essa variável liga
  `/dev` — uma tela que lista todas as contas e a senha delas. Sem a
  variável, a rota responde 404 (verificado em `npm run build` +
  `next start` local com a variável ausente). Ela deve existir **só** no seu
  `.env.local`, nunca em produção.

## 4. Rate limit nas rotas de IA (já implementado)

Com a base fechada, o risco que resta é uma das credenciais conhecidas
vazar, ou um script rodando em loop contra o tutor. Todas as 4 rotas que
chamam a Anthropic têm teto por usuário/hora (`src/lib/rate-limit.ts`,
migration `0019_rate_limits.sql`):

| Rota                   | Teto/hora |
| ---------------------- | --------- |
| `/api/tutor/chat`      | 40        |
| `/api/parent/advisor`  | 20        |
| `/api/gestor/insights` | 20        |
| `/api/teacher/builder` | 15        |

Estourar o teto devolve HTTP 429 com `Retry-After`. Ajuste os números em
cada `route.ts` se a demo pedir mais headroom.

## 5. Build e deploy

Nada de configuração especial — é um app Next.js padrão, sem `vercel.json`.

```bash
npm run build   # confirma localmente antes de conectar o repo
```

Depois é conectar o repositório na Vercel, colar as variáveis do passo 1, e
deploy. Framework preset "Next.js" é detectado automaticamente.

## 6. Depois do primeiro deploy

- Abra `https://<dominio>/entrar/aluno` e entre com uma das 8 matrículas
  (senha em `PAIDEIA_DEMO_PASSWORD` no `.env.local`) pra confirmar que a sessão funciona no domínio
  novo.
- Confirme que `https://<dominio>/dev` responde **404**.
- Rode `npm run audit:security` localmente (ele aponta pro banco hospedado,
  não pro deploy — continua válido).

## Antes de uma escola real usar (fora do escopo desta demo)

Ver `docs/SECURITY_REVIEW.md` §3 e `docs/LEARNING_GRAPH.md` — recuperação de
senha real, provisionamento em massa, TTL de transcrição e o restante do
Construtor (atribuir avaliação à turma) ficam para quando existir aluno de
verdade na base.
