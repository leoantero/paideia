import { useState, useRef, useEffect } from 'react'

type Tab = 'tutor' | 'revisao' | 'ajustes'
type TutorView = 'home' | 'chat'
type RevisaoView = 'subjects' | 'contents' | 'cards'

// ── Gamification data ────────────────────────────────────────────────────────
const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const STREAK = [true, true, true, true, false, false, false]
const TODAY_IDX = 3
const COINS = 45

// ── Chat data ────────────────────────────────────────────────────────────────
interface Message { id: number; role: 'student' | 'tutor'; text: string }

const PAST_CHATS = [
  { id: 1, date: 'Hoje', topic: 'Equações do 2º grau', msgs: 8 },
  { id: 2, date: 'Ontem', topic: 'Funções afins', msgs: 12 },
  { id: 3, date: '03/09', topic: 'Frações e porcentagem', msgs: 6 },
  { id: 4, date: '01/09', topic: 'Média e moda', msgs: 9 },
  { id: 5, date: '29/08', topic: 'Probabilidade básica', msgs: 5 },
]

const TUTOR_REPLIES = [
  'Boa pergunta! Vamos por partes — qual informação você já tem sobre esse assunto?',
  'Interessante! Por que você acha isso? Tem alguma evidência que confirme?',
  'Você está no caminho certo. O que aconteceria se você testasse com um número diferente?',
  'Isso faz sentido. Como isso se relaciona com o que aprendemos sobre funções?',
  'Excelente raciocínio! Consegue aplicar a mesma lógica a um problema parecido?',
  'Ótimo! Agora me explica: se o resultado fosse o dobro, o que mudaria no processo?',
]

