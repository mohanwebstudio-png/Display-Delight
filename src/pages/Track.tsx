import { useState, type FormEvent } from 'react'
import { Check, Mail, MessageCircle, PackageSearch, Phone, SearchX } from 'lucide-react'
import { Badge, Btn, Container, ErrorState, Field, Input, Skeleton, cx } from '../ui'
import { inr } from '../data'
import { checkoutApi, type ApiOrderDetail } from '../api'

type S = 'form' | 'loading' | 'found' | 'notfound' | 'error'
const STEPS = ['Order placed', 'Payment confirmed', 'In production', 'Quality check', 'Shipped', 'Delivered']

export function Timeline({ current = 2 }: { current?: number }) {
  const st = (i: number) => (i < current ? 'done' : i === current ? 'cur' : 'up')
  const dot = (i: number) => cx(
    'grid size-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold',
    st(i) === 'done' && 'border-brand bg-brand text-white',
    st(i) === 'cur' && 'border-brand bg-white text-brand ring-4 ring-brand/15',
    st(i) === 'up' && 'border-line bg-white text-ink-2'
  )
  return (
    <>
      <ol className="hidden md:flex">
        {STEPS.map((s, i) => (
          <li key={s} className="relative flex-1 text-center">
            {i > 0 && <span className={cx('absolute right-1/2 top-[17px] h-0.5 w-full', i <= current ? 'bg-brand' : 'bg-line')} />}
            <span className={cx(dot(i), 'relative mx-auto')}>{st(i) === 'done' ? <Check className="size-4" strokeWidth={3} /> : i + 1}</span>
            <p className={cx('mt-2.5 px-1 text-[13px] font-semibold', st(i) === 'up' ? 'text-ink-2' : 'text-ink')}>{s}</p>
            <p className="text-[11px] text-ink-2">{st(i) === 'cur' ? 'Current' : st(i) === 'done' ? 'Completed' : 'Upcoming'}</p>
          </li>
        ))}
      </ol>
      <ol className="md:hidden">
        {STEPS.map((s, i) => (
          <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
            {i < STEPS.length - 1 && <span className={cx('absolute left-[17px] top-9 h-[calc(100%-36px)] w-0.5', i < current ? 'bg-brand' : 'bg-line')} />}
            <span className={dot(i)}>{st(i) === 'done' ? <Check className="size-4" strokeWidth={3} /> : i + 1}</span>
            <div className="pt-1.5">
              <p className={cx('text-sm font-semibold', st(i) === 'up' && 'text-ink-2')}>{s}</p>
              <p className="text-xs text-ink-2">{st(i) === 'cur' ? 'Current' : st(i) === 'done' ? 'Completed' : 'Upcoming'}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

function statusToStep(status: string): number {
  switch (status?.toLowerCase()) {
    case 'pending_payment': return 0
    case 'paid': return 1
    case 'processing': return 2
    case 'shipped': return 4
    case 'delivered': return 5
    default: return 2
  }
}

export default function Track() {
  const [id, setId] = useState('')
  const [ver, setVer] = useState('')
  const [err, setErr] = useState<{ id?: string; ver?: string }>({})
  const [s, setS] = useState<S>('form')
  const [order, setOrder] = useState<ApiOrderDetail | null>(null)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const x: typeof err = {}
    const v = id.trim().toUpperCase()
    if (!v) x.id = 'Enter your order ID'
    if (!ver.trim()) x.ver = 'Enter the email or phone number used at checkout'
    setErr(x)
    if (Object.keys(x).length) return

    setS('loading')
    try {
      const res = await checkoutApi.trackOrder({
        reference: v,
        email_or_phone: ver.trim(),
      })
      setOrder(res)
      setS('found')
    } catch (err: any) {
      if (err.status === 404 || err.error?.includes('not found') || err.message?.includes('not found')) {
        setS('notfound')
      } else {
        setS('error')
      }
    }
  }

  const step = order ? statusToStep(order.status) : 2
  const destCity = order?.shipping_address?.city || 'India'

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-brand">Real-Time Database Tracking</p>
        <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl sm:text-6xl">Track your order</h1>
        <p className="mt-2 text-ink-2">Enter your order ID and the email or phone number used at checkout to query the database.</p>
      </div>

      <form onSubmit={submit} noValidate className="mx-auto mt-8 grid max-w-3xl gap-4 rounded-xl border border-line bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Field label="Order Reference" required error={err.id}>
          <Input value={id} invalid={!!err.id} placeholder="e.g. DD-20261010-0001" onChange={(e) => { setId(e.target.value); setErr({ ...err, id: undefined }) }} />
        </Field>
        <Field label="Email or phone" required error={err.ver}>
          <Input value={ver} invalid={!!err.ver} placeholder="Used at checkout" onChange={(e) => { setVer(e.target.value); setErr({ ...err, ver: undefined }) }} />
        </Field>
        <Btn type="submit" loading={s === 'loading'} className="w-full sm:w-auto sm:mt-[26px]">Track order</Btn>
      </form>

      <div className="mx-auto mt-8 max-w-4xl">
        {s === 'form' && (
          <div className="grid place-items-center py-10 text-center text-ink-2">
            <PackageSearch className="size-10 text-line" />
            <p className="mt-2 text-sm">Real-time milestones and item specifications will appear here.</p>
          </div>
        )}
        {s === 'loading' && (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-28" />
            <Skeleton className="h-40" />
            <Skeleton className="h-24" />
          </div>
        )}
        {s === 'notfound' && (
          <div className="grid place-items-center rounded-xl border border-dashed border-line bg-soft/60 px-6 py-14 text-center">
            <SearchX className="size-10 text-ink-2" />
            <h2 className="mt-3 text-2xl font-bold">We could not find that order in our database</h2>
            <p className="mt-1 max-w-md text-sm text-ink-2">Check the order reference and the contact info used at checkout. If the details are correct, contact support.</p>
            <div className="mt-5 flex gap-3">
              <Btn variant="secondary" onClick={() => setS('form')}>Edit details</Btn>
              <Btn variant="tertiary" to="/contact">Contact support</Btn>
            </div>
          </div>
        )}
        {s === 'error' && (
          <ErrorState title="Tracking service is currently unreachable" text="Could not retrieve order details from the database." onRetry={() => submit()} />
        )}
        {s === 'found' && order && (
          <div className="space-y-6">
            <section className="rounded-xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">Live Order</p>
                  <h2 className="text-4xl font-bold">{order.reference}</h2>
                  <p className="mt-1 text-sm text-ink-2">
                    Placed on {new Date(order.created_at).toLocaleDateString()} · {destCity}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand" dot>{order.status?.toUpperCase()}</Badge>
                  <Badge tone="ok" dot>Payment: {order.payment_status?.toUpperCase()}</Badge>
                </div>
              </div>
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {order.items?.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.product_name}</p>
                      <p className="text-xs text-ink-2">SKU: {item.product_sku} · Qty {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{inr(item.total_price_inr || 0)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-line pt-3 font-semibold text-sm">
                <span>Total amount paid:</span>
                <span className="text-lg font-bold text-navy">{inr(order.total_amount_inr || 0)}</span>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-white p-5 sm:p-8">
              <h3 className="mb-6 text-2xl font-bold">Order progress</h3>
              <Timeline current={step} />
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-line bg-white p-5">
                <h3 className="text-2xl font-bold">Shipment Destination</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-ink-2">Status</dt><dd className="font-semibold">{order.status}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-2">City</dt><dd className="font-semibold">{destCity}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-2">Address</dt><dd className="font-semibold">{order.shipping_address?.address_line1 || 'Recorded'}</dd></div>
                </dl>
              </section>
              <section className="rounded-xl border border-line bg-white p-5">
                <h3 className="text-2xl font-bold">Need help?</h3>
                <p className="mt-1 text-sm text-ink-2">Quote order reference <b>{order.reference}</b> when contacting our team.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn size="sm" variant="secondary" icon={<Mail className="size-4" />} onClick={() => (window.location.href = `mailto:Displaydelight@gmail.com?subject=Order ${order.reference}`)}>Email</Btn>
                  <Btn size="sm" variant="secondary" icon={<Phone className="size-4" />} onClick={() => (window.location.href = 'tel:+919840327440')}>Call</Btn>
                  <Btn size="sm" variant="secondary" icon={<MessageCircle className="size-4" />} onClick={() => window.open('https://wa.me/919840327440', '_blank')}>WhatsApp</Btn>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
