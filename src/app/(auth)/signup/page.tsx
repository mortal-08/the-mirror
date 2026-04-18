'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { registerUser } from '@/actions/auth'
import Link from 'next/link'
import { UserPlus, Eye, EyeOff, Mail, Lock, User, Orbit, ArrowRight, Check, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthLabels = ['', 'Weak', 'Operational', 'Secure']
  const strengthColors = ['', '#ff0055', '#ffbe0b', '#00ffcc']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Cipher must be at least 6 characters.')
      setLoading(false)
      return
    }

    const result = await registerUser(name, email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (signInResult?.error) {
      setError('Link formulated, but handshake failed. Please login manually.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="auth-page-split">
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
        <div className="auth-form-wrapper" style={{ animationDelay: '100ms' }}>
          <Link href="/landing" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '0.9rem', fontWeight: 600 }}>
             <Orbit size={20} color="var(--accent-primary)" />
             Return to Protocol
          </Link>

          <h1 className="auth-title">Formulate Node.</h1>
          <p className="auth-subtitle">Establish your identity within the network.</p>

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-warning)', borderTop: '1px solid var(--surface-border)', borderRight: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-warning)'}} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ position: 'relative' }}>
              <label htmlFor="signup-name">Alias</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'name' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input
                  id="signup-name"
                  type="text"
                  className="input"
                  style={{ paddingLeft: '48px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your Designation"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label htmlFor="signup-email">Transmission Vector (Email)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'email' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input
                  id="signup-email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '48px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="vector@mirror.net"
                  required
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label htmlFor="signup-password">Access Cipher</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'password' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '48px', paddingRight: '48px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Min 6 characters"
                  required
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

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '-0.5rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(passwordStrength / 3) * 100}%`, 
                    background: strengthColors[passwordStrength],
                    transition: 'width 0.3s ease, background 0.3s ease'
                  }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: strengthColors[passwordStrength], display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {passwordStrength === 3 && <Check size={12} />}
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}
            >
              {loading ? (
                 <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'extremeOrbit 1s infinite linear' }} />
              ) : (
                <UserPlus size={18} />
              )}
              {loading ? 'Compiling Node...' : 'Establish Network'}
            </button>
          </form>

          <div style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already initialized?{' '}
            <Link href="/login" style={{ color: 'var(--text-primary)', fontWeight: 700, borderBottom: '1px solid var(--accent-primary)', paddingBottom: '2px', marginLeft: '0.5rem' }}>
              Engage Link <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </div>
        </div>
      </div>

      <div className="auth-side-visual" style={{ backgroundImage: 'url(/elite_time_geometry_1776513726851.png)' }}>
        <div className="auth-quote-card">
          <p>"Amateurs sit and wait for inspiration, the rest of us just get up and go to work."</p>
          <div className="auth-quote-author">Stephen King</div>
        </div>
        
        {/* Futuristic System Interface Overlay */}
        <div style={{ position: 'absolute', top: '4rem', right: '4rem', zIndex: 10, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)', animation: 'gentlePulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fff', letterSpacing: '0.2em', textTransform: 'uppercase' }}>New Node Creation: Active</span>
        </div>
      </div>
    </div>
  )
}
