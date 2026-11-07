import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  Users,
  ShieldCheck,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  UserRound,
  CalendarDays,
} from 'lucide-react'
import api from '../api/axios'

function formatDate(value) {
  if (!value) return 'Unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unavailable'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 0,
    per_page: 20,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsers = useCallback(async (currentPage = page, searchTerm = search) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/admin/users', {
        params: {
          search: searchTerm.trim() || undefined,
          page: currentPage,
          per_page: 20,
        },
      })

      const data = response.data

      setUsers(data.users || [])
      setPagination({
        total: data.total || 0,
        total_pages: data.total_pages || 0,
        per_page: data.per_page || 20,
      })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load registered users.'
      )
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadUsers(1, search)
    }, 350)

    return () => clearTimeout(timeout)
  }, [search, loadUsers])

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.total_pages) return
    setPage(nextPage)
    loadUsers(nextPage, search)
  }

  const studentCount = users.filter((user) => user.role === 'student').length
  const adminCount = users.filter((user) => user.role === 'admin').length

  return (
    <div className="admin-users-page">
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">ACCOUNT DIRECTORY</span>
          <h1>User Management</h1>
          <p>View registered accounts and monitor platform membership.</p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() => loadUsers(page, search)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'admin-spinning' : ''} />
          <span>Refresh</span>
        </button>
      </section>

      <section className="admin-user-summary">
        <article className="admin-user-summary-card">
          <div className="admin-summary-icon blue">
            <Users size={20} />
          </div>
          <div>
            <span>Total matching users</span>
            <strong>{pagination.total.toLocaleString()}</strong>
          </div>
        </article>

        <article className="admin-user-summary-card">
          <div className="admin-summary-icon cyan">
            <GraduationCap size={20} />
          </div>
          <div>
            <span>Students on this page</span>
            <strong>{studentCount}</strong>
          </div>
        </article>

        <article className="admin-user-summary-card">
          <div className="admin-summary-icon purple">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span>Admins on this page</span>
            <strong>{adminCount}</strong>
          </div>
        </article>
      </section>

      <section className="admin-panel admin-users-panel">
        <div className="admin-users-toolbar">
          <div>
            <span className="admin-eyebrow">REGISTERED ACCOUNTS</span>
            <h2>All Users</h2>
          </div>

          <div className="admin-search-box">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search users by name or email"
            />
          </div>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => loadUsers(page, search)}>
              Retry
            </button>
          </div>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>REGISTRATION DATE</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3">
                    <div className="admin-table-state">
                      <span className="admin-loading-spinner" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="3">
                    <div className="admin-table-state">
                      <UserRound size={27} />
                      {error ? 'User list unavailable.' : 'No users found.'}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="admin-user-identity">
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`admin-role-badge ${user.role}`}>
                        {user.role === 'admin' ? (
                          <ShieldCheck size={14} />
                        ) : (
                          <GraduationCap size={14} />
                        )}
                        {user.role || 'Unknown'}
                      </span>
                    </td>

                    <td>
                      <span className="admin-user-date">
                        <CalendarDays size={15} />
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>
            Showing {users.length ? (page - 1) * pagination.per_page + 1 : 0}
            {' '}to{' '}
            {Math.min(page * pagination.per_page, pagination.total)}
            {' '}of {pagination.total} users
          </span>

          <div className="admin-pagination-controls">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <span>
              Page {page} of {Math.max(pagination.total_pages, 1)}
            </span>

            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pagination.total_pages || loading}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
