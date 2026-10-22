import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, MailCheck, X } from 'lucide-react'
import { Btn, Field, Input, Notice, cx } from '../ui'
import { Link, go, useApp, resolveAssetUrl } from '../store'

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify'
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
const rules = (p: string): [string, boolean][] => [
  ['At least 8 characters', p.length >= 8],
  ['Includes a number', /\d/.test(p)],
  ['One uppercase letter (recommended)', /[A-Z]/.test(p)],
  ['One special character (recommended)', /[^A-Za-z0-9]/.test(p)],
]

function PasswordInput({ value, onChange, invalid, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} value={value} invalid={invalid} placeholder={placeholder} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="pr-11" />
      <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-soft">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

const Checklist = ({ pw }: { pw: string }) => (
  <ul className="mt-2 grid gap-1 sm:grid-cols-2" aria-label="Password requirements">
    {rules(pw).map(([t, ok]) => (
      <li key={t} className={cx('flex items-center gap-1.5 text-xs', ok ? 'text-ok' : 'text-ink-2')}>
        {ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5 opacity-50" />}{t}
      </li>
    ))}
  </ul>
)

const copy: Record<Mode, [string, string]> = {
  login: ['Welcome back', 'Sign in to track orders, manage addresses and reorder faster.'],
  register: ['Create your account', 'Save addresses, follow orders and keep your quotes in one place.'],
  forgot: ['Forgot password?', "Enter your account email and we'll send reset instructions."],
  reset: ['Set a new password', 'Choose a strong password you have not used elsewhere.'],
  verify: ['Verify your email', 'One last step to activate your account.'],
}

export default function Auth({ mode }: { mode: Mode }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', pw: '', pw2: '', terms: false })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [cool, setCool] = useState(0)
  const [sent, setSent] = useState(false)
  const set = (k: string, v: string | boolean) => { setF((s) => ({ ...s, [k]: v })); setErr((e) => ({ ...e, [k]: '' })) }

  const { user, login, register, toast } = useApp()
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (user && (mode === 'login' || mode === 'register')) {
      go('/account')
    }
  }, [user, mode])

  useEffect(() => { setErr({}); setDone(false); setBusy(false); setServerError(null); setF((s) => ({ ...s, pw: '', pw2: '' })) }, [mode])
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t) }, [cool])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const x: Record<string, string> = {}
    if (mode === 'register' && f.name.trim().length < 2) x.name = 'Enter your full name'
    if (mode !== 'reset' && !emailOk(f.email)) x.email = f.email ? 'Enter a valid email address, e.g. name@company.com' : 'Email is required'
    if (mode === 'login' && !f.pw) x.pw = 'Password is required'
    if ((mode === 'register' || mode === 'reset') && f.pw.length < 8) x.pw = 'Password must be at least 8 characters'
    if ((mode === 'register' || mode === 'reset') && f.pw2 !== f.pw) x.pw2 = 'Passwords do not match'
    if (mode === 'register' && !f.terms) x.terms = 'Please accept the terms to continue'
    setErr(x)
    if (Object.keys(x).length) return

    setBusy(true)
    try {
      if (mode === 'login') {
        await login(f.email.trim(), f.pw)
        go('/account')
      } else if (mode === 'register') {
        await register({
          email: f.email.trim(),
          password: f.pw,
          full_name: f.name.trim(),
          phone: f.phone ? f.phone.trim() : undefined,
        })
        go('/account')
      } else {
        setDone(true)
      }
    } catch (apiErr: any) {
      console.error('Auth error:', apiErr)
      setServerError(apiErr.error || 'Authentication failed. Please check your credentials.')
      toast(apiErr.error || 'Failed', 'err')
    } finally {
      setBusy(false)
    }
  }
  const resend = () => { setSent(true); setCool(30) }
  const [title, sub] = copy[mode]

  if (user && (mode === 'login' || mode === 'register')) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-8 bg-soft/30">
        <div className="max-w-md w-full rounded-2xl border border-line bg-white p-8 text-center shadow-card space-y-4">
          <div className="size-12 rounded-full bg-brand-soft text-brand mx-auto grid place-items-center">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Already Signed In</h2>
          <p className="text-sm text-ink-2">You are currently signed in as <strong className="text-ink">{user.full_name || user.email}</strong>.</p>
          <div className="pt-2">
            <Btn full to="/account">Go to my account</Btn>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-[calc(100vh-200px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-navy text-white lg:block">
        <img src={resolveAssetUrl('/p/hero.jpg')} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <img src={resolveAssetUrl('/logo-white.png')} alt="DisplayDelight" className="h-10 w-fit" />
          <div>
            <h2 className="font-display text-6xl font-bold uppercase leading-[.95] xl:text-7xl">Light Up.<br />Stand Out.<br /><span className="text-[#ff8a5c]">Sell More!</span></h2>
            <img src={resolveAssetUrl('/p/i-standee.jpg')} alt="Digital standee" className="mt-8 h-52 w-44 rounded-xl object-cover shadow-pop" />
          </div>
        </div>
      </aside>

      <section className="grid place-items-center px-4 py-10 sm:px-8 sm:py-16">
        <div className="w-full max-w-md">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[#e8f5e9] text-ok">{mode === 'forgot' ? <MailCheck className="size-8" /> : <CheckCircle2 className="size-8" />}</div>
              <h1 className="text-4xl font-bold">{mode === 'forgot' ? 'Check your email' : 'Password updated'}</h1>
              <p className="mt-2 text-sm text-ink-2">{mode === 'forgot' ? `If an account exists for ${f.email}, reset instructions are on their way.` : 'You can now sign in with your new password.'}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Btn to="/login" full>Go to sign in</Btn>
                {mode === 'forgot' && <Btn variant="tertiary" full onClick={() => setDone(false)}>Use a different email</Btn>}
              </div>
            </div>
          ) : mode === 'verify' ? (
            <div className="text-center">
              <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-brand-soft text-brand"><MailCheck className="size-8" /></div>
              <h1 className="text-4xl font-bold">{title}</h1>
              <p className="mt-2 text-sm text-ink-2">We have sent a verification link to your email. Open it to activate your account. Check spam if you cannot find it.</p>
              {sent && <div className="mt-4 text-left"><Notice tone="ok" title="Verification email re-sent" /></div>}
              <div className="mt-6 flex flex-col gap-3">
                <Btn full disabled={cool > 0} onClick={resend}>{cool > 0 ? `Resend available in ${cool}s` : 'Resend verification email'}</Btn>
                <Btn variant="secondary" full to="/account">I have verified, continue</Btn>
                <Link to="/register" className="text-sm font-semibold text-brand hover:underline">Wrong email? Register again</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              {serverError && (
                <div className="rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm">
                  <p className="font-semibold text-bad">{serverError}</p>
                  {serverError.toLowerCase().includes('already exists') && (
                    <p className="mt-2 text-xs text-ink-2">
                      Already registered?{' '}
                      <Link to="/login" className="font-bold text-brand hover:underline">
                        Click here to sign in with this email &rarr;
                      </Link>
                    </p>
                  )}
                </div>
              )}
              {(mode === 'forgot' || mode === 'reset') && <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand"><ArrowLeft className="size-4" />Back to sign in</Link>}
              <div>
                <h1 className="text-3xl font-bold leading-none sm:text-4xl md:text-5xl">{title}</h1>
                <p className="mt-2 text-sm text-ink-2">{sub}</p>
              </div>
              {mode === 'register' && <Field label="Full name" required error={err.name}><Input value={f.name} invalid={!!err.name} autoComplete="name" onChange={(e) => set('name', e.target.value)} /></Field>}
              {mode !== 'reset' && <Field label="Email" required error={err.email}><Input type="email" value={f.email} invalid={!!err.email} autoComplete="email" placeholder="name@company.com" onChange={(e) => set('email', e.target.value)} /></Field>}
              {mode === 'register' && <Field label="Phone" hint="Optional. Used only for order updates." error={err.phone}><Input type="tel" value={f.phone} autoComplete="tel" onChange={(e) => set('phone', e.target.value)} /></Field>}
              {mode !== 'forgot' && (
                <div>
                  <Field label={mode === 'reset' ? 'New password' : 'Password'} required error={err.pw}>
                    <PasswordInput value={f.pw} invalid={!!err.pw} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onChange={(v) => set('pw', v)} />
                  </Field>
                  {(mode === 'register' || mode === 'reset') && <Checklist pw={f.pw} />}
                </div>
              )}
              {(mode === 'register' || mode === 'reset') && <Field label="Confirm password" required error={err.pw2}><PasswordInput value={f.pw2} invalid={!!err.pw2} autoComplete="new-password" onChange={(v) => set('pw2', v)} /></Field>}
              {mode === 'login' && <div className="-mt-2 text-right"><Link to="/forgot-password" className="text-sm font-semibold text-brand hover:underline">Forgot password?</Link></div>}
              {mode === 'register' && (
                <div>
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} className="mt-0.5 size-4 accent-[#E84B1A]" />
                    <span>I agree to the <Link to="/policy/terms" className="font-semibold text-brand hover:underline">Terms</Link> and <Link to="/policy/privacy" className="font-semibold text-brand hover:underline">Privacy Policy</Link>.</span>
                  </label>
                  {err.terms && <p className="mt-1.5 text-xs font-medium text-bad">{err.terms}</p>}
                </div>
              )}
              <Btn type="submit" full size="lg" loading={busy}>{{ login: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Update password', verify: '' }[mode]}</Btn>
              <p className="text-center text-sm text-ink-2">
                {mode === 'login' ? <>New to DisplayDelight? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></> : <>Already registered? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></>}
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
