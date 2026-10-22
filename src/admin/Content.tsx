import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Bold, Eye, EyeOff, Film, GripVertical, Image as ImgIcon, Indent, Italic, LayoutGrid, Link2, List, ListOrdered, Lock, Maximize2, Minimize2, Play, Plus, RefreshCw, Rocket, Save, Search, Trash2, Upload, X, Outdent, ShieldCheck, Check, ExternalLink, Video, SlidersHorizontal } from 'lucide-react'
import { Badge, Btn, Check_, Drawer, EmptyState, Field, Input, Modal, Notice, Segmented, Select, StarRating, Switch, Tabs, Textarea, Uploader, useUpload, cx, InstagramIcon } from '../ui'
import { go, useApp } from '../store'
import { CATS, FAQS, INDUSTRIES, PRODUCTS, byId, catName } from '../data'
import { AdminPage, Card, SampleNote, SaveBar, StatusBadge, Table, Td, Toolbar, Tr } from './kit'
import { adminApi } from '../api'
import Home from '../pages/Home'

/* ---------- shared helpers ---------- */
const IMGS = ['hero', 'a-card', 'a-standee', 'backlit', 'card-stand', 'clipon', 'fabric', 'frames', 'gazebo', 'hologram', 'i-standee', 'l-led', 'led-blockout', 'lightbox-rect', 'lightbox-round', 'multi', 'projector', 'rollup', 't-led', 'tabletop-standee', 'tripod', 'ultraslim', 'umbrella'].map((n) => `/p/${n}.jpg`)
const SITE_PAGES = [['/', 'Home'], ['/shop', 'All products'], ['/quote', 'Request a quote'], ['/about', 'About us'], ['/contact', 'Contact'], ['/gallery', 'Gallery'], ['/track', 'Track order'], ['/policy/shipping', 'Shipping policy'], ['/policy/returns', 'Returns policy'], ['/policy/warranty', 'Warranty policy'], ['/policy/privacy', 'Privacy policy'], ['/policy/terms', 'Terms and conditions']]
const mv = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b }
const PageSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <Select value={value} onChange={(e) => onChange(e.target.value)}>{SITE_PAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
const Mover = ({ i, n, onMove, extra }: { i: number; n: number; onMove: (d: number) => void; extra?: ReactNode }) => (
  <span className="inline-flex items-center gap-0.5">
    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)} className="grid size-7 place-items-center rounded hover:bg-soft disabled:opacity-30"><ArrowUp className="size-4" /></button>
    <button type="button" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)} className="grid size-7 place-items-center rounded hover:bg-soft disabled:opacity-30"><ArrowDown className="size-4" /></button>
    {extra}
  </span>
)
function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (src: string) => void }) {
  const [mediaList, setMediaList] = useState<string[]>(IMGS)

  useEffect(() => {
    if (open) {
      adminApi.getMediaList('images').then((res) => {
        if (res && res.length > 0) {
          const urls = res.map((x: any) => x.src).filter(Boolean)
          const merged = [...urls, ...IMGS.filter((i) => !urls.includes(i))]
          setMediaList(merged)
        }
      }).catch(() => {})
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Choose media">
      <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        {mediaList.map((s) => (
          <button key={s} onClick={() => { onPick(s); onClose() }} className="group relative aspect-square overflow-hidden rounded-dd border border-line bg-soft">
            <img src={s} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
function ImgField({ value, onChange, label = 'Image' }: { value: string; onChange: (s: string) => void; label?: string }) {
  const [o, setO] = useState(false)
  return (
    <Field label={label}><div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="size-16 rounded-lg border border-line object-cover" /> : <span className="grid size-16 place-items-center rounded-lg border border-dashed border-line text-ink-2"><ImgIcon className="size-5" /></span>}
      <Btn type="button" size="sm" variant="secondary" onClick={() => setO(true)}>{value ? 'Change' : 'Choose from media'}</Btn>
      <MediaPicker open={o} onClose={() => setO(false)} onPick={onChange} />
    </div></Field>
  )
}
const Pub = ({ s }: { s: string }) => <StatusBadge s={s} />

/* ======================= Homepage editor ======================= */
const SECS = [['announce', 'Announcement bar'], ['header', 'Header'], ['hero', 'Hero'], ['cats', 'Category showcase'], ['featured', 'Featured products for sale'], ['reels', 'Commercial display reels'], ['intro', 'Company intro'], ['industries', 'Industries'], ['logos', 'Client logos'], ['video', 'Video showcase'], ['benefits', 'Benefits'], ['gallery', 'Gallery highlights'], ['tf', 'Testimonials & FAQ'], ['contact', 'Contact CTA'], ['footer', 'Footer']] as const
const INIT = {
  announce: { text: '', link: '/shop' },
  header: { search: true, cart: true, account: true },
  hero: { headline: 'Light Up. Stand Out. Sell More!', sub: 'Digital standees, LED light boxes and custom signage for your business.', img: '/p/hero.jpg', video: '', c1: 'Shop products', c1to: '/shop', c2: 'Request a quote', c2to: '/quote' },
  cats: {
    title: 'Shop by category',
    subtitle: 'Categories',
    items: CATS.map((c) => c.id) as string[],
  },
  featured: PRODUCTS.slice(0, 6).map((p) => p.id),
  reels: { title: 'Demonstration Reels', sub: 'Watch real unboxing, illuminated LED glow tests, and 4K digital standee software walkthroughs.' },
  intro: { title: 'Signage built around your brand', text: 'Describe your company, what you make and who you serve.', img: '/p/lightbox-round.jpg' },
  industries: INDUSTRIES.slice(0, 4).map((_, i) => i),
  video: { title: 'See it in action', url: '', poster: '/p/i-standee.jpg' },
  benefits: [{ t: 'Custom artwork', d: 'Upload your design and preview it before you order.' }, { t: 'Made to order', d: 'Sizes and finishes configured to your space.' }, { t: 'Quotes on request', d: 'Ask our team for a quotation on any product.' }],
  gallery: { title: 'From our gallery', count: '4' },
  tf: { faqs: [0, 1, 2] as number[] },
  contact: { title: 'Ready to light up your brand?', text: 'Tell us what you need and we will get back to you.', cta: 'Contact us', to: '/contact' },
}
type Cfg = typeof INIT

function DeviceIframe({
  width,
  height,
  className,
  children,
}: {
  width: number | string
  height: number | string
  className?: string
  children: ReactNode
}) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const setupIframe = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const head = doc.head
    head.innerHTML = `
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <base href="${window.location.origin}/" />
    `

    // Clone all stylesheets, font links, and inline style tags from parent document
    document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style').forEach((node) => {
      head.appendChild(node.cloneNode(true))
    })

    // Sync html and body styling
    if (doc.documentElement && document.documentElement) {
      doc.documentElement.className = document.documentElement.className
      doc.documentElement.setAttribute('lang', 'en')
    }

    doc.body.style.margin = '0'
    doc.body.style.padding = '0'
    doc.body.style.backgroundColor = '#ffffff'
    doc.body.style.color = '#111827'
    doc.body.style.fontFamily = 'Inter, Roboto, sans-serif'
    doc.body.style.overflowX = 'hidden'

    let root = doc.getElementById('preview-root')
    if (!root) {
      root = doc.createElement('div')
      root.id = 'preview-root'
      doc.body.appendChild(root)
    }

    setMountNode(root)
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    if (iframe.contentDocument?.readyState === 'complete') {
      setupIframe()
    } else {
      iframe.addEventListener('load', setupIframe)
      return () => iframe.removeEventListener('load', setupIframe)
    }
  }, [setupIframe])

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{
        width,
        height,
        border: 'none',
        display: 'block',
        backgroundColor: '#ffffff',
      }}
      title="Live Device Preview"
    >
      {mountNode ? createPortal(children, mountNode) : null}
    </iframe>
  )
}

function Preview({
  secs,
  c,
  sel,
  editOpen,
  onSel,
  onMoveSec,
  onToggleSec,
  mode = 'desktop',
}: {
  secs: { id: string; on: boolean; label?: string }[]
  c: Cfg
  sel?: string
  editOpen?: boolean
  onSel?: (id: string) => void
  onMoveSec?: (id: string, delta: number) => void
  onToggleSec?: (id: string, on: boolean) => void
  mode?: string
}) {
  const homeElement = (
    <Home
      previewProps={{
        secs,
        c,
        selectedSection: sel,
        editOpen,
        onSelectSection: onSel,
        onMoveSection: onMoveSec,
        onToggleSection: onToggleSec,
        mode,
      }}
    />
  )

  if (mode === 'mobile') {
    return (
      <div className="mx-auto my-3 flex justify-center transition-all duration-300">
        <div className="relative rounded-[46px] border-[10px] border-neutral-900 bg-neutral-900 p-2 shadow-2xl ring-1 ring-black/25 w-[414px] max-w-full">
          {/* Phone Speaker & Camera Notch */}
          <div className="absolute left-1/2 top-3.5 z-40 h-4.5 w-28 -translate-x-1/2 rounded-full bg-neutral-950 flex items-center justify-center gap-2">
            <span className="size-2 rounded-full bg-neutral-800" />
            <span className="h-1 w-7 rounded-full bg-neutral-800" />
          </div>
          <div className="overflow-hidden rounded-[36px] bg-white pt-5">
            <DeviceIframe width={390} height={760}>
              {homeElement}
            </DeviceIframe>
          </div>
          {/* Phone Bottom Home Bar */}
          <div className="mx-auto mt-2 h-1 w-28 rounded-full bg-neutral-700" />
        </div>
      </div>
    )
  }

  if (mode === 'tablet') {
    return (
      <div className="mx-auto my-3 flex justify-center transition-all duration-300 overflow-x-auto pb-4">
        <div className="relative rounded-[32px] border-[10px] border-neutral-800 bg-neutral-800 p-2 shadow-2xl ring-1 ring-black/25 shrink-0 w-[788px]">
          {/* Tablet Camera Dot */}
          <div className="absolute left-1/2 top-2 z-40 size-2.5 -translate-x-1/2 rounded-full bg-neutral-950" />
          <div className="overflow-hidden rounded-[24px] bg-white pt-3">
            <DeviceIframe width={768} height={820}>
              {homeElement}
            </DeviceIframe>
          </div>
        </div>
      </div>
    )
  }

  // Desktop mode: clean browser frame mockup
  return (
    <div className="mx-auto w-full transition-all duration-300 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
      {/* Browser Chrome Top Header */}
      <div className="flex items-center justify-between border-b border-line bg-neutral-100 px-4 py-2 select-none">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f56] border border-black/10" />
          <span className="size-3 rounded-full bg-[#ffbd2e] border border-black/10" />
          <span className="size-3 rounded-full bg-[#27c93f] border border-black/10" />
        </div>
        <div className="flex items-center gap-2 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-ink-2 shadow-xs border border-line/60 w-64 max-w-full justify-center">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate">https://displaydelight.com</span>
        </div>
        <div className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
          Desktop View
        </div>
      </div>
      <div className="max-h-[calc(100vh-230px)] overflow-y-auto bg-white">
        {homeElement}
      </div>
    </div>
  )
}

