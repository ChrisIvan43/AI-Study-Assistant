
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  UploadCloud,
  FolderOpen,
  CalendarClock,
  TrendingUp,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  GraduationCap,
  PanelLeftClose,
} from 'lucide-react'

const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: UploadCloud },
  { path: '/collections', label: 'Collections', icon: FolderOpen },
  { path: '/planner', label: 'Planner', icon: CalendarClock },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
]

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const toggleTheme = () => {
    setTheme((previous) => previous === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  if (!isAuthenticated) return null

  const initial = (
    user?.name?.[0] || user?.email?.[0] || '?'
  ).toUpperCase()

  return (
    <>
      {/* Mobile top bar */}
      <header className="sidebar-mobile-header">
        <button
          type="button"
          className="sidebar-icon-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          aria-expanded={menuOpen}
        >
          <Menu size={23} />
        </button>

        <Link to="/dashboard" className="sidebar-mobile-brand">
          <GraduationCap size={25} />
          <span>StudyCraft</span>
        </Link>

        <button
          type="button"
          className="sidebar-icon-button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Mobile backdrop */}
      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Main sidebar */}
      <aside
        className={`app-sidebar ${menuOpen ? 'sidebar-open' : ''}`}
        aria-label="Main navigation"
      >
        {/* Branding */}
        <div className="sidebar-brand">
          <Link to="/dashboard" className="sidebar-brand-link">
            <div className="sidebar-logo">
              <img
                src="/ai-logo.png"
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <GraduationCap className="sidebar-logo-fallback" size={25} />
            </div>

            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">StudyCraft</span>
              <span className="sidebar-brand-caption">AI STUDY WORKSPACE</span>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={21} />
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-navigation">
          <p className="sidebar-section-label">WORKSPACE</p>

          <nav className="sidebar-nav-links">
            {NAV_LINKS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path

              return (
                <Link
                  key={path}
                  to={path}
                  className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                  <span>{label}</span>
                  {isActive && <span className="sidebar-active-indicator" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom controls */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-theme-button"
            onClick={toggleTheme}
          >
            <span className="sidebar-theme-icon">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </span>
            <span>{theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span>
          </button>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>

            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user?.name || 'Student'}
              </span>
              <span className="sidebar-user-email">
                {user?.email || 'Signed in'}
              </span>
            </div>

            <button
              type="button"
              className="sidebar-logout-button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>

          <div className="sidebar-footer">
            <span>StudyCraft</span>
            <span>AI-powered learning</span>
          </div>
        </div>
      </aside>
    </>
  )
}
