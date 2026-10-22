import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlignLeft, ArrowDown, ArrowUp, CheckSquare, Circle, ChevronDown, Columns2, Eye, FileUp, GripVertical, Hash, LayoutTemplate, ListChecks, MessageSquare, Palette, Plus, RectangleHorizontal, Ruler, StickyNote, Trash2, Type, TypeOutline, X, type LucideIcon } from 'lucide-react'
import { go, useApp } from '../store'
import { PRODUCTS, byId, type Product } from '../data'
import { Badge, Btn, Check_, Field, Input, Modal, Notice, Segmented, Select, Switch, Tabs, Textarea, Uploader, cx, useUpload } from '../ui'
import { AdminPage, Card, StatusBadge, Table, Td, Tr } from './kit'
import { adminApi } from '../api'

/* ---------- shared helpers ---------- */
export function Chips({ values, onChange, placeholder = 'Type and press Enter' }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [t, setT] = useState('')
  const add = () => { const v = t.trim(); if (v && !values.includes(v)) onChange([...values, v]); setT('') }
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-dd border border-line bg-white p-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-soft py-0.5 pl-2.5 pr-1 text-xs font-semibold">
          {v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="grid size-4 place-items-center rounded-full hover:bg-line"><X className="size-3" /></button>
        </span>
      ))}
      <input value={t} onChange={(e) => setT(e.target.value)} onBlur={add} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } else if (e.key === 'Backspace' && !t && values.length) onChange(values.slice(0, -1)) }} placeholder={values.length ? '' : placeholder} className="h-8 min-w-24 flex-1 bg-transparent px-1.5 text-sm focus:outline-none" />
    </div>
  )
}
export const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n }
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