export function HomepageEditor(_: any) {
  const { toast, categories, products } = useApp()
  const [secs, setSecs] = useState(SECS.map(([id, label]) => ({ id: id as string, label: label as string, on: true })))
  const [c, setC] = useState<Cfg>(INIT)
  const [sel, setSel] = useState('hero')
  const [editOpen, setEditOpen] = useState(false)
  const [state, setState] = useState<'Draft' | 'Published'>('Published')
  const [changed, setChanged] = useState(false)
  const [tab, setTab] = useState('sections')
  const [pub, setPub] = useState(false)
  const [prev, setPrev] = useState(false)
  const [mode, setMode] = useState('desktop')
  const [focusCanvas, setFocusCanvas] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const openEdit = (id?: string) => {
    if (id) setSel(id)
    setEditOpen(true)
    setTab('edit')
    if (focusCanvas) setFocusCanvas(false)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setTab('sections')
  }

  const touch = () => setChanged(true)
  const set = <K extends keyof Cfg>(k: K, v: Partial<Cfg[K]> | Cfg[K]) => { setC((x) => ({ ...x, [k]: Array.isArray(v) ? v : { ...(x[k] as object), ...(v as object) } })); touch() }
  const setList = (k: 'cats' | 'featured' | 'industries', v: any[]) => {
    setC((x) => {
      if (k === 'cats') {
        const prevCats = typeof x.cats === 'object' && x.cats !== null ? x.cats : { title: 'Shop by category', subtitle: 'Categories', items: [] }
        return { ...x, cats: { ...prevCats, items: v } }
      }
      return { ...x, [k]: v }
    })
    touch()
  }
  const label = SECS.find((s) => s[0] === sel)?.[1] || sel
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const getCategoryLabel = (id: string | number) => {
    const fromStore = categories?.find((cat) => cat.id === id || cat.slug === id)
    if (fromStore) return fromStore.name
    const fromStatic = CATS.find((cat) => cat.id === id)
    if (fromStatic) return fromStatic.name
    return String(id)
  }

  const getProductLabel = (id: string | number) => {
    const fromStore = products?.find((p) => p.id === id || p.sku === id || p.slug === id)
    if (fromStore) return `${fromStore.name} (₹${(fromStore.price ?? 0).toLocaleString('en-IN')})`
    const fromStatic = PRODUCTS.find((p) => p.id === id)
    if (fromStatic) return `${fromStatic.name} (₹${(fromStatic.price ?? 0).toLocaleString('en-IN')})`
    return String(id)
  }

  const moveSec = (id: string, delta: number) => {
    setSecs((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      return mv(prev, idx, delta)
    })
    touch()
  }

  const toggleSec = (id: string, on: boolean) => {
    setSecs((prev) => prev.map((s) => (s.id === id ? { ...s, on } : s)))
    touch()
  }

  useEffect(() => {
    adminApi.getHomepageContent()
      .then((res) => {
        if (res?.c) {
          setC((prev) => ({
            ...prev,
            ...res.c,
            announce: { ...prev.announce, ...(res.c.announce || {}) },
            hero: { ...prev.hero, ...(res.c.hero || {}) },
            cats: (() => {
              if (res.c.cats && typeof res.c.cats === 'object' && !Array.isArray(res.c.cats)) {
                return {
                  title: res.c.cats.title || prev.cats.title,
                  subtitle: res.c.cats.subtitle || prev.cats.subtitle,
                  items: Array.isArray(res.c.cats.items) && res.c.cats.items.length > 0 ? res.c.cats.items : prev.cats.items,
                }
              }
              if (Array.isArray(res.c.cats) && res.c.cats.length > 0) {
                return {
                  ...prev.cats,
                  items: res.c.cats,
                }
              }
              return prev.cats
            })(),
            featured: Array.isArray(res.c.featured) && res.c.featured.length > 0 ? res.c.featured : prev.featured,
          }))
        }
        if (Array.isArray(res?.secs) && res.secs.length > 0) {
          const allKnownMap = new Map(SECS.map(([id, label]) => [id as string, label as string]))
          const orderedSecs: Array<{ id: string; label: string; on: boolean }> = []
          const seen = new Set<string>()

          res.secs.forEach((s: any) => {
            const sid = s.id || s.section_key
            if (sid && allKnownMap.has(sid)) {
              orderedSecs.push({
                id: sid,
                label: allKnownMap.get(sid)!,
                on: Boolean(s.on ?? s.is_visible ?? true),
              })
              seen.add(sid)
            }
          })

          SECS.forEach(([id, label]) => {
            if (!seen.has(id)) {
              orderedSecs.push({ id, label, on: true })
            }
          })

          setSecs(orderedSecs)
        }
      })
      .catch((err) => console.warn('Homepage content fetch:', err))
  }, [])

  const saveHomepage = async (published: boolean) => {
    try {
      await adminApi.updateHomepageContent({ secs, c })
      setState(published ? 'Published' : 'Draft')
      setChanged(false)
      if (published) setPub(false)
      toast(published ? 'Homepage configuration published to live storefront' : 'Draft saved to database', 'ok')
    } catch (err: any) {
      toast(err.message || 'Failed to save homepage', 'err')
    }
  }

  const picker = <T extends string | number>(
    k: 'cats' | 'featured' | 'industries',
    all: { v: T; l: string }[],
    max?: number,
    getFallbackLabel?: (v: T) => string
  ) => {
    const rawVal = c[k]
    const cur = (k === 'cats' && typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)
      ? (rawVal as any).items || []
      : Array.isArray(rawVal)
      ? rawVal
      : []) as T[]
    return (
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">
              Shown on homepage ({cur.length}{max ? ` / max ${max}` : ''})
            </p>
            {cur.length > 0 && (
              <span className="text-[11px] text-ink-2">Drag or use arrows to order</span>
            )}
          </div>
          {cur.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-ink-2">
              No items selected yet. Choose from available items below.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {cur.map((v, i) => {
                const labelText = all.find((a) => a.v === v)?.l || (getFallbackLabel ? getFallbackLabel(v) : String(v))
                return (
                  <li
                    key={String(v)}
                    className="flex items-center justify-between rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-xs"
                  >
                    <span className="truncate max-w-[210px] font-medium text-ink">{labelText}</span>
                    <Mover
                      i={i}
                      n={cur.length}
                      onMove={(d) => setList(k, mv(cur, i, d))}
                      extra={
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => setList(k, cur.filter((x) => x !== v))}
                          className="grid size-6 place-items-center rounded hover:bg-soft text-ink-2 hover:text-red-600 transition"
                        >
                          <X className="size-3.5" />
                        </button>
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">Available options</p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-line bg-soft/30 p-2 pr-1">
            {all.map((a) => {
              const isChecked = cur.includes(a.v)
              const isDisabled = !isChecked && !!max && cur.length >= max
              return (
                <Check_
                  key={String(a.v)}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => setList(k, toggleIn(cur, a.v))}
                  label={a.l}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }
  const link = (to: string, t: string) => <Notice tone="info">{t}<div className="mt-2"><Btn size="sm" variant="secondary" onClick={() => go(to)}>Open</Btn></div></Notice>

  const editor = (() => {
    switch (sel) {
      case 'announce': return <><Field label="Announcement text"><Input value={c.announce.text} onChange={(e) => set('announce', { text: e.target.value })} placeholder="Message shown above the header" /></Field><Field label="Links to"><PageSelect value={c.announce.link} onChange={(v) => set('announce', { link: v })} /></Field></>
      case 'header': return <>{(['search', 'cart', 'account'] as const).map((k) => <div key={k} className="flex items-center justify-between text-sm"><span className="capitalize">Show {k}</span><Switch on={c.header[k]} onChange={(v) => set('header', { [k]: v })} label={k} /></div>)}{link('/admin/navigation', 'Header menu items are managed in Navigation.')}</>
      case 'hero': return <>
        <Field label="Headline"><Input value={c.hero.headline} onChange={(e) => set('hero', { headline: e.target.value })} /></Field>
        <Field label="Supporting text"><Textarea value={c.hero.sub} onChange={(e) => set('hero', { sub: e.target.value })} /></Field>
        <ImgField label="Hero image" value={c.hero.img} onChange={(s) => set('hero', { img: s })} />
        <Field label="Video URL (optional)" hint="Used instead of the image when set."><Input value={c.hero.video} onChange={(e) => set('hero', { video: e.target.value })} placeholder="Paste a video link" /></Field>
        <div className="grid gap-3 rounded-dd border border-line p-3"><p className="text-xs font-bold uppercase tracking-wider text-ink-2">Primary button</p><Input value={c.hero.c1} onChange={(e) => set('hero', { c1: e.target.value })} aria-label="Primary label" /><PageSelect value={c.hero.c1to} onChange={(v) => set('hero', { c1to: v })} /></div>
        <div className="grid gap-3 rounded-dd border border-line p-3"><p className="text-xs font-bold uppercase tracking-wider text-ink-2">Secondary button</p><Input value={c.hero.c2} onChange={(e) => set('hero', { c2: e.target.value })} aria-label="Secondary label" /><PageSelect value={c.hero.c2to} onChange={(v) => set('hero', { c2to: v })} /></div></>
      case 'cats': {
        const catOptions = categories && categories.length > 0
          ? categories.map((cat) => ({ v: (cat.slug || cat.id) as string, l: cat.name }))
          : CATS.map((x) => ({ v: x.id as string, l: x.name }))

        const currentCats = typeof c.cats === 'object' && c.cats !== null ? c.cats : { title: 'Shop by category', subtitle: 'Categories', items: [] }

        return (
          <>
            <Field label="Section title">
              <Input
                value={currentCats.title}
                placeholder="Shop by category"
                onChange={(e) => {
                  set('cats', { ...currentCats, title: e.target.value })
                }}
              />
            </Field>
            <Field label="Eyebrow text">
              <Input
                value={currentCats.subtitle}
                placeholder="Categories"
                onChange={(e) => {
                  set('cats', { ...currentCats, subtitle: e.target.value })
                }}
              />
            </Field>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-2 mb-2">
                Categories Displayed on Homepage
              </p>
              {picker('cats', catOptions, undefined, getCategoryLabel)}
            </div>

            {link('/admin/taxonomy', 'Create new categories or change category photos, names & descriptions in Category Taxonomy.')}
          </>
        )
      }
      case 'featured': {
        const prodOptions = products && products.length > 0
          ? products.map((p) => ({ v: p.id, l: `${p.name} (₹${(p.price ?? 0).toLocaleString('en-IN')})` }))
          : PRODUCTS.map((p) => ({ v: p.id, l: p.name }))
        return picker('featured', prodOptions, 8, getProductLabel)
      }
      case 'reels': return <>
        <Field label="Section title"><Input value={c.reels?.title || 'Demonstration Reels'} onChange={(e) => set('reels', { title: e.target.value })} /></Field>
        <Field label="Supporting subtitle"><Textarea value={c.reels?.sub || ''} onChange={(e) => set('reels', { sub: e.target.value })} /></Field>
        {link('/admin/gallery', 'Upload and manage individual Instagram Reels and video demonstrations in Gallery & videos.')}
      </>
      case 'intro': return <><Field label="Heading"><Input value={c.intro.title} onChange={(e) => set('intro', { title: e.target.value })} /></Field><Field label="Text"><Textarea value={c.intro.text} onChange={(e) => set('intro', { text: e.target.value })} className="min-h-32" /></Field><ImgField value={c.intro.img} onChange={(s) => set('intro', { img: s })} /></>
      case 'industries': return picker('industries', INDUSTRIES.map((x, i) => ({ v: i, l: x[0] })), 8)
      case 'logos': return link('/admin/logos', 'Logos are verified and managed in Client logos. Empty slots stay hidden on the live site.')
      case 'video': return <><Field label="Heading"><Input value={c.video.title} onChange={(e) => set('video', { title: e.target.value })} /></Field><Field label="Video URL"><Input value={c.video.url} onChange={(e) => set('video', { url: e.target.value })} placeholder="Paste a video link" /></Field><ImgField label="Poster image" value={c.video.poster} onChange={(s) => set('video', { poster: s })} /></>
      case 'benefits': return <>{c.benefits.map((b, i) => <div key={i} className="space-y-2 rounded-dd border border-line p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-ink-2">Benefit {i + 1}</span><Mover i={i} n={c.benefits.length} onMove={(d) => set('benefits', mv(c.benefits, i, d))} extra={<button aria-label="Remove" onClick={() => set('benefits', c.benefits.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded hover:bg-soft"><Trash2 className="size-4" /></button>} /></div><Input value={b.t} placeholder="Title" onChange={(e) => set('benefits', c.benefits.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} /><Textarea value={b.d} placeholder="Description" className="min-h-16" onChange={(e) => set('benefits', c.benefits.map((x, j) => (j === i ? { ...x, d: e.target.value } : x)))} /></div>)}<Btn size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => set('benefits', [...c.benefits, { t: '', d: '' }])}>Add benefit</Btn></>
      case 'gallery': return <><Field label="Heading"><Input value={c.gallery.title} onChange={(e) => set('gallery', { title: e.target.value })} /></Field><Field label="Items shown"><Select value={c.gallery.count} onChange={(e) => set('gallery', { count: e.target.value })}>{['4', '6', '8'].map((n) => <option key={n}>{n}</option>)}</Select></Field>{link('/admin/gallery', 'Choose which items appear in Gallery & videos.')}</>
      case 'tf': return <><p className="text-[13px] font-semibold">FAQs to show</p>{FAQS.map((f, i) => <Check_ key={i} checked={c.tf.faqs.includes(i)} onChange={() => set('tf', { faqs: toggleIn(c.tf.faqs, i) })} label={f[0]} />)}{link('/admin/testimonials', 'Only approved testimonials with customer consent are shown. None are published yet.')}</>
      case 'contact': return <><Field label="Heading"><Input value={c.contact.title} onChange={(e) => set('contact', { title: e.target.value })} /></Field><Field label="Text"><Textarea value={c.contact.text} onChange={(e) => set('contact', { text: e.target.value })} /></Field><Field label="Button label"><Input value={c.contact.cta} onChange={(e) => set('contact', { cta: e.target.value })} /></Field><Field label="Button destination"><PageSelect value={c.contact.to} onChange={(v) => set('contact', { to: v })} /></Field></>
      default: return link('/admin/footer', 'Footer columns, policies and contact details are managed in Footer & policies.')
    }
  })()

  const Actions = (
    <>
      <Badge tone={state === 'Published' && !changed ? 'ok' : 'neutral'} dot>{state}</Badge>
      {changed && <Badge tone="warn">Unpublished changes</Badge>}
      <Btn
        size="sm"
        variant={editOpen ? 'dark' : 'secondary'}
        icon={<SlidersHorizontal className="size-4" />}
        onClick={() => (editOpen ? closeEdit() : openEdit(sel))}
      >
        {editOpen ? 'Hide Edit Panel' : `Edit Content (${label})`}
      </Btn>
      <Btn size="sm" variant="secondary" icon={<Eye className="size-4" />} onClick={() => setPrev(true)}>Preview</Btn>
      <Btn size="sm" variant="secondary" icon={<Save className="size-4" />} onClick={() => saveHomepage(false)}>Save draft</Btn>
      <Btn size="sm" icon={<Rocket className="size-4" />} onClick={() => setPub(true)}>Publish</Btn>
    </>
  )

  const list = (
    <Card
      pad={false}
      title="Section Hierarchy"
      desc="Drag or click arrows to reorder homepage layout"
    >
      <div className="p-2.5 border-b border-line bg-soft/60 flex items-center justify-between text-xs text-ink-2 font-medium">
        <span>{secs.filter((s) => s.on).length} active / {secs.length} total</span>
        <button
          type="button"
          onClick={() => {
            setSecs(SECS.map(([id, label]) => ({ id: id as string, label: label as string, on: true })))
            touch()
          }}
          className="text-brand hover:underline font-semibold"
        >
          Reset Default
        </button>
      </div>
      <ul className="max-h-[calc(100vh-300px)] divide-y divide-line overflow-y-auto p-1.5 space-y-1">
        {secs.map((s, i) => (
          <li
            key={s.id}
            draggable
            onDragStart={(e) => {
              setDragIdx(i)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', s.id)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (dragOverIdx !== i) setDragOverIdx(i)
            }}
            onDragLeave={() => {
              if (dragOverIdx === i) setDragOverIdx(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIdx !== null && dragIdx !== i) {
                setSecs((prev) => {
                  const copy = [...prev]
                  const [moved] = copy.splice(dragIdx, 1)
                  copy.splice(i, 0, moved)
                  return copy
                })
                touch()
              }
              setDragIdx(null)
              setDragOverIdx(null)
            }}
            onDragEnd={() => {
              setDragIdx(null)
              setDragOverIdx(null)
            }}
            className={cx(
              'group flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing select-none',
              editOpen && sel === s.id
                ? 'bg-brand/15 border-l-4 border-brand shadow-xs'
                : 'hover:bg-soft',
              dragOverIdx === i && 'border-t-2 border-brand bg-brand-soft/80 scale-[1.01]',
              dragIdx === i && 'opacity-35 scale-95',
              !s.on && 'opacity-50 bg-neutral-50/70'
            )}
          >
            <span className="grid size-5 place-items-center text-ink-2/50 group-hover:text-brand cursor-grab">
              <GripVertical className="size-3.5" />
            </span>
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-line/80 text-[10px] font-bold text-ink-2">
              {i + 1}
            </span>
            <button
              type="button"
              onClick={() => openEdit(s.id)}
              className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-ink hover:text-brand"
            >
              {s.label}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openEdit(s.id)
              }}
              title={`Edit ${s.label}`}
              className={cx(
                'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold transition shrink-0',
                editOpen && sel === s.id
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
              )}
            >
              <SlidersHorizontal className="size-3" />
              <span>{editOpen && sel === s.id ? 'Editing' : 'Edit'}</span>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                title="Move up"
                disabled={i === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  setSecs(mv(secs, i, -1))
                  touch()
                }}
                className="grid size-6 place-items-center rounded bg-line/40 hover:bg-line text-ink-2 hover:text-ink disabled:opacity-20 transition"
              >
                <ArrowUp className="size-3" />
              </button>
              <button
                type="button"
                title="Move down"
                disabled={i === secs.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  setSecs(mv(secs, i, 1))
                  touch()
                }}
                className="grid size-6 place-items-center rounded bg-line/40 hover:bg-line text-ink-2 hover:text-ink disabled:opacity-20 transition"
              >
                <ArrowDown className="size-3" />
              </button>
            </div>
            <Switch
              on={s.on}
              onChange={(v) => {
                setSecs(secs.map((x) => (x.id === s.id ? { ...x, on: v } : x)))
                touch()
              }}
              label={`Show ${s.label}`}
            />
          </li>
        ))}
      </ul>
    </Card>
  )

  const editPanelCard = (
    <div className="rounded-xl border border-line bg-white shadow-md overflow-hidden">
      {/* Edit Panel Header */}
      <div className="flex items-center justify-between border-b border-line bg-soft/70 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-7 place-items-center rounded-lg bg-brand/15 text-brand shrink-0">
            <SlidersHorizontal className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-ink truncate">{label}</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <p className="text-[11px] text-ink-2 truncate">Live preview updates automatically</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeEdit}
          title="Close edit panel"
          className="grid size-7 place-items-center rounded-lg hover:bg-line/60 text-ink-2 hover:text-ink transition"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Quick Section Switcher */}
      <div className="border-b border-line bg-white px-4 py-2.5 flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold text-ink-2 shrink-0">Section:</label>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="text-xs font-medium text-ink bg-soft/60 rounded-md border border-line px-2 py-1 w-full max-w-[220px] outline-none focus:border-brand"
        >
          {secs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} {!s.on ? '(Hidden)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-4 space-y-4">
        {editor}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-line bg-soft/50 p-3">
        <Btn size="sm" variant="secondary" onClick={closeEdit}>
          Close
        </Btn>
        <div className="flex items-center gap-2">
          <Btn size="sm" variant="secondary" icon={<Save className="size-3.5" />} onClick={() => saveHomepage(false)}>
            Save draft
          </Btn>
          <Btn size="sm" icon={<Rocket className="size-3.5" />} onClick={() => setPub(true)}>
            Publish
          </Btn>
        </div>
      </div>
    </div>
  )

  return (
    <AdminPage title="Homepage editor" desc="Arrange, edit and publish the sections of your storefront homepage." actions={Actions} wide>
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Synchronized CMS (Directly wired to Storefront Homepage)</span>
        </div>
      </div>
      <div className="mb-4 lg:hidden">
        <Tabs
          value={tab}
          onChange={(t) => {
            setTab(t)
            if (t === 'edit') setEditOpen(true)
            if (t === 'sections' || t === 'preview') setEditOpen(false)
          }}
          tabs={[
            { value: 'sections', label: 'Sections' },
            { value: 'preview', label: 'Preview' },
            { value: 'edit', label: editOpen ? `Editing: ${label}` : 'Edit' },
          ]}
        />
      </div>
      <div className={cx(
        'grid items-start gap-5 transition-all duration-300',
        focusCanvas
          ? 'grid-cols-1'
          : editOpen
          ? 'lg:grid-cols-[250px_minmax(0,1fr)_380px]'
          : 'lg:grid-cols-[280px_minmax(0,1fr)]'
      )}>
        {!focusCanvas && (
          <div className={cx(tab === 'sections' ? 'block' : 'hidden', 'lg:block')}>
            {list}
          </div>
        )}
        <div className={cx(
          tab === 'preview' ? 'block' : 'hidden',
          'lg:block lg:max-h-[calc(100vh-190px)] lg:overflow-y-auto lg:rounded-xl lg:bg-soft/70 lg:p-4 border border-line/60'
        )}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy">Exact Storefront Live Preview</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'desktop', label: 'Desktop' },
                  { value: 'tablet', label: 'Tablet' },
                  { value: 'mobile', label: 'Mobile' },
                ]}
              />
              <Btn
                size="sm"
                variant={editOpen ? 'dark' : 'primary'}
                icon={<SlidersHorizontal className="size-3.5" />}
                onClick={() => (editOpen ? closeEdit() : openEdit(sel))}
              >
                {editOpen ? 'Hide Edit Panel' : `Edit: ${label}`}
              </Btn>
              <Btn
                size="sm"
                variant={focusCanvas ? 'dark' : 'secondary'}
                icon={focusCanvas ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                onClick={() => setFocusCanvas(!focusCanvas)}
              >
                {focusCanvas ? 'Exit Focus' : 'Focus Preview'}
              </Btn>
              <Btn size="sm" variant="secondary" icon={<Eye className="size-3.5" />} onClick={() => setPrev(true)}>
                Fullscreen
              </Btn>
            </div>
          </div>
          <Preview
            secs={secs}
            c={c}
            sel={sel}
            editOpen={editOpen}
            onSel={(id) => {
              openEdit(id)
            }}
            onMoveSec={moveSec}
            onToggleSec={toggleSec}
            mode={mode}
          />
        </div>
        {!focusCanvas && editOpen && (
          <div className="hidden lg:block sticky top-4">
            {editPanelCard}
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Mobile & Tablet */}
      <Drawer
        open={editOpen && tab === 'edit'}
        onClose={closeEdit}
        title={`Edit ${label}`}
        width="w-[94vw] sm:w-[480px]"
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
            <span className="text-xs font-semibold text-ink-2">Switch section:</span>
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              className="text-xs font-semibold text-ink bg-soft/60 rounded-md border border-line px-2 py-1 outline-none"
            >
              {secs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} {!s.on ? '(Hidden)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-4">{editor}</div>
          <div className="flex items-center justify-between border-t border-line pt-4">
            <Btn size="sm" variant="secondary" onClick={closeEdit}>Done</Btn>
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="secondary" icon={<Save className="size-3.5" />} onClick={() => saveHomepage(false)}>Save draft</Btn>
              <Btn size="sm" icon={<Rocket className="size-3.5" />} onClick={() => setPub(true)}>Publish</Btn>
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer open={prev} onClose={() => setPrev(false)} title="Full Homepage Preview" width="max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'desktop', label: 'Desktop (100%)' },
              { value: 'tablet', label: 'Tablet (768px)' },
              { value: 'mobile', label: 'Mobile (400px)' },
            ]}
          />
          <p className="text-xs text-ink-2">Live responsive storefront preview. Click any section to select and edit.</p>
        </div>
        <div className="rounded-xl bg-soft p-2 sm:p-6 overflow-x-auto">
          <Preview
            secs={secs}
            c={c}
            sel={sel}
            editOpen={editOpen}
            onSel={(id) => { openEdit(id); setPrev(false) }}
            onMoveSec={moveSec}
            onToggleSec={toggleSec}
            mode={mode}
          />
        </div>
      </Drawer>
      <Modal open={pub} onClose={() => setPub(false)} title="Publish homepage?" footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setPub(false)}>Cancel</Btn><Btn onClick={() => saveHomepage(true)}>Publish now</Btn></div>}>
        <p className="text-sm text-ink-2">Visitors will see these changes on the live storefront straight away. {secs.filter((s) => !s.on).length} section(s) are hidden.</p>
      </Modal>
    </AdminPage>
  )
}

/* ======================= Content pages ======================= */
interface PageRec { id: string; title: string; slug: string; status: string; body: string; img: string; seoT: string; seoD: string }
const mkPage = (title: string, slug: string, status = 'Draft'): PageRec => ({ id: slug, title, slug, status, body: '', img: '', seoT: '', seoD: '' })

export function ContentPages(_: any) {
  const { toast } = useApp()
  const [pages, setPages] = useState<PageRec[]>([])
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string | null>(null)
  const [newPageOpen, setNewPageOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const ta = useRef<HTMLTextAreaElement>(null)

  const loadPages = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getPages()
      if (Array.isArray(data) && data.length > 0) {
        setPages(data)
      } else {
        setPages([
          mkPage('About us', 'about-us', 'Published'),
          mkPage('Contact', 'contact', 'Published'),
          mkPage('Shipping policy', 'shipping-policy', 'Published'),
          mkPage('Returns policy', 'refund-policy', 'Published'),
          mkPage('Warranty policy', 'warranty-policy', 'Draft'),
          mkPage('Privacy policy', 'privacy-policy', 'Published'),
          mkPage('Terms and conditions', 'terms-policy', 'Published'),
        ])
      }
    } catch (err: any) {
      console.warn('Failed to load pages from database:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [])

  const p = pages.find((x) => x.id === id || x.slug === id)
  const upd = (patch: Partial<PageRec>) => setPages((l) => l.map((x) => ((x.id === id || x.slug === id) ? { ...x, ...patch } : x)))

  const savePage = async (status: string) => {
    if (!p) return
    try {
      await adminApi.updatePage(p.id, {
        title: p.title,
        slug: p.slug,
        body: p.body,
        img: p.img,
        seoT: p.seoT,
        seoD: p.seoD,
        status,
      })
      upd({ status })
      toast(status === 'Published' ? 'Page published to live storefront' : 'Draft saved to database')
    } catch (err: any) {
      toast(`Error saving page: ${err.message || 'Failed'}`)
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    const slug = newSlug.trim() || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    try {
      const res = await adminApi.createPage({
        title: newTitle,
        slug,
        body: '',
        img: '',
        status: 'Draft',
      })
      toast('Page created')
      setNewPageOpen(false)
      setNewTitle('')
      setNewSlug('')
      await loadPages()
      if (res?.page_id) setId(res.page_id)
    } catch (err: any) {
      toast(`Error creating page: ${err.message || 'Failed'}`)
    }
  }

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return
    try {
      await adminApi.deletePage(pageId)
      toast('Page deleted')
      setId(null)
      loadPages()
    } catch (err: any) {
      toast(`Error deleting page: ${err.message || 'Failed'}`)
    }
  }

  const wrap = (a: string, b = a, ph = 'text') => {
    const t = ta.current!; const s = t.selectionStart, e = t.selectionEnd
    const mid = p!.body.slice(s, e) || ph
    upd({ body: p!.body.slice(0, s) + a + mid + b + p!.body.slice(e) })
    setTimeout(() => { t.focus(); t.setSelectionRange(s + a.length, s + a.length + mid.length) })
  }

  if (!p) return (
    <AdminPage
      title="Content pages"
      desc="Informational pages and policies shown on the storefront."
      actions={<Btn size="sm" icon={<Plus className="size-4" />} onClick={() => setNewPageOpen(true)}>Add page</Btn>}
    >
      <Card pad={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-2">Loading pages from database…</div>
        ) : (
          <Table head={['Page', 'URL slug', 'Status', 'Actions']}>
            {pages.map((x) => (
              <Tr key={x.id || x.slug} onClick={() => setId(x.id || x.slug)}>
                <Td className="font-semibold">{x.title}</Td>
                <Td className="text-ink-2">/{x.slug}</Td>
                <Td><Pub s={x.status} /></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Btn size="sm" variant="tertiary">Edit</Btn>
                    <button
                      type="button"
                      aria-label="Delete page"
                      onClick={(e) => { e.stopPropagation(); handleDelete(x.id || x.slug) }}
                      className="grid size-7 place-items-center rounded text-bad hover:bg-[#fdecea]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={newPageOpen} onClose={() => setNewPageOpen(false)} title="Create CMS page">
        <div className="space-y-4">
          <Field label="Page title" required><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Bulk Ordering & Corporate Gifting" /></Field>
          <Field label="URL slug"><Input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="e.g. bulk-orders" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setNewPageOpen(false)}>Cancel</Btn>
            <Btn disabled={!newTitle.trim()} onClick={handleCreate}>Create page</Btn>
          </div>
        </div>
      </Modal>
    </AdminPage>
  )

  const tb: [ReactNode, string, () => void][] = [
    [<Bold className="size-4" />, 'Bold', () => wrap('**')],
    [<Italic className="size-4" />, 'Italic', () => wrap('_')],
    [<List className="size-4" />, 'Bulleted list', () => wrap('\n- ', '', 'item')],
    [<ListOrdered className="size-4" />, 'Numbered list', () => wrap('\n1. ', '', 'item')],
    [<Link2 className="size-4" />, 'Link', () => wrap('[', '](https://)', 'link text')]
  ]

  return (
    <AdminPage
      title={p.title}
      crumbs={[{ label: 'Content pages', to: '/admin/pages' }, { label: p.title }]}
      actions={
        <>
          <Pub s={p.status} />
          <Btn size="sm" variant="secondary" onClick={() => savePage('Draft')}>Save draft</Btn>
          <Btn size="sm" onClick={() => savePage('Published')}>Publish</Btn>
          <Btn size="sm" variant="tertiary" onClick={() => setId(null)}>All pages</Btn>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card title="Content">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title"><Input value={p.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
              <Field label="URL slug"><Input value={p.slug} onChange={(e) => upd({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></Field>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold">Body</span>
              <div className="flex gap-1 rounded-t-dd border border-b-0 border-line bg-soft p-1">
                {tb.map(([i, l, f]) => <button key={l} type="button" aria-label={l} title={l} onClick={f} className="grid size-8 place-items-center rounded hover:bg-white">{i}</button>)}
              </div>
              <textarea
                ref={ta}
                value={p.body}
                onChange={(e) => upd({ body: e.target.value })}
                className="min-h-72 w-full rounded-b-dd border border-line px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/25"
                placeholder="Write the page content. Use markdown headings (##), lists, and bold text."
              />
            </div>
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Hero image"><ImgField value={p.img} onChange={(s) => upd({ img: s })} label="Banner" /></Card>
          <Card title="SEO">
            <div className="space-y-3">
              <Field label="SEO title" hint={`${p.seoT.length}/60`}><Input value={p.seoT} onChange={(e) => upd({ seoT: e.target.value })} /></Field>
              <Field label="Meta description" hint={`${p.seoD.length}/160`}><Textarea value={p.seoD} onChange={(e) => upd({ seoD: e.target.value })} /></Field>
            </div>
          </Card>
        </div>
      </div>
    </AdminPage>
  )
}

/* ======================= Navigation ======================= */
interface NavItem { id: number; label: string; to: string; on: boolean; d: number }
export function Navigation(_: any) {
  const { toast } = useApp()
  const [which, setWhich] = useState('header')
  const [menus, setMenus] = useState<Record<string, NavItem[]>>({
    header: [
      { id: 1, label: 'Shop', to: '/shop', on: true, d: 0 },
      { id: 2, label: 'Digital Signage', to: '/shop', on: true, d: 1 },
      { id: 3, label: 'Gallery', to: '/gallery', on: true, d: 0 },
      { id: 4, label: 'Contact', to: '/contact', on: true, d: 0 }
    ],
    footer: [
      { id: 5, label: 'About us', to: '/about', on: true, d: 0 },
      { id: 6, label: 'Shipping policy', to: '/policy/shipping', on: true, d: 0 },
      { id: 7, label: 'Privacy policy', to: '/policy/privacy', on: true, d: 0 }
    ],
  })
  const [base, setBase] = useState(menus)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getNavigation()
      .then((data) => {
        if (data && (Array.isArray(data.header) || Array.isArray(data.footer))) {
          const res = {
            header: data.header || [],
            footer: data.footer || [],
          }
          setMenus(res)
          setBase(res)
        }
      })
      .catch((err) => console.warn('Nav load:', err))
      .finally(() => setLoading(false))
  }, [])

  const items = menus[which] || []
  const put = (v: NavItem[]) => {
    setMenus({ ...menus, [which]: v })
  }
  const patch = (id: number, p: Partial<NavItem>) => put(items.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const handleSave = async () => {
    try {
      await adminApi.updateNavigation(menus)
      setBase(menus)
      toast('Navigation menu saved to database and live storefront')
    } catch (err: any) {
      toast(`Error saving navigation: ${err.message || 'Failed'}`)
    }
  }

  const dirty = JSON.stringify(menus) !== JSON.stringify(base)

  return (
    <AdminPage title="Navigation" desc="Edit the header and footer menus displayed across the storefront.">
      <Segmented value={which} onChange={setWhich} options={[{ value: 'header', label: 'Header menu' }, { value: 'footer', label: 'Footer menu' }]} className="mb-4" />
      <Card pad={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-2">Loading menus from database…</div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((x, i) => (
              <li key={x.id} className={cx('flex flex-wrap items-center gap-2 p-3', !x.on && 'opacity-50')} style={{ paddingLeft: 12 + x.d * 32 }}>
                <Input value={x.label} onChange={(e) => patch(x.id, { label: e.target.value })} aria-label="Label" className="h-10 w-44" />
                <div className="w-48"><PageSelect value={x.to} onChange={(v) => patch(x.id, { to: v })} /></div>
                <Mover
                  i={i}
                  n={items.length}
                  onMove={(d) => put(mv(items, i, d))}
                  extra={
                    <>
                      <button aria-label="Indent" disabled={i === 0 || x.d === 1} onClick={() => patch(x.id, { d: 1 })} className="grid size-7 place-items-center rounded hover:bg-soft disabled:opacity-30"><Indent className="size-4" /></button>
                      <button aria-label="Outdent" disabled={x.d === 0} onClick={() => patch(x.id, { d: 0 })} className="grid size-7 place-items-center rounded hover:bg-soft disabled:opacity-30"><Outdent className="size-4" /></button>
                    </>
                  }
                />
                <Switch on={x.on} onChange={(v) => patch(x.id, { on: v })} label="Visible" />
                <button aria-label="Delete item" onClick={() => put(items.filter((y) => y.id !== x.id))} className="grid size-8 place-items-center rounded text-bad hover:bg-[#fdecea]"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line p-3">
          <Btn size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => put([...items, { id: Date.now(), label: 'New item', to: '/', on: true, d: 0 }])}>Add item</Btn>
        </div>
      </Card>
      <SaveBar dirty={dirty} onSave={handleSave} onCancel={() => setMenus(base)} />
    </AdminPage>
  )
}

/* ======================= Gallery & videos ======================= */
interface GItem {
  id: string | number
  title: string
  type: 'Image' | 'Video' | 'Instagram'
  cat: string
  prod: string
  src: string
  thumbnail_url?: string
  embed_url?: string
  placement?: 'both' | 'gallery' | 'homepage'
  on: boolean
  order?: number
}
const GCATS = ['Installations', 'Events', 'Products', 'Behind the scenes']

function getInstagramShortcode(url: string): string | null {
  const clean = (url || '').trim()
  const m = clean.match(/(?:instagram\.com\/(?:p|reel|tv)\/)([A-Za-z0-9_-]+)/i)
  return m ? m[1] : null
}

export function GalleryVideos(_: any) {
  const { toast } = useApp()
  const [items, setItems] = useState<GItem[]>([])
  const [f, setF] = useState('all')
  const [mediaF, setMediaF] = useState('all')
  const [ed, setEd] = useState<GItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [instaValidating, setInstaValidating] = useState(false)
  const [instaError, setInstaError] = useState<string | null>(null)

  const loadGallery = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getGallery()
      if (Array.isArray(data)) {
        setItems(data)
      }
    } catch (err: any) {
      console.warn('Gallery load:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGallery()
  }, [])

  const shown = items.filter((x) => {
    const catMatch = f === 'all' || x.cat === f
    const typeMatch = mediaF === 'all' || x.type.toLowerCase() === mediaF.toLowerCase()
    return catMatch && typeMatch
  })

  const handleValidateInstagram = async (url: string) => {
    const sc = getInstagramShortcode(url)
    if (!sc) {
      setInstaError('Please enter a valid Instagram Reel or Post link (e.g. https://www.instagram.com/reel/ABC123xyz/)')
      return
    }
    setInstaValidating(true)
    setInstaError(null)
    try {
      const res = await adminApi.validateInstagram(url)
      if (res.valid) {
        setEd((prev) => prev ? {
          ...prev,
          src: res.clean_url,
          embed_url: res.embed_url,
          thumbnail_url: prev.thumbnail_url || res.thumbnail_hint || '/p/i-standee.jpg',
        } : null)
      }
    } catch (err: any) {
      setInstaError(err.message || 'Invalid Instagram link or unauthorized scraper')
    } finally {
      setInstaValidating(false)
    }
  }

  const save = async () => {
    if (!ed) return
    try {
      if (ed.type === 'Instagram') {
        const sc = getInstagramShortcode(ed.src)
        if (!sc) {
          toast('Please enter a valid Instagram Post or Reel link before saving')
          return
        }
      }

      const exists = items.some((x) => x.id === ed.id)
      if (exists) {
        await adminApi.updateGalleryItem(ed.id, ed)
        setItems((l) => l.map((x) => (x.id === ed.id ? ed : x)))
        toast('Gallery item updated')
      } else {
        const res = await adminApi.createGalleryItem(ed)
        setItems((l) => [{ ...ed, id: res?.id || ed.id }, ...l])
        toast('Gallery item created')
      }
      setEd(null)
      setInstaError(null)
    } catch (err: any) {
      toast(`Error saving gallery item: ${err.message || 'Failed'}`)
    }
  }

  const togglePublish = async (id: string | number, on: boolean) => {
    try {
      await adminApi.updateGalleryItem(id, { on })
      setItems((l) => l.map((y) => (y.id === id ? { ...y, on } : y)))
      toast(on ? 'Item published' : 'Item hidden')
    } catch (err: any) {
      toast(`Error updating publish state: ${err.message || 'Failed'}`)
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('Delete this gallery item?')) return
    try {
      await adminApi.deleteGalleryItem(id)
      setItems((l) => l.filter((x) => x.id !== id))
      if (ed && ed.id === id) setEd(null)
      toast('Gallery item deleted')
    } catch (err: any) {
      toast(`Error deleting gallery item: ${err.message || 'Failed'}`)
    }
  }

  const currentShortcode = ed && ed.type === 'Instagram' ? getInstagramShortcode(ed.src) : null

  return (
    <AdminPage
      title="Gallery & videos"
      desc="Showcase installations, original product demonstration videos, and permitted Instagram Reels."
      actions={
        <Btn
          icon={<Plus className="size-4" />}
          onClick={() => {
            setInstaError(null)
            setEd({
              id: `new-${Date.now()}`,
              title: '',
              type: 'Image',
              cat: GCATS[0],
              prod: '',
              src: '/p/i-standee.jpg',
              placement: 'both',
              on: true,
            })
          }}
        >
          Add item
        </Btn>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={f} onChange={(e) => setF(e.target.value)} className="w-48">
          <option value="all">All categories</option>
          {GCATS.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={mediaF} onChange={(e) => setMediaF(e.target.value)} className="w-44">
          <option value="all">All media types</option>
          <option value="image">Images only</option>
          <option value="video">Videos only</option>
          <option value="instagram">Instagram Reels only</option>
        </Select>
        <span className="text-xs text-ink-2 ml-auto">
          Showing {shown.length} of {items.length} items
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-ink-2">Loading gallery from database…</div>
      ) : shown.length === 0 ? (
        <EmptyState title="No items match your filter criteria" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((x) => (
            <div key={x.id} className="group relative overflow-hidden rounded-xl border border-line bg-white shadow-xs transition hover:shadow-md">
              <button onClick={() => { setInstaError(null); setEd(x) }} className="relative block aspect-[4/3] w-full bg-soft">
                <img
                  src={x.thumbnail_url || x.src}
                  alt=""
                  className={cx('size-full object-cover', !x.on && 'opacity-50')}
                  onError={(e) => {
                    const t = e.currentTarget
                    if (!t.dataset.fallback) {
                      t.dataset.fallback = '1'
                      t.src = '/p/i-standee.jpg'
                    }
                  }}
                />
                {x.type === 'Video' && (
                  <span className="absolute inset-0 grid place-items-center bg-navy/20">
                    <span className="grid size-11 place-items-center rounded-full bg-navy/85 text-white shadow-md">
                      <Play className="ml-0.5 size-5 fill-current" />
                    </span>
                  </span>
                )}
                {x.type === 'Instagram' && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                    <InstagramIcon className="size-3" /> Reel / Post
                  </span>
                )}
                <span className="absolute left-2 top-2"><Badge tone="navy">{x.cat}</Badge></span>
                <span className="absolute right-2 top-2">
                  <Badge tone={x.placement === 'homepage' ? 'brand' : x.placement === 'gallery' ? 'neutral' : 'ok'}>
                    {x.placement === 'homepage' ? 'Homepage' : x.placement === 'gallery' ? 'Gallery' : 'Both'}
                  </Badge>
                </span>
              </button>
              <div className="space-y-1.5 p-3">
                <p className="truncate text-sm font-semibold">{x.title || 'Untitled Showcase'}</p>
                <p className="truncate text-xs text-ink-2">{x.prod ? (byId(x.prod)?.name || x.prod) : 'General installation'}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-ink-2">{x.on ? 'Published' : 'Hidden'}</span>
                  <Switch on={x.on} onChange={(v) => togglePublish(x.id, v)} label="Publish" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={!!ed}
        onClose={() => { setEd(null); setInstaError(null) }}
        title={ed && items.some((x) => x.id === ed.id) ? 'Edit item' : 'Add item'}
        footer={
          <div className="flex w-full justify-between">
            {ed && items.some((x) => x.id === ed.id) ? (
              <Btn variant="danger" icon={<Trash2 className="size-4" />} onClick={() => handleDelete(ed.id)}>Delete</Btn>
            ) : <div />}
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => { setEd(null); setInstaError(null) }}>Cancel</Btn>
              <Btn disabled={!ed?.title || !ed?.src} onClick={save}>Save item</Btn>
            </div>
          </div>
        }
      >
        {ed && (
          <div className="space-y-4">
            <Field label="Title" required>
              <Input value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} placeholder="e.g. Ultra-slim light box in flagship store" />
            </Field>

            <Field label="Media Type">
              <Segmented
                value={ed.type}
                onChange={(v) => {
                  setInstaError(null)
                  setEd({ ...ed, type: v as any })
                }}
                options={[
                  { value: 'Image', label: 'Image' },
                  { value: 'Video', label: 'Video' },
                  { value: 'Instagram', label: 'Instagram Reel / Post' },
                ]}
              />
            </Field>

            {ed.type === 'Instagram' ? (
              <div className="space-y-3 rounded-xl border border-line bg-soft/50 p-3.5">
                <Field
                  label="Instagram Post / Reel URL"
                  required
                  hint="Official Instagram links only (e.g. https://www.instagram.com/reel/C8qXYZ123/)"
                >
                  <div className="flex gap-2">
                    <Input
                      value={ed.src}
                      onChange={(e) => {
                        const val = e.target.value
                        setEd({ ...ed, src: val })
                        if (getInstagramShortcode(val)) {
                          setInstaError(null)
                        }
                      }}
                      placeholder="https://www.instagram.com/reel/..."
                    />
                    <Btn
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleValidateInstagram(ed.src)}
                      disabled={instaValidating || !ed.src}
                    >
                      {instaValidating ? 'Checking…' : 'Verify'}
                    </Btn>
                  </div>
                </Field>

                {currentShortcode && !instaError && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                    <span>Permitted Instagram link detected: Shortcode <code className="font-mono font-semibold">{currentShortcode}</code></span>
                  </div>
                )}

                {instaError && (
                  <Notice tone="bad">{instaError}</Notice>
                )}

                {/* Live Instagram Embed Preview */}
                {currentShortcode && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-line bg-soft px-3 py-2 text-xs font-semibold text-ink-2">
                      <span className="flex items-center gap-1.5 text-pink-600">
                        <InstagramIcon className="size-4" /> Live Instagram Embed Preview
                      </span>
                      <a
                        href={ed.src}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-brand hover:underline"
                      >
                        Open on Instagram <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div className="grid place-items-center p-3 bg-neutral-900/5">
                      <iframe
                        src={ed.embed_url || `https://www.instagram.com/p/${currentShortcode}/embed/`}
                        className="h-[460px] w-full max-w-[320px] rounded-lg border-0 shadow-sm"
                        loading="lazy"
                        title="Instagram Post / Reel Preview"
                        allowTransparency
                      />
                    </div>
                  </div>
                )}

                <ImgField
                  label="Thumbnail / Fallback Poster"
                  value={ed.thumbnail_url || ed.src}
                  onChange={(s) => setEd({ ...ed, thumbnail_url: s })}
                />
              </div>
            ) : ed.type === 'Video' ? (
              <div className="space-y-3 rounded-xl border border-line bg-soft/50 p-3.5">
                <Field
                  label="Video Source URL"
                  required
                  hint="Direct MP4 video, Cloudflare Stream link, or YouTube / Vimeo URL"
                >
                  <Input
                    value={ed.src}
                    onChange={(e) => setEd({ ...ed, src: e.target.value })}
                    placeholder="https://... or /p/demo.mp4"
                  />
                </Field>
                <ImgField
                  label="Poster Image / Video Preview Thumbnail"
                  value={ed.thumbnail_url || ed.src}
                  onChange={(s) => setEd({ ...ed, thumbnail_url: s })}
                />
              </div>
            ) : (
              <ImgField
                label="Showcase image"
                value={ed.src}
                onChange={(s) => setEd({ ...ed, src: s, thumbnail_url: s })}
              />
            )}

            <Field label="Storefront Placement" hint="Choose where this media item appears on DisplayDelight">
              <Segmented
                value={ed.placement || 'both'}
                onChange={(v) => setEd({ ...ed, placement: v as any })}
                options={[
                  { value: 'both', label: 'Storefront & Gallery' },
                  { value: 'gallery', label: 'Gallery only' },
                  { value: 'homepage', label: 'Homepage only' },
                ]}
              />
            </Field>

            <Field label="Category">
              <Select value={ed.cat} onChange={(e) => setEd({ ...ed, cat: e.target.value })}>
                {GCATS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>

            <Field label="Related product">
              <Select value={ed.prod} onChange={(e) => setEd({ ...ed, prod: e.target.value })}>
                <option value="">None (General installation)</option>
                {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>

            <div className="flex items-center justify-between rounded-dd border border-line p-3">
              <span className="text-sm font-semibold">Published on storefront</span>
              <Switch on={ed.on} onChange={(v) => setEd({ ...ed, on: v })} label="Published" />
            </div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  )
}

/* ======================= Client logos ======================= */
interface Logo { id: string | number; name: string; url: string; on: boolean }
export function ClientLogos(_: any) {
  const { toast } = useApp()
  const up = useUpload()
  const [logos, setLogos] = useState<Logo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [ok, setOk] = useState(false)
  const slots = 8

  const loadLogos = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getClientLogos()
      if (Array.isArray(data)) {
        setLogos(data.map((l: any) => {
          const rawUrl = l.url || l.logo_url || ''
          const safeUrl = rawUrl.startsWith('blob:') ? '/uploads/med_93e97a899515_logo.jpg' : rawUrl
          return {
            id: l.id,
            name: l.name,
            url: safeUrl,
            on: Boolean(l.on ?? l.is_approved),
          }
        }))
      }
    } catch (err: any) {
      console.warn('Client logos load:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogos()
  }, [])

  const add = async () => {
    if (up.state.status !== 'done' || !up.state.url) return
    const finalUrl = up.state.url.startsWith('blob:') ? '/uploads/med_93e97a899515_logo.jpg' : up.state.url
    try {
      const res = await adminApi.createClientLogo({
        name,
        url: finalUrl,
        on: true,
      })
      setLogos([...logos, { id: res?.id || Date.now(), name, url: finalUrl, on: true }])
      setOpen(false)
      setName('')
      setOk(false)
      up.remove()
      toast('Verified client logo added to database')
    } catch (err: any) {
      toast(`Error adding client logo: ${err.message || 'Failed'}`)
    }
  }

  const toggleLogo = async (id: string | number, on: boolean) => {
    try {
      await adminApi.approveClientLogo(id, on)
      setLogos(logos.map((x) => (x.id === id ? { ...x, on } : x)))
      toast(on ? 'Logo approved for storefront display' : 'Logo hidden from storefront')
    } catch (err: any) {
      toast(`Error updating logo status: ${err.message || 'Failed'}`)
    }
  }

  const deleteLogo = async (id: string | number) => {
    if (!confirm('Remove this client logo?')) return
    try {
      await adminApi.deleteClientLogo(id)
      setLogos(logos.filter((x) => x.id !== id))
      toast('Client logo removed')
    } catch (err: any) {
      toast(`Error deleting logo: ${err.message || 'Failed'}`)
    }
  }

  return (
    <AdminPage
      title="Client logos"
      desc="Show logos of clients who have given explicit verification and consent to be displayed on the storefront."
      actions={<Btn icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Add logo</Btn>}
    >
      <div className="mb-4">
        <Notice tone="info">
          Under Commercial Content Integrity rules, only verified corporate clients with recorded consent may be published to the live storefront.
        </Notice>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-ink-2">Loading client logos from database…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {logos.map((l, i) => (
            <div key={l.id} className={cx('rounded-xl border border-line bg-white p-3 shadow-xs', !l.on && 'opacity-50')}>
              <div className="grid h-24 place-items-center rounded-lg bg-soft p-2 overflow-hidden">
                <img
                  src={l.url}
                  alt={l.name}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none'
                    ;(e.target as HTMLElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="text-xs font-bold text-ink-2 px-1 text-center">${l.name}</span>`)
                  }}
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{l.name}</p>
              <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2">
                <Mover i={i} n={logos.length} onMove={(d) => setLogos(mv(logos, i, d))} />
                <div className="flex items-center gap-2">
                  <Switch on={l.on} onChange={(v) => toggleLogo(l.id, v)} label="Visible" />
                  <button type="button" aria-label="Delete logo" onClick={() => deleteLogo(l.id)} className="grid size-7 place-items-center rounded text-bad hover:bg-[#fdecea]">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, slots - logos.length) }, (_, i) => (
            <button key={i} onClick={() => setOpen(true)} className="grid h-40 place-items-center rounded-xl border-2 border-dashed border-line text-center text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand">
              <span><Plus className="mx-auto mb-1 size-5" />Add verified client logo</span>
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add verified client logo"
        footer={<Btn disabled={!name || !ok || up.state.status !== 'done'} onClick={add}>Save logo</Btn>}
      >
        <div className="space-y-4">
          <Field label="Client name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Reliance Retail" /></Field>
          <Uploader state={up.state} onFile={up.start} onRemove={up.remove} onRetry={up.retry} formats="PNG, SVG, JPG" maxSize="Transparent background recommended" />
          <Check_ checked={ok} onChange={() => setOk(!ok)} label="I confirm this client has given written permission to display their brand logo." />
        </div>
      </Drawer>
    </AdminPage>
  )
}

/* ======================= Industries ======================= */
export function Industries(_: any) {
  const { toast } = useApp()
  const [rows, setRows] = useState<Array<{ id?: string; l: string; d: string; img: string; on: boolean }>>([])
  const [base, setBase] = useState<Array<{ id?: string; l: string; d: string; img: string; on: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getIndustries()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data)
          setBase(data)
        } else {
          const init = INDUSTRIES.map((x) => ({ l: x[0] as string, d: x[1] as string, img: x[2] as string, on: true }))
          setRows(init)
          setBase(init)
        }
      })
      .catch((err) => console.warn('Industries load:', err))
      .finally(() => setLoading(false))
  }, [])

  const upd = (i: number, p: Partial<{ id?: string; l: string; d: string; img: string; on: boolean }>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))

  const handleSave = async () => {
    try {
      await adminApi.updateIndustries(rows)
      setBase(rows)
      toast('Industries showcase saved to database and live storefront')
    } catch (err: any) {
      toast(`Error saving industries: ${err.message || 'Failed'}`)
    }
  }

  const dirty = JSON.stringify(rows) !== JSON.stringify(base)

  return (
    <AdminPage title="Industries" desc="Cards shown in the Industries section of the storefront and about page.">
      {loading ? (
        <div className="p-8 text-center text-sm text-ink-2">Loading industries from database…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r, i) => (
            <Card key={r.l + i} className={cx(!r.on && 'opacity-60')}>
              <div className="flex gap-4">
                <div className="shrink-0"><ImgField value={r.img} onChange={(s) => upd(i, { img: s })} label="Image" /></div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input value={r.l} onChange={(e) => upd(i, { l: e.target.value })} aria-label="Label" />
                  <Textarea value={r.d} onChange={(e) => upd(i, { d: e.target.value })} className="min-h-20" aria-label="Description" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Mover i={i} n={rows.length} onMove={(d) => setRows(mv(rows, i, d))} />
                <label className="flex items-center gap-2 text-sm text-ink-2">
                  <Switch on={r.on} onChange={(v) => upd(i, { on: v })} label="Visible" />Visible
                </label>
              </div>
            </Card>
          ))}
        </div>
      )}
      <SaveBar dirty={dirty} onSave={handleSave} onCancel={() => setRows(base)} />
    </AdminPage>
  )
}

/* ======================= FAQs ======================= */
interface FaqRec { id: string | number; q: string; a: string; cat: string; on: boolean }
export function Faqs(_: any) {
  const { toast } = useApp()
  const [rows, setRows] = useState<FaqRec[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<string | number | null>(null)

  const loadFaqs = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getFaqs()
      if (Array.isArray(data) && data.length > 0) {
        setRows(data)
      } else {
        setRows(FAQS.map((f, i) => ({ id: `seed-${i}`, q: f[0] as string, a: f[1] as string, cat: ['Customisation', 'Quotes', 'Artwork', 'Orders', 'Artwork'][i] || 'General', on: true })))
      }
    } catch (err: any) {
      console.warn('FAQ load:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFaqs()
  }, [])

  const updLocal = (id: string | number, p: Partial<FaqRec>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const handleSaveFaq = async (rec: FaqRec) => {
    try {
      if (typeof rec.id === 'string' && rec.id.startsWith('new-')) {
        const res = await adminApi.createFaq(rec)
        setRows(rows.map((r) => (r.id === rec.id ? { ...rec, id: res?.id || rec.id } : r)))
        toast('FAQ created and saved to database')
      } else {
        await adminApi.updateFaq(rec.id, rec)
        toast('FAQ updated in database')
      }
      setEdit(null)
    } catch (err: any) {
      toast(`Error saving FAQ: ${err.message || 'Failed'}`)
    }
  }

  const handleToggle = async (id: string | number, on: boolean) => {
    try {
      await adminApi.updateFaq(id, { on })
      updLocal(id, { on })
      toast(on ? 'FAQ published to storefront' : 'FAQ hidden')
    } catch (err: any) {
      toast(`Error updating FAQ: ${err.message || 'Failed'}`)
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return
    try {
      await adminApi.deleteFaq(id)
      setRows(rows.filter((x) => x.id !== id))
      toast('FAQ deleted from database')
    } catch (err: any) {
      toast(`Error deleting FAQ: ${err.message || 'Failed'}`)
    }
  }

  return (
    <AdminPage
      title="FAQs"
      desc="Frequently asked questions shown across the storefront and product enquiry panels."
      actions={
        <Btn
          icon={<Plus className="size-4" />}
          onClick={() => {
            const newId = `new-${Date.now()}`
            setRows([...rows, { id: newId, q: '', a: '', cat: 'General', on: true }])
            setEdit(newId)
          }}
        >
          Add FAQ
        </Btn>
      }
    >
      <Card pad={false}>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-2">Loading FAQs from database…</div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r, i) => (
              <li key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Mover i={i} n={rows.length} onMove={(d) => setRows(mv(rows, i, d))} />
                  <div className="min-w-56 flex-1">
                    <p className="text-sm font-semibold">{r.q || 'New question'}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge>{r.cat}</Badge>
                      <Pub s={r.on ? 'Published' : 'Draft'} />
                    </div>
                  </div>
                  <Switch on={r.on} onChange={(v) => handleToggle(r.id, v)} label="Published" />
                  <Btn size="sm" variant="secondary" onClick={() => setEdit(edit === r.id ? null : r.id)}>
                    {edit === r.id ? 'Close' : 'Edit'}
                  </Btn>
                  <button aria-label="Delete" onClick={() => handleDelete(r.id)} className="grid size-8 place-items-center rounded text-bad hover:bg-[#fdecea]">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {edit === r.id && (
                  <div className="mt-4 grid gap-3 border-t border-line pt-4">
                    <Field label="Question"><Input value={r.q} onChange={(e) => updLocal(r.id, { q: e.target.value })} /></Field>
                    <Field label="Answer"><Textarea value={r.a} onChange={(e) => updLocal(r.id, { a: e.target.value })} /></Field>
                    <Field label="Category"><Input value={r.cat} onChange={(e) => updLocal(r.id, { cat: e.target.value })} className="max-w-xs" /></Field>
                    <div><Btn size="sm" onClick={() => handleSaveFaq(r)}>Save FAQ</Btn></div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminPage>
  )
}

/* ======================= Testimonials ======================= */
interface TestimonialRec { id?: string | number; n: string; b: string; q: string; rating?: number; on: boolean }
export function Testimonials(_: any) {
  const { toast } = useApp()
  const [list, setList] = useState<TestimonialRec[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ n: '', b: '', q: '', consent: false })

  const loadTestimonials = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getTestimonials()
      if (Array.isArray(data)) {
        setList(data)
      }
    } catch (err: any) {
      console.warn('Testimonials load:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTestimonials()
  }, [])

  const valid = f.n.trim() && f.q.trim() && f.consent

  const add = async () => {
    if (!valid) return
    try {
      const res = await adminApi.createTestimonial({
        n: f.n,
        b: f.b,
        q: f.q,
        rating: 5,
        on: true,
      })
      setList([...list, { id: res?.id || Date.now(), n: f.n, b: f.b, q: f.q, on: true, rating: 5 }])
      setOpen(false)
      setF({ n: '', b: '', q: '', consent: false })
      toast('Testimonial with recorded consent saved to database')
    } catch (err: any) {
      toast(`Error creating testimonial: ${err.message || 'Failed'}`)
    }
  }

  const toggleTestimonial = async (id: string | number | undefined, on: boolean) => {
    if (!id) return
    try {
      await adminApi.approveTestimonial(id, on)
      setList(list.map((x) => (x.id === id ? { ...x, on } : x)))
      toast(on ? 'Testimonial published to storefront' : 'Testimonial hidden')
    } catch (err: any) {
      toast(`Error updating testimonial: ${err.message || 'Failed'}`)
    }
  }

  const deleteTestimonial = async (id: string | number | undefined) => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this testimonial?')) return
    try {
      await adminApi.deleteTestimonial(id)
      setList(list.filter((x) => x.id !== id))
      toast('Testimonial deleted from database')
    } catch (err: any) {
      toast(`Error deleting testimonial: ${err.message || 'Failed'}`)
    }
  }

  return (
    <AdminPage
      title="Testimonials"
      desc="Customer reviews and endorsements. Strict consent validation is enforced before storefront publication."
      actions={<Btn icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Add approved testimonial</Btn>}
    >
      {loading ? (
        <div className="p-8 text-center text-sm text-ink-2">Loading testimonials from database…</div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title="No approved testimonials yet"
            text="Testimonials appear on the storefront only after you record the customer's consent."
            action={<Btn onClick={() => setOpen(true)}>Add approved testimonial</Btn>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((t, i) => (
            <Card key={t.id || i}>
              <p className="text-sm">&ldquo;{t.q}&rdquo;</p>
              <p className="mt-3 text-sm font-semibold">{t.n}{t.b && <span className="font-normal text-ink-2"> · {t.b}</span>}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2">
                <Badge tone="ok" dot>Consent confirmed</Badge>
                <span className="flex items-center gap-3">
                  <Switch on={t.on} onChange={(v) => toggleTestimonial(t.id, v)} label="Published" />
                  <button aria-label="Delete" onClick={() => deleteTestimonial(t.id)} className="grid size-7 place-items-center rounded text-bad hover:bg-[#fdecea]">
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add approved testimonial"
        footer={<Btn disabled={!valid} onClick={add}>Save testimonial</Btn>}
      >
        <div className="space-y-4">
          <Field label="Customer name" required><Input value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} placeholder="e.g. Arun Sundaram" /></Field>
          <Field label="Business (optional)"><Input value={f.b} onChange={(e) => setF({ ...f, b: e.target.value })} placeholder="e.g. Chennai Grand Hotel" /></Field>
          <Field label="Testimonial" required><Textarea value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="min-h-32" placeholder="Customer quote text..." /></Field>
          <Check_ checked={f.consent} onChange={() => setF({ ...f, consent: !f.consent })} label="Customer consent explicitly confirmed" />
          <p className="text-xs text-ink-2">Required by compliance. Publish only words the customer wrote or approved for commercial display.</p>
        </div>
      </Drawer>
    </AdminPage>
  )
}

/* ======================= Footer & policies ======================= */
export function FooterPolicies(_: any) {
  const { toast } = useApp()
  const init = {
    desc: 'Digital standees, illuminated and acrylic LED displays, tabletop signage, roll-ups and customised branding products.',
    cols: [
      { t: 'Shop', links: [['All products', '/shop'], ['Digital standees', '/shop'], ['Request a quote', '/quote']] },
      { t: 'Company', links: [['About us', '/about'], ['Gallery', '/gallery'], ['Contact', '/contact'], ['FAQ', '/faq']] }
    ] as { t: string; links: string[][] }[],
    pol: { shipping: true, returns: true, warranty: true, privacy: true, terms: true } as Record<string, boolean>,
    email: 'support@displaydelight.in',
    phone: '+91 98403 27440',
    addr: 'Plot 42, Guindy Industrial Estate, Chennai 600032',
    soc: { Instagram: true, Facebook: true, YouTube: false, LinkedIn: false, WhatsApp: true } as Record<string, boolean>,
  }
  const [v, setV] = useState(init)
  const [base, setBase] = useState(init)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getFooterConfig()
      .then((data) => {
        if (data && typeof data === 'object') {
          const merged = {
            ...init,
            ...data,
            cols: Array.isArray(data.cols) && data.cols.length > 0 ? data.cols : init.cols,
            pol: { ...init.pol, ...(data.pol || {}) },
            soc: { ...init.soc, ...(data.soc || {}) },
          }
          setV(merged)
          setBase(merged)
        }
      })
      .catch((err) => console.warn('Footer config load:', err))
      .finally(() => setLoading(false))
  }, [])

  const setCol = (i: number, f: (c: (typeof init.cols)[number]) => (typeof init.cols)[number]) =>
    setV({ ...v, cols: v.cols.map((c, j) => (j === i ? f(c) : c)) })

  const handleSave = async () => {
    try {
      await adminApi.updateFooterConfig(v)
      setBase(v)
      toast('Footer configuration saved to database and storefront')
    } catch (err: any) {
      toast(`Error saving footer: ${err.message || 'Failed'}`)
    }
  }

  const dirty = JSON.stringify(v) !== JSON.stringify(base)

  return (
    <AdminPage title="Footer & policies" desc="Footer description, link columns, policy links, contact details, and social channels.">
      {loading ? (
        <div className="p-8 text-center text-sm text-ink-2">Loading footer configuration from database…</div>
      ) : (
        <div className="space-y-5">
          <Card title="Footer description">
            <Textarea value={v.desc} onChange={(e) => setV({ ...v, desc: e.target.value })} />
          </Card>
          <Card
            title="Link columns"
            actions={<Btn size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setV({ ...v, cols: [...v.cols, { t: 'New column', links: [] }] })}>Add column</Btn>}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {v.cols.map((c, i) => (
                <div key={i} className="space-y-2 rounded-dd border border-line p-3">
                  <div className="flex gap-2">
                    <Input value={c.t} onChange={(e) => setCol(i, (x) => ({ ...x, t: e.target.value }))} aria-label="Column title" />
                    <button aria-label="Remove column" onClick={() => setV({ ...v, cols: v.cols.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded text-bad hover:bg-[#fdecea]">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {c.links.map((l, k) => (
                    <div key={k} className="flex gap-2">
                      <Input value={l[0]} aria-label="Link label" onChange={(e) => setCol(i, (x) => ({ ...x, links: x.links.map((y, m) => (m === k ? [e.target.value, y[1]] : y)) }))} />
                      <div className="w-40 shrink-0">
                        <PageSelect value={l[1]} onChange={(to) => setCol(i, (x) => ({ ...x, links: x.links.map((y, m) => (m === k ? [y[0], to] : y)) }))} />
                      </div>
                    </div>
                  ))}
                  <Btn size="sm" variant="tertiary" icon={<Plus className="size-4" />} onClick={() => setCol(i, (x) => ({ ...x, links: [...x.links, ['New link', '/']] }))}>Add link</Btn>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Policy links" desc="Choose which policies are linked in the footer.">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.keys(v.pol).map((k) => (
                <Check_
                  key={k}
                  checked={v.pol[k]}
                  onChange={() => setV({ ...v, pol: { ...v.pol, [k]: !v.pol[k] } })}
                  label={k === 'terms' ? 'Terms and conditions' : k[0].toUpperCase() + k.slice(1) + ' policy'}
                />
              ))}
            </div>
          </Card>
          <Card title="Contact details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
              <Field label="Address" className="md:col-span-2"><Textarea value={v.addr} onChange={(e) => setV({ ...v, addr: e.target.value })} /></Field>
            </div>
          </Card>
          <Card title="Social links" desc="Configure which channels are visible in the storefront footer.">
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.keys(v.soc).map((k) => (
                <Check_
                  key={k}
                  checked={v.soc[k]}
                  onChange={() => setV({ ...v, soc: { ...v.soc, [k]: !v.soc[k] } })}
                  label={'Show ' + k}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
      <SaveBar dirty={dirty} onSave={handleSave} onCancel={() => setV(base)} />
    </AdminPage>
  )
}

/* ======================= SEO ======================= */
interface SeoItem {
  id: string
  resource_type: string
  resource_id: string
  name: string
  kind: string
  t: string
  d: string
  og: string
  canonical?: string
  noindex?: boolean
  has_custom?: boolean
}

export function SeoMeta(_: any) {
  const { toast } = useApp()
  const seed: SeoItem[] = [
    ...['Home', 'About us', 'Contact', 'Shipping policy', 'Request a quote', 'Track order'].map((n) => ({
      id: n.toLowerCase().replace(/\s+/g, '-'),
      resource_type: 'page',
      resource_id: n.toLowerCase().replace(/\s+/g, '-'),
      name: n,
      kind: 'Page',
      t: `DisplayDelight — ${n}`,
      d: 'High-impact digital standees, ultra slim light boxes, acrylic LED frames, and bespoke retail signage.',
      og: '/p/hero.jpg',
    })),
    ...PRODUCTS.slice(0, 6).map((p) => ({
      id: p.id,
      resource_type: 'product',
      resource_id: p.id,
      name: p.name,
      kind: 'Product',
      t: `${p.name} | DisplayDelight`,
      d: `Buy ${p.name} with custom commercial display sizing.`,
      og: p.img,
    })),
  ]
  const [rows, setRows] = useState<SeoItem[]>(seed)
  const [sel, setSel] = useState<string>(seed[0].id)
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    adminApi.getSeoList()
      .then((res) => {
        if (mounted && Array.isArray(res) && res.length > 0) {
          setRows(res)
          if (!res.some((x: any) => x.id === sel)) {
            setSel(res[0].id)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load SEO metadata list:', err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const r = rows.find((x) => x.id === sel) || rows[0] || seed[0]
  const upd = (p: Partial<SeoItem>) => setRows(rows.map((x) => (x.id === sel ? { ...x, ...p } : x)))
  const stat = (x: SeoItem) => (x.t && x.d && x.og ? 'Ready' : !x.t ? 'Missing title' : !x.d ? 'Missing description' : 'Missing OG image')
  const Counter = ({ n, max }: { n: number; max: number }) => <span className={cx('text-xs', n > max ? 'font-semibold text-bad' : 'text-ink-2')}>{n}/{max}</span>

  const handleSave = async () => {
    if (!r) return
    setSaving(true)
    try {
      await adminApi.updateSeo(r.resource_type || 'page', r.resource_id || r.id, {
        title: r.t,
        description: r.d,
        og_image_url: r.og,
        canonical_url: r.canonical || '',
        noindex: !!r.noindex,
      })
      upd({ has_custom: true })
      toast(`Saved SEO snippet for ${r.name}`)
    } catch (err: any) {
      toast(`Failed to save SEO: ${err.message || 'Error'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage title="SEO & meta" desc="Search engine titles, meta descriptions, and OpenGraph share previews.">
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_420px]">
        <Card pad={false}>
          <Toolbar search={q} onSearch={setQ} placeholder="Search pages and products">
            {loading && <span className="text-xs text-ink-2">Syncing database…</span>}
          </Toolbar>
          <Table head={['Item', 'Type', 'Title', 'Description', 'OG image']}>
            {rows.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).map((x) => (
              <Tr key={x.id} selected={sel === x.id} onClick={() => setSel(x.id)}>
                <Td className="font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>{x.name}</span>
                    {x.has_custom && <Badge tone="neutral">Custom</Badge>}
                  </div>
                </Td>
                <Td className="text-ink-2">{x.kind}</Td>
                {[x.t, x.d, x.og].map((v, i) => (
                  <Td key={i}>
                    {v ? <Check className="size-4 text-ok" aria-label="Set" /> : <span className="text-xs font-semibold text-warn">Missing</span>}
                  </Td>
                ))}
              </Tr>
            ))}
          </Table>
        </Card>
        <Card title={`Snippet: ${r.name}`}>
          <div className="space-y-4">
            <div className="rounded-dd border border-line bg-white p-3 shadow-xs">
              <p className="text-[11px] text-ink-2">displaydelight.in › {r.id}</p>
              <p className="truncate text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer">{r.t || r.name}</p>
              <p className="line-clamp-2 text-[13px] text-ink-2">{r.d || 'Add a meta description to control how this page appears in Google search results.'}</p>
            </div>
            <Field label="SEO title"><Input value={r.t} onChange={(e) => upd({ t: e.target.value })} /></Field>
            <div className="-mt-3 text-right"><Counter n={r.t.length} max={60} /></div>
            <Field label="Meta description"><Textarea value={r.d} onChange={(e) => upd({ d: e.target.value })} /></Field>
            <div className="-mt-3 text-right"><Counter n={r.d.length} max={160} /></div>
            <ImgField label="Share (OG) image" value={r.og} onChange={(s) => upd({ og: s })} />
            <Field label="Canonical URL path (optional)"><Input value={r.canonical || ''} placeholder={`/${r.id}`} onChange={(e) => upd({ canonical: e.target.value })} /></Field>
            <div className="flex items-center justify-between pt-2">
              <StatusBadge s={stat(r)} />
              <Btn size="sm" loading={saving} onClick={handleSave}>Save snippet</Btn>
            </div>
          </div>
        </Card>
      </div>
    </AdminPage>
  )
}

/* ======================= Media library ======================= */
interface Media {
  id: string | number
  name: string
  src: string
  type: 'Image' | 'Video'
  dims: string
  size: string
  size_bytes?: number
  alt: string
  title: string
  tags: string
  pub: boolean
  st: 'ready' | 'uploading' | 'processing' | 'failed'
  pr: number
}

export function MediaLibrary(_: any) {
  const { toast } = useApp()
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | number | null>(null)
  const [del, setDel] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const loadAssets = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getMediaList(type, q)
      if (Array.isArray(data)) {
        setItems(data)
      }
    } catch (err: any) {
      console.error('Failed to load media assets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [type, q])

  const patchLocal = (id: string | number, p: Partial<Media>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const onFiles = async (fl: FileList | null) => {
    if (!fl || fl.length === 0) return
    const filesArr = Array.from(fl)

    for (let k = 0; k < filesArr.length; k++) {
      const f = filesArr[k]
      const tempId = `up_${Date.now()}_${k}`
      const isVideo = f.type.startsWith('video')

      if (f.size > 50 * 1024 * 1024) {
        toast(`File ${f.name} exceeds 50 MB limit.`)
        continue
      }

      const tempMedia: Media = {
        id: tempId,
        name: f.name,
        src: isVideo ? '' : URL.createObjectURL(f),
        type: isVideo ? 'Video' : 'Image',
        dims: isVideo ? '1920 × 1080' : '1600 × 1200',
        size: `${Math.round(f.size / 1024)} KB`,
        alt: f.name,
        title: f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        tags: 'upload, storefront',
        pub: true,
        st: 'uploading',
        pr: 40,
      }

      setItems((prev) => [tempMedia, ...prev])

      try {
        const saved = await adminApi.uploadMedia(f)
        setItems((prev) => prev.map((x) => (x.id === tempId ? { ...saved, st: 'ready', pr: 100 } : x)))
        toast(`Uploaded ${f.name}`)
      } catch (err: any) {
        setItems((prev) => prev.map((x) => (x.id === tempId ? { ...x, st: 'failed', pr: 0 } : x)))
        toast(`Upload failed: ${err.message || 'Server error'}`)
      }
    }

    if (file.current) file.current.value = ''
  }

  const list = items.filter((x) => (type === 'all' || x.type.toLowerCase() + 's' === type) && x.name.toLowerCase().includes(q.toLowerCase()))
  const cur = items.find((x) => x.id === sel)

  const handleSaveMetadata = async () => {
    if (!cur) return
    try {
      await adminApi.updateMedia(cur.id, {
        title: cur.title,
        alt: cur.alt,
        tags: cur.tags,
        pub: cur.pub,
      })
      setSel(null)
      toast('Media details saved')
    } catch (err: any) {
      toast(`Failed to update media: ${err.message || 'Error'}`)
    }
  }

  const handleDelete = async () => {
    if (!cur) return
    try {
      await adminApi.deleteMedia(cur.id)
      setItems((prev) => prev.filter((x) => x.id !== cur.id))
      setDel(false)
      setSel(null)
      toast('Media deleted')
    } catch (err: any) {
      toast(`Failed to delete media: ${err.message || 'Error'}`)
    }
  }

  const Thumb = ({ m }: { m: Media }) => (
    <div className="relative size-full bg-soft">
      {m.src ? (
        <img src={m.src} alt={m.alt} className={cx('size-full object-cover', m.st !== 'ready' && 'opacity-40')} />
      ) : (
        <span className="grid size-full place-items-center text-ink-2">{m.type === 'Video' ? <Film className="size-6" /> : <ImgIcon className="size-6" />}</span>
      )}
      {m.type === 'Video' && m.st === 'ready' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-9 place-items-center rounded-full bg-navy/80 text-white">
            <Play className="size-4 fill-current" />
          </span>
        </span>
      )}
      {m.st === 'uploading' && (
        <div className="absolute inset-x-2 bottom-2">
          <div className="h-1.5 rounded-full bg-white/80">
            <div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: m.pr + '%' }} />
          </div>
          <p className="mt-1 text-center text-[11px] font-semibold">Uploading {m.pr}%</p>
        </div>
      )}
      {m.st === 'processing' && <span className="absolute inset-0 grid place-items-center"><Badge tone="warn" dot>Processing</Badge></span>}
      {m.st === 'failed' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="text-center">
            <Badge tone="bad">Upload failed</Badge>
          </span>
        </span>
      )}
    </div>
  )

  return (
    <AdminPage
      title="Media library"
      desc="Central asset repository for storefront hero banners, product media, and showroom clips."
      actions={
        <>
          <input ref={file} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => onFiles(e.target.files)} />
          <Btn icon={<Upload className="size-4" />} onClick={() => file.current?.click()}>Upload file</Btn>
        </>
      }
    >
      <Card pad={false}>
        <Toolbar search={q} onSearch={setQ} placeholder="Search media by filename, title or tag">
          <Segmented value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'images', label: 'Images' }, { value: 'videos', label: 'Videos' }]} />
          <Segmented className="ml-auto" value={view} onChange={setView} options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />
        </Toolbar>
        {loading && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-2">Loading media assets…</div>
        ) : list.length === 0 ? (
          <EmptyState title="No media found" text="Upload images or videos to use across the storefront." />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((m) => (
              <button
                key={m.id}
                onClick={() => setSel(m.id)}
                className={cx('overflow-hidden rounded-lg border bg-white text-left transition hover:shadow-card', sel === m.id ? 'border-brand ring-2 ring-brand/30' : 'border-line')}
              >
                <div className="aspect-square"><Thumb m={m} /></div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold">{m.title || m.name}</p>
                  <p className="text-[11px] text-ink-2">{m.type} · {m.pub ? 'Published' : 'Unpublished'}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((m) => (
              <li key={m.id}>
                <button onClick={() => setSel(m.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-soft">
                  <div className="size-12 shrink-0 overflow-hidden rounded"><Thumb m={m} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.title || m.name}</p>
                    <p className="text-xs text-ink-2">{m.type} · {m.dims} · {m.size}</p>
                  </div>
                  <Pub s={m.st === 'ready' ? (m.pub ? 'Published' : 'Draft') : m.st === 'failed' ? 'Failed' : 'Processing'} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer
        open={!!cur}
        onClose={() => setSel(null)}
        title="Media details"
        footer={
          cur && (
            <div className="flex w-full justify-between">
              <Btn variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => setDel(true)}>Delete</Btn>
              <Btn onClick={handleSaveMetadata}>Save changes</Btn>
            </div>
          )
        }
      >
        {cur && (
          <div className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-lg border border-line"><Thumb m={cur} /></div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              {[['Dimensions', cur.dims], ['File type', cur.name.split('.').pop()?.toUpperCase() ?? cur.type], ['Size', cur.size]].map(([a, b]) => (
                <div key={a}><dt className="text-xs text-ink-2">{a}</dt><dd className="font-medium">{b}</dd></div>
              ))}
            </dl>
            <Field label="Title"><Input value={cur.title} onChange={(e) => patchLocal(cur.id, { title: e.target.value })} /></Field>
            <Field label="Alt text" hint="Describe the image for screen readers and search engines."><Input value={cur.alt} onChange={(e) => patchLocal(cur.id, { alt: e.target.value })} /></Field>
            <Field label="Tags" hint="Separate with commas (e.g. hero, lightbox, retail)"><Input value={cur.tags} onChange={(e) => patchLocal(cur.id, { tags: e.target.value })} /></Field>
            <Field label="File URL"><Input readOnly value={cur.src} className="bg-soft text-ink-2" /></Field>
            <div className="flex items-center justify-between rounded-dd border border-line p-3">
              <span className="text-sm font-semibold">{cur.pub ? 'Published on storefront' : 'Internal draft'}</span>
              <Switch on={cur.pub} onChange={(v) => patchLocal(cur.id, { pub: v })} label="Publish" />
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={del}
        onClose={() => setDel(false)}
        title="Delete this file?"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setDel(false)}>Cancel</Btn>
            <Btn variant="danger" onClick={handleDelete}>Delete</Btn>
          </div>
        }
      >
        <p className="text-sm text-ink-2">{cur?.name} will be permanently removed from the library and local storage.</p>
      </Modal>
    </AdminPage>
  )
}

/* ======================= Product Reviews Moderation ======================= */
export function ProductReviewsAdmin(_: any) {
  const { toast } = useApp()
  const [tab, setTab] = useState<'all' | 'pending' | 'published' | 'rejected'>('all')
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    adminApi.getReviews(tab === 'all' ? undefined : tab)
      .then((data) => {
        setReviews(data || [])
      })
      .catch((err) => {
        console.error(err)
        toast('Failed to load reviews', 'err')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [tab])

  const handleModerate = async (id: string, status: 'published' | 'rejected' | 'pending') => {
    try {
      setActionId(id)
      await adminApi.moderateReview(id, status)
      toast(`Review marked as ${status}`, 'ok')
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to update review status', 'err')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this customer review?')) return
    try {
      setActionId(id)
      await adminApi.deleteReview(id)
      toast('Review deleted', 'info')
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to delete review', 'err')
    } finally {
      setActionId(null)
    }
  }

  const filtered = reviews.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (r.author_name && r.author_name.toLowerCase().includes(q)) ||
      (r.product_name && r.product_name.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.body && r.body.toLowerCase().includes(q))
    )
  })

  const pendingCount = reviews.filter((r) => r.status === 'pending').length

  return (
    <AdminPage
      title="Product Reviews"
      desc="Moderate customer product reviews, verify purchase authentications, and approve public display on the storefront."
      actions={
        <div className="flex items-center gap-2">
          <Btn variant="secondary" icon={<RefreshCw className="size-4" />} onClick={load} loading={loading}>
            Refresh
          </Btn>
        </div>
      }
    >
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as any)}
            tabs={[
              { value: 'all', label: 'All Reviews', badge: reviews.length },
              { value: 'pending', label: 'Pending Moderation', badge: pendingCount > 0 ? pendingCount : undefined },
              { value: 'published', label: 'Published' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <div className="w-full sm:w-64">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer or product..."
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-ink-2">Loading customer reviews from database...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No customer reviews found"
            text={tab === 'pending' ? 'No customer reviews currently awaiting moderation.' : 'No customer reviews match your selected filter.'}
            action={tab !== 'all' ? <Btn variant="secondary" onClick={() => setTab('all')}>View all reviews</Btn> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                    {r.product_name || `Product #${r.product_id?.slice(0, 8)}`}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating value={r.rating} size="sm" />
                    {r.title && <h4 className="text-sm font-bold text-ink">{r.title}</h4>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge s={r.status === 'published' ? 'Active' : r.status === 'pending' ? 'Pending' : 'Archived'} />
                  {r.is_verified_purchase && (
                    <Badge tone="ok">
                      <span className="flex items-center gap-1">
                        <Check className="size-3" />
                        Verified Purchase
                      </span>
                    </Badge>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-2 bg-soft/50 rounded-lg p-3 italic">
                "{r.body}"
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-ink-2">
                <div>
                  <span className="font-semibold text-ink">{r.author_name}</span>
                  {r.company && <span> · {r.company}</span>}
                  {r.created_at && (
                    <span className="block text-[11px] text-ink-2">
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {r.status === 'pending' && (
                    <>
                      <Btn
                        size="sm"
                        disabled={actionId === r.id}
                        onClick={() => handleModerate(r.id, 'published')}
                      >
                        Approve
                      </Btn>
                      <Btn
                        size="sm"
                        variant="secondary"
                        disabled={actionId === r.id}
                        onClick={() => handleModerate(r.id, 'rejected')}
                      >
                        Reject
                      </Btn>
                    </>
                  )}
                  {r.status === 'published' && (
                    <Btn
                      size="sm"
                      variant="secondary"
                      disabled={actionId === r.id}
                      onClick={() => handleModerate(r.id, 'rejected')}
                    >
                      Unpublish
                    </Btn>
                  )}
                  {r.status === 'rejected' && (
                    <Btn
                      size="sm"
                      disabled={actionId === r.id}
                      onClick={() => handleModerate(r.id, 'published')}
                    >
                      Restore & Approve
                    </Btn>
                  )}
                  <button
                    type="button"
                    aria-label="Delete review"
                    disabled={actionId === r.id}
                    onClick={() => handleDelete(r.id)}
                    className="grid size-8 place-items-center rounded text-bad hover:bg-[#fdecea] transition"
                    title="Permanently delete review"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  )
}

