import { useState, useRef, useEffect } from 'react'

type Tab = 'insights' | 'dashboard' | 'ajustes'

interface InsightMsg {
  id: number
  role: 'manager' | 'ai'
  text: string
}

const seedInsights: InsightMsg[] = [
  { id: 1, role: 'ai', text: 'Bom dia! Aqui estão os destaques da semana:\n\n• 847 sessões ativas (↑12% vs. semana anterior)\n• 3 turmas com domínio médio abaixo de 40% em Frações — recomendo atenção pedagógica\n• Taxa de engajamento dos responsáveis: 68%\n\nO que você quer aprofundar?' },
]

const aiReplies = [
  'As turmas com menor engajamento são o 6º A, 7º B e 8º C. O padrão comum é baixo uso do app em casa — a taxa de sessões fora do horário escolar é inferior a 15%. Sugiro comunicação com os responsáveis dessas turmas.',
  'Em Matemática, os pré-requisitos mais críticos são Frações e Proporcionalidade. Esses dois conceitos bloqueiam o progresso em Funções e Equações. 34% dos alunos estão abaixo do limiar de domínio nesses tópicos.',
  'Os professores que mais utilizam o Construtor de questões têm turmas com 18% mais sessões por aluno. Promover uma formação sobre o recurso pode ajudar.',
  'No ranking de domínio por turma, os melhores resultados estão no 9º ano A (72% médio) e os que precisam de mais suporte estão no 6º ano B (43% médio).',
]

const dashStats = [
  { label: 'Alunos ativos', value: '1.247', trend: '+34', color: '#1e3a8a', icon: '👨‍🎓' },
  { label: 'Responsáveis', value: '892', trend: '+18', color: '#2d7a4f', icon: '👨‍👩‍👧' },
  { label: 'Professores', value: '38', trend: '+2', color: '#b8960a', icon: '🎓' },
  { label: 'Sessões / sem.', value: '3.411', trend: '+12%', color: '#1e3a8a', icon: '💬' },
]

const subjectPerf = [
  { name: 'Matemática', mastery: 62, sessions: 1240, flag: false },
  { name: 'Português', mastery: 74, sessions: 980, flag: false },
  { name: 'Ciências', mastery: 58, sessions: 720, flag: true },
  { name: 'História', mastery: 70, sessions: 560, flag: false },
  { name: 'Geografia', mastery: 55, sessions: 490, flag: true },
  { name: 'Inglês', mastery: 48, sessions: 380, flag: true },
]

const masteryColor = (m: number) => m >= 70 ? '#1e3a8a' : m >= 50 ? '#b8960a' : '#c0392b'

// Icons
const ChatIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
  </svg>
)
const DashIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
  </svg>
)
const GearIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={active ? '#1e3a8a' : '#8aacb8'} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)

