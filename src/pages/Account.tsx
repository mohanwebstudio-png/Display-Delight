import { useEffect, useState, type ReactNode } from 'react'
import { Clock, FileText, Heart, LogOut, MapPin, Package, Plus, Scale, Trash2, Truck, User, X, Pencil, Eye, ShoppingCart } from 'lucide-react'
import { Badge, Breadcrumbs, Btn, Container, Drawer, EmptyState, ErrorState, Field, Input, Modal, Notice, Price, ProductCard, Segmented, Select, Skeleton, Switch, Textarea, cx } from '../ui'
import { Link, go, useApp, resolveAssetUrl } from '../store'
import { PRODUCTS, byId, catName, inr, toArr, type Product } from '../data'
import { Timeline } from './Track'
import { InvoiceModal } from '../components/InvoiceModal'

type Section = 'profile' | 'addresses' | 'orders' | 'order' | 'wishlist' | 'compare' | 'recent' | 'quotes'
const Sample = () => <span className="rounded bg-soft px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">Sample data</span>
const Card = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{title}</h2>{action}</div>
    {children}
  </section>
)

const ORDER_TONE = { Processing: 'warn', 'In production': 'brand', Shipped: 'info', Delivered: 'ok', Cancelled: 'bad' } as const
type OStatus = keyof typeof ORDER_TONE
const QTONE = { New: 'info', 'In review': 'warn', Quoted: 'ok' } as const

interface Addr {
  id: number
  label: string
  name: string
  line: string
  city: string
  state: string
  pin: string
  phone: string
  def: boolean
}

/* ---------- sections ---------- */
function Profile() {
  const { user, toast } = useApp()
  const [f, setF] = useState({
    name: user?.full_name || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    biz: user?.business_name || '',
    gstin: user?.gstin || ''
  })

  useEffect(() => {
    if (user) {
      setF({
        name: user.full_name || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        biz: user.business_name || '',
        gstin: user.gstin || ''
      })
    }
  }, [user])
  const [pw, setPw] = useState({ cur: '', n: '', c: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const save = () => {
    const x: Record<string, string> = {}
    if (!f.name.trim()) x.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) x.email = 'Enter a valid email'
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(f.gstin.toUpperCase())) x.gstin = 'GSTIN must be 15 characters, e.g. 27ABCDE1234F1Z5'
    setErr(x)
    if (Object.keys(x).length) return
    setBusy(true); setTimeout(() => { setBusy(false); toast('Profile saved') }, 700)
  }
  const savePw = () => {
    const x: Record<string, string> = {}
    if (!pw.cur) x.cur = 'Enter your current password'
    if (pw.n.length < 8) x.n = 'Use at least 8 characters'
    if (pw.c !== pw.n) x.c = 'Passwords do not match'
    setErr(x)
    if (!Object.keys(x).length) { toast('Password updated'); setPw({ cur: '', n: '', c: '' }) }
  }
  const s = (k: string) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: '' }) }
  return (
    <div className="space-y-6">
      <Card title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={err.name}><Input value={f.name} invalid={!!err.name} onChange={s('name')} /></Field>
          <Field label="Email" required error={err.email}><Input value={f.email} invalid={!!err.email} onChange={s('email')} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={s('phone')} /></Field>
        </div>
        <h3 className="mb-3 mt-6 text-xl font-bold">Business details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name"><Input value={f.biz} onChange={s('biz')} /></Field>
          <Field label="GSTIN" error={err.gstin} hint="Optional. Used on tax invoices."><Input value={f.gstin} invalid={!!err.gstin} onChange={s('gstin')} placeholder="27ABCDE1234F1Z5" /></Field>
        </div>
        <div className="mt-5"><Btn loading={busy} onClick={save}>Save changes</Btn></div>
      </Card>
      <Card title="Change password">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password" error={err.cur}><Input type="password" value={pw.cur} invalid={!!err.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field>
          <Field label="New password" error={err.n}><Input type="password" value={pw.n} invalid={!!err.n} onChange={(e) => setPw({ ...pw, n: e.target.value })} /></Field>
          <Field label="Confirm" error={err.c}><Input type="password" value={pw.c} invalid={!!err.c} onChange={(e) => setPw({ ...pw, c: e.target.value })} /></Field>
        </div>
        <div className="mt-5"><Btn variant="secondary" onClick={savePw}>Update password</Btn></div>
      </Card>
    </div>
  )
}

