'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { LogIn, Eye, EyeOff, Mail, Lock, Orbit, ArrowRight, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="auth-page-split">
      {/* Theme Toggle mapped onto Absolute top right of Auth page */}
      <div className="theme-selector-top">
        <button 
          className="theme-btn" 
          onClick={() => setTheme(isLight ? 'dark' : 'light')} 
          aria-label="Toggle Theme"
        >
          {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="auth-side-form">
        <div className="auth-form-wrapper">
          <Link href="/landing" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '0.9rem', fontWeight: 600 }}>
             <Orbit size={20} color="var(--accent-primary)" />
             Return to Protocol
          </Link>

          <h1 className="auth-title">Initialize Core.</h1>
          <p className="auth-subtitle">Enter your credentials to access your tracking network.</p>

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-warning)', borderTop: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-warning)'}} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <label htmlFor="login-email">Email Node</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'email' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '48px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="transmission@mirror.net"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label htmlFor="login-password">Access Cipher</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'password' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '48px', paddingRight: '48px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}
            >
              {loading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'extremeOrbit 1s infinite linear' }} />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? 'Authenticating...' : 'Engage'}
            </button>
          </form>

          <div style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Unregistered node?{' '}
            <Link href="/signup" style={{ color: 'var(--text-primary)', fontWeight: 700, borderBottom: '1px solid var(--accent-primary)', paddingBottom: '2px', marginLeft: '0.5rem' }}>
              Establish Link <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </div>
        </div>
      </div>

      <div className="auth-side-visual" style={{ backgroundImage: 'url(/elite_time_geometry_1776513726851.png)' }}>
        <div className="auth-quote-card">
          <p>"Time is the coin of your life. It is the only coin you have, and only you can determine how it will be spent. Be careful lest you let other people spend it for you."</p>
          <div className="auth-quote-author">Carl Sandburg</div>
        </div>
        
        {/* Futuristic System Interface Overlay */}
        <div style={{ position: 'absolute', top: '4rem', right: '4rem', zIndex: 10, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)', animation: 'gentlePulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase' }}>System Status: Operational</span>
        </div>
      </div>
    </div>
  )
}
