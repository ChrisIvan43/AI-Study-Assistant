import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

const Login        = lazy(() => import('./pages/Login'))
const Register     = lazy(() => import('./pages/Register'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Upload       = lazy(() => import('./pages/Upload'))
const Collections  = lazy(() => import('./pages/Collections'))
const Summary      = lazy(() => import('./pages/Summary'))
const Quiz         = lazy(() => import('./pages/Quiz'))
const Flashcards   = lazy(() => import('./pages/Flashcards'))
const Chat         = lazy(() => import('./pages/Chat'))
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'))
const Progress     = lazy(() => import('./pages/Progress'))

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pb-12">
        <Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:'5rem 0'}}><div className="spinner"/></div>}>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload"    element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
            <Route path="/summary"   element={<ProtectedRoute><Summary /></ProtectedRoute>} />
            <Route path="/quiz"      element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
            <Route path="/flashcards"element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/chat"      element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/planner"   element={<ProtectedRoute><StudyPlanner /></ProtectedRoute>} />
            <Route path="/progress"  element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
