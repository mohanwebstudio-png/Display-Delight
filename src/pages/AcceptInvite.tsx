import { useState, useEffect } from 'react'
import { useRoute, go, useApp } from '../store'
import { authApi } from '../api'
import { Btn, Input, Field, Badge } from '../ui'
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'

export default function AcceptInvite() {
  const { query } = useRoute()
  const { toast } = useApp()
  const token = query.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token. Please check the link from your email.')
      setLoading(false)
      return
    }

    const checkToken = async () => {
      try {
        const data = await authApi.getInvite(token)
        if (data && data.valid) {
          setInvitation(data)
          if (data.name) setName(data.name)
        } else {
          setError('This invitation is invalid or has expired.')
        }
      } catch (err: any) {
        setError(err?.error || err?.message || 'Invalid or expired invitation token.')
      } finally {
        setLoading(false)
      }
    }

    checkToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      toast('Password must be at least 6 characters long', 'err')
      return
    }
    if (password !== confirmPassword) {
      toast('Passwords do not match', 'err')
      return
    }

    setSubmitting(true)
    try {
      const res = await authApi.acceptInvite({
        token,
        name: name.trim() || undefined,
        password,
      })
      toast(res.message || 'Invitation accepted! Welcome to the team.', 'ok')
      setSuccess(true)
      setTimeout(() => {
        go('/admin')
      }, 1500)
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to accept invitation', 'err')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-brand text-brand-fg shadow-lg mb-3">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">DisplayDelight</h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-ink-3 mt-1">
            Admin Team Workspace
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
          {loading ? (
            <div className="text-center py-12 space-y-3">
              <div className="inline-block size-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-ink-2">Verifying invitation credentials...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">Invitation Not Available</h3>
                <p className="text-sm text-ink-2 mt-1">{error}</p>
              </div>
              <div className="pt-2">
                <Btn variant="secondary" onClick={() => go('/login')}>
                  Go to Sign In
                </Btn>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">Account Activated!</h3>
                <p className="text-sm text-ink-2 mt-1">
                  You are now registered as an active administrator. Redirecting to your dashboard...
                </p>
              </div>
              <Btn variant="primary" icon={<ArrowRight className="size-4" />} onClick={() => go('/admin')}>
                Launch Admin Dashboard
              </Btn>
            </div>
          ) : (
            <div>
              <div className="mb-6 border-b border-line pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">Team Invitation</span>
                  <Badge tone="brand">{invitation?.role || 'Staff'}</Badge>
                </div>
                <h2 className="text-xl font-bold text-ink mt-2">Welcome to the Team</h2>
                <p className="text-xs text-ink-2 mt-1">
                  You have been invited as a <strong>{invitation?.role}</strong> for <span className="font-semibold text-ink">{invitation?.email}</span>.
                  Complete your details below to activate your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Your Full Name">
                  <Input
                    value={name}
                    placeholder="e.g. John Doe"
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>

                <Field label="Work Email">
                  <Input
                    value={invitation?.email || ''}
                    disabled
                    className="bg-canvas-soft text-ink-2 cursor-not-allowed"
                  />
                </Field>

                <Field label="Create Password" hint="Minimum 6 characters">
                  <Input
                    type="password"
                    value={password}
                    placeholder="••••••••••••"
                    required
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>

                <Field label="Confirm Password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    placeholder="••••••••••••"
                    required
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>

                <div className="pt-2">
                  <Btn
                    type="submit"
                    className="w-full justify-center"
                    loading={submitting}
                    icon={<ArrowRight className="size-4" />}
                  >
                    Accept Invitation & Set Up Account
                  </Btn>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-ink-3 mt-6">
          &copy; {new Date().getFullYear()} DisplayDelight Commercial Operations. All rights reserved.
        </p>
      </div>
    </div>
  )
}
