import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Badge, Breadcrumbs, Btn, Container, Field, Input, Notice, Qty, Select, Textarea, Uploader, useUpload } from '../ui'
import { useApp } from '../store'
import { PRODUCTS, byId, catName } from '../data'
import { quotesApi } from '../api'

export default function Quote() {
  const { quoteDraft, toast, products } = useApp()
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('product')
  const allProds = products && products.length > 0 ? products : PRODUCTS
  const [pid, setPid] = useState(() => (q && byId(q) ? q : quoteDraft.productId && byId(quoteDraft.productId) ? quoteDraft.productId : allProds[0].id))
  const [f, setF] = useState({ name: '', biz: '', email: '', phone: '', city: '', state: '', notes: '', consent: false })
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState<Record<string, string>>({})
  const [st, setSt] = useState<'form' | 'busy' | 'ok' | 'fail'>('form')
  const [quoteRef, setQuoteRef] = useState<string>('')
  const up = useUpload()
  const p = byId(pid) || allProds[0]
  const opts = quoteDraft.productId === pid ? Object.entries(quoteDraft.options ?? {}) : []
  const set = (k: string, v: string | boolean) => { setF((s) => ({ ...s, [k]: v })); setErr((e) => ({ ...e, [k]: '' })) }

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const x: Record<string, string> = {}
    if (f.name.trim().length < 2) x.name = 'Enter your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) x.email = 'Enter a valid email address'
    if (f.phone.replace(/\D/g, '').length < 10) x.phone = 'Enter a 10-digit phone number'
    if (!f.city.trim()) x.city = 'Enter the delivery city'
    if (!f.consent) x.consent = 'Consent is required so we can contact you about this quote'
    if (up.state.status === 'uploading') x.art = 'Please wait for the upload to finish'
    setErr(x)
    if (Object.keys(x).length) return

    setSt('busy')
    try {
      const res = await quotesApi.submitQuote({
        product_id: p.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        company_name: f.biz || undefined,
        quantity: qty,
        specifications: {
          city: f.city,
          state: f.state,
          ...(quoteDraft.productId === pid ? quoteDraft.options : {}),
        },
        notes: f.notes || undefined,
      })
      setQuoteRef(res.reference)
      setSt('ok')
      toast('Quote request submitted successfully', 'ok')
    } catch (apiErr: any) {
      console.error('Quote submission error:', apiErr)
      setSt('fail')
      toast(apiErr.error || 'Failed to submit quote', 'err')
    }
  }

  if (st === 'ok')
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[#e8f5e9] text-ok"><CheckCircle2 className="size-8" /></div>
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">Quote request received</h1>
          <p className="mt-3 text-ink-2">Thanks, {f.name.split(' ')[0]}. Our team will review your request for <b>{p.name}</b> and reply on {f.email}.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-dd bg-soft px-4 py-2 text-sm">
            Reference <b className="tabular-nums font-mono text-navy">{quoteRef || 'QR-SUBMITTED'}</b>
            <Badge tone="ok">Saved in Database</Badge>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Btn to="/account/quotes">View my quotes</Btn><Btn variant="secondary" to="/shop">Continue shopping</Btn></div>
        </div>
      </Container>
    )

  return (
    <Container className="py-8 sm:py-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Request a quote' }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl md:text-5xl">Request a quote</h1>
      <p className="mt-2 max-w-2xl text-ink-2">Tell us about your project. Pricing is prepared by our team after reviewing your requirements.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={send} noValidate className="space-y-5">
          {st === 'fail' && <Notice tone="bad" title="We could not submit your request" action={<Btn size="sm" variant="secondary" onClick={() => send()}>Retry</Btn>}>Nothing was lost. Check your connection and try again.</Notice>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" required error={err.name}><Input value={f.name} invalid={!!err.name} autoComplete="name" onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Business name"><Input value={f.biz} autoComplete="organization" onChange={(e) => set('biz', e.target.value)} /></Field>
            <Field label="Email" required error={err.email}><Input type="email" value={f.email} invalid={!!err.email} autoComplete="email" onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone" required error={err.phone}><Input type="tel" value={f.phone} invalid={!!err.phone} autoComplete="tel" onChange={(e) => set('phone', e.target.value)} /></Field>
          </div>
          <Field label="Product" required><Select value={pid} onChange={(e) => setPid(e.target.value)}>{PRODUCTS.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.sku})</option>)}</Select></Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <div><span className="mb-1.5 block text-[13px] font-semibold">Requested quantity</span><Qty value={qty} onChange={setQty} /></div>
            <Field label="Delivery city" required error={err.city}><Input value={f.city} invalid={!!err.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="State"><Input value={f.state} onChange={(e) => set('state', e.target.value)} /></Field>
          </div>
          <Field label="Project notes" hint="Sizes, placement, branding, deadlines, anything that helps us quote accurately."><Textarea rows={5} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold">Artwork <span className="font-normal text-ink-2">(optional)</span></span>
            <Uploader state={up.state} onFile={up.start} onRemove={up.remove} onRetry={up.retry} />
            {err.art && <p className="mt-1.5 text-xs font-medium text-bad">{err.art}</p>}
          </div>
          <div>
            <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 size-4 accent-[#E84B1A]" />I agree that DisplayDelight may contact me about this request using the details above.</label>
            {err.consent && <p className="mt-1.5 text-xs font-medium text-bad">{err.consent}</p>}
          </div>
          <Btn type="submit" size="lg" className="w-full sm:w-auto" loading={st === 'busy'}>Submit quote request</Btn>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <p className="border-b border-line bg-soft px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-2">Quote summary</p>
            <img src={p.img} alt={p.name} className="aspect-[4/3] w-full bg-[#f3f1ee] object-cover mix-blend-multiply" />
            <div className="space-y-3 p-5">
              <div><p className="text-[11px] font-semibold uppercase tracking-wider text-ink-2">{catName(p.cat)}</p><h2 className="text-2xl font-bold leading-tight">{p.name}</h2><p className="text-xs text-ink-2">SKU {p.sku}</p></div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-2">Selected options</p>
                {opts.length ? <div className="flex flex-wrap gap-1.5">{opts.map(([k, v]) => <Badge key={k} tone="neutral">{k}: {v}</Badge>)}</div> : <p className="text-sm text-ink-2">No options selected. Tell us your preferences in the notes.</p>}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-2">Customization</p>
                <p className="text-sm">{p.attrs.customizable === 'Yes' || p.kind === 'custom' ? 'Customizable. Add your artwork above.' : 'Standard product. Customization on request.'}</p>
              </div>
              <p className="text-sm">Quantity: <b>{qty}</b></p>
              <p className="rounded-dd bg-brand-soft p-3 text-xs text-ink-2">Pricing is shared by our team after review. No total is calculated here.</p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  )
}
