import { useState, type ReactNode } from 'react'
import { Boxes, ChevronDown, IndianRupee, Package, Users } from 'lucide-react'
import { Accordion, Badge, Breadcrumbs, Btn, Check_, Container, Drawer, EmptyState, ErrorState, Field, Input, Modal, Notice, Price, ProductCard, Qty, Segmented, Select, Skeleton, Switch, Tabs, Textarea, Uploader, cx, type UploadState } from '../ui'
import { Link, useApp } from '../store'
import { CATS, PRODUCTS } from '../data'

const SECTIONS = ['Foundations', 'Buttons', 'Forms', 'Navigation', 'Feedback', 'Overlays', 'Upload', 'Commerce', 'Admin']
const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <section id={title.toLowerCase()} className="scroll-mt-24 border-t border-line py-10">
    <h2 className="mb-6 text-4xl font-bold">{title}</h2>{children}
  </section>
)
const Sub = ({ t, children, className }: { t: string; children: ReactNode; className?: string }) => (
  <div className="mb-8"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-2">{t}</p><div className={className}>{children}</div></div>
)

const COLORS: [string, string, string][] = [
  ['brand', '#E84B1A', 'bg-brand'], ['brand-hover', '#C23A10', 'bg-brand-hover'], ['brand-soft', '#FFF0EB', 'bg-brand-soft'], ['navy', '#1A1A2E', 'bg-navy'], ['navy-2', '#242442', 'bg-navy-2'],
  ['ink', '#212121', 'bg-ink'], ['ink-2', '#616161', 'bg-ink-2'], ['line', '#E0E0E0', 'bg-line'], ['soft', '#F7F7F8', 'bg-soft'], ['ok', '#2E7D32', 'bg-ok'], ['warn', '#F57C00', 'bg-warn'], ['bad', '#C62828', 'bg-bad'],
]
const idle: UploadState = { status: 'idle' }
const states: UploadState[] = [idle, { status: 'uploading', progress: 50, name: 'logo.png' }, { status: 'done', name: 'logo.png', url: '/logo-orange.png', size: '84 KB' }, { status: 'error', name: 'huge.pdf', message: 'File is larger than this product allows.' }]
const noop = () => {}

