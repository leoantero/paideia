import { useState, useRef, useEffect } from 'react'

type Tab = 'painel' | 'conselheiro' | 'ajustes'

const children = [
  {
    name: 'Ana Beatriz',
    grade: '8º ano B',
    subjects: [
      { name: 'Matemática', mastery: 72, trend: 'up', sessions: 14 },
      { name: 'Português', mastery: 85, trend: 'stable', sessions: 9 },
      { name: 'Física', mastery: 48, trend: 'down', sessions: 6 },
      { name: 'História', mastery: 63, trend: 'up', sessions: 11 },
      { name: 'Biologia', mastery: 79, trend: 'up', sessions: 8 },
    ],
  },
  {
    name: 'Pedro Henrique',
    grade: '5º ano A',
    subjects: [
      { name: 'Matemática', mastery: 55, trend: 'up', sessions: 10 },
      { name: 'Português', mastery: 68, trend: 'stable', sessions: 7 },
    ],
  },
]

const trendIcon = (t: string) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→'
const trendColor = (t: string) => t === 'up' ? '#2d7a4f' : t === 'down' ? '#c0392b' : '#8aacb8'

const masteryColor = (m: number) => m >= 70 ? '#1e3a8a' : m >= 50 ? '#b8960a' : '#c0392b'

interface ConMsg { id: number; role: 'parent' | 'advisor'; text: string }

const seedConvo: ConMsg[] = [
  { id: 1, role: 'advisor', text: 'Olá! Analisei o progresso da Ana Beatriz esta semana. Ela está se saindo muito bem em Português (85% de domínio) e em Biologia. Quer falar sobre Física? O domínio caiu para 48%.' },
]

const advisorReplies = [
  'Em casa, você pode pedir que ela explique o conceito com as próprias palavras — sem olhar o caderno. Isso ativa a memória de longa duração.',
  'O ponto de dificuldade dela está em pré-requisitos de séries anteriores. Não é preguiça; é uma lacuna específica que o Paideia já mapeou.',
  'Uma estratégia eficaz: reserve 15 minutos antes de dormir para ela revisar um conceito do dia. A consolidação da memória acontece no sono.',
  'Os dados mostram melhora consistente nas últimas 3 semanas em Matemática. Continue encorajando — ela está no caminho certo.',
]

// Icons
const DashIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const ChatIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
  </svg>
)
const GearIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)

