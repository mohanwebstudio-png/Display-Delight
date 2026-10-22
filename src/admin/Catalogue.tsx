import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardList, Lock, MoreHorizontal, PackageX, Plus, Receipt, ShoppingBag, Sparkles, Star, Trash2, Wallet, Boxes, CircleDollarSign, ImageOff, X, UploadCloud, RotateCcw } from 'lucide-react'
import { go, Link, useApp } from '../store'
import { CATS, PRODUCTS, byId, catName, inr, type Product } from '../data'
import { Badge, Btn, Check_, EmptyState, ErrorState, Field, Input, Modal, Notice, Segmented, Select, Skeleton, Switch, Tabs, Textarea, Uploader, cx } from '../ui'
import { AdminPage, Card, Pager, SampleNote, SaveBar, Stat, StatusBadge, Table, Td, Toolbar, Tr, useDirty } from './kit'
import { Chips, PROFILES, move, profileFieldSummary, profileOf, profileProducts, slug } from './Builder'
import { adminApi, catalogueApi, normalizeProduct, uploadsApi } from '../api'
import shopBoardImg from '../assets/environments/shop_board.jpg'
import hallWallImg from '../assets/environments/hall_wall.jpg'
import counterDeskImg from '../assets/environments/counter_desk.jpg'
import galleryWallImg from '../assets/environments/gallery_wall.jpg'
import marbleShelfImg from '../assets/environments/marble_glass_shelf.jpg'
import lollipopStorefrontImg from '../assets/environments/lollipop_storefront.jpg'
import lollipopDuskImg from '../assets/environments/lollipop_dusk.jpg'

export { Attributes, Categories, Variants } from './Taxonomy'
export { CustomizationBuilder, CustomizationProfiles } from './Builder'

/* ================= Dashboard ================= */
type Range = 'today' | '7d' | '30d'
type DState = 'ready' | 'loading' | 'empty' | 'error' | 'restricted'

