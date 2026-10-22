import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, ChevronRight, Heart, AtSign, Clock, Mail, MapPin, Menu, MessageCircle, Phone, Scale, Search, ShoppingCart, User, X, Loader2, Home, LayoutGrid, HelpCircle, FileText, Truck, Sparkles, Info } from 'lucide-react'
import { Link, go, useApp, resolveAssetUrl, useRoute } from './store'
import { CATS, PRODUCTS, catName } from './data'
import { Btn, Container, Drawer, Toasts, cx } from './ui'
import { catalogueApi } from './api'

export function AnnouncementBar() {
  const { storeSettings } = useApp()
  const [open, setOpen] = useState(true)

  if (!open || storeSettings.announcement_enabled === false) return null
  const msg = storeSettings.announcement_text || 'All Business Solutions — DisplayDelight · Premium Commercial Displays & Custom Signage'
  const phone = storeSettings.contact_phone || '+91 98403 27440'
  const siteName = storeSettings.site_name || 'DisplayDelight'

  return (
    <div className="bg-navy text-[13px] text-white/90">
      <Container className="flex h-9 items-center justify-between gap-2 sm:gap-4">
        <p className="min-w-0 flex-1 truncate text-[12px] sm:text-[13px]">
          <span className="font-semibold text-[#ff9b73]">{siteName}</span><span className="hidden xs:inline"> — </span><Link to="/shop" className="hidden xs:inline hover:underline">{msg}</Link>
        </p>
        <div className="announce-extras flex shrink-0 items-center gap-3 sm:gap-5">
          <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-1.5 hover:text-white"><Phone className="size-3.5" /><span className="hidden sm:inline">{phone}</span></a>
          <Link to="/track" className="hidden sm:inline hover:text-white">Track order</Link>
          <button aria-label="Dismiss announcement" onClick={() => setOpen(false)} className="grid size-6 place-items-center rounded hover:bg-white/10"><X className="size-3.5" /></button>
        </div>
      </Container>
    </div>
  )
}


export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const results = useMemo(() => q.trim().length < 1 ? [] : PRODUCTS.filter((p) => (p.name + p.sku + catName(p.cat)).toLowerCase().includes(q.toLowerCase())).slice(0, 5), [q])
  useEffect(() => { if (!q) return; setLoading(true); const t = setTimeout(() => setLoading(false), 350); return () => clearTimeout(t) }, [q])
  useEffect(() => { const f = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false); document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f) }, [])
  const submit = () => { if (!q.trim()) return; setOpen(false); go('/search?q=' + encodeURIComponent(q)) }
  return (
    <div ref={box} className={cx('relative', className)}>
      <div className="flex h-11 items-center rounded-dd border border-line bg-soft pl-3.5 transition focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/20">
        <Search className="size-[18px] text-ink-2" />
        <input
          autoFocus={autoFocus} value={q} role="combobox" aria-expanded={open} aria-label="Search products"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(-1) }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, -1)) }
            else if (e.key === 'Enter') { if (sel >= 0) { setOpen(false); go('/product/' + results[sel].id) } else submit() }
            else if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search digital standees, light boxes, roll-ups…" className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#8a8a8a]"
        />
        {q && <button aria-label="Clear search" onClick={() => { setQ(''); setOpen(false) }} className="grid size-8 place-items-center text-ink-2 hover:text-ink"><X className="size-4" /></button>}
        <button onClick={submit} className="mr-1 h-9 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">Search</button>
      </div>
      {open && q.trim() && (
        <div className="anim-pop absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-pop" role="listbox">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-ink-2"><Loader2 className="size-4 animate-spin" />Searching catalogue…</div>
          ) : results.length === 0 ? (
            <div className="p-5 text-center"><p className="font-semibold">No products match “{q}”</p><p className="mt-1 text-sm text-ink-2">Try a different keyword, or browse a category.</p><Btn size="sm" variant="secondary" className="mt-3" to="/shop">Browse all products</Btn></div>
          ) : (
            <>
              <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-ink-2">Products</p>
              {results.map((p, i) => (
                <Link key={p.id} to={`/product/${p.id}`} onClick={() => setOpen(false)} role="option" aria-selected={sel === i} className={cx('flex items-center gap-3 px-4 py-2.5', sel === i ? 'bg-brand-soft' : 'hover:bg-soft')}>
                  <img src={p.img} alt="" className="size-12 rounded-md bg-[#f3f1ee] object-cover mix-blend-multiply" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block text-xs text-ink-2">{p.sku} · {catName(p.cat)}</span></span>
                  <ArrowRight className="size-4 text-ink-2" />
                </Link>
              ))}
              <button onClick={submit} className="flex w-full items-center justify-between border-t border-line bg-soft px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-soft">View all results for “{q}”<ArrowRight className="size-4" /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function IconLink({ to, label, count, children }: { to: string; label: string; count?: number; children: ReactNode }) {
  return (
    <Link to={to} aria-label={label} className="relative grid size-10 place-items-center rounded-full text-ink hover:bg-soft">
      {children}
      {!!count && <span className="absolute right-0 top-0 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[18px] text-white">{count}</span>}
    </Link>
  )
}

export function SocialIcon({ platform, className = 'size-4' }: { platform: string; className?: string }) {
  const p = platform.toLowerCase()
  if (p.includes('instagram')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    )
  }
  if (p.includes('facebook')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    )
  }
  if (p.includes('youtube')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
      </svg>
    )
  }
  if (p.includes('linkedin')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    )
  }
  if (p.includes('twitter') || p.includes('x')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
      </svg>
    )
  }
  return <MessageCircle className={className} />
}

