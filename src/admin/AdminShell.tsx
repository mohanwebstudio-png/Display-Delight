import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Bell, Boxes, Building2, ChevronDown, CreditCard, FileText, Filter, Footprints, Globe, HelpCircle, Image, Images, LayoutDashboard, LayoutGrid, Layers, ListTree, LogOut, Mail, Menu, MessageSquareQuote, MessagesSquare, Navigation as NavIcon, PackageSearch, PanelLeftClose, PanelLeftOpen, Percent, Receipt, Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Star, Store, Tag, Truck, Users, UserCog, Wand2, X, Cloud, History, Home, Share2, Factory, SearchCheck, ExternalLink, type LucideIcon } from 'lucide-react'
import { Link, go, resolveAssetUrl } from '../store'
import { cx } from '../ui'
import { adminApi, authApi, clearAuthToken, getAuthToken } from '../api'

/* ---------- tiny shared store: unread notification count ---------- */
let unread = 0
const subs = new Set<() => void>()
export const setUnreadCount = (count: number) => { unread = count; subs.forEach((f) => f()) }
export const markAllRead = () => { unread = 0; subs.forEach((f) => f()) }
export const useUnread = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => unread)

type Item = { to: string; label: string; icon: LucideIcon; badge?: boolean }
export const NAV: { group: string; items: Item[] }[] = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'Catalogue', items: [
    { to: '/admin/products', label: 'Products', icon: Boxes }, { to: '/admin/categories', label: 'Categories', icon: ListTree },
    { to: '/admin/variants', label: 'Product Variants', icon: Layers }, { to: '/admin/attributes', label: 'Product Attributes', icon: Tag },
    { to: '/admin/filters', label: 'Product Filters', icon: Filter }, { to: '/admin/customization', label: 'Customization Profiles', icon: Wand2 }] },
  { group: 'Sales', items: [
    { to: '/admin/orders', label: 'Orders', icon: ShoppingBag }, { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/quotes', label: 'Quotations & Enquiries', icon: Receipt }, { to: '/admin/inventory', label: 'Inventory', icon: PackageSearch },
    { to: '/admin/coupons', label: 'Coupons & Pricing Rules', icon: Percent }] },
  { group: 'Website Content', items: [
    { to: '/admin/homepage', label: 'Homepage Editor', icon: Home }, { to: '/admin/pages', label: 'Pages', icon: FileText },
    { to: '/admin/navigation', label: 'Navigation', icon: NavIcon }, { to: '/admin/gallery', label: 'Gallery & Videos', icon: Images },
    { to: '/admin/logos', label: 'Client Logos', icon: Building2 }, { to: '/admin/industries', label: 'Industries', icon: Factory },
    { to: '/admin/faqs', label: 'FAQs', icon: HelpCircle }, { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    { to: '/admin/reviews', label: 'Product Reviews', icon: Star },
    { to: '/admin/footer', label: 'Footer & Policies', icon: Footprints }] },
  { group: 'Marketing & SEO', items: [{ to: '/admin/seo', label: 'SEO Metadata', icon: SearchCheck }, { to: '/admin/media', label: 'Media Library', icon: Image }] },
  { group: 'Communication', items: [
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, badge: true },
    { to: '/admin/email', label: 'Email Settings', icon: Mail },
    { to: '/admin/email-templates', label: 'Email Templates', icon: MessagesSquare },
  ] },
  { group: 'Configuration', items: [
    { to: '/admin/settings', label: 'General Settings', icon: Settings }, { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/storage', label: 'Storage / Cloudflare', icon: Cloud }, { to: '/admin/gst', label: 'GST & Taxes', icon: Percent },
    { to: '/admin/shipping', label: 'Shipping', icon: Truck }, { to: '/admin/social', label: 'WhatsApp & Social Links', icon: Share2 }] },
  { group: 'Administration', items: [
    { to: '/admin/users', label: 'Admin Users', icon: UserCog }, { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { to: '/admin/audit', label: 'Audit Logs', icon: History }] },
]
const ALL = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })))
const matches = (path: string, to: string) => (to === '/admin' ? path === '/admin' : path === to || path.startsWith(to + '/'))
export const navFor = (path: string) => ALL.filter((i) => matches(path, i.to)).sort((a, b) => b.to.length - a.to.length)[0]