function PainelTab() {
  const [selectedChild, setSelectedChild] = useState(0)
  const child = children[selectedChild]

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px' }}>Painel</h2>
      <p style={{ fontSize: 13, color: '#4a6080', margin: '0 0 20px' }}>Domínio por matéria e conceito</p>

      {/* Child selector */}
      {children.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {children.map((c, i) => (
            <button
              key={i}
              onClick={() => setSelectedChild(i)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: '2px solid',
                borderColor: selectedChild === i ? '#1e3a8a' : '#c8e0e3',
                background: selectedChild === i ? '#1e3a8a' : '#fff',
                color: selectedChild === i ? 'white' : '#1e3a8a',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Child info */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 16, border: '1.5px solid #e8f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, background: '#c8e0e3', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a' }}>{child.name[0]}</span>
        </div>
        <div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 16, color: '#1e3a8a' }}>{child.name}</div>
          <div style={{ fontSize: 13, color: '#4a6080' }}>{child.grade}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#8aacb8' }}>Média geral</div>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a' }}>
            {Math.round(child.subjects.reduce((acc, s) => acc + s.mastery, 0) / child.subjects.length)}%
          </div>
        </div>
      </div>

      {/* Subject list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {child.subjects.map(sub => (
          <div key={sub.name} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #e8f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{sub.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#8aacb8' }}>{sub.sessions} sessões</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: trendColor(sub.trend) }}>{trendIcon(sub.trend)}</span>
                <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: masteryColor(sub.mastery) }}>{sub.mastery}%</span>
              </div>
            </div>
            <div style={{ height: 8, background: '#f4f9fa', borderRadius: 4 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: sub.mastery >= 70 ? '#1e3a8a' : sub.mastery >= 50 ? '#e4bb02' : '#e8b4b8',
                width: `${sub.mastery}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffac8', border: '1.5px solid #e4bb02', borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
          <strong>Privacidade:</strong> Você vê domínio e tendência — nunca as conversas do seu filho com o Tutor.
        </p>
      </div>
    </div>
  )
}

function ConselheiroTab() {
  const [messages, setMessages] = useState<ConMsg[]>(seedConvo)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = () => {
    if (!input.trim()) return
    const msg: ConMsg = { id: Date.now(), role: 'parent', text: input.trim() }
    setMessages(m => [...m, msg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now() + 1, role: 'advisor', text: advisorReplies[Math.floor(Math.random() * advisorReplies.length)] }])
      setTyping(false)
    }, 1300)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8f4f6', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#e4bb02', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>💡</span>
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: '#1e3a8a' }}>Conselheiro</div>
            <div style={{ fontSize: 11, color: '#4a6080' }}>Lê o progresso · não as conversas</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'parent' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'advisor' && (
              <div style={{ width: 28, height: 28, background: '#e4bb02', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
                <span style={{ fontSize: 14 }}>💡</span>
              </div>
            )}
            <div style={{
              maxWidth: '75%', padding: '10px 14px',
              borderRadius: msg.role === 'parent' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'parent' ? '#c8e0e3' : '#fff',
              border: '1.5px solid',
              borderColor: msg.role === 'parent' ? '#a8d0d5' : '#e8f4f6',
              fontSize: 14, color: '#1e3a8a', lineHeight: 1.55,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#e4bb02', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>💡</span>
            </div>
            <div style={{ background: '#fff', border: '1.5px solid #e8f4f6', borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 4 }}>
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
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Como posso ajudar em casa?"
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '2px solid #c8e0e3', background: '#f4f9fa', fontSize: 14, color: '#1e3a8a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
            onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
          />
          <button onClick={send} disabled={!input.trim()} style={{ width: 42, height: 42, background: input.trim() ? '#1e3a8a' : '#c8e0e3', border: 'none', borderRadius: 12, cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function AjustesTab({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 20 }}>Ajustes</h2>

      <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 16, border: '1.5px solid #e8f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, background: '#e4bb02', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a' }}>M</span>
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 17, color: '#1e3a8a' }}>Maria da Silva</div>
            <div style={{ fontSize: 13, color: '#4a6080' }}>maria.silva@gmail.com</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 10, border: '1.5px solid #e8f4f6' }}>
        <div style={{ fontSize: 12, color: '#8aacb8', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Filhos vinculados</div>
        {children.map(c => (
          <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f4f9fa' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{c.name}</span>
            <span style={{ fontSize: 13, color: '#4a6080' }}>{c.grade}</span>
          </div>
        ))}
      </div>

      {[
        { label: 'Escola', value: 'Colégio Estadual Dom Pedro' },
        { label: 'Notificações', value: 'Ativadas' },
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

export default function ParentApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('painel')

  const navItems = [
    { id: 'painel' as Tab, label: 'Painel', Icon: DashIcon },
    { id: 'conselheiro' as Tab, label: 'Conselheiro', Icon: ChatIcon },
    { id: 'ajustes' as Tab, label: 'Ajustes', Icon: GearIcon },
  ]

  return (
    <div style={{ background: '#f4f9fa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f9fa' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'painel' && <PainelTab />}
          {tab === 'conselheiro' && <ConselheiroTab />}
          {tab === 'ajustes' && <AjustesTab onLogout={onLogout} />}
        </div>

        <div style={{ background: '#fff', borderTop: '1px solid #e8f4f6', padding: '8px 0 16px', display: 'flex' }}>
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
