import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, UploadCloud, FolderOpen, CalendarClock, TrendingUp, Sun, Moon, Menu, X, LogOut } from 'lucide-react'

const NAV_LINKS = [
  { path: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/upload',       label: 'Upload',       icon: UploadCloud },
  { path: '/collections',  label: 'Collections',  icon: FolderOpen },
  { path: '/planner',      label: 'Planner',      icon: CalendarClock },
  { path: '/progress',     label: 'Progress',     icon: TrendingUp },
]

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  
  const handleLogout = () => { logout(); navigate('/login') }
  if (!isAuthenticated) return null

  const initial = (user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-light)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      {/* top glow bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, var(--blue) 20%, var(--cyan) 50%, var(--violet) 80%, transparent 100%)',
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>

          {/* Logo */}
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '11px', overflow: 'hidden',
              background: 'linear-gradient(145deg, var(--bg-card) 0%, var(--bg-deep) 100%)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/ai-logo.png" alt="StudyAI"
                style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
              />
              <span style={{ display: 'none', fontSize: '1.1rem' }}>🧠</span>
            </div>
            <div>
              <span style={{
                fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.01em',
                background: 'linear-gradient(90deg, var(--blue-light) 0%, var(--cyan) 50%, var(--violet) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>StudyCraft</span>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginLeft: '0.3rem' }}></span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '1.5rem' }}>
            {NAV_LINKS.map(({ path, label }) => (
              <Link key={path} to={path} style={{
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: location.pathname === path ? 'var(--blue)' : 'var(--text-secondary)',
                transition: 'color 0.2s',
              }} onMouseEnter={e => e.target.style.color='var(--blue-light)'} onMouseLeave={e => e.target.style.color = location.pathname === path ? 'var(--blue)' : 'var(--text-secondary)'}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            <button onClick={toggleTheme} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center'
            }} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <span className="hidden sm:block" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {user?.name || user?.email}
            </span>

            {/* Avatar */}
            <div className="hidden sm:flex" style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue) 0%, var(--violet) 100%)',
              border: '2px solid var(--border-light)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 700, color: '#fff',
            }}>{initial}</div>

            {/* Logout */}
            <button className="hidden sm:flex" onClick={handleLogout} style={{
              background: 'none', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', cursor: 'pointer', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: 600,
              color: 'rgba(239,68,68,0.8)', transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.borderColor='rgba(239,68,68,0.5)'; e.currentTarget.style.background='rgba(239,68,68,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color='rgba(239,68,68,0.8)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)'; e.currentTarget.style.background='none' }}
            >
              <LogOut size={16} /> Logout
            </button>

            {/* Mobile hamburger */}
            <button className="md:hidden" onClick={() => setMenuOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-primary)', display: 'flex', alignItems: 'center'
            }} aria-label="Toggle menu">
              {menuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden" style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-light)',
          padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          {NAV_LINKS.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.85rem 1rem', borderRadius: '8px', textDecoration: 'none',
              color: location.pathname === path ? 'var(--blue)' : 'var(--text-secondary)',
              background: location.pathname === path ? 'rgba(41,121,255,0.1)' : 'transparent',
              fontSize: '1rem', fontWeight: 600,
              transition: 'all 0.2s ease',
            }}>
              <Icon size={20} /> {label}
            </Link>
          ))}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1rem', borderRadius: '8px', textDecoration: 'none',
            color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem',
          }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      )}
    </nav>
  )
}
