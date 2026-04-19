'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { registerUser } from '@/actions/auth'
import Link from 'next/link'
import { UserPlus, Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [particles, setParticles] = useState<{x:number;y:number;s:number;d:number;del:number}[]>([])
  
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'

  useEffect(() => {
    setParticles(Array.from({ length: 15 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 4 + 2, d: Math.random() * 12 + 8, del: Math.random() * 5,
    })))
  }, [])

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong']
  const strengthColors = ['', '#ff0055', '#ffbe0b', 'var(--accent-primary)']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
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
      setError('Account created! Please sign in manually.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="auth-page-split">
      <div className="theme-selector-top">
        <button className="theme-btn" onClick={() => setTheme(isLight ? 'dark' : 'light')} aria-label="Toggle Theme">
          {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="auth-side-form">
        {/* Floating particles */}
        {particles.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.1, animation: `particleFloat ${p.d}s ease-in-out ${p.del}s infinite alternate`, pointerEvents: 'none' }} />
        ))}

        <div className="auth-form-wrapper" style={{ animationDelay: '100ms' }}>
          <Link href="/landing" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>
             <img src="/icon-512.svg" alt="The Mirror" width={20} height={20} />
             Back to Home
          </Link>

          <h1 className="auth-title">Create your account.</h1>
          <p className="auth-subtitle">Join Mirror and start tracking your time with clarity.</p>

          {error && (
            <div role="alert" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-warning)', border: '1px solid var(--surface-border)', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-warning)'}} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label htmlFor="signup-name">Full Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'name' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input id="signup-name" type="text" style={{ paddingLeft: '48px' }} value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} placeholder="Your name" required autoFocus />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email">Email</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'email' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input id="signup-email" type="email" style={{ paddingLeft: '48px' }} value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password">Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', color: focusedField === 'password' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'color 0.3s' }} />
                <input id="signup-password" type={showPw ? 'text' : 'password'} style={{ paddingLeft: '48px', paddingRight: '48px' }} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} placeholder="Min 6 characters" required />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password strength */}
            {password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '-0.5rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(passwordStrength / 3) * 100}%`, background: strengthColors[passwordStrength], transition: 'width 0.3s ease, background 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: strengthColors[passwordStrength], display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {passwordStrength === 3 && <Check size={12} />}
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
              {loading ? (
                 <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'extremeOrbit 1s infinite linear' }} />
              ) : (
                <UserPlus size={18} />
              )}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}>
              Sign in <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </div>
        </div>
      </div>

      <div className="auth-side-visual" style={{ backgroundImage: 'url(/elite_time_geometry_1776513726851.png)' }}>
        <div className="auth-quote-card">
          <p>"Arise, awake, and stop not till the goal is reached."</p>
          <div className="auth-quote-author">Swami Vivekananda</div>
        </div>
        
        <div style={{ position: 'absolute', top: '4rem', right: '4rem', zIndex: 10, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)', animation: 'gentlePulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Mirror Active</span>
        </div>
      </div>
    </div>
  )
}
