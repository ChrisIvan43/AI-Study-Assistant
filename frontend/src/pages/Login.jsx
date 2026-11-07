import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const res = await api.post('/login', form)
      login(res.data.access_token, res.data.user)
      toast.success('Welcome back, ' + res.data.user.name + '!')
      navigate(res.data.user?.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="fade-in" style={{ width: '100%', maxWidth: '440px' }}>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '88px', height: '88px', borderRadius: '22px', margin: '0 auto 1.1rem',
            background: 'linear-gradient(145deg, #162454 0%, #0A1535 100%)',
            border: '1px solid rgba(41,121,255,0.45)',
            boxShadow: '0 10px 30px rgba(6,13,38,0.7), 0 0 20px rgba(41,121,255,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            <img src="/ai-logo.png" alt="AI Study Assistant"
              style={{ width: '66px', height: '66px', objectFit: 'contain' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }}
            />
            <span style={{ display: 'none', fontSize: '2.2rem' }}>ðŸ§ </span>
          </div>
          <h1 style={{
            fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.25rem',
            background: 'linear-gradient(90deg, #5B9DFF 0%, #00D4FF 50%, #9D6FF5 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>StudyCraft</h1>
          <p style={{ color: '#5A78C8', fontSize: '0.88rem' }}>Sign in to continue learning</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label className="label">Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required className="input-field" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {loading
                ? <span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem' }}><span className="spinner-sm"/>Signing in…</span>
                : '→ Sign In'}
            </button>
          </form>

          <div style={{ height: '1px', margin: '1.4rem 0',
            background: 'linear-gradient(90deg, transparent, rgba(41,121,255,0.3), transparent)' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#5A78C8' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: '#5B9DFF', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e=>e.target.style.color='#00D4FF'}
              onMouseLeave={e=>e.target.style.color='#5B9DFF'}>
              Create one
            </Link>
          </p>
        </div>

        {/* Tagline */}
        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.78rem', color:'rgba(90,120,200,0.5)', letterSpacing:'0.05em' }}>
          Study Smarter. Learn Faster. Achieve More.
        </p>
      </div>
    </div>
  )
}
