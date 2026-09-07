import { useState, useRef, useEffect } from 'react'

type Tab = 'turma' | 'construtor' | 'ajustes'
type ConstrutoView = 'grid' | 'newSetup' | 'topicQuestions' | 'chat'

// ── Heatmap data ─────────────────────────────────────────────────────────────
const ALL_CONCEPTS = ['Equações', 'Funções', 'Frações', 'Geometria', 'Probabilidade', 'Estatística', 'Álgebra', 'Números']

const CLASSES = [
  { name: '8º ano B', students: 28 },
  { name: '9º ano A', students: 32 },
]

const HEAT_DATA = [
  { student: 'Ana B.', values: [82, 65, 90, 44, 71, 58, 77, 62] },
  { student: 'Bruno M.', values: [55, 40, 78, 30, 62, 45, 50, 38] },
  { student: 'Carla F.', values: [91, 88, 95, 82, 77, 69, 85, 91] },
  { student: 'Diego S.', values: [38, 22, 60, 18, 40, 30, 25, 32] },
  { student: 'Elena R.', values: [74, 70, 85, 55, 68, 60, 72, 65] },
  { student: 'Fabio L.', values: [66, 50, 72, 42, 55, 48, 60, 54] },
  { student: 'Giovana P.', values: [88, 82, 91, 77, 83, 72, 89, 80] },
  { student: 'Hugo C.', values: [45, 38, 65, 28, 50, 35, 42, 40] },
  { student: 'Isabela T.', values: [79, 74, 87, 62, 70, 65, 76, 72] },
  { student: 'José A.', values: [52, 45, 68, 35, 58, 40, 50, 48] },
]

const heatColor = (v: number) => {
  if (v >= 75) return '#1e3a8a'
  if (v >= 50) return '#c8e0e3'
  if (v >= 30) return '#fffac8'
  return '#ffd5d5'
}
const heatText = (v: number) => v >= 75 ? 'white' : '#1e3a8a'

// ── Construtor data ───────────────────────────────────────────────────────────
interface ContentTopic {
  id: number
  subject: string
  topic: string
  color: string
  questionsCount: number
  questions: { type: string; text: string; difficulty: string }[]
}

const INITIAL_TOPICS: ContentTopic[] = [
  {
    id: 1, subject: 'Matemática', topic: 'Equações', color: '#1e3a8a', questionsCount: 3,
    questions: [
      { type: 'Múltipla escolha', text: 'Uma função f(x) = 2x + 3. Qual o valor de f(4)?', difficulty: 'fácil' },
      { type: 'Discursiva', text: 'Explique com suas palavras a diferença entre equação e inequação.', difficulty: 'médio' },
      { type: 'V ou F', text: 'Uma equação do 2º grau sempre tem duas raízes reais distintas.', difficulty: 'médio' },
    ],
  },
  {
    id: 2, subject: 'Matemática', topic: 'Estatística', color: '#2d7a4f', questionsCount: 2,
    questions: [
      { type: 'Discursiva', text: 'Explique a diferença entre média aritmética e mediana.', difficulty: 'médio' },
      { type: 'Múltipla escolha', text: 'Em um conjunto {3, 5, 5, 7, 10}, qual é a moda?', difficulty: 'fácil' },
    ],
  },
  {
    id: 3, subject: 'Física', topic: 'Cinemática', color: '#b8960a', questionsCount: 1,
    questions: [
      { type: 'Múltipla escolha', text: 'Um carro percorre 120 km em 2 horas. Qual sua velocidade média?', difficulty: 'fácil' },
    ],
  },
]

const SUBJECT_OPTIONS = ['Matemática', 'Física', 'Química', 'Biologia', 'Português', 'História', 'Geografia']
const TOPIC_OPTIONS: Record<string, string[]> = {
  Matemática: ['Equações', 'Funções', 'Frações', 'Geometria', 'Estatística', 'Probabilidade'],
  Física: ['Cinemática', 'Dinâmica', 'Óptica', 'Termodinâmica'],
  Português: ['Figuras de linguagem', 'Morfologia', 'Sintaxe', 'Interpretação'],
  História: ['Revolução Francesa', 'Idade Média', 'Brasil Colônia', 'Era Vargas'],
  Biologia: ['Citologia', 'Genética', 'Ecologia', 'Evolução'],
  Química: ['Tabela periódica', 'Reações químicas', 'Ácidos e bases'],
  Geografia: ['Clima', 'Geopolítica', 'Urbanização'],
}