function Addresses() {
  const { toast } = useApp()
  const [list, setList] = useState<Addr[]>(() => {
    try {
      const saved = localStorage.getItem('dd.addresses')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('dd.addresses', JSON.stringify(list))
    } catch { /* storage quota */ }
  }, [list])
  const [edit, setEdit] = useState<Addr | null>(null)
  const [del, setDel] = useState<Addr | null>(null)
  const [err, setErr] = useState<Record<string, string>>({})
  const blank: Addr = { id: 0, label: '', name: '', line: '', city: '', state: '', pin: '', phone: '', def: false }
  const save = () => {
    if (!edit) return
    const x: Record<string, string> = {}
    ;(['name', 'line', 'city', 'state'] as const).forEach((k) => { if (!edit[k].trim()) x[k] = 'Required' })
    if (!/^\d{6}$/.test(edit.pin)) x.pin = 'Enter a 6-digit PIN code'
    if (edit.phone.replace(/\D/g, '').length < 10) x.phone = 'Enter a valid phone number'
    setErr(x)
    if (Object.keys(x).length) return
    setList((l) => {
      const n = edit.id ? l.map((a) => (a.id === edit.id ? edit : a)) : [...l, { ...edit, id: Date.now() }]
      return edit.def ? n.map((a) => ({ ...a, def: a.id === edit.id || (!edit.id && a === n[n.length - 1]) })) : n
    })
    setEdit(null); toast('Address saved')
  }
  const e = (k: keyof Addr) => (ev: { target: { value: string } }) => { setEdit({ ...edit!, [k]: ev.target.value }); setErr({ ...err, [k]: '' }) }
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-3xl font-bold">Addresses</h2><Btn size="sm" icon={<Plus className="size-4" />} onClick={() => { setErr({}); setEdit(blank) }}>Add address</Btn></div>
      {list.length === 0 ? <EmptyState icon={<MapPin className="size-6" />} title="No saved addresses" text="Add an address for faster checkout." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => (
            <div key={a.id} className={cx('rounded-xl border bg-white p-5', a.def ? 'border-brand' : 'border-line')}>
              <div className="mb-2 flex items-center gap-2"><b>{a.label || 'Address'}</b>{a.def && <Badge tone="brand">Default</Badge>}<Sample /></div>
              <p className="text-sm">{a.name}</p>
              <p className="text-sm text-ink-2">{a.line}, {a.city}, {a.state} {a.pin}</p>
              <p className="text-sm text-ink-2">{a.phone}</p>
              <div className="mt-4 flex gap-2">
                <Btn size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => { setErr({}); setEdit(a) }}>Edit</Btn>
                <Btn size="sm" variant="tertiary" icon={<Trash2 className="size-3.5" />} onClick={() => setDel(a)}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
      <Drawer open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit address' : 'Add address'} footer={<div className="flex gap-3"><Btn variant="secondary" onClick={() => setEdit(null)}>Cancel</Btn><Btn className="flex-1" onClick={save}>Save address</Btn></div>}>
        {edit && (
          <div className="space-y-4 p-5">
            <Field label="Label"><Input value={edit.label} placeholder="Home, Office…" onChange={e('label')} /></Field>
            <Field label="Full name" required error={err.name}><Input value={edit.name} invalid={!!err.name} onChange={e('name')} /></Field>
            <Field label="Address" required error={err.line}><Textarea rows={2} value={edit.line} invalid={!!err.line} onChange={e('line')} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" required error={err.city}><Input value={edit.city} invalid={!!err.city} onChange={e('city')} /></Field>
              <Field label="State" required error={err.state}><Input value={edit.state} invalid={!!err.state} onChange={e('state')} /></Field>
              <Field label="PIN code" required error={err.pin}><Input value={edit.pin} invalid={!!err.pin} inputMode="numeric" onChange={e('pin')} /></Field>
              <Field label="Phone" required error={err.phone}><Input value={edit.phone} invalid={!!err.phone} onChange={e('phone')} /></Field>
            </div>
            <label className="flex items-center justify-between text-sm font-medium">Set as default <Switch on={edit.def} onChange={(v) => setEdit({ ...edit, def: v })} label="Default address" /></label>
          </div>
        )}
      </Drawer>
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete address?" footer={<><Btn variant="secondary" onClick={() => setDel(null)}>Cancel</Btn><Btn variant="danger" onClick={() => { setList(list.filter((a) => a.id !== del!.id)); setDel(null); toast('Address deleted', 'info') }}>Delete</Btn></>}>
        This will remove “{del?.label || del?.line}” from your saved addresses.
      </Modal>
    </div>
  )
}