// ── Revisão data ─────────────────────────────────────────────────────────────
const SUBJECTS = [
  {
    name: 'Matemática', color: '#1e3a8a', bg: '#e8f0fb', icon: '📐',
    totalCards: 18, dueCards: 5,
    contents: [
      { name: 'Equações 2º grau', cards: 8, due: 3, ankiCards: [
        { front: 'O que é uma equação do 2º grau?', back: 'Polinômio de grau 2: ax² + bx + c = 0, com a ≠ 0. Pode ter 0, 1 ou 2 raízes reais.' },
        { front: 'Fórmula de Bhaskara', back: 'x = (−b ± √Δ) / 2a, onde Δ = b² − 4ac (discriminante).' },
        { front: 'Quando Δ < 0?', back: 'A equação não tem raízes reais — as raízes são complexas.' },
      ]},
      { name: 'Funções afins', cards: 6, due: 2, ankiCards: [
        { front: 'Defina função afim.', back: 'f(x) = ax + b, a ≠ 0. Gráfico é sempre uma reta. "a" é a taxa de variação e "b" é o ponto de intersecção com o eixo Y.' },
        { front: 'Quando uma função afim é crescente?', back: 'Quando a > 0 — a reta tem inclinação positiva.' },
      ]},
      { name: 'Frações e decimais', cards: 4, due: 0, ankiCards: [
        { front: 'Como converter 3/4 em decimal?', back: '3 ÷ 4 = 0,75. Divide numerador pelo denominador.' },
      ]},
    ],
  },
  {
    name: 'Português', color: '#b8960a', bg: '#fdf8e1', icon: '📝',
    totalCards: 14, dueCards: 2,
    contents: [
      { name: 'Figuras de linguagem', cards: 7, due: 2, ankiCards: [
        { front: 'O que é onomatopeia?', back: 'Palavra que imita um som. Ex: "miau", "au-au", "tic-tac", "ploft".' },
        { front: 'Diferença entre metáfora e metonímia?', back: 'Metáfora: comparação implícita ("ele é uma pedra"). Metonímia: troca por relação lógica ("ler Machado de Assis" = obras dele).' },
      ]},
      { name: 'Morfologia', cards: 4, due: 0, ankiCards: [
        { front: 'Quais são as classes de palavras?', back: 'Substantivo, adjetivo, verbo, advérbio, pronome, artigo, numeral, preposição, conjunção e interjeição.' },
      ]},
      { name: 'Concordância verbal', cards: 3, due: 0, ankiCards: [
        { front: 'Regra geral da concordância verbal?', back: 'O verbo concorda com o sujeito em pessoa (1ª, 2ª, 3ª) e número (singular/plural).' },
      ]},
    ],
  },
  {
    name: 'Física', color: '#2d7a4f', bg: '#e5f5ed', icon: '⚡',
    totalCards: 10, dueCards: 1,
    contents: [
      { name: 'Cinemática', cards: 5, due: 1, ankiCards: [
        { front: 'Fórmula da velocidade média', back: 'v = Δs / Δt — variação do espaço dividida pela variação do tempo.' },
      ]},
      { name: 'Dinâmica', cards: 5, due: 0, ankiCards: [
        { front: '2ª Lei de Newton', back: 'F = m·a — força resultante é igual à massa vezes a aceleração. Unidade: Newton (N) = kg·m/s².' },
      ]},
    ],
  },
  {
    name: 'História', color: '#8b4513', bg: '#f9ede3', icon: '📜',
    totalCards: 9, dueCards: 4,
    contents: [
      { name: 'Revolução Francesa', cards: 5, due: 3, ankiCards: [
        { front: 'Quais os três lemas da Revolução Francesa?', back: 'Liberdade, Igualdade e Fraternidade (Liberté, Égalité, Fraternité).' },
        { front: 'Quando ocorreu a Revolução Francesa?', back: 'Entre 1789 e 1799. O marco inicial é a tomada da Bastilha em 14 de julho de 1789.' },
      ]},
      { name: 'Idade Média', cards: 4, due: 1, ankiCards: [
        { front: 'O que é feudalismo?', back: 'Sistema político, econômico e social da Idade Média baseado na posse de terras (feudo) e nas relações de vassalagem.' },
      ]},
    ],
  },
  {
    name: 'Biologia', color: '#1a7a8a', bg: '#e3f4f6', icon: '🌿',
    totalCards: 7, dueCards: 0,
    contents: [
      { name: 'Citologia', cards: 4, due: 0, ankiCards: [
        { front: 'Diferença entre célula procarionte e eucarionte?', back: 'Procarionte: sem núcleo definido (ex: bactérias). Eucarionte: com núcleo organizado por membrana nuclear (ex: células animais e vegetais).' },
      ]},
      { name: 'Genética básica', cards: 3, due: 0, ankiCards: [
        { front: 'O que são genes dominantes e recessivos?', back: 'Dominante: se expressa com um único alelo (D). Recessivo: precisa de dois alelos iguais para se expressar (rr).' },
      ]},
    ],
  },
  {
    name: 'Química', color: '#6a2d7a', bg: '#f3e8fb', icon: '🧪',
    totalCards: 8, dueCards: 2,
    contents: [
      { name: 'Tabela periódica', cards: 4, due: 2, ankiCards: [
        { front: 'O que são elementos do mesmo período?', back: 'Elementos na mesma linha horizontal da tabela periódica. Têm o mesmo número de camadas eletrônicas.' },
      ]},
      { name: 'Reações químicas', cards: 4, due: 0, ankiCards: [
        { front: 'Tipos principais de reações químicas?', back: 'Síntese (A+B→AB), decomposição (AB→A+B), simples troca (A+BC→AC+B) e dupla troca (AB+CD→AD+CB).' },
      ]},
    ],
  },
]

// ── Icons ────────────────────────────────────────────────────────────────────
const ChatIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
  </svg>
)
const CardsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <rect x="2" y="8" width="14" height="12" rx="2"/>
    <path strokeLinecap="round" d="M6 8V6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2h-2"/>
  </svg>
)
const GearIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)