const AI_BUILDER_REPLIES = [
  'Boa! Aqui vai uma sugestão para uma questão de múltipla escolha de dificuldade média:\n\n"Se a função g(x) = 3x − 5 representa o lucro diário (em R$) de uma loja em função das unidades vendidas (x), para que valor de x o lucro é zero?"\n\nA) x = 3  B) x = 5/3  C) x = 5  D) x = 3/5\n\n**Gabarito: B** — pois g(x) = 0 → x = 5/3.\n\nQuer ajustar a dificuldade ou o tipo?',
  'Que tal uma questão discursiva que ative o pensamento crítico?\n\n"Um aluno afirma que toda equação do 2º grau tem duas soluções. Dê um contra-exemplo e explique por que ele está errado."\n\nEssa questão exige que o aluno conheça o discriminante e saiba interpretar Δ < 0. Posso gerar uma versão mais simples se preferir.',
  'Aqui uma questão V ou F com justificativa obrigatória:\n\n"Uma função afim com coeficiente angular negativo é sempre decrescente." (V ou F — justifique)\n\n**Verdadeiro.** Quando a < 0, cada unidade adicional em x diminui o valor de f(x).\n\nDeseja mais questões sobre esse conteúdo ou mudar de tipo?',
]

const diffColor: Record<string, string> = { fácil: '#2d7a4f', médio: '#b8960a', difícil: '#c0392b' }

// ── Icons ─────────────────────────────────────────────────────────────────────
const HeatIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)
const BuildIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
)
const GearIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)