export default function DesignSystem() {
  const { toast } = useApp()
  const [tab, setTab] = useState('a')
  const [seg, setSeg] = useState('x')
  const [sw, setSw] = useState(true)
  const [chk, setChk] = useState(true)
  const [rad, setRad] = useState('a')
  const [q, setQ] = useState(1)
  const [col, setCol] = useState(0)
  const [drawer, setDrawer] = useState(false)
  const [modal, setModal] = useState(false)
  const [fOpen, setFOpen] = useState(true)
  const [price, setPrice] = useState(40)
  const [page, setPage] = useState(2)

  return (
    <Container className="py-10 sm:py-14">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Living style guide</p>
      <h1 className="mt-2 text-6xl font-bold sm:text-7xl">DisplayDelight design system</h1>
      <nav className="sticky top-0 z-20 -mx-4 mt-6 border-b border-line bg-white/95 px-4 backdrop-blur" aria-label="Sections">
        <div className="hide-scroll flex gap-1 overflow-x-auto py-2">{SECTIONS.map((s) => <a key={s} href={`#/design`} onClick={(e) => { e.preventDefault(); document.getElementById(s.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }) }} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink-2 hover:bg-brand-soft hover:text-brand">{s}</a>)}</div>
      </nav>

      <Sec title="Foundations">
        <Sub t="Colour" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map(([n, hex, c]) => <div key={n} className="overflow-hidden rounded-lg border border-line"><div className={cx('h-16', c)} /><div className="p-2.5"><p className="text-sm font-semibold">{n}</p><p className="text-xs tabular-nums text-ink-2">{hex}</p></div></div>)}
        </Sub>
        <Sub t="Type scale" className="space-y-3">
          {[['Display XL', 'text-8xl'], ['Display L', 'text-6xl'], ['H2', 'text-5xl'], ['H3', 'text-4xl'], ['H4', 'text-2xl']].map(([n, c]) => <div key={n} className="flex items-baseline gap-4 border-b border-line pb-2"><span className="w-24 shrink-0 text-xs text-ink-2">{n}</span><span className={cx('font-display font-bold uppercase leading-none', c)}>Light Up. Stand Out.</span></div>)}
          <p className="text-[17px]">Body large (Inter 17) — Digital signage that sells for you.</p>
          <p className="text-[15px]">Body (Inter 15) — Illuminated displays, standees and customised signage.</p>
          <p className="text-[13px] text-ink-2">Caption (Inter 13) — supporting text and helper hints.</p>
        </Sub>
        <div className="grid gap-8 md:grid-cols-3">
          <Sub t="Spacing" className="space-y-1.5">{[4, 8, 12, 16, 24, 32, 48].map((s) => <div key={s} className="flex items-center gap-3 text-xs"><span className="w-8 text-ink-2">{s}</span><span className="h-3 rounded-sm bg-brand" style={{ width: s * 2 }} /></div>)}</Sub>
          <Sub t="Radius" className="flex gap-3">{[['rounded-md', '6'], ['rounded-dd', '8'], ['rounded-xl', '12'], ['rounded-full', 'full']].map(([c, n]) => <div key={n} className="text-center text-xs"><div className={cx('size-14 border-2 border-brand bg-brand-soft', c)} />{n}</div>)}</Sub>
          <Sub t="Shadow" className="flex gap-4">{[['shadow-sm', 'sm'], ['shadow-card', 'card'], ['shadow-pop', 'pop']].map(([c, n]) => <div key={n} className="text-center text-xs"><div className={cx('size-16 rounded-lg bg-white', c)} />{n}</div>)}</Sub>
        </div>
        <Sub t="12-column grid">
          <div className="grid grid-cols-12 gap-1">{Array.from({ length: 12 }, (_, i) => <div key={i} className="h-10 rounded-sm bg-brand-soft" />)}</div>
          <p className="mt-2 text-sm text-ink-2">Design targets: 1440 (12 col, 24 gutter, 1320 max container), 768 (8 col), 390 (4 col, 16 margin).</p>
        </Sub>
      </Sec>

      <Sec title="Buttons">
        <Sub t="Variants" className="flex flex-wrap gap-3"><Btn>Primary</Btn><Btn variant="secondary">Secondary</Btn><Btn variant="tertiary">Tertiary</Btn><Btn variant="danger">Destructive</Btn><Btn variant="dark">Dark</Btn></Sub>
        <Sub t="Sizes" className="flex flex-wrap items-center gap-3"><Btn size="sm">Small</Btn><Btn size="md">Medium</Btn><Btn size="lg">Large</Btn></Sub>
        <Sub t="States" className="flex flex-wrap gap-3"><Btn loading>Loading</Btn><Btn disabled>Disabled</Btn><Btn variant="secondary" disabled>Disabled</Btn></Sub>
      </Sec>

      <Sec title="Forms">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Default"><Input placeholder="Placeholder" /></Field>
          <Field label="Focus (click to see)" hint="Orange ring on focus"><Input defaultValue="Focus me" /></Field>
          <Field label="Error" error="This field is required"><Input invalid defaultValue="Bad value" /></Field>
          <Field label="Disabled"><Input disabled defaultValue="Disabled" /></Field>
          <Field label="Select"><Select><option>Option one</option><option>Option two</option></Select></Field>
          <Field label="Textarea"><Textarea placeholder="Notes" /></Field>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <Sub t="Checkbox / radio"><Check_ checked={chk} onChange={() => setChk(!chk)} label="Checkbox" /><Check_ checked={rad === 'a'} radio onChange={() => setRad('a')} label="Radio A" /><Check_ checked={rad === 'b'} radio onChange={() => setRad('b')} label="Radio B" /><Check_ checked={false} disabled onChange={noop} label="Disabled" /></Sub>
          <Sub t="Switch / segmented / qty" className="space-y-4"><Switch on={sw} onChange={setSw} label="Switch" /><Segmented value={seg} onChange={setSeg} options={[{ value: 'x', label: 'Grid' }, { value: 'y', label: 'List' }]} /><div><Qty value={q} onChange={setQ} /></div></Sub>
          <Sub t="Colour selector" className="flex gap-2.5">{['#212121', '#ffffff', '#E84B1A', '#1A1A2E'].map((c, i) => <button key={c} aria-label={`Colour ${c}`} aria-pressed={col === i} onClick={() => setCol(i)} className={cx('size-9 rounded-full border border-line ring-offset-2 transition', col === i && 'ring-2 ring-brand')} style={{ background: c }} />)}</Sub>
        </div>
      </Sec>

      <Sec title="Navigation">
        <Sub t="Tabs"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'a', label: 'Overview' }, { value: 'b', label: 'Specs' }, { value: 'c', label: 'Reviews', badge: 3 }]} /></Sub>
        <Sub t="Accordion"><Accordion items={[['What is an accordion?', 'Expandable content.'], ['Another item', 'More content.']]} /></Sub>
        <Sub t="Breadcrumb"><Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: 'Product' }]} /></Sub>
        <Sub t="Pagination" className="flex items-center gap-1.5">{[1, 2, 3, 4].map((n) => <button key={n} aria-current={page === n} onClick={() => setPage(n)} className={cx('size-10 rounded-dd border text-sm font-semibold', page === n ? 'border-brand bg-brand text-white' : 'border-line hover:border-ink')}>{n}</button>)}</Sub>
      </Sec>

      <Sec title="Feedback">
        <Sub t="Badges" className="flex flex-wrap gap-2">{(['ok', 'warn', 'bad', 'info', 'brand', 'neutral', 'navy'] as const).map((t) => <Badge key={t} tone={t} dot>{t}</Badge>)}</Sub>
        <Sub t="Notices" className="grid gap-3 md:grid-cols-2">{(['info', 'ok', 'warn', 'bad'] as const).map((t) => <Notice key={t} tone={t} title={`${t} notice`}>Supporting message text.</Notice>)}</Sub>
        <Sub t="Skeleton" className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" /></Sub>
        <div className="grid gap-4 md:grid-cols-2"><EmptyState icon={<Package className="size-6" />} title="Empty state" text="Nothing here yet." action={<Btn size="sm">Action</Btn>} /><ErrorState onRetry={noop} /></div>
        <Sub t="Toast" className="mt-8 flex gap-3"><Btn variant="secondary" onClick={() => toast('Saved successfully')}>Success toast</Btn><Btn variant="secondary" onClick={() => toast('Something failed', 'err')}>Error toast</Btn></Sub>
      </Sec>

      <Sec title="Overlays">
        <div className="flex gap-3"><Btn variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Btn><Btn variant="secondary" onClick={() => setModal(true)}>Open modal</Btn></div>
        <Drawer open={drawer} onClose={() => setDrawer(false)} title="Drawer"><p className="p-5 text-sm text-ink-2">Drawer content slides in from the right and bottom on mobile when configured.</p></Drawer>
        <Modal open={modal} onClose={() => setModal(false)} title="Modal" footer={<Btn onClick={() => setModal(false)}>Done</Btn>}>Modal body content.</Modal>
      </Sec>

      <Sec title="Upload">
        <div className="grid gap-4 md:grid-cols-2">{states.map((s) => <div key={s.status}><p className="mb-1.5 text-xs font-bold uppercase text-ink-2">{s.status}</p><Uploader state={s} onFile={noop} onRemove={noop} onRetry={noop} /></div>)}</div>
      </Sec>

      <Sec title="Commerce">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <Sub t="Product card"><ProductCard p={PRODUCTS[0]} /></Sub>
            <Sub t="Price" className="space-y-2"><Price p={PRODUCTS[0]} size="lg" /><Price p={PRODUCTS[0]} /><Price p={PRODUCTS[2]} /></Sub>
          </div>
          <div className="space-y-6">
            <Sub t="Category card"><Link to={`/shop/${CATS[0].id}`} className="group block max-w-xs overflow-hidden rounded-xl border border-line"><img src={CATS[0].img} alt="" className="aspect-[16/10] w-full bg-[#f3f1ee] object-cover mix-blend-multiply" /><div className="p-4"><h3 className="text-2xl font-bold group-hover:text-brand">{CATS[0].name}</h3><p className="text-sm text-ink-2">{CATS[0].blurb}</p></div></Link></Sub>
            <Sub t="Filter group"><div className="max-w-xs rounded-xl border border-line p-4">
              <button onClick={() => setFOpen(!fOpen)} aria-expanded={fOpen} className="flex w-full items-center justify-between font-semibold">Filter group<ChevronDown className={cx('size-4 transition', fOpen && 'rotate-180')} /></button>
              {fOpen && <div className="mt-2"><Check_ checked={chk} onChange={() => setChk(!chk)} label="Checkbox option" count={12} /><Check_ checked={rad === 'a'} radio onChange={() => setRad('a')} label="Radio option" count={4} />
                <label className="mt-3 block text-xs font-semibold text-ink-2">Max price: ₹{(price * 1000).toLocaleString('en-IN')}<input type="range" min={5} max={100} value={price} onChange={(e) => setPrice(+e.target.value)} className="mt-1 w-full accent-[#E84B1A]" /></label></div>}
            </div></Sub>
          </div>
        </div>
      </Sec>

      <Sec title="Admin">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Revenue', '₹0', IndianRupee], ['Orders', '0', Package], ['Customers', '0', Users], ['Products', String(PRODUCTS.length), Boxes]].map(([l, v, I]) => { const Ic = I as typeof Users; return <div key={l as string} className="rounded-xl border border-line bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-ink-2">{l as string}</p><span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand"><Ic className="size-4" /></span></div><p className="mt-2 text-3xl font-bold tabular-nums">{v as string}</p><p className="text-xs text-ink-2">Sample value</p></div> })}
        </div>
        <div className="mt-6 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-soft text-left text-xs uppercase tracking-wider text-ink-2"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr></thead>
            <tbody>{[['DD-1042', 'A. K****', 'brand', 'In production'], ['DD-1031', 'S. M****', 'ok', 'Delivered']].map(([a, b, t, s]) => <tr key={a} className="border-t border-line hover:bg-soft/60"><td className="p-3 font-semibold">{a}</td><td className="p-3">{b}</td><td className="p-3"><Badge tone={t as 'ok'} dot>{s}</Badge></td><td className="p-3 text-right tabular-nums">Sample</td></tr>)}</tbody>
          </table>
        </div>
      </Sec>
    </Container>
  )
}
