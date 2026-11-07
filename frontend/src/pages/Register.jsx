import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', email:'', password:'', confirmPassword:'' })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const isFormValid = useMemo(() => (
    form.name.trim() !== '' && form.email.trim() !== '' &&
    form.password.length >= 6 && form.password === form.confirmPassword
  ), [form])

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/register', { name: form.name, email: form.email, password: form.password })
      toast.success('Account created! Please log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  const pwMatch    = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const pwMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

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
            <span style={{ display: 'none', fontSize: '2.2rem' }}>🧠</span>
          </div>
          <h1 style={{
            fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.25rem',
            background: 'linear-gradient(90deg, #5B9DFF 0%, #00D4FF 50%, #9D6FF5 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Create Account</h1>
          <p style={{ color: '#5A78C8', fontSize: '0.88rem' }}>Join AI Study Assistant today</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="John Doe" required className="input-field" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required className="input-field" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="Min. 6 characters" required className="input-field" />
              {form.password.length > 0 && form.password.length < 6 && (
                <p style={{ color:'#f87171', fontSize:'0.74rem', marginTop:'0.3rem' }}>
                  Password must be at least 6 characters
                </p>
              )}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword}
                onChange={handleChange} placeholder="••••••••" required className="input-field"
                style={{ borderColor: pwMatch ? 'rgba(34,197,94,0.6)' : pwMismatch ? 'rgba(239,68,68,0.6)' : undefined }} />
              {pwMismatch && <p style={{ color:'#f87171', fontSize:'0.74rem', marginTop:'0.3rem' }}>Passwords do not match</p>}
              {pwMatch    && <p style={{ color:'#4ade80', fontSize:'0.74rem', marginTop:'0.3rem' }}>✓ Passwords match</p>}
            </div>
            <button type="submit" disabled={!isFormValid || loading} className="btn-primary"
              style={{ width:'100%', padding:'0.85rem', fontSize:'0.95rem', marginTop:'0.25rem' }}>
              {loading
                ? <span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem' }}><span className="spinner-sm"/>Creating account…</span>
                : '→ Create Account'}
            </button>
          </form>

          <div style={{ height:'1px', margin:'1.4rem 0',
            background:'linear-gradient(90deg, transparent, rgba(41,121,255,0.3), transparent)' }} />

          <p style={{ textAlign:'center', fontSize:'0.875rem', color:'#5A78C8' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'#5B9DFF', fontWeight:600, textDecoration:'none' }}
              onMouseEnter={e=>e.target.style.color='#00D4FF'}
              onMouseLeave={e=>e.target.style.color='#5B9DFF'}>
              Sign in
            </Link>
          </p>
        </div>

        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.78rem', color:'rgba(90,120,200,0.5)', letterSpacing:'0.05em' }}>
          Study Smarter. Learn Faster. Achieve More.
        </p>
      </div>
    </div>
  )
}