function Sidebar({ path, compact, onNav }: { path: string; compact: boolean; onNav?: () => void }) {
  const unreadN = useUnread()
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className={cx('flex h-16 shrink-0 items-center border-b border-white/10', compact ? 'justify-center' : 'px-5')}>
        <Link to="/admin" onClick={onNav} className="flex items-center gap-2.5">
          <img src={resolveAssetUrl('/logo-white.png')} alt="DisplayDelight" className={cx('h-8 w-auto object-contain', compact && 'hidden')} />
          {compact && <span className="font-display text-2xl font-bold text-brand">DD</span>}
          {!compact && <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>}
        </Link>
      </div>
      <nav className="hide-scroll flex-1 overflow-y-auto py-3" aria-label="Admin">
        {NAV.map((g) => (
          <div key={g.group} className="mb-3">
            {compact ? <div className="mx-4 mb-1 border-t border-white/10 first:hidden" /> : <p className="px-5 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[.14em] text-white/40">{g.group}</p>}
            {g.items.map((it) => {
              const on = navFor(path)?.to === it.to
              const I = it.icon
              return (
                <Link key={it.to} to={it.to} title={compact ? it.label : undefined} onClick={onNav} aria-current={on ? 'page' : undefined}
                  className={cx('relative mx-2 my-px flex items-center gap-3 rounded-lg py-2 text-[13.5px] font-medium transition', compact ? 'justify-center px-0' : 'px-3', on ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white')}>
                  {on && <span className="absolute -left-2 top-1.5 h-[calc(100%-12px)] w-1 rounded-r bg-brand" />}
                  <I className={cx('size-[18px] shrink-0', on && 'text-brand')} />
                  {!compact && <span className="flex-1 truncate">{it.label}</span>}
                  {it.badge && unreadN > 0 && (compact ? <span className="absolute right-2 top-1 size-2 rounded-full bg-brand" /> : <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold">{unreadN}</span>)}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </div>
  )
}

const SAMPLE_NOTES = [
  { t: 'New order DD-1042 placed', s: 'Awaiting processing · 2 min ago', to: '/admin/orders/DD-1042', icon: ShoppingBag },
  { t: 'Quotation request from a hotel group', s: 'Digital standee, 12 units · 1 h ago', to: '/admin/quotes', icon: Receipt },
  { t: 'Low stock: Clip-on Frame A3', s: 'Below reorder level · 3 h ago', to: '/admin/inventory', icon: PackageSearch },
  { t: 'Payment failed for DD-1039', s: 'Customer notified · Yesterday', to: '/admin/orders/DD-1039', icon: CreditCard },
]

function useOutside(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  })
}

function Bell_() {
  const [open, setOpen] = useState(false)
  const n = useUnread()
  const [liveNotes, setLiveNotes] = useState<any[]>([])
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false))

  useEffect(() => {
    adminApi.getNotifications('all', 1, 6)
      .then((data) => {
        if (data) {
          if (typeof data.unread_count === 'number') {
            setUnreadCount(data.unread_count)
          }
          if (Array.isArray(data.items) && data.items.length > 0) {
            setLiveNotes(data.items)
          }
        }
      })
      .catch(() => {})
  }, [open])

  const handleMarkAll = async () => {
    try {
      await adminApi.markAllNotificationsRead()
      markAllRead()
      setLiveNotes((l) => l.map((x) => ({ ...x, read: true })))
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label={`Notifications, ${n} unread`} aria-expanded={open} className="relative grid size-10 place-items-center rounded-full hover:bg-soft">
        <Bell className="size-5" />
        {n > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-white">{n}</span>}
      </button>
      {open && (
        <div className="anim-pop fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-line bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <button onClick={handleMarkAll} disabled={n === 0} className="text-xs font-semibold text-brand disabled:text-ink-2">Mark all as read</button>
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {liveNotes.length > 0 ? liveNotes.map((x) => (
              <li key={x.id}>
                <Link
                  to={x.to || '/admin/notifications'}
                  onClick={() => {
                    setOpen(false)
                    if (!x.read && x.id) {
                      adminApi.markNotificationRead(x.id).catch(() => {})
                      setLiveNotes((l) => l.map((item) => (item.id === x.id ? { ...item, read: true } : item)))
                      setUnreadCount(Math.max(0, n - 1))
                    }
                  }}
                  className="flex gap-3 px-4 py-3 hover:bg-soft"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Bell className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-[13px]', !x.read ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>{x.text}</span>
                    <span className="block text-xs text-ink-2">{x.time}</span>
                  </span>
                  {!x.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                </Link>
              </li>
            )) : SAMPLE_NOTES.map((x, i) => (
              <li key={x.t}>
                <Link to={x.to} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-soft">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><x.icon className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className={cx('block text-[13px]', i < n ? 'font-semibold' : 'font-medium')}>{x.t}</span><span className="block text-xs text-ink-2">{x.s}</span></span>
                  {i < n && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/admin/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-[13px] font-semibold text-brand hover:bg-soft">View all</Link>
        </div>
      )}
    </div>
  )
}

function Profile() {
  const [open, setOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<{ full_name: string; email: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false))

  useEffect(() => {
    if (getAuthToken()) {
      authApi.getMe().then((u) => setAdminUser({ full_name: u.full_name || 'Admin', email: u.email })).catch(() => {})
    }
  }, [])

  const initials = adminUser?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AM'

  const handleLogout = () => {
    clearAuthToken()
    setOpen(false)
    go('/admin/login')
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-soft">
        <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-bold text-white">{initials}</span>
        <ChevronDown className="hidden size-4 text-ink-2 sm:block" />
      </button>
      {open && (
        <div className="anim-pop absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">{adminUser?.full_name || 'Administrator'}</p>
            {adminUser?.email && <p className="text-xs text-ink-2">{adminUser.email}</p>}
          </div>
          <button onClick={() => { setOpen(false); go('/admin/settings') }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-soft"><Settings className="size-4" />Account settings</button>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-bad hover:bg-soft"><LogOut className="size-4" />Sign out</button>
        </div>
      )}
    </div>
  )
}

export default function AdminShell({ path, children }: { path: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280)
  const [mobile, setMobile] = useState(false)
  const cur = navFor(path)
  useEffect(() => { setMobile(false) }, [path])

  // Auth guard — redirect to login if no token present
  useEffect(() => {
    if (!getAuthToken()) {
      go('/admin/login')
    }
  }, [path])

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('admin-search')?.focus() } }
    document.addEventListener('keydown', f)
    return () => document.removeEventListener('keydown', f)
  }, [])
  return (
    <div className="min-h-screen bg-[#f4f4f6]">
      <aside className={cx('fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 md:block', collapsed ? 'w-[72px]' : 'w-[264px]')}><Sidebar path={path} compact={collapsed} /></aside>
      {mobile && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setMobile(false)} />
          <div className="anim-pop absolute inset-y-0 left-0 w-[280px] max-w-[85vw]">
            <Sidebar path={path} compact={false} onNav={() => setMobile(false)} />
            <button onClick={() => setMobile(false)} aria-label="Close menu" className="absolute right-2 top-3 grid size-9 place-items-center rounded-full text-white hover:bg-white/10"><X className="size-5" /></button>
          </div>
        </div>
      )}
      <div className={cx('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'md:pl-[72px]' : 'md:pl-[264px]')}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white px-3 sm:px-5">
          <button onClick={() => setMobile(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-full hover:bg-soft md:hidden"><Menu className="size-5" /></button>
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden size-10 place-items-center rounded-full hover:bg-soft md:grid">{collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}</button>
          <div className="min-w-0 sm:mr-2">
            {cur && <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-ink-2 sm:block">{cur.group}</p>}
            <p className="truncate font-display text-xl font-bold leading-tight">{cur?.label ?? 'Admin'}</p>
          </div>
          <div className="relative mx-auto hidden max-w-md flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-2" />
            <input id="admin-search" placeholder="Search products, orders, customers…" className="h-10 w-full rounded-dd border border-line bg-soft pl-9 pr-14 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20" />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[11px] text-ink-2">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link to="/" className="hidden h-10 items-center gap-1.5 rounded-dd px-3 text-[13px] font-semibold hover:bg-soft sm:flex"><Store className="size-4" />View storefront<ExternalLink className="size-3.5 text-ink-2" /></Link>
            <Bell_ />
            <Profile />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
// keep unused-icon imports tree-shaken friendly
void [Globe, LayoutGrid, MessagesSquare, SlidersHorizontal]
