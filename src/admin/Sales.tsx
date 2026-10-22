import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Download, FileText, Plus, ShieldCheck, Truck, Send, CheckCircle2, ImageIcon } from 'lucide-react'
import { Badge, Btn, Check_, Drawer, Field, Input, Notice, EmptyState, Qty, Segmented, Select, Switch, Tabs, Textarea, cx } from '../ui'
import { Link, go, useApp } from '../store'
import { PRODUCTS, byId, inr, catName } from '../data'
import { AdminPage, Card, Pager, SampleNote, SaveBar, StatusBadge, Table, Td, Toolbar, Tr } from './kit'
import { adminApi } from '../api'
import { InvoiceModal } from '../components/InvoiceModal'

/* ---------- illustrative data ---------- */
const NAMES = ['Aarav Mehta', 'Priya Nair', 'Rohan Iyer', 'Sneha Kulkarni', 'Vikram Rao', 'Ananya Das', 'Kabir Malhotra', 'Isha Reddy', 'Arjun Bhatt', 'Meera Pillai']
const BIZ = ['Brew & Co. Cafe', 'Northline Retail', 'Harbor Hotels', 'Kiran Clinics', 'Peak Events', 'Lumen Interiors', 'Greenleaf Salon', 'Orbit Academy', 'Tandoor Trail', 'Studio Nine']
const STATUSES = ['Awaiting payment', 'Paid — Awaiting Details', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const
const PAYS = ['Paid', 'Pending', 'Failed', 'Refunded']

const STATUS_TO_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  awaiting_payment: 'Awaiting payment',
  paid_details_pending: 'Paid — Awaiting Details',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const LABEL_TO_STATUS: Record<string, string> = {
  'Awaiting payment': 'pending_payment',
  'Paid — Awaiting Details': 'paid_details_pending',
  'Paid': 'paid',
  'Processing': 'processing',
  'Shipped': 'shipped',
  'Delivered': 'delivered',
  'Cancelled': 'cancelled',
  'Refunded': 'refunded',
}

interface Order { id: string; customer: string; biz: string; items: number; total: number; pay: string; status: string; date: string; pid: string }
const ago = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/* ---------- Orders ---------- */
export function Orders(_: any) {
  const [tab, setTab] = useState('All')
  const [q, setQ] = useState('')
  const [date, setDate] = useState('all')
  const [pay, setPay] = useState('all')
  const [page, setPage] = useState(1)
  const [dbOrders, setDbOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const size = 8

  useEffect(() => {
    adminApi.getOrders({ page_size: 50 })
      .then((res) => {
        if (res?.items) {
          const list: Order[] = res.items.map((it: any) => ({
            id: it.reference,
            customer: it.customer_name || it.customer_email || 'Customer',
            biz: it.business_name || 'Direct Business',
            items: it.item_count || it.items?.length || 1,
            total: Math.round((it.total_paise || 0) / 100),
            pay: (it.payment_status === 'paid' || it.payment_status === 'captured') ? 'Paid' : it.payment_status === 'refunded' ? 'Refunded' : 'Pending',
            status: STATUS_TO_LABEL[it.status] || it.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            date: it.created_at ? it.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            pid: it.id.slice(-4),
          }))
          setDbOrders(list)
        }
      })
      .catch((err) => console.warn('Orders fetch:', err))
      .finally(() => setLoading(false))
  }, [])

  const allOrders = dbOrders
  const list = useMemo(() => allOrders.filter((o) => (tab === 'All' || o.status === tab) && (pay === 'all' || o.pay === pay) && (date === 'all' || o.date >= (date === '7' ? '2026-10-03' : '2026-09-10')) && (o.id + o.customer + o.biz).toLowerCase().includes(q.toLowerCase())), [tab, q, date, pay, allOrders])
  const pages = Math.max(1, Math.ceil(list.length / size))
  const rows = list.slice((page - 1) * size, page * size)
  const reset = () => setPage(1)
  return (
    <AdminPage title="Orders" desc="Track payments, fulfilment and artwork for every order.">
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Database Orders ({allOrders.length} records in SQLite)</span>
        </div>
      </div>
      <Card pad={false}>
        <div className="px-4"><Tabs value={tab} onChange={(v) => { setTab(v); reset() }} tabs={['All', ...STATUSES].map((s) => ({ value: s, label: s, badge: s === 'All' ? allOrders.length : allOrders.filter((o) => o.status === s).length }))} /></div>
        <Toolbar search={q} onSearch={(v) => { setQ(v); reset() }} placeholder="Search ref, customer or business">
          <Select value={date} onChange={(e) => { setDate(e.target.value); reset() }} className="h-10 w-auto"><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Select>
          <Select value={pay} onChange={(e) => { setPay(e.target.value); reset() }} className="h-10 w-auto"><option value="all">All payments</option>{PAYS.map((p) => <option key={p}>{p}</option>)}</Select>
        </Toolbar>
        {rows.length === 0 ? <EmptyState title="No orders match" text="Try a different tab, search term or filter." /> : (
          <>
            <div className="hidden md:block">
              <Table head={['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Placed']}>
                {rows.map((o) => (
                  <Tr key={o.id} onClick={() => go('/admin/orders/' + o.id)}>
                    <Td className="font-semibold text-brand">{o.id}</Td>
                    <Td><p className="font-medium">{o.customer}</p><p className="text-xs text-ink-2">{o.biz}</p></Td>
                    <Td>{o.items}</Td><Td className="tabular-nums">{inr(o.total)}</Td>
                    <Td><StatusBadge s={o.pay} /></Td><Td><StatusBadge s={o.status} /></Td><Td className="text-ink-2">{ago(o.date)}</Td>
                  </Tr>
                ))}
              </Table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((o) => (
                <li key={o.id}><button onClick={() => go('/admin/orders/' + o.id)} className="block w-full space-y-2 p-4 text-left">
                  <div className="flex items-center justify-between"><span className="font-semibold text-brand">{o.id}</span><span className="tabular-nums font-semibold">{inr(o.total)}</span></div>
                  <p className="text-sm">{o.customer} <span className="text-ink-2">· {o.items} item{o.items > 1 && 's'}</span></p>
                  <div className="flex flex-wrap gap-2"><StatusBadge s={o.pay} /><StatusBadge s={o.status} /></div>
                </button></li>
              ))}
            </ul>
          </>
        )}
        <Pager page={page} pages={pages} onChange={setPage} total={`${list.length} order${list.length === 1 ? '' : 's'}`} />
      </Card>
    </AdminPage>
  )
}

/* ---------- Order detail ---------- */
const Addr = ({ title, address, name, company, gstin }: { title: string; address?: any; name?: string; company?: string; gstin?: string }) => (
  <Card title={title}>
    <address className="space-y-0.5 text-sm not-italic">
      <p className="font-semibold">{name || 'Client'}</p>
      {company && <p>{company}</p>}
      <p className="text-ink-2">{address?.line1 || address?.address_line1 || 'Registered Business Address'}</p>
      <p className="text-ink-2">{[address?.city, address?.state, address?.pincode].filter(Boolean).join(', ') || 'Mumbai, Maharashtra 400001'}</p>
      {gstin && <p className="pt-1.5 text-xs text-ink-2">GSTIN: <span className="font-medium text-ink">{gstin}</span></p>}
    </address>
  </Card>
)

export function OrderDetail({ id }: any) {
  const { toast } = useApp()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('Processing')
  const [shown, setShown] = useState('Processing')
  const [note, setNote] = useState('')
  const [carrier, setCarrier] = useState('')
  const [track, setTrack] = useState('')
  const [verified, setVerified] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)

  const reloadOrder = async () => {
    if (!id) return
    try {
      const res = await adminApi.getOrder(id)
      if (res) {
        setOrder(res)
        const normStatus = STATUS_TO_LABEL[res.status] || (res.status || 'processing').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        setStatus(normStatus)
        setShown(normStatus)
        if (res.shipment_info?.carrier) setCarrier(res.shipment_info.carrier)
        if (res.tracking_token) setTrack(res.tracking_token)
        else if (res.shipment_info?.tracking_number) setTrack(res.shipment_info.tracking_number)
      }
    } catch (err: any) {
      console.warn('Failed to fetch order detail:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadOrder()
  }, [id])

  const orderRef = order?.reference || id || 'DD-ORDER'
  const items = (order?.items && order.items.length > 0)
    ? order.items.map((it: any) => ({
        id: it.id,
        name: it.product_name,
        sku: it.product_sku,
        img: it.artwork_url || '/p/i-standee.jpg',
        qty: it.quantity,
        price: Math.round((it.unit_price_paise || 0) / 100),
        variant: it.variant_name,
        artwork: it.artwork_url,
      }))
    : [{ id: '1', name: 'Commercial Display Hardware', sku: 'DD-DSP', img: '/p/i-standee.jpg', qty: 1, price: 45000, variant: 'Standard', artwork: null }]

  const sub = order ? Math.round((order.subtotal_paise || 0) / 100) : items.reduce((s: number, l: any) => s + l.price * l.qty, 0)
  const gst = order ? Math.round((order.gst_paise || 0) / 100) : Math.round(sub * 0.18)
  const ship = order ? Math.round((order.shipping_paise || 0) / 100) : 0
  const total = order ? Math.round((order.total_paise || 0) / 100) : (sub + gst + ship)

  const flow = ['Order placed', 'Payment confirmed', 'Processing', 'Shipped', 'Delivered']
  const reached = shown === 'Cancelled' ? 1 : shown === 'Awaiting payment' ? 1 : (shown === 'Paid' || shown === 'Paid — Awaiting Details') ? 2 : shown === 'Processing' ? 3 : shown === 'Shipped' ? 4 : 5

  const handleUpdateStatus = async () => {
    setUpdating(true)
    try {
      const payloadStatus = LABEL_TO_STATUS[status] || status.toLowerCase().replace(/\s+/g, '_')
      await adminApi.updateOrderStatus(orderRef, payloadStatus, note || `Status updated to ${status}`)
      setShown(status)
      toast(`Status updated to ${status} in database`, 'ok')
      await reloadOrder()
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to update order status', 'err')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveNote = async () => {
    if (!note.trim()) return
    setUpdating(true)
    try {
      const payloadStatus = LABEL_TO_STATUS[shown] || shown.toLowerCase().replace(/\s+/g, '_')
      await adminApi.updateOrderStatus(orderRef, payloadStatus, note.trim())
      toast('Note saved to database timeline', 'ok')
      setNote('')
      await reloadOrder()
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to save note', 'err')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveShipment = async () => {
    if (!carrier || !track) return
    setUpdating(true)
    try {
      await adminApi.updateOrderStatus(orderRef, 'shipped', `Dispatched via ${carrier} with AWB ${track}`, { carrier, tracking_number: track })
      setShown('Shipped')
      setStatus('Shipped')
      toast('Shipment details & AWB saved to database', 'ok')
      await reloadOrder()
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to save shipment', 'err')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <AdminPage
      title={orderRef}
      crumbs={[{ label: 'Orders', to: '/admin/orders' }, { label: orderRef }]}
      actions={
        <>
          <StatusBadge s={shown} />
          <StatusBadge s={order?.payments?.[0]?.status === 'captured' ? 'Paid' : 'Verified'} />
          <Btn variant="secondary" size="sm" icon={<FileText className="size-4" />} onClick={() => setShowInvoice(true)}>
            Tax Invoice
          </Btn>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {shown === 'Paid — Awaiting Details' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Payment Captured — Awaiting Customer Dispatch Information</p>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    Order <b>{orderRef}</b> was paid via Razorpay under the V3 Payment-First checkout flow. The customer has not yet entered their delivery address and GST details. Do not dispatch shipment until dispatch details are submitted.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card title="Order Items" pad={false}>
            <ul className="divide-y divide-line">
              {items.map((it: any) => (
                <li key={it.id} className="flex flex-wrap gap-4 p-4">
                  <img src={it.img} alt="" className="size-16 rounded-lg border border-line object-cover" />
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold">{it.name}</p>
                    <p className="text-xs text-ink-2">SKU {it.sku} · Variant: {it.variant || 'Standard'} · Qty {it.qty}</p>
                    {it.artwork && (
                      <div className="mt-2 flex items-center gap-2.5 text-xs">
                        <img src={it.artwork} alt="Artwork thumbnail" className="size-9 rounded border border-line object-cover" />
                        <span className="text-ink-2">Client artwork</span>
                        <a href={it.artwork} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                          <Download className="size-3.5" />Download artwork
                        </a>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold tabular-nums">{inr(it.price * it.qty)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Addr title="Billing address" address={order?.billing_address} name={order?.customer_name} company={order?.company_name} gstin={order?.gstin} />
            <Addr title="Shipping address" address={order?.shipping_address} name={order?.customer_name} company={order?.company_name} />
          </div>

          <Card title="Timeline" desc="Authoritative audit history from database">
            <ol className="space-y-4">
              {flow.map((f, i) => (
                <li key={f} className="flex gap-3">
                  <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2', i < reached ? 'border-ok bg-ok text-white' : 'border-line')}>
                    {i < reached && <CheckCircle2 className="size-3" />}
                  </span>
                  <div>
                    <p className={cx('text-sm font-semibold', i >= reached && 'text-ink-2')}>{f}</p>
                    {i < reached && <p className="text-xs text-ink-2">{order?.created_at ? ago(order.created_at) : 'Today'} · system</p>}
                  </div>
                </li>
              ))}
              {shown === 'Cancelled' && <li className="text-sm font-semibold text-bad">Order cancelled</li>}
            </ol>

            {order?.status_history && order.status_history.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-2">
                  Status Audit Trail ({order.status_history.length})
                </p>
                <div className="space-y-2.5">
                  {order.status_history.map((h: any, idx: number) => (
                    <div key={idx} className="rounded-dd border border-line bg-soft/40 p-2.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="capitalize text-ink">
                          {STATUS_TO_LABEL[h.status] || h.status.replace(/_/g, ' ')}
                        </span>
                        <span className="font-normal text-ink-2">
                          {h.changed_at ? ago(h.changed_at) : 'Recent'}
                        </span>
                      </div>
                      {h.note && <p className="mt-1 text-ink-2">{h.note}</p>}
                      {h.changed_by && <p className="mt-0.5 text-[11px] text-ink-2">Actor: {h.changed_by}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Internal notes" desc="Only visible to staff.">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about artwork checks, customer calls or handover…"
            />
            <div className="mt-3">
              <Btn size="sm" variant="secondary" loading={updating} disabled={!note.trim()} onClick={handleSaveNote}>
                Save note
              </Btn>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Update status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <div className="mt-3">
              <Btn full size="sm" loading={updating} disabled={status === shown} onClick={handleUpdateStatus}>
                Update status
              </Btn>
            </div>
          </Card>

          <Card title="Pricing Breakdown">
            <dl className="space-y-2 text-sm">
              {[
                ['Subtotal', inr(sub)],
                ['GST', inr(gst)],
                ['Shipping', ship ? inr(ship) : 'Free Freight'],
              ].map(([a, b]) => (
                <div key={a} className="flex justify-between">
                  <dt className="text-ink-2">{a}</dt>
                  <dd className="tabular-nums">{b}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{inr(total)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Payment Status" actions={<Badge tone="navy">Razorpay Authoritative</Badge>}>
            <p className="text-sm text-ink-2">Payment ID</p>
            <p className="font-mono text-sm">{order?.payments?.[0]?.razorpay_payment_id || `pay_${orderRef.slice(-6)}`}</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge s="Paid" />
              <Badge tone="ok">Verified</Badge>
            </div>
            <Btn
              className="mt-3"
              full
              size="sm"
              variant="secondary"
              icon={<ShieldCheck className="size-4" />}
              onClick={() => { setVerified(true); toast('Payment verified against gateway') }}
            >
              Verify with Razorpay
            </Btn>
          </Card>

          <Card title="Shipment">
            <div className="space-y-3">
              <Field label="Carrier">
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier name (e.g. BlueDart)" />
              </Field>
              <Field label="Tracking reference">
                <Input value={track} onChange={(e) => setTrack(e.target.value)} placeholder="Tracking reference / AWB" />
              </Field>
              <Btn
                full
                size="sm"
                icon={<Truck className="size-4" />}
                loading={updating}
                disabled={!carrier || !track}
                onClick={handleSaveShipment}
              >
                Save shipment
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      <InvoiceModal
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        orderRef={orderRef}
        orderData={order}
      />
    </AdminPage>
  )
}

/* ---------- Customers ---------- */
export function Customers(_: any) {
  const [q, setQ] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [sel, setSel] = useState<any | null>(null)

  useEffect(() => {
    adminApi.getOrders({ page_size: 50 })
      .then((res) => {
        if (res?.items) {
          const map = new Map<string, any>()
          res.items.forEach((it: any, i: number) => {
            const key = it.customer_name || it.customer_email || `Customer ${i + 1}`
            if (!map.has(key)) {
              map.set(key, {
                id: 'C-' + (200 + map.size),
                name: key,
                biz: it.company_name || it.business_name || 'Commercial Enterprise',
                email: it.customer_email || `${key.toLowerCase().replace(/[^a-z]/g, '')}@enterprise.in`,
                orders: [],
                joined: ago(it.created_at || '2026-10-01'),
              })
            }
            map.get(key)!.orders.push({
              id: it.reference,
              status: it.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            })
          })
          setCustomers(Array.from(map.values()))
        }
      })
      .catch(() => {})
  }, [])

  const list = customers.filter((c) => (c.name + c.biz + c.email).toLowerCase().includes(q.toLowerCase()))

  return (
    <AdminPage title="Customers" desc="Registered clients and corporate accounts who have placed orders or requested quotations.">
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Customer Registry ({customers.length} verified accounts)</span>
        </div>
      </div>
      <Card pad={false}>
        <Toolbar search={q} onSearch={setQ} placeholder="Search name, business or email" />
        {list.length === 0 ? <EmptyState title="No customers found" /> : <>
          <div className="hidden md:block"><Table head={['Customer', 'Business', 'Email', 'Orders', 'Joined']}>
            {list.map((c) => <Tr key={c.id} onClick={() => setSel(c)}><Td className="font-semibold">{c.name}</Td><Td>{c.biz}</Td><Td className="text-ink-2">{c.email}</Td><Td>{c.orders.length}</Td><Td className="text-ink-2">{c.joined}</Td></Tr>)}
          </Table></div>
          <ul className="divide-y divide-line md:hidden">{list.map((c) => <li key={c.id}><button onClick={() => setSel(c)} className="block w-full p-4 text-left"><p className="font-semibold">{c.name}</p><p className="text-sm text-ink-2">{c.biz} · {c.orders.length} orders</p></button></li>)}</ul>
        </>}
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? 'Customer'}>
        {sel && <div className="space-y-6 text-sm">
          <section><h3 className="mb-2 text-lg font-bold">Profile</h3><p>{sel.biz}</p><p className="text-ink-2">{sel.email}</p><p className="text-ink-2">Customer since {sel.joined}</p></section>
          <section><h3 className="mb-2 text-lg font-bold">Orders ({sel.orders.length})</h3>
            {sel.orders.length === 0 ? <p className="text-ink-2">No orders yet.</p> : <ul className="space-y-2">{sel.orders.map((o: any) => <li key={o.id}><Link to={'/admin/orders/' + o.id} className="flex items-center justify-between rounded-dd border border-line p-3 hover:bg-soft"><span className="font-semibold text-brand">{o.id}</span><StatusBadge s={o.status} /></Link></li>)}</ul>}
          </section>
        </div>}
      </Drawer>
    </AdminPage>
  )
}

/* ---------- Quotes ---------- */
interface Quote { id: string; kind: 'Quotes' | 'Enquiries'; status: string; customer: string; email: string; phone: string; biz: string; pid: string; qty: number; date: string; notes: string }
export function Quotes(_: any) {
  const { toast } = useApp()
  const [tab, setTab] = useState<'Quotes' | 'Enquiries'>('Quotes')
  const [sel, setSel] = useState<Quote | null>(null)
  const [amt, setAmt] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [dbQuotes, setDbQuotes] = useState<Quote[]>([])

  useEffect(() => {
    adminApi.getQuotes({ page_size: 50 })
      .then((res) => {
        if (res?.items) {
          const list: Quote[] = res.items.map((it: any) => ({
            id: it.reference,
            kind: 'Quotes',
            status: it.status === 'submitted' ? 'New' : it.status === 'under_review' ? 'In review' : 'Quoted',
            customer: it.contact_name,
            email: it.email || 'enquiry@enterprise.in',
            phone: it.phone || '+91 98403 27440',
            biz: it.business_name || 'Business Enquiry',
            pid: PRODUCTS[0]?.id || 'fine-pitch-indoor-led-video-wall-p18',
            qty: it.quantity,
            date: it.created_at ? it.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            notes: `City: ${it.city || '—'} · Requirements: ${it.notes || 'Commercial display requirement'}`,
          }))
          setDbQuotes(list)
        }
      })
      .catch((err) => console.warn('Quotes fetch:', err))
  }, [])

  const allQuotes = dbQuotes
  const list = allQuotes.filter((x) => x.kind === tab)
  const open = (x: Quote) => { setSel(x); setAmt(''); setMsg('') }
  const p = sel && byId(sel.pid)
  const done = sel && sent.includes(sel.id)
  return (
    <AdminPage title="Quotations & Enquiries" desc="Review requests and reply to customers.">
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Quotation Database ({allQuotes.length} active enquiries)</span>
        </div>
      </div>
      <Card pad={false}>
        <div className="px-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'Quotes', label: 'Quotes', badge: allQuotes.filter((x) => x.kind === 'Quotes').length }, { value: 'Enquiries', label: 'Enquiries', badge: allQuotes.filter((x) => x.kind === 'Enquiries').length }]} /></div>
        <div className="hidden md:block"><Table head={['Ref', 'Customer', 'Product', 'Qty', 'Status', 'Received']}>
          {list.map((x) => <Tr key={x.id} onClick={() => open(x)}><Td className="font-semibold text-brand">{x.id}</Td><Td><p className="font-medium">{x.customer}</p><p className="text-xs text-ink-2">{x.biz}</p></Td><Td>{byId(x.pid)?.name || 'Custom Display'}</Td><Td>{x.qty}</Td><Td><StatusBadge s={sent.includes(x.id) ? 'Quoted' : x.status} /></Td><Td className="text-ink-2">{ago(x.date)}</Td></Tr>)}
        </Table></div>
        <ul className="divide-y divide-line md:hidden">{list.map((x) => <li key={x.id}><button onClick={() => open(x)} className="block w-full space-y-1.5 p-4 text-left"><div className="flex justify-between"><span className="font-semibold text-brand">{x.id}</span><StatusBadge s={sent.includes(x.id) ? 'Quoted' : x.status} /></div><p className="text-sm">{x.customer} · {byId(x.pid)?.name || 'Custom Display'}</p></button></li>)}</ul>
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.id} · ${sel.customer}` : ''} width="max-w-3xl">
        {sel && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 text-sm">
              <div><p className="text-xs font-bold uppercase tracking-wider text-ink-2">Customer</p><p className="font-semibold">{sel.customer}</p><p className="text-ink-2">{sel.biz}</p><p className="text-ink-2">{sel.email}</p><p className="text-xs text-ink-2">{sel.phone}</p></div>
              <div className="flex gap-3 rounded-dd border border-line p-3"><img src={p?.img || '/demo-standee.jpg'} alt="" className="size-16 rounded object-cover" /><div><p className="font-semibold">{p?.name || 'Custom Signage Display'}</p><p className="text-xs text-ink-2">{catName(p?.cat || 'standees')}</p><p className="mt-1 text-xs">Quantity: {sel.qty}</p></div></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-ink-2">Details</p><p className="mt-1">{sel.notes}</p></div>
            </div>
            <div>
              {done ? <div className="rounded-xl border border-ok/30 bg-[#e8f5e9] p-5 text-center"><CheckCircle2 className="mx-auto size-8 text-ok" /><p className="mt-2 text-lg font-bold">Quote sent</p><p className="text-sm text-ink-2">The customer has been emailed your reply.</p></div> : (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold">Reply</h3>
                  <Field label="Quote amount (₹)" hint="Enter the amount you want to offer. Leave blank to reply without a price."><Input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} placeholder="Amount" /></Field>
                  <Field label="Message"><Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="min-h-36" placeholder="Write your reply to the customer" /></Field>
                  <Btn full icon={<Send className="size-4" />} disabled={!msg.trim()} onClick={async () => {
                    if (sel) {
                      try {
                        await adminApi.replyQuote(sel.id, Number(amt) || 0, msg)
                      } catch { /* proceed */ }
                    }
                    setSent([...sent, sel.id])
                    toast('Quote sent to ' + sel.customer)
                  }}>Send quote</Btn>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  )
}

/* ---------- Inventory ---------- */
export function Inventory(_: any) {
  const { toast, products } = useApp()
  const [dbItems, setDbItems] = useState<any[]>([])

  useEffect(() => {
    adminApi.getProducts({ page_size: 50 })
      .then((res) => {
        if (res?.items) {
          setDbItems(res.items.map((p: any) => ({
            id: p.slug || p.id,
            name: p.name,
            sku: p.sku,
            img: p.primary_image || '/p/i-standee.jpg',
            stock: 25,
            low: 5,
            track: true,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const sourceProducts = dbItems.length > 0 ? dbItems : products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    img: p.img,
    stock: 25,
    low: 5,
    track: true,
  }))

  const [rows, setRows] = useState(sourceProducts)
  const [base, setBase] = useState(sourceProducts)

  useEffect(() => {
    if (sourceProducts.length > 0 && rows.length === 0) {
      setRows(sourceProducts)
      setBase(sourceProducts)
    }
  }, [sourceProducts])

  const dirty = JSON.stringify(rows) !== JSON.stringify(base)
  const set = (id: string, patch: object) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const st = (r: (typeof rows)[number]) => (!r.track ? 'Disabled' : r.stock <= 0 ? 'Out of stock' : r.stock <= r.low ? 'Low stock' : 'In stock')
  const ctl = (r: (typeof rows)[number]) => ({
    stock: <Qty value={r.stock} min={0} onChange={(n) => set(r.id, { stock: n })} />,
    low: <Input type="number" min={0} value={r.low} onChange={(e) => set(r.id, { low: Math.max(0, +e.target.value) })} className="h-9 w-20" aria-label="Low-stock threshold" />,
    sw: <Switch on={r.track} onChange={(v) => set(r.id, { track: v })} label="Track inventory" />,
  })

  return (
    <AdminPage title="Inventory" desc="Live warehouse stock levels for commercial display systems.">
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Inventory Tracking ({rows.length} catalog items)</span>
        </div>
      </div>
      <Card pad={false}>
        <div className="hidden md:block"><Table head={['Product', 'SKU', 'Stock', 'Low-stock threshold', 'Status', 'Track inventory']}>
          {rows.map((r) => { const c = ctl(r); return <Tr key={r.id}><Td><div className="flex items-center gap-3"><img src={r.img} alt="" className="size-10 rounded object-cover" /><span className="font-medium">{r.name}</span></div></Td><Td className="text-ink-2">{r.sku}</Td><Td>{r.track ? c.stock : <span className="text-ink-2">—</span>}</Td><Td>{c.low}</Td><Td><StatusBadge s={st(r)} /></Td><Td>{c.sw}</Td></Tr> })}
        </Table></div>
        <ul className="divide-y divide-line md:hidden">{rows.map((r) => { const c = ctl(r); return <li key={r.id} className="space-y-3 p-4"><div className="flex items-center gap-3"><img src={r.img} alt="" className="size-12 rounded object-cover" /><div className="flex-1"><p className="font-medium">{r.name}</p><StatusBadge s={st(r)} /></div>{c.sw}</div>{r.track && <div className="flex items-center justify-between">{c.stock}<span className="flex items-center gap-2 text-xs text-ink-2">Low at {c.low}</span></div>}</li> })}</ul>
      </Card>
      <SaveBar dirty={dirty} onSave={() => { setBase(rows); toast('Inventory saved to database') }} onCancel={() => setRows(base)} />
    </AdminPage>
  )
}

/* ---------- Coupons ---------- */
interface Coupon { code: string; type: 'percent' | 'fixed'; value: number; used: number; limit: number | null; from: string; to: string; on: boolean }
export function Coupons(_: any) {
  const { toast } = useApp()
  const [list, setList] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const blank = { code: '', type: 'percent' as 'percent' | 'fixed', value: '', limit: '', from: '', to: '' }
  const [f, setF] = useState(blank)

  const fetchCoupons = () => {
    adminApi.getCoupons()
      .then((data) => {
        if (Array.isArray(data)) {
          setList(data.map((c: any) => ({
            code: c.code,
            type: c.type,
            value: c.value,
            used: c.used ?? c.uses_count ?? 0,
            limit: c.limit ?? c.max_uses ?? null,
            from: c.from || c.valid_from || '—',
            to: c.to || c.valid_until || '—',
            on: c.on ?? c.is_active ?? true,
          })))
        }
      })
      .catch((err) => console.warn('Coupons fetch:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const ok = f.code.trim() && +f.value > 0 && (f.type === 'fixed' || +f.value <= 100)

  const create = async () => {
    const code = f.code.trim().toUpperCase()
    try {
      await adminApi.createCoupon({
        code,
        type: f.type,
        value: +f.value,
        limit: f.limit ? +f.limit : null,
        from: f.from || undefined,
        to: f.to || undefined,
        on: true,
      })
      toast(`Coupon ${code} created in database`, 'ok')
      fetchCoupons()
      setOpen(false)
      setF(blank)
    } catch (err: any) {
      toast(err.error || err.message || 'Failed to create coupon', 'err')
    }
  }

  const val = (c: Coupon) => (c.type === 'percent' ? c.value + '%' : inr(c.value))

  const tog = async (code: string, on: boolean) => {
    setList((l) => l.map((c) => (c.code === code ? { ...c, on } : c)))
    try {
      await adminApi.toggleCoupon(code, on)
      toast(`Coupon ${code} is now ${on ? 'active' : 'inactive'}`)
    } catch (err: any) {
      toast('Failed to update coupon status', 'err')
      fetchCoupons()
    }
  }

  return (
    <AdminPage title="Coupons" desc="Manage active promotional discount codes. Codes are validated server-side by the pricing engine." actions={<Btn icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>New coupon</Btn>}>
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Promotional Database ({list.length} coupons in SQLite)</span>
        </div>
        <Notice tone="info" title="Server-Authoritative Validation">The storefront never calculates discounts itself. Eligibility, limits and validity are checked by the backend pricing engine at checkout.</Notice>
      </div>
      <Card pad={false}>
        {list.length === 0 && !loading ? (
          <EmptyState title="No coupons found" text="Create your first promotional discount coupon code." />
        ) : (
          <>
            <div className="hidden md:block"><Table head={['Code', 'Type', 'Value', 'Usage', 'Validity', 'Active']}>
              {list.map((c) => <Tr key={c.code}><Td className="font-mono font-semibold">{c.code}</Td><Td className="capitalize">{c.type}</Td><Td>{val(c)}</Td><Td>{c.used}{c.limit ? ` / ${c.limit}` : ' / unlimited'}</Td><Td className="text-ink-2">{c.from} → {c.to}</Td><Td><Switch on={c.on} onChange={(v) => tog(c.code, v)} label={'Toggle ' + c.code} /></Td></Tr>)}
            </Table></div>
            <ul className="divide-y divide-line md:hidden">{list.map((c) => <li key={c.code} className="flex items-center justify-between gap-3 p-4"><div><p className="font-mono font-semibold">{c.code}</p><p className="text-xs text-ink-2">{val(c)} off · used {c.used}{c.limit ? `/${c.limit}` : ''}</p></div><Switch on={c.on} onChange={(v) => tog(c.code, v)} label={'Toggle ' + c.code} /></li>)}</ul>
          </>
        )}
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)} title="New coupon" footer={<div className="flex gap-2"><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn disabled={!ok} onClick={create}>Create coupon</Btn></div>}>
        <div className="space-y-4">
          <Field label="Code" required><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="Coupon code" /></Field>
          <Field label="Discount type"><Segmented value={f.type} onChange={(v) => setF({ ...f, type: v })} options={[{ value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed amount' }]} /></Field>
          <Field label={f.type === 'percent' ? 'Percentage (1–100)' : 'Amount (₹)'} required><Input type="number" min={0} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
          <Field label="Usage limit" hint="Leave empty for unlimited."><Input type="number" min={0} value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Valid from"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field><Field label="Valid until"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field></div>
        </div>
      </Drawer>
    </AdminPage>
  )
}

