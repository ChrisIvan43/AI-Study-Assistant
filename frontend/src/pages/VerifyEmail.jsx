import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, MailCheck, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './AccountSettings.css'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { isAuthenticated, refreshUser } = useAuth()

  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [registrationCompleted, setRegistrationCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleVerify = async () => {
    if (!token) {
      setStatus('error')
      setMessage('The verification link is missing its token. Please sign in and request a new verification email.')
      return
    }

    setSubmitting(true)

    try {
      const response = await api.post('/email/verification/verify', { token })

      const completedRegistration = response.data.registration_completed === true
      setRegistrationCompleted(completedRegistration)

      if (isAuthenticated && !completedRegistration) {
        try {
          await refreshUser()
        } catch {
          // Legacy verification succeeded; profile refresh can be retried later.
        }
      }

      setStatus('success')
      setMessage(response.data.message || 'Your email address has been verified successfully.')
      toast.success('Email address verified.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error.response?.data?.detail ||
        'This verification link is invalid or has expired. Sign in and request a new verification email.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="account-settings-page account-verification-page">
      <div className="account-verification-card">
        {status === 'success' ? (
          <div className="verification-result-icon success">
            <CheckCircle2 size={34} />
          </div>
        ) : status === 'error' ? (
          <div className="verification-result-icon error">
            <ShieldAlert size={34} />
          </div>
        ) : (
          <div className="verification-result-icon">
            <MailCheck size={34} />
          </div>
        )}

        <span className="account-eyebrow">STUDYCRAFT ACCOUNT SECURITY</span>
        <h1>
          {status === 'success'
            ? registrationCompleted ? 'Account created successfully' : 'Email verified'
            : status === 'error'
              ? 'Verification unsuccessful'
              : 'Verify your email address'}
        </h1>

        <p className="verification-description">
          {status === 'success'
            ? message
            : status === 'error'
              ? message
              : 'Confirm that you own this email address to complete your StudyCraft account setup.'}
        </p>

        {status === 'idle' && (
          <button
            type="button"
            className="account-primary-button verification-submit"
            onClick={handleVerify}
            disabled={submitting || !token}
          >
            <CheckCircle2 size={17} />
            {submitting ? 'Verifying...' : 'Verify email address'}
          </button>
        )}

        {status === 'idle' && !token && (
          <p className="verification-inline-error">
            No verification token was found in this link.
          </p>
        )}

        {status === 'success' && (
          <Link
            to={registrationCompleted ? '/login' : isAuthenticated ? '/settings' : '/login'}
            className="account-primary-button verification-submit"
          >
            {registrationCompleted
              ? 'Continue to sign in'
              : isAuthenticated ? 'Return to account settings' : 'Continue to sign in'}
          </Link>
        )}

        {status === 'error' && (
          <Link
            to={isAuthenticated ? '/settings' : '/login'}
            className="account-primary-button verification-submit"
          >
            {isAuthenticated ? 'Return to account settings' : 'Go to sign in'}
          </Link>
        )}

        <Link
          to={status === 'success' && registrationCompleted
            ? '/login'
            : isAuthenticated ? '/settings' : '/login'}
          className="verification-back-link"
        >
          <ArrowLeft size={16} />
          {status === 'success' && registrationCompleted
            ? 'Sign in to StudyCraft'
            : isAuthenticated ? 'Account settings' : 'Sign in to StudyCraft'}
        </Link>
      </div>
    </div>
  )
}