function InsightsTab() {
  const [messages, setMessages] = useState<InsightMsg[]>(seedInsights)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const quickQueries = ['Engajamento por turma', 'Pré-requisitos críticos', 'Uso por professor', 'Ranking de domínio']

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = (text?: string) => {
    const txt = text || input.trim()
    if (!txt) return
    setMessages(m => [...m, { id: Date.now(), role: 'manager', text: txt }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now() + 1, role: 'ai', text: aiReplies[Math.floor(Math.random() * aiReplies.length)] }])
      setTyping(false)
    }, 1400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8f4f6', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#1e3a8a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#e4bb02', fontSize: 18, fontWeight: 800, fontFamily: 'Bricolage Grotesque' }}>Π</span>
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: '#1e3a8a' }}>Insights da Escola</div>
            <div style={{ fontSize: 11, color: '#4a6080' }}>Colégio Estadual Dom Pedro · 2026</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'manager' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'ai' && (
              <div style={{ width: 28, height: 28, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
                <span style={{ color: '#e4bb02', fontSize: 13, fontWeight: 800 }}>Π</span>
              </div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px',
              borderRadius: msg.role === 'manager' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'manager' ? '#c8e0e3' : '#fff',
              border: '1.5px solid',
              borderColor: msg.role === 'manager' ? '#a8d0d5' : '#e8f4f6',
              fontSize: 14, color: '#1e3a8a', lineHeight: 1.6, whiteSpace: 'pre-line',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#e4bb02', fontSize: 13, fontWeight: 800 }}>Π</span>
            </div>
            <div style={{ background: '#fff', border: '1.5px solid #e8f4f6', borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1e3a8a', opacity: 0.4 }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px 12px', borderTop: '1px solid #e8f4f6', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {quickQueries.map(q => (
            <button key={q} onClick={() => send(q)} style={{
              background: '#f4f9fa', border: '1.5px solid #c8e0e3', borderRadius: 16,
              padding: '5px 10px', fontSize: 11, color: '#1e3a8a', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            }}>
              {q}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Pergunte sobre a escola..."
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '2px solid #c8e0e3', background: '#f4f9fa', fontSize: 14, color: '#1e3a8a', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
            onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
          />
          <button onClick={() => send()} disabled={!input.trim()} style={{ width: 42, height: 42, background: input.trim() ? '#1e3a8a' : '#c8e0e3', border: 'none', borderRadius: 12, cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardTab() {
  const [section, setSection] = useState<'escola' | 'professores' | 'responsaveis' | 'desempenho'>('escola')

  const sectionTabs = [
    { id: 'escola' as const, label: 'Escola' },
    { id: 'professores' as const, label: 'Professores' },
    { id: 'responsaveis' as const, label: 'Responsáveis' },
    { id: 'desempenho' as const, label: 'Desempenho' },
  ]

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 4px' }}>Dashboard</h2>
      <p style={{ fontSize: 13, color: '#4a6080', margin: '0 0 16px' }}>Visão completa · Semana de 01–07 set. 2026</p>

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
        {sectionTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            style={{
              padding: '7px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              border: '2px solid', borderColor: section === t.id ? '#1e3a8a' : '#c8e0e3',
              background: section === t.id ? '#1e3a8a' : '#fff',
              color: section === t.id ? 'white' : '#1e3a8a',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'escola' && (
        <div>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {dashStats.map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #e8f4f6' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div className="font-display" style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#4a6080', marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2d7a4f', marginTop: 4 }}>{s.trend} esta semana</div>
              </div>
            ))}
          </div>

          {/* Usage bar chart (sparkline) */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e8f4f6', marginBottom: 16 }}>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 14 }}>Sessões por dia</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
              {[420, 510, 390, 580, 640, 210, 190].map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: i === 4 ? '#1e3a8a' : '#c8e0e3', borderRadius: '4px 4px 0 0', height: `${(v / 640) * 52}px`, transition: 'height 0.3s' }} />
                  <span style={{ fontSize: 9, color: '#8aacb8' }}>{['S','T','Q','Q','S','S','D'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'professores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['Ana Lima', 'Carlos Mendes', 'Fátima Rocha', 'Joaquim Faria', 'Renata Costa'].map((name, i) => {
            const usage = [88, 74, 62, 45, 91][i]
            const turmas = [3, 2, 4, 2, 3][i]
            return (
              <div key={name} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #e8f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>Prof. {name}</div>
                    <div style={{ fontSize: 12, color: '#4a6080' }}>{turmas} turmas</div>
                  </div>
                  <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: masteryColor(usage) }}>{usage}%</span>
                </div>
                <div style={{ height: 6, background: '#f4f9fa', borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: usage >= 70 ? '#1e3a8a' : '#e4bb02', width: `${usage}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#8aacb8', marginTop: 4 }}>Engajamento na plataforma</div>
              </div>
            )
          })}
        </div>
      )}

      {section === 'responsaveis' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Ativados', value: '892', pct: '71%', color: '#1e3a8a' },
              { label: 'Pendentes', value: '355', pct: '29%', color: '#b8960a' },
              { label: 'Consultaram semana', value: '608', pct: '68%', color: '#2d7a4f' },
              { label: 'Nunca acessaram', value: '284', pct: '32%', color: '#c0392b' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #e8f4f6' }}>
                <div className="font-display" style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#4a6080' }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginTop: 4 }}>{s.pct}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fffac8', border: '1.5px solid #e4bb02', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
              <strong>Ação recomendada:</strong> 284 responsáveis nunca acessaram. Envie um lembrete de ativação para aumentar o engajamento familiar.
            </p>
          </div>
        </div>
      )}

      {section === 'desempenho' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subjectPerf.map(sub => (
            <div key={sub.name} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${sub.flag ? '#ffd5d5' : '#e8f4f6'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{sub.name}</span>
                  {sub.flag && <span style={{ fontSize: 10, fontWeight: 600, background: '#ffd5d5', color: '#c0392b', padding: '2px 6px', borderRadius: 4 }}>Atenção</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#8aacb8' }}>{sub.sessions} sessões</span>
                  <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: masteryColor(sub.mastery) }}>{sub.mastery}%</span>
                </div>
              </div>
              <div style={{ height: 6, background: '#f4f9fa', borderRadius: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, background: sub.mastery >= 70 ? '#1e3a8a' : sub.mastery >= 50 ? '#e4bb02' : '#e8b4b8', width: `${sub.mastery}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AjustesTab({ onLogout }: { onLogout: () => void }) {
  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 20 }}>Ajustes</h2>

      <div style={{ background: '#fff', borderRadius: 16, padding: '18px', marginBottom: 16, border: '1.5px solid #e8f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, background: '#1e3a8a', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#e4bb02' }}>R</span>
          </div>
          <div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 17, color: '#1e3a8a' }}>Roberto Alves</div>
            <div style={{ fontSize: 13, color: '#4a6080' }}>roberto.alves@escola.edu.br</div>
          </div>
        </div>
      </div>

      {[
        { label: 'Escola', value: 'Colégio Estadual Dom Pedro' },
        { label: 'Rede', value: 'Rede Estadual SP · Zona Norte' },
        { label: 'Contrato', value: 'Ativo · 1.247 matrículas' },
        { label: 'Versão', value: 'Paideia MVP · jun. 2026' },
      ].map(item => (
        <div key={item.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '1.5px solid #e8f4f6', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#4a6080' }}>{item.label}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1e3a8a' }}>{item.value}</span>
        </div>
      ))}

      <div style={{ background: '#c8e0e3', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
          <strong>LGPD:</strong> Dados de menores protegidos conforme a lei. Nenhum dado bruto de conversa é exposto neste painel.
        </p>
      </div>

      <button onClick={onLogout} style={{ width: '100%', padding: '14px', background: 'transparent', border: '2px solid #e8f4f6', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#8aacb8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        Sair da conta
      </button>
    </div>
  )
}

export default function ManagerApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('insights')

  const navItems = [
    { id: 'insights' as Tab, label: 'Insights', Icon: ChatIcon },
    { id: 'dashboard' as Tab, label: 'Dashboard', Icon: DashIcon },
    { id: 'ajustes' as Tab, label: 'Ajustes', Icon: GearIcon },
  ]

  return (
    <div style={{ background: '#f4f9fa', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f9fa' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'insights' && <InsightsTab />}
          {tab === 'dashboard' && <DashboardTab />}
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
