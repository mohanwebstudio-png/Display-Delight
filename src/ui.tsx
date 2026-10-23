import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, Heart, Info, Loader2, Minus, Plus, RefreshCw, Scale, ShoppingCart, Trash2, UploadCloud, X, FileImage } from 'lucide-react'
import { Link, useApp } from './store'
import { inr, catName, type Product } from './data'
import { uploadApi } from './api'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- Container ---------- */
export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx('mx-auto w-full max-w-[1320px] px-3 sm:px-6 lg:px-8', className)}>{children}</div>
)

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'dark' | 'ghostLight'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  to?: string
  icon?: ReactNode
  iconRight?: boolean
  full?: boolean
}
export function Btn({ variant = 'primary', size = 'md', loading, to, icon, iconRight, full, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-hover active:scale-[.98] shadow-sm',
    secondary: 'bg-white text-ink border border-line hover:border-ink hover:bg-soft',
    tertiary: 'text-brand hover:bg-brand-soft',
    danger: 'bg-bad text-white hover:bg-[#a52020]',
    dark: 'bg-navy text-white hover:bg-navy-2',
    ghostLight: 'border border-white/40 text-white hover:bg-white/10',
  }[variant]
  const s = { sm: 'h-9 px-3 text-[13px]', md: 'h-11 px-5 text-sm', lg: 'h-13 px-7 text-[15px]' }[size]
  const cls = cx('inline-flex items-center justify-center gap-2 rounded-dd font-semibold transition disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap', v, s, full && 'w-full', className)
  const inner = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : !iconRight && icon}
      {children}
      {!loading && iconRight && icon}
    </>
  )
  if (to && !disabled) return <Link to={to} className={cls}>{inner}</Link>
  return <button className={cls} disabled={disabled || loading} {...rest}>{inner}</button>
}

