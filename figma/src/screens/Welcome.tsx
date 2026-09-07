import type { Role } from '../App'

interface Props {
  onSelect: (role: Role) => void
}

const roles: { role: Role; label: string; desc: string }[] = [
  { role: 'student', label: 'Sou aluno', desc: 'Aprenda pensando, não copiando' },
  { role: 'parent', label: 'Sou responsável', desc: 'Acompanhe o progresso do seu filho' },
  { role: 'teacher', label: 'Sou professor', desc: 'Gerencie suas turmas e questões' },
  { role: 'manager', label: 'Sou gestor', desc: 'Visão completa da escola' },
]

export default function Welcome({ onSelect }: Props) {
  return (
    <div style={{ background: '#f4f9fa', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', padding: '0 24px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ paddingTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#1e3a8a', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>Π</span>
            </div>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 22, color: '#1e3a8a', letterSpacing: '-0.3px' }}>Paideia</span>
          </div>
          <span style={{ fontSize: 26, color: '#e4bb02', fontWeight: 700, fontFamily: 'Bricolage Grotesque, sans-serif' }}>?</span>
        </div>

        {/* Hero */}
        <div style={{ paddingTop: 44 }}>
          <h1 className="font-display" style={{ fontSize: 34, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.5px' }}>
            A IA que ensina<br />a <span style={{ fontStyle: 'italic' }}>pensar</span>.
          </h1>
          <p style={{ marginTop: 12, fontSize: 15, color: '#4a6080', lineHeight: 1.6 }}>
            Conduzimos o aluno por perguntas até ele chegar sozinho à conclusão.
          </p>

          {/* Contrast scene */}
          <div style={{ marginTop: 24, borderRadius: 14, overflow: 'hidden', border: '1.5px solid #d0e8ec' }}>
            <div style={{ background: '#fff', padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8aacb8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IA genérica</span>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7a8d', lineHeight: 1.5 }}>
                "Restaram 12 pães." ✓
              </p>
            </div>
            <div style={{ background: '#fffac8', padding: '14px 18px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#b8960a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paideia</span>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#1e3a8a', lineHeight: 1.5, fontWeight: 500 }}>
                "Se vendeu 3/5 dos 120 pães de manhã, quantos foram?" 🤔
              </p>
            </div>
          </div>
        </div>

        {/* Role buttons */}
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map(({ role, label, desc }, i) => (
            <button
              key={role}
              onClick={() => onSelect(role)}
              style={{
                background: i === 0 ? '#1e3a8a' : '#ffffff',
                color: i === 0 ? 'white' : '#1e3a8a',
                border: `2px solid ${i === 0 ? '#1e3a8a' : '#c8e0e3'}`,
                borderRadius: 14,
                padding: '15px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              onMouseEnter={e => {
                if (i !== 0) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f0f7ff'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1e3a8a'
                }
              }}
              onMouseLeave={e => {
                if (i !== 0) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c8e0e3'
                }
              }}
            >
              <div>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px' }}>{label}</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{desc}</div>
              </div>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={i === 0 ? 'white' : '#1e3a8a'} strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '28px 0 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#8aacb8', margin: 0 }}>Coordenação e direção — em breve</p>
        </div>
      </div>
    </div>
  )
}
