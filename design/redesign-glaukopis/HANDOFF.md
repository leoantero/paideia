# Redesign Glaukópis pastel: handoff para implementação

Origem: canvas "Paideia — Paletas" no Claude Design (privado do Leo). Os arquivos
em `telas/` são o fonte de cada prancha, copiado em 14/10/2026.

## Como ler as telas

- Cada `telas/*.dc.html` é HTML com estilo inline. Os valores (cor, tamanho,
  espaçamento, raio, peso) são a especificação. **Não copie o HTML**: reimplemente
  nos componentes existentes com Tailwind e tokens.
- `<dc-import name="X">` = componente filho, definido em `telas/X.dc.html`
  (ex.: `Topo`, `Nav`, `NavPerfil`, `Marca`).
- `{{x}}`, `<sc-for>`, `<sc-if>` e o `<script type="text/x-dc">` no fim de cada
  arquivo são do runtime do editor. A lógica no script mostra os dados de
  exemplo e os estados (ex.: `TelaQuestao` tem os estados escolha / acerto / erro).
- Abrir no navegador não renderiza (falta o runtime). Leia o fonte.
- Largura de referência: 390px (mobile-first). `canvas.json` tem o tamanho de cada prancha.
- `Main`, `Glaukopis`, `Patina`, `Minio` são estudos de paleta. A direção escolhida
  é **`GlaukopisPastel`**. `Patina` e `Minio` são descartadas.

## Tokens

Extraídos das telas (as telas mandam quando divergirem da prancha de paleta).

| Papel                          | Claro                                       | Escuro                      |
| ------------------------------ | ------------------------------------------- | --------------------------- |
| Fundo (pergaminho)             | `#f3f2ee`                                   | `#0e1322`                   |
| Superfície / cartão            | `#ffffff`                                   | `#171e33`                   |
| Tinta (texto)                  | `#151b2e`                                   | `#ece8dd`                   |
| Texto secundário               | `#505873`                                   | `#9aa1b8`                   |
| Divisória                      | `#ecebe5`                                   | `#28304a`                   |
| Borda de cartão                | `#e2e0d9`                                   | `#28304a`                   |
| Borda de input                 | `#d3d0c6`                                   | `#28304a`                   |
| Noite (ação principal, botões) | `#1c2a4a` (texto branco)                    | `#b8c5ee` (texto `#0e1322`) |
| Lavanda (fala do aluno)        | `#d3dbf4`, nome `#2f3f74`                   | `#2a3558`                   |
| Lavanda forte                  | `#b8c5ee`, `#7f93d4`                        |                             |
| Glauco (tutor, assinatura)     | `#b5ddd6`, suave `#d8eeea`, médio `#6fb5ab` | `#9fd3cb`                   |
| Glauco texto                   | `#1f4f4c`, profundo `#2a6663`               | `#173432`                   |
| Lamparina (moedas, conquistas) | `#f7d99a`, suave `#fbefd3`                  | `#f3d291`                   |
| Moeda (dracma)                 | `#e2a23a` com anel `#f2c768`                | `#c98a1e`                   |
| Lamparina texto                | `#7a5410`                                   |                             |
| Coral (erro, revisar)          | `#f4c3b6`, suave `#fbe1da`, médio `#e48e78` | `#f0ae9f`                   |
| Coral texto                    | `#8a2f1c`                                   | `#6e2415`                   |

Raios usados: 10px (input), 12px (botão), 14–16px (cartão), 24px (cabeçalhos com
fundo), 999px (pílulas).

## Tipografia

- **Young Serif** (400): títulos de tela (`h1` 28–34px). Nova, precisa entrar no
  `next/font` em `app/layout.tsx`.
- **Manrope**: texto corrido e UI (pesos 400–800). Já está carregada.
- **Marcellus**: só no logotipo `PAIDEIA` (tracking 0.16em) e no grego `παιδεία`.
  Hoje ela é a `--font-display` do `.theme-greek`; no redesign os títulos passam
  para Young Serif.

## Marca