export function Header({
  mobileSearchOpen,
  setMobileSearchOpen,
}: {
  mobileSearchOpen?: boolean
  setMobileSearchOpen?: (open: boolean) => void
} = {}) {
  const { cart, wishlist, compare, categories, storeSettings, user } = useApp()
  const { path } = useRoute()
  const [menu, setMenu] = useState(false)
  const [mega, setMega] = useState(false)
  const [localMsearch, setLocalMsearch] = useState(false)
  const msearch = mobileSearchOpen !== undefined ? mobileSearchOpen : localMsearch
  const setMsearch = setMobileSearchOpen || setLocalMsearch
  const [catsOpen, setCatsOpen] = useState(true)
  const [navItems, setNavItems] = useState<Array<{ id: number; label: string; to: string; on: boolean; d: number }>>([])

  useEffect(() => {
    let active = true
    catalogueApi.getNavigation()
      .then((data) => {
        if (active && data?.header && Array.isArray(data.header)) {
          setNavItems(data.header.filter((i) => i.on !== false))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const count = cart.reduce((s, l) => s + l.qty, 0)
  const defaultNav: [string, string][] = [['About', '/about'], ['Gallery', '/gallery'], ['FAQ', '/faq'], ['Contact', '/contact']]
  const cats = categories && categories.length > 0 ? categories : CATS

  const waNum = (storeSettings.whatsapp_number || '919840327440').replace(/\D/g, '')
  const waMsg = encodeURIComponent(storeSettings.whatsapp_message || 'Hi DisplayDelight, I would like to know more about your commercial displays and custom signage.')
  const waUrl = `https://wa.me/${waNum}?text=${waMsg}`

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <Container className="flex h-[60px] items-center gap-2 sm:h-[68px] sm:gap-3 lg:gap-6">
          <button
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-soft active:bg-soft lg:hidden touch-manipulation"
            aria-label="Open navigation menu"
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          >
            <Menu className="size-5" />
          </button>

          <Link to="/" aria-label={`${storeSettings.site_name || 'DisplayDelight'} home`} className="flex shrink items-center gap-2 min-w-0">
            <img
              src={resolveAssetUrl(storeSettings.site_logo_url || '/logo-orange.png')}
              alt={storeSettings.site_name || 'DisplayDelight'}
              className="h-7 w-auto max-w-[125px] xs:max-w-[155px] sm:h-9 sm:max-w-[190px] md:max-w-[200px] object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex shrink-0" aria-label="Main navigation">
            <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
              <Link to="/shop" className="flex h-10 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold hover:bg-soft xl:px-4 xl:text-sm">Shop<ChevronDown className={cx('size-4 transition', mega && 'rotate-180')} /></Link>
              {mega && (
                <div className="anim-pop absolute left-0 top-full pt-2" style={{ width: 'min(760px, calc(100vw - 2rem))' }}>
                  <div className="grid grid-cols-[1fr_200px] overflow-hidden rounded-xl border border-line bg-white shadow-pop xl:grid-cols-[1fr_240px]">
                    <div className="grid grid-cols-2 gap-1 p-3">
                      {cats.map((c) => (
                        <Link key={c.id} to={`/category/${c.id}`} onClick={() => setMega(false)} className="flex items-center gap-2 rounded-lg p-2 hover:bg-soft xl:gap-3 xl:p-2.5">
                          <img src={resolveAssetUrl(c.img)} alt="" className="size-10 rounded-md bg-[#f3f1ee] object-cover mix-blend-multiply xl:size-14" />
                          <span><span className="block text-sm font-semibold">{c.name}</span><span className="line-clamp-2 text-xs text-ink-2">{c.blurb}</span></span>
                        </Link>
                      ))}
                    </div>
                    <div className="relative bg-navy p-4 text-white xl:p-5">
                      <img src={resolveAssetUrl('/p/hero.jpg')} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
                      <div className="relative"><p className="font-display text-2xl font-bold leading-none xl:text-3xl">Need it made your way?</p><p className="mt-2 text-xs text-white/75 xl:text-sm">Customise size, artwork and finish on supported products.</p><Btn size="sm" className="mt-4" to="/shop?customizable=Yes">Customizable range</Btn></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {navItems.length > 0 ? (
              navItems.map((item) => (
                <Link key={item.id} to={item.to} className="flex h-10 items-center rounded-full px-2.5 text-[13px] font-semibold hover:bg-soft xl:px-4 xl:text-sm">{item.label}</Link>
              ))
            ) : (
              defaultNav.map(([l, t]) => <Link key={t} to={t} className="flex h-10 items-center rounded-full px-2.5 text-[13px] font-semibold hover:bg-soft xl:px-4 xl:text-sm">{l}</Link>)
            )}
          </nav>

          <SearchBox className="hidden min-w-0 flex-1 max-w-[200px] lg:max-w-xs xl:max-w-md 2xl:max-w-xl md:block" />

          <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0">
            <button className="grid size-10 place-items-center rounded-full hover:bg-soft md:hidden touch-manipulation" aria-label="Search products" onClick={() => setMsearch(true)}><Search className="size-5" /></button>
            <a href={waUrl} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="hidden size-10 place-items-center rounded-full text-[#1f9d55] hover:bg-soft xl:grid"><MessageCircle className="size-5" /></a>
            <span className="hidden sm:block"><IconLink to="/compare" label="Compare products" count={compare.length}><Scale className="size-5" /></IconLink></span>
            <span className="hidden sm:block"><IconLink to="/wishlist" label="Wishlist" count={wishlist.length}><Heart className="size-5" /></IconLink></span>
            <IconLink
              to={user ? '/account' : '/login'}
              label={user ? `Account (${user.full_name || user.email || 'Profile'})` : 'Sign in to account'}
            >
              <div className="relative grid place-items-center">
                <User className={cx('size-5 transition', user && 'text-brand')} />
                {user && (
                  <span className="absolute -bottom-1 -right-1 size-2 rounded-full bg-emerald-500 ring-2 ring-white" title={`Logged in as ${user.full_name || user.email}`} />
                )}
              </div>
            </IconLink>
            <IconLink to="/cart" label="Shopping cart" count={count}><ShoppingCart className="size-5" /></IconLink>
          </div>
        </Container>
      </header>

      {/* Drawers placed outside header to prevent backdrop-filter containing block trap */}
      <Drawer open={msearch} onClose={() => setMsearch(false)} title="Search Catalogue" side="bottom">
        <div className="min-h-[50vh] p-4 max-w-full"><SearchBox autoFocus /></div>
      </Drawer>

      <Drawer open={menu} onClose={() => setMenu(false)} title="Menu" side="left">
        <div className="flex flex-col min-h-full">
          {/* Quick Search inside menu */}
          <div className="p-3 border-b border-line bg-soft/40">
            <SearchBox autoFocus={false} />
          </div>

          <div className="p-3 space-y-4 flex-1">
            {/* Primary Navigation */}
            <div>
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-2">Navigation</p>
              <div className="space-y-0.5">
                <Link
                  to="/"
                  onClick={() => setMenu(false)}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                    path === '/' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                  )}
                >
                  <Home className="size-4 text-brand" />
                  <span>Home</span>
                </Link>

                <Link
                  to="/shop"
                  onClick={() => setMenu(false)}
                  className={cx(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                    path === '/shop' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <LayoutGrid className="size-4 text-brand" />
                    <span>All Products</span>
                  </span>
                  <span className="text-xs text-brand font-medium">Browse →</span>
                </Link>

                <Link
                  to="/quote"
                  onClick={() => setMenu(false)}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                    path === '/quote' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                  )}
                >
                  <Sparkles className="size-4 text-brand" />
                  <span>Custom Signage / Quote</span>
                </Link>

                <Link
                  to="/gallery"
                  onClick={() => setMenu(false)}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                    path === '/gallery' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                  )}
                >
                  <Sparkles className="size-4 text-ink-2" />
                  <span>Client Showcase</span>
                </Link>

                {navItems.length > 0 ? (
                  navItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={() => setMenu(false)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                        path === item.to ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                      )}
                    >
                      <ChevronRight className="size-4 text-ink-2" />
                      <span>{item.label}</span>
                    </Link>
                  ))
                ) : (
                  <>
                    <Link
                      to="/about"
                      onClick={() => setMenu(false)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                        path === '/about' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                      )}
                    >
                      <Info className="size-4 text-ink-2" />
                      <span>About Us</span>
                    </Link>
                    <Link
                      to="/faq"
                      onClick={() => setMenu(false)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                        path === '/faq' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                      )}
                    >
                      <HelpCircle className="size-4 text-ink-2" />
                      <span>FAQ</span>
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setMenu(false)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                        path === '/contact' ? 'bg-brand-soft text-brand font-bold' : 'hover:bg-soft text-ink'
                      )}
                    >
                      <Phone className="size-4 text-ink-2" />
                      <span>Contact Us</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Categories Accordion */}
            <div className="rounded-xl border border-line bg-soft/30 p-2">
              <button
                type="button"
                onClick={() => setCatsOpen(!catsOpen)}
                className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-ink-2 hover:text-ink touch-manipulation"
              >
                <span>Shop By Category ({cats.length})</span>
                <ChevronDown className={cx('size-4 transition-transform duration-200', catsOpen && 'rotate-180')} />
              </button>

              {catsOpen && (
                <div className="mt-1 space-y-1 pt-1 border-t border-line/60">
                  {cats.map((c) => {
                    const isCatActive = path === `/category/${c.id}`
                    return (
                      <Link
                        key={c.id}
                        to={`/category/${c.id}`}
                        onClick={() => setMenu(false)}
                        className={cx(
                          'flex items-center gap-2.5 rounded-lg p-2 transition',
                          isCatActive ? 'bg-white shadow-xs font-bold text-brand' : 'hover:bg-white/80 text-ink'
                        )}
                      >
                        <img
                          src={resolveAssetUrl(c.img)}
                          alt=""
                          className="size-9 rounded-md bg-[#f3f1ee] object-cover mix-blend-multiply shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="block truncate text-[11px] text-ink-2">{c.blurb}</span>
                        </div>
                        <ChevronRight className="size-4 text-ink-2 shrink-0" />
                      </Link>
                    )
                  })}
                  <Link
                    to="/shop"
                    onClick={() => setMenu(false)}
                    className="block rounded-lg px-3 py-2 text-center text-xs font-bold text-brand hover:underline"
                  >
                    View All Categories & Products →
                  </Link>
                </div>
              )}
            </div>

            {/* Shopping & Account Shortcuts */}
            <div>
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-2">Account & Orders</p>
              <div className="space-y-0.5">
                <Link
                  to="/track"
                  onClick={() => setMenu(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft"
                >
                  <span className="flex items-center gap-3">
                    <Truck className="size-4 text-ink-2" />
                    <span>Track Order</span>
                  </span>
                  <span className="text-xs text-ink-2">Live status</span>
                </Link>

                <Link
                  to="/wishlist"
                  onClick={() => setMenu(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft"
                >
                  <span className="flex items-center gap-3">
                    <Heart className="size-4 text-ink-2" />
                    <span>Wishlist</span>
                  </span>
                  {wishlist.length > 0 && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                      {wishlist.length}
                    </span>
                  )}
                </Link>

                <Link
                  to="/compare"
                  onClick={() => setMenu(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft"
                >
                  <span className="flex items-center gap-3">
                    <Scale className="size-4 text-ink-2" />
                    <span>Compare Products</span>
                  </span>
                  {compare.length > 0 && (
                    <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-white">
                      {compare.length}
                    </span>
                  )}
                </Link>

                <Link
                  to={user ? '/account' : '/login'}
                  onClick={() => setMenu(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft"
                >
                  <span className="flex items-center gap-3">
                    <User className="size-4 text-ink-2" />
                    <span>{user ? `Account (${user.full_name?.split(' ')[0] || 'Profile'})` : 'Sign in / Register'}</span>
                  </span>
                  {user && <span className="size-2 rounded-full bg-emerald-500" />}
                </Link>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="border-t border-line bg-soft/50 p-3 space-y-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#25a55a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1f8f4d] transition"
            >
              <MessageCircle className="size-4" />
              <span>Chat on WhatsApp</span>
            </a>
            <p className="text-center text-[11px] text-ink-2">
              Fast response · Mon - Sat: 9:30 AM - 7:00 PM
            </p>
          </div>
        </div>
      </Drawer>
    </>
  )
}

export function Footer() {
  const { categories, storeSettings } = useApp()
  const [footerConfig, setFooterConfig] = useState<any>(null)

  useEffect(() => {
    let active = true
    catalogueApi.getFooter()
      .then((data) => {
        if (active && data) setFooterConfig(data)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const cats = categories && categories.length > 0 ? categories : CATS
  const col = (t: string, items: [string, string][], key?: string | number) => (
    <div key={key ?? t}>
      <h4 className="mb-4 font-sans text-xs font-bold uppercase tracking-[.16em] text-white/55">{t}</h4>
      <ul className="space-y-2.5 text-sm">
        {items.map(([l, to], idx) => (
          <li key={`${l}-${idx}`}>
            <Link to={to} className="text-white/85 hover:text-[#ff9b73]">{l}</Link>
          </li>
        ))}
      </ul>
    </div>
  )

  const waNum = (storeSettings.whatsapp_number || '919840327440').replace(/\D/g, '')
  const waMsg = encodeURIComponent(storeSettings.whatsapp_message || 'Hi DisplayDelight, I would like to know more about your commercial displays.')
  const waUrl = `https://wa.me/${waNum}?text=${waMsg}`

  const phone = footerConfig?.phone || storeSettings.contact_phone || '+91 98403 27440'
  const email = footerConfig?.email || storeSettings.contact_email || 'Displaydelight@gmail.com'
  const siteName = storeSettings.site_name || 'DisplayDelight'
  const tagline = footerConfig?.desc || storeSettings.site_tagline || 'Digital signage for business — digital standees, illuminated displays, tabletop signage and customised branding.'
  const address = footerConfig?.addr || storeSettings.business_address

  const activeSocials = (storeSettings.social_links || []).filter(([platform, url, on]) => {
    if (!on || !url) return false
    if (footerConfig?.soc && footerConfig.soc[platform] === false) return false
    return true
  })

  // Dynamic policies filtered by active status
  const policyDefs: Array<[string, string, string]> = [
    ['shipping', 'Shipping', '/policy/shipping'],
    ['returns', 'Returns', '/policy/returns'],
    ['warranty', 'Warranty', '/policy/warranty'],
    ['privacy', 'Privacy', '/policy/privacy'],
    ['terms', 'Terms', '/policy/terms'],
  ]
  const activePolicies: [string, string][] = policyDefs
    .filter(([key]) => footerConfig?.pol ? footerConfig.pol[key] !== false : true)
    .map(([_, label, to]) => [label, to])

  // Custom columns from admin if configured
  const customCols = footerConfig?.cols && Array.isArray(footerConfig.cols) && footerConfig.cols.length > 0
    ? footerConfig.cols
    : null

  return (
    <footer className="bg-navy text-white">
      <Container className="footer-grid grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] lg:gap-8 xl:gap-10 lg:py-14">
        <div>
          <Link to="/" className="inline-block">
            <img
              src={resolveAssetUrl(storeSettings.site_logo_url ? storeSettings.site_logo_url : '/logo-white.png')}
              alt={siteName}
              className="h-12 w-auto max-w-[220px] object-contain brightness-0 invert"
              onError={(e) => {
                // If custom logo fails to invert nicely, fallback directly to official logo-white.png
                (e.target as HTMLImageElement).src = resolveAssetUrl('/logo-white.png');
                (e.target as HTMLImageElement).className = "h-12 w-auto max-w-[220px] object-contain";
              }}
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{tagline}</p>
          <p className="mt-4 font-display text-2xl font-bold text-[#ff9b73]">Light Up. Stand Out. Sell More!</p>
          {activeSocials.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {activeSocials.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={platform}
                  className="grid size-9 place-items-center rounded-full bg-white/10 text-white/90 transition hover:bg-brand hover:text-white"
                >
                  <SocialIcon platform={platform} className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        {customCols ? (
          customCols.map((c: any, idx: number) => col(c.t, c.links || [], `col-custom-${idx}-${c.t}`))
        ) : (
          <>
            {col('Shop', cats.slice(0, 5).map((c) => [c.name, `/category/${c.id}`]), 'col-shop')}
            {col('Company', [['About', '/about'], ['Gallery', '/gallery'], ['Contact', '/contact'], ['FAQ', '/faq'], ['Request a quote', '/quote'], ['Track order', '/track']], 'col-company')}
          </>
        )}
        {col('Policies', activePolicies, 'col-policies')}
        <div>
          <h4 className="mb-4 font-sans text-xs font-bold uppercase tracking-[.16em] text-white/55">Get in touch</h4>
          <ul className="space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2"><Phone className="size-4 text-[#ff9b73]" /><a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a></li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-[#ff9b73]" /><a href={`mailto:${email}`}>{email}</a></li>
            {address && (
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[#ff9b73]" /><span className="leading-snug">{address}</span></li>
            )}
            {storeSettings.business_hours && (
              <li className="flex items-center gap-2"><Clock className="size-4 text-[#ff9b73]" /><span>{storeSettings.business_hours}</span></li>
            )}
          </ul>
          <a href={waUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 items-center gap-2 rounded-dd bg-[#25a55a] px-4 text-sm font-semibold hover:bg-[#1f8f4d]"><MessageCircle className="size-4" />WhatsApp us</a>
        </div>
      </Container>
      <div className="border-t border-white/10"><Container className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-white/55"><span className="text-center w-full sm:w-auto sm:text-left">© 2026 {siteName}. All rights reserved.</span><span className="flex gap-4 w-full justify-center sm:w-auto sm:justify-end"><Link to="/design" className="hover:text-white">Design system</Link><Link to="/admin" className="hover:text-white">Admin panel</Link></span></Container></div>
    </footer>
  )
}

export function CompareTray() {
  const { compare, toggleCompare } = useApp()
  if (!compare.length) return null
  return (
    <div className="anim-pop fixed bottom-20 sm:bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-xl bg-navy p-3 pl-4 text-white shadow-pop">
      <div className="flex -space-x-2">
        {compare.map((id) => { const p = PRODUCTS.find((x) => x.id === id)!; return (
          <span key={id} className="group relative"><img src={p.img} alt={p.name} className="size-10 rounded-full border-2 border-navy bg-white object-cover" /><button aria-label={`Remove ${p.name}`} onClick={() => toggleCompare(id)} className="absolute -right-1 -top-1 hidden size-4 place-items-center rounded-full bg-brand group-hover:grid"><X className="size-3" /></button></span>
        ) })}
      </div>
      <p className="flex-1 text-sm font-medium">{compare.length} to compare</p>
      <Btn size="sm" to="/compare" disabled={compare.length < 2}>Compare</Btn>
    </div>
  )
}

export function FloatingWhatsApp() {
  const { storeSettings } = useApp()
  const waNum = (storeSettings.whatsapp_number || '919840327440').replace(/\D/g, '')
  if (!waNum) return null
  const waMsg = encodeURIComponent(storeSettings.whatsapp_message || 'Hi DisplayDelight, I would like to know more about your commercial displays.')
  const waUrl = `https://wa.me/${waNum}?text=${waMsg}`

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2.5 rounded-full bg-[#25a55a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-[#1f8f4d] active:scale-95 sm:bottom-8 sm:right-8"
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">WhatsApp us</span>
    </a>
  )
}

export function MobileBottomNav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { path } = useRoute()
  const { cart, wishlist } = useApp()
  const cartCount = cart.reduce((s, l) => s + l.qty, 0)

  // Hide on checkout or product page to avoid collision with checkout actions or sticky purchase bar
  if (path.startsWith('/checkout') || path.startsWith('/product/')) return null

  const items = [
    { label: 'Home', to: '/', icon: Home, active: path === '/' },
    { label: 'Shop', to: '/shop', icon: LayoutGrid, active: path === '/shop' || path.startsWith('/category/') },
    { label: 'Search', action: onOpenSearch, icon: Search, active: path.startsWith('/search') },
    { label: 'Wishlist', to: '/wishlist', icon: Heart, count: wishlist.length, active: path === '/wishlist' },
    { label: 'Cart', to: '/cart', icon: ShoppingCart, count: cartCount, active: path === '/cart' },
  ]

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-35 flex h-16 items-center justify-around border-t border-line bg-white/95 backdrop-blur px-2 pb-safe lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      {items.map((item) => {
        const Icon = item.icon
        const content = (
          <span className="flex flex-col items-center justify-center gap-0.5 relative py-1 px-3">
            <span className="relative">
              <Icon className={cx('size-5 transition-transform duration-150', item.active ? 'text-brand scale-110' : 'text-ink-2')} />
              {!!item.count && (
                <span className="absolute -top-1.5 -right-2.5 grid min-w-[16px] h-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {item.count}
                </span>
              )}
            </span>
            <span className={cx('text-[10px] font-medium leading-tight tracking-tight', item.active ? 'text-brand font-bold' : 'text-ink-2')}>
              {item.label}
            </span>
          </span>
        )

        if (item.action) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="flex-1 flex items-center justify-center py-1 touch-manipulation focus:outline-none"
              aria-label={item.label}
            >
              {content}
            </button>
          )
        }

        return (
          <Link
            key={item.label}
            to={item.to!}
            className="flex-1 flex items-center justify-center py-1 touch-manipulation focus:outline-none"
            aria-label={item.label}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { path } = useRoute()
  const isBottomNavVisible = !path.startsWith('/checkout') && !path.startsWith('/product/')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header mobileSearchOpen={mobileSearchOpen} setMobileSearchOpen={setMobileSearchOpen} />
      <main className={cx('flex-1', isBottomNavVisible && 'pb-16 lg:pb-0')}>{children}</main>
      <Footer />
      <CompareTray />
      <FloatingWhatsApp />
      <MobileBottomNav onOpenSearch={() => setMobileSearchOpen(true)} />
      <Toasts />
    </div>
  )
}
