'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'cyberpunk' | 'sunset'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('mirror-theme') as Theme | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mirror-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'dark', label: 'Midnight', color: '#6366f1' },
  { id: 'light', label: 'Daylight', color: '#f5f5ff' },
  { id: 'cyberpunk', label: 'Cyber', color: '#00ffc8' },
  { id: 'sunset', label: 'Sunset', color: '#ff6b6b' },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-selector">
      {THEMES.map((t) => (
        <button
          key={t.id}
          className={`theme-dot ${theme === t.id ? 'active' : ''}`}
          style={{ background: t.color }}
          onClick={() => setTheme(t.id)}
          title={t.label}
        />
      ))}
    </div>
  )
}
