import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from 'lucide-react'
import { CATS, FILTERS_BY_CAT, PRODUCTS, catName, inr, optionsFor, toArr, byId, type FilterDef, type Product } from '../data'
import { Link, go, useApp, resolveAssetUrl } from '../store'
import { catalogueApi } from '../api'
import { Badge, Breadcrumbs, Btn, Check_, Container, Drawer, EmptyState, ErrorState, Input, ProductCard, Select, Skeleton, cx } from '../ui'

type Sel = Record<string, string[]>
const PAGE = 9

/* Reusable, metadata-driven filter group renderer: accepts any FilterDef from the API. */
function FilterGroup({ def, products, sel, onToggle }: { def: FilterDef; products: Product[]; sel: string[]; onToggle: (v: string) => void }) {
  const [open, setOpen] = useState(true)
  const opts = optionsFor(def, products)
  if (!opts.length) return null
  return (
    <div className="border-b border-line py-3.5">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between text-left group">
        <span className="flex items-center gap-2 text-sm font-bold text-ink group-hover:text-brand transition">
          {def.label}
          {sel.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">{sel.length}</span>}
        </span>
        <ChevronDown className={cx('size-4 text-ink-2 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-2.5 max-h-56 space-y-1 overflow-y-auto pr-1">{opts.map((o) => <Check_ key={o.value} radio={def.type === 'radio'} checked={sel.includes(o.value)} onChange={() => onToggle(o.value)} label={o.value} count={o.count} />)}</div>}
    </div>
  )
}

function PriceGroup({ price, setPrice, max }: { price: [number, number]; setPrice: (p: [number, number]) => void; max: number }) {
  const [lo, hi] = price
  const [activeThumb, setActiveThumb] = useState<'min' | 'max'>('min')
  const safeMax = max > 0 ? max : 500000
  const minPercent = Math.max(0, Math.min(100, (lo / safeMax) * 100))
  const maxPercent = Math.max(0, Math.min(100, (hi / safeMax) * 100))
  return (
    <div className="border-b border-line py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-ink">Price Range</span>
        {(lo > 0 || hi < safeMax) && (
          <button onClick={() => setPrice([0, safeMax])} className="text-xs font-semibold text-brand hover:underline">Reset</button>
        )}
      </div>
      <div className="dual-slider-container mt-2">
        <div className="slider-track-bg" />
        <div className="slider-track-fill" style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }} />
        <input
          aria-label="Minimum price"
          type="range"
          min={0}
          max={safeMax}
          step={1000}
          value={lo}
          style={{ zIndex: activeThumb === 'min' ? 25 : 20 }}
          onMouseDown={() => setActiveThumb('min')}
          onTouchStart={() => setActiveThumb('min')}
          onChange={(e) => {
            setActiveThumb('min')
            setPrice([Math.min(+e.target.value, hi - 1000), hi])
          }}
        />
        <input
          aria-label="Maximum price"
          type="range"
          min={0}
          max={safeMax}
          step={1000}
          value={hi}
          style={{ zIndex: activeThumb === 'max' ? 25 : 20 }}
          onMouseDown={() => setActiveThumb('max')}
          onTouchStart={() => setActiveThumb('max')}
          onChange={(e) => {
            setActiveThumb('max')
            setPrice([lo, Math.max(+e.target.value, lo + 1000)])
          }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex-1">
          <label htmlFor="min-price-input" className="block text-[11px] font-semibold text-ink-2 mb-1">Min Price</label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-xs font-bold text-ink-2">₹</span>
            <input
              id="min-price-input"
              type="text"
              inputMode="numeric"
              aria-label="Min price"
              value={lo ? lo.toLocaleString('en-IN') : '0'}
              onChange={(e) => {
                const num = Number(e.target.value.replace(/\D/g, '')) || 0
                setPrice([Math.min(num, hi), hi])
              }}
              className="w-full h-8.5 pl-6 pr-2.5 text-xs font-semibold text-ink rounded-lg border border-line bg-soft/30 hover:border-ink-2/40 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand focus:outline-none transition"
            />
          </div>
        </div>
        <div className="pt-5 text-ink-2 font-bold select-none">–</div>
        <div className="flex-1">
          <label htmlFor="max-price-input" className="block text-[11px] font-semibold text-ink-2 mb-1">Max Price</label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-xs font-bold text-ink-2">₹</span>
            <input
              id="max-price-input"
              type="text"
              inputMode="numeric"
              aria-label="Max price"
              value={hi ? hi.toLocaleString('en-IN') : safeMax.toLocaleString('en-IN')}
              onChange={(e) => {
                const num = Number(e.target.value.replace(/\D/g, '')) || 0
                setPrice([lo, Math.min(Math.max(num, lo), safeMax)])
              }}
              className="w-full h-8.5 pl-6 pr-2.5 text-xs font-semibold text-ink rounded-lg border border-line bg-soft/30 hover:border-ink-2/40 focus:border-brand focus:bg-white focus:ring-1 focus:ring-brand focus:outline-none transition"
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-2">Commercial displays priced on request remain visible unless excluded.</p>
    </div>
  )
}

function FilterPanel({ defs, products, sel, setSel, price, setPrice, maxPrice }: { defs: FilterDef[]; products: Product[]; sel: Sel; setSel: (s: Sel) => void; price: [number, number]; setPrice: (p: [number, number]) => void; maxPrice: number }) {
  const toggle = (def: FilterDef, v: string) => {
    const cur = sel[def.key] ?? []
    const next = def.type === 'radio' ? (cur.includes(v) ? [] : [v]) : cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
    setSel({ ...sel, [def.key]: next })
  }
  return (
    <div>
      <PriceGroup price={price} setPrice={setPrice} max={maxPrice} />
      {defs.map((d) => <FilterGroup key={d.key} def={d} products={products} sel={sel[d.key] ?? []} onToggle={(v) => toggle(d, v)} />)}
    </div>
  )
}

export default function Shop({ cat, q = '' }: { cat?: string; q?: string }) {
  const { recent, products, categories, isLoadingCatalogue } = useApp()
  const hashQ = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const state = hashQ.get('state')
  const [dynamicDefs, setDynamicDefs] = useState<FilterDef[] | null>(null)

  const baseList = products && products.length > 0 ? products : PRODUCTS
  const calculatedMax = useMemo(() => {
    const highest = Math.max(0, ...baseList.map((p) => p.price || 0))
    return Math.max(500000, Math.ceil(highest / 50000) * 50000)
  }, [baseList])
  const PMAX = calculatedMax

  useEffect(() => {
    let active = true
    const fetchFilters = async () => {
      try {
        let serverFilters: any[] = []
        if (cat && cat !== 'all') {
          try {
            serverFilters = await catalogueApi.getCategoryFilters(cat)
          } catch {
            serverFilters = await catalogueApi.getFilters(cat)
          }
        } else {
          serverFilters = await catalogueApi.getFilters()
        }
        if (active && Array.isArray(serverFilters) && serverFilters.length > 0) {
          setDynamicDefs(serverFilters.map((sf: any) => ({
            key: sf.key,
            label: sf.label,
            type: (sf.filter_type || sf.type) === 'radio' ? 'radio' : 'checkbox',
          })))
        }
      } catch {
        // Fallback to static definitions
      }
    }
    fetchFilters()
    return () => { active = false }
  }, [cat])

  const defs = dynamicDefs ?? (FILTERS_BY_CAT[cat ?? 'all'] ?? FILTERS_BY_CAT.all)
  const [sel, setSel] = useState<Sel>(() => Object.fromEntries(defs.map((d) => [d.key, hashQ.get(d.key) ? [hashQ.get(d.key)!] : []])))
  const [price, setPrice] = useState<[number, number]>([0, PMAX])

  // Sync PMAX changes if catalogue loads after initial mount
  useEffect(() => {
    setPrice((prev) => (prev[1] === 60000 || prev[1] < PMAX ? [prev[0], PMAX] : prev))
  }, [PMAX])

  const [sort, setSort] = useState('featured')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(state === 'loading')
  const [drawer, setDrawer] = useState(false)
  const [dSel, setDSel] = useState<Sel>(sel)
  const [dPrice, setDPrice] = useState<[number, number]>(price)
  const [err, setErr] = useState(state === 'error')
  const categoryList = categories && categories.length > 0 ? categories : CATS
  const category = categoryList.find((c) => c.id === cat || (c as any).slug === cat)

  const base = useMemo(
    () =>
      baseList.filter((p) => {
        const matchesCat = (() => {
          if (!cat || cat === 'all') return true
          const target = cat.toLowerCase()
          if (p.cat && p.cat.toLowerCase() === target) return true
          if (p.category_slug && p.category_slug.toLowerCase() === target) return true
          if (p.category_id && p.category_id.toLowerCase() === target) return true
          if (category) {
            if (category.id && p.cat && p.cat.toLowerCase() === category.id.toLowerCase()) return true
            if (category.id && p.category_slug && p.category_slug.toLowerCase() === category.id.toLowerCase()) return true
            if (category.id && p.category_id && p.category_id.toLowerCase() === category.id.toLowerCase()) return true
            if (category.slug && p.cat && p.cat.toLowerCase() === category.slug.toLowerCase()) return true
            if (category.slug && p.category_slug && p.category_slug.toLowerCase() === category.slug.toLowerCase()) return true
            if (category.slug && p.category_id && p.category_id.toLowerCase() === category.slug.toLowerCase()) return true
          }
          return false
        })()

        const matchesQuery =
          !q ||
          (p.name + p.sku + catName(p.cat) + p.blurb).toLowerCase().includes(q.toLowerCase())

        const isVisible =
          p.status ? (p.status.toLowerCase() === 'published' || p.status.toLowerCase() === 'active') : true

        return matchesCat && matchesQuery && isVisible
      }),
    [baseList, cat, q, category]
  )
  const priceActive = price[0] > 0 || price[1] < PMAX
  const list = useMemo(() => {
    let r = base.filter((p) => {
      return defs.every((d) => {
        const selected = sel[d.key]
        if (!selected || selected.length === 0) return true
        const prodVals = new Set<string>()
        const normD = d.key.toLowerCase().replace(/[-_\s]+/g, '')
        const normL = d.label.toLowerCase().replace(/[-_\s]+/g, '')

        if (p.attrs && typeof p.attrs === 'object') {
          if (p.attrs[d.key]) {
            toArr(p.attrs[d.key]).forEach((v) => { if (v && typeof v === 'string') prodVals.add(v.trim()) })
          }
          for (const [k, v] of Object.entries(p.attrs)) {
            const normK = k.toLowerCase().replace(/[-_\s]+/g, '')
            if (normK === normD || normK === normL) {
              toArr(v).forEach((val) => { if (val && typeof val === 'string') prodVals.add(val.trim()) })
            }
          }
        }
        if (p.specs && Array.isArray(p.specs)) {
          for (const [sK, sV] of p.specs) {
            const normS = String(sK).toLowerCase().replace(/[-_\s]+/g, '')
            if (normS === normD || normS === normL || normS.includes(normD) || normD.includes(normS) || normS.includes(normL) || normL.includes(normS)) {
              if (sV && typeof sV === 'string') prodVals.add(sV.trim())
            }
          }
        }
        if ((normD.includes('size') || normL.includes('size')) && p.sizes?.length) {
          p.sizes.forEach((s) => { if (s && typeof s === 'string') prodVals.add(s.trim()) })
        }
        return selected.some((s) => prodVals.has(s.trim()))
      })
    })
    if (priceActive) {
      r = r.filter((p) => {
        if (p.price == null) return true
        return p.price >= price[0] && p.price <= price[1]
      })
    }
    if (sort === 'plh') r = [...r].sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9))
    if (sort === 'phl') r = [...r].sort((a, b) => (b.price ?? -1) - (a.price ?? -1))
    if (sort === 'az') r = [...r].sort((a, b) => a.name.localeCompare(b.name))
    return r
  }, [base, sel, price, sort, defs, priceActive])

  // brief loading feedback whenever filters change
  useEffect(() => {
    if (state === 'loading') return
    setLoading(true); setPage(1)
    const t = setTimeout(() => setLoading(false), 200)
    return () => clearTimeout(t)
  }, [sel, price, sort, state])

  const chips = defs.flatMap((d) => (sel[d.key] ?? []).map((v) => ({ key: d.key, label: `${d.label}: ${v}`, v })))
  if (priceActive) chips.push({ key: '__price', label: `Price: ${inr(price[0])} – ${inr(price[1])}`, v: '' })
  const removeChip = (c: { key: string; v: string }) => c.key === '__price' ? setPrice([0, PMAX]) : setSel({ ...sel, [c.key]: sel[c.key].filter((x) => x !== c.v) })
  const clearAll = () => { setSel(Object.fromEntries(defs.map((d) => [d.key, []]))); setPrice([0, PMAX]) }
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const shown = list.slice((page - 1) * PAGE, page * PAGE)
  const title = q ? `Results for “${q}”` : category?.name ?? 'All Products'
  const draftCount = Object.values(dSel).reduce((s, a) => s + a.length, 0) + (dPrice[0] > 0 || dPrice[1] < PMAX ? 1 : 0)
  const recents = recent.map(byId).filter(Boolean) as Product[]

  return (
    <div>
      {/* Page Header with Breadcrumbs & Category Tabs */}
      <div className="border-b border-line bg-soft/70">
        <Container className="py-5">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: category || q ? '/shop' : undefined }, ...(category ? [{ label: category.name }] : q ? [{ label: 'Search' }] : [])]} />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">{title}</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{category?.blurb ?? (q ? 'Search matches product names, models and categories.' : 'High-impact commercial video walls, digital standees, interactive touch kiosks, and outdoor signage displays.')}</p>
            </div>
            {category?.id === 'digital-signage' && <Badge tone="navy">Screen-spec filters</Badge>}
          </div>
          {!q && (
            <div className="hide-scroll touch-scroll mt-4 flex items-center gap-2 overflow-x-auto py-2">
              <Link to="/shop" className={cx('shrink-0 rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition shadow-xs', !cat ? 'border-brand bg-brand text-white shadow-sm' : 'border-line bg-white text-ink hover:border-brand hover:text-brand')}>All Displays</Link>
              {categoryList.map((c) => <Link key={c.id} to={`/category/${c.id}`} className={cx('shrink-0 rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition shadow-xs', cat === c.id || cat === (c as any).slug ? 'border-brand bg-brand text-white shadow-sm' : 'border-line bg-white text-ink hover:border-brand hover:text-brand')}>{c.name}</Link>)}
            </div>
          )}
        </Container>
      </div>

      <Container className="grid gap-8 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[84px] rounded-2xl border border-line bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-line">
              <h2 className="text-base font-bold flex items-center gap-2 text-ink">
                <SlidersHorizontal className="size-4 text-brand" />
                Filters
                {chips.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">{chips.length}</span>}
              </h2>
              {chips.length > 0 && <button onClick={clearAll} className="text-xs font-semibold text-brand hover:underline">Clear all</button>}
            </div>
            <FilterPanel defs={defs} products={base} sel={sel} setSel={setSel} price={price} setPrice={setPrice} maxPrice={PMAX} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <Btn variant="secondary" size="sm" className="lg:hidden" icon={<SlidersHorizontal className="size-4" />} onClick={() => { setDSel(sel); setDPrice(price); setDrawer(true) }}>Filters{chips.length > 0 && <span className="ml-1 grid size-5 place-items-center rounded-full bg-brand text-[11px] text-white">{chips.length}</span>}</Btn>
              <p className="text-sm text-ink-2" aria-live="polite">Showing <strong className="text-ink font-bold">{loading ? '…' : list.length}</strong> {list.length === 1 ? 'product' : 'products'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-36 sm:w-44"><Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 text-xs"><option value="featured">Featured</option><option value="plh">Price: low → high</option><option value="phl">Price: high → low</option><option value="az">Name: A–Z</option></Select></div>
              <div className="hidden rounded-dd border border-line p-0.5 sm:flex">
                {([['grid', LayoutGrid], ['list', List]] as const).map(([v, I]) => <button key={v} aria-label={`${v} view`} aria-pressed={view === v} onClick={() => setView(v)} className={cx('grid size-8 place-items-center rounded-md transition', view === v ? 'bg-navy text-white shadow-xs' : 'text-ink-2 hover:bg-soft')}><I className="size-3.5" /></button>)}
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => <button key={c.label} onClick={() => removeChip(c)} className="group flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pl-3 pr-2 text-[13px] font-semibold text-brand-hover hover:bg-brand hover:text-white">{c.label}<X className="size-3.5" /></button>)}
              <button onClick={clearAll} className="px-2 text-[13px] font-semibold text-ink-2 hover:text-brand">Clear all</button>
            </div>
          )}

          {err ? (
            <ErrorState title="We could not load products" onRetry={() => { setErr(false); setLoading(true); setTimeout(() => setLoading(false), 500) }} />
          ) : loading ? (
            <div className={cx('grid gap-5', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : '')}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="overflow-hidden rounded-xl border border-line"><Skeleton className="aspect-[4/3.4] rounded-none" /><div className="space-y-2 p-4"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="mt-4 h-9 w-full" /></div></div>)}</div>
          ) : list.length === 0 ? (
            <EmptyState icon={<PackageSearch className="size-6" />} title="No products match these filters" text="Try removing a filter, widening the price range, or browse another category."
              action={<><Btn onClick={clearAll}>Clear all filters</Btn><Btn variant="secondary" to="/shop">Browse all</Btn></>} />
          ) : (
            <>
              <div className={cx('grid gap-4', view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>{shown.map((p) => <ProductCard key={p.id} p={p} view={view === 'list' ? 'list' : 'grid'} />)}</div>
              {pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className="grid size-10 place-items-center rounded-dd border border-line hover:bg-soft disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                  {Array.from({ length: pages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} aria-current={page === i + 1} className={cx('size-10 rounded-dd border text-sm font-semibold', page === i + 1 ? 'border-brand bg-brand text-white' : 'border-line hover:bg-soft')}>{i + 1}</button>)}
                  <button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page" className="grid size-10 place-items-center rounded-dd border border-line hover:bg-soft disabled:opacity-40"><ChevronRight className="size-4" /></button>
                </nav>
              )}
            </>
          )}

          {!cat && !q && category == null && recents.length > 0 && !loading && (
            <section className="mt-14"><h2 className="mb-4 text-3xl font-bold">Recently viewed</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{recents.slice(0, 4).map((p) => <Link key={p.id} to={`/product/${p.slug || p.id}`} className="group block overflow-hidden rounded-xl border border-line"><img src={p.img} alt="" className="aspect-[4/3] w-full bg-[#f3f1ee] object-cover mix-blend-multiply" /><p className="p-3 text-sm font-semibold group-hover:text-brand">{p.name}</p></Link>)}</div></section>
          )}
          {list.length > 0 && category && categories.length > 1 && (
            <section className="mt-14"><h2 className="mb-4 text-3xl font-bold">Explore related categories</h2><div className="grid gap-3 sm:grid-cols-3">{categories.filter((c) => c.id !== cat).slice(0, 3).map((c) => <Link key={c.id} to={`/category/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-brand"><img src={resolveAssetUrl(c.img || '/p/i-standee.jpg')} alt="" className="size-14 rounded-lg object-cover" /><span className="text-sm font-semibold">{c.name}</span></Link>)}</div></section>
          )}
        </div>
      </Container>

      {/* mobile drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters" side="bottom"
        footer={<div className="flex gap-3"><Btn variant="secondary" className="flex-1" onClick={() => { setDSel(Object.fromEntries(defs.map((d) => [d.key, []]))); setDPrice([0, PMAX]) }}>Clear all</Btn><Btn className="flex-[2]" onClick={() => { setSel(dSel); setPrice(dPrice); setDrawer(false) }}>Apply filters{draftCount > 0 && ` (${draftCount})`}</Btn></div>}>
        <div className="px-5"><FilterPanel defs={defs} products={base} sel={dSel} setSel={setDSel} price={dPrice} setPrice={setDPrice} maxPrice={PMAX} /></div>
      </Drawer>
    </div>
  )
}