// ── Gamification bar ─────────────────────────────────────────────────────────
function GamificationBar({ onCoinsClick }: { onCoinsClick: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8f4f6', borderRadius: 16, padding: '14px 16px', margin: '0 0 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>🔥 {STREAK.filter(Boolean).length} dias seguidos</span>
          <span style={{ fontSize: 11, color: '#8aacb8', marginLeft: 6 }}>esta semana</span>
        </div>
        <button
          onClick={onCoinsClick}
          style={{ background: '#fffac8', border: '1.5px solid #e4bb02', borderRadius: 20, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          <span style={{ fontSize: 14 }}>🪙</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#b8960a' }}>{COINS}</span>
        </button>
      </div>

      {/* Race track */}
      <div style={{ position: 'relative', height: 52 }}>
        {/* Track line */}
        <div style={{ position: 'absolute', top: 30, left: 16, right: 16, height: 4, background: '#e8f4f6', borderRadius: 2 }} />
        <div style={{
          position: 'absolute', top: 30, left: 16,
          height: 4, borderRadius: 2, background: '#1e3a8a',
          width: `${((TODAY_IDX + 1) / 7) * (100 - (32 / 420) * 100)}%`,
          transition: 'width 0.5s',
        }} />

        {/* Day markers */}
        <div style={{ position: 'absolute', top: 22, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          {WEEK_DAYS.map((day, i) => (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {/* Runner on today */}
              {i === TODAY_IDX && (
                <div style={{ fontSize: 14, marginBottom: 0, lineHeight: 1, position: 'absolute', top: -18 }}>🏃</div>
              )}
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: STREAK[i] ? '#1e3a8a' : i === TODAY_IDX ? '#e4bb02' : '#e8f4f6',
                border: i === TODAY_IDX ? '2px solid #e4bb02' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {STREAK[i] && <svg width="10" height="10" fill="white" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
              </div>
              <span style={{ fontSize: 9, color: i <= TODAY_IDX ? '#1e3a8a' : '#8aacb8', marginTop: 3, fontWeight: i === TODAY_IDX ? 700 : 400 }}>{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Finish line hint */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#8aacb8' }}>🏁 Complete a semana e ganhe +20 🪙</span>
      </div>
    </div>
  )
}

// ── Coins modal ──────────────────────────────────────────────────────────────
function CoinsModal({ onClose }: { onClose: () => void }) {
  const rewards = [
    { name: 'Avatar do Roblox', cost: 30, icon: '🎮', available: true },
    { name: 'Tema roxo', cost: 20, icon: '🟣', available: true },
    { name: 'Moldura dourada', cost: 50, icon: '✨', available: false },
    { name: 'Sticker exclusivo', cost: 15, icon: '⭐', available: true },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,58,138,0.3)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, padding: '20px 20px 36px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a' }}>Suas moedas 🪙</div>
            <div style={{ fontSize: 13, color: '#4a6080' }}>Troque por personalizações</div>
          </div>
          <div style={{ background: '#fffac8', border: '2px solid #e4bb02', borderRadius: 20, padding: '6px 16px' }}>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#b8960a' }}>{COINS}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rewards.map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f9fa', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e8f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{r.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{r.name}</span>
              </div>
              <button
                disabled={COINS < r.cost || !r.available}
                style={{
                  background: COINS >= r.cost ? '#1e3a8a' : '#e8f4f6',
                  color: COINS >= r.cost ? 'white' : '#8aacb8',
                  border: 'none', borderRadius: 10, padding: '6px 14px',
                  fontSize: 12, fontWeight: 700, cursor: COINS >= r.cost ? 'pointer' : 'not-allowed',
                  fontFamily: 'Bricolage Grotesque, sans-serif',
                }}
              >
                {r.cost} 🪙
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: '#8aacb8', textAlign: 'center', marginTop: 16 }}>
          Ganhe moedas completando a semana de estudos e acertando cards de revisão.
        </p>
      </div>
    </div>
  )
}

// ── Chat history drawer ──────────────────────────────────────────────────────
function HistoryDrawer({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (topic: string) => void }) {
  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,58,138,0.2)', zIndex: 50 }} onClick={onClose} />}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: `translateX(calc(-50% + ${open ? '0px' : '-220px'})) translateX(-210px)`,
        width: 220, height: '100%', background: '#fff',
        boxShadow: open ? '4px 0 24px rgba(30,58,138,0.12)' : 'none',
        zIndex: 60, transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '52px 16px 16px', borderBottom: '1px solid #e8f4f6' }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>Conversas anteriores</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {PAST_CHATS.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.topic); onClose() }}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f4f9fa' }}
            >
              <div style={{ fontSize: 11, color: '#8aacb8', marginBottom: 2 }}>{c.date} · {c.msgs} msgs</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1e3a8a', lineHeight: 1.4 }}>{c.topic}</div>
            </button>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e8f4f6' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '10px', background: '#f4f9fa', border: 'none', borderRadius: 10, fontSize: 13, color: '#4a6080', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Fechar
          </button>
        </div>
      </div>
    </>
  )
}