Já está no código: `src/ui/paideia/Marca.tsx`, `public/brand/`, `app/icon.svg`,
`app/apple-icon.png`, `app/manifest.ts`. Use `<Marca variante="busto" />` nos
cabeçalhos. Fundo escuro: `linha="#f3f2ee" louro="#f2c768"`. Pranchas de
referência: `MarcaPrincipal`, `MarcaIcone`, `Abertura`.

## Mapa tela → código

| Prancha                        | Rota                                                     | Componente atual                    |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------- |
| `Topo`                         | cabeçalho do aluno                                       | `src/ui/student/StudentShell.tsx`   |
| `Nav`                          | barra inferior do aluno                                  | `src/ui/student/BottomNav.tsx`      |
| `TelaInicio`                   | `/student`                                               | `src/ui/student/HomeView.tsx`       |
| `TelaTutor`                    | `/student/tutor`                                         | `src/ui/student/TutorScreen.tsx`    |
| `TelaRevisao` + `TelaResposta` | `/student/revisao`                                       | `src/ui/student/StudySession.tsx`   |
| `TelaPodio`                    | `/student/podio`                                         | `src/ui/student/ArenaView.tsx`      |
| `Ajustes`                      | `*/ajustes` (todos os perfis)                            | `src/ui/SettingsView.tsx`           |
| `Entrada`                      | `/`                                                      | `app/page.tsx`                      |
| `Login`                        | `/entrar/aluno` (os outros perfis seguem o mesmo layout) | `src/ui/LoginForm.tsx`              |
| `PaisPainel`                   | `/parent/dashboard`                                      | `src/ui/parent/PainelView.tsx`      |
| `PaisConselheiro`              | `/parent/chat`                                           | `src/ui/parent/ConselheiroChat.tsx` |
| `ProfTurma`                    | `/teacher/turma`                                         | `src/ui/teacher/TurmaHeatmap.tsx`   |
| `ProfConstrutor`               | `/teacher/construtor`                                    | `src/ui/teacher/ConstrutorView.tsx` |
| `GestorInsights`               | `/gestor/insights`                                       | `src/ui/gestor/InsightsChat.tsx`    |
| `GestorDashboard`              | `/gestor/dashboard`                                      | `src/ui/gestor/DashboardView.tsx`   |
| `NavPerfil`                    | barra dos adultos                                        | `src/ui/BottomNav.tsx`              |

**Sem rota hoje (telas novas):** `TelaQuestoes` (módulos de questões),
`TelaQuestao` + `QuestaoAcerto` + `QuestaoErro` (resolver questão),
`TelaSimulacoes` + `TelaSimulacaoFracoes` (simulações interativas), `Abertura`
(splash). Elas precisam de modelo de dados e backend. Não implemente só a casca
sem alinhar com o Leo.

**No código, sem prancha:** `/student/loja`. Mantenha e só aplique os tokens novos.

## Ordem sugerida

1. **Tokens.** Hoje há duas paletas: a azul global (`@theme` em `app/globals.css`)
   e a grega (`.theme-greek`, só no aluno). O redesign usa uma paleta só para
   todos os perfis. Troque os valores mantendo os nomes de variável que os
   componentes já usam, pra mudança se espalhar sem tocar em cada tela. Inclua o
   modo escuro.
2. **Fontes.** Adicione Young Serif e ajuste `--font-display`.
3. **Casca do aluno.** `Topo` e `Nav` aparecem em todas as telas do aluno.
4. **Telas do aluno**, na ordem da tabela, depois Entrada/Login, depois os adultos.
5. **Telas novas**, só depois de combinar escopo.

## Cuidados

- O app é mobile-first. Confira cada tela a 390px e no modo escuro.
- Contraste: texto secundário `#505873` sobre `#f3f2ee` passa AA. Não clareie.
  Texto sobre pastel usa a versão "texto" da cor (ex.: `#1f4f4c` sobre glauco).
- Alvos de toque ≥ 44px. As telas já respeitam isso.
- Mantenha as regras do `CLAUDE.md`: o tutor nunca dá a resposta, e o responsável
  vê tendência, não respostas erradas detalhadas. As telas foram desenhadas
  nessa linha. Se algum texto de exemplo contradisser isso, a regra vence.
- Os textos das telas são exemplos (nomes, números). Os dados vêm do Supabase.
