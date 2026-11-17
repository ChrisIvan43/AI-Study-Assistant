import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  UserRound,
  KeyRound,
  AtSign,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './AccountSettings.css'

export default function AccountSettings() {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState(user)
  const [newEmail, setNewEmail] = useState('')
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nameSubmitting, setNameSubmitting] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadProfile = async () => {
    try {
      const response = await api.get('/me')
      setProfile(response.data)
      setDisplayName(response.data.name || '')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to load account details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleRequest = async (event) => {
    event.preventDefault()

    if (!newEmail.trim()) {
      toast.error('Enter your new Gmail address.')
      return
    }

    setSubmitting(true)

    try {
      const response = await api.post('/email/change/request', {
        new_email: newEmail.trim(),
      })

      toast.success(response.data.message || 'Verification email sent.')
      setNewEmail('')
      await loadProfile()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to request an email change.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setSubmitting(true)

    try {
      const response = await api.post('/email/change/resend')
      toast.success(response.data.message || 'Verification email resent.')
      await loadProfile()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to resend verification email.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInitialVerificationResend = async () => {
    setSubmitting(true)

    try {
      const response = await api.post('/email/verification/resend')
      toast.success(response.data.message || 'Verification email sent.')
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
        'Unable to resend the account verification email.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this pending email change?')) return

    setSubmitting(true)

    try {
      const response = await api.post('/email/change/cancel')
      toast.success(response.data.message || 'Email change cancelled.')
      await loadProfile()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to cancel email change.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNameUpdate = async (event) => {
    event.preventDefault()

    if (!displayName.trim()) {
      toast.error('Enter your name.')
      return
    }

    setNameSubmitting(true)

    try {
      const response = await api.put('/account/name', {
        name: displayName.trim(),
      })

      toast.success(response.data.message || 'Account name updated.')
      await refreshUser()
      await loadProfile()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to update your name.')
    } finally {
      setNameSubmitting(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Your new password must contain at least 8 characters.')
      return
    }

    setPasswordSubmitting(true)

    try {
      const response = await api.put('/account/password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      toast.success(response.data.message || 'Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to change your password.')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const pendingEmail = profile?.pending_email

  return (
    <div className="account-settings-page">
      <div className="account-settings-content">
        <Link to="/dashboard" className="account-back-link">
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <header className="account-page-header">
          <div className="account-header-icon">
            <ShieldCheck size={25} />
          </div>
          <div>
            <span className="account-eyebrow">ACCOUNT & SECURITY</span>
            <h1>Account Settings</h1>
            <p>Manage your account email and keep your access information up to date.</p>
          </div>
        </header>

        {loading ? (
          <div className="account-loading">
            <div className="spinner" />
            <span>Loading account details...</span>
          </div>
        ) : (
          <>
            <section className="account-card account-profile-card">
              <div className="account-card-heading">
                <div className="account-card-icon"><UserRound size={20} /></div>
                <div>
                  <h2>Profile name</h2>
                  <p>Update the name displayed across your StudyCraft account.</p>
                </div>
              </div>

              <form className="account-extra-form" onSubmit={handleNameUpdate}>
                <label htmlFor="account-display-name">Display name</label>
                <input
                  id="account-display-name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
                <button
                  type="submit"
                  className="account-primary-button"
                  disabled={nameSubmitting || displayName.trim() === profile?.name}
                >
                  <UserRound size={16} />
                  {nameSubmitting ? 'Saving...' : 'Save name'}
                </button>
              </form>
            </section>

            <section className="account-card account-password-card">
              <div className="account-card-heading">
                <div className="account-card-icon"><KeyRound size={20} /></div>
                <div>
                  <h2>Change password</h2>
                  <p>Choose a new password to protect your account.</p>
                </div>
              </div>

              <form className="account-extra-form" onSubmit={handlePasswordChange}>
                <label htmlFor="account-current-password">Current password</label>
                <input
                  id="account-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  maxLength={128}
                  required
                />

                <label htmlFor="account-new-password">New password</label>
                <input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />

                <label htmlFor="account-confirm-password">Confirm new password</label>
                <input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />

                <p className="account-field-hint">
                  Use at least 8 characters. Your current password is required to authorize this change.
                </p>

                <button
                  type="submit"
                  className="account-primary-button"
                  disabled={
                    passwordSubmitting ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  <KeyRound size={16} />
                  {passwordSubmitting ? 'Updating password...' : 'Update password'}
                </button>
              </form>
            </section>

            <section className="account-card">
              <div className="account-card-heading">
                <div className="account-card-icon"><AtSign size={20} /></div>
                <div>
                  <h2>Email address</h2>
                  <p>Your active email address is used to access your account.</p>
                </div>
              </div>

              <div className="account-email-display">
                <div className="account-email-symbol"><Mail size={19} /></div>
                <div className="account-email-details">
                  <span>Current email</span>
                  <strong>{profile?.email || user?.email || 'Not available'}</strong>
                </div>
                <span className={`account-status-badge ${profile?.email_verified_at ? '' : 'unverified'}`}>
                  {profile?.email_verified_at ? (
                    <><CheckCircle2 size={14} /> Verified</>
                  ) : (
                    <><Clock3 size={14} /> Not verified</>
                  )}
                </span>
              </div>

              {!profile?.email_verified_at && (
                <div className="account-pending-panel account-initial-verification-panel">
                  <div className="account-pending-heading">
                    <Clock3 size={19} />
                    <strong>Verify your email address</strong>
                  </div>
                  <p>
                    Your account email has not been verified yet. Verify it to confirm
                    that you own this address and complete your account setup.
                  </p>
                  <div className="account-action-row">
                    <button
                      type="button"
                      className="account-primary-button"
                      onClick={handleInitialVerificationResend}
                      disabled={submitting}
                    >
                      <RefreshCw size={16} />
                      {submitting ? 'Please wait...' : 'Resend verification email'}
                    </button>
                  </div>
                </div>
              )}

              {pendingEmail ? (
                <div className="account-pending-panel">
                  <div className="account-pending-heading">
                    <Clock3 size={19} />
                    <strong>Verification pending</strong>
                  </div>
                  <p>A verification link was requested for:</p>
                  <strong className="account-pending-email">{pendingEmail}</strong>
                  <p className="account-pending-note">
                    Your current email remains active until the new address is verified.
                  </p>
                  <div className="account-action-row">
                    <button
                      type="button"
                      className="account-primary-button"
                      onClick={handleResend}
                      disabled={submitting}
                    >
                      <RefreshCw size={16} />
                      {submitting ? 'Please wait...' : 'Resend verification'}
                    </button>
                    <button
                      type="button"
                      className="account-danger-button"
                      onClick={handleCancel}
                      disabled={submitting}
                    >
                      <XCircle size={16} />
                      Cancel request
                    </button>
                  </div>
                </div>
              ) : (
                <form className="account-email-form" onSubmit={handleRequest}>
                  <label htmlFor="new-email">New Gmail address</label>
                  <input
                    id="new-email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.new.address@gmail.com"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    maxLength={255}
                    required
                  />
                  <p className="account-field-hint">
                    Use a Gmail address that you can access. We will send a verification link to it.
                  </p>
                  <button
                    type="submit"
                    className="account-primary-button"
                    disabled={submitting}
                  >
                    <Mail size={16} />
                    {submitting ? 'Sending request...' : 'Request email change'}
                  </button>
                </form>
              )}
            </section>

            <section className="account-security-note">
              <ShieldCheck size={21} />
              <div>
                <strong>Your account stays protected</strong>
                <p>
                  Your existing email remains unchanged until verification succeeds.
                  Verification links expire after 30 minutes.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
