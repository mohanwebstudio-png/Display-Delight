import { useEffect, useState } from 'react'
import { Minus, Plus, RotateCcw, ShoppingCart, MessageSquareQuote, Info, Check } from 'lucide-react'
import { byId, catName, inr, ULTRA_SLIM_SIZE_META, CARD_STAND_SIZE_META, type Product } from '../data'
import { go, useApp } from '../store'
import { catalogueApi, normalizeProduct } from '../api'
import { Badge, Breadcrumbs, Btn, Container, EmptyState, Field, Input, Notice, Price, Qty, Segmented, Select, Textarea, Uploader, cx, useUpload } from '../ui'

const FONTS = [['Barlow Condensed', 'Condensed'], ['Inter', 'Clean sans'], ['Georgia', 'Classic serif'], ['Courier New', 'Mono']] as const
const COLORS = ['#FFFFFF', '#E84B1A', '#FFD166', '#1A1A2E', '#2E7D32', '#111111']
const TEMPLATES = [['None', ''], ['Open', 'OPEN'], ['Welcome', 'WELCOME'], ['Sale', 'OFFER']] as const

export default function Studio({ id }: { id: string }) {
  const { addToCart, toast, setQuoteDraft, products } = useApp()
  const inMemory = products.find((x) => x.id === id || (x as any).slug === id) || byId(id)
  const [p, setP] = useState<Product | undefined>(inMemory)
  const [customProfile, setCustomProfile] = useState<any>(null)
  const [loading, setLoading] = useState(!inMemory)

  const up = useUpload()
  const upBack = useUpload()
  const [text, setText] = useState('Your Brand')
  const [backText, setBackText] = useState('Your Brand')
  const [font, setFont] = useState<string>(FONTS[0][0])
  const [color, setColor] = useState('#FFFFFF')
  const [size, setSize] = useState(inMemory?.sizes[0] ?? '')
  const [orient, setOrient] = useState('Landscape')
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [zoom, setZoom] = useState(1)
  const [tpl, setTpl] = useState('None')
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState(1)
  const [logoScale, setLogoScale] = useState(50)
  const [dynVals, setDynVals] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    catalogueApi.getProduct(id)
      .then((raw) => {
        if (active && raw) {
          const norm = normalizeProduct(raw)
          setP(norm)
          if (!size && norm.sizes.length > 0) setSize(norm.sizes[0])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    catalogueApi.getCustomizationProfile(id)
      .then((prof) => {
        if (active && prof) {
          setCustomProfile(prof)
          const initialVals: Record<string, string> = {}
          if (Array.isArray(prof.fields)) {
            prof.fields.forEach((f: any) => {
              if (f.default_value) initialVals[f.key] = f.default_value
              else if (Array.isArray(f.allowed_values) && f.allowed_values.length > 0) initialVals[f.key] = f.allowed_values[0]
            })
          }
          setDynVals(initialVals)
        }
      })
      .catch(() => {})

    return () => { active = false }
  }, [id])

  if (!p && loading) {
    return (
      <Container className="py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-soft" />
          <div className="h-64 rounded bg-soft" />
        </div>
      </Container>
    )
  }

  if (!p) return <Container className="py-16"><EmptyState title="Product not found" action={<Btn to="/shop">Browse products</Btn>} /></Container>

  const reset = () => {
    setText('Your Brand')
    setBackText('Your Brand')
    setFont(FONTS[0][0])
    setColor('#FFFFFF')
    setOrient('Landscape')
    setTpl('None')
    setNotes('')
    setLogoScale(50)
    setDynVals({})
    up.remove()
    upBack.remove()
  }

  const tplText = TEMPLATES.find((t) => t[0] === tpl)?.[1]
  const dynFields: any[] = customProfile?.fields || []

  const isUltraSlim = p.sku === 'DD-USL-01' || p.id === 'premium-ultra-slim-signage' || p.cat === 'premium-ultra-slim'
  const isCardStand = p.sku === 'DD-TCS-01' || p.id === 't-shaped-card-stand' || p.slug === 't-shaped-card-stand' || p.cat === 'card-stands'

  const matchedVariant = p.variants?.find((v) => {
    if (!size) return false
    const sLower = size.trim().toLowerCase().replace('×', 'x')
    const vName = v.name.toLowerCase().replace('×', 'x')
    const vSku = v.sku.toLowerCase()
    if (vName === sLower || vSku === sLower) return true
    if (vName.startsWith(sLower) || sLower.startsWith(vName.split(/[\s(]/)[0])) return true

    const m = vName.match(/\(([^)]+)\)/)
    if (m) {
      const paren = m[1].toLowerCase().replace('×', 'x').trim()
      if (paren === sLower || paren.startsWith(sLower) || sLower.startsWith(paren.split(/[\s(]/)[0])) return true
    }

    if ((sLower === 'bo' || sLower === 'b0') && (vSku.includes('bo') || vSku.includes('b0') || vName.includes('bo') || vName.includes('b0'))) {
      return true
    }
    if (isCardStand) {
      if (sLower.includes('55') && (vSku.includes('6276') || vName.includes('55') || vName.includes('6276'))) return true
      if (sLower.includes('a7') && (vSku.includes('6277') || vName.includes('a7') || vName.includes('6277'))) return true
      if (sLower.includes('a6') && (vSku.includes('6278') || vName.includes('a6') || vName.includes('6278'))) return true
      if (sLower.includes('a5') && (vSku.includes('6279') || vName.includes('a5') || vName.includes('6279'))) return true
      if (sLower.includes('a4') && (vSku.includes('6280') || vName.includes('a4') || vName.includes('6280'))) return true
    }
    return false
  })

  // Calculate dynamic add-on price from custom profile
  const addOns = dynFields.reduce((sum: number, f: any) => {
    const val = dynVals[f.key]
    if (!val) return sum
    // Don't duplicate size if size field exists in profile
    if (f.key.toLowerCase() === 'size') return sum
    if (f.affects_price && f.price_delta_paise) {
      return sum + Math.round(f.price_delta_paise / 100)
    }
    return sum
  }, 0)

  // Dynamic base price based on selected size / variant — PRIORITIZES LIVE DATABASE VARIANTS
  const sizePrice = (() => {
    if (p.price == null) return null
    if (matchedVariant?.price_delta_paise != null) {
      return p.price + Math.round(matchedVariant.price_delta_paise / 100)
    }
    if (isUltraSlim && size) {
      const sKey = size.trim().toUpperCase()
      const meta = ULTRA_SLIM_SIZE_META[sKey] || ULTRA_SLIM_SIZE_META[sKey.slice(0, 2)]
      if (meta) return meta.price
    }
    if (isCardStand && size) {
      const sKey = size.trim()
      const meta = CARD_STAND_SIZE_META[sKey] || CARD_STAND_SIZE_META[sKey.replace('×', 'x')] || CARD_STAND_SIZE_META[sKey.toUpperCase()]
      if (meta) return meta.price
    }
    return p.price
  })()

  const effectivePrice = sizePrice != null ? sizePrice + addOns : null

  const isFieldVisible = (f: any) => {
    if (!f.visibility_rule) return true
    try {
      const rule = typeof f.visibility_rule === 'string' ? JSON.parse(f.visibility_rule) : f.visibility_rule
      if (rule.field && rule.value !== undefined) {
        return (dynVals[rule.field] ?? '') === rule.value
      }
      if (rule.depends_on && rule.value !== undefined) {
        return (dynVals[rule.depends_on] ?? '') === rule.value
      }
    } catch {
      return true
    }
    return true
  }

  const options: Record<string, string> = {
    Size: size,
    Orientation: orient,
    Text: text,
    Font: font,
    'Text colour': color,
    ...(tplText ? { Template: tpl } : {}),
    ...(notes ? { Notes: notes } : {}),
    ...dynVals,
  }

  const ready = up.state.status !== 'uploading' && upBack.state.status !== 'uploading'
  const art = up.state.status === 'done' ? up.state.url : undefined
  const backArt = upBack.state.status === 'done' ? upBack.state.url : undefined
  const artName = up.state.status === 'done' ? up.state.name : ''
  const backArtName = upBack.state.status === 'done' ? upBack.state.name : ''

  return (
    <div>
      <Container className="py-5">
        <Breadcrumbs items={[
          { label: 'Home', to: '/' },
          { label: catName(p.cat), to: `/category/${p.cat}` },
          { label: p.name, to: `/product/${p.slug || p.id}` },
          { label: 'Customize' }
        ]} />
      </Container>
      <Container className="grid gap-8 pb-16 lg:grid-cols-[1fr_420px]">
        {/* canvas visualizer */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Segmented value={side} onChange={setSide} options={[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }]} />
              {customProfile?.supports_back && (
                <Badge tone="ok">Dual-Sided Mode</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-dd border border-line p-0.5">
              <button aria-label="Zoom out" onClick={() => setZoom(Math.max(0.6, zoom - 0.2))} className="grid size-9 place-items-center rounded-md hover:bg-soft"><Minus className="size-4" /></button>
              <span className="w-12 text-center text-sm font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
              <button aria-label="Zoom in" onClick={() => setZoom(Math.min(1.8, zoom + 0.2))} className="grid size-9 place-items-center rounded-md hover:bg-soft"><Plus className="size-4" /></button>
            </div>
          </div>
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-navy bg-[radial-gradient(circle_at_50%_40%,#2c2c4d,#1A1A2E_70%)]">
            <div className="relative transition-transform duration-300" style={{ transform: `scale(${zoom})`, width: orient === 'Landscape' ? '64%' : '42%', aspectRatio: orient === 'Landscape' ? '4/3' : '3/4' }}>
              <img src={p.img} alt={p.name} className="size-full rounded-lg object-cover shadow-pop" />
              <div className="absolute inset-[14%] flex flex-col items-center justify-center gap-2 overflow-hidden rounded bg-navy/55 p-2 text-center backdrop-blur-[1px]">
                {side === 'front' ? (
                  <>
                    {art && <img src={art} alt="Uploaded artwork preview" className="object-contain" style={{ maxHeight: `${logoScale}%`, maxWidth: '80%' }} />}
                    <p className="max-w-full break-words leading-none" style={{ fontFamily: `'${font}', sans-serif`, color, fontSize: 'clamp(16px, 3.2vw, 40px)', fontWeight: 700, textTransform: font === 'Barlow Condensed' ? 'uppercase' : 'none' }}>{tplText ? `${tplText} · ${text}` : text}</p>
                  </>
                ) : (
                  <>
                    {backArt && <img src={backArt} alt="Back artwork preview" className="object-contain" style={{ maxHeight: `${logoScale}%`, maxWidth: '80%' }} />}
                    <p className="max-w-full break-words leading-none" style={{ fontFamily: `'${font}', sans-serif`, color, fontSize: 'clamp(16px, 3.2vw, 40px)', fontWeight: 700, textTransform: font === 'Barlow Condensed' ? 'uppercase' : 'none' }}>
                      {customProfile?.supports_back ? backText : `${tplText ? `${tplText} · ` : ''}${text}`}
                    </p>
                    {!customProfile?.supports_back && (
                      <span className="mt-1 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white/80">Reverse view (same artwork unless dual-sided configured)</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <span className="absolute bottom-3 left-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{size} · {orient} · {side.toUpperCase()}</span>
          </div>
          <p className="mt-3 flex items-start gap-2 text-sm text-ink-2"><Info className="mt-0.5 size-4 shrink-0" />Preview is illustrative; final print colours and manufacturing results may vary.</p>
        </div>

        {/* customization controls */}
        <div className="space-y-5 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">3D Customization studio</span>
              {customProfile && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-hover">{customProfile.name}</span>}
              {customProfile?.supports_back && <Badge tone="navy">Dual-Sided</Badge>}
            </div>
            <h1 className="mt-1 text-3xl font-bold leading-tight">{p.name}</h1>
          </div>

          {/* Dynamic Profile Fields */}
          {dynFields.length > 0 && (
            <div className="space-y-4 rounded-xl border border-brand/20 bg-brand-soft/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-2">Profile Specifications</p>
              {dynFields.filter(isFieldVisible).map((f: any) => {
                const cur = dynVals[f.key] ?? f.default_value ?? ''
                const setVal = (val: string) => setDynVals({ ...dynVals, [f.key]: val })
                const opts = Array.isArray(f.allowed_values) ? f.allowed_values : []

                if (f.field_type === 'dropdown' || f.field_type === 'select') {
                  return (
                    <Field key={f.key} label={f.label} required={f.is_required} hint={f.affects_price && f.price_delta_paise ? `+₹${(f.price_delta_paise / 100).toLocaleString('en-IN')}` : undefined}>
                      <Select value={cur} onChange={(e) => setVal(e.target.value)}>
                        <option value="">Choose {f.label}…</option>
                        {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </Field>
                  )
                }

                if (f.field_type === 'radio') {
                  return (
                    <Field key={f.key} label={f.label} required={f.is_required}>
                      <div className="flex flex-wrap gap-2">
                        {opts.map((o: string) => (
                          <button key={o} type="button" onClick={() => setVal(o)} className={cx('rounded-dd border px-3 py-1.5 text-xs font-semibold transition', cur === o ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line hover:border-ink')}>
                            {o}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )
                }

                if (f.field_type === 'text') {
                  return (
                    <Field key={f.key} label={f.label} required={f.is_required}>
                      <Input value={cur} onChange={(e) => setVal(e.target.value)} placeholder={`Enter ${f.label.toLowerCase()}`} />
                    </Field>
                  )
                }

                return null
              })}
            </div>
          )}

          {/* Standard Visual Customizer Controls */}
          <Field label="Front display text"><Input value={text} maxLength={40} onChange={(e) => setText(e.target.value)} /></Field>

          {/* Back Side Controls when dual-sided */}
          {customProfile?.supports_back && (
            <div className="rounded-xl border border-brand/20 bg-brand-soft/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand">Reverse Side Configuration</span>
                <Badge tone="ok">Dual-Sided Supported</Badge>
              </div>
              <Field label="Back display text">
                <Input value={backText} maxLength={40} onChange={(e) => setBackText(e.target.value)} placeholder="Text for reverse side" />
              </Field>
              <Field label="Back artwork / logo" hint="Separate graphic file for reverse side">
                <Uploader state={upBack.state} onFile={(f) => upBack.start(f)} onRemove={upBack.remove} onRetry={upBack.retry} />
              </Field>
            </div>
          )}

          <Field label="Font style">
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(([f, l]) => (
                <button key={f} aria-pressed={font === f} onClick={() => setFont(f)} className={cx('rounded-dd border px-3 py-2 text-left transition', font === f ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink')}>
                  <span className="block text-lg leading-tight" style={{ fontFamily: `'${f}', sans-serif` }}>Aa Brand</span>
                  <span className="text-[11px] text-ink-2">{l}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Illumination / text colour">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cx('size-9 rounded-full border-2 border-white shadow ring-2 transition', color === c ? 'ring-brand scale-110' : 'ring-line hover:scale-105')} style={{ background: c }} />
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size">
              <Select value={size} onChange={(e) => setSize(e.target.value)}>
                {p.sizes.map((s) => {
                  const meta = isUltraSlim ? (ULTRA_SLIM_SIZE_META[s] || ULTRA_SLIM_SIZE_META[s.slice(0, 2)]) : null
                  const label = meta ? `${s} (${meta.dim}) — ₹${meta.price.toLocaleString('en-IN')}` : s
                  return <option key={s} value={s}>{label}</option>
                })}
              </Select>
            </Field>
            <Field label="Template text"><Select value={tpl} onChange={(e) => setTpl(e.target.value)}>{TEMPLATES.map((t) => <option key={t[0]}>{t[0]}</option>)}</Select></Field>
          </div>
          <Field label="Orientation"><Segmented value={orient as 'Landscape'} onChange={setOrient} options={[{ value: 'Landscape', label: 'Landscape' }, { value: 'Portrait', label: 'Portrait' }]} /></Field>
          <Field label="Front artwork / logo" hint="PNG, JPG, SVG or PDF files supported.">
            <Uploader state={up.state} onFile={(f) => up.start(f)} onRemove={up.remove} onRetry={up.retry} />
          </Field>
          {art && <Field label="Logo scale"><input type="range" min={20} max={80} value={logoScale} onChange={(e) => setLogoScale(+e.target.value)} className="w-full accent-brand" aria-label="Logo size" /></Field>}
          <Field label="Notes for our engineering & design team"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Placement, pantone colour codes, installation requirements…" /></Field>

          {/* Pricing & Customization Summary */}
          <div className="rounded-xl border border-line bg-soft p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Customized Summary</span>
              {effectivePrice != null ? <span className="text-xl font-bold text-ink">{inr(effectivePrice)}</span> : <span className="text-sm font-semibold text-ink-2">Price on request</span>}
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              {[
                ['Size', size],
                ['Orientation', orient],
                ['Front Text', text || '—'],
                ...(customProfile?.supports_back ? [['Back Text', backText || '—']] : []),
                ['Front Artwork', art ? (up.state.status === 'done' ? up.state.name : '') : 'None'],
                ...(customProfile?.supports_back ? [['Back Artwork', backArt ? (upBack.state.status === 'done' ? upBack.state.name : '') : 'None']] : []),
                ...Object.entries(dynVals).map(([k, v]) => [k, v]),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-2 capitalize">{k.replace(/_/g, ' ')}</dt>
                  <dd className="truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {addOns > 0 && <p className="mt-2 text-xs font-semibold text-brand">Profile add-ons included: +₹{addOns.toLocaleString('en-IN')}</p>}
            <p className="mt-2 text-[11px] text-ink-2">Final quotation calculated by server pricing engine. GST added at checkout.</p>
          </div>

          {(!ready) && <Notice tone="info">Wait for artwork upload to finish before proceeding.</Notice>}
          <div className="flex items-center gap-3">
            <Qty value={qty} onChange={setQty} />
            {p.price != null
              ? <Btn size="lg" className="flex-1" disabled={!ready} icon={<ShoppingCart className="size-5" />} onClick={() => {
                  const finalOpts: Record<string, string> = {
                    ...options,
                    ...(art ? { 'Front Artwork': artName || 'Uploaded' } : {}),
                    ...(backArt ? { 'Back Artwork': backArtName || 'Uploaded' } : {}),
                    ...(customProfile?.supports_back && backText ? { 'Back Text': backText } : {}),
                  }
                  addToCart({
                    productId: p.id,
                    variantId: matchedVariant?.id,
                    price: effectivePrice ?? undefined,
                    qty,
                    options: finalOpts,
                    artwork: art || backArt,
                  })
                  toast('Customized configuration added to cart', 'ok')
                  go('/cart')
                }}>Add to cart</Btn>
              : <Btn size="lg" className="flex-1" disabled={!ready} icon={<MessageSquareQuote className="size-5" />} onClick={() => {
                  const finalOpts: Record<string, string> = {
                    ...options,
                    ...(art ? { 'Front Artwork': artName || 'Uploaded' } : {}),
                    ...(backArt ? { 'Back Artwork': backArtName || 'Uploaded' } : {}),
                    ...(customProfile?.supports_back && backText ? { 'Back Text': backText } : {}),
                  }
                  setQuoteDraft({ productId: p.id, options: finalOpts })
                  go(`/quote?product=${p.id}`)
                }}>Request a quote</Btn>}
          </div>
          <div className="flex gap-2">
            {p.price != null && <Btn variant="secondary" className="flex-1" icon={<MessageSquareQuote className="size-4" />} onClick={() => {
              const finalOpts: Record<string, string> = {
                ...options,
                ...(art ? { 'Front Artwork': artName || 'Uploaded' } : {}),
                ...(backArt ? { 'Back Artwork': backArtName || 'Uploaded' } : {}),
              }
              setQuoteDraft({ productId: p.id, options: finalOpts })
              go(`/quote?product=${p.id}`)
            }}>Request a quote</Btn>}
            <Btn variant="tertiary" icon={<RotateCcw className="size-4" />} onClick={reset}>Reset</Btn>
          </div>
        </div>
      </Container>
    </div>
  )
}