import { authApi, checkoutApi, type ApiOrderSummary, type ApiOrderDetail } from '../api'

function Orders() {
  const { user } = useApp()
  const [filter, setFilter] = useState<'all' | OStatus>('all')
  const [liveOrders, setLiveOrders] = useState<ApiOrderSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (user) {
      setLoading(true)
      authApi.getMyOrders()
        .then((data) => {
          if (active) setLiveOrders(data)
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => { active = false }
  }, [user])

  const sourceOrders = liveOrders.map((o) => ({
    id: o.reference,
    date: new Date(o.created_at).toLocaleDateString(),
    status: (o.status === 'delivered' ? 'Delivered' : o.status === 'shipped' ? 'Shipped' : o.status === 'paid' ? 'In production' : 'Processing') as OStatus,
    items: [],
    itemCount: o.item_count,
    total: o.total_amount_inr,
    step: 2,
    paid: o.payment_status === 'paid',
  }))

  const list = sourceOrders.filter((o) => filter === 'all' || o.status === filter)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold">Orders</h2>
        <div className="w-44"><Select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value as 'all')}><option value="all">All statuses</option>{(Object.keys(ORDER_TONE) as OStatus[]).map((s) => <option key={s}>{s}</option>)}</Select></div>
      </div>
      {liveOrders.length > 0 ? (
        <Notice tone="ok">Showing real verified customer orders from the database.</Notice>
      ) : (
        <Notice tone="info">No live order history found for current account. Completed checkouts appear here.</Notice>
      )}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Package className="size-6" />} title="No orders found" text="You haven't placed any orders yet." action={<Btn to="/shop">Start shopping</Btn>} />
        ) : list.map((o: any) => (
          <div key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-line bg-white p-4">
            <div className="min-w-0 flex-1 basis-40">
              <p className="font-bold text-navy">{o.id}</p>
              <p className="text-xs text-ink-2">{o.date} · {o.itemCount || o.items?.length || 1} item(s)</p>
            </div>
            <p className="font-semibold tabular-nums">{inr(o.total)}</p>
            <Badge tone={(ORDER_TONE as any)[o.status] || 'info'} dot>{o.status}</Badge>
            <Btn size="sm" variant="secondary" to={`/account/orders/${o.id}`}>View</Btn>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrderDetail({ id }: { id?: string }) {
  const [liveOrder, setLiveOrder] = useState<ApiOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      checkoutApi.getOrderStatus(id)
        .then((data) => setLiveOrder(data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [id])

  const [showInvoice, setShowInvoice] = useState(false)
  const o = liveOrder
    ? {
        id: liveOrder.reference,
        date: new Date(liveOrder.created_at).toLocaleDateString(),
        status: (liveOrder.status === 'delivered' ? 'Delivered' : liveOrder.status === 'shipped' ? 'Shipped' : liveOrder.status === 'paid' ? 'In production' : 'Processing') as OStatus,
        items: liveOrder.items || [],
        total: liveOrder.total_amount_inr,
        step: 2,
        paid: liveOrder.payment_status === 'paid',
        shipping_address: liveOrder.shipping_address,
      }
    : null

  if (!o && !loading) return <EmptyState icon={<Package className="size-6" />} title="Order not found" text="We could not find this order in your account." action={<Btn to="/account/orders">Back to orders</Btn>} />
  if (!o) return <div className="space-y-4 py-8"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>

  const sub = Math.round(o.total / 1.18)
  const addr = (o as any).shipping_address || { line: 'Primary delivery address', city: '', state: '', pin: '' }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link to="/account/orders" className="text-sm font-semibold text-brand hover:underline">← All orders</Link><h2 className="mt-1 text-4xl font-bold">{o.id}</h2><p className="text-sm text-ink-2">Placed {o.date}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={(ORDER_TONE as any)[o.status] || 'info'} dot>{o.status}</Badge>
          <Badge tone={o.paid ? 'ok' : 'warn'} dot>{o.paid ? 'Payment received' : 'Payment pending'}</Badge>
          <button
            onClick={() => setShowInvoice(true)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand transition shadow-xs"
          >
            <FileText className="size-3.5 text-brand" />
            Tax Invoice
          </button>
        </div>
      </div>
      <Card title="Items">
        <ul className="divide-y divide-line">
          {Array.isArray(o.items) && o.items.map((item: any, n: number) => {
            const isLive = typeof item === 'object' && item.product_name
            const p = isLive ? null : byId(item)
            return (
              <li key={n} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold">{isLive ? item.product_name : p?.name}</p>
                  <p className="text-xs text-ink-2">{isLive ? `SKU: ${item.product_sku} · Qty ${item.quantity}` : `${p?.sku} · Qty 1`}</p>
                </div>
                <span className="font-semibold tabular-nums">{inr(isLive ? item.total_price_inr : (p?.price || 0))}</span>
              </li>
            )
          })}
        </ul>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Shipping address">
          <p className="text-sm font-semibold">{addr.customer_name || addr.name || 'Recipient'}</p>
          <p className="text-sm text-ink-2">{addr.address_line1 || addr.line}, {addr.city}, {addr.state} {addr.postal_code || addr.pin}</p>
        </Card>
        <Card title="Price breakdown">
          <dl className="space-y-2 text-sm tabular-nums">
            <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd>{inr(sub)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">GST (18%)</dt><dd>{inr(o.total - sub)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{inr(o.total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink-2">Authoritative calculation from the database.</p>
        </Card>
      </div>

      <InvoiceModal
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        orderRef={o.id}
        orderData={liveOrder || o}
      />
    </div>
  )
}

function useBusy(ms = 400) {
  const [b, setB] = useState(true)
  const [k, setK] = useState(0)
  useEffect(() => { setB(true); const t = setTimeout(() => setB(false), ms); return () => clearTimeout(t) }, [k, ms])
  return [b, () => setK(k + 1)] as const
}

function Wishlist() {
  const { wishlist, toggleWish, addToCart } = useApp()
  const [busy] = useBusy()
  const [broken, setBroken] = useState(false)
  const items = wishlist.map(byId).filter(Boolean) as Product[]
  if (busy) return <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  if (broken) return <ErrorState title="Could not load your wishlist" onRetry={() => setBroken(false)} />
  if (!items.length) return <EmptyState icon={<Heart className="size-6" />} title="Your wishlist is empty" text="Tap the heart on any product to save it here." action={<Btn to="/shop">Browse products</Btn>} />
  return (
    <div>
      <h2 className="mb-5 text-3xl font-bold">Wishlist <span className="text-ink-2">({items.length})</span></h2>
      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="flex flex-wrap gap-4 rounded-xl border border-line bg-white p-4">
            <Link to={`/product/${p.id}`}><img src={p.img} alt={p.name} className="size-24 rounded-lg bg-[#f3f1ee] object-cover mix-blend-multiply" /></Link>
            <div className="min-w-0 flex-1 basis-56">
              <Link to={`/product/${p.id}`} className="font-semibold hover:text-brand">{p.name}</Link>
              <div className="mt-1"><Price p={p} /></div>
              <p className="mt-1 text-xs text-ink-2">{p.specs.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
              <p className="mt-1 text-xs font-medium text-ink-2">Check availability on request</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn size="sm" variant="secondary" to={`/product/${p.id}`}>View product</Btn>
              {p.kind === 'standard' && p.price ? <Btn size="sm" icon={<ShoppingCart className="size-4" />} onClick={() => addToCart({ productId: p.id, qty: 1, options: { Size: p.sizes[0] } })}>Add to cart</Btn> : <Btn size="sm" to={p.kind === 'custom' ? `/product/${p.id}` : `/quote?product=${p.id}`}>{p.kind === 'custom' ? 'Customize' : 'Request quote'}</Btn>}
              <button aria-label={`Remove ${p.name}`} onClick={() => toggleWish(p.id)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-soft hover:text-bad"><X className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setBroken(true)} className="mt-4 text-xs text-ink-2 underline">Preview error state</button>
    </div>
  )
}

const rowsFor = (ps: Product[]) => {
  const keys = [...new Set(ps.flatMap((p) => p.specs.map((s) => s[0])))]
  const spec = (p: Product, k: string) => p.specs.find((s) => s[0] === k)?.[1] ?? '—'
  const base: [string, (p: Product) => string][] = [
    ['SKU', (p) => p.sku], ['Category', (p) => catName(p.cat)], ['Sizes', (p) => p.sizes.join(', ')],
    ['Customizable', (p) => (p.attrs.customizable === 'Yes' ? 'Yes' : 'No')],
    ['Mounting', (p) => toArr(p.attrs.mounting).join(', ') || '—'], ['Indoor / outdoor', (p) => toArr(p.attrs.use).join(', ') || '—'],
    ...keys.map((k) => [k, (p: Product) => spec(p, k)] as [string, (p: Product) => string]),
  ]
  return base.map(([label, get]) => { const vals = ps.map(get); return { label, vals, diff: new Set(vals).size > 1 } })
}

function Compare() {
  const { compare, toggleCompare, addToCart } = useApp()
  const [diffOnly, setDiffOnly] = useState(false)
  const [sel, setSel] = useState<[number, number]>([0, 1])
  const ps = compare.map(byId).filter(Boolean) as Product[]
  if (ps.length === 0) return <EmptyState icon={<Scale className="size-6" />} title="Nothing to compare yet" text="Use the compare icon on products to add up to 4 here." action={<Btn to="/shop">Browse products</Btn>} />
  const rows = rowsFor(ps).filter((r) => !diffOnly || r.diff)
  const act = (p: Product) => p.kind === 'standard' && p.price ? <Btn size="sm" full onClick={() => addToCart({ productId: p.id, qty: 1, options: { Size: p.sizes[0] } })}>Add to cart</Btn> : <Btn size="sm" full to={p.kind === 'custom' ? `/product/${p.id}` : `/quote?product=${p.id}`}>{p.kind === 'custom' ? 'Customize' : 'Request quote'}</Btn>
  const head = (p: Product) => (
    <div className="relative space-y-2 text-left">
      <button aria-label={`Remove ${p.name}`} onClick={() => toggleCompare(p.id)} className="absolute right-0 top-0 z-10 grid size-7 place-items-center rounded-full bg-white shadow"><X className="size-4" /></button>
      <img src={p.img} alt="" className="aspect-[4/3] w-full rounded-lg bg-[#f3f1ee] object-cover mix-blend-multiply" />
      <Link to={`/product/${p.id}`} className="block font-semibold leading-tight hover:text-brand">{p.name}</Link>
      <Price p={p} />
      {act(p)}
    </div>
  )
  const a = Math.min(sel[0], ps.length - 1), b = Math.min(sel[1], ps.length - 1)
  const pair = ps.length > 1 ? [ps[a], ps[b]] : [ps[0]]
  const pairRows = rowsFor(pair).filter((r) => !diffOnly || r.diff)
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold">Compare <span className="text-ink-2">({ps.length})</span></h2>
        <label className="flex items-center gap-2.5 text-sm font-medium"><Switch on={diffOnly} onChange={setDiffOnly} label="Show differences only" />Show differences only</label>
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead><tr><th className="sticky left-0 z-10 w-40 bg-white p-3" />{ps.map((p) => <th key={p.id} className="min-w-48 p-3 align-top font-normal">{head(p)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={cx('border-t border-line', r.diff && 'bg-brand-soft')}>
                <th className={cx('sticky left-0 z-10 p-3 text-left font-semibold', r.diff ? 'bg-brand-soft' : 'bg-white')}>{r.label}{r.diff && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Differs</span>}</th>
                {r.vals.map((v, i) => <td key={i} className="p-3">{v}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={ps.length + 1} className="p-6 text-center text-ink-2">These products have no differing attributes.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {ps.length > 1 && <div className="mb-4 grid grid-cols-2 gap-3">{[a, b].map((v, i) => <Select key={i} aria-label={`Product ${i + 1}`} value={v} onChange={(e) => setSel(i ? [a, +e.target.value] : [+e.target.value, b])}>{ps.map((p, n) => <option key={p.id} value={n}>{p.name}</option>)}</Select>)}</div>}
        <div className={cx('grid gap-3', pair.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>{pair.map((p) => <div key={p.id}>{head(p)}</div>)}</div>
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          {pairRows.map((r) => (
            <div key={r.label} className={cx('border-b border-line p-3 last:border-0', r.diff && 'bg-brand-soft')}>
              <p className="text-xs font-semibold text-ink-2">{r.label}{r.diff && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Differs</span>}</p>
              <div className={cx('mt-1 grid gap-3 text-sm', pair.length > 1 && 'grid-cols-2')}>{r.vals.map((v, i) => <p key={i}>{v}</p>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Recent() {
  const { recent } = useApp()
  const ps = recent.map(byId).filter(Boolean) as Product[]
  return (
    <div>
      <h2 className="mb-5 text-3xl font-bold">Recently viewed</h2>
      {ps.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ps.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <EmptyState icon={<Clock className="size-6" />} title="Nothing viewed yet" text="Products you open will appear here." action={<Btn to="/shop">Browse products</Btn>} />}
    </div>
  )
}

import { adminApi } from '../api'

function Quotes() {
  const [liveQuotes, setLiveQuotes] = useState<any[]>([])
  const [open, setOpen] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    adminApi.getQuotes({ page_size: 20 })
      .then((res) => {
        if (active && res?.items) {
          setLiveQuotes(res.items.map((it: any) => ({
            id: it.reference,
            date: it.created_at ? it.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: (it.status === 'submitted' ? 'New' : it.status === 'under_review' ? 'In review' : 'Quoted') as 'New' | 'In review' | 'Quoted',
            pid: it.product_id || PRODUCTS[0]?.id || 'fine-pitch-indoor-led-video-wall-p18',
            qty: it.quantity,
            notes: it.notes || `City: ${it.city || '—'} · Email: ${it.email}`,
            amount: it.quoted_amount_paise ? Math.round(it.quoted_amount_paise / 100) : undefined,
          })))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const p = open && byId(open.pid)
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-3xl font-bold">Quotes</h2><Btn size="sm" to="/quote" icon={<Plus className="size-4" />}>New request</Btn></div>
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : liveQuotes.length === 0 ? (
          <EmptyState icon={<FileText className="size-6" />} title="No quotes requested yet" text="Request a quotation for any large format or customizable display from its product page." action={<Btn to="/quote">Request a quote</Btn>} />
        ) : (
          liveQuotes.map((q) => {
            const prod = byId(q.pid)
            return (
              <div key={q.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-line bg-white p-4">
                <img src={resolveAssetUrl(prod?.img || '/p/i-standee.jpg')} alt="" className="size-14 rounded-lg bg-soft object-cover" />
                <div className="min-w-0 flex-1 basis-40"><p className="font-bold">{q.id}</p><p className="truncate text-xs text-ink-2">{prod?.name || 'Commercial Display'} · Qty {q.qty} · {q.date}</p></div>
                <p className="text-sm font-semibold tabular-nums">{q.amount ? inr(q.amount) : 'Awaiting quote'}</p>
                <Badge tone={QTONE[q.status as 'New' | 'In review' | 'Quoted'] || 'info'} dot>{q.status}</Badge>
                <Btn size="sm" variant="secondary" icon={<Eye className="size-4" />} onClick={() => setOpen(q)}>Details</Btn>
              </div>
            )
          })
        )}
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.id ?? ''}>
        {open && p && (
          <div className="space-y-4 p-5">
            <img src={resolveAssetUrl(p.img || '/p/i-standee.jpg')} alt="" className="aspect-[4/3] w-full rounded-lg bg-[#f3f1ee] object-cover mix-blend-multiply" />
            <div className="flex items-center justify-between"><h3 className="text-2xl font-bold">{p.name}</h3><Badge tone={QTONE[open.status as 'New' | 'In review' | 'Quoted'] || 'info'} dot>{open.status}</Badge></div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Requested</dt><dd>{open.date}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Quantity</dt><dd>{open.qty}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Quoted amount</dt><dd className="font-semibold">{open.amount ? inr(open.amount) : 'Awaiting quote'}</dd></div>
            </dl>
            <div><p className="text-xs font-semibold text-ink-2">Notes</p><p className="text-sm">{open.notes}</p></div>
            <Btn variant="secondary" full to={`/quote?product=${p.id}`}>Request again</Btn>
          </div>
        )}
      </Drawer>
    </div>
  )
}

/* ---------- layout ---------- */
export default function Account({ section, id }: { section: Section; id?: string }) {
  const { wishlist, compare, user, isUserLoading, logout } = useApp()
  const active = section === 'order' ? 'orders' : section

  if (isUserLoading) {
    return (
      <Container className="py-20 text-center">
        <div className="mx-auto max-w-sm rounded-2xl border border-line bg-white p-8 shadow-card flex flex-col items-center justify-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-ink-2">Loading your account profile…</p>
        </div>
      </Container>
    )
  }

  if (!user) {
    return (
      <Container className="py-12 sm:py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-card sm:p-10">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
            <User className="size-8" />
          </div>
          <h1 className="text-3xl font-bold text-ink">Sign in to your account</h1>
          <p className="mt-2 text-sm text-ink-2">
            Track orders in real time, view invoices, manage saved addresses, and view your custom quotations.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Btn to="/login" size="lg" full>Sign in</Btn>
            <Btn to="/register" variant="secondary" size="lg" full>Create account</Btn>
          </div>
        </div>
      </Container>
    )
  }

  const nav: [string, string, ReactNode, number?][] = [
    ['profile', '/account', <User className="size-4" />], ['addresses', '/account/addresses', <MapPin className="size-4" />], ['orders', '/account/orders', <Package className="size-4" />],
    ['wishlist', '/wishlist', <Heart className="size-4" />, wishlist.length], ['compare', '/compare', <Scale className="size-4" />, compare.length],
    ['recent', '/account/recent', <Clock className="size-4" />], ['quotes', '/account/quotes', <FileText className="size-4" />],
  ]
  const label: Record<string, string> = { profile: 'Profile', addresses: 'Addresses', orders: 'Orders', wishlist: 'Wishlist', compare: 'Compare', recent: 'Recently viewed', quotes: 'Quotes' }
  const item = (on: boolean) => cx('flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-dd px-3.5 py-2.5 text-sm font-semibold transition cursor-pointer', on ? 'bg-brand-soft text-brand-hover' : 'text-ink-2 hover:bg-soft hover:text-ink')

  const handleSignOut = async () => {
    await logout()
    go('/login')
  }

  return (
    <Container className="py-8 sm:py-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account', to: '/account' }, { label: label[active] }]} />
      <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">My account</h1>
          <p className="mt-1 text-sm text-ink-2">
            Signed in as <span className="font-semibold text-ink">{user.full_name || user.name || user.email}</span> ({user.email})
          </p>
        </div>
        <Btn size="sm" variant="secondary" icon={<LogOut className="size-4" />} onClick={handleSignOut}>
          Sign out
        </Btn>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Account" className="hide-scroll -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:self-start lg:rounded-xl lg:border lg:border-line lg:p-2">
          {nav.map(([k, to, ic, n]) => (
            <Link key={k} to={to} className={item(active === k)}>{ic}{label[k]}{n !== undefined && <span className="ml-auto rounded-full bg-white px-1.5 text-[11px] shadow-sm">{n}</span>}</Link>
          ))}
          <Link to="/track" className={item(false)}><Truck className="size-4" />Track order</Link>
          <button type="button" onClick={handleSignOut} className={cx(item(false), 'w-full text-left lg:mt-1 lg:border-t lg:border-line lg:pt-3 text-red-600 hover:text-red-700 hover:bg-red-50')}>
            <LogOut className="size-4" />Sign out
          </button>
        </nav>
        <div className="min-w-0">
          {section === 'profile' && <Profile />}
          {section === 'addresses' && <Addresses />}
          {section === 'orders' && <Orders />}
          {section === 'order' && <OrderDetail id={id} />}
          {section === 'wishlist' && <Wishlist />}
          {section === 'compare' && <Compare />}
          {section === 'recent' && <Recent />}
          {section === 'quotes' && <Quotes />}
        </div>
      </div>
    </Container>
  )
}
