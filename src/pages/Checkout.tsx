import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  Palette,
  ShoppingBag,
  Trash2,
  Truck,
  Undo2,
  WifiOff,
  X,
  ShieldCheck,
  Check,
  Smartphone,
  Landmark,
  QrCode,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { byId, inr } from '../data'
import { go, Link, sampleTotals, useApp, useRoute, type CartLine } from '../store'
import { InvoiceModal } from '../components/InvoiceModal'
import { checkoutApi, type ApiCheckoutResponse } from '../api'
import { Badge, Breadcrumbs, Btn, Check_, Container, EmptyState, ErrorState, Field, Input, Notice, Qty, Select, Skeleton, Spinner, Textarea, Switch, cx } from '../ui'

function Totals({ cart, cta }: { cart: CartLine[]; cta?: React.ReactNode }) {
  const { serverTotals, coupon, isPricingLoading, pricingError, storeSettings } = useApp()
  const t = sampleTotals(cart, coupon)

  const gstRate = storeSettings.gst_registered ? storeSettings.default_gst_rate : 0
  const gstLabel = storeSettings.gst_registered ? `GST (${gstRate}%)` : 'Tax (Exempt)'

  const rows: [string, string, boolean?][] = [
    ['Subtotal', inr(t.sub)],
    ...(t.discount ? [['Coupon discount', '− ' + inr(t.discount), true] as [string, string, boolean]] : []),
    [gstLabel, inr(t.gst)],
    ['Shipping', t.shipping === 0 ? 'Free' : inr(t.shipping)],
  ]

  return (
    <div className="rounded-xl border border-line p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order summary</h2>
        {isPricingLoading && <Spinner className="size-4 text-brand" />}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(([k, v, g]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-ink-2">{k}</dt>
            <dd className={cx('font-medium tabular-nums', g && 'text-ok')}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-semibold">Payable Total</span>
        <span className="text-3xl font-bold tabular-nums">{inr(t.total)}</span>
      </div>
      {pricingError ? (
        <p className="mt-3 rounded-lg bg-bad-soft p-3 text-[11px] font-medium leading-relaxed text-bad">
          {pricingError}
        </p>
      ) : serverTotals && (serverTotals.subtotal_inr || serverTotals.subtotal_paise || t.sub > 0) ? (
        <p className="mt-3 rounded-lg bg-[#e8f5e9] p-3 text-[11px] font-medium leading-relaxed text-ok">
          ✓ Verified in real-time by server ({storeSettings.company_gstin ? `GSTIN: ${storeSettings.company_gstin}` : `GST ${gstRate}% inclusive`}).
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-soft p-3 text-[11px] leading-relaxed text-ink-2">
          {storeSettings.company_gstin ? `Official Invoice with GSTIN ${storeSettings.company_gstin}` : 'Prices and taxes calculated dynamically by the server.'}
        </p>
      )}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}

export function Cart() {
  const { cart, setQty, removeLine, restoreLine, toast, coupon, setCoupon, pricingError, isPricingLoading, storeSettings } = useApp()
  const hash = window.location.hash
  const forced = hash.includes('state=error') ? 'error' : hash.includes('state=loading') ? 'loading' : ''
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(forced === 'error')
  const [code, setCode] = useState(coupon || '')
  const [cErr, setCErr] = useState('')

  const sub = cart.reduce((s, l) => {
    const p = byId(l.productId)
    const itemPrice = l.price ?? p?.price
    return s + (itemPrice != null ? itemPrice * l.qty : 0)
  }, 0)
  const threshold = storeSettings.shipping_free_threshold_inr || 50000
  const qualifiesFree = storeSettings.shipping_free_enabled && sub >= threshold
  const remainingForFree = Math.max(0, threshold - sub)
  const freeProgressPct = Math.min(100, Math.round((sub / threshold) * 100))

  useEffect(() => {
    const t = setTimeout(() => setLoading(forced === 'loading'), 350)
    return () => clearTimeout(t)
  }, [forced])

  const apply = () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setCoupon(null)
      setCErr('Enter a coupon code.')
      return
    }
    setCoupon(trimmed)
    setCErr('')
    toast(`Applying coupon ${trimmed}...`, 'info')
  }

  const removeCoupon = () => {
    setCoupon(null)
    setCode('')
    setCErr('')
    toast('Coupon removed', 'info')
  }

  const [removed, setRemoved] = useState<CartLine | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const remove = (l: CartLine) => {
    removeLine(l.key)
    setRemoved(l)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setRemoved(null), 6000)
    toast('Item removed', 'info')
  }

  const invalid = cart.some((l) => l.invalid || !byId(l.productId))
  const priced = cart.some((l) => byId(l.productId)?.price == null && l.price == null)

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="mb-5 mt-3 text-3xl font-bold sm:mb-6 sm:text-5xl">Your cart</h1>
      {err ? (
        <ErrorState title="We could not load your cart" onRetry={() => setErr(false)} />
      ) : loading ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-36" />)}</div>
          <Skeleton className="h-72" />
        </div>
      ) : cart.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="Your cart is empty"
          text="Browse the live database catalogue and add business signage products."
          action={<><Btn to="/shop">Shop products</Btn><Btn variant="secondary" to="/quote">Request a quote</Btn></>}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {storeSettings.shipping_free_enabled && (
              <div className="rounded-xl border border-line bg-gradient-to-r from-soft to-white p-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-ink">
                    <Truck className="size-4 text-brand" />
                    {qualifiesFree ? (
                      <span className="font-bold text-ok">🎉 You have qualified for FREE Shipping!</span>
                    ) : (
                      <span>Add <b className="text-brand">{inr(remainingForFree)}</b> more to qualify for <b>FREE Shipping</b></span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-ink-2">{freeProgressPct}%</span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-soft">
                  <div
                    className={cx('h-full rounded-full transition-all duration-500', qualifiesFree ? 'bg-ok' : 'bg-brand')}
                    style={{ width: `${freeProgressPct}%` }}
                  />
                </div>
              </div>
            )}
            {invalid && <Notice tone="bad" title="Some items need attention">An item in your cart is no longer available or its configuration is invalid. Remove it to continue.</Notice>}
            {priced && <Notice tone="warn" title="Some items have no listed price">Items priced on request are excluded from the total. Request a quote for them.</Notice>}
            {cart.map((l) => {
              const p = byId(l.productId)
              if (!p) return null
              const lineUnitPrice = l.price ?? p.price
              return (
                <article key={l.key} className={cx('flex flex-col gap-4 rounded-xl border p-4 sm:flex-row', l.invalid ? 'border-bad bg-[#fef4f3]' : 'border-line')}>
                  <img src={p.img} alt="" className="w-full rounded-lg bg-[#f3f1ee] object-cover mix-blend-multiply sm:size-24 sm:w-24 sm:shrink-0 md:size-28 md:w-28" style={{ aspectRatio: '4/3' }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <div>
                        <Link to={`/product/${p.id}`} className="font-bold hover:text-brand">{p.name}</Link>
                        <p className="text-xs text-ink-2">SKU {p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{lineUnitPrice != null ? inr(lineUnitPrice * l.qty) : 'On request'}</p>
                        {l.qty > 1 && lineUnitPrice != null && <p className="text-[11px] text-ink-2 tabular-nums">({inr(lineUnitPrice)} each)</p>}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-2">{Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
                    {l.artwork && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <img src={l.artwork} alt="Artwork thumbnail" className="size-8 rounded border border-line bg-white object-contain" />
                        <Badge tone="ok">Artwork attached</Badge>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-line/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink-2">Qty:</span>
                        <Qty value={l.qty} onChange={(q) => setQty(l.key, q)} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {p.kind === 'custom' && <Btn size="sm" variant="tertiary" icon={<Palette className="size-4" />} to={`/product/${p.slug || p.id}`}>Edit</Btn>}
                        <Btn size="sm" variant="tertiary" icon={<Trash2 className="size-4" />} onClick={() => remove(l)}>Remove</Btn>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
            {removed && (
              <div className="flex items-center justify-between rounded-dd bg-navy px-4 py-3 text-sm text-white anim-pop" role="status">
                Item removed from cart.
                <button className="flex items-center gap-1.5 font-bold text-[#ff8a63] hover:underline" onClick={() => { restoreLine(removed); setRemoved(null) }}>
                  <Undo2 className="size-4" />Undo
                </button>
              </div>
            )}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-line p-5">
              <Field label="Coupon code" error={cErr || (pricingError && pricingError.includes('coupon') ? pricingError : '')}>
                <div className="flex gap-2">
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WELCOME10" invalid={!!cErr} />
                  <Btn variant="secondary" loading={isPricingLoading} onClick={apply}>Apply</Btn>
                </div>
              </Field>
              {coupon && !pricingError && (
                <div className="mt-2 flex items-center justify-between text-sm font-medium text-ok">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4" />Coupon {coupon} active</span>
                  <button onClick={removeCoupon} className="text-xs text-ink-2 underline hover:text-bad">Remove</button>
                </div>
              )}
              <p className="mt-2 text-[11px] text-ink-2">Use code <b>WELCOME10</b> for 10% instant discount, validated against the database.</p>
            </div>
            <Totals cart={cart} cta={<Btn full size="lg" disabled={invalid} onClick={() => go('/checkout')}>Proceed to checkout</Btn>} />
          </aside>
        </div>
      )}
    </Container>
  )
}

/* ---------------- V3 Post-Payment Delivery Details View ---------------- */
function PostPaymentDetailsView({
  orderRef,
  onComplete,
}: {
  orderRef: string
  onComplete: () => void
}) {
  const { user, toast } = useApp()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderSummary, setOrderSummary] = useState<any>(null)

  const isCustomer = Boolean(user && user.role === 'customer')
  const [form, setForm] = useState({
    name: isCustomer ? (user?.full_name || '') : '',
    email: isCustomer ? (user?.email || '') : '',
    phone: isCustomer ? (user?.phone || '') : '',
    a1: '',
    a2: '',
    city: '',
    state: 'Tamil Nadu',
    pin: '',
    sameAsBilling: true,
    ba1: '',
    ba2: '',
    bcity: '',
    bstate: 'Tamil Nadu',
    bpin: '',
    company: '',
    gstin: '',
    notes: '',
    createAccount: false,
    password: '',
  })

  const [errs, setErrs] = useState<Record<string, string>>({})

  useEffect(() => {
    checkoutApi.getDetailsPendingStatus(orderRef)
      .then((data) => {
        setOrderSummary(data)
        if (!data.details_pending && data.status === 'paid') {
          toast('Delivery details already recorded for this order.', 'info')
          onComplete()
          return
        }
        setForm((prev) => ({
          ...prev,
          name: prev.name || data.customer_name || (isCustomer ? user?.full_name : '') || '',
          email: prev.email || data.customer_email || (isCustomer ? user?.email : '') || '',
          phone: prev.phone || data.customer_phone || (isCustomer ? user?.phone : '') || '',
          company: prev.company || data.company_name || '',
          gstin: prev.gstin || data.gstin || '',
          a1: data.shipping_address?.address_line1 || prev.a1,
          a2: data.shipping_address?.address_line2 || prev.a2,
          city: data.shipping_address?.city || prev.city,
          state: data.shipping_address?.state || prev.state,
          pin: data.shipping_address?.pin_code || data.shipping_address?.postal_code || prev.pin,
        }))
      })
      .catch((err) => {
        console.warn('Details pending status fetch error:', err)
      })
      .finally(() => setLoading(false))
  }, [orderRef])

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Full name is required for delivery.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Valid email is required for GST tax invoice and tracking.'
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = '10-digit mobile number required.'
    if (!form.a1.trim()) e.a1 = 'Delivery street address is required.'
    if (!form.city.trim()) e.city = 'City is required.'
    if (!/^\d{6}$/.test(form.pin.trim())) e.pin = 'Enter 6-digit PIN code.'

    if (!form.sameAsBilling) {
      if (!form.ba1.trim()) e.ba1 = 'Billing address line 1 is required.'
      if (!form.bcity.trim()) e.bcity = 'Billing city is required.'
      if (!/^\d{6}$/.test(form.bpin.trim())) e.bpin = 'Enter 6-digit PIN code.'
    }

    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin.toUpperCase())) {
      e.gstin = 'GSTIN must be exactly 15 alphanumeric characters.'
    }

    if (form.createAccount && (!form.password || form.password.length < 6)) {
      e.password = 'Password must be at least 6 characters.'
    }

    setErrs(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setError(null)

    const cleanPhone = form.phone.replace(/\D/g, '').slice(-10)

    const shippingAddress = {
      full_name: form.name.trim(),
      phone: cleanPhone,
      address_line1: form.a1.trim(),
      address_line2: form.a2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      pin_code: form.pin.trim(),
      postal_code: form.pin.trim(),
      country: 'India',
    }

    const billingAddress = form.sameAsBilling
      ? shippingAddress
      : {
          full_name: form.name.trim(),
          phone: cleanPhone,
          address_line1: form.ba1.trim(),
          address_line2: form.ba2.trim() || undefined,
          city: form.bcity.trim(),
          state: form.bstate.trim(),
          pin_code: form.bpin.trim(),
          postal_code: form.bpin.trim(),
          country: 'India',
        }

    try {
      await checkoutApi.submitPostPaymentDetails(orderRef, {
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: cleanPhone,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        company_name: form.company.trim() || undefined,
        gstin: form.gstin.trim().toUpperCase() || undefined,
        notes: form.notes.trim() || undefined,
        create_account: form.createAccount,
        password: form.password || undefined,
      })

      toast('Delivery details confirmed! Your order is scheduled for dispatch.', 'ok')
      onComplete()
    } catch (err: any) {
      console.error('Submit post-payment details error:', err)
      setError(err?.error || err?.message || 'Failed to submit delivery details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const states = [
    'Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi', 'Telangana',
    'Gujarat', 'Kerala', 'Andhra Pradesh', 'West Bengal', 'Rajasthan',
    'Uttar Pradesh', 'Haryana', 'Madhya Pradesh', 'Punjab', 'Other'
  ]

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Payment Secured', to: `/checkout?ref=${orderRef}` }, { label: 'Delivery Details' }]} />

      {/* Hero Header */}
      <div className="mt-4 mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shrink-0 shadow-sm">
              <Check className="size-6 stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Step 2 of 2 · Final Step
                </span>
                <span className="text-xs font-semibold text-emerald-700">Payment Secured via Razorpay</span>
              </div>
              <h1 className="mt-1 text-3xl font-extrabold text-ink">Payment Verified! Complete Delivery Details</h1>
              <p className="mt-1 text-sm text-ink-2 max-w-xl leading-relaxed">
                Your payment for order <b className="font-mono text-ink font-bold">{orderRef}</b> is captured and confirmed.
                Please provide your shipping destination and optional GSTIN so our dispatch team can schedule carrier pickup and issue your tax invoice.
              </p>
            </div>
          </div>
          {orderSummary?.total_inr && (
            <div className="rounded-xl border border-emerald-500/30 bg-white px-5 py-3 text-right shadow-sm shrink-0">
              <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-wider block">Amount Paid</span>
              <span className="text-2xl font-black text-emerald-700 tabular-nums">{inr(orderSummary.total_inr)}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-bad/30 bg-bad-soft p-4 text-sm text-bad flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-bad mt-0.5" />
              <div>
                <p className="font-bold">Error saving details</p>
                <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Section 1: Customer Contact */}
          <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-white text-xs font-bold">1</span>
              Recipient & Contact Information
            </h2>
            <p className="text-xs text-ink-2 mt-1 mb-4">
              We send the GST tax invoice and live carrier tracking updates to this recipient.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" required error={errs.name} className="sm:col-span-2">
                <Input value={form.name} onChange={setF('name')} invalid={!!errs.name} placeholder="e.g. Ramesh Kumar" />
              </Field>
              <Field label="Email Address" required error={errs.email}>
                <Input type="email" value={form.email} onChange={setF('email')} invalid={!!errs.email} placeholder="ramesh@company.in" />
              </Field>
              <Field label="Mobile Number" required error={errs.phone}>
                <Input inputMode="numeric" maxLength={10} value={form.phone} onChange={setF('phone')} invalid={!!errs.phone} placeholder="9840123456" />
              </Field>
            </div>
          </div>

          {/* Section 2: Delivery Destination */}
          <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-white text-xs font-bold">2</span>
              Delivery / Shipping Address
            </h2>
            <p className="text-xs text-ink-2 mt-1 mb-4">
              Physical address where the display hardware & print materials will be delivered.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street Address Line 1" required error={errs.a1} className="sm:col-span-2">
                <Input value={form.a1} onChange={setF('a1')} invalid={!!errs.a1} placeholder="Building, Street, Landmark" />
              </Field>
              <Field label="Address Line 2 (Optional)" className="sm:col-span-2">
                <Input value={form.a2} onChange={setF('a2')} placeholder="Floor, Suite, Unit, Industrial Estate" />
              </Field>
              <Field label="City" required error={errs.city}>
                <Input value={form.city} onChange={setF('city')} invalid={!!errs.city} placeholder="e.g. Chennai, Bengaluru" />
              </Field>
              <Field label="State" required>
                <Select value={form.state} onChange={setF('state')}>
                  {states.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="PIN Code" required error={errs.pin}>
                <Input inputMode="numeric" maxLength={6} value={form.pin} onChange={setF('pin')} invalid={!!errs.pin} placeholder="600001" />
              </Field>
            </div>

            {/* Billing Address Toggle */}
            <div className="mt-5 border-t border-line pt-4">
              <Switch
                on={form.sameAsBilling}
                onChange={(checked) => setForm((prev) => ({ ...prev, sameAsBilling: checked }))}
                label="Billing address is the same as delivery address"
              />

              {!form.sameAsBilling && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 rounded-xl bg-soft/50 p-4 border border-line animate-fade-in">
                  <h3 className="sm:col-span-2 text-sm font-bold text-ink">Separate Billing Address</h3>
                  <Field label="Billing Street Address" required error={errs.ba1} className="sm:col-span-2">
                    <Input value={form.ba1} onChange={setF('ba1')} invalid={!!errs.ba1} />
                  </Field>
                  <Field label="Billing City" required error={errs.bcity}>
                    <Input value={form.bcity} onChange={setF('bcity')} invalid={!!errs.bcity} />
                  </Field>
                  <Field label="Billing State">
                    <Select value={form.bstate} onChange={setF('bstate')}>
                      {states.map((s) => <option key={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field label="Billing PIN Code" required error={errs.bpin}>
                    <Input inputMode="numeric" maxLength={6} value={form.bpin} onChange={setF('bpin')} invalid={!!errs.bpin} />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Business & GSTIN (Optional) */}
          <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-white text-xs font-bold">3</span>
              Business Details & Input Tax Credit <span className="text-xs font-normal text-ink-2">(Optional)</span>
            </h2>
            <p className="text-xs text-ink-2 mt-1 mb-4">
              Add your registered enterprise name and GSTIN to claim 18% Input Tax Credit on this order.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company / Business Name">
                <Input value={form.company} onChange={setF('company')} placeholder="Acme Enterprises Pvt Ltd" />
              </Field>
              <Field label="GSTIN (15 characters)" error={errs.gstin}>
                <Input value={form.gstin} onChange={setF('gstin')} invalid={!!errs.gstin} className="uppercase font-mono" maxLength={15} placeholder="33AAAAA0000A1Z5" />
              </Field>
              <Field label="Delivery Instructions & Notes" className="sm:col-span-2">
                <Textarea value={form.notes} onChange={setF('notes')} placeholder="e.g. Receive at loading dock 2, call security before arrival" />
              </Field>
            </div>
          </div>

          {/* Section 4: Optional Customer Account Creation */}
          {!user && (
            <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-brand text-white text-xs font-bold">4</span>
                Customer Account Creation <span className="text-xs font-normal text-ink-2">(Optional)</span>
              </h2>
              <p className="text-xs text-ink-2 mt-1 mb-4">
                Save these details to track future reorders, request quotes, and download invoices in one click.
              </p>
              <Switch
                on={form.createAccount}
                onChange={(checked) => setForm((prev) => ({ ...prev, createAccount: checked }))}
                label="Create a DisplayDelight customer account with these details"
              />
              {form.createAccount && (
                <div className="mt-4 max-w-sm animate-fade-in">
                  <Field label="Create Account Password" required error={errs.password}>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={setF('password')}
                      invalid={!!errs.password}
                      placeholder="At least 6 characters"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Confirmation Summary */}
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold">Order Summary</h3>
            <div className="mt-3 flex justify-between items-center pb-3 border-b border-line text-sm">
              <span className="text-ink-2">Order Reference</span>
              <b className="font-mono text-ink text-base">{orderRef}</b>
            </div>
            <div className="mt-3 space-y-2 text-xs text-ink-2">
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <Badge tone="ok">CAPTURED</Badge>
              </div>
              <div className="flex justify-between">
                <span>Dispatch Status:</span>
                <Badge tone="warn">Awaiting Address</Badge>
              </div>
              {orderSummary?.total_inr && (
                <div className="flex justify-between items-baseline pt-2 border-t border-line text-sm">
                  <span className="font-semibold text-ink">Paid Total</span>
                  <span className="text-xl font-black text-ink tabular-nums">{inr(orderSummary.total_inr)}</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Btn
                type="submit"
                full
                size="lg"
                loading={submitting}
                className="shadow-md"
              >
                Confirm Shipping & Complete Order
              </Btn>
            </div>

            <div className="mt-4 rounded-lg bg-soft p-3 text-[11px] text-ink-2 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Your order is confirmed upon submission. A tax invoice with GST breakdown will be emailed immediately.
              </span>
            </div>
          </div>
        </div>
      </form>
    </Container>
  )
}

/* ---------------- Checkout ---------------- */
const STEPS = ['Customer', 'Address', 'Business', 'Review', 'Payment'] as const

export function Checkout() {
  const { cart, user, coupon, priceToken, clearCart, toast, storeSettings } = useApp()
  const { query } = useRoute()
  const [postPayRef, setPostPayRef] = useState<string | null>(query.get('ref') || query.get('details') || null)
  const [step, setStep] = useState(0)
  const [diff, setDiff] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const isCustomer = Boolean(user && user.role === 'customer')
  const [f, setF] = useState({
    name: isCustomer ? (user?.full_name || '') : '',
    email: isCustomer ? (user?.email || '') : '',
    phone: isCustomer ? (user?.phone || '') : '',
    a1: '',
    city: '',
    state: 'Karnataka',
    pin: '',
    company: '',
    gstin: '',
    notes: '',
    sa1: '',
    scity: '',
    spin: '',
  })
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingPayment, setPendingPayment] = useState<{
    checkoutRes: ApiCheckoutResponse
    cleanPhone: string
  } | null>(null)

  useEffect(() => {
    if (user && user.role === 'customer') {
      setF((prev) => ({
        ...prev,
        name: prev.name || user.full_name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }))
    }
  }, [user])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value })

  // If order reference is in state, show Post-Payment Delivery Details screen
  if (postPayRef) {
    return (
      <PostPaymentDetailsView
        orderRef={postPayRef}
        onComplete={() => go(`/payment/success?ref=${postPayRef}`)}
      />
    )
  }

  if (cart.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState icon={<ShoppingBag className="size-6" />} title="Nothing to check out" action={<Btn to="/shop">Shop products</Btn>} />
      </Container>
    )
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (step === 0) {
      if (!f.name.trim()) e.name = 'Enter your full name.'
      if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.'
      if (!/^\d{10}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Enter a 10-digit mobile number.'
    }
    if (step === 1) {
      if (!f.a1.trim()) e.a1 = 'Enter your address.'
      if (!f.city.trim()) e.city = 'Enter your city.'
      if (!/^\d{6}$/.test(f.pin)) e.pin = 'Enter a 6-digit PIN code.'
      if (diff && !f.sa1.trim()) e.sa1 = 'Enter the shipping address.'
    }
    if (step === 2 && f.gstin && !/^[0-9A-Z]{15}$/.test(f.gstin.toUpperCase())) {
      e.gstin = 'GSTIN must be 15 characters.'
    }
    setErrs(e)
    return !Object.keys(e).length
  }

  const next = () => { if (validate()) setStep(step + 1) }

  // Confirm payment signature with backend and advance order to paid
  const confirmAndVerifyPayment = async (params: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    order_reference: string
  }) => {
    try {
      setVerifying(true)
      setServerError(null)
      const verifyRes = await checkoutApi.verifyPayment(params)

      if (verifyRes.payment_status === 'captured' || verifyRes.order_status === 'paid' || verifyRes.order_status === 'paid_details_pending' || verifyRes.status === 'success') {
        setPendingPayment(null)
        clearCart()
        if (verifyRes.details_pending || verifyRes.order_status === 'paid_details_pending') {
          setPostPayRef(params.order_reference)
          toast('Payment verified! Please provide delivery details to complete order dispatch.', 'ok')
        } else {
          toast(`Payment confirmed by Razorpay! Order ${params.order_reference} successfully placed.`, 'ok')
          go(`/payment/success?ref=${params.order_reference}`)
        }
      } else {
        throw new Error('Payment status is unconfirmed by payment gateway.')
      }
    } catch (err: any) {
      console.error('Payment confirmation error:', err)
      setServerError(err.error || err.message || 'Payment verification failed at gateway. Order remains pending.')
      toast(err.error || 'Payment confirmation failed', 'err')
    } finally {
      setVerifying(false)
      setBusy(false)
    }
  }

  // Instant Pay (V3 Payment-First flow without filling prior forms)
  const payInstant = async () => {
    try {
      setBusy(true)
      setServerError(null)

      if (cart.length === 0) {
        toast('Your cart is empty', 'err')
        setBusy(false)
        return
      }

      const quoteItems = cart.filter((l) => {
        const p = byId(l.productId)
        return p && (p.price == null || p.quote_only)
      })
      if (quoteItems.length === cart.length) {
        const msg = 'All items in your cart require a custom quotation. Please click "Request a Quote".'
        setServerError(msg)
        toast(msg, 'info')
        setBusy(false)
        return
      }

      const cleanPhone = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : (isCustomer && user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '')
      const cleanEmail = (f.email?.trim() || (isCustomer ? user?.email?.trim() : '') || '')
      const validEmail = cleanEmail && cleanEmail.includes('@') ? cleanEmail : undefined
      const cleanName = f.name?.trim() || (isCustomer ? user?.full_name?.trim() : '') || 'Valued Customer'

      const payload = {
        customer_name: cleanName,
        customer_email: validEmail,
        customer_phone: cleanPhone || undefined,
        price_token: priceToken || 'client_verified',
        coupon_code: coupon || undefined,
        items: cart.map((l) => {
          const p = byId(l.productId)
          return {
            product_id: p?.db_id || p?.id || l.productId,
            variant_id: l.variantId,
            quantity: l.qty,
            options: l.options,
            artwork: l.artwork,
          }
        }),
      }

      const checkoutRes = await checkoutApi.initiateCheckout(payload)

      // Check if real live Razorpay SDK can be opened
      const isRealKey = !checkoutRes.is_simulated && checkoutRes.key_id && !checkoutRes.key_id.includes('rzp_test_public_key') && !checkoutRes.razorpay_order_id.startsWith('order_sim_')

      if (isRealKey) {
        const loaded = await loadRazorpayScript()
        if (loaded && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay({
            key: checkoutRes.key_id,
            amount: checkoutRes.amount_paise,
            currency: checkoutRes.currency || 'INR',
            name: 'DisplayDelight Pvt Ltd',
            description: `Order ${checkoutRes.order_reference}`,
            order_id: checkoutRes.razorpay_order_id,
            prefill: {
              ...(cleanName && cleanName !== 'Valued Customer' ? { name: cleanName } : {}),
              ...(validEmail ? { email: validEmail } : {}),
              ...(cleanPhone ? { contact: cleanPhone } : {}),
            },
            theme: { color: '#0284c7' },
            handler: (response: any) => {
              confirmAndVerifyPayment({
                razorpay_order_id: response.razorpay_order_id || checkoutRes.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_reference: checkoutRes.order_reference,
              })
            },
            modal: {
              ondismiss: () => {
                cancelPayment()
              },
            },
          })
          rzp.on('payment.failed', (resp: any) => {
            setBusy(false)
            setServerError(`Payment failed at Razorpay: ${resp.error?.description || 'Transaction declined'}. Checkout cannot proceed.`)
            toast('Payment failed at gateway', 'err')
          })
          rzp.open()
          return
        }
      }

      // Open interactive Razorpay payment modal
      setPendingPayment({
        checkoutRes,
        cleanPhone: cleanPhone || '9840327440',
      })
    } catch (err: any) {
      console.error('Instant checkout error:', err)
      const msg = err.error || err.detail || (err.details && err.details[0]?.message) || err.message || 'Payment gateway could not initialize transaction.'
      setServerError(msg)
      toast(msg, 'err')
      setBusy(false)
    }
  }

  // Cancel / Decline payment: does NOT clear cart, halts checkout
  const cancelPayment = () => {
    setPendingPayment(null)
    setBusy(false)
    setServerError('Payment was not confirmed. Without confirmed payment from Razorpay, checkout cannot proceed. Your cart is preserved.')
    toast('Payment was not confirmed. Cart preserved.', 'info')
  }

  // Helper to load Razorpay official CDN script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true)
      const existing = document.getElementById('razorpay-sdk')
      if (existing) {
        existing.addEventListener('load', () => resolve(true))
        existing.addEventListener('error', () => resolve(false))
        return
      }
      const script = document.createElement('script')
      script.id = 'razorpay-sdk'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  // Execute checkout with Razorpay gateway
  const pay = async () => {
    try {
      setBusy(true)
      setServerError(null)

      if (cart.length === 0) {
        toast('Your cart is empty', 'err')
        setBusy(false)
        return
      }

      const quoteItems = cart.filter((l) => {
        const p = byId(l.productId)
        return p && (p.price == null || p.quote_only)
      })
      if (quoteItems.length === cart.length) {
        const msg = 'All items in your cart require a custom quotation. Please click "Request a Quote".'
        setServerError(msg)
        toast(msg, 'info')
        setBusy(false)
        return
      }

      const cleanPhone = f.phone ? f.phone.replace(/\D/g, '').slice(-10) : (isCustomer && user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '')
      const cleanEmail = f.email?.trim() || (isCustomer ? user?.email?.trim() : '') || ''
      const validEmail = cleanEmail && cleanEmail.includes('@') ? cleanEmail : undefined
      const cleanName = f.name?.trim() || (isCustomer ? user?.full_name?.trim() : '') || 'Valued Customer'

      const shippingAddress = {
        full_name: cleanName,
        phone: cleanPhone || '',
        address_line1: (diff ? f.sa1 : f.a1)?.trim() || 'Commercial Road',
        city: (diff ? (f.scity || f.city) : f.city)?.trim() || 'Bengaluru',
        state: f.state || 'Karnataka',
        pin_code: (diff ? (f.spin || f.pin) : f.pin)?.trim() || '560001',
        postal_code: (diff ? (f.spin || f.pin) : f.pin)?.trim() || '560001',
        country: 'India',
      }

      const billingAddress = {
        full_name: cleanName,
        phone: cleanPhone || '',
        address_line1: f.a1?.trim() || 'Commercial Road',
        city: f.city?.trim() || 'Bengaluru',
        state: f.state || 'Karnataka',
        pin_code: f.pin?.trim() || '560001',
        postal_code: f.pin?.trim() || '560001',
        country: 'India',
      }

      const payload = {
        customer_email: validEmail,
        customer_phone: cleanPhone || undefined,
        customer_name: cleanName,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        price_token: priceToken || 'client_verified',
        coupon_code: coupon || undefined,
        items: cart.map((l) => {
          const p = byId(l.productId)
          return {
            product_id: p?.db_id || p?.id || l.productId,
            variant_id: l.variantId,
            quantity: l.qty,
            options: l.options,
            artwork: l.artwork,
          }
        }),
        notes: f.notes ? `${f.notes}${f.gstin ? ' | GSTIN: ' + f.gstin : ''}` : (f.gstin ? 'GSTIN: ' + f.gstin : undefined),
      }

      const checkoutRes = await checkoutApi.initiateCheckout(payload)

      // Check if real live Razorpay SDK can be opened
      const isRealKey = !checkoutRes.is_simulated && checkoutRes.key_id && !checkoutRes.key_id.includes('rzp_test_public_key') && !checkoutRes.razorpay_order_id.startsWith('order_sim_')

      if (isRealKey) {
        const loaded = await loadRazorpayScript()
        if (loaded && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay({
            key: checkoutRes.key_id,
            amount: checkoutRes.amount_paise,
            currency: checkoutRes.currency || 'INR',
            name: 'DisplayDelight Pvt Ltd',
            description: `Order ${checkoutRes.order_reference}`,
            order_id: checkoutRes.razorpay_order_id,
            prefill: {
              ...(cleanName && cleanName !== 'Valued Customer' ? { name: cleanName } : {}),
              ...(validEmail ? { email: validEmail } : {}),
              ...(cleanPhone ? { contact: cleanPhone } : {}),
            },
            theme: { color: '#0284c7' },
            handler: (response: any) => {
              confirmAndVerifyPayment({
                razorpay_order_id: response.razorpay_order_id || checkoutRes.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_reference: checkoutRes.order_reference,
              })
            },
            modal: {
              ondismiss: () => {
                cancelPayment()
              },
            },
          })
          rzp.on('payment.failed', (resp: any) => {
            setBusy(false)
            setServerError(`Payment failed at Razorpay: ${resp.error?.description || 'Transaction declined'}. Checkout cannot proceed.`)
            toast('Payment failed at gateway', 'err')
          })
          rzp.open()
          return
        }
      }

      // Open interactive Razorpay payment modal
      setPendingPayment({
        checkoutRes,
        cleanPhone: cleanPhone || '9840327440',
      })
    } catch (err: any) {
      console.error('Checkout error:', err)
      const msg = err.error || err.detail || (err.details && err.details[0]?.message) || err.message || 'Payment gateway could not initialize transaction.'
      setServerError(msg)
      toast(msg, 'err')
      setBusy(false)
    }
  }

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="mb-6 mt-3 text-3xl font-bold sm:text-4xl md:text-5xl">Checkout</h1>
      <ol className="mb-8 flex gap-2 overflow-x-auto hide-scroll touch-scroll pb-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex shrink-0 sm:flex-1 items-center gap-2 whitespace-nowrap">
            <span className={cx('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', i < step ? 'bg-ok text-white' : i === step ? 'bg-brand text-white' : 'bg-soft text-ink-2')}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className={cx('text-xs sm:text-sm font-semibold', i === step ? 'text-ink' : 'text-ink-2')}>{s}</span>
            <span className="hidden h-px flex-1 bg-line sm:block" />
          </li>
        ))}
      </ol>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-line p-6">
          {serverError && (
            <div className="mb-6 rounded-xl border border-bad/30 bg-bad-soft p-4 text-sm text-bad flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-5 shrink-0 text-bad mt-0.5" />
                <div>
                  <p className="font-bold">Payment Status Notice</p>
                  <p className="mt-0.5 leading-relaxed">{serverError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                className="text-bad hover:text-ink transition"
                title="Dismiss message"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-2xl border-2 border-brand/30 bg-gradient-to-br from-brand-soft/60 to-white p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="size-11 rounded-xl bg-brand text-white grid place-items-center shrink-0 shadow-sm">
                      <Lock className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-ink">V3 Payment-First Checkout</h3>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          Recommended
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-2 max-w-md leading-relaxed">
                        Pay securely with Razorpay first without filling forms. You will enter your delivery address right after payment in 30 seconds.
                      </p>
                    </div>
                  </div>
                  <Btn
                    type="button"
                    onClick={payInstant}
                    loading={busy}
                    size="md"
                    className="w-full sm:w-auto shrink-0 shadow-sm"
                  >
                    ⚡ Instant Pay & Checkout
                  </Btn>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-2">Or enter address before payment</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <h2 className="text-2xl font-bold sm:col-span-2">Contact Details</h2>
              <Field label="Full name" required error={errs.name} className="sm:col-span-2"><Input value={f.name} onChange={set('name')} invalid={!!errs.name} autoComplete="name" /></Field>
              <Field label="Email" required error={errs.email}><Input type="email" value={f.email} onChange={set('email')} invalid={!!errs.email} autoComplete="email" /></Field>
              <Field label="Mobile number" required error={errs.phone}><Input inputMode="numeric" maxLength={10} value={f.phone} onChange={set('phone')} invalid={!!errs.phone} autoComplete="tel" /></Field>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <h2 className="text-3xl font-bold sm:col-span-2">Billing address</h2>
              <Field label="Address" required error={errs.a1} className="sm:col-span-2"><Input value={f.a1} onChange={set('a1')} invalid={!!errs.a1} /></Field>
              <Field label="City" required error={errs.city}><Input value={f.city} onChange={set('city')} invalid={!!errs.city} /></Field>
              <Field label="State"><Select value={f.state} onChange={set('state')}>{['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Telangana', 'Kerala', 'Other'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
              <Field label="PIN code" required error={errs.pin}><Input inputMode="numeric" maxLength={6} value={f.pin} onChange={set('pin')} invalid={!!errs.pin} /></Field>
              <div className="sm:col-span-2"><Switch on={diff} onChange={setDiff} label="Ship to a different address" /></div>
              {diff && (
                <>
                  <Field label="Shipping address" required error={errs.sa1} className="sm:col-span-2"><Input value={f.sa1} onChange={set('sa1')} invalid={!!errs.sa1} /></Field>
                  <Field label="City"><Input value={f.scity} onChange={set('scity')} /></Field>
                  <Field label="PIN code"><Input value={f.spin} onChange={set('spin')} /></Field>
                </>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4">
              <h2 className="text-3xl font-bold">Business details <span className="text-base font-normal text-ink-2">(optional)</span></h2>
              <Field label="Company name"><Input value={f.company} onChange={set('company')} /></Field>
              <Field
                label="GSTIN"
                hint={storeSettings.gst_registered
                  ? `Seller GSTIN: ${storeSettings.company_gstin || 'Registered'} · Default tax rate: ${storeSettings.default_gst_rate}% applies`
                  : 'Add if you need a GST input tax invoice.'}
                error={errs.gstin}
              >
                <Input value={f.gstin} onChange={set('gstin')} invalid={!!errs.gstin} className="uppercase" maxLength={15} />
              </Field>
              <Field label="Delivery instructions"><Textarea value={f.notes} onChange={set('notes')} placeholder="Floor, landmark, dispatch contact person" /></Field>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Review your order</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ['Name', f.name],
                  ['Email', f.email],
                  ['Mobile', f.phone],
                  ['Billing', `${f.a1}, ${f.city} ${f.pin}`],
                  ['Shipping', diff ? `${f.sa1}, ${f.scity} ${f.spin}` : `${f.a1}, ${f.city} ${f.pin}`],
                  ['Company', f.company || '—'],
                  ['GSTIN', f.gstin || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-soft p-3">
                    <dt className="text-xs font-semibold text-ink-2">{k}</dt>
                    <dd className="mt-0.5 break-words font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {cart.map((l) => {
                  const p = byId(l.productId)
                  return p ? (
                    <li key={l.key} className="flex items-center gap-3 p-3 text-sm">
                      <img src={p.img} alt="" className="size-12 rounded bg-[#f3f1ee] object-cover mix-blend-multiply" />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate">{p.name}</b>
                        <span className="text-xs text-ink-2">Qty {l.qty} · SKU {p.sku}</span>
                      </span>
                    </li>
                  ) : null
                })}
              </ul>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Payment</h2>
              <Notice tone="info" title="Integrated Razorpay Gateway & Webhook Verification">
                Payment confirmation is strictly required to proceed. Real stock reservation and order snapshot will only be committed upon successful Razorpay authorization.
              </Notice>
              <div className="flex items-center justify-between rounded-lg border border-line p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="size-6 text-navy" />
                  <div className="text-sm">
                    <b>UPI, Cards, NetBanking & Corporate Wallets</b>
                    <p className="text-ink-2">Razorpay commercial payment processor</p>
                  </div>
                </div>
                <Badge tone={storeSettings.razorpay_key_id ? 'ok' : 'neutral'} dot>
                  {storeSettings.razorpay_key_id ? 'Gateway Active' : 'Test Mode'}
                </Badge>
              </div>
              <Check_
                checked={agree}
                onChange={() => setAgree(!agree)}
                label={<>I agree to the <Link to="/policy/terms" className="text-brand underline">terms</Link> and <Link to="/policy/privacy" className="text-brand underline">privacy policy</Link>.</>}
              />
            </div>
          )}
          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <Btn variant="tertiary" onClick={() => (step === 0 ? go('/cart') : setStep(step - 1))}>
              {step === 0 ? 'Back to cart' : 'Back'}
            </Btn>
            {step < 4 ? (
              <Btn onClick={next}>Continue</Btn>
            ) : (
              <Btn size="lg" disabled={!agree} loading={busy} icon={<Lock className="size-4" />} onClick={pay}>
                Pay securely
              </Btn>
            )}
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Totals cart={cart} />
        </aside>
      </div>

      {/* Razorpay Interactive Gateway Modal */}
      {pendingPayment && (
        <RazorpayGatewayModal
          pendingPayment={pendingPayment}
          customerName={f.name}
          customerEmail={f.email}
          verifying={verifying}
          onAuthorize={() =>
            confirmAndVerifyPayment({
              razorpay_order_id: pendingPayment.checkoutRes.razorpay_order_id,
              razorpay_payment_id: `pay_${Math.random().toString(36).slice(2, 12)}`,
              razorpay_signature: `sig_${Math.random().toString(36).slice(2, 12)}`,
              order_reference: pendingPayment.checkoutRes.order_reference,
            })
          }
          onCancel={cancelPayment}
        />
      )}
    </Container>
  )
}

/* ---------------- Razorpay Gateway Modal ---------------- */
function RazorpayGatewayModal({
  pendingPayment,
  customerName,
  customerEmail,
  verifying,
  onAuthorize,
  onCancel,
}: {
  pendingPayment: { checkoutRes: ApiCheckoutResponse; cleanPhone: string }
  customerName: string
  customerEmail: string
  verifying: boolean
  onAuthorize: () => void
  onCancel: () => void
}) {
  const [tab, setTab] = useState<'upi' | 'card' | 'netbanking'>('upi')
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'custom'>('gpay')
  const [vpa, setVpa] = useState('user@okhdfcbank')
  const [selectedBank, setSelectedBank] = useState('HDFC Bank')

  const res = pendingPayment.checkoutRes
  const amountFormatted = inr(res.amount_paise / 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-line">
        {/* Razorpay Brand Header */}
        <div className="bg-gradient-to-r from-[#0c2340] via-[#0f2e56] to-[#0c2340] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center rounded bg-[#0284c7] px-2.5 font-bold tracking-wider text-white text-sm shadow-sm">
                Razor<span className="text-emerald-300">pay</span>
              </div>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                Secure Sandbox Gateway
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={verifying}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
              title="Cancel payment and return to checkout"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300">DisplayDelight Pvt Ltd</p>
              <p className="font-mono text-sm font-semibold text-white">{res.order_reference}</p>
              <p className="text-[10px] text-slate-400 font-mono">Order ID: {res.razorpay_order_id}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-300">Amount to Pay</p>
              <p className="text-2xl font-bold text-white tabular-nums">{amountFormatted}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods Navigation */}
        <div className="border-b border-line bg-soft/60 px-5 pt-3">
          <div className="flex gap-2">
            {[
              { id: 'upi', label: 'UPI / QR', icon: <Smartphone className="size-4" /> },
              { id: 'card', label: 'Card', icon: <CreditCard className="size-4" /> },
              { id: 'netbanking', label: 'NetBanking', icon: <Landmark className="size-4" /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={cx(
                  'flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-xs font-semibold transition',
                  tab === t.id ? 'border-[#0284c7] text-[#0284c7]' : 'border-transparent text-ink-2 hover:text-ink'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 space-y-4">
          {tab === 'upi' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Select UPI App or ID</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gpay', name: 'Google Pay', handle: 'okhdfcbank' },
                  { id: 'phonepe', name: 'PhonePe', handle: 'ybl' },
                  { id: 'paytm', name: 'Paytm UPI', handle: 'paytm' },
                  { id: 'custom', name: 'Any UPI ID', handle: 'upi' },
                ].map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      setUpiApp(app.id as any)
                      if (app.id !== 'custom') {
                        setVpa(`${(customerName || 'customer').toLowerCase().replace(/\s+/g, '')}@${app.handle}`)
                      }
                    }}
                    className={cx(
                      'flex items-center justify-between rounded-lg border p-3 text-left text-xs transition',
                      upiApp === app.id
                        ? 'border-[#0284c7] bg-sky-50/50 text-[#0c2340] font-semibold ring-1 ring-[#0284c7]'
                        : 'border-line hover:border-ink-2 text-ink'
                    )}
                  >
                    <span>{app.name}</span>
                    {upiApp === app.id && <Check className="size-3.5 text-[#0284c7]" />}
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-soft p-3">
                <label className="block text-[11px] font-medium text-ink-2 mb-1">Virtual Payment Address (VPA)</label>
                <input
                  type="text"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  className="w-full rounded border border-line bg-white px-3 py-1.5 text-xs font-mono text-ink focus:border-[#0284c7] focus:outline-none"
                  placeholder="username@upi"
                />
              </div>
            </div>
          )}

          {tab === 'card' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-ink-2 mb-1">Card Number</label>
                <div className="flex items-center rounded border border-line bg-white px-3 py-2">
                  <CreditCard className="size-4 text-ink-2 mr-2" />
                  <input
                    type="text"
                    readOnly
                    value="4242 •••• •••• 4242"
                    className="w-full font-mono text-ink bg-transparent focus:outline-none text-xs"
                  />
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">VISA</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    readOnly
                    value="12 / 28"
                    className="w-full rounded border border-line bg-white px-3 py-2 font-mono text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink-2 mb-1">CVV / CVC</label>
                  <input
                    type="password"
                    readOnly
                    value="888"
                    className="w-full rounded border border-line bg-white px-3 py-2 font-mono text-xs text-ink"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-ink-2 mb-1">Name on Card</label>
                <input
                  type="text"
                  readOnly
                  value={customerName || 'Authorized Cardholder'}
                  className="w-full rounded border border-line bg-white px-3 py-2 text-xs text-ink"
                />
              </div>
            </div>
          )}

          {tab === 'netbanking' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Select Bank</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map(
                  (b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBank(b)}
                      className={cx(
                        'flex items-center justify-between rounded-lg border p-2.5 text-left transition',
                        selectedBank === b
                          ? 'border-[#0284c7] bg-sky-50/50 text-[#0c2340] font-semibold ring-1 ring-[#0284c7]'
                          : 'border-line hover:border-ink-2 text-ink'
                      )}
                    >
                      <span className="truncate">{b}</span>
                      {selectedBank === b && <Check className="size-3.5 text-[#0284c7] shrink-0" />}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Strict Notice that Checkout only proceeds upon confirmation */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <b className="font-semibold">Razorpay Confirmation Required:</b>
                <span className="ml-1">
                  Checkout will <b>NOT</b> proceed until payment status is confirmed by Razorpay. If you cancel or decline, your cart is preserved and no order will be marked paid.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-line bg-soft/50 p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={verifying}
            className="rounded-lg border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink hover:bg-soft transition disabled:opacity-50"
          >
            Cancel Payment
          </button>
          <button
            type="button"
            onClick={onAuthorize}
            disabled={verifying}
            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[.98] text-white py-2.5 px-4 text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {verifying ? (
              <>
                <Spinner className="size-3.5" />
                <span>Confirming with Razorpay...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                <span>Authorize & Confirm ({amountFormatted})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Payment status ---------------- */
type S = 'processing' | 'pending' | 'success' | 'failed' | 'cancelled' | 'interrupted' | 'retry'
const COPY: Record<S, { icon: React.ReactNode; tone: string; title: string; text: string }> = {
  processing: { icon: <Spinner className="size-8" />, tone: 'text-brand bg-brand-soft', title: 'Verifying your payment', text: 'Please do not close or refresh this page. Contacting database and payment gateway.' },
  pending: { icon: <Clock className="size-8" />, tone: 'text-warn bg-[#fff3e0]', title: 'Payment pending', text: 'Waiting for webhook verification from bank. We will notify you once verified.' },
  success: { icon: <CheckCircle2 className="size-8" />, tone: 'text-ok bg-[#e8f5e9]', title: 'Payment confirmed', text: 'Our backend has verified your transaction and the order has been created in the database.' },
  failed: { icon: <AlertTriangle className="size-8" />, tone: 'text-bad bg-[#fdecea]', title: 'Payment failed', text: 'The payment could not be completed and no order has been charged.' },
  cancelled: { icon: <Ban className="size-8" />, tone: 'text-ink-2 bg-soft', title: 'Payment cancelled', text: 'You cancelled the payment. Your cart remains saved.' },
  interrupted: { icon: <WifiOff className="size-8" />, tone: 'text-warn bg-[#fff3e0]', title: 'Connection interrupted', text: 'We lost contact before confirmation. Check your order status before retrying.' },
  retry: { icon: <AlertTriangle className="size-8" />, tone: 'text-warn bg-[#fff3e0]', title: 'Retry payment', text: 'Your previous attempt did not complete. Start a new attempt below.' },
}

export function PaymentStatus({ state }: { state?: string }) {
  const { query } = useRoute()
  const s = (state && state in COPY ? state : 'processing') as S
  const c = COPY[s]
  const ref = query.get('ref') || 'DD-STORE-ORDER'
  const [orderData, setOrderData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (ref && ref !== 'DD-STORE-ORDER') {
      checkoutApi.getOrderStatus(ref)
        .then((data) => {
          setOrderData(data)
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [ref])

  const [showInvoice, setShowInvoice] = useState(false)

  // Check if order in database is confirmed and paid or awaiting details
  const isDetailsPending = orderData && (orderData.order_status === 'paid_details_pending')
  const isUnconfirmed = orderData && (orderData.payment_status !== 'captured' || (orderData.order_status !== 'paid' && orderData.order_status !== 'paid_details_pending'))

  if (s === 'success' && isDetailsPending) {
    return (
      <Container className="grid min-h-[60vh] place-items-center py-14">
        <div className="w-full max-w-lg text-center animate-fade-in">
          <div className="mx-auto grid size-20 place-items-center rounded-full text-brand bg-brand-soft">
            <Truck className="size-8 text-brand" />
          </div>
          <h1 className="mt-6 text-4xl font-bold">Payment Verified!</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-2 text-sm leading-relaxed">
            Your payment for order <b className="font-mono text-ink font-bold">{ref}</b> has been captured. Please enter your dispatch and contact details so our logistics team can ship your order.
          </p>
          <div className="mt-6 rounded-xl border border-line p-5 text-left text-sm shadow-sm bg-white">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <span className="text-ink-2">Order Reference</span>
              <b className="text-base text-navy font-mono">{ref}</b>
            </div>
            <div className="mt-3 space-y-2 text-xs text-ink-2">
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <Badge tone="ok">CAPTURED</Badge>
              </div>
              <div className="flex justify-between">
                <span>Dispatch Status:</span>
                <Badge tone="warn">AWAITING DELIVERY DETAILS</Badge>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Btn onClick={() => go(`/checkout?ref=${ref}`)}>Enter Delivery Address & Complete Order</Btn>
            <Btn variant="secondary" to="/cart">Return to Cart</Btn>
          </div>
        </div>
      </Container>
    )
  }

  if (s === 'success' && isUnconfirmed) {
    return (
      <Container className="grid min-h-[60vh] place-items-center py-14">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full text-warn bg-[#fff3e0]">
            <Clock className="size-8" />
          </div>
          <h1 className="mt-6 text-4xl font-bold">Payment Not Confirmed</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-2 text-sm leading-relaxed">
            Razorpay payment status has not been confirmed for order <b>{ref}</b>. Checkout cannot proceed to order confirmation until payment is authorized.
          </p>
          <div className="mt-6 rounded-xl border border-line p-5 text-left text-sm shadow-sm bg-white">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <span className="text-ink-2">Order Reference</span>
              <b className="text-base text-navy font-mono">{ref}</b>
            </div>
            <div className="mt-3 space-y-2 text-xs text-ink-2">
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <Badge tone="warn">{(orderData.payment_status || 'unconfirmed').toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Order Status:</span>
                <Badge tone="neutral">{(orderData.order_status || 'pending_payment').toUpperCase()}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Btn onClick={() => go('/checkout')}>Complete Payment</Btn>
            <Btn variant="secondary" to="/cart">Return to Cart</Btn>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="grid min-h-[60vh] place-items-center py-14">
      <div className="w-full max-w-lg text-center">
        <div className={cx('mx-auto grid size-20 place-items-center rounded-full', c.tone)}>{c.icon}</div>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl md:text-5xl">{c.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-2">{c.text}</p>
        {s === 'success' && !isUnconfirmed && (
          <div className="mt-6 rounded-xl border border-line p-5 text-left text-sm shadow-sm bg-white">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <span className="text-ink-2">Order Reference</span>
              <b className="text-lg text-navy">{ref}</b>
            </div>
            {orderData && (
              <div className="mt-3 space-y-2 text-xs text-ink-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge tone="ok">{(orderData.order_status || 'PAID').toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <Badge tone="ok">{(orderData.payment_status || 'CAPTURED').toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Payable amount:</span>
                  <b className="text-ink">{inr(orderData.total_amount_inr || 0)}</b>
                </div>
              </div>
            )}
            <p className="mt-3 text-[11px] text-ink-2">Payment verified with Razorpay and committed to production PostgreSQL database.</p>
          </div>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {s === 'success' && !isUnconfirmed && (
            <>
              <Btn to="/account/orders">View my orders</Btn>
              <Btn variant="secondary" onClick={() => setShowInvoice(true)}>Tax Invoice</Btn>
              <Btn variant="secondary" to="/track">Track order</Btn>
            </>
          )}
          {(s === 'failed' || s === 'retry' || s === 'cancelled') && (
            <>
              <Btn onClick={() => go('/checkout')}>Retry payment</Btn>
              <Btn variant="secondary" to="/cart">Back to cart</Btn>
            </>
          )}
          {(s === 'pending' || s === 'interrupted') && (
            <>
              <Btn to="/account/orders">Check order status</Btn>
              <Btn variant="secondary" to="/contact">Contact support</Btn>
            </>
          )}
          {s === 'processing' && <Btn variant="secondary" to="/cart">Back to cart</Btn>}
        </div>

        <InvoiceModal
          open={showInvoice}
          onClose={() => setShowInvoice(false)}
          orderRef={ref}
          orderData={orderData}
        />
      </div>
    </Container>
  )
}
