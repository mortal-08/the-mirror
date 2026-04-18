'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { registerUser } from '@/actions/auth'
import Link from 'next/link'
import { UserPlus, Eye, EyeOff, Mail, Lock, User, Sparkles, Check } from 'lucide-react'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const strengthLabels = ['', 'Weak', 'Good', 'Strong']
  const strengthColors = ['', '#ff0055', '#ffbe0b', '#a1ff00']

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

    // Auto sign in after registration
    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (signInResult?.error) {
      setError('Account created but sign-in failed. Please login manually.')
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
            <p className="auth-subtitle">Create your account and start tracking.</p>
            <Link href="/landing" className="auth-preview-link">
              Preview landing page
              <span className="auth-link-arrow">→</span>
            </Link>
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
            <div className={`auth-input-group ${focusedField === 'name' ? 'focused' : ''} ${name ? 'filled' : ''}`}>
              <div className="auth-input-icon">
                <User size={18} />
              </div>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Your name"
                required
                autoFocus
                autoComplete="name"
              />
              <label htmlFor="signup-name">Name</label>
            </div>

            <div className={`auth-input-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'filled' : ''}`}>
              <div className="auth-input-icon">
                <Mail size={18} />
              </div>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <label htmlFor="signup-email">Email</label>
            </div>

            <div className={`auth-input-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'filled' : ''}`}>
              <div className="auth-input-icon">
                <Lock size={18} />
              </div>
              <input
                id="signup-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <label htmlFor="signup-password">Password</label>
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="auth-pw-strength">
                <div className="auth-pw-strength-track">
                  <div
                    className="auth-pw-strength-fill"
                    style={{
                      width: `${(passwordStrength / 3) * 100}%`,
                      background: strengthColors[passwordStrength],
                    }}
                  />
                </div>
                <span className="auth-pw-strength-label" style={{ color: strengthColors[passwordStrength] }}>
                  {passwordStrength === 3 && <Check size={12} />}
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              id="signup-submit"
            >
              <span className="auth-btn-bg" />
              <span className="auth-btn-content">
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <UserPlus size={18} />
                )}
                {loading ? 'Creating account...' : 'Create Account'}
              </span>
            </button>
          </form>

          {/* Footer link */}
          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link href="/login" className="auth-link">
              Sign in
              <span className="auth-link-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
