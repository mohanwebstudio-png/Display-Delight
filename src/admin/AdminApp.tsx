import { useState, type ReactNode } from 'react'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { go, useApp } from '../store'
import { Btn, EmptyState, Field, Input } from '../ui'
import AdminShell from './AdminShell'
import { Attributes, Categories, CustomizationBuilder, CustomizationProfiles, Dashboard, ProductEditor, ProductList, Variants } from './Catalogue'
import { Coupons, Customers, Inventory, OrderDetail, Orders, Quotes } from './Sales'
import { ClientLogos, ContentPages, Faqs, FooterPolicies, GalleryVideos, HomepageEditor, Industries, MediaLibrary, Navigation, ProductReviewsAdmin, SeoMeta, Testimonials } from './Content'
import { AdminUsers, AuditLogs, EmailSettings, GeneralSettings, GstTaxes, Notifications, Payments, Roles, Shipping, SocialLinks, Storage } from './Config'
import { EmailTemplatesManager } from './EmailTemplates'

import { authApi } from '../api'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const res = await authApi.login({ email, password })
      if (res?.user?.role === 'customer') {
        await authApi.logout()
        setMsg('Access denied: Customer accounts cannot access the admin console. Please sign in with an administrator or staff account.')
        return
      }
      go('/admin')
    } catch (err: any) {
      setMsg(err.error || 'Authentication failed. Please check credentials.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img src="/logo-white.png" alt="DisplayDelight" className="h-10 w-fit" />
        <div className="relative z-10 max-w-md">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#ff8a5c]">Admin console</p>
          <h1 className="text-6xl font-bold leading-[.95]">Run the catalogue, orders and content in one place.</h1>
          <p className="mt-4 text-white/60">Manage products, customization profiles, quotations and storefront content for DisplayDelight.</p>
        </div>
        <p className="text-xs text-white/40">Secure DisplayDelight Management Console.</p>
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-brand/20 blur-3xl" />
      </div>
      <div className="grid place-items-center bg-white p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <img src="/logo-orange.png" alt="DisplayDelight" className="mb-8 h-9 lg:hidden" />
          <h2 className="text-4xl font-bold">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-ink-2">Use your admin account credentials to continue.</p>
          {msg && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-50 p-3 text-xs font-medium text-red-700">{msg}</div>}
          <div className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-11"
                />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-soft">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Btn type="submit" full loading={busy}>Sign in</Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminApp({ path }: { path: string }) {
  const { user } = useApp()
  const p = path.replace(/\/+$/, '') || '/admin'
  if (p === '/admin/login') return <Login />

  // Security guard: Strict prevention of customer role accessing admin console
  if (user && user.role === 'customer') {
    return (
      <div className="grid min-h-screen place-items-center bg-soft p-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-ink">Access Denied</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Your current account (<strong>{user.email}</strong>) has the <em>Customer</em> role. Customer accounts are strictly restricted to the storefront.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Btn to="/" full>Return to Storefront</Btn>
            <Btn
              variant="secondary"
              onClick={async () => {
                await authApi.logout()
                go('/admin/login')
                window.location.reload()
              }}
              full
            >
              Sign out & Login as Admin
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  const seg = p.split('/').slice(2)
  const [a, b, c] = seg
  let el: ReactNode
  if (!a) el = <Dashboard />
  else if (a === 'products') el = b ? <ProductEditor key={b} id={b} /> : <ProductList />
  else if (a === 'categories') el = <Categories />
  else if (a === 'variants') el = <Variants />
  else if (a === 'attributes' || a === 'filters') el = <Attributes key={a} filters={a === 'filters'} />
  else if (a === 'customization') el = b ? <CustomizationBuilder key={b} id={b} openPreview={c === 'preview'} /> : <CustomizationProfiles />
  else if (a === 'orders') el = b ? <OrderDetail id={b} /> : <Orders />
  else {
    const M: Record<string, () => ReactNode> = {
      customers: () => <Customers />, quotes: () => <Quotes />, inventory: () => <Inventory />, coupons: () => <Coupons />,
      homepage: () => <HomepageEditor />, pages: () => <ContentPages />, navigation: () => <Navigation />, gallery: () => <GalleryVideos />,
      logos: () => <ClientLogos />, industries: () => <Industries />, faqs: () => <Faqs />, testimonials: () => <Testimonials />,
      reviews: () => <ProductReviewsAdmin />,
      footer: () => <FooterPolicies />, seo: () => <SeoMeta />, media: () => <MediaLibrary />,
      notifications: () => <Notifications />, email: () => <EmailSettings />, 'email-templates': () => <EmailTemplatesManager />,
      email_templates: () => <EmailTemplatesManager />,
      settings: () => <GeneralSettings />, payments: () => <Payments />,
      storage: () => <Storage />, gst: () => <GstTaxes />, shipping: () => <Shipping />, social: () => <SocialLinks />,
      users: () => <AdminUsers />, roles: () => <Roles />, audit: () => <AuditLogs />,
    }
    el = M[a]?.() ?? (
      <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="We could not find that admin page" text="The link may be outdated or the page may have moved." action={<Btn to="/admin">Back to dashboard</Btn>} /></div>
    )
  }
  return <AdminShell path={p}>{el}</AdminShell>
}