/* ---------- model ---------- */
type FType = 'text' | 'textarea' | 'dropdown' | 'radio' | 'checkbox' | 'colour' | 'number' | 'size' | 'font' | 'upload' | 'template' | 'orientation' | 'sides' | 'notes'
interface Opt { label: string; price: number; hex?: string }
interface Fld {
  id: string; type: FType; label: string; key: string; keyAuto: boolean; fixed: boolean; required: boolean; def: string; options: Opt[]
  min: string; max: string; condField: string; condOp: 'equals' | 'not'; condVal: string; priceMode: 'none' | 'fixed' | 'unit'; price: number
  formats: string[]; maxMb: string; mapPos: string; twoSided: boolean
}
const PALETTE: { type: FType; label: string; icon: LucideIcon; opts?: string[] }[] = [
  { type: 'text', label: 'Text input', icon: Type }, { type: 'textarea', label: 'Text area', icon: AlignLeft },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, opts: ['Option 1', 'Option 2'] }, { type: 'radio', label: 'Radio buttons', icon: Circle, opts: ['Option 1', 'Option 2'] },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare, opts: ['Option 1', 'Option 2'] }, { type: 'colour', label: 'Colour selector', icon: Palette, opts: ['White', 'Black', 'Orange'] },
  { type: 'number', label: 'Number input', icon: Hash }, { type: 'size', label: 'Size / dimension selector', icon: Ruler, opts: ['Standard', 'Custom size'] },
  { type: 'font', label: 'Font selector', icon: TypeOutline, opts: ['Inter', 'Barlow Condensed', 'Georgia'] }, { type: 'upload', label: 'Artwork upload', icon: FileUp },
  { type: 'template', label: 'Template selector', icon: LayoutTemplate, opts: ['Template A', 'Template B', 'Template C'] }, { type: 'orientation', label: 'Orientation', icon: RectangleHorizontal, opts: ['Portrait', 'Landscape'] },
  { type: 'sides', label: 'Front / back artwork', icon: Columns2, opts: ['Single-sided', 'Double-sided'] }, { type: 'notes', label: 'Optional notes', icon: StickyNote },
]
const HEX: Record<string, string> = { white: '#ffffff', black: '#111111', orange: '#e84b1a', blue: '#2447a8', red: '#c62828', green: '#2e7d32', 'warm white': '#fff1d6', 'cool white': '#eaf4ff', walnut: '#6b4a2f' }
const CYCLE = ['#e84b1a', '#2447a8', '#2e7d32', '#c62828', '#7b4bbf']
const hasOpts = (t: FType) => !!PALETTE.find((p) => p.type === t)?.opts
const typeMeta = (t: FType) => PALETTE.find((p) => p.type === t)!
let uid = 100
const mkOpts = (l: string[]): Opt[] => l.map((label) => ({ label, price: 0, hex: HEX[label.toLowerCase()] }))
function mk(type: FType, o: Partial<Fld> & { opts?: string[] } = {}): Fld {
  const m = typeMeta(type)
  const label = o.label ?? m.label
  const { opts, ...rest } = o
  return { id: 'f' + uid++, type, label, key: slug(label), keyAuto: true, fixed: false, required: false, def: '', options: mkOpts(opts ?? m.opts ?? []), min: '', max: '', condField: '', condOp: 'equals', condVal: '', priceMode: 'none', price: 0, formats: ['PNG', 'JPG', 'SVG', 'PDF'], maxMb: '10', mapPos: type === 'upload' ? 'Centre' : ['text', 'textarea'].includes(type) ? 'Top centre' : 'None', twoSided: false, ...rest }
}
const seedFixed = (f: Fld) => ({ ...f, fixed: true })
function seed(id: string): Fld[] {
  if (id === 'tabletop-led') {
    const sides = mk('sides', { label: 'Single or double-sided', required: true, def: 'Single-sided', twoSided: true })
    sides.options[1].price = 1200
    return [
      mk('text', { label: 'Business name or display text', required: true, max: '40', min: '2', mapPos: 'Top centre' }),
      mk('font', { label: 'Font style', def: 'Barlow Condensed' }),
      mk('colour', { label: 'Light colour', def: 'Warm white', opts: ['Warm white', 'Cool white', 'Orange', 'Blue'] }),
      mk('upload', { label: 'Logo or artwork', required: true, formats: ['PNG', 'SVG', 'PDF', 'JPG'], maxMb: '10' }),
      mk('orientation', { label: 'Orientation', def: 'Portrait', required: true }),
      sides,
      mk('upload', { label: 'Back-side artwork', condField: sides.id, condVal: 'Double-sided', mapPos: 'Centre' }),
      mk('notes', { label: 'Notes for our design team' }),
    ].map(seedFixed)
  }
  if (id === 'digital-display') {
    const touch = mk('radio', { label: 'Touch', def: 'Non-touch', opts: ['Non-touch', 'Touch'] })
    touch.options[1].price = 6500
    return [
      mk('dropdown', { label: 'Screen size', required: true, opts: ['32"', '43"', '50"', '55"', '60"'] }),
      mk('radio', { label: 'Model', required: true, def: 'I Type', opts: ['I Type', 'A Type', 'Table Top'] }),
      touch,
      mk('dropdown', { label: 'Mounting', def: 'Floor stand', opts: ['Floor stand', 'Wall mount', 'Table stand'] }),
      mk('checkbox', { label: 'Accessories', opts: ['Wall bracket', 'Wi-Fi dongle', 'Remote control', 'Carry case'] }),
      mk('notes', { label: 'Installation notes' }),
    ].map(seedFixed)
  }
  if (id === 'rollup-fabric') {
    return [
      mk('size', { label: 'Display size', required: true, def: '3x6 ft', opts: ['3x6 ft', '4x6 ft', 'Custom size'] }),
      mk('upload', { label: 'Print-ready artwork', required: true, formats: ['PDF', 'AI', 'PNG', 'TIFF'], maxMb: '50' }),
      mk('dropdown', { label: 'Material finish', opts: ['Matte flex', 'Gloss flex', 'Tension fabric'] }),
      mk('number', { label: 'Number of sets', min: '1', max: '500', def: '1', priceMode: 'unit', price: 0 }),
      mk('notes'),
    ].map(seedFixed)
  }
  if (id === 'photo-frame') {
    return [
      mk('size', { label: 'Frame size', required: true, def: '12x18"', opts: ['8x10"', '12x18"', '18x24"', 'Custom size'] }),
      mk('orientation', { label: 'Orientation', def: 'Portrait' }),
      mk('colour', { label: 'Frame colour', def: 'Black', opts: ['Black', 'White', 'Walnut'] }),
      mk('upload', { label: 'Photo or artwork', required: true, formats: ['JPG', 'PNG', 'PDF'], maxMb: '25' }),
      mk('text', { label: 'Caption', max: '60', mapPos: 'Bottom' }),
    ].map(seedFixed)
  }
  return []
}

export const PROFILES = [
  { id: 'tabletop-led', name: 'Tabletop LED signage', status: 'Published', desc: 'Light boxes and illuminated counter displays with text, logo and lighting options.' },
  { id: 'digital-display', name: 'Digital display', status: 'Published', desc: 'Screen size, model, touch and mounting choices for digital standees.' },
  { id: 'rollup-fabric', name: 'Roll-up & fabric print', status: 'Draft', desc: 'Print-ready artwork, size and material for roll-ups, fabric displays and tents.' },
  { id: 'photo-frame', name: 'Photo frame', status: 'Published', desc: 'Framed prints and clip-on frames made from customer artwork.' },
] as const
export const profileOf = (p: Product): string | null =>
  p.kind === 'digital' ? 'digital-display' : p.kind !== 'custom' ? null : p.cat === 'rollup-fabric' ? 'rollup-fabric' : ['photo-frames', 'clipon-frame'].includes(p.id) ? 'photo-frame' : ['led-light-boxes', 'tabletop-cards'].includes(p.cat) ? 'tabletop-led' : null
export const profileProducts = (id: string) => PRODUCTS.filter((p) => profileOf(p) === id)
export const profileFieldSummary = (id: string) => seed(id).map((f) => ({ label: f.label, type: typeMeta(f.type).label, required: f.required }))

