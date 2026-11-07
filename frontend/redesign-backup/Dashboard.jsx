import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { FileText, HelpCircle, Target, Layers, Star, Clock, UploadCloud, Sparkles, BrainCircuit, MessageSquareText, FolderOpen } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documents,   setDocuments]   = useState([])
  const [collections, setCollections] = useState([])
  const [progress,    setProgress]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const collectionFilter = searchParams.get('collection') || ''

  useEffect(() => { fetchData() }, [collectionFilter])

  const fetchData = async () => {
    try {
      const docParams = collectionFilter ? { collection_id: collectionFilter } : {}
      const [dr, pr, cr] = await Promise.all([
        api.get('/documents', { params: docParams }),
        api.get('/progress'),
        api.get('/collections'),
      ])
      setDocuments(dr.data.documents || [])
      setProgress(pr.data)
      setCollections(cr.data.collections || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const collectionName = id => collections.find(c => c.id === id)?.name

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spinner" style={{ margin:'0 auto' }} />
        <p style={{ color:'var(--text-muted)', marginTop:'1rem', fontSize:'0.88rem' }}>Initializing workspace…</p>
      </div>
    </div>
  )

  const avgScore = progress?.average_quiz_score || 0
  
  const STATS = [
    { label: 'Documents',  value: progress?.total_documents     || 0, icon: FileText, },
    { label: 'Quizzes',    value: progress?.total_quizzes       || 0, icon: HelpCircle, },
    { label: 'Flashcards', value: progress?.total_flashcards    || 0, icon: Layers, },
    { label: 'Mastered',   value: progress?.mastered_flashcards || 0, icon: Star, },
    { label: 'Study Hrs',  value: progress?.total_study_hours   || 0, icon: Clock, },
  ]

  return (
    <div className="fade-in circuit-bg" style={{ maxWidth:'1200px', margin:'0 auto', padding:'2rem 1.5rem' }}>
      <div className="circuit-content">

        {/* Welcome */}
        <div style={{ marginBottom:'2.5rem' }}>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <BrainCircuit className="text-blue-500" size={32} color="var(--blue)" />
            Welcome back, {user?.name || 'Student'}
          </h1>
          <p className="page-subtitle">Your AI-powered study environment is ready.</p>
        </div>

        {/* Upload banner */}
        <Link to="/upload" className="card-action" style={{ display:'block', marginBottom:'2.5rem', background: 'linear-gradient(135deg, var(--blue) 0%, var(--violet) 100%)', borderColor: 'transparent' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'#fff', marginBottom:'0.2rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Sparkles size={20} />
                Upload New Study Material
              </h2>
              <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.9rem' }}>
                Drop in a PDF, DOCX, or TXT — we'll generate your study kit.
              </p>
            </div>
            <UploadCloud color="white" size={42} opacity={0.8} />
          </div>
        </Link>

        {/* Stats Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'1rem', marginBottom:'2.5rem' }}>
          
          {/* Emphasized Main Stat */}
          <div className="card-data col-span-full sm:col-span-2" style={{ position:'relative', border: '1px solid var(--border-strong)', boxShadow: '0 0 24px rgba(41,121,255,0.15)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
              <div style={{ background: 'rgba(41,121,255,0.15)', padding:'1rem', borderRadius:'12px', color:'var(--blue)' }}>
                <Target size={32} />
              </div>
              <div>
                <p className="label-caps" style={{ color:'var(--blue-light)', marginBottom:'0.2rem' }}>Average Quiz Score</p>
                <p style={{ fontSize:'2.5rem', fontWeight:800, color:'var(--text-primary)', lineHeight:1, margin:0, textShadow: '0 0 16px rgba(41,121,255,0.3)' }}>
                  {avgScore}%
                </p>
              </div>
            </div>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'4px', background: 'linear-gradient(90deg, var(--blue) 0%, var(--cyan) 100%)' }} />
          </div>

          {/* Secondary Stats */}
          {STATS.map(s => {
            const isZero = s.value === 0
            const Icon = s.icon
            return (
              <div key={s.label} className="card-data" style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', opacity: isZero ? 0.6 : 1 }}>
                <Icon size={24} color={isZero ? 'var(--text-muted)' : 'var(--blue-light)'} style={{ marginBottom:'0.75rem' }} />
                <p style={{ fontSize:'1.75rem', fontWeight:800, color: isZero ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight:1, margin:'0 0 0.3rem' }}>
                  {isZero ? '-' : s.value}
                </p>
                <p className="label-caps">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Recent Documents & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
          
          <div className="card-data" style={{ padding:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
              <h2 className="section-title" style={{ margin:0, borderBottom:'none', paddingBottom:0 }}>Recent Documents</h2>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                {collections.length > 0 && (
                  <select
                    value={collectionFilter}
                    onChange={e => setSearchParams(e.target.value ? { collection: e.target.value } : {})}
                    className="input-field" style={{ padding:'0.35rem 0.6rem', fontSize:'0.82rem', width:'auto' }}
                  >
                    <option value="">All collections</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <Link to="/upload" style={{ fontSize:'0.85rem', color:'var(--blue-light)', fontWeight:600 }}>+ Upload</Link>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
                <FileText size={48} color="var(--text-muted)" style={{ margin:'0 auto 1rem', opacity:0.5 }} />
                <p style={{ color:'var(--text-secondary)', marginBottom:'1.25rem' }}>Your workspace is empty.</p>
                <Link to="/upload" className="btn-secondary">Upload a Document</Link>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {documents.slice(0,5).map(doc => (
                  <Link key={doc.id} to={`/summary?doc=${doc.id}`} className="card-action" style={{ padding:'1rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{ background:'rgba(41,121,255,0.1)', padding:'0.75rem', borderRadius:'8px', color:'var(--blue-light)' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:600, color:'var(--text-primary)', fontSize:'0.95rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:0 }}>
                        {doc.title}
                      </p>
                      <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'0.2rem 0 0' }}>{doc.filename}</p>
                      {collectionName(doc.collection_id) && (
                        <span className="badge" style={{ marginTop:'0.35rem', fontSize:'0.72rem' }}>
                          <FolderOpen size={11}/> {collectionName(doc.collection_id)}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <h2 className="section-title">Quick Actions</h2>
            
            {documents.length === 0 ? (
              <div className="card-data" style={{ opacity:0.6, textAlign:'center', padding:'2rem 1rem' }}>
                <p style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>Upload a document to unlock actions.</p>
              </div>
            ) : (
              <>
                {[
                  { to:`/summary?doc=${documents[0]?.id}`,    icon: Sparkles,          title:'Generate Summary',  desc:'AI-powered breakdowns' },
                  { to:`/quiz?doc=${documents[0]?.id}`,       icon: HelpCircle,        title:'Take a Quiz',       desc:'Test your knowledge' },
                  { to:`/flashcards?doc=${documents[0]?.id}`, icon: Layers,            title:'Study Flashcards',  desc:'Digital study cards' },
                  { to:`/chat?doc=${documents[0]?.id}`,       icon: MessageSquareText, title:'Chat with Doc',     desc:'Ask anything about it' },
                ].map(a => (
                  <Link key={a.to} to={a.to} className="card-action" style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1.25rem 1rem' }}>
                    <div style={{ color:'var(--cyan)' }}>
                      <a.icon size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.95rem', marginBottom:'0.15rem' }}>{a.title}</h3>
                      <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0 }}>{a.desc}</p>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
