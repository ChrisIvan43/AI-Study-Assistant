import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import './admin.css'

const Login         = lazy(() => import('./pages/Login'))
const Register      = lazy(() => import('./pages/Register'))
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Upload        = lazy(() => import('./pages/Upload'))
const Collections   = lazy(() => import('./pages/Collections'))
const Summary       = lazy(() => import('./pages/Summary'))
const Quiz          = lazy(() => import('./pages/Quiz'))
const Flashcards    = lazy(() => import('./pages/Flashcards'))
const Chat          = lazy(() => import('./pages/Chat'))
const StudyPlanner  = lazy(() => import('./pages/StudyPlanner'))
const Progress      = lazy(() => import('./pages/Progress'))

const AdminLayout    = lazy(() => import('./components/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers     = lazy(() => import('./pages/AdminUsers'))

export default function App() {
  const location = useLocation()
  const isAdminRoute =
    location.pathname === '/admin' ||
    location.pathname.startsWith('/admin/')

  return (
    <div className="app-shell">
      {!isAdminRoute && <Navbar />}

      <main className={`app-main ${isAdminRoute ? 'admin-main' : ''}`}>
        <Suspense
          fallback={
            <div className="app-loading">
              <div className="spinner" />
            </div>
          }
        >
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Administrator routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            {/* Student routes */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />

            <Route
              path="/upload"
              element={<ProtectedRoute><Upload /></ProtectedRoute>}
            />

            <Route
              path="/collections"
              element={<ProtectedRoute><Collections /></ProtectedRoute>}
            />

            <Route
              path="/summary"
              element={<ProtectedRoute><Summary /></ProtectedRoute>}
            />

            <Route
              path="/quiz"
              element={<ProtectedRoute><Quiz /></ProtectedRoute>}
            />

            <Route
              path="/flashcards"
              element={<ProtectedRoute><Flashcards /></ProtectedRoute>}
            />

            <Route
              path="/chat"
              element={<ProtectedRoute><Chat /></ProtectedRoute>}
            />

            <Route
              path="/planner"
              element={<ProtectedRoute><StudyPlanner /></ProtectedRoute>}
            />

            <Route
              path="/progress"
              element={<ProtectedRoute><Progress /></ProtectedRoute>}
            />

            {/* Default routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
