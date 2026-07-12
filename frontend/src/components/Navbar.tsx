import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function WaveMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 dark:bg-white">
      <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="#0E9366" strokeWidth="2.4" strokeLinecap="round">
        <path d="M8 13v6M13 9v14M18 11v10M23 14v4" />
      </svg>
    </span>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2.5 12h2M19.5 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M20.354 15.354A9 9 0 1 1 8.646 3.646a9.003 9.003 0 0 0 11.708 11.708Z" />
    </svg>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Persist only on an explicit toggle, so an auto-resolved theme doesn't get
  // pinned on first visit and the app keeps following the OS until the user chooses.
  function toggle() {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('theme', next)
      } catch {
        /* localStorage unavailable — theme just won't persist */
      }
      return next
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
      className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const onApp = pathname === '/app'
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/80 bg-paper/80 backdrop-blur-md transition-colors duration-200 dark:border-white/10 dark:bg-ink-950/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="focus-ring flex items-center gap-2.5 rounded-lg font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-white"
        >
          <WaveMark />
          Minutes
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              onApp
                ? 'bg-ink-100 text-ink-900 dark:bg-white/[0.08] dark:text-white'
                : 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100'
            }`}
          >
            {onApp ? 'Analyzing' : 'Analyze'}
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