/* ---------- Form controls ---------- */
export function Field({ label, hint, error, required, children, className }: { label?: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}{required && <span className="text-brand"> *</span>}</span>}
      {children}
      {error ? <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-bad"><AlertCircle className="size-3.5" />{error}</span>
        : hint ? <span className="mt-1.5 block text-xs text-ink-2">{hint}</span> : null}
    </label>
  )
}
const inputCls = (err?: boolean) => cx('w-full rounded-dd border bg-white px-3.5 text-sm text-ink placeholder:text-[#9a9a9a] transition focus:outline-none focus:ring-2 disabled:bg-soft disabled:text-ink-2', err ? 'border-bad focus:ring-bad/25' : 'border-line hover:border-[#bdbdbd] focus:border-brand focus:ring-brand/20')
export const Input = ({ invalid, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => <input className={cx(inputCls(invalid), 'h-11', className)} {...p} />
export const Textarea = ({ invalid, className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => <textarea className={cx(inputCls(invalid), 'py-2.5 min-h-24', className)} {...p} />
export const Select = ({ invalid, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) => (
  <div className="relative">
    <select className={cx(inputCls(invalid), 'h-11 appearance-none pr-9', className)} {...p}>{children}</select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2" />
  </div>
)

export function Check_({ checked, onChange, label, count, radio, disabled }: { checked: boolean; onChange: () => void; label: ReactNode; count?: number; radio?: boolean; disabled?: boolean }) {
  return (
    <label className={cx('group flex cursor-pointer items-center gap-2.5 rounded py-1.5 text-sm', disabled && 'opacity-50 pointer-events-none')}>
      <input type={radio ? 'radio' : 'checkbox'} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={cx('grid size-[18px] shrink-0 place-items-center border transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40', radio ? 'rounded-full' : 'rounded-[4px]', checked ? 'border-brand bg-brand' : 'border-[#bdbdbd] bg-white group-hover:border-ink')}>
        {checked && (radio ? <span className="size-1.5 rounded-full bg-white" /> : <Check className="size-3 text-white" strokeWidth={3} />)}
      </span>
      <span className={cx('flex-1', checked ? 'font-semibold text-ink' : 'text-ink')}>{label}</span>
      {count !== undefined && <span className="text-xs text-ink-2">{count}</span>}
    </label>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx('relative h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-brand' : 'bg-[#cfcfd6]')}>
      <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cx('inline-flex rounded-dd bg-soft p-1', className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cx('rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition', value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink')}>{o.label}</button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; badge?: number }[] }) {
  return (
    <div className="hide-scroll flex gap-6 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={cx('-mb-px flex shrink-0 items-center gap-2 border-b-2 py-3 text-sm font-semibold transition', value === t.value ? 'border-brand text-ink' : 'border-transparent text-ink-2 hover:text-ink')}>
          {t.label}{t.badge !== undefined && <span className="rounded-full bg-soft px-1.5 text-[11px]">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

export function Accordion({ items, dark }: { items: readonly (readonly [string, ReactNode])[]; dark?: boolean }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className={cx('divide-y', dark ? 'divide-white/15' : 'divide-line')}>
      {items.map(([q, a], i) => (
        <div key={q}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 py-5 text-left">
            <span className="text-[17px] font-semibold">{q}</span>
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-full border transition', open === i ? 'border-brand bg-brand text-white' : 'border-line')}>
              {open === i ? <Minus className="size-4" /> : <Plus className="size-4" />}
            </span>
          </button>
          {open === i && <div className="anim-pop pb-5 pr-12 text-[15px] leading-relaxed text-ink-2">{a}</div>}
        </div>
      ))}
    </div>
  )
}

/* ---------- Feedback ---------- */
const tones = {
  ok: 'bg-[#e8f5e9] text-ok', warn: 'bg-[#fff3e0] text-[#b45f00]', bad: 'bg-[#fdecea] text-bad',
  info: 'bg-[#e8eefc] text-[#2447a8]', brand: 'bg-brand-soft text-brand-hover', neutral: 'bg-soft text-ink-2 border border-line', navy: 'bg-navy text-white',
}
export const Badge = ({ tone = 'neutral', children, dot, className }: { tone?: keyof typeof tones; children: ReactNode; dot?: boolean; className?: string }) => (
  <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
    {dot && <span className="size-1.5 rounded-full bg-current" />}{children}
  </span>
)
export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} />
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cx('animate-spin', className)} />

export function Notice({ tone = 'info', title, children, action }: { tone?: 'info' | 'ok' | 'warn' | 'bad'; title?: string; children?: ReactNode; action?: ReactNode }) {
  const c = { info: 'border-[#c5d3f5] bg-[#f3f6fe]', ok: 'border-[#b7dcb9] bg-[#f1f9f1]', warn: 'border-[#f5d49a] bg-[#fff8ec]', bad: 'border-[#f1b9b5] bg-[#fef4f3]' }[tone]
  const I = { info: Info, ok: CheckCircle2, warn: AlertCircle, bad: AlertCircle }[tone]
  const ic = { info: 'text-[#2447a8]', ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone]
  return (
    <div className={cx('flex gap-3 rounded-dd border p-3.5 text-sm', c)} role={tone === 'bad' ? 'alert' : 'status'}>
      <I className={cx('mt-0.5 size-4.5 shrink-0', ic)} />
      <div className="flex-1">{title && <p className="font-semibold">{title}</p>}{children && <div className="text-ink-2">{children}</div>}</div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-soft/60 px-6 py-16 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-white text-brand shadow-card">{icon}</div>
        <h3 className="text-2xl font-bold">{title}</h3>
        {text && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">{text}</p>}
        {action && <div className="mt-5 flex justify-center gap-3">{action}</div>}
      </div>
    </div>
  )
}
export const ErrorState = ({ title = 'Something went wrong', text = 'We could not load this. Check your connection and try again.', onRetry }: { title?: string; text?: string; onRetry?: () => void }) => (
  <EmptyState icon={<AlertCircle className="size-6 text-bad" />} title={title} text={text} action={onRetry && <Btn variant="secondary" icon={<RefreshCw className="size-4" />} onClick={onRetry}>Retry</Btn>} />
)

export function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="anim-pop pointer-events-auto flex items-center gap-2.5 rounded-dd bg-navy px-4 py-3 text-sm font-medium text-white shadow-pop">
          {t.tone === 'err' ? <AlertCircle className="size-4 text-[#ff8a80]" /> : t.tone === 'info' ? <Info className="size-4 text-[#9db4ff]" /> : <CheckCircle2 className="size-4 text-[#7ee08a]" />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ---------- Overlays ---------- */
export function Drawer({ open, onClose, title, side = 'right', children, footer, width = 'max-w-md' }: { open: boolean; onClose: () => void; title: string; side?: 'right' | 'left' | 'bottom'; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  const pos = side === 'bottom'
    ? 'inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl'
    : side === 'left'
    ? cx('left-0 inset-y-0 w-[88vw] sm:w-[380px]', width)
    : cx('right-0 inset-y-0 w-[94vw] sm:w-[420px]', width)
  const content = (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy/55 backdrop-blur-[1px]" style={{ animation: 'fadeIn .2s' }} onClick={onClose} />
      <div className={cx('absolute flex flex-col bg-white shadow-pop', pos)} style={{ animation: `${side === 'bottom' ? 'slideUp' : side === 'left' ? 'slideRight' : 'slideIn'} .25s ease-out` }}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-soft touch-manipulation"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto touch-scroll">{children}</div>
        {footer && <div className="border-t border-line bg-white p-4">{footer}</div>}
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  const content = (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy/60" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-lg rounded-xl bg-white shadow-pop">
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-soft"><X className="size-5" /></button>
        </div>
        <div className="px-6 py-4 text-sm text-ink-2">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

/* ---------- Commerce ---------- */
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-2">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.to ? <Link to={it.to} className="hover:text-brand hover:underline">{it.label}</Link> : <span className="font-medium text-ink">{it.label}</span>}
          {i < items.length - 1 && <ChevronRight className="size-3.5" />}
        </span>
      ))}
    </nav>
  )
}

export function Price({
  p,
  size = 'md',
  value,
  prefix = 'From',
  layout = 'auto',
}: {
  p?: Product | null
  size?: 'md' | 'lg'
  value?: number | null
  prefix?: string
  layout?: 'auto' | 'stacked' | 'inline'
}) {
  const displayVal = value !== undefined ? value : p?.price
  if (displayVal == null) return <span className="text-sm font-semibold text-ink-2">Price on request</span>

  const isStacked = layout === 'stacked' || (layout === 'auto' && size === 'md')

  if (isStacked) {
    return (
      <div className="flex flex-col justify-center min-w-0 leading-tight">
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          {prefix ? <span className="text-[11px] font-medium text-ink-2">{prefix}</span> : null}
          <span className={cx('font-bold tabular-nums text-ink', size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-base sm:text-[17px]')}>
            {inr(displayVal)}
          </span>
        </div>
        <span className="text-[10px] font-medium text-ink-2 whitespace-nowrap mt-0.5">
          + 18% GST
        </span>
      </div>
    )
  }

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      {prefix ? <span className="text-xs font-medium text-ink-2">{prefix}</span> : null}
      <span className={cx('font-bold tabular-nums text-ink', size === 'lg' ? 'text-3xl' : 'text-lg')}>{inr(displayVal)}</span>
      <span className="text-[11px] text-ink-2">+ GST</span>
    </span>
  )
}

export function Qty({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="inline-flex h-10 items-center rounded-dd border border-line bg-white">
      <button aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-10 place-items-center hover:bg-soft disabled:opacity-35"><Minus className="size-4" /></button>
      <input aria-label="Quantity" value={value} onChange={(e) => { const n = parseInt(e.target.value || '1', 10); if (!Number.isNaN(n)) onChange(Math.max(min, n)) }} className="h-full w-10 border-x border-line text-center text-sm font-semibold tabular-nums focus:outline-none" />
      <button aria-label="Increase" onClick={() => onChange(value + 1)} className="grid size-10 place-items-center hover:bg-soft"><Plus className="size-4" /></button>
    </div>
  )
}

export function ProductCard({ p, view = 'grid' }: { p: Product; view?: 'grid' | 'list' }) {
  const { wishlist, toggleWish, compare, toggleCompare, addToCart } = useApp()
  const w = wishlist.includes(p.id), c = compare.includes(p.id)
  const list = view === 'list'
  const primary = p.stock === 0 ? (
    <Btn size="sm" disabled variant="secondary" className="w-full sm:w-auto px-2 sm:px-3 text-[11px] sm:text-xs">Out of stock</Btn>
  ) : p.kind === 'standard' && p.price != null ? (
    <Btn size="sm" onClick={() => addToCart({ productId: p.id, qty: 1, options: { Size: p.sizes?.[0] || 'Standard' } })} icon={<ShoppingCart className="size-3 sm:size-3.5" />} className="w-full sm:w-auto px-2 sm:px-3 text-[11px] sm:text-xs">Add to cart</Btn>
  ) : p.kind === 'standard' && p.price == null ? (
    <Btn size="sm" to={`/quote?product=${p.slug || p.id}`} className="w-full sm:w-auto px-2 sm:px-3 text-[11px] sm:text-xs">Request quote</Btn>
  ) : (
    <Btn size="sm" to={`/product/${p.slug || p.id}`} iconRight icon={<ArrowRight className="size-3 sm:size-3.5" />} className="w-full sm:w-auto px-2 sm:px-3 text-[11px] sm:text-xs font-semibold">Configure</Btn>
  )
  return (
    <article className={cx('group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white transition hover:border-[#c9c9d1] hover:shadow-card', list && 'sm:flex-row')}>
      <Link to={`/product/${p.slug || p.id}`} className={cx('relative block overflow-hidden bg-[#f3f1ee]', list ? 'w-full sm:w-52 md:w-60 shrink-0 aspect-[16/10] sm:aspect-auto' : 'aspect-[4/3.4]')} aria-label={p.name}>
        <img src={p.img} alt={p.name} loading="lazy" className="size-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.04]" />
        {p.stock === 0 ? (
          <span className="absolute left-2 top-2 sm:left-3 sm:top-3"><Badge tone="bad" className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-0.5">Out of stock</Badge></span>
        ) : p.kind !== 'standard' ? (
          <span className="absolute left-2 top-2 sm:left-3 sm:top-3"><Badge tone={p.kind === 'custom' ? 'brand' : 'navy'} className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-0.5">{p.kind === 'custom' ? 'Custom' : 'Configurable'}</Badge></span>
        ) : null}
      </Link>
      <div className="absolute right-2 top-2 sm:right-3 sm:top-3 flex flex-col gap-1 sm:gap-2 z-10">
        <button aria-label="Save to wishlist" aria-pressed={w} onClick={() => toggleWish(p.id)} className={cx('grid size-7 sm:size-9 place-items-center rounded-full bg-white shadow transition hover:scale-105 active:scale-95 touch-manipulation', w ? 'text-brand' : 'text-ink-2')}><Heart className="size-3.5 sm:size-4" fill={w ? 'currentColor' : 'none'} /></button>
        <button aria-label="Add to compare" aria-pressed={c} onClick={() => toggleCompare(p.id)} className={cx('grid size-7 sm:size-9 place-items-center rounded-full bg-white shadow transition hover:scale-105 active:scale-95 touch-manipulation', c ? 'text-brand' : 'text-ink-2')}><Scale className="size-3.5 sm:size-4" /></button>
      </div>
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-2 truncate">{catName(p.cat)}</p>
        <Link to={`/product/${p.slug || p.id}`} className="mt-1 line-clamp-2 min-h-[32px] sm:min-h-[44px] text-xs sm:text-[15px] font-semibold leading-snug hover:text-brand transition-colors" title={p.name}>{p.name}</Link>
        <p className="mt-0.5 text-[10px] sm:text-xs text-ink-2 font-mono truncate">{p.sku}</p>
        <p className="mt-2 hidden sm:line-clamp-2 min-h-[38px] text-[13px] text-ink-2 leading-relaxed">{p.blurb || 'Commercial-grade display engineered for showrooms and retail.'}</p>
        <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-ink min-h-[14px] sm:min-h-[18px] line-clamp-1">
          {p.sizes && p.sizes.length > 1
            ? `${p.sizes.length} sizes: ${p.sizes.slice(0, 3).join(', ')}${p.sizes.length > 3 ? '…' : ''}`
            : (p.sizes && p.sizes.length === 1 && p.sizes[0])
            ? p.sizes[0]
            : ''}
        </p>
        <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3 border-t border-line/60">
          <div className="min-w-0 shrink-0"><Price p={p} layout="stacked" /></div>
          <div className="w-full sm:w-auto shrink-0">{primary}</div>
        </div>
      </div>
    </article>
  )
}

export const CategoryTag = ({ id }: { id: string }) => <span>{catName(id)}</span>

/* ---------- Artwork uploader (visual states only; no real storage) ---------- */
export type UploadState = { status: 'idle' } | { status: 'uploading'; progress: number; name: string } | { status: 'done'; name: string; url: string; size: string } | { status: 'error'; name: string; message: string }
export function Uploader({ state, onFile, onRemove, onRetry, formats = 'PNG, JPG, SVG, PDF', maxSize = 'Max size set per product' }: { state: UploadState; onFile: (f: File) => void; onRemove: () => void; onRetry?: () => void; formats?: string; maxSize?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  if (state.status === 'idle')
    return (
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); e.dataTransfer.files[0] && onFile(e.dataTransfer.files[0]) }}
        className={cx('rounded-xl border-2 border-dashed p-6 text-center transition', drag ? 'border-brand bg-brand-soft' : 'border-line bg-soft/50 hover:border-brand/50')}>
        <UploadCloud className="mx-auto size-8 text-brand" />
        <p className="mt-2 text-sm font-semibold">Drag your logo or artwork here</p>
        <p className="text-xs text-ink-2">or</p>
        <Btn size="sm" variant="secondary" className="mt-1.5" onClick={() => ref.current?.click()}>Browse files</Btn>
        <p className="mt-3 text-[11px] text-ink-2">Accepted: {formats} · {maxSize}</p>
        <input ref={ref} type="file" accept="image/*,.pdf" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
    )
  return (
    <div className={cx('flex items-center gap-3 rounded-xl border p-3', state.status === 'error' ? 'border-bad/40 bg-[#fef4f3]' : 'border-line bg-white')}>
      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-soft">
        {state.status === 'done' ? <img src={state.url} alt="Uploaded artwork" className="size-full object-contain" /> : state.status === 'error' ? <AlertCircle className="size-6 text-bad" /> : <FileImage className="size-6 text-ink-2" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{state.name}</p>
        {state.status === 'uploading' && <><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand transition-all" style={{ width: state.progress + '%' }} /></div><p className="mt-1 text-xs text-ink-2">Uploading… {state.progress}%</p></>}
        {state.status === 'done' && <p className="flex items-center gap-1 text-xs text-ok"><CheckCircle2 className="size-3.5" />Uploaded · {state.size}</p>}
        {state.status === 'error' && <p className="text-xs text-bad">{state.message}</p>}
      </div>
      <div className="flex gap-1">
        {state.status === 'error' && onRetry && <Btn size="sm" variant="secondary" onClick={onRetry}>Retry</Btn>}
        {state.status === 'done' && <Btn size="sm" variant="tertiary" onClick={() => ref.current?.click()}>Replace</Btn>}
        <button aria-label="Remove file" onClick={onRemove} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-soft hover:text-bad"><Trash2 className="size-4" /></button>
      </div>
      <input ref={ref} type="file" accept="image/*,.pdf" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  )
}
/* hook that performs artwork upload to the backend service */
export function useUpload() {
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const last = useRef<File | null>(null)
  const start = async (f: File, forceFail = false) => {
    last.current = f
    if (f.size > 8 * 1024 * 1024 || forceFail) {
      setState({ status: 'error', name: f.name, message: 'File is larger than this product allows. Choose a smaller file.' })
      return
    }
    setState({ status: 'uploading', progress: 35, name: f.name })
    try {
      const res = await uploadApi.uploadArtwork(f)
      setState({ status: 'done', name: f.name, url: res.url || URL.createObjectURL(f), size: (f.size / 1024).toFixed(0) + ' KB' })
    } catch {
      // Offline fallback: create local object URL
      const url = URL.createObjectURL(f)
      setState({ status: 'done', name: f.name, url, size: (f.size / 1024).toFixed(0) + ' KB' })
    }
  }
  return { state, start, remove: () => setState({ status: 'idle' }), retry: () => last.current && start(last.current), setState }
}

export function SectionHead({ eyebrow, title, action, light }: { eyebrow?: string; title: string; action?: ReactNode; light?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className={cx('mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em]', light ? 'text-[#ff8a5c]' : 'text-brand')}><span className="h-0.5 w-6 bg-current" />{eyebrow}</p>}
        <h2 className={cx('section-heading font-bold font-display', light && 'text-white')}>{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ---------- Star Rating ---------- */
export function StarRating({ value, max = 5, size = 'md', onChange }: { value: number; max?: number; size?: 'sm' | 'md' | 'lg'; onChange?: (v: number) => void }) {
  const [hov, setHov] = useState(-1)
  const sz = { sm: 'size-3.5', md: 'size-5', lg: 'size-6' }[size]
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = (hov >= 0 ? hov : value - 1) >= i
        return onChange ? (
          <button key={i} type="button" aria-label={`Rate ${i + 1}`}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}
            onClick={() => onChange(i + 1)}
            className={cx('transition-transform hover:scale-110', filled ? 'star-filled' : 'star-empty')}
          >
            <svg className={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </button>
        ) : (
          <span key={i} className={filled ? 'star-filled' : 'star-empty'}>
            <svg className={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </span>
        )
      })}
    </div>
  )
}

/* ---------- Review Card ---------- */
export function ReviewCard({ review }: { review: { id: string | number; author_name: string; rating: number; title?: string; body?: string; text?: string; created_at?: string; verified?: boolean; company?: string } }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand font-bold text-sm">
            {review.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-ink">{review.author_name}</p>
            {review.company && <p className="text-xs text-ink-2">{review.company}</p>}
          </div>
        </div>
        {review.verified && <Badge tone="ok">Verified Purchase</Badge>}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <StarRating value={review.rating} size="sm" />
        {review.title && <span className="text-sm font-semibold text-ink">{review.title}</span>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-2 italic">"{review.body || review.text}"</p>
      {review.created_at && (
        <p className="mt-3 text-xs text-ink-2">{new Date(review.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
      )}
    </div>
  )
}

/* ---------- Order Status Timeline ---------- */
export function OrderTimeline({ steps }: { steps: { label: string; desc?: string; done: boolean; active?: boolean; time?: string }[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className={cx('grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold', s.done ? 'border-ok bg-ok text-white' : s.active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink-2')}>
              {s.done ? <Check className="size-4" /> : i + 1}
            </span>
            {i < steps.length - 1 && <span className={cx('mt-0.5 w-0.5 flex-1', s.done ? 'bg-ok' : 'bg-line')} style={{ minHeight: '32px' }} />}
          </div>
          <div className="pb-6 pt-1">
            <p className={cx('font-semibold', s.done ? 'text-ok' : s.active ? 'text-brand' : 'text-ink-2')}>{s.label}</p>
            {s.desc && <p className="text-sm text-ink-2">{s.desc}</p>}
            {s.time && <p className="text-xs text-ink-2 mt-0.5">{s.time}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Step Indicator (Checkout Progress) ---------- */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Checkout steps" className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-2">
            <span className={cx('grid size-7 place-items-center rounded-full text-xs font-bold transition', i < current ? 'bg-ok text-white' : i === current ? 'bg-brand text-white' : 'bg-soft text-ink-2 border border-line')}>
              {i < current ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('hidden sm:block text-xs font-semibold', i === current ? 'text-ink' : i < current ? 'text-ok' : 'text-ink-2')}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={cx('h-0.5 w-8 sm:w-16 mx-2', i < current ? 'bg-ok' : 'bg-line')} />}
        </div>
      ))}
    </nav>
  )
}

/* ---------- Compare Bar (sticky) ---------- */
export function CompareBar() {
  const { compare, toggleCompare, products } = useApp()
  const compareProds = compare.map(id => products.find(p => p.id === id || (p as any).slug === id)).filter(Boolean) as Product[]
  if (compareProds.length < 2) return null
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-navy text-white py-3 px-4 shadow-pop anim-fade-up">
      <div className="mx-auto flex max-w-[1320px] items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-white/80 shrink-0">Compare ({compareProds.length}):</span>
        <div className="flex flex-1 gap-3 flex-wrap">
          {compareProds.map(p => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <img src={p.img} alt="" className="size-8 rounded object-cover" />
              <span className="text-sm font-medium truncate max-w-[100px]">{p.name}</span>
              <button onClick={() => toggleCompare(p.id)} aria-label={`Remove ${p.name} from compare`} className="text-white/60 hover:text-white"><X className="size-3.5" /></button>
            </div>
          ))}
        </div>
        <Link to="/compare" className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-hover">Compare now</Link>
      </div>
    </div>
  )
}

/* ---------- Spec Table ---------- */
export function SpecTable({ specs }: { specs: [string, string][] }) {
  if (!specs.length) return null
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <tbody>
          {specs.map(([k, v], i) => (
            <tr key={k} className={i % 2 === 0 ? 'bg-white' : 'bg-soft/60'}>
              <td className="w-2/5 px-4 py-2.5 font-semibold text-ink">{k}</td>
              <td className="px-4 py-2.5 text-ink-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Instagram Icon ---------- */
export function InstagramIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  )
}


