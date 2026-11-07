import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const closeMobileMenu = () => setMobileOpen(false)

  const navigation = [
    {
      label: 'Overview',
      path: '/admin',
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: 'User Management',
      path: '/admin/users',
      icon: Users,
    },
  ]

  return (
    <div className="admin-layout">
      {mobileOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="Close navigation"
          onClick={closeMobileMenu}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <ShieldCheck size={25} />
          </div>

          <div className="admin-brand-copy">
            <strong>StudyCraft</strong>
            <span>ADMINISTRATION</span>
          </div>

          <button
            type="button"
            className="admin-mobile-close"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div className="admin-nav-heading">MANAGEMENT</div>

        <nav className="admin-navigation">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>

            <div className="admin-profile-info">
              <strong>{user?.name || 'Administrator'}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main-area">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="admin-topbar-title">
            <span>StudyCraft</span>
            <span className="admin-topbar-divider">/</span>
            <strong>Administration</strong>
          </div>

          <div className="admin-topbar-status">
            <span className="admin-status-dot" />
            Admin workspace
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
