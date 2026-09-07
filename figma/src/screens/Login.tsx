import { useState } from 'react'
import type { Role } from '../App'

interface Props {
  role: Role
  onBack: () => void
  onLogin: () => void
}

const config: Record<Role, { title: string; subtitle: string; fieldLabel: string; fieldType: string; fieldPlaceholder: string }> = {
  student: {
    title: 'Entrar como aluno',
    subtitle: 'Use sua matrícula escolar para acessar.',
    fieldLabel: 'Matrícula',
    fieldType: 'text',
    fieldPlaceholder: 'Ex: 2024001234',
  },
  parent: {
    title: 'Entrar como responsável',
    subtitle: 'Acesse com o e-mail cadastrado na escola.',
    fieldLabel: 'E-mail',
    fieldType: 'email',
    fieldPlaceholder: 'seu@email.com',
  },
  teacher: {
    title: 'Entrar como professor',
    subtitle: 'Acesse com seu e-mail institucional.',
    fieldLabel: 'E-mail',
    fieldType: 'email',
    fieldPlaceholder: 'professor@escola.edu.br',
  },
  manager: {
    title: 'Entrar como gestor',
    subtitle: 'Acesse com seu e-mail de gestão.',
    fieldLabel: 'E-mail',
    fieldType: 'email',
    fieldPlaceholder: 'gestor@escola.edu.br',
  },
}

const roleColors: Record<Role, string> = {
  student: '#1e3a8a',
  parent: '#1e3a8a',
  teacher: '#1e3a8a',
  manager: '#1e3a8a',
}

export default function Login({ role, onBack, onLogin }: Props) {
  const [field, setField] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const c = config[role]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 900)
  }

  return (
    <div style={{ background: '#f4f9fa', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', padding: '0 24px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ paddingTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#4a6080', padding: 0 }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Voltar</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#1e3a8a', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 17 }}>Π</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div style={{ paddingTop: 40 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a', margin: 0, letterSpacing: '-0.4px' }}>
            {c.title}
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: '#4a6080', lineHeight: 1.6 }}>{c.subtitle}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 6 }}>
              {c.fieldLabel}
            </label>
            <input
              type={c.fieldType}
              value={field}
              onChange={e => setField(e.target.value)}
              placeholder={c.fieldPlaceholder}
              required
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: '2px solid #c8e0e3',
                background: '#fff',
                fontSize: 15,
                color: '#1e3a8a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
              onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e3a8a', marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: '2px solid #c8e0e3',
                background: '#fff',
                fontSize: 15,
                color: '#1e3a8a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onFocus={e => (e.target.style.borderColor = '#1e3a8a')}
              onBlur={e => (e.target.style.borderColor = '#c8e0e3')}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <a href="#" style={{ fontSize: 13, color: '#4a6080', textDecoration: 'none' }} onClick={e => e.preventDefault()}>
              Esqueci minha senha
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              background: loading ? '#8aacb8' : roleColors[role],
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '15px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Bricolage Grotesque, sans-serif',
              letterSpacing: '-0.2px',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {role === 'parent' && (
          <div style={{ marginTop: 24, padding: '14px 18px', background: '#fffac8', border: '1.5px solid #e4bb02', borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
              <strong>Primeiro acesso?</strong> Verifique seu e-mail — a escola enviou um link de ativação.
            </p>
          </div>
        )}

        {role === 'student' && (
          <div style={{ marginTop: 24, padding: '14px 18px', background: '#c8e0e3', borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
              <strong>Primeiro acesso?</strong> Use sua matrícula e crie uma senha ao entrar pela primeira vez.
            </p>
          </div>
        )}

        <div style={{ marginTop: 'auto', padding: '28px 0 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#8aacb8', margin: 0 }}>Paideia · Educação com IA · LGPD compliant</p>
        </div>
      </div>
    </div>
  )
}