// ── Tutor tab ────────────────────────────────────────────────────────────────
function TutorTab() {
  const [view, setView] = useState<TutorView>('home')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showCoins, setShowCoins] = useState(false)
  const [topic, setTopic] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const startChat = (text: string) => {
    if (!text.trim()) return
    setTopic(text)
    const greeting: Message = { id: 0, role: 'tutor', text: `Boa! Vamos explorar "${text}". O que você já sabe sobre esse assunto?` }
    const userMsg: Message = { id: 1, role: 'student', text }
    setMessages([greeting, userMsg])
    setView('chat')
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now(), role: 'tutor', text: TUTOR_REPLIES[0] }])
      setTyping(false)
    }, 1000)
  }

  const sendInChat = () => {
    if (!input.trim()) return
    const msg: Message = { id: Date.now(), role: 'student', text: input.trim() }
    setMessages(m => [...m, msg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now() + 1, role: 'tutor', text: TUTOR_REPLIES[Math.floor(Math.random() * TUTOR_REPLIES.length)] }])
      setTyping(false)
    }, 1200)
  }

  if (view === 'home') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f9fa' }}>
        <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 20, height: 2.5, background: '#1e3a8a', borderRadius: 2 }} />)}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#1e3a8a', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#e4bb02', fontSize: 16, fontWeight: 800, fontFamily: 'Bricolage Grotesque' }}>Π</span>
          </div>
          <span className="font-display" style={{ fontWeight: 700, fontSize: 16, color: '#1e3a8a' }}>Tutor</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 0' }}>
        {/* Gamification */}
        <GamificationBar onCoinsClick={() => setShowCoins(true)} />

        {/* Greeting */}
        <div style={{ marginBottom: 18 }}>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Olá, Ana! 👋
          </h2>
          <p style={{ fontSize: 14, color: '#4a6080', margin: 0 }}>O que vamos aprender hoje?</p>
        </div>

        {/* Chat input */}
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #c8e0e3', overflow: 'hidden', marginBottom: 16, transition: 'border-color 0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '12px 12px 12px 16px', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startChat(input)}
              placeholder="Digite sua dúvida ou matéria..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: '#1e3a8a', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}
            />
            <button
              onClick={() => startChat(input)}
              disabled={!input.trim()}
              style={{ width: 38, height: 38, background: input.trim() ? '#1e3a8a' : '#e8f4f6', border: 'none', borderRadius: 10, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={input.trim() ? 'white' : '#8aacb8'} strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Quick suggestions */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8aacb8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Sugestões</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {['Equações do 2º grau', 'Funções afins', 'Revolução Francesa', 'Probabilidade', 'Figuras de linguagem'].map(s => (
              <button
                key={s}
                onClick={() => startChat(s)}
                style={{ background: '#fff', border: '1.5px solid #c8e0e3', borderRadius: 20, padding: '7px 13px', fontSize: 13, color: '#1e3a8a', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1e3a8a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#c8e0e3')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Recent chats preview */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#8aacb8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Recentes</p>
            <button onClick={() => setDrawerOpen(true)} style={{ fontSize: 12, color: '#1e3a8a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>ver todas</button>
          </div>
          {PAST_CHATS.slice(0, 3).map(c => (
            <button
              key={c.id}
              onClick={() => startChat(c.topic)}
              style={{ width: '100%', background: '#fff', border: '1.5px solid #e8f4f6', borderRadius: 12, padding: '10px 14px', marginBottom: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 13, color: '#1e3a8a', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>{c.topic}</span>
              <span style={{ fontSize: 11, color: '#8aacb8' }}>{c.date}</span>
            </button>
          ))}
        </div>
      </div>

      <HistoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSelect={startChat} />
      {showCoins && <CoinsModal onClose={() => setShowCoins(false)} />}
    </div>
  )

  // ── Chat view ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8f4f6', background: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 4px 4px 0', display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#1e3a8a" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ width: 34, height: 34, background: '#1e3a8a', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#e4bb02', fontSize: 16, fontWeight: 800, fontFamily: 'Bricolage Grotesque' }}>?</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</div>
          <div style={{ fontSize: 11, color: '#4a6080' }}>Tutor Paideia</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'student' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'tutor' && (
              <div style={{ width: 28, height: 28, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
                <span style={{ color: '#e4bb02', fontSize: 13, fontWeight: 800 }}>?</span>
              </div>
            )}
            <div style={{
              maxWidth: '75%', padding: '10px 14px',
              borderRadius: msg.role === 'student' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'student' ? '#fffac8' : '#c8e0e3',
              border: '1.5px solid', borderColor: msg.role === 'student' ? '#e4d060' : '#a8d0d5',
              fontSize: 14, color: '#1e3a8a', lineHeight: 1.55,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#e4bb02', fontSize: 13, fontWeight: 800 }}>?</span>
            </div>
            <div style={{ background: '#c8e0e3', border: '1.5px solid #a8d0d5', borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1e3a8a', opacity: 0.4 }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e8f4f6', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInChat()}
            placeholder="Continue o raciocínio..."
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '2px solid #c8e0e3', background: '#f4f9fa', fontSize: 14, color: '#1e3a8a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
            onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
          />
          <button onClick={sendInChat} disabled={!input.trim()} style={{ width: 42, height: 42, background: input.trim() ? '#1e3a8a' : '#c8e0e3', border: 'none', borderRadius: 12, cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Revisão tab ──────────────────────────────────────────────────────────────
function RevisaoTab() {
  const [view, setView] = useState<RevisaoView>('subjects')
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[0] | null>(null)
  const [selectedContent, setSelectedContent] = useState<typeof SUBJECTS[0]['contents'][0] | null>(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [doneIds, setDoneIds] = useState<number[]>([])

  const goToContent = (subject: typeof SUBJECTS[0]) => {
    setSelectedSubject(subject)
    setView('contents')
  }
  const goToCards = (content: typeof SUBJECTS[0]['contents'][0]) => {
    setSelectedContent(content)
    setCardIndex(0)
    setFlipped(false)
    setDoneIds([])
    setView('cards')
  }

  const nextCard = () => {
    setFlipped(false)
    setTimeout(() => {
      if (selectedContent) setCardIndex(i => (i + 1) % selectedContent.ankiCards.length)
    }, 200)
  }
  const markDone = () => {
    setDoneIds(d => [...d, cardIndex])
    nextCard()
  }

  // ── Subjects grid ──
  if (view === 'subjects') return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px' }}>Revisão</h2>
      <p style={{ fontSize: 13, color: '#4a6080', margin: '0 0 20px' }}>Escolha uma disciplina para revisar</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SUBJECTS.map(sub => (
          <button
            key={sub.name}
            onClick={() => goToContent(sub)}
            style={{ background: sub.bg, border: `2px solid ${sub.color}22`, borderRadius: 16, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, transition: 'transform 0.12s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ fontSize: 22 }}>{sub.icon}</span>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: sub.color, lineHeight: 1.2 }}>{sub.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {sub.dueCards > 0
                ? <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: sub.color, padding: '2px 7px', borderRadius: 10 }}>{sub.dueCards} para hoje</span>
                : <span style={{ fontSize: 11, color: '#8aacb8' }}>Em dia ✓</span>
              }
            </div>
            <span style={{ fontSize: 10, color: sub.color, opacity: 0.6 }}>{sub.totalCards} cards</span>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Contents list ──
  if (view === 'contents' && selectedSubject) return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <button onClick={() => setView('subjects')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#4a6080', padding: 0, marginBottom: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Disciplinas
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 26 }}>{selectedSubject.icon}</span>
        <div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: selectedSubject.color, margin: 0 }}>{selectedSubject.name}</h2>
          <p style={{ fontSize: 13, color: '#4a6080', margin: 0 }}>Escolha um conteúdo</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {selectedSubject.contents.map((c, i) => (
          <button
            key={i}
            onClick={() => goToCards(c)}
            style={{ background: '#fff', border: `1.5px solid ${c.due > 0 ? selectedSubject.color + '44' : '#e8f4f6'}`, borderRadius: 14, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#8aacb8', marginTop: 2 }}>{c.cards} cards</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {c.due > 0
                ? <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: selectedSubject.color, padding: '3px 9px', borderRadius: 10 }}>{c.due} hoje</span>
                : <span style={{ fontSize: 11, color: '#2d7a4f', fontWeight: 600 }}>✓ em dia</span>
              }
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8aacb8" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Cards view ──
  if (view === 'cards' && selectedContent && selectedSubject) {
    const card = selectedContent.ankiCards[cardIndex]
    return (
      <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
        <button onClick={() => setView('contents')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#4a6080', padding: 0, marginBottom: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          {selectedSubject.name}
        </button>

        <div style={{ marginBottom: 16 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px' }}>{selectedContent.name}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#4a6080', margin: 0 }}>Card {cardIndex + 1} de {selectedContent.ankiCards.length}</p>
            <p style={{ fontSize: 13, color: '#2d7a4f', margin: 0, fontWeight: 600 }}>{doneIds.length} acertados</p>
          </div>
          <div style={{ height: 4, background: '#e8f4f6', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', background: selectedSubject.color, borderRadius: 2, width: `${(doneIds.length / selectedContent.ankiCards.length) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        <div className="card-flip" style={{ height: 220, marginBottom: 20 }} onClick={() => setFlipped(f => !f)}>
          <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="card-face" style={{ background: '#fff', border: `2px solid ${selectedSubject.color}44`, borderRadius: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: selectedSubject.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{selectedSubject.name}</span>
              <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', lineHeight: 1.4, margin: 0 }}>{card.front}</p>
              <p style={{ fontSize: 12, color: '#8aacb8', margin: 0 }}>Toque para ver a resposta</p>
            </div>
            <div className="card-face card-back" style={{ background: selectedSubject.bg, border: `2px solid ${selectedSubject.color}44`, borderRadius: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resposta</span>
              <p style={{ fontSize: 14, color: '#1e3a8a', lineHeight: 1.7, margin: 0 }}>{card.back}</p>
              <p style={{ fontSize: 12, color: '#4a6080', margin: 0 }}>Como você foi?</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={nextCard} style={{ flex: 1, padding: '12px', background: '#f4f9fa', border: '2px solid #e8f4f6', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#4a6080', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Difícil — revisar
          </button>
          <button onClick={markDone} style={{ flex: 1, padding: '12px', background: selectedSubject.color, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Sabia! ✓
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── Ajustes tab ──────────────────────────────────────────────────────────────
function AjustesTab({ onLogout }: { onLogout: () => void }) {
  const handleHelp = () => {
    window.open('https://wa.me/5531996829255?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20app%20Paideia.', '_blank')
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 20 }}>Ajustes</h2>

      <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 16, border: '1.5px solid #e8f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, background: '#c8e0e3', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a' }}>A</span>
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 17, color: '#1e3a8a' }}>Ana Beatriz Silva</div>
            <div style={{ fontSize: 13, color: '#4a6080' }}>8º ano B · Matrícula 2024001234</div>
          </div>
        </div>
        {/* Coins row */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f4f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#4a6080' }}>Moedas acumuladas</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#b8960a' }}>🪙 {COINS}</span>
        </div>
      </div>

      {[
        { label: 'Escola', value: 'Colégio Estadual Dom Pedro' },
        { label: 'Série', value: '8º ano do Ensino Fundamental' },
        { label: 'Professor', value: 'Prof. Carlos Mendes' },
      ].map(item => (
        <div key={item.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '1.5px solid #e8f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#4a6080' }}>{item.label}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1e3a8a' }}>{item.value}</span>
        </div>
      ))}

      {/* Help section */}
      <div style={{ marginTop: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#8aacb8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Ajuda e suporte</p>
        <button
          onClick={handleHelp}
          style={{ width: '100%', background: '#e8f7ef', border: '1.5px solid #a8d8be', borderRadius: 14, padding: '14px 18px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <div style={{ width: 40, height: 40, background: '#25D366', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>Falar com suporte</div>
            <div style={{ fontSize: 12, color: '#4a6080', marginTop: 2 }}>Atendimento rápido pelo WhatsApp · (31) 99682-9255</div>
          </div>
        </button>
      </div>

      <div style={{ height: 8 }} />
      <button onClick={onLogout} style={{ width: '100%', padding: '14px', background: 'transparent', border: '2px solid #e8f4f6', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#8aacb8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        Sair da conta
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function StudentApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('tutor')

  const navItems = [
    { id: 'tutor' as Tab, label: 'Tutor', Icon: ChatIcon },
    { id: 'revisao' as Tab, label: 'Revisão', Icon: CardsIcon },
    { id: 'ajustes' as Tab, label: 'Ajustes', Icon: GearIcon },
  ]

  return (
    <div style={{ background: '#f4f9fa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f9fa' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'tutor' && <TutorTab />}
          {tab === 'revisao' && <RevisaoTab />}
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
