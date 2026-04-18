'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { LogIn, Eye, EyeOff, Mail, Lock, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

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
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />
      <div className="auth-bg-orb auth-bg-orb-3" />
      <div className="auth-bg-grid" />

      <div className="auth-container">
        <div className="auth-card">
          {/* Glow ring behind card */}
          <div className="auth-card-glow" />
          
          {/* Logo */}
          <div className="auth-logo-section">
            <div className="auth-logo-icon">
              <Sparkles size={28} />
            </div>
            <h1 className="auth-logo">The Mirror</h1>
            <p className="auth-subtitle">Welcome back. See your reflection.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert">
              <div className="auth-error-dot" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className={`auth-input-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'filled' : ''}`}>
              <div className="auth-input-icon">
                <Mail size={18} />
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                required
                autoFocus
                autoComplete="email"
              />
              <label htmlFor="login-email">Email</label>
            </div>

            <div className={`auth-input-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'filled' : ''}`}>
              <div className="auth-input-icon">
                <Lock size={18} />
              </div>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <label htmlFor="login-password">Password</label>
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              id="login-submit"
            >
              <span className="auth-btn-bg" />
              <span className="auth-btn-content">
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <LogIn size={18} />
                )}
                {loading ? 'Signing in...' : 'Sign In'}
              </span>
            </button>
          </form>

          {/* Footer link */}
          <div className="auth-footer">
            <span>Don&apos;t have an account?</span>
            <Link href="/signup" className="auth-link">
              Create one
              <span className="auth-link-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