function TrendChart({ data }: { data: number[] }) {
  const W = 640, H = 210, P = { l: 34, r: 10, t: 12, b: 24 }
  const max = Math.ceil(Math.max(...data) / 5) * 5 || 5
  const x = (i: number) => P.l + (i / (data.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sample line chart of orders over time">
      <defs><linearGradient id="ordfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e84b1a" stopOpacity=".22" /><stop offset="1" stopColor="#e84b1a" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((t) => { const v = (max / 4) * t; return <g key={t}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#ececf0" /><text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#616161">{Math.round(v)}</text></g> })}
      <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#ordfill)" />
      <path d={line} fill="none" stroke="#e84b1a" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="4" fill="#e84b1a" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

export function Dashboard() {
  const { toast } = useApp()
  const [range, setRange] = useState<Range>('7d')
  const [st, setSt] = useState<DState>('ready')
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null)

  useEffect(() => {
    let active = true
    adminApi.getAnalytics(range)
      .then((data) => {
        if (active && data) {
          setLiveAnalytics(data)
        }
      })
      .catch((err) => {
        console.warn('Analytics loading error:', err)
      })
    return () => { active = false }
  }, [range])

  const k = liveAnalytics?.kpi?.[range] ?? [
    liveAnalytics?.orders?.total || 0,
    liveAnalytics?.orders?.processing || 0,
    liveAnalytics?.orders?.pending_payment || 0,
    liveAnalytics?.quotations?.pending || 0,
    liveAnalytics?.attention_products?.length || 0,
    liveAnalytics?.inventory?.low_stock || 0,
  ]
  const chartData = liveAnalytics?.series?.[range] ?? [0, 0, 0, 0, 0, 0]
  const recentOrders = liveAnalytics?.recent_orders ?? []
  const recentEnquiries = liveAnalytics?.recent_enquiries ?? []
  const attentionItems = liveAnalytics?.attention_products ?? []

  const tiles = [
    { l: 'Total orders', i: <ShoppingBag className="size-4" />, to: '/admin/orders', t: 'brand' as const }, { l: 'Awaiting processing', i: <ClipboardList className="size-4" />, to: '/admin/orders', t: 'warn' as const },
    { l: 'Pending payments', i: <Wallet className="size-4" />, to: '/admin/orders', t: 'warn' as const }, { l: 'New quotation requests', i: <Receipt className="size-4" />, to: '/admin/quotes', t: 'brand' as const },
    { l: 'Products needing attention', i: <Boxes className="size-4" />, to: '/admin/products', t: 'bad' as const }, { l: 'Low-stock items', i: <PackageX className="size-4" />, to: '/admin/inventory', t: 'bad' as const },
  ]
  let body
  if (st === 'loading') body = (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
    </div>
  )
  else if (st === 'empty') body = <EmptyState icon={<ShoppingBag className="size-6" />} title="No activity yet" text="Orders, quotation requests and alerts will appear here once the store starts receiving them." action={<Btn to="/admin/products/new" icon={<Plus className="size-4" />}>Add a product</Btn>} />
  else if (st === 'error') body = <ErrorState title="Dashboard could not be loaded" text="The analytics service did not respond. Your data is safe. Try again in a moment." onRetry={() => { setSt('loading'); setTimeout(() => setSt('ready'), 900) }} />
  else if (st === 'restricted') body = <EmptyState icon={<Lock className="size-6" />} title="You do not have access to the dashboard" text="Your role does not include reporting permissions. Ask an administrator to grant Dashboard access." action={<Btn variant="secondary" onClick={() => toast('Access request sent to administrators', 'info')}>Request access</Btn>} />
  else body = (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold">Live Database Analytics:</span>
          <span>{liveAnalytics?.orders?.total ?? 0} total orders · {liveAnalytics?.quotations?.pending ?? 0} pending quote requests</span>
        </div>
        <div className="font-bold tabular-nums">
          Total Revenue: {inr(liveAnalytics?.revenue?.total_rupees ?? 0)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t, i) => <Link key={t.l} to={t.to} className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-card"><Stat label={t.l} value={k[i]} icon={t.i} tone={t.t} note="Live database value" /></Link>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Orders over time" desc={`Live database order activity (${range})`}>
          <TrendChart data={chartData} />
          <p className="mt-1 text-center text-[11px] text-ink-2">Orders per {range === 'today' ? 'hour' : 'day'}</p>
        </Card>
        <Card title="Products requiring attention" pad={false} actions={<Link to="/admin/products" className="text-xs font-semibold text-brand">View all</Link>}>
          <ul className="divide-y divide-line">
            {attentionItems.map((a: any) => {
              const p = byId(a.id)
              const name = a.name || p?.name || a.id
              const img = a.img || p?.img || '/demo-standee.jpg'
              return (
                <li key={a.id}><Link to={`/admin/products/${a.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-soft">
                  <img src={img} alt="" className="size-9 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{name}</p><p className="flex items-center gap-1 text-xs text-ink-2"><AlertTriangle className="size-3 text-amber-500" />{a.why}</p></div>
                </Link></li>
              )
            })}
          </ul>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Recent orders" pad={false} actions={<Link to="/admin/orders" className="text-xs font-semibold text-brand">All orders</Link>}>
          <div className="hidden md:block"><Table head={['Order', 'Customer', 'Total', 'Status']}>
            {recentOrders.map((o: any) => <Tr key={o.id} onClick={() => go('/admin/orders/' + o.id)}><Td className="font-semibold text-brand">{o.id}</Td><Td>{o.who}</Td><Td className="tabular-nums">{inr(o.total)}</Td><Td><StatusBadge s={o.s} /></Td></Tr>)}
          </Table></div>
          <ul className="divide-y divide-line md:hidden">{recentOrders.map((o: any) => <li key={o.id}><Link to={'/admin/orders/' + o.id} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-semibold">{o.id}</p><p className="text-xs text-ink-2">{o.who} · {inr(o.total)}</p></div><StatusBadge s={o.s} /></Link></li>)}</ul>
        </Card>
        <div className="space-y-4">
          <Card title="Recent enquiries" pad={false} actions={<Link to="/admin/quotes" className="text-xs font-semibold text-brand">Open</Link>}>
            <ul className="divide-y divide-line">{recentEnquiries.map((e: any) => <li key={e.who + e.when}><Link to="/admin/quotes" className="block px-5 py-2.5 hover:bg-soft"><p className="text-[13px] font-semibold">{e.who}</p><p className="text-xs text-ink-2">{e.what} · {e.when}</p></Link></li>)}</ul>
          </Card>
          <Card title="Important notifications">
            <div className="space-y-2"><Notice tone="info" title="Storefront and admin connected to SQLite database" /><Notice tone="ok" title="Razorpay gateway integrated with webhook verification" /></div>
          </Card>
        </div>
      </div>
    </div>
  )
  return (
    <AdminPage title="Dashboard" desc="What needs your attention across orders, quotations and the catalogue."
      actions={<>{st === 'ready' && <Segmented value={range} onChange={setRange} options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} />}</>}>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-dd border border-dashed border-line bg-white px-3 py-2">
        <span className="text-xs font-semibold text-ink-2">State demo</span>
        <Segmented value={st} onChange={setSt} options={[{ value: 'ready', label: 'Ready' }, { value: 'loading', label: 'Loading' }, { value: 'empty', label: 'Empty' }, { value: 'error', label: 'Error' }, { value: 'restricted', label: 'Restricted' }]} />
      </div>
      {body}
    </AdminPage>
  )
}

/* ================= Product list ================= */
const PAGE = 8

export function ProductList() {
  const { toast, products: liveProducts, categories: liveCats, refreshCatalogue } = useApp()
  const cats = liveCats.length > 0 ? liveCats : CATS
  const [adminProducts, setAdminProducts] = useState<Product[]>([])
  const [loadingProds, setLoadingProds] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const [over, setOver] = useState<Record<string, string>>({})
  const [gone, setGone] = useState<string[]>([])
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [del, setDel] = useState<Product | null>(null)

  const loadAdminProducts = async () => {
    try {
      setLoadingProds(true)
      const res = await adminApi.getProducts({ page_size: 100 })
      if (res && Array.isArray(res.items)) {
        setAdminProducts(res.items.map(normalizeProduct))
      }
    } catch (err) {
      console.warn('Failed to load admin products:', err)
    } finally {
      setLoadingProds(false)
    }
  }

  useEffect(() => {
    loadAdminProducts()
  }, [])

  const allProds = adminProducts.length > 0 ? adminProducts : (liveProducts.length > 0 ? liveProducts : PRODUCTS)
  const rows = allProds.map((p) => {
    const st = over[p.id] ?? (p.status || 'Published')
    const av = p.stock === 0 ? 'Out of stock' : (p.stock != null && p.stock < 5) ? 'Low stock' : 'In stock'
    return { p, st, av }
  })
    .filter((r) => !gone.includes(r.p.id) && (!cat || r.p.cat === cat) && (!status || r.st.toLowerCase() === status.toLowerCase()) && (!q || (r.p.name + r.p.sku).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === 'name' ? a.p.name.localeCompare(b.p.name) : sort === 'low' ? (a.p.price ?? 1e9) - (b.p.price ?? 1e9) : (b.p.price ?? -1) - (a.p.price ?? -1))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = rows.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE)
  const act = async (id: string, a: string) => {
    setMenu(null)
    const p = allProds.find((x) => x.id === id || x.sku === id || (x as any).slug === id) || byId(id)
    if (!p) return
    if (a === 'Edit') go('/admin/products/' + (p.slug || p.id))
    else if (a === 'Duplicate') {
      try {
        await adminApi.createProduct({
          name: `${p.name} (Copy)`,
          sku: `${p.sku}-COPY-${Math.floor(Math.random() * 900 + 100)}`,
          slug: `${p.id}-copy-${Date.now()}`,
          short_description: p.blurb,
          description: p.description || p.blurb,
          category_id: p.cat,
          base_price_paise: p.price ? p.price * 100 : null,
          status: 'draft',
          kind: p.kind || 'standard',
        })
        await refreshCatalogue()
        await loadAdminProducts()
        toast(`Created a draft copy of ${p.name}`, 'ok')
      } catch (err: any) {
        toast('Could not duplicate product: ' + (err?.error || ''), 'err')
      }
    }
    else if (a === 'Unpublish') {
      await adminApi.updateProduct(p.slug || p.id, { status: 'draft' }).catch(() => {})
      await refreshCatalogue()
      await loadAdminProducts()
      setOver({ ...over, [p.id]: 'Draft' })
      toast(`${p.name} moved to draft and updated on storefront`)
    } else if (a === 'Archive') {
      await adminApi.updateProduct(p.slug || p.id, { status: 'archived' }).catch(() => {})
      await refreshCatalogue()
      await loadAdminProducts()
      setOver({ ...over, [p.id]: 'Archived' })
      toast(`${p.name} archived and hidden on storefront`)
    } else setDel(p)
  }
  const openMenu = (e: React.MouseEvent, id: string) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ id, x: Math.min(r.right - 176, window.innerWidth - 190), y: Math.min(r.bottom + 4, window.innerHeight - 220) }) }
  const Dots = ({ id }: { id: string }) => <button aria-label="Row actions" aria-haspopup="menu" onClick={(e) => openMenu(e, id)} className="grid size-9 place-items-center rounded-full hover:bg-soft"><MoreHorizontal className="size-4" /></button>
  const reset = (f: () => void) => { f(); setPage(1) }
  return (
    <AdminPage title="Products" desc="Live catalogue database. Real-time pricing and inventory." actions={<Btn icon={<Plus className="size-4" />} onClick={() => go('/admin/products/new')}>Add product</Btn>}>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <Toolbar search={q} onSearch={(v) => reset(() => setQ(v))} placeholder="Search name or SKU">
          <div className="w-full sm:w-52"><Select aria-label="Category" value={cat} onChange={(e) => reset(() => setCat(e.target.value))} className="h-10"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          <div className="w-[48%] sm:w-36"><Select aria-label="Status" value={status} onChange={(e) => reset(() => setStatus(e.target.value))} className="h-10"><option value="">All statuses</option><option value="Published">Published</option><option value="Draft">Draft</option><option value="Archived">Archived</option></Select></div>
          <div className="w-[48%] sm:w-44"><Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10"><option value="name">Name A–Z</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></Select></div>
        </Toolbar>
        {rows.length === 0 ? <div className="p-6"><EmptyState icon={<Boxes className="size-6" />} title="No products match" text="Try a different search or clear the filters." action={<Btn variant="secondary" onClick={() => { setQ(''); setCat(''); setStatus('') }}>Clear filters</Btn>} /></div> : <>
          <div className="hidden md:block">
            <Table head={['Product', 'SKU', 'Category', 'Price', 'Availability', 'Status', '']}>
              {cur.map(({ p, st, av }) => (
                <Tr key={p.id} onClick={() => go('/admin/products/' + (p.slug || p.id))}>
                  <Td><div className="flex items-center gap-3"><img src={p.img} alt="" className="size-10 rounded-lg bg-soft object-cover" /><span className="font-semibold">{p.name}</span></div></Td>
                  <Td className="font-mono text-xs text-ink-2">{p.sku}</Td><Td className="text-ink-2">{catName(p.cat)}</Td>
                  <Td className="tabular-nums">{p.price == null ? <span className="text-ink-2">Not set</span> : inr(p.price)}</Td>
                  <Td><StatusBadge s={av} /></Td><Td><StatusBadge s={st} /></Td>
                  <Td><div className="flex items-center justify-end gap-1"><Btn size="sm" variant="secondary" onClick={() => go('/admin/products/' + (p.slug || p.id))}>Edit</Btn><Dots id={p.id} /></div></Td>
                </Tr>
              ))}
            </Table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {cur.map(({ p, st, av }) => (
              <li key={p.id} className="flex gap-3 p-3">
                <img src={p.img} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1"><Link to={'/admin/products/' + (p.slug || p.id)} className="block truncate text-sm font-semibold">{p.name}</Link><p className="text-xs text-ink-2">{p.sku} · {p.price == null ? 'Price not set' : inr(p.price)}</p><div className="mt-1.5 flex flex-wrap gap-1"><StatusBadge s={st} /><StatusBadge s={av} /></div></div>
                <Dots id={p.id} />
              </li>
            ))}
          </ul>
          <Pager page={Math.min(page, pages)} pages={pages} onChange={setPage} total={`${rows.length} product${rows.length === 1 ? '' : 's'}`} />
        </>}
      </div>
      {menu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} />
          <div role="menu" className="anim-pop fixed z-[61] w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop" style={{ left: menu.x, top: menu.y }}>
            {['Edit', 'Duplicate', 'Unpublish', 'Archive', 'Delete'].map((a) => <button key={a} role="menuitem" onClick={() => act(menu.id, a)} className={cx('block w-full px-4 py-2 text-left text-sm hover:bg-soft', a === 'Delete' && 'text-bad')}>{a}</button>)}
          </div>
        </>
      )}
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this product?" footer={<><Btn variant="secondary" onClick={() => setDel(null)}>Cancel</Btn><Btn variant="danger" icon={<Trash2 className="size-4" />} onClick={async () => {
        if (del) {
          await adminApi.deleteProduct(del.slug || del.id).catch(() => {})
          await refreshCatalogue()
          await loadAdminProducts()
        }
        setGone([...gone, del!.id])
        toast(`${del!.name} deleted from catalogue and database`)
        setDel(null)
      }}>Delete product</Btn></>}>
        <p><b className="text-ink">{del?.name}</b> will be removed from the catalogue and the storefront. Existing orders keep their record of it. This cannot be undone. Consider archiving instead.</p>
      </Modal>
    </AdminPage>
  )
}

/* ================= Product editor ================= */
const SECTIONS = ['Basic Information', 'Images & Videos', 'Categories', 'Product Attributes', 'Specifications', 'Variants & Options', 'Pricing & Inventory', 'Customization Profile', 'Related Products', 'SEO', 'Publication'] as const
type Sec = (typeof SECTIONS)[number]
interface Form {
  name: string; sku: string; slug: string; blurb: string; desc: string; features: string[]; cat: string; extraCats: string[]; specs: [string, string][]
  images: string[]; video: string; variants: { label: string; sku: string; price: string; on: boolean }[]; price: string; quoteOnly: boolean; gst: string; track: boolean; stock: string; low: string
  profile: string; attributes: Record<string, any>; related: string[]; seoTitle: string; seoDesc: string; visible: boolean; status: 'Draft' | 'Published'; schedule: string; featured: boolean; kind: 'standard' | 'digital' | 'custom'
}
const blank = (defaultCat: string): Form => ({
  name: '',
  sku: '',
  slug: '',
  blurb: '',
  desc: '',
  features: [],
  cat: defaultCat,
  extraCats: [],
  specs: [['', '']],
  images: [],
  video: '',
  variants: [],
  price: '',
  quoteOnly: false,
  gst: '18',
  track: true,
  stock: '15',
  low: '5',
  profile: '',
  attributes: {},
  related: [],
  seoTitle: '',
  seoDesc: '',
  visible: true,
  status: 'Published',
  schedule: '',
  featured: false,
  kind: 'standard',
})

const fromProduct = (p: Product, raw?: any): Form => {
  const basePaise = raw?.base_price_paise != null
    ? raw.base_price_paise
    : ((p.price || 0) * 100)
  const baseInr = Math.round(basePaise / 100)

  let variants = p.sizes.map((s, i) => ({
    label: s,
    sku: `${p.sku}-${String(i + 1).padStart(2, '0')}`,
    price: baseInr > 0 ? String(baseInr) : '',
    on: true,
  }))
  const sourceVariants = (raw && Array.isArray(raw.variants) && raw.variants.length > 0) ? raw.variants : p.variants
  if (sourceVariants && sourceVariants.length > 0) {
    variants = sourceVariants.map((v: any, i: number) => {
      let priceStr = ''
      if (v.price_delta_paise != null) {
        priceStr = String(Math.round((basePaise + v.price_delta_paise) / 100))
      } else if (v.price != null && v.price !== '') {
        priceStr = String(v.price)
      } else if (baseInr > 0) {
        priceStr = String(baseInr)
      }
      return {
        label: v.name || `Option ${i + 1}`,
        sku: v.sku || `${p.sku}-${String(i + 1).padStart(2, '0')}`,
        price: priceStr,
        on: v.is_active ?? true,
      }
    })
  }
  return {
    name: p.name,
    sku: p.sku,
    slug: p.slug || p.id,
    blurb: p.blurb,
    desc: p.description || p.blurb || '',
    features: p.features || [],
    cat: p.cat,
    extraCats: [],
    specs: p.specs && p.specs.length > 0 ? p.specs.map(([a, b]) => [a, b]) : [['', '']],
    images: (p.images && p.images.length > 0) ? p.images : (p.img ? [p.img] : []),
    video: '',
    variants,
    price: p.price == null ? '' : String(p.price),
    quoteOnly: p.price == null,
    gst: '18',
    track: p.kind !== 'custom',
    stock: String(p.stock ?? 15),
    low: '5',
    profile: (raw?.profile || raw?.profile_id || profileOf(p)) ?? '',
    attributes: (() => {
      const attrs = { ...(raw?.attributes || p.attrs || {}) }
      if (p.specs && Array.isArray(p.specs)) {
        for (const item of p.specs) {
          const k = Array.isArray(item) ? item[0] : (item?.label || '')
          const v = Array.isArray(item) ? item[1] : (item?.value || '')
          if (k === '3D Wall: Shop Board' && v && !attrs.shop_wall_image) attrs.shop_wall_image = v
          if (k === '3D Wall: Commercial Hall' && v && !attrs.hall_wall_image) attrs.hall_wall_image = v
          if (k === '3D Wall: Counter Desk' && v && !attrs.counter_desk_image) attrs.counter_desk_image = v
          if (k === '3D Wall: Gallery Wall' && v && !attrs.gallery_wall_image) attrs.gallery_wall_image = v
          if ((k === '3D Scene: Marble Shelf' || k === '3D Wall: Marble Shelf' || k === '3D Wall: Shelf') && v && !attrs.shelf_image) attrs.shelf_image = v
          if (k === '3D Default Scene' && v && !attrs.default_scene) attrs.default_scene = v
          if (k === '3D Default Orientation' && v && !attrs.default_orientation) attrs.default_orientation = v
        }
      }
      return attrs
    })(),
    related: [],
    seoTitle: `${p.name} | DisplayDelight`,
    seoDesc: p.blurb,
    visible: p.status !== 'Draft',
    status: (p.status === 'Draft' ? 'Draft' : 'Published'),
    schedule: '',
    featured: (raw?.is_featured ?? raw?.is_customizable) || false,
    kind: (raw?.kind || p.kind || 'standard') as 'standard' | 'digital' | 'custom',
  }
}

const Sec_ = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => <Card title={title} desc={desc}><div className="space-y-4">{children}</div></Card>

export function ProductEditor({ id }: { id: string }) {
  const { toast, categories: liveCats, products: liveProds, refreshCatalogue } = useApp()
  const cats = liveCats.length > 0 ? liveCats : CATS
  const isNew = id === 'new'
  const inMemory = isNew ? undefined : (liveProds.find((x) => x.id === id || x.sku === id || (x as any).slug === id) || byId(id))
  const [prod, setProd] = useState<Product | undefined>(inMemory)
  const [loadingProd, setLoadingProd] = useState(!isNew && !inMemory)

  const d = useDirty<Form>(prod ? fromProduct(prod) : blank(cats[0]?.id || ''))
  const f = d.v
  const [tab, setTab] = useState<Sec>('Basic Information')
  const [errs, setErrs] = useState<{ name?: string; sku?: string }>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rq, setRq] = useState('')
  const [uploadingShop, setUploadingShop] = useState(false)
  const [uploadingHall, setUploadingHall] = useState(false)
  const [uploadingCounter, setUploadingCounter] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [uploadingShelf, setUploadingShelf] = useState(false)

  const isUltraSlimProd = f.sku.includes('USL') || f.slug.includes('ultra-slim') || f.name.toLowerCase().includes('ultra slim')
  const isCardStandProd = f.sku.includes('TCS') || f.slug.includes('card-stand') || f.cat.includes('card') || f.name.toLowerCase().includes('card stand')
  const isFabricProd = f.sku.includes('FAB') || f.slug.includes('fabric') || f.cat.includes('fabric') || f.name.toLowerCase().includes('fabric')
  const isRotatingLollipopProd = f.sku.includes('RLPB') || f.slug.includes('rotating') || f.name.toLowerCase().includes('rotating')
  const isLollipopProd = (f.sku.includes('LPB') || f.slug.includes('lollipop') || f.cat.includes('lollipop') || f.name.toLowerCase().includes('lollipop')) && !isRotatingLollipopProd

  const [profilesList, setProfilesList] = useState<any[]>([])
  const [attributesList, setAttributesList] = useState<any[]>([])

  useEffect(() => {
    adminApi.getCustomizationProfiles()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setProfilesList(data)
        else setProfilesList([...PROFILES])
      })
      .catch(() => setProfilesList([...PROFILES]))

    adminApi.getAttributes()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAttributesList(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) return
    let active = true
    adminApi.getProduct(id)
      .then((data) => {
        if (active && data) {
          const norm = normalizeProduct(data)
          setProd(norm)
          d.reset()
          d.set(fromProduct(norm, data))
        }
      })
      .catch(() => {
        catalogueApi.getProduct(id)
          .then((data) => {
            if (active && data) {
              const norm = normalizeProduct(data)
              setProd(norm)
              d.reset()
              d.set(fromProduct(norm, data))
            }
          })
          .catch(() => {})
      })
      .finally(() => {
        if (active) setLoadingProd(false)
      })
    return () => { active = false }
  }, [id, isNew])

  if (!isNew && loadingProd && !prod) {
    return (
      <AdminPage title="Loading product..." crumbs={[{ label: 'Products', to: '/admin/products' }, { label: 'Loading...' }]}>
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminPage>
    )
  }

  if (!isNew && !prod) return <AdminPage title="Product not found"><EmptyState title="We could not find this product" text="It may have been deleted or the link is wrong." action={<Btn to="/admin/products">Back to products</Btn>} /></AdminPage>

  const save = async () => {
    const e: typeof errs = {}
    if (!f.name.trim()) e.name = 'Product name is required'
    if (!f.sku.trim()) e.sku = 'SKU is required'
    setErrs(e)
    if (e.name || e.sku) { setTab('Basic Information'); toast('Fix the highlighted fields before saving', 'err'); return }
    setSaving(true)
    try {
      const payload = {
        name: f.name.trim(),
        sku: f.sku.trim().toUpperCase(),
        slug: f.slug.trim() || f.name.toLowerCase().replace(/\s+/g, '-'),
        short_description: f.blurb,
        description: f.desc,
        base_price_paise: f.quoteOnly || !f.price ? null : Math.round(parseFloat(f.price) * 100),
        category_id: f.cat,
        kind: f.kind || 'standard',
        status: f.status.toLowerCase(),
        is_customizable: f.kind === 'custom' || f.featured,
        is_featured: f.featured,
        profile: f.profile || null,
        attributes: f.attributes || {},
        images: f.images.map((imgUrl, idx) => ({
          image_url: imgUrl,
          alt_text: f.name,
          is_primary: idx === 0,
        })),
        specs: (() => {
          const cleanedSpecs = f.specs.filter(([k, v]) => {
            const key = k.trim()
            if (
              key === '3D Wall: Shop Board' ||
              key === '3D Wall: Commercial Hall' ||
              key === '3D Wall: Counter Desk' ||
              key === '3D Wall: Gallery Wall' ||
              key === '3D Scene: Marble Shelf' ||
              key === '3D Wall: Marble Shelf' ||
              key === '3D Default Scene' ||
              key === '3D Default Orientation' ||
              key === '3D Default Shape'
            ) return false
            return key && v.trim()
          })
          if (isFabricProd) {
            if (f.attributes?.shop_wall_image) {
              cleanedSpecs.push(['3D Wall: Shop Board', f.attributes.shop_wall_image])
            }
            if (f.attributes?.hall_wall_image) {
              cleanedSpecs.push(['3D Wall: Commercial Hall', f.attributes.hall_wall_image])
            }
            cleanedSpecs.push(['3D Default Scene', f.attributes?.default_scene || 'shop'])
          } else if (isUltraSlimProd) {
            if (f.attributes?.counter_desk_image) {
              cleanedSpecs.push(['3D Wall: Counter Desk', f.attributes.counter_desk_image])
            }
            if (f.attributes?.gallery_wall_image) {
              cleanedSpecs.push(['3D Wall: Gallery Wall', f.attributes.gallery_wall_image])
            }
            cleanedSpecs.push(['3D Default Scene', f.attributes?.default_scene || 'counter'])
            if (f.attributes?.default_orientation) {
              cleanedSpecs.push(['3D Default Orientation', f.attributes.default_orientation])
            }
          } else if (isCardStandProd) {
            if (f.attributes?.shelf_image) {
              cleanedSpecs.push(['3D Scene: Marble Shelf', f.attributes.shelf_image])
            }
            if (f.attributes?.counter_desk_image) {
              cleanedSpecs.push(['3D Wall: Counter Desk', f.attributes.counter_desk_image])
            }
            cleanedSpecs.push(['3D Default Scene', f.attributes?.default_scene || 'shelf'])
            if (f.attributes?.default_orientation) {
              cleanedSpecs.push(['3D Default Orientation', f.attributes.default_orientation])
            }
          } else if (isLollipopProd || isRotatingLollipopProd) {
            if (f.attributes?.shop_wall_image) {
              cleanedSpecs.push(['3D Wall: Shop Board', f.attributes.shop_wall_image])
            }
            if (f.attributes?.hall_wall_image) {
              cleanedSpecs.push(['3D Wall: Commercial Hall', f.attributes.hall_wall_image])
            }
            cleanedSpecs.push(['3D Default Scene', f.attributes?.default_scene || 'shop'])
            if (isLollipopProd && f.attributes?.default_shape) {
              cleanedSpecs.push(['3D Default Shape', f.attributes.default_shape])
            }
            if (isRotatingLollipopProd && f.attributes?.default_motor_state) {
              cleanedSpecs.push(['3D Default Motor State', f.attributes.default_motor_state])
            }
          }
          return cleanedSpecs
        })(),
        stock: f.track && f.stock ? parseInt(f.stock) : undefined,
        variants: f.variants.map((v) => ({
          name: v.label,
          sku: v.sku,
          price: v.price,
          is_active: v.on,
        })),
      }

      if (isNew) {
        await adminApi.createProduct(payload)
      } else {
        await adminApi.updateProduct(id, payload)
      }
      setSaving(false)
      d.commit()
      setSaved(true)
      await refreshCatalogue()
      toast(isNew ? 'Product created in database and live on storefront' : 'Product saved in database and synced with storefront', 'ok')
      go('/admin/products')
    } catch (err: any) {
      setSaving(false)
      toast(err?.error || 'Failed to save product in database', 'err')
    }
  }
  const prof = profilesList.find((p) => p.id === f.profile || p.name === f.profile) || PROFILES.find((p) => p.id === f.profile)
  const setVariants = (labels: string[]) => d.set({ variants: labels.map((l, i) => f.variants.find((v) => v.label === l) ?? { label: l, sku: `${f.sku || 'SKU'}-${String(i + 1).padStart(2, '0')}`, price: '', on: true }) })
  const issue = (s: Sec) => s === 'Basic Information' && (errs.name || errs.sku) ? 1 : undefined

  let body
  switch (tab) {
    case 'Basic Information': body = (
      <Sec_ title="Basic information" desc="Name, identifiers and descriptions shown on the product page.">
        <Field label="Product name" required error={errs.name}><Input value={f.name} invalid={!!errs.name} onChange={(e) => { setErrs({ ...errs, name: undefined }); d.set({ name: e.target.value, ...(f.slug === slug(f.name).replace(/_/g, '-') ? { slug: slug(e.target.value).replace(/_/g, '-') } : {}) }) }} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" required error={errs.sku}><Input value={f.sku} invalid={!!errs.sku} className="font-mono text-[13px]" onChange={(e) => { setErrs({ ...errs, sku: undefined }); d.set({ sku: e.target.value }) }} /></Field>
          <Field label="URL slug" hint={`/product/${f.slug || '…'}`}><Input value={f.slug} className="font-mono text-[13px]" onChange={(e) => d.set({ slug: slug(e.target.value).replace(/_/g, '-') })} /></Field>
        </div>
        <Field label="Product type / kind" hint="Digital displays unlock screen/touch options; Customizable unlocks 3D studio.">
          <Segmented
            value={f.kind}
            onChange={(kind) => d.set({ kind: kind as any })}
            options={[
              { value: 'standard', label: 'Standard Retail' },
              { value: 'digital', label: 'Digital Signage' },
              { value: 'custom', label: 'Customizable / Studio' },
            ]}
          />
        </Field>
        <Field label="Short description" hint={`${f.blurb.length}/140 characters`}><Input value={f.blurb} maxLength={140} onChange={(e) => d.set({ blurb: e.target.value })} /></Field>
        <Field label="Full description"><Textarea value={f.desc} className="min-h-32" onChange={(e) => d.set({ desc: e.target.value })} /></Field>
        <Field label="Key features" hint="Press Enter after each feature."><Chips values={f.features} onChange={(features) => d.set({ features })} placeholder="e.g. Built-in speaker" /></Field>
      </Sec_>) ; break
    case 'Images & Videos': body = (
      <Sec_ title="Images & videos" desc="The first image is the primary image used in listings.">
        {f.images.length === 0 ? <p className="rounded-dd border border-dashed border-line p-6 text-center text-sm text-ink-2">No images yet. Products without an image are flagged on the dashboard.</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {f.images.map((u, i) => (
              <div key={u + i} className="overflow-hidden rounded-xl border border-line">
                <div className="relative aspect-[4/3] bg-[#f3f1ee]"><img src={u} alt="" className="size-full object-cover mix-blend-multiply" />{i === 0 && <span className="absolute left-2 top-2"><Badge tone="brand">Primary</Badge></span>}</div>
                <div className="flex items-center gap-0.5 p-1.5">
                  <button disabled={i === 0} onClick={() => d.set({ images: [u, ...f.images.filter((_, j) => j !== i)] })} title="Set as primary" aria-label="Set as primary" className="grid size-8 place-items-center rounded hover:bg-soft disabled:opacity-30"><Star className="size-4" /></button>
                  <button disabled={i === 0} onClick={() => d.set({ images: move(f.images, i, -1) })} aria-label="Move earlier" className="grid size-8 place-items-center rounded hover:bg-soft disabled:opacity-30"><ArrowUp className="size-4 -rotate-90" /></button>
                  <button disabled={i === f.images.length - 1} onClick={() => d.set({ images: move(f.images, i, 1) })} aria-label="Move later" className="grid size-8 place-items-center rounded hover:bg-soft disabled:opacity-30"><ArrowDown className="size-4 -rotate-90" /></button>
                  <button onClick={() => d.set({ images: f.images.filter((_, j) => j !== i) })} aria-label="Remove image" className="ml-auto grid size-8 place-items-center rounded text-ink-2 hover:bg-soft hover:text-bad"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Uploader state={{ status: 'idle' }} onFile={(file) => { d.set({ images: [...f.images, URL.createObjectURL(file)] }); toast('Image added') }} onRemove={() => {}} formats="JPG, PNG, WebP" maxSize="Max 8 MB each" />
        <Field label="Video URL" hint="Optional. YouTube or Vimeo link shown in the product gallery."><Input value={f.video} onChange={(e) => d.set({ video: e.target.value })} placeholder="https://" /></Field>
      </Sec_>) ; break
    case 'Categories': body = (
      <Sec_ title="Categories" desc="One primary category drives breadcrumbs and filters. Extra categories list the product in more places.">
        <Field label="Primary category"><Select value={f.cat} onChange={(e) => d.set({ cat: e.target.value, extraCats: f.extraCats.filter((c) => c !== e.target.value) })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <div><p className="mb-1 text-[13px] font-semibold">Also show in</p><div className="rounded-dd border border-line px-3 py-1">{cats.filter((c) => c.id !== f.cat).map((c) => <Check_ key={c.id} checked={f.extraCats.includes(c.id)} onChange={() => d.set({ extraCats: f.extraCats.includes(c.id) ? f.extraCats.filter((x) => x !== c.id) : [...f.extraCats, c.id] })} label={c.name} />)}</div></div>
      </Sec_>) ; break
    case 'Product Attributes': body = (
      <Sec_ title="Product Attributes" desc="Structured attribute values that drive storefront filters, badges, and search.">
        {isFabricProd && (
          <div className="mb-4 rounded-dd border-2 border-brand/40 bg-brand-soft/20 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <Sparkles className="size-4 text-brand" />
                  Fabric Frame Thickness (Admin Determined)
                </p>
                <p className="text-xs text-ink-2 mt-0.5">
                  Customers select from these options on the product page. The 3D model frame depth scales automatically.
                </p>
              </div>
              <Badge tone="brand">3D Depth</Badge>
            </div>
            <div className="mt-3">
              <Chips
                values={
                  Array.isArray(f.attributes.thickness)
                    ? f.attributes.thickness
                    : f.attributes.thickness
                    ? String(f.attributes.thickness).split(',').map((s) => s.trim())
                    : ['60 mm', '80 mm', '100 mm']
                }
                onChange={(vals) => d.set({ attributes: { ...f.attributes, thickness: vals } })}
                placeholder="Type thickness (e.g. 120 mm) and press Enter"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                <span className="font-semibold text-ink">Suggested presets:</span>
                {['60 mm', '80 mm', '100 mm'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const curr = Array.isArray(f.attributes.thickness)
                        ? f.attributes.thickness
                        : f.attributes.thickness
                        ? String(f.attributes.thickness).split(',').map((s) => s.trim())
                        : ['60 mm', '80 mm', '100 mm']
                      if (!curr.includes(val)) {
                        d.set({ attributes: { ...f.attributes, thickness: [...curr, val] } })
                      }
                    }}
                    className="rounded bg-white px-2 py-0.5 font-medium border border-line hover:border-brand cursor-pointer"
                  >
                    + {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {isFabricProd && (
          <div className="mb-6 rounded-dd border border-line bg-white p-5 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-ink">3D Showcase Wall Environments</h3>
                  <Badge tone="brand">Admin Editable</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  Upload custom wall backgrounds and set the default initial scene for the storefront 3D Lightbox viewer.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Storefront Live Sync
              </div>
            </div>

            {/* Default Starting Scene */}
            <div className="rounded-xl bg-soft/50 p-4 border border-line">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                Default Starting Scene (Storefront Initial View)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={cx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                  (f.attributes.default_scene || 'shop') === 'shop'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line bg-white hover:border-ink-2'
                )}>
                  <input
                    type="radio"
                    name="default_scene"
                    value="shop"
                    checked={(f.attributes.default_scene || 'shop') === 'shop'}
                    onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'shop' } })}
                    className="accent-brand"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Boutique Shop Board</p>
                    <p className="text-[11px] text-ink-2">Realistic exterior/interior retail storefront facade</p>
                  </div>
                </label>
                <label className={cx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                  f.attributes.default_scene === 'hall'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line bg-white hover:border-ink-2'
                )}>
                  <input
                    type="radio"
                    name="default_scene"
                    value="hall"
                    checked={f.attributes.default_scene === 'hall'}
                    onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'hall' } })}
                    className="accent-brand"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Commercial Hall Wall</p>
                    <p className="text-[11px] text-ink-2">Modern exhibition corridor & corporate gallery wall</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Environment Scene Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Scene 1: Shop Board */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 1: Boutique Shop Board Wall</p>
                    <p className="text-[11px] text-ink-2">Front-facing signage column mount</p>
                  </div>
                  {f.attributes.shop_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.shop_wall_image || shopBoardImg}
                    alt="Shop Board Wall"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShop(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shop_wall_image: url } })
                            toast('Shop board wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShop(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shop_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shop_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Boutique Shop Board preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingShop ? 'Uploading...' : 'Upload New Wall Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShop}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShop(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shop_wall_image: url } })
                            toast('Shop board wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShop(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shop_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shop_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Boutique Shop Board preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.shop_wall_image || ''}
                      placeholder="Preset default bundled asset (shop_board.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, shop_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Scene 2: Commercial Hall */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 2: Commercial Hall Wall</p>
                    <p className="text-[11px] text-ink-2">Angled architectural gallery wall</p>
                  </div>
                  {f.attributes.hall_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.hall_wall_image || hallWallImg}
                    alt="Commercial Hall Wall"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingHall(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, hall_wall_image: url } })
                            toast('Commercial hall wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingHall(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.hall_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.hall_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Commercial Hall preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingHall ? 'Uploading...' : 'Upload New Wall Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHall}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingHall(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, hall_wall_image: url } })
                            toast('Commercial hall wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingHall(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.hall_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.hall_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Commercial Hall preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.hall_wall_image || ''}
                      placeholder="Preset default bundled asset (hall_wall.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, hall_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-2 bg-neutral-100/70 p-3 rounded-lg border border-line">
              <span className="font-semibold text-ink">Tip:</span> High-resolution landscape images (1920x1080 or 2560x1440) look best. The 3D SEG Lightbox automatically aligns with realistic perspective and drop shadow on the mounted wall area.
            </p>
          </div>
        )}

        {isUltraSlimProd && (
          <div className="mb-6 rounded-dd border border-line bg-white p-5 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-ink">Ultra Slim Signage 3D & Size Settings</h3>
                  <Badge tone="brand">Admin Editable</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  Configure available sizes, pricing, default orientation, and 3D tabletop counter/wall backgrounds.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Storefront Live Sync
              </div>
            </div>

            {/* Standard Sizes & Pricing Overview */}
            <div className="rounded-xl bg-soft/40 p-4 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">Admin Determined Sizes & Pricing</p>
                  <p className="text-[11px] text-ink-2">Customers choose between these sizes on the product page. 3D frame scales automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    d.set({
                      price: '950',
                      variants: [
                        { label: 'A5 (5.8" × 8.2")', sku: 'DD-USL-A5', price: '950', on: true },
                        { label: 'A4 (8.2" × 11.6")', sku: 'DD-USL-A4', price: '1150', on: true },
                        { label: 'A3 (11.6" × 16.5")', sku: 'DD-USL-A3', price: '1750', on: true },
                        { label: 'A2 (16.5" × 23.3")', sku: 'DD-USL-A2', price: '2950', on: true },
                        { label: 'A1 (23.3" × 33.1")', sku: 'DD-USL-A1', price: '4700', on: true },
                        { label: 'BO (48" × 24")', sku: 'DD-USL-BO', price: '6400', on: true },
                      ],
                    })
                    toast('Ultra Slim standard sizes & pricing applied (A5 to BO)', 'ok')
                  }}
                  className="rounded-lg border border-brand bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft transition cursor-pointer"
                >
                  Reload Standard Sizes (A5 to BO)
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { size: 'A5', dim: '5.8" × 8.2"', price: '₹950' },
                  { size: 'A4', dim: '8.2" × 11.6"', price: '₹1,150' },
                  { size: 'A3', dim: '11.6" × 16.5"', price: '₹1,750' },
                  { size: 'A2', dim: '16.5" × 23.3"', price: '₹2,950' },
                  { size: 'A1', dim: '23.3" × 33.1"', price: '₹4,700' },
                  { size: 'BO', dim: '48" × 24"', price: '₹6,400' },
                ].map((item) => (
                  <div key={item.size} className="rounded-lg border border-line bg-white p-2 text-center">
                    <p className="text-sm font-bold text-ink">{item.size}</p>
                    <p className="text-[10px] text-ink-2 font-medium">{item.dim}</p>
                    <p className="mt-1 text-xs font-extrabold text-brand">{item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Starting Orientation & Scene */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Orientation */}
              <div className="rounded-xl bg-soft/30 p-3.5 border border-line">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  Default Starting Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    (f.attributes.default_orientation || 'Portrait') === 'Portrait'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="default_orientation"
                      value="Portrait"
                      checked={(f.attributes.default_orientation || 'Portrait') === 'Portrait'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_orientation: 'Portrait' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Portrait (Vertical)</span>
                  </label>
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    f.attributes.default_orientation === 'Landscape'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="default_orientation"
                      value="Landscape"
                      checked={f.attributes.default_orientation === 'Landscape'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_orientation: 'Landscape' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Landscape (Horizontal)</span>
                  </label>
                </div>
              </div>

              {/* Default Scene */}
              <div className="rounded-xl bg-soft/30 p-3.5 border border-line">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  Default Starting Scene
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    (f.attributes.default_scene || 'counter') === 'counter'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="usl_default_scene"
                      value="counter"
                      checked={(f.attributes.default_scene || 'counter') === 'counter'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'counter' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Counter Desk</span>
                  </label>
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    f.attributes.default_scene === 'gallery'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="usl_default_scene"
                      value="gallery"
                      checked={f.attributes.default_scene === 'gallery'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'gallery' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Gallery Wall</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Environment Scene Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Scene 1: Counter Desk */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 1: Reception Counter Desk</p>
                    <p className="text-[11px] text-ink-2">Tabletop support feet display setting</p>
                  </div>
                  {f.attributes.counter_desk_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.counter_desk_image || counterDeskImg}
                    alt="Counter Desk Scene"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingCounter(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, counter_desk_image: url } })
                            toast('Counter desk background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingCounter(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.counter_desk_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.counter_desk_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Counter Desk preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingCounter ? 'Uploading...' : 'Upload New Counter Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingCounter}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingCounter(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, counter_desk_image: url } })
                            toast('Counter desk background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingCounter(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.counter_desk_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.counter_desk_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Counter Desk preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.counter_desk_image || ''}
                      placeholder="Preset default bundled asset (counter_desk.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, counter_desk_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Scene 2: Gallery Wall */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 2: Gallery Wall</p>
                    <p className="text-[11px] text-ink-2">Architectural gallery / office wall mount</p>
                  </div>
                  {f.attributes.gallery_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.gallery_wall_image || galleryWallImg}
                    alt="Gallery Wall Scene"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingGallery(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, gallery_wall_image: url } })
                            toast('Gallery wall background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingGallery(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.gallery_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.gallery_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Gallery Wall preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingGallery ? 'Uploading...' : 'Upload New Gallery Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingGallery}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingGallery(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, gallery_wall_image: url } })
                            toast('Gallery wall background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingGallery(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.gallery_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.gallery_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Gallery Wall preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.gallery_wall_image || ''}
                      placeholder="Preset default bundled asset (gallery_wall.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, gallery_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isCardStandProd && (
          <div className="mb-6 rounded-dd border border-line bg-white p-5 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-ink">T-Shaped Card Stand 3D & Size Settings</h3>
                  <Badge tone="brand">Admin Editable</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  Configure sizes, pricing (DD-6276 to DD-6280), default orientation, and 3D glass shelf & desk backgrounds.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Storefront Live Sync
              </div>
            </div>

            {/* Standard Sizes & Pricing Overview */}
            <div className="rounded-xl bg-soft/40 p-4 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">Admin Determined Sizes & Pricing</p>
                  <p className="text-[11px] text-ink-2">Customers choose between these sizes on the product page. 3D card stand dimensions resize dynamically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    d.set({
                      price: '150',
                      variants: [
                        { label: 'DD-6276 (55 × 90 mm)', sku: 'DD-6276', price: '150', on: true },
                        { label: 'DD-6277 (A7)', sku: 'DD-6277', price: '180', on: true },
                        { label: 'DD-6278 (A6)', sku: 'DD-6278', price: '200', on: true },
                        { label: 'DD-6279 (A5)', sku: 'DD-6279', price: '250', on: true },
                        { label: 'DD-6280 (A4)', sku: 'DD-6280', price: '350', on: true },
                      ],
                    })
                    toast('T-Shaped Card Stand standard sizes & pricing applied (DD-6276 to DD-6280)', 'ok')
                  }}
                  className="rounded-lg border border-brand bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft transition cursor-pointer"
                >
                  Reload Standard Sizes (DD-6276 to DD-6280)
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {[
                  { sku: 'DD-6280', size: 'A4 (210 × 297 mm)', price: '₹350' },
                  { sku: 'DD-6279', size: 'A5 (148 × 210 mm)', price: '₹250' },
                  { sku: 'DD-6278', size: 'A6 (105 × 148 mm)', price: '₹200' },
                  { sku: 'DD-6277', size: 'A7 (74 × 105 mm)', price: '₹180' },
                  { sku: 'DD-6276', size: '55 × 90 mm (Card)', price: '₹150' },
                ].map((s) => (
                  <div key={s.sku} className="rounded-lg border border-line bg-white p-2.5 text-center shadow-2xs">
                    <span className="font-mono text-xs font-bold text-brand block">{s.sku}</span>
                    <span className="text-[11px] font-semibold text-ink block">{s.size}</span>
                    <span className="text-xs font-extrabold text-ink-2 mt-0.5 block">{s.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Starting Orientation */}
            <div className="rounded-xl bg-soft/50 p-4 border border-line">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                Default Starting Orientation (Storefront Initial View)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={cx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                  (f.attributes.default_orientation || 'Portrait') === 'Portrait'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line bg-white hover:border-ink-2'
                )}>
                  <input
                    type="radio"
                    name="card_default_orientation"
                    value="Portrait"
                    checked={(f.attributes.default_orientation || 'Portrait') === 'Portrait'}
                    onChange={() => d.set({ attributes: { ...f.attributes, default_orientation: 'Portrait' } })}
                    className="accent-brand"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Portrait (Vertical Stand)</p>
                    <p className="text-[11px] text-ink-2">Standard upright acrylic display stand</p>
                  </div>
                </label>
                <label className={cx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                  f.attributes.default_orientation === 'Landscape'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line bg-white hover:border-ink-2'
                )}>
                  <input
                    type="radio"
                    name="card_default_orientation"
                    value="Landscape"
                    checked={f.attributes.default_orientation === 'Landscape'}
                    onChange={() => d.set({ attributes: { ...f.attributes, default_orientation: 'Landscape' } })}
                    className="accent-brand"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Landscape (Horizontal Stand)</p>
                    <p className="text-[11px] text-ink-2">Wide tabletop desk nameplate / price indicator</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Default Starting Scene */}
            <div className="rounded-xl bg-soft/50 p-4 border border-line">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                Default Starting Scene (Storefront Initial 3D View)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={cx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                  (f.attributes.default_scene || 'shelf') === 'shelf'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line bg-white hover:border-ink-2'
                )}>
                  <input
                    type="radio"
                    name="card_default_scene"
                    value="shelf"
                    checked={(f.attributes.default_scene || 'shelf') === 'shelf'}
                    onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'shelf' } })}
                    className="accent-brand"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Glass Shelf (Marble Fixture)</p>
                    <p className="text-[11px] text-ink-2">Matches authentic showroom product display</p>
                  </div>
                </label>
                <label className={cx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition',
                  f.attributes.default_scene === 'counter'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line bg-white hover:border-ink-2'
                )}>
                  <input
                    type="radio"
                    name="card_default_scene"
                    value="counter"
                    checked={f.attributes.default_scene === 'counter'}
                    onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'counter' } })}
                    className="accent-brand"
                  />
                  <div>
                    <p className="text-xs font-bold text-ink">Reception Desk Counter</p>
                    <p className="text-[11px] text-ink-2">Front-desk registration & hotel billing counter</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Environment Scene Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Scene 1: Glass Shelf */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 1: Glass Shelf on Marble Fixture</p>
                    <p className="text-[11px] text-ink-2">Showcase shelving with realistic reflection</p>
                  </div>
                  {f.attributes.shelf_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.shelf_image || marbleShelfImg}
                    alt="Glass Shelf on Marble Wall"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShelf}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShelf(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shelf_image: url } })
                            toast('Marble glass shelf background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShelf(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shelf_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shelf_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Marble Glass Shelf preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingShelf ? 'Uploading...' : 'Upload New Shelf Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShelf}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShelf(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shelf_image: url } })
                            toast('Marble glass shelf background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShelf(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shelf_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shelf_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Marble Glass Shelf preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.shelf_image || ''}
                      placeholder="Preset default bundled asset (marble_glass_shelf.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, shelf_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Scene 2: Reception Counter Desk */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 2: Reception Counter Desk</p>
                    <p className="text-[11px] text-ink-2">Tabletop setting with natural ambient lighting</p>
                  </div>
                  {f.attributes.counter_desk_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.counter_desk_image || counterDeskImg}
                    alt="Reception Counter Desk"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingCounter}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingCounter(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, counter_desk_image: url } })
                            toast('Reception counter desk background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingCounter(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.counter_desk_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.counter_desk_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Reception Counter preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingCounter ? 'Uploading...' : 'Upload New Counter Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingCounter}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingCounter(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, counter_desk_image: url } })
                            toast('Reception counter desk background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingCounter(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.counter_desk_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.counter_desk_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Reception Counter preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.counter_desk_image || ''}
                      placeholder="Preset default bundled asset (counter_desk.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, counter_desk_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLollipopProd && (
          <div className="mb-6 rounded-dd border border-line bg-white p-5 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-ink">LED Lollipop Board 3D & Size Settings</h3>
                  <Badge tone="brand">Admin Editable</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  Configure shapes (Round / Square), standard sizes (18" & 24"), pricing, default view, and dual-sided 3D storefront backgrounds.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Storefront Live Sync
              </div>
            </div>

            {/* Sizes & Pricing Overview */}
            <div className="rounded-xl bg-soft/40 p-4 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">Admin Determined Shapes, Sizes & Pricing</p>
                  <p className="text-[11px] text-ink-2">Customers choose between Round drum or Square squircle, 18" or 24". 3D model geometry & scale update immediately.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    d.set({
                      price: '3000',
                      variants: [
                        { label: 'Round 18 × 18 in', sku: 'DD-LPB-18-RND', price: '3000', on: true },
                        { label: 'Round 24 × 24 in', sku: 'DD-LPB-24-RND', price: '4500', on: true },
                        { label: 'Square 18 × 18 in', sku: 'DD-LPB-18-SQR', price: '3000', on: true },
                        { label: 'Square 24 × 24 in', sku: 'DD-LPB-24-SQR', price: '4500', on: true },
                      ],
                    })
                    toast('Lollipop Board standard shapes, sizes & pricing applied (18" & 24")', 'ok')
                  }}
                  className="rounded-lg border border-brand bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft transition cursor-pointer"
                >
                  Reload Lollipop Presets (18" & 24")
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { shape: 'Round', size: '18 × 18 in', sku: 'DD-LPB-18-RND', price: '₹3,000' },
                  { shape: 'Round', size: '24 × 24 in', sku: 'DD-LPB-24-RND', price: '₹4,500' },
                  { shape: 'Square', size: '18 × 18 in', sku: 'DD-LPB-18-SQR', price: '₹3,000' },
                  { shape: 'Square', size: '24 × 24 in', sku: 'DD-LPB-24-SQR', price: '₹4,500' },
                ].map((item) => (
                  <div key={item.sku} className="rounded-lg border border-line bg-white p-2.5 text-center shadow-2xs">
                    <span className="font-mono text-xs font-bold text-brand block">{item.sku}</span>
                    <span className="text-[11px] font-semibold text-ink block">{item.shape} · {item.size}</span>
                    <span className="text-xs font-extrabold text-ink-2 mt-0.5 block">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Starting Shape & Scene */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Starting Shape */}
              <div className="rounded-xl bg-soft/30 p-3.5 border border-line">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  Default Starting Shape
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    (f.attributes.default_shape || 'Round') === 'Round'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="lpb_default_shape"
                      value="Round"
                      checked={(f.attributes.default_shape || 'Round') === 'Round'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_shape: 'Round' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Round (Circular)</span>
                  </label>
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    f.attributes.default_shape === 'Square'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="lpb_default_shape"
                      value="Square"
                      checked={f.attributes.default_shape === 'Square'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_shape: 'Square' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Square (Rounded)</span>
                  </label>
                </div>
              </div>

              {/* Default Starting Scene */}
              <div className="rounded-xl bg-soft/30 p-3.5 border border-line">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  Default Starting Wall Scene
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    (f.attributes.default_scene || 'shop') === 'shop'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="lpb_default_scene"
                      value="shop"
                      checked={(f.attributes.default_scene || 'shop') === 'shop'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'shop' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Boutique Facade (Daylight)</span>
                  </label>
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    f.attributes.default_scene === 'hall'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="lpb_default_scene"
                      value="hall"
                      checked={f.attributes.default_scene === 'hall'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'hall' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Twilight Cafe (Atmospheric)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Environment Wall Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Scene 1: Shop Wall */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 1: Boutique Storefront Facade (Daylight)</p>
                    <p className="text-[11px] text-ink-2">Cantilever projection mount on outdoor facade</p>
                  </div>
                  {f.attributes.shop_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.shop_wall_image || lollipopStorefrontImg}
                    alt="Storefront Wall Scene"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShop}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShop(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shop_wall_image: url } })
                            toast('Storefront facade background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShop(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shop_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shop_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Storefront Wall preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingShop ? 'Uploading...' : 'Upload New Storefront Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShop}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShop(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shop_wall_image: url } })
                            toast('Storefront facade background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShop(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shop_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shop_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Storefront Wall preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.shop_wall_image || ''}
                      placeholder="Preset default bundled asset (lollipop_storefront.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, shop_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Scene 2: Commercial Hall Wall */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 2: Twilight Cafe Exterior (Atmospheric Glow)</p>
                    <p className="text-[11px] text-ink-2">Perpendicular projection signage mount</p>
                  </div>
                  {f.attributes.hall_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.hall_wall_image || lollipopDuskImg}
                    alt="Twilight Cafe Exterior Scene"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHall}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingHall(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, hall_wall_image: url } })
                            toast('Twilight cafe wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingHall(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.hall_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.hall_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Twilight Cafe preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingHall ? 'Uploading...' : 'Upload New Twilight Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHall}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingHall(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, hall_wall_image: url } })
                            toast('Twilight cafe wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingHall(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.hall_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.hall_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Twilight Cafe preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.hall_wall_image || ''}
                      placeholder="Preset default bundled asset (lollipop_dusk.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, hall_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isRotatingLollipopProd && (
          <div className="mb-6 rounded-dd border border-line bg-white p-5 shadow-card space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Sparkles className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-ink">LED Rotating Lollipop Board 3D & Motor Settings</h3>
                  <Badge tone="brand">Admin Editable</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  Motorized 360-degree rotating round lollipop display flag. Configure base price (₹5,500), rotation motor parameters, default initial scene, and storefront environments.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Storefront Live Sync
              </div>
            </div>

            {/* Standard Specifications & Pricing */}
            <div className="rounded-xl bg-soft/40 p-4 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">Motorized Rotating Configuration</p>
                  <p className="text-[11px] text-ink-2">Double-sided illuminated round lightbox suspended on top and bottom pivot bearings.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    d.set({
                      price: '5500',
                      variants: [
                        { label: '18 × 18 in (Round)', sku: 'DD-RLPB-18', price: '5500', on: true },
                      ],
                    })
                    toast('Rotating Lollipop standard 18" configuration preset applied (₹5,500)', 'ok')
                  }}
                  className="rounded-lg border border-brand bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft transition cursor-pointer"
                >
                  Reload 18" Rotating Preset (₹5,500)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-line bg-white p-3 text-center shadow-2xs">
                  <span className="font-mono text-xs font-bold text-brand block">DD-RLPB-18</span>
                  <span className="text-xs font-bold text-ink block mt-0.5">18 × 18 in · Round Rotating Flag</span>
                  <span className="text-xs font-extrabold text-ink-2 mt-0.5 block">₹5,500</span>
                </div>
                <div className="rounded-lg border border-line bg-white p-3 text-center shadow-2xs">
                  <span className="text-[11px] font-bold text-ink-2 block">Motor Specification</span>
                  <span className="text-xs font-bold text-ink block mt-0.5">Low-RPM Synchronous Motor</span>
                  <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 block">Silent 360° Continuous</span>
                </div>
                <div className="rounded-lg border border-line bg-white p-3 text-center shadow-2xs">
                  <span className="text-[11px] font-bold text-ink-2 block">Bracket Architecture</span>
                  <span className="text-xs font-bold text-ink block mt-0.5">Heavy-Duty C-Bracket Yoke</span>
                  <span className="text-[11px] font-semibold text-ink-2 mt-0.5 block">Top & Bottom Pivot Spindles</span>
                </div>
              </div>
            </div>

            {/* Default Starting Scene & Motor State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Initial Scene */}
              <div className="rounded-xl bg-soft/30 p-3.5 border border-line">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  Default Starting Wall Scene
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    (f.attributes.default_scene || 'shop') === 'shop'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="rlpb_default_scene"
                      value="shop"
                      checked={(f.attributes.default_scene || 'shop') === 'shop'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'shop' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Boutique Facade (Daylight)</span>
                  </label>
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    f.attributes.default_scene === 'hall'
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="rlpb_default_scene"
                      value="hall"
                      checked={f.attributes.default_scene === 'hall'}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_scene: 'hall' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Twilight Cafe (Atmospheric)</span>
                  </label>
                </div>
              </div>

              {/* Default Motor State */}
              <div className="rounded-xl bg-soft/30 p-3.5 border border-line">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  Default Motor Rotation State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    (f.attributes.default_motor_state !== 'paused' && f.attributes.default_motor_state !== false)
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="rlpb_default_motor"
                      value="active"
                      checked={f.attributes.default_motor_state !== 'paused' && f.attributes.default_motor_state !== false}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_motor_state: 'active' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">360° Rotating Active</span>
                  </label>
                  <label className={cx(
                    'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition',
                    f.attributes.default_motor_state === 'paused' || f.attributes.default_motor_state === false
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-line bg-white hover:border-ink-2'
                  )}>
                    <input
                      type="radio"
                      name="rlpb_default_motor"
                      value="paused"
                      checked={f.attributes.default_motor_state === 'paused' || f.attributes.default_motor_state === false}
                      onChange={() => d.set({ attributes: { ...f.attributes, default_motor_state: 'paused' } })}
                      className="accent-brand"
                    />
                    <span className="text-xs font-bold text-ink">Paused by Default</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Environment Wall Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Scene 1: Shop Wall */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 1: Boutique Storefront Facade (Daylight)</p>
                    <p className="text-[11px] text-ink-2">C-bracket projection mount on exterior facade</p>
                  </div>
                  {f.attributes.shop_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.shop_wall_image || lollipopStorefrontImg}
                    alt="Storefront Wall Scene"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShop}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShop(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shop_wall_image: url } })
                            toast('Storefront facade background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShop(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shop_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shop_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Storefront Wall preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingShop ? 'Uploading...' : 'Upload New Storefront Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingShop}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingShop(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, shop_wall_image: url } })
                            toast('Storefront facade background image updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingShop(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.shop_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.shop_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Storefront Wall preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.shop_wall_image || ''}
                      placeholder="Preset default bundled asset (lollipop_storefront.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, shop_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Scene 2: Commercial Hall Wall */}
              <div className="rounded-xl border border-line overflow-hidden bg-white shadow-xs">
                <div className="p-3.5 border-b border-line bg-soft/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Scene 2: Twilight Cafe Exterior (Atmospheric Glow)</p>
                    <p className="text-[11px] text-ink-2">High street night view with illuminated rotating sign</p>
                  </div>
                  {f.attributes.hall_wall_image ? (
                    <Badge tone="brand">Custom Image</Badge>
                  ) : (
                    <Badge tone="neutral">Preset Default</Badge>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden group">
                  <img
                    src={f.attributes.hall_wall_image || lollipopDuskImg}
                    alt="Twilight Cafe Exterior Scene"
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white text-ink text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-neutral-100 transition flex items-center gap-1.5">
                      <UploadCloud className="size-3.5 text-brand" />
                      Change Wall
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHall}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingHall(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, hall_wall_image: url } })
                            toast('Twilight cafe wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingHall(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.hall_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.hall_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Twilight Cafe preset', 'ok')
                        }}
                        className="bg-white/90 text-bad text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-md hover:bg-white transition flex items-center gap-1"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3.5 space-y-2.5 bg-neutral-50/50">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition">
                      <UploadCloud className="size-3.5" />
                      {uploadingHall ? 'Uploading...' : 'Upload New Twilight Image'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHall}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingHall(true)
                          try {
                            const url = await uploadsApi.uploadArtwork(file)
                            d.set({ attributes: { ...f.attributes, hall_wall_image: url } })
                            toast('Twilight cafe wall background updated!', 'ok')
                          } catch {
                            toast('Failed to upload image', 'err')
                          } finally {
                            setUploadingHall(false)
                          }
                        }}
                      />
                    </label>
                    {f.attributes.hall_wall_image && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttrs = { ...f.attributes }
                          delete nextAttrs.hall_wall_image
                          d.set({ attributes: nextAttrs })
                          toast('Reset to default Twilight Cafe preset', 'ok')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink hover:bg-neutral-50 transition cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">Image URL / Path</label>
                    <input
                      type="text"
                      value={f.attributes.hall_wall_image || ''}
                      placeholder="Preset default bundled asset (lollipop_dusk.jpg)"
                      onChange={(e) => d.set({ attributes: { ...f.attributes, hall_wall_image: e.target.value } })}
                      className="w-full text-xs font-mono rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink placeholder:text-ink-2/60 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {attributesList.length === 0 && !isFabricProd && !isUltraSlimProd && !isCardStandProd && !isLollipopProd && !isRotatingLollipopProd ? (
          <p className="rounded-dd border border-dashed border-line p-6 text-center text-sm text-ink-2">
            No attributes configured yet. Configure attributes under <Link to="/admin/attributes" className="font-semibold text-brand">Attributes</Link>.
          </p>
        ) : (
          <div className="space-y-4">
            {attributesList.map((attr) => {
              const curVal = f.attributes[attr.key]
              const opts = attr.values || (attr.options ? attr.options.map((o: any) => typeof o === 'string' ? o : o.label || o.value) : [])
              const setAttrVal = (v: any) => d.set({ attributes: { ...f.attributes, [attr.key]: v } })

              return (
                <div key={attr.key} className="rounded-dd border border-line p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{attr.label}</p>
                      <p className="font-mono text-xs text-ink-2">{attr.key}</p>
                    </div>
                    {attr.filterable && <Badge tone="brand">Filterable</Badge>}
                  </div>
                  <div className="mt-2.5">
                    {attr.type === 'single' ? (
                      <Select value={String(curVal || '')} onChange={(e) => setAttrVal(e.target.value)}>
                        <option value="">Not set / None</option>
                        {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    ) : attr.type === 'multi' ? (
                      <Chips
                        values={Array.isArray(curVal) ? curVal : curVal ? [String(curVal)] : []}
                        onChange={(vals) => setAttrVal(vals)}
                        placeholder="Add value and press Enter"
                      />
                    ) : attr.type === 'bool' ? (
                      <Switch
                        on={curVal === true || curVal === 'true' || curVal === 'Yes'}
                        onChange={(v) => setAttrVal(v ? 'Yes' : 'No')}
                        label={attr.label}
                      />
                    ) : attr.type === 'number' || attr.type === 'range' ? (
                      <Input
                        type="number"
                        value={String(curVal ?? '')}
                        placeholder={attr.min ? `Min ${attr.min}` : 'Enter number'}
                        onChange={(e) => setAttrVal(e.target.value)}
                      />
                    ) : (
                      <Input
                        value={String(curVal ?? '')}
                        placeholder="Enter value"
                        onChange={(e) => setAttrVal(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Sec_>) ; break
    case 'Specifications': body = (
      <Sec_ title="Specifications" desc="Shown as a table on the product page. Order here is the display order.">
        {f.specs.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input aria-label="Specification name" placeholder="Name" value={k} onChange={(e) => d.set({ specs: f.specs.map((s, j) => (j === i ? [e.target.value, s[1]] : s)) })} className="h-10 w-2/5" />
            <Input aria-label="Specification value" placeholder="Value" value={v} onChange={(e) => d.set({ specs: f.specs.map((s, j) => (j === i ? [s[0], e.target.value] : s)) })} className="h-10 flex-1" />
            <button aria-label="Move up" disabled={i === 0} onClick={() => d.set({ specs: move(f.specs, i, -1) })} className="grid size-8 place-items-center rounded hover:bg-soft disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button aria-label="Remove row" onClick={() => d.set({ specs: f.specs.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded text-ink-2 hover:bg-soft hover:text-bad"><X className="size-4" /></button>
          </div>
        ))}
        <Btn variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => d.set({ specs: [...f.specs, ['', '']] })}>Add specification</Btn>
      </Sec_>) ; break
    case 'Variants & Options': {
      const baseInr = f.price ? parseFloat(f.price) : 0

      const loadUltraSlimPresets = () => {
        d.set({
          variants: [
            { label: 'A5 (5.8" × 8.2")', sku: 'DD-USL-A5', price: '950', on: true },
            { label: 'A4 (8.2" × 11.6")', sku: 'DD-USL-A4', price: '1150', on: true },
            { label: 'A3 (11.6" × 16.5")', sku: 'DD-USL-A3', price: '1750', on: true },
            { label: 'A2 (16.5" × 23.3")', sku: 'DD-USL-A2', price: '2950', on: true },
            { label: 'A1 (23.3" × 33.1")', sku: 'DD-USL-A1', price: '4700', on: true },
            { label: 'BO (48" × 24")', sku: 'DD-USL-BO', price: '6400', on: true },
          ],
        })
        toast('Loaded Ultra Slim Signage sizes & pricing (A5 to BO)', 'ok')
      }

      const loadCardStandPresets = () => {
        d.set({
          price: '150',
          variants: [
            { label: 'DD-6276 (55 × 90 mm)', sku: 'DD-6276', price: '150', on: true },
            { label: 'DD-6277 (A7)', sku: 'DD-6277', price: '180', on: true },
            { label: 'DD-6278 (A6)', sku: 'DD-6278', price: '200', on: true },
            { label: 'DD-6279 (A5)', sku: 'DD-6279', price: '250', on: true },
            { label: 'DD-6280 (A4)', sku: 'DD-6280', price: '350', on: true },
          ],
        })
        toast('Loaded T-Shaped Card Stand sizes & pricing (DD-6276 to DD-6280)', 'ok')
      }

      const loadFabricPresets = () => {
        d.set({
          variants: [
            { label: '60 mm Frame Depth (Slim Profile)', sku: 'DD-FAB-60MM', price: f.price || '2400', on: true },
            { label: '80 mm Frame Depth (Standard Commercial)', sku: 'DD-FAB-80MM', price: f.price ? String(parseFloat(f.price) + 200) : '2600', on: true },
            { label: '100 mm Frame Depth (Heavy-Duty SEG)', sku: 'DD-FAB-100MM', price: f.price ? String(parseFloat(f.price) + 400) : '2800', on: true },
          ],
        })
        toast('Loaded LED Fabric Signage thickness presets (60mm, 80mm, 100mm)', 'ok')
      }

      const loadLollipopPresets = () => {
        d.set({
          price: '3000',
          variants: [
            { label: 'Round 18 × 18 in', sku: 'DD-LPB-18-RND', price: '3000', on: true },
            { label: 'Round 24 × 24 in', sku: 'DD-LPB-24-RND', price: '4500', on: true },
            { label: 'Square 18 × 18 in', sku: 'DD-LPB-18-SQR', price: '3000', on: true },
            { label: 'Square 24 × 24 in', sku: 'DD-LPB-24-SQR', price: '4500', on: true },
          ],
        })
        toast('Loaded LED Lollipop Board presets (18" & 24" Round/Square)', 'ok')
      }

      const addVariant = () => {
        const nextNum = f.variants.length + 1
        d.set({
          variants: [
            ...f.variants,
            {
              label: `Option ${nextNum}`,
              sku: `${f.sku || 'SKU'}-${String(nextNum).padStart(2, '0')}`,
              price: f.price || '',
              on: true,
            },
          ],
        })
      }

      body = (
        <Sec_
          title="Variants & Options"
          desc="Edit size options, individual product SKUs, and selling prices (₹). Edits are saved directly to the database and update storefront pricing in real time."
        >
          {/* Quick presets bar for high-demand products */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-soft/40 p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-2">Quick Catalogue Presets</p>
              <p className="text-xs text-ink-2">One-click standard sizes and official pricing for this catalogue item.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(isUltraSlimProd || (!isCardStandProd && !isFabricProd && !isLollipopProd && f.variants.length === 0)) && (
                <Btn size="sm" variant="secondary" icon={<Sparkles className="size-3.5 text-brand" />} onClick={loadUltraSlimPresets}>
                  Load Ultra Slim Presets (A5–BO)
                </Btn>
              )}
              {(isCardStandProd || (!isUltraSlimProd && !isFabricProd && !isLollipopProd && f.variants.length === 0)) && (
                <Btn size="sm" variant="secondary" icon={<Sparkles className="size-3.5 text-brand" />} onClick={loadCardStandPresets}>
                  Load Card Stand Presets (DD-6276–6280)
                </Btn>
              )}
              {isFabricProd && (
                <Btn size="sm" variant="secondary" icon={<Sparkles className="size-3.5 text-brand" />} onClick={loadFabricPresets}>
                  Load Fabric Thickness Presets (60mm, 80mm, 100mm)
                </Btn>
              )}
              {isLollipopProd && (
                <Btn size="sm" variant="secondary" icon={<Sparkles className="size-3.5 text-brand" />} onClick={loadLollipopPresets}>
                  Load Lollipop Presets (18" & 24")
                </Btn>
              )}
            </div>
          </div>

          {/* Variants Table */}
          {f.variants.length > 0 ? (
            <div className="overflow-x-auto rounded-dd border border-line bg-white shadow-sm">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-soft/75 text-left text-[11px] font-bold uppercase tracking-wider text-ink-2">
                    <th className="w-12 px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5">Size / Option Name</th>
                    <th className="w-36 px-3 py-2.5">SKU</th>
                    <th className="w-44 px-3 py-2.5">Selling Price (₹)</th>
                    <th className="w-20 px-3 py-2.5 text-center">Active</th>
                    <th className="w-28 px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {f.variants.map((v, i) => {
                    const up = (p: Partial<typeof v>) =>
                      d.set({
                        variants: f.variants.map((x, j) => (j === i ? { ...x, ...p } : x)),
                      })
                    const vPrice = v.price ? parseFloat(v.price) : 0
                    const diff = baseInr > 0 && vPrice > 0 ? Math.round(vPrice - baseInr) : null

                    return (
                      <tr key={i} className={cx('transition-colors', !v.on && 'bg-soft/30 opacity-60')}>
                        <td className="px-3 py-2.5 text-center text-xs font-bold text-ink-2">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <Input
                            aria-label="Variant Name"
                            value={v.label}
                            placeholder="e.g. A4 (8.2 x 11.6 in)"
                            onChange={(e) => up({ label: e.target.value })}
                            className="h-9 font-medium"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Input
                            aria-label="Variant SKU"
                            value={v.sku}
                            placeholder="SKU"
                            onChange={(e) => up({ sku: e.target.value.toUpperCase() })}
                            className="h-9 font-mono text-xs"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div>
                            <Input
                              aria-label="Selling Price"
                              type="number"
                              min={0}
                              value={v.price}
                              placeholder={f.price || 'Same as base'}
                              onChange={(e) => up({ price: e.target.value })}
                              className="h-9 font-semibold tabular-nums"
                            />
                            {diff !== null && diff !== 0 && (
                              <p className="mt-0.5 text-[10px] text-ink-2">
                                {diff > 0 ? `+₹${diff} from base` : `-₹${Math.abs(diff)} from base`}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Switch on={v.on} onChange={(on) => up({ on })} label={`${v.label} active`} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Move up"
                              disabled={i === 0}
                              onClick={() => d.set({ variants: move(f.variants, i, -1) })}
                              className="grid size-8 place-items-center rounded hover:bg-soft disabled:opacity-25"
                            >
                              <ArrowUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              disabled={i === f.variants.length - 1}
                              onClick={() => d.set({ variants: move(f.variants, i, 1) })}
                              className="grid size-8 place-items-center rounded hover:bg-soft disabled:opacity-25"
                            >
                              <ArrowDown className="size-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete variant"
                              onClick={() => d.set({ variants: f.variants.filter((_, j) => j !== i) })}
                              className="grid size-8 place-items-center rounded text-ink-2 hover:bg-soft hover:text-bad"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-dd border border-dashed border-line p-6 text-center">
              <p className="text-sm font-semibold text-ink">No size variants configured</p>
              <p className="mt-1 text-xs text-ink-2">Click below to add custom size options or load presets.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Btn variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={addVariant}>
              Add size variant
            </Btn>
            <p className="text-xs text-ink-2">
              Base product price: <strong className="text-ink">₹{baseInr.toLocaleString('en-IN') || '0'}</strong>
            </p>
          </div>

          <Notice tone="info">
            Selling prices entered in this table are authoritative. When saved, the system stores the variant pricing in the database (<code className="text-xs">product_variants</code>), computes delta offsets against base price, and immediately updates product page and studio pricing.
          </Notice>
        </Sec_>
      )
      break
    }
    case 'Pricing & Inventory': body = (
      <Sec_ title="Pricing & inventory" desc="Sample prices in the prototype. Final pricing is calculated by the pricing API.">
        <div className="flex items-center justify-between rounded-dd border border-line p-3"><div><p className="text-sm font-semibold">Quote only</p><p className="text-xs text-ink-2">Hide the price and show a Request a quote action.</p></div><Switch on={f.quoteOnly} onChange={(quoteOnly) => d.set({ quoteOnly })} label="Quote only" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starting price (₹, excl. GST)"><Input type="number" min={0} disabled={f.quoteOnly} value={f.price} onChange={(e) => d.set({ price: e.target.value })} placeholder="Not set" /></Field>
          <Field label="GST class"><Select value={f.gst} onChange={(e) => d.set({ gst: e.target.value })}><option value="18">Standard, 18%</option><option value="12">Reduced, 12%</option><option value="5">Reduced, 5%</option><option value="0">Nil rated</option></Select></Field>
        </div>
        <div className="flex items-center justify-between rounded-dd border border-line p-3"><div><p className="text-sm font-semibold">Track inventory</p><p className="text-xs text-ink-2">Turn off for made-to-order items.</p></div><Switch on={f.track} onChange={(track) => d.set({ track })} label="Track inventory" /></div>
        {f.track && <div className="grid gap-4 sm:grid-cols-2"><Field label="Units in stock"><Input type="number" min={0} value={f.stock} onChange={(e) => d.set({ stock: e.target.value })} /></Field><Field label="Low-stock alert at"><Input type="number" min={0} value={f.low} onChange={(e) => d.set({ low: e.target.value })} /></Field></div>}
      </Sec_>) ; break
    case 'Customization Profile': {
      const activeProf = profilesList.find((p) => p.id === f.profile || p.name === f.profile) || PROFILES.find((p) => p.id === f.profile)
      body = (
        <Sec_ title="Customization profile" desc="Decides which fields customers fill in before ordering this product.">
          <Field label="Profile">
            <Select value={f.profile} onChange={(e) => d.set({ profile: e.target.value })}>
              <option value="">None (sold as listed)</option>
              {profilesList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          {activeProf ? (
            <div className="rounded-dd border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
                <div>
                  <p className="text-sm font-semibold">{activeProf.name}</p>
                  <p className="text-xs text-ink-2">{activeProf.desc || (activeProf.product_name ? `Linked to ${activeProf.product_name}` : 'Customization profile')}</p>
                </div>
                <Btn size="sm" variant="secondary" to={'/admin/customization/' + activeProf.id}>Edit in builder</Btn>
              </div>
              <ul className="divide-y divide-line">
                {(activeProf.fields || profileFieldSummary(activeProf.id) || []).map((x: any) => (
                  <li key={x.label || x.name} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{x.label || x.name}{(x.is_required || x.required) && <span className="text-brand"> *</span>}</span>
                    <span className="text-xs text-ink-2">{x.field_type || x.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <Notice tone="info">No customization fields. Customers can add this product to the cart without extra input.</Notice>}
        </Sec_>) ; break
    }
    case 'Related Products': {
      const pool = PRODUCTS.filter((p) => p.id !== id && (p.name.toLowerCase().includes(rq.toLowerCase())))
      body = (
        <Sec_ title="Related products" desc="Shown under the product as suggestions.">
          <Input placeholder="Search products" value={rq} onChange={(e) => setRq(e.target.value)} aria-label="Search related products" />
          <div className="max-h-80 overflow-y-auto rounded-dd border border-line px-3 py-1">{pool.map((p) => <Check_ key={p.id} checked={f.related.includes(p.id)} onChange={() => d.set({ related: f.related.includes(p.id) ? f.related.filter((x) => x !== p.id) : [...f.related, p.id] })} label={<span className="flex items-center gap-2"><img src={p.img} alt="" className="size-7 rounded object-cover" />{p.name}</span>} />)}</div>
          <p className="text-xs text-ink-2">{f.related.length} selected</p>
        </Sec_>)
      break }
    case 'SEO': body = (
      <Sec_ title="Search engine listing" desc="Leave blank to use the product name and short description.">
        <Field label="Page title" hint={`${f.seoTitle.length}/60 characters`}><Input value={f.seoTitle} onChange={(e) => d.set({ seoTitle: e.target.value })} /></Field>
        <Field label="Meta description" hint={`${f.seoDesc.length}/160 characters`}><Textarea value={f.seoDesc} className="min-h-20" onChange={(e) => d.set({ seoDesc: e.target.value })} /></Field>
        <div className="rounded-dd border border-line bg-white p-4"><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-2">Search preview</p>
          <p className="truncate text-xs text-ink-2">displaydelight.example › product › {f.slug || '…'}</p>
          <p className="truncate text-lg text-[#1a0dab]">{f.seoTitle || f.name || 'Product title'}</p>
          <p className="line-clamp-2 text-sm text-ink-2">{f.seoDesc || f.blurb || 'Your description appears here.'}</p></div>
      </Sec_>) ; break
    case 'Publication': body = (
      <Sec_ title="Publication" desc="Control whether and when this product appears on the storefront.">
        <div className="flex items-center justify-between rounded-dd border border-line p-3"><div><p className="text-sm font-semibold">Visible on storefront</p><p className="text-xs text-ink-2">Turn off to hide without changing status.</p></div><Switch on={f.visible} onChange={(visible) => d.set({ visible })} label="Visible" /></div>
        <div><p className="mb-1.5 text-[13px] font-semibold">Status</p><Segmented value={f.status} onChange={(status) => d.set({ status })} options={[{ value: 'Draft', label: 'Draft' }, { value: 'Published', label: 'Published' }]} /></div>
        <Field label="Schedule publishing" hint="Optional. Leave empty to publish on save."><Input type="datetime-local" value={f.schedule} onChange={(e) => d.set({ schedule: e.target.value })} /></Field>
        <div className="flex items-center justify-between rounded-dd border border-line p-3"><p className="text-sm font-semibold">Feature on homepage</p><Switch on={f.featured} onChange={(featured) => d.set({ featured })} label="Featured" /></div>
      </Sec_>) ; break
  }
  return (
    <AdminPage title={f.name || 'New product'} crumbs={[{ label: 'Products', to: '/admin/products' }, { label: isNew ? 'New' : (prod?.name || f.name || 'Edit') }]}
      desc={isNew ? 'Fill in the basics, then complete each section. Name and SKU are required.' : `SKU ${f.sku}`}
      actions={<>{!isNew && <Btn variant="secondary" to={'/product/' + (f.slug || id)}>View on storefront</Btn>}<Btn onClick={save} loading={saving} disabled={!d.dirty && !isNew}>Save product</Btn></>}>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="lg:hidden"><Tabs value={tab} onChange={setTab} tabs={SECTIONS.map((s) => ({ value: s, label: s, badge: issue(s) }))} /></div>
        <nav aria-label="Product sections" className="sticky top-20 hidden h-fit rounded-xl border border-line bg-white p-2 lg:block">
          {SECTIONS.map((s, i) => (
            <button key={s} onClick={() => setTab(s)} aria-current={tab === s} className={cx('flex w-full items-center gap-2.5 rounded-dd px-3 py-2 text-left text-[13.5px] font-medium', tab === s ? 'bg-brand-soft font-semibold text-brand-hover' : 'text-ink-2 hover:bg-soft hover:text-ink')}>
              <span className="grid size-5 place-items-center rounded-full bg-white text-[11px] font-bold ring-1 ring-line">{i + 1}</span>{s}{issue(s) && <span className="ml-auto size-2 rounded-full bg-bad" />}
            </button>
          ))}
        </nav>
        <div className="min-w-0">{body}</div>
      </div>
      <SaveBar dirty={d.dirty} saved={saved} saving={saving} onSave={save} onCancel={() => { d.reset(); setErrs({}); toast('Changes discarded', 'info') }} />
    </AdminPage>
  )
}
