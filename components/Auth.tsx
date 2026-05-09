'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const c = {
  bg: '#EEF2F7',
  card: '#FFFFFF',
  nav: '#1E293B',
  accent: '#3B82F6',
  text: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  border: '#CBD5E1',
  danger: '#EF4444',
  input: '#F8FAFC',
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    width: '100%',
    background: c.input,
    border: `1.5px solid ${c.border}`,
    color: c.text,
    padding: '11px 14px',
    fontSize: 14,
    fontFamily: FONT,
    outline: 'none',
    borderRadius: 8,
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: 500,
    marginBottom: 6,
    display: 'block' as const,
  }

  const handleSignup = async () => {
    if (!name.trim()) return setError('Name is required')
    if (!email.trim()) return setError('Email is required')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email, password, options: { data: { name } }
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('members').upsert({
        id: data.user.id, name: name.trim(), email: email.trim(),
        is_online: true, last_seen: new Date().toISOString()
      })
      await supabase.auth.signInWithPassword({ email, password })
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!email.trim()) return setError('Email is required')
    if (!password.trim()) return setError('Password is required')
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { setError(loginError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('members').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', data.user.id)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', fontFamily: FONT }}>
      {/* Left branding panel */}
      <div style={{ width: '45%', background: c.nav, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 32, height: 32, background: c.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>C</span>
          </div>
          <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>cowork.dev</span>
        </div>
        <h1 style={{ margin: '0 0 16px', fontSize: 36, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
          Your team's<br />shared workspace.
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: '#94A3B8', lineHeight: 1.6 }}>
          Collaborate in real time. Create rooms, manage projects, and work together — all in one place.
        </p>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['Real-time collaboration', 'Room-based workspaces', 'Project management', 'Live video calls'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: c.accent, fontSize: 11 }}>✓</span>
              </div>
              <span style={{ color: '#CBD5E1', fontSize: 14 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: c.text, letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: 14, color: c.textMuted }}>
            {mode === 'login' ? 'Sign in to access your workspace.' : 'Get started for free today.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())} style={inputStyle} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: c.danger, padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={mode === 'login' ? handleLogin : handleSignup}
              disabled={loading}
              style={{ width: '100%', background: loading ? '#93C5FD' : c.accent, border: 'none', color: '#fff', padding: '12px', fontSize: 15, fontWeight: 600, fontFamily: FONT, cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 8, marginTop: 4, boxShadow: loading ? 'none' : '0 2px 8px rgba(59,130,246,0.35)', transition: 'all 0.15s' }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: 14, color: c.textMuted }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ color: c.accent, cursor: 'pointer', fontWeight: 500 }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