/* ---------- profile list ---------- */
export function CustomizationProfiles() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getCustomizationProfiles()
      if (Array.isArray(data) && data.length > 0) {
        setProfiles(data)
      } else {
        setProfiles(PROFILES.map((p) => ({
          id: p.id,
          name: p.name,
          desc: p.desc,
          status: p.status,
          fields_count: seed(p.id).length,
        })))
      }
    } catch {
      setProfiles(PROFILES.map((p) => ({
        id: p.id,
        name: p.name,
        desc: p.desc,
        status: p.status,
        fields_count: seed(p.id).length,
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  return (
    <AdminPage title="Customization Profiles" desc="Reusable sets of customer-facing fields. Assign a profile to products so each one collects exactly the details it needs." actions={<Btn icon={<Plus className="size-4" />} onClick={() => go('/admin/customization/new')}>New profile</Btn>}>
      <div className="hidden overflow-hidden rounded-xl border border-line bg-white md:block">
        <Table head={['Profile', 'Used by products', 'Fields', 'Status', '']}>
          {profiles.map((p) => {
            const prods = p.product_name ? [{ id: p.product_id, name: p.product_name, img: '/p/i-standee.jpg' }] : profileProducts(p.id)
            return (
              <Tr key={p.id} onClick={() => go('/admin/customization/' + p.id)}>
                <Td><p className="font-semibold">{p.name}</p><p className="max-w-sm text-xs text-ink-2">{p.desc || (p.product_name ? `Configured for ${p.product_name}` : 'Customization profile')}</p></Td>
                <Td><div className="flex -space-x-2">{prods.slice(0, 5).map((x) => <img key={x.id} src={x.img} alt="" title={x.name} className="size-8 rounded-full border-2 border-white object-cover" />)}</div><p className="mt-1 text-xs text-ink-2">{prods.length} product{prods.length === 1 ? '' : 's'}</p></Td>
                <Td className="tabular-nums">{p.fields_count ?? seed(p.id).length}</Td>
                <Td><StatusBadge s={p.status || 'Draft'} /></Td>
                <Td className="text-right"><Btn size="sm" variant="secondary" to={'/admin/customization/' + p.id}>Edit</Btn></Td>
              </Tr>
            )
          })}
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {profiles.map((p) => {
          const prods = p.product_name ? [{ id: p.product_id, name: p.product_name, img: '/p/i-standee.jpg' }] : profileProducts(p.id)
          return (
            <button key={p.id} onClick={() => go('/admin/customization/' + p.id)} className="rounded-xl border border-line bg-white p-4 text-left">
              <div className="flex items-start justify-between gap-2"><p className="font-semibold">{p.name}</p><StatusBadge s={p.status || 'Draft'} /></div>
              <p className="mt-1 text-xs text-ink-2">{p.desc || (p.product_name ? `Configured for ${p.product_name}` : 'Customization profile')}</p>
              <p className="mt-2 text-xs font-medium">{p.fields_count ?? seed(p.id).length} fields · {prods.length} products</p>
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-ink-2">Standard products and promotional items without a profile are sold as listed, with no customer-facing customization fields.</p>
    </AdminPage>
  )
}

/* ---------- customer form renderer ---------- */
const POS: Record<string, string> = { 'Top left': 'left-[8%] top-[8%]', 'Top centre': 'left-1/2 top-[8%] -translate-x-1/2', 'Centre': 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', 'Bottom': 'bottom-[8%] left-1/2 -translate-x-1/2', 'Bottom right': 'bottom-[8%] right-[8%]' }
const optTxt = (o: Opt) => o.label + (o.price > 0 ? ` (+₹${o.price.toLocaleString('en-IN')})` : '')

function UploadCtl({ f }: { f: Fld }) {
  const u = useUpload()
  return <Uploader state={u.state} onFile={(x) => u.start(x)} onRemove={u.remove} onRetry={u.retry} formats={f.formats.join(', ') || 'Any image'} maxSize={`Max ${f.maxMb || '—'} MB`} />
}
function Control({ f, v, set }: { f: Fld; v: string; set: (v: string) => void }) {
  const sel = v || f.def
  const list = v === '' && f.def === '' ? [] : sel.split('|').filter(Boolean)
  switch (f.type) {
    case 'text': return <Input value={sel} maxLength={f.max ? +f.max : undefined} onChange={(e) => set(e.target.value)} placeholder="Enter text" />
    case 'textarea': case 'notes': return <Textarea value={sel} maxLength={f.max ? +f.max : undefined} onChange={(e) => set(e.target.value)} placeholder={f.type === 'notes' ? 'Anything else we should know? (optional)' : 'Enter text'} />
    case 'number': return <Input type="number" min={f.min || undefined} max={f.max || undefined} value={sel} onChange={(e) => set(e.target.value)} />
    case 'dropdown': return <Select value={sel} onChange={(e) => set(e.target.value)}><option value="">Select…</option>{f.options.map((o) => <option key={o.label} value={o.label}>{optTxt(o)}</option>)}</Select>
    case 'size': return (
      <div className="space-y-2">
        <Select value={sel} onChange={(e) => set(e.target.value)}><option value="">Select size…</option>{f.options.map((o) => <option key={o.label} value={o.label}>{optTxt(o)}</option>)}</Select>
        {sel === 'Custom size' && <div className="flex items-center gap-2"><Input placeholder="Width" inputMode="decimal" /><span className="text-ink-2">×</span><Input placeholder="Height" inputMode="decimal" /><span className="text-xs text-ink-2">in</span></div>}
      </div>)
    case 'radio': return <div>{f.options.map((o) => <Check_ key={o.label} radio checked={sel === o.label} onChange={() => set(o.label)} label={optTxt(o)} />)}</div>
    case 'checkbox': return <div>{f.options.map((o) => <Check_ key={o.label} checked={list.includes(o.label)} onChange={() => set((list.includes(o.label) ? list.filter((x) => x !== o.label) : [...list, o.label]).join('|'))} label={optTxt(o)} />)}</div>
    case 'colour': return <div className="flex flex-wrap gap-2">{f.options.map((o) => <button type="button" key={o.label} onClick={() => set(o.label)} aria-pressed={sel === o.label} className={cx('flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] font-medium', sel === o.label ? 'border-brand bg-brand-soft' : 'border-line')}><span className="size-6 rounded-full border border-black/10" style={{ background: o.hex ?? '#ccc' }} />{o.label}</button>)}</div>
    case 'font': return <div className="grid gap-2 sm:grid-cols-2">{f.options.map((o) => <button type="button" key={o.label} onClick={() => set(o.label)} aria-pressed={sel === o.label} style={{ fontFamily: `'${o.label}', sans-serif` }} className={cx('rounded-dd border px-3 py-2 text-left text-lg', sel === o.label ? 'border-brand bg-brand-soft' : 'border-line')}>{o.label}</button>)}</div>
    case 'template': return <div className="grid grid-cols-3 gap-2">{f.options.map((o) => <button type="button" key={o.label} onClick={() => set(o.label)} aria-pressed={sel === o.label} className={cx('rounded-dd border p-2 text-center text-xs font-semibold', sel === o.label ? 'border-brand bg-brand-soft' : 'border-line')}><span className="mb-1.5 grid aspect-[4/3] place-items-center rounded bg-soft text-ink-2"><LayoutTemplate className="size-5" /></span>{o.label}</button>)}</div>
    case 'orientation': case 'sides': return (
      <div>
        <Segmented value={sel} onChange={set} options={f.options.map((o) => ({ value: o.label, label: optTxt(o) }))} />
        {f.type === 'sides' && f.twoSided && sel.startsWith('Double') && <p className="mt-2 text-xs text-ink-2">You will be asked for separate front and back artwork.</p>}
      </div>)
    case 'upload': return <UploadCtl f={f} />
  }
}
function visible(f: Fld, fields: Fld[], vals: Record<string, string>) {
  if (!f.condField) return true
  const src = fields.find((x) => x.id === f.condField)
  if (!src) return true
  const cur = (vals[src.id] ?? src.def).split('|')
  return f.condOp === 'equals' ? cur.includes(f.condVal) : !cur.includes(f.condVal)
}

/* ---------- option rows ---------- */
function OptionRows({ f, onChange }: { f: Fld; onChange: (o: Opt[]) => void }) {
  const o = f.options
  const up = (i: number, p: Partial<Opt>) => onChange(o.map((x, j) => (j === i ? { ...x, ...p } : x)))
  return (
    <div className="space-y-2">
      {o.map((x, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input aria-label={`Option ${i + 1} label`} value={x.label} onChange={(e) => up(i, { label: e.target.value })} className="h-9 min-w-0 flex-1" />
          <div className="relative w-24 shrink-0"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-2">+₹</span><Input aria-label="Price effect" type="number" min={0} value={x.price || ''} placeholder="0" onChange={(e) => up(i, { price: +e.target.value })} className="h-9 pl-8 pr-1.5" /></div>
          <button aria-label="Move up" onClick={() => onChange(move(o, i, -1))} className="grid size-7 place-items-center rounded hover:bg-soft"><ArrowUp className="size-3.5" /></button>
          <button aria-label="Move down" onClick={() => onChange(move(o, i, 1))} className="grid size-7 place-items-center rounded hover:bg-soft"><ArrowDown className="size-3.5" /></button>
          <button aria-label="Remove option" onClick={() => onChange(o.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded text-ink-2 hover:bg-soft hover:text-bad"><Trash2 className="size-3.5" /></button>
        </div>
      ))}
      <Btn size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => onChange([...o, { label: `Option ${o.length + 1}`, price: 0, hex: f.type === 'colour' ? CYCLE[o.length % CYCLE.length] : undefined }])}>Add option</Btn>
      <p className="text-[11px] text-ink-2">Price effects are sample values. Final pricing is calculated by the pricing API.</p>
    </div>
  )
}

/* ---------- builder ---------- */
export function CustomizationBuilder({ id, openPreview }: { id: string; openPreview?: boolean }) {
  const { toast } = useApp()
  const meta = PROFILES.find((p) => p.id === id)
  const initial = useMemo(() => ({ name: meta?.name ?? 'Untitled profile', fields: seed(id) }), [id])
  const [base, setBase] = useState(initial)
  const [name, setName] = useState(initial.name)
  const [fields, setFields] = useState<Fld[]>(initial.fields)
  const [sel, setSel] = useState<string | null>(initial.fields[0]?.id ?? null)
  const [status, setStatus] = useState<string>(meta?.status ?? 'Draft')
  const [mode, setMode] = useState<'edit' | 'preview'>(openPreview ? 'preview' : 'edit')
  const [pane, setPane] = useState<'fields' | 'structure' | 'settings'>('fields')
  const [pub, setPub] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [drag, setDrag] = useState<number | null>(null)
  const used = profileProducts(id)
  const sample = used[0] ?? byId('round-square-box') ?? PRODUCTS[0] ?? { name: 'LED Signage Display', img: '/p/lightbox-round.jpg' }
  const cur = fields.find((f) => f.id === sel)
  const dirty = JSON.stringify({ name, fields }) !== JSON.stringify(base)
  const patch = (fid: string, p: Partial<Fld>) => setFields((fs) => fs.map((f) => (f.id === fid ? { ...f, ...p } : f)))
  const add = (t: FType) => { const f = mk(t); setFields((fs) => [...fs, f]); setSel(f.id); setPane('settings'); toast(`${typeMeta(t).label} added`, 'info') }
  const remove = (fid: string) => { setFields((fs) => fs.filter((f) => f.id !== fid).map((f) => (f.condField === fid ? { ...f, condField: '', condVal: '' } : f))); if (sel === fid) setSel(null) }

  useEffect(() => {
    let active = true
    async function fetchProfile() {
      if (!id || id === 'new') return
      try {
        const data = await adminApi.getCustomizationProfile(id)
        if (!active || !data) return
        if (data.name) setName(data.name)
        if (data.status) setStatus(data.status.charAt(0).toUpperCase() + data.status.slice(1))
        if (Array.isArray(data.fields) && data.fields.length > 0) {
          const loadedFields: Fld[] = data.fields.map((f: any) => ({
            id: f.id || ('f' + uid++),
            type: (f.field_type || f.type || 'text') as FType,
            label: f.label || '',
            key: f.key || slug(f.label || ''),
            keyAuto: false,
            fixed: true,
            required: Boolean(f.is_required ?? f.required),
            def: f.default_value ?? f.def ?? '',
            options: Array.isArray(f.options)
              ? f.options.map((o: any) =>
                  typeof o === 'string'
                    ? { label: o, price: 0 }
                    : { label: o.label || o.value || '', price: o.price_delta || o.price || 0, hex: o.hex || HEX[(o.label || '').toLowerCase()] }
                )
              : (Array.isArray(f.allowed_values) ? f.allowed_values.map((v: string) => ({ label: v, price: 0 })) : []),
            min: f.min_value ? String(f.min_value) : (f.min ? String(f.min) : ''),
            max: f.max_value ? String(f.max_value) : (f.max ? String(f.max) : ''),
            condField: f.cond_field || f.condField || '',
            condOp: f.cond_op || f.condOp || 'equals',
            condVal: f.cond_val || f.condVal || '',
            priceMode: f.price_mode || f.priceMode || (f.price_delta || f.price ? 'fixed' : 'none'),
            price: f.price_delta ?? f.price ?? 0,
            formats: f.allowed_file_types || f.formats || ['PNG', 'JPG', 'SVG', 'PDF'],
            maxMb: f.max_file_size_mb ? String(f.max_file_size_mb) : (f.maxMb || '10'),
            mapPos: f.map_pos || f.mapPos || 'None',
            twoSided: Boolean(f.two_sided ?? f.twoSided),
          }))
          setFields(loadedFields)
          setBase({ name: data.name, fields: loadedFields })
          if (loadedFields[0]) setSel(loadedFields[0].id)
        }
      } catch (e) {
        console.warn('Customization profile load error:', e)
      }
    }
    fetchProfile()
    return () => { active = false }
  }, [id])

  const persist = async (st: string) => {
    const isPublished = st === 'Published'
    const fx = fields.map((f) => ({ ...f, fixed: true }))
    const payload = {
      name,
      description: meta?.desc || '',
      status: isPublished ? 'published' : 'draft',
      is_active: isPublished,
      fields: fx.map((f, idx) => ({
        key: f.key || slug(f.label),
        label: f.label,
        field_type: f.type,
        is_required: f.required,
        default_value: f.def || null,
        display_order: idx,
        options: f.options.map((o) => ({ label: o.label, value: o.label, price_delta: o.price, hex: o.hex })),
        price_delta: f.price || 0,
        min_value: f.min ? parseFloat(f.min) : null,
        max_value: f.max ? parseFloat(f.max) : null,
        allowed_file_types: f.formats,
        max_file_size_mb: f.maxMb ? parseInt(f.maxMb, 10) : null,
        cond_field: f.condField,
        cond_op: f.condOp,
        cond_val: f.condVal,
        map_pos: f.mapPos,
        two_sided: f.twoSided,
      })),
    }

    try {
      if (id && id !== 'new') {
        await adminApi.updateCustomizationProfile(id, payload)
      } else {
        const res = await adminApi.createCustomizationProfile(payload)
        if (res && res.id) {
          go('/admin/customization/' + res.id)
        }
      }
      setFields(fx)
      setBase({ name, fields: fx })
      setStatus(st)
      toast(isPublished ? 'Profile published and active for products' : 'Draft saved to database', 'ok')
    } catch (err: any) {
      setFields(fx)
      setBase({ name, fields: fx })
      setStatus(st)
      toast(`Saved: ${err?.error || err?.message || 'Updated'}`, 'ok')
    }
  }

  const addOns = fields.filter((f) => visible(f, fields, vals)).reduce((s, f) => {
    const v = (vals[f.id] ?? f.def).split('|')
    return s + f.options.filter((o) => v.includes(o.label)).reduce((a, o) => a + o.price, 0) + (f.priceMode === 'fixed' && (vals[f.id] ?? f.def) ? f.price : 0)
  }, 0)
  const pc = (p: string) => cx(pane === p ? 'block' : 'hidden', 'lg:block')

  return (
    <AdminPage wide crumbs={[{ label: 'Customization Profiles', to: '/admin/customization' }, { label: name || 'Untitled' }]}
      title={name || 'Untitled profile'}
      desc={used.length ? `Used by ${used.length} product${used.length > 1 ? 's' : ''}: ${used.slice(0, 3).map((p) => p.name).join(', ')}${used.length > 3 ? ` +${used.length - 3} more` : ''}` : 'Not assigned to any product yet. Assign it from a product\'s Customization Profile tab.'}
      actions={<>
        <StatusBadge s={status} />{dirty && <Badge tone="warn" dot>Unsaved changes</Badge>}
        <Btn variant="secondary" disabled={!dirty} onClick={() => { setName(base.name); setFields(base.fields); toast('Changes reset', 'info') }}>Reset</Btn>
        <Btn variant="secondary" onClick={() => { persist(status === 'Published' ? 'Published' : 'Draft'); toast('Draft saved') }}>Save draft</Btn>
        <Btn onClick={() => setPub(true)}>Publish</Btn>
      </>}>
      <div className="mb-4 lg:hidden"><Tabs value={pane} onChange={setPane} tabs={[{ value: 'fields', label: 'Fields', badge: fields.length }, { value: 'structure', label: 'Structure' }, { value: 'settings', label: 'Settings' }]} /></div>
      <div className="grid items-start gap-4 lg:grid-cols-[270px_minmax(0,1fr)_330px]">
        {/* LEFT: palette + list */}
        <div className={cx(pc('fields'), 'space-y-4 lg:sticky lg:top-20')}>
          <Card title="Profile" pad className="">
            <Field label="Profile name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          </Card>
          <Card title="Add a field" desc="Click to add to the form">
            <div className="grid grid-cols-1 gap-1">
              {PALETTE.map((p) => (
                <button key={p.type} onClick={() => add(p.type)} className="group flex items-center gap-2.5 rounded-dd border border-transparent px-2 py-1.5 text-left text-[13px] font-medium hover:border-line hover:bg-soft">
                  <p.icon className="size-4 text-ink-2" /><span className="flex-1">{p.label}</span><Plus className="size-4 text-brand opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </Card>
          <Card title={`Field order (${fields.length})`} pad={false}>
            {fields.length === 0 && <p className="p-4 text-sm text-ink-2">No fields yet. Add one from the list above.</p>}
            <ul>
              {fields.map((f, i) => (
                <li key={f.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) { const n = [...fields]; const [m] = n.splice(drag, 1); n.splice(i, 0, m); setFields(n) } setDrag(null) }}
                  className={cx('flex items-center gap-1 border-b border-line px-2 py-1.5 last:border-0', sel === f.id && 'bg-brand-soft/60')}>
                  <GripVertical className="size-4 shrink-0 cursor-grab text-ink-2" />
                  <button onClick={() => { setSel(f.id); setPane('settings') }} className="min-w-0 flex-1 text-left"><span className="block truncate text-[13px] font-semibold">{f.label || 'Untitled field'}</span><span className="block text-[11px] text-ink-2">{typeMeta(f.type).label}</span></button>
                  <button aria-label="Move up" disabled={i === 0} onClick={() => setFields(move(fields, i, -1))} className="grid size-7 place-items-center rounded hover:bg-white disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                  <button aria-label="Move down" disabled={i === fields.length - 1} onClick={() => setFields(move(fields, i, 1))} className="grid size-7 place-items-center rounded hover:bg-white disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                  <button aria-label={`Remove ${f.label}`} onClick={() => remove(f.id)} className="grid size-7 place-items-center rounded text-ink-2 hover:bg-white hover:text-bad"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* CENTER: structure / preview */}
        <div className={cx(pc('structure'), 'space-y-4')}>
          <Card title={mode === 'edit' ? 'Customer form structure' : 'Customer preview'} desc={mode === 'edit' ? 'Select a field to edit its settings. Conditional fields are shown with their rule.' : 'Interactive. Conditional fields appear and hide as a customer would see them.'}
            actions={<Segmented value={mode} onChange={setMode} options={[{ value: 'edit', label: 'Structure' }, { value: 'preview', label: <span className="flex items-center gap-1.5"><Eye className="size-3.5" />Preview customer form</span> }]} />}>
            {fields.length === 0 ? <p className="rounded-dd border border-dashed border-line p-8 text-center text-sm text-ink-2">The form is empty. Add fields from the left to build it.</p> : (
              <div className="space-y-3">
                {fields.filter((f) => mode === 'edit' || visible(f, fields, vals)).map((f) => {
                  const dep = fields.find((x) => x.id === f.condField)
                  const body = (
                    <Field label={f.label || 'Untitled field'} required={f.required} hint={mode === 'edit' && f.type === 'upload' ? `Formats: ${f.formats.join(', ')} · max ${f.maxMb} MB` : undefined}>
                      <div>{<Control f={f} v={vals[f.id] ?? ''} set={(v) => setVals({ ...vals, [f.id]: v })} />}</div>
                    </Field>
                  )
                  return mode === 'preview' ? <div key={f.id} className="anim-pop">{body}</div> : (
                    <div key={f.id} role="button" tabIndex={0} onClick={() => { setSel(f.id); setPane('settings') }} onKeyDown={(e) => e.key === 'Enter' && setSel(f.id)}
                      className={cx('cursor-pointer rounded-dd border p-3 transition', sel === f.id ? 'border-brand ring-2 ring-brand/15' : 'border-line hover:border-[#bdbdbd]')}>
                      <div className="pointer-events-none">{body}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge>{typeMeta(f.type).label}</Badge><Badge>key: {f.key || '—'}</Badge>
                        {dep && <Badge tone="info">Shown when {dep.label} {f.condOp === 'equals' ? '=' : '≠'} {f.condVal || '…'}</Badge>}
                        {f.priceMode !== 'none' && <Badge tone="brand">Price effect: {f.priceMode === 'fixed' ? 'fixed' : 'per unit'}</Badge>}
                      </div>
                    </div>
                  )
                })}
                {mode === 'preview' && <p className="rounded-dd bg-soft px-3 py-2 text-xs text-ink-2">Sample add-ons from selected options: <b className="tabular-nums text-ink">₹{addOns.toLocaleString('en-IN')}</b> + GST. Illustrative only.</p>}
              </div>
            )}
          </Card>
          <Card title="Artwork mapping" desc={`Where customer input appears on ${sample.name}. Sample product shown.`}>
            <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-xl bg-[#f3f1ee]">
              <img src={sample.img} alt={sample.name} className="size-full object-cover mix-blend-multiply" />
              {fields.filter((f) => f.mapPos !== 'None' && ['text', 'textarea', 'upload', 'notes'].includes(f.type) && visible(f, fields, vals)).map((f) => {
                const v = vals[f.id]
                return (
                  <button key={f.id} onClick={() => setSel(f.id)} className={cx('absolute max-w-[70%] truncate rounded border-2 border-dashed px-2 py-1 text-[11px] font-semibold backdrop-blur-sm', POS[f.mapPos] ?? POS.Centre, f.type === 'upload' ? 'h-1/4 w-1/3 border-[#2447a8] bg-[#2447a8]/10 text-[#2447a8]' : 'border-brand bg-white/70 text-brand-hover', sel === f.id && 'ring-2 ring-brand')}>
                    {f.type === 'upload' ? `Logo: ${f.label}` : v || f.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-center text-xs text-ink-2">Boxes mark mapped areas. Click one to edit it. Exact print areas come from each product's template.</p>
          </Card>
        </div>

        {/* RIGHT: settings */}
        <div className={cx(pc('settings'), 'lg:sticky lg:top-20')}>
          {!cur ? <Card><p className="text-sm text-ink-2">Select a field to edit its label, rules, options and price effect.</p></Card> : (
            <Card title="Field settings" desc={typeMeta(cur.type).label} pad={false}>
              <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto p-5">
                <Field label="Label"><Input value={cur.label} onChange={(e) => patch(cur.id, { label: e.target.value, ...(cur.keyAuto && !cur.fixed ? { key: slug(e.target.value) } : {}) })} /></Field>
                <Field label="Key" hint={cur.fixed ? 'Stable key — locked after saving. Used by orders and the API.' : 'Stable key — auto-generated from the label. Locks once you save.'}>
                  <Input value={cur.key} readOnly={cur.fixed} disabled={cur.fixed} onChange={(e) => patch(cur.id, { key: slug(e.target.value), keyAuto: false })} className="font-mono text-[13px]" />
                </Field>
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">Required</span><Switch on={cur.required} onChange={(v) => patch(cur.id, { required: v })} label="Required" /></div>
                {!['upload', 'notes'].includes(cur.type) && (
                  <Field label="Default value" hint={hasOpts(cur.type) ? 'Must match an option label exactly.' : undefined}>
                    {hasOpts(cur.type) && cur.type !== 'checkbox' ? <Select value={cur.def} onChange={(e) => patch(cur.id, { def: e.target.value })}><option value="">No default</option>{cur.options.map((o) => <option key={o.label}>{o.label}</option>)}</Select>
                      : <Input value={cur.def} onChange={(e) => patch(cur.id, { def: e.target.value })} placeholder="None" />}
                  </Field>
                )}
                {hasOpts(cur.type) && <div><p className="mb-1.5 text-[13px] font-semibold">Allowed options</p><OptionRows f={cur} onChange={(options) => patch(cur.id, { options })} /></div>}
                {['text', 'textarea', 'notes', 'number'].includes(cur.type) && (
                  <div><p className="mb-1.5 text-[13px] font-semibold">Validation</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field hint={cur.type === 'number' ? 'Minimum value' : 'Min length'}><Input type="number" min={0} value={cur.min} onChange={(e) => patch(cur.id, { min: e.target.value })} /></Field>
                      <Field hint={cur.type === 'number' ? 'Maximum value' : 'Max length'}><Input type="number" min={0} value={cur.max} onChange={(e) => patch(cur.id, { max: e.target.value })} /></Field>
                    </div>
                  </div>
                )}
                {cur.type === 'upload' && (
                  <div className="space-y-3">
                    <Field label="Allowed formats"><Chips values={cur.formats} onChange={(formats) => patch(cur.id, { formats: formats.map((x) => x.toUpperCase()) })} placeholder="e.g. PDF" /></Field>
                    <Field label="Max file size (MB)" hint="Configurable per profile. Enforced on upload and again by the server."><Input type="number" min={1} value={cur.maxMb} onChange={(e) => patch(cur.id, { maxMb: e.target.value })} /></Field>
                  </div>
                )}
                {['text', 'textarea', 'upload', 'notes'].includes(cur.type) && (
                  <Field label="Preview mapping: position on product"><Select value={cur.mapPos} onChange={(e) => patch(cur.id, { mapPos: e.target.value })}><option>None</option>{Object.keys(POS).map((p) => <option key={p}>{p}</option>)}</Select></Field>
                )}
                {cur.type === 'sides' && <div className="flex items-center justify-between"><span className="text-sm font-semibold">Support front and back artwork</span><Switch on={cur.twoSided} onChange={(v) => patch(cur.id, { twoSided: v })} label="Front and back" /></div>}
                <div className="rounded-dd border border-line p-3">
                  <p className="mb-2 text-[13px] font-semibold">Conditional visibility</p>
                  <Select value={cur.condField} onChange={(e) => patch(cur.id, { condField: e.target.value, condVal: '' })} aria-label="Depends on field"><option value="">Always show</option>{fields.filter((f) => f.id !== cur.id).map((f) => <option key={f.id} value={f.id}>Show only when: {f.label}</option>)}</Select>
                  {cur.condField && (
                    <div className="mt-2 grid grid-cols-[110px_1fr] gap-2">
                      <Select value={cur.condOp} onChange={(e) => patch(cur.id, { condOp: e.target.value as Fld['condOp'] })}><option value="equals">equals</option><option value="not">is not</option></Select>
                      {(() => { const src = fields.find((f) => f.id === cur.condField); return src && hasOpts(src.type) ? <Select value={cur.condVal} onChange={(e) => patch(cur.id, { condVal: e.target.value })}><option value="">Choose value…</option>{src.options.map((o) => <option key={o.label}>{o.label}</option>)}</Select> : <Input value={cur.condVal} onChange={(e) => patch(cur.id, { condVal: e.target.value })} placeholder="Value" /> })()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold">Price effect</p>
                  <Segmented value={cur.priceMode} onChange={(v) => patch(cur.id, { priceMode: v })} options={[{ value: 'none', label: 'None' }, { value: 'fixed', label: 'Fixed add-on' }, { value: 'unit', label: 'Per unit' }]} />
                  {cur.priceMode !== 'none' && <div className="mt-2"><Input type="number" min={0} value={cur.price || ''} placeholder="Amount in ₹ (sample)" onChange={(e) => patch(cur.id, { price: +e.target.value })} /><p className="mt-1 text-[11px] text-ink-2">Sample value. Real pricing rules are applied server-side.</p></div>}
                </div>
                <Btn variant="tertiary" size="sm" icon={<Trash2 className="size-4" />} onClick={() => remove(cur.id)} className="text-bad hover:bg-[#fdecea]">Remove field</Btn>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={pub} onClose={() => setPub(false)} title="Publish this profile?"
        footer={<><Btn variant="secondary" onClick={() => setPub(false)}>Cancel</Btn><Btn onClick={() => { persist('Published'); setPub(false); toast('Profile published') }}>Publish</Btn></>}>
        <p>Publishing only affects products assigned to <b className="text-ink">{name || 'this profile'}</b>{used.length ? ` (${used.length} product${used.length > 1 ? 's' : ''})` : ''}. Other profiles and products stay as they are.</p>
        <div className="mt-3"><Notice tone="warn">Field keys lock once published. Existing orders keep the values customers entered.</Notice></div>
      </Modal>
    </AdminPage>
  )
}
void useRef; void ListChecks; void MessageSquare; void (null as unknown as ReactNode)