// ── Turma tab ─────────────────────────────────────────────────────────────────
function TurmaTab() {
  const [selectedClass, setSelectedClass] = useState(0)
  const [visibleConcepts, setVisibleConcepts] = useState<string[]>(ALL_CONCEPTS.slice(0, 4))
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggleConcept = (c: string) => {
    setVisibleConcepts(prev =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter(x => x !== c) : prev) : [...prev, c]
    )
  }

  const indices = ALL_CONCEPTS.map((c, i) => ({ c, i })).filter(({ c }) => visibleConcepts.includes(c)).map(({ i }) => i)

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px' }}>Turma</h2>
      <p style={{ fontSize: 13, color: '#4a6080', margin: '0 0 14px' }}>Domínio por aluno e conceito</p>

      {/* Class selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {CLASSES.map((c, i) => (
          <button key={i} onClick={() => setSelectedClass(i)} style={{
            padding: '7px 14px', borderRadius: 20,
            border: '2px solid', borderColor: selectedClass === i ? '#1e3a8a' : '#c8e0e3',
            background: selectedClass === i ? '#1e3a8a' : '#fff',
            color: selectedClass === i ? 'white' : '#1e3a8a',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
            {c.name} <span style={{ opacity: 0.7, fontSize: 11 }}>({c.students})</span>
          </button>
        ))}
      </div>

      {/* Concept filter chips */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#8aacb8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
          Conteúdos visíveis (eixo X)
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_CONCEPTS.map(c => (
            <button
              key={c}
              onClick={() => toggleConcept(c)}
              style={{
                padding: '5px 11px', borderRadius: 16,
                border: '1.5px solid', borderColor: visibleConcepts.includes(c) ? '#1e3a8a' : '#c8e0e3',
                background: visibleConcepts.includes(c) ? '#1e3a8a' : '#f4f9fa',
                color: visibleConcepts.includes(c) ? 'white' : '#4a6080',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['≥75%', '#1e3a8a', 'white'], ['50–74%', '#c8e0e3', '#1e3a8a'], ['30–49%', '#fffac8', '#1e3a8a'], ['<30%', '#ffd5d5', '#1e3a8a']].map(([label, bg, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: bg as string, borderRadius: 3, border: '1px solid #e8f4f6' }} />
            <span style={{ fontSize: 10, color: '#4a6080' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Scrollable heatmap */}
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12, border: '1.5px solid #e8f4f6', background: '#fff' }}
      >
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, minWidth: Math.max(280, 72 + indices.length * 44) }}>
          <thead>
            <tr style={{ background: '#f4f9fa' }}>
              <th style={{
                textAlign: 'left', padding: '10px 12px',
                color: '#8aacb8', fontWeight: 600, fontSize: 10,
                position: 'sticky', left: 0, background: '#f4f9fa', zIndex: 2,
                borderBottom: '1.5px solid #e8f4f6', minWidth: 72, whiteSpace: 'nowrap',
              }}>
                Aluno
              </th>
              {indices.map(i => (
                <th key={i} style={{
                  textAlign: 'center', padding: '10px 6px',
                  color: '#1e3a8a', fontWeight: 600, fontSize: 10,
                  borderBottom: '1.5px solid #e8f4f6', width: 44, whiteSpace: 'nowrap',
                }}>
                  {ALL_CONCEPTS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEAT_DATA.map((row, ri) => (
              <tr key={row.student} style={{ background: ri % 2 === 0 ? '#fff' : '#fafcfd' }}>
                <td style={{
                  padding: '7px 12px', fontSize: 12, color: '#1e3a8a', fontWeight: 500,
                  position: 'sticky', left: 0, background: ri % 2 === 0 ? '#fff' : '#fafcfd', zIndex: 1,
                  borderBottom: ri < HEAT_DATA.length - 1 ? '1px solid #f4f9fa' : 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {row.student}
                </td>
                {indices.map(ci => {
                  const v = row.values[ci]
                  return (
                    <td key={ci} style={{ textAlign: 'center', padding: '5px 4px', borderBottom: ri < HEAT_DATA.length - 1 ? '1px solid #f4f9fa' : 'none' }}>
                      <div style={{
                        width: 36, height: 26, borderRadius: 6, background: heatColor(v),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto', fontSize: 10, fontWeight: 700, color: heatText(v),
                      }}>
                        {v}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scroll hint */}
      {indices.length > 3 && (
        <p style={{ fontSize: 11, color: '#8aacb8', textAlign: 'center', marginTop: 8 }}>← Arraste para ver mais conteúdos →</p>
      )}

      <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffac8', border: '1.5px solid #e4bb02', borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
          <strong>Privacidade:</strong> Você vê domínio agregado — nunca as mensagens individuais dos alunos.
        </p>
      </div>
    </div>
  )
}

// ── Construtor tab ────────────────────────────────────────────────────────────
function ConstrutorTab() {
  const [view, setView] = useState<ConstrutoView>('grid')
  const [topics, setTopics] = useState<ContentTopic[]>(INITIAL_TOPICS)
  const [activeTopic, setActiveTopic] = useState<ContentTopic | null>(null)

  // New topic setup
  const [newSubject, setNewSubject] = useState('Matemática')
  const [newTopic, setNewTopic] = useState('')

  // Chat
  interface ChatMsg { id: number; role: 'teacher' | 'ai'; text: string }
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, aiTyping])

  const openNewChat = () => {
    if (!newTopic) return
    const greeting: ChatMsg = {
      id: 0, role: 'ai',
      text: `Ótimo! Vou te ajudar a criar questões de **${newTopic}** (${newSubject}).\n\nQue tipo de questão você quer começar?\n• Múltipla escolha\n• Discursiva\n• Verdadeiro ou Falso\n\nOu me diz um objetivo de aprendizagem e eu crio a questão adequada.`,
    }
    setChatMsgs([greeting])
    setView('chat')
  }

  const openTopicChat = (topic: ContentTopic) => {
    setActiveTopic(topic)
    const greeting: ChatMsg = {
      id: 0, role: 'ai',
      text: `Continuando com **${topic.topic}** (${topic.subject}). Você já tem ${topic.questionsCount} questão(ões). Que tipo de questão quer adicionar agora?`,
    }
    setChatMsgs([greeting])
    setView('chat')
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    const msg: ChatMsg = { id: Date.now(), role: 'teacher', text: chatInput.trim() }
    setChatMsgs(m => [...m, msg])
    setChatInput('')
    setAiTyping(true)
    setTimeout(() => {
      const reply = AI_BUILDER_REPLIES[Math.floor(Math.random() * AI_BUILDER_REPLIES.length)]
      setChatMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', text: reply }])
      setAiTyping(false)
    }, 1400)
  }

  const chatTitle = activeTopic
    ? `${activeTopic.topic} · ${activeTopic.subject}`
    : newTopic ? `${newTopic} · ${newSubject}` : 'Nova questão'

  // ── Grid ──
  if (view === 'grid') return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px' }}>Construtor</h2>
      <p style={{ fontSize: 13, color: '#4a6080', margin: '0 0 20px' }}>Questões criadas com IA por conteúdo</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* New button */}
        <button
          onClick={() => { setActiveTopic(null); setNewSubject('Matemática'); setNewTopic(''); setView('newSetup') }}
          style={{
            background: '#1e3a8a', border: 'none', borderRadius: 16, padding: '18px 20px',
            textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ width: 42, height: 42, background: '#e4bb02', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a', lineHeight: 1 }}>+</span>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Novo conteúdo</div>
            <div style={{ fontSize: 13, color: '#a8c8e8', marginTop: 2 }}>Criar questões com a IA</div>
          </div>
          <svg style={{ marginLeft: 'auto' }} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        {/* Existing topics */}
        {topics.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTopic(t); setView('topicQuestions') }}
            style={{ background: '#fff', border: '1.5px solid #e8f4f6', borderRadius: 16, padding: '16px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div style={{ width: 42, height: 42, background: t.color + '18', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: t.color }}>{t.topic.slice(0, 2)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{t.topic}</div>
              <div style={{ fontSize: 12, color: '#8aacb8', marginTop: 2 }}>{t.subject} · {t.questionsCount} questão(ões)</div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8aacb8" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )

  // ── New topic setup ──
  if (view === 'newSetup') return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <button onClick={() => setView('grid')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#4a6080', padding: 0, marginBottom: 20, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Construtor
      </button>

      <h2 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', marginBottom: 4 }}>Novo conteúdo</h2>
      <p style={{ fontSize: 13, color: '#4a6080', margin: '0 0 24px' }}>Escolha a matéria e o tópico — a IA já vai saber o contexto.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 6 }}>Matéria</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUBJECT_OPTIONS.map(s => (
            <button key={s} onClick={() => { setNewSubject(s); setNewTopic('') }} style={{
              padding: '8px 14px', borderRadius: 20,
              border: '2px solid', borderColor: newSubject === s ? '#1e3a8a' : '#c8e0e3',
              background: newSubject === s ? '#1e3a8a' : '#fff',
              color: newSubject === s ? 'white' : '#1e3a8a',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 6 }}>Tópico</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {(TOPIC_OPTIONS[newSubject] || []).map(t => (
            <button key={t} onClick={() => setNewTopic(t)} style={{
              padding: '7px 13px', borderRadius: 16,
              border: '1.5px solid', borderColor: newTopic === t ? '#1e3a8a' : '#c8e0e3',
              background: newTopic === t ? '#c8e0e3' : '#fff',
              color: '#1e3a8a', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              {t}
            </button>
          ))}
        </div>
        <input
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
          placeholder="Ou escreva um tópico personalizado..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #c8e0e3', background: '#f4f9fa', fontSize: 14, color: '#1e3a8a', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
          onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
          onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
        />
      </div>

      <button
        onClick={openNewChat}
        disabled={!newTopic.trim()}
        style={{ width: '100%', padding: '14px', background: newTopic.trim() ? '#1e3a8a' : '#c8e0e3', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: 'white', cursor: newTopic.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Bricolage Grotesque, sans-serif' }}
      >
        Criar questões com IA →
      </button>
    </div>
  )

  // ── Topic questions list ──
  if (view === 'topicQuestions' && activeTopic) return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <button onClick={() => setView('grid')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#4a6080', padding: 0, marginBottom: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Construtor
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{activeTopic.topic}</h2>
          <p style={{ fontSize: 13, color: '#4a6080', margin: '2px 0 0' }}>{activeTopic.subject}</p>
        </div>
        <button
          onClick={() => openTopicChat(activeTopic)}
          style={{ background: '#1e3a8a', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'Bricolage Grotesque, sans-serif', flexShrink: 0 }}
        >
          + Questão
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activeTopic.questions.map((q, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #e8f4f6' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: '#f4f9fa', color: '#4a6080', padding: '3px 8px', borderRadius: 6 }}>{q.type}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: diffColor[q.difficulty], background: '#f4f9fa', padding: '3px 8px', borderRadius: 6 }}>{q.difficulty}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#1e3a8a', lineHeight: 1.5 }}>{q.text}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Chat with AI ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8f4f6', background: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => { setView(activeTopic ? 'topicQuestions' : 'newSetup') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 4px 4px 0', display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#1e3a8a" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ width: 34, height: 34, background: '#1e3a8a', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#e4bb02', fontSize: 16, fontWeight: 800, fontFamily: 'Bricolage Grotesque' }}>Π</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatTitle}</div>
          <div style={{ fontSize: 11, color: '#4a6080' }}>Construtor de questões · IA</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chatMsgs.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'teacher' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'ai' && (
              <div style={{ width: 28, height: 28, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
                <span style={{ color: '#e4bb02', fontSize: 12, fontWeight: 800 }}>Π</span>
              </div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px',
              borderRadius: msg.role === 'teacher' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'teacher' ? '#c8e0e3' : '#fff',
              border: '1.5px solid', borderColor: msg.role === 'teacher' ? '#a8d0d5' : '#e8f4f6',
              fontSize: 14, color: '#1e3a8a', lineHeight: 1.6, whiteSpace: 'pre-line',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {aiTyping && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#e4bb02', fontSize: 12, fontWeight: 800 }}>Π</span>
            </div>
            <div style={{ background: '#fff', border: '1.5px solid #e8f4f6', borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1e3a8a', opacity: 0.4 }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px 12px', borderTop: '1px solid #e8f4f6', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {['Múltipla escolha', 'Discursiva', 'V ou F', 'Nível difícil'].map(q => (
            <button key={q} onClick={() => setChatInput(q)} style={{ background: '#f4f9fa', border: '1.5px solid #c8e0e3', borderRadius: 14, padding: '4px 10px', fontSize: 11, color: '#1e3a8a', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {q}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="Descreva o que precisa..."
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '2px solid #c8e0e3', background: '#f4f9fa', fontSize: 14, color: '#1e3a8a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
            onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
          />
          <button onClick={sendChat} disabled={!chatInput.trim()} style={{ width: 42, height: 42, background: chatInput.trim() ? '#1e3a8a' : '#c8e0e3', border: 'none', borderRadius: 12, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ajustes tab ───────────────────────────────────────────────────────────────
function AjustesTab({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 20 }}>Ajustes</h2>

      <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 16, border: '1.5px solid #e8f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, background: '#1e3a8a', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#e4bb02' }}>C</span>
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 17, color: '#1e3a8a' }}>Prof. Carlos Mendes</div>
            <div style={{ fontSize: 13, color: '#4a6080' }}>carlos.mendes@escola.edu.br</div>
          </div>
        </div>
      </div>

      {[
        { label: 'Escola', value: 'Colégio Estadual Dom Pedro' },
        { label: 'Turmas', value: '8º ano B · 9º ano A' },
        { label: 'Matéria', value: 'Matemática' },
        { label: 'Alunos', value: '60 matriculados' },
      ].map(item => (
        <div key={item.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '1.5px solid #e8f4f6', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#4a6080' }}>{item.label}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1e3a8a' }}>{item.value}</span>
        </div>
      ))}

      <div style={{ height: 20 }} />
      <button onClick={onLogout} style={{ width: '100%', padding: '14px', background: 'transparent', border: '2px solid #e8f4f6', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#8aacb8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        Sair da conta
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeacherApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('turma')

  const navItems = [
    { id: 'turma' as Tab, label: 'Turma', Icon: HeatIcon },
    { id: 'construtor' as Tab, label: 'Construtor', Icon: BuildIcon },
    { id: 'ajustes' as Tab, label: 'Ajustes', Icon: GearIcon },
  ]

  return (
    <div style={{ background: '#f4f9fa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f9fa' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'turma' && <TurmaTab />}
          {tab === 'construtor' && <ConstrutorTab />}
          {tab === 'ajustes' && <AjustesTab onLogout={onLogout} />}
        </div>

        <div style={{ background: '#fff', borderTop: '1px solid #e8f4f6', padding: '8px 0 16px', display: 'flex', flexShrink: 0 }}>
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0' }}>
              <Icon active={tab === id} />
              <span style={{ fontSize: 11, fontWeight: tab === id ? 600 : 400, color: tab === id ? '#1e3a8a' : '#8aacb8' }}>{label}</span>
              {tab === id && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#e4bb02' }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
