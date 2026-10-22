import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import { ArrowRight, ArrowUp, ArrowDown, ArrowUpRight, Layers, Mail, MessageCircle, Play, Quote as QuoteIcon, Ruler, Sparkles, Star, Truck, Wand2, ExternalLink, X, ShieldCheck, Box, SlidersHorizontal, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { INDUSTRIES, FAQS as FALLBACK_FAQS, CATS, byId } from '../data'
import { Link, useApp, resolveAssetUrl } from '../store'
import { Accordion, Btn, Container, ProductCard, SectionHead, Badge, InstagramIcon, cx } from '../ui'
import { catalogueApi, normalizeProduct, type ApiHomepageData } from '../api'
import StoreLoader from '../components/StoreLoader'
import { Header, Footer } from '../Layout'

const MEDIA = ['/p/ultraslim.jpg', '/p/frames.jpg', '/p/backlit.jpg', '/p/i-standee.jpg', '/p/gazebo.jpg']

interface CategoryEnhancement {
  badge: string
  tagline: string
  specs: string[]
  startingPrice?: string
  badgeBg: string
  gradient: string
  highlight?: string
}

const CATEGORY_META: Record<string, CategoryEnhancement> = {
  'led-fabric-signage': {
    badge: '✦ Commercial Flagship',
    tagline: 'High-Lumen Edge Lit SEG Fabric Signage',
    specs: ['60-100mm Extruded Frame', 'Silicone Edge Tension Fabric', 'Edge-to-Edge Glow'],
    startingPrice: 'Custom Sizing & Quote',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    gradient: 'from-amber-600/30 via-orange-600/10 to-transparent',
    highlight: 'Seamless SEG Fabric',
  },
  'premium-ultra-slim': {
    badge: '★ Best Seller',
    tagline: 'Edge-Lit Optical Acrylic Snap Frame',
    specs: ['A5 to B0 Paper Formats', 'Magnetic Snap Front Profile', 'HP High-Res Print Included'],
    startingPrice: 'From ₹950',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    gradient: 'from-blue-600/30 via-cyan-600/10 to-transparent',
    highlight: 'Ultra-Slim 18mm',
  },
  'card-stands': {
    badge: 'Cast Optical Acrylic',
    tagline: 'Double-Sided Tabletop & QR Stand',
    specs: ['Optical Cast Acrylic', 'Scratch Resistant Polish', 'Visiting Card to A4'],
    startingPrice: 'From ₹150',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    gradient: 'from-emerald-600/30 via-teal-600/10 to-transparent',
    highlight: 'Crystal Optical Clarity',
  },
  'lollipop-boards': {
    badge: 'High-Street Visibility',
    tagline: 'Illuminated Projection Signage',
    specs: ['360° Motorized & Static', 'Outdoor IP65 Weatherproof', 'Heavy-Duty Bracket Flange'],
    startingPrice: 'From ₹3,000',
    badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
    gradient: 'from-violet-600/30 via-purple-600/10 to-transparent',
    highlight: 'Double-Sided Projection',
  },
  'e-series': {
    badge: 'Commercial Digital Poster',
    tagline: 'Non-Touch 24/7 Smart Broadcast',
    specs: ['Android 9 Embedded OS', '350 Nits Commercial Panel', 'Wall & Floor A-Stand Mount'],
    startingPrice: 'From ₹23,160',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    gradient: 'from-sky-600/30 via-indigo-600/10 to-transparent',
    highlight: '24/7 Continuous Run',
  },
  'trueview': {
    badge: '4K Commercial Grade',
    tagline: 'Interactive Smart Kiosk & Standee',
    specs: ['4K IPS Display Panel', 'Android 11 & DOS Dual OS', 'High-Lumen 450 Nits'],
    startingPrice: 'From ₹34,900',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    gradient: 'from-rose-600/30 via-red-600/10 to-transparent',
    highlight: 'Ultra HD 4K Touch',
  },
}

const DEFAULT_SECS: Array<{ id: string; label: string }> = [
  { id: 'announce', label: 'Announcement bar' },
  { id: 'header', label: 'Header & logo' },
  { id: 'hero', label: 'Hero banner' },
  { id: 'cats', label: 'Category grid' },
  { id: 'featured', label: 'Featured products' },
  { id: 'intro', label: 'Introduction / story' },
  { id: 'industries', label: 'Industries' },
  { id: 'logos', label: 'Client logos' },
  { id: 'video', label: 'Video spotlight' },
  { id: 'benefits', label: 'Why choose us (benefits)' },
  { id: 'gallery', label: 'Gallery & media' },
  { id: 'tf', label: 'FAQs & reviews' },
  { id: 'contact', label: 'Call to action banner' },
  { id: 'footer', label: 'Footer & policies' },
]

export interface HomePreviewProps {
  secs?: Array<{ id: string; on: boolean; label?: string }>
  c?: any
  selectedSection?: string
  onSelectSection?: (id: string) => void
  onMoveSection?: (id: string, delta: number) => void
  onToggleSection?: (id: string, on: boolean) => void
  mode?: string
}

function HorizontalCategorySection({
  displayCats,
  products,
  isPreview,
}: {
  displayCats: any[]
  products: any[]
  isPreview?: boolean
}) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const totalCards = displayCats.length

  // Calculate horizontal travel distance
  const getTravelDistance = () => {
    if (!trackRef.current || !stickyRef.current) return 0
    const trackWidth = trackRef.current.scrollWidth
    const viewportWidth = stickyRef.current.clientWidth
    return Math.max(0, trackWidth - viewportWidth + 64)
  }

  // Scroll listener: translates vertical page scroll to horizontal track movement
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // Find nearest scrollable container (handles admin preview simulation) or window
    const scrollParent = section.closest('.overflow-y-auto') || window

    const onScroll = () => {
      if (!sectionRef.current || !trackRef.current || !stickyRef.current) return
      const maxTranslate = getTravelDistance()
      if (maxTranslate <= 0) return

      let p = 0
      if (scrollParent === window) {
        const rect = section.getBoundingClientRect()
        const totalHeight = section.offsetHeight - window.innerHeight
        if (totalHeight > 0) {
          const scrolled = -rect.top
          p = Math.min(Math.max(scrolled / totalHeight, 0), 1)
        }
      } else {
        const parentElem = scrollParent as HTMLElement
        const parentScrollTop = parentElem.scrollTop
        const sectionOffsetTop = section.offsetTop
        const totalHeight = section.offsetHeight - parentElem.clientHeight
        if (totalHeight > 0) {
          const scrolled = parentScrollTop - sectionOffsetTop
          p = Math.min(Math.max(scrolled / totalHeight, 0), 1)
        }
      }

      setProgress(p)
      const currentTranslate = p * maxTranslate
      trackRef.current.style.transform = `translate3d(-${currentTranslate}px, 0, 0)`

      if (totalCards > 0) {
        const idx = Math.min(Math.floor(p * totalCards + 0.15), totalCards - 1)
        setActiveIndex(idx)
      }
    }

    scrollParent.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    onScroll()

    return () => {
      scrollParent.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [totalCards])

  // Programmatic scroll to category
  const scrollToCategory = (index: number) => {
    const section = sectionRef.current
    if (!section || totalCards <= 1) return

    const targetProgress = index / (totalCards - 1)
    const scrollParent = section.closest('.overflow-y-auto') || window

    if (scrollParent === window) {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY
      const totalHeight = section.offsetHeight - window.innerHeight
      const targetScroll = sectionTop + targetProgress * totalHeight
      window.scrollTo({ top: targetScroll, behavior: 'smooth' })
    } else {
      const parentElem = scrollParent as HTMLElement
      const sectionTop = section.offsetTop
      const totalHeight = section.offsetHeight - parentElem.clientHeight
      const targetScroll = sectionTop + targetProgress * totalHeight
      parentElem.scrollTo({ top: targetScroll, behavior: 'smooth' })
    }
  }

  const handlePrev = () => {
    scrollToCategory(Math.max(0, activeIndex - 1))
  }

  const handleNext = () => {
    scrollToCategory(Math.min(totalCards - 1, activeIndex + 1))
  }

  // Touch swipe support for mobile
  const touchStartX = useRef(0)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    if (diffX > 50) handleNext()
    else if (diffX < -50) handlePrev()
  }

  // Horizontal wheel swipe support
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 25) {
      if (e.deltaX > 0) handleNext()
      else handlePrev()
    }
  }

  return (
    <section
      ref={sectionRef}
      className="relative bg-gradient-to-b from-white via-soft/30 to-white"
      style={{ minHeight: isPreview ? 'auto' : `${Math.max(200, (totalCards + 1) * 45)}vh` }}
    >
      <div
        ref={stickyRef}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cx(
          'sticky top-0 h-screen max-h-screen overflow-hidden flex flex-col justify-between py-6 sm:py-8 lg:py-10 z-10',
          isPreview && 'static h-auto max-h-none py-8'
        )}
      >
        {/* Section Header with Controls */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 shrink-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-line/60">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-wider uppercase mb-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand" />
                </span>
                Commercial Display Hardware
              </div>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-navy leading-[1.15]">
                Everything your space needs to be seen
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-ink-2 leading-relaxed">
                Scroll vertically to glide through our architectural series, or use navigation controls to explore.
              </p>
            </div>

            {/* Controls: Slide Counter, Prev/Next Arrows, View All */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Slide counter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-line shadow-2xs text-xs font-mono">
                <span className="font-bold text-navy">0{activeIndex + 1}</span>
                <span className="text-ink-2/60">/</span>
                <span className="text-ink-2 font-medium">0{totalCards}</span>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  aria-label="Previous category"
                  className="grid size-9 place-items-center rounded-full bg-white border border-line shadow-2xs hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-navy"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={activeIndex === totalCards - 1}
                  aria-label="Next category"
                  className="grid size-9 place-items-center rounded-full bg-white border border-line shadow-2xs hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-navy"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <Btn
                variant="secondary"
                to="/shop"
                iconRight
                icon={<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
                className="hidden sm:inline-flex shadow-sm font-semibold text-xs sm:text-sm h-9 px-3.5"
              >
                All products ({products.length || 24})
              </Btn>
            </div>
          </div>

          {/* Category Filter Pills / Quick Nav */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {displayCats.map((cat, idx) => {
                const isSelected = activeIndex === idx
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => scrollToCategory(idx)}
                    className={cx(
                      'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer',
                      isSelected
                        ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                        : 'bg-white hover:bg-slate-100 text-ink-2 hover:text-ink border border-line shadow-2xs'
                    )}
                  >
                    <span>{cat.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Scroll Guide Indicator */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-ink-2 shrink-0">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              <span>Scroll down to glide horizontally</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand via-amber-500 to-brand transition-all duration-100 ease-out rounded-full"
              style={{ width: `${Math.max(progress * 100, 4)}%` }}
            />
          </div>
        </div>

        {/* Horizontal Sliding Track */}
        <div className="w-full overflow-hidden flex-1 flex items-center">
          <div
            ref={trackRef}
            className={cx(
              'flex items-center gap-6 sm:gap-8 px-4 sm:px-8 lg:px-12 transition-transform duration-100 ease-out will-change-transform',
              isPreview && 'overflow-x-auto max-w-full pb-4 scrollbar-none'
            )}
          >
            {displayCats.map((cat, i) => {
              const meta = CATEGORY_META[cat.id] || {
                badge: '✦ Commercial Series',
                tagline: cat.blurb || 'Engineered Display Solutions',
                specs: ['Commercial Specifications', 'Durable Construction', 'Direct Support'],
                startingPrice: undefined,
                badgeBg: 'bg-white/15 text-white border-white/20',
                gradient: 'from-brand/30 via-navy/20 to-transparent',
              }

              const catProducts = products.filter(
                (p) =>
                  p.cat === cat.id ||
                  p.category_slug === cat.id ||
                  p.category_id === cat.id ||
                  p.cat?.toLowerCase() === cat.name?.toLowerCase() ||
                  (p.cat && cat.id && p.cat.replace(/-/g, '') === cat.id.replace(/-/g, ''))
              )
              const productCount = catProducts.length
              const validPrices = catProducts
                .map((p) => p.price)
                .filter((pr): pr is number => typeof pr === 'number' && pr > 0)
              const dynamicMinPrice = validPrices.length > 0 ? Math.min(...validPrices) : null
              const priceDisplay = meta.startingPrice || (dynamicMinPrice ? `From ₹${dynamicMinPrice.toLocaleString('en-IN')}` : 'Custom Sizing')

              const isActive = activeIndex === i

              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  className={cx(
                    'group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl transition-all duration-500 shrink-0 select-none',
                    'w-[84vw] max-w-[420px] sm:w-[480px] md:w-[540px] lg:w-[620px]',
                    'h-[460px] sm:h-[490px] lg:h-[530px]',
                    isActive
                      ? 'ring-2 ring-brand/60 shadow-brand/20 scale-100'
                      : 'ring-1 ring-white/10 opacity-90 scale-[0.98] hover:opacity-100 hover:scale-100'
                  )}
                >
                  {/* Background Image with smooth zoom & brightness balance */}
                  <img
                    src={resolveAssetUrl(cat.img)}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 group-hover:brightness-95"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.dataset.fallback) {
                        t.dataset.fallback = '1'
                        t.src = resolveAssetUrl('/p/i-standee.jpg')
                      }
                    }}
                  />

                  {/* Top contrast gradient */}
                  <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />

                  {/* Deep lower gradient for crystal-clear readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 via-45% to-slate-950/15 pointer-events-none" />

                  {/* Ambient category color glow on hover */}
                  <div
                    className={cx(
                      'absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
                      meta.gradient
                    )}
                  />

                  {/* Inset ring with subtle glow on hover */}
                  <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 group-hover:ring-brand/50 transition-colors duration-300 pointer-events-none" />

                  {/* Top Deck: Floating Badges & Slide Number */}
                  <div className="relative z-10 flex items-center justify-between gap-2 p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold shadow-xs">
                        0{i + 1}
                      </span>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wide uppercase shadow-sm backdrop-blur-md border transition-all duration-300',
                          meta.badgeBg
                        )}
                      >
                        {meta.badge}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-xs">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{priceDisplay}</span>
                    </span>
                  </div>

                  {/* Bottom Deck: Typography, Specs & Action Callout */}
                  <div className="relative z-10 flex flex-col justify-end p-5 sm:p-7 md:p-8 text-white">
                    {/* Category Title */}
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight group-hover:text-amber-200 transition-colors duration-300 drop-shadow-sm mb-2">
                      {cat.name}
                    </h3>

                    {/* Blurb / Tagline */}
                    <p className="text-white/85 font-normal leading-relaxed text-xs sm:text-sm lg:text-base line-clamp-2 max-w-xl mb-3.5">
                      {cat.blurb || meta.tagline}
                    </p>

                    {/* Feature Spec Chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {meta.specs.slice(0, 3).map((spec, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white/95 font-medium"
                        >
                          <span className="size-1 rounded-full bg-brand" />
                          {spec}
                        </span>
                      ))}
                      {productCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-brand/25 backdrop-blur-md border border-brand/35 text-xs text-amber-200 font-semibold">
                          {productCount} {productCount === 1 ? 'Model Available' : 'Models Available'}
                        </span>
                      )}
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-3.5 mt-1">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <span className="font-medium text-white/90">
                          {productCount > 0 ? `${productCount} products in catalogue` : 'Commercial solution'}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-bold shadow-md transition-all duration-300 group-hover:bg-brand group-hover:border-brand group-hover:text-white group-hover:shadow-brand/40">
                        <span>Explore Series</span>
                        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom Status bar inside sticky view */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 flex items-center justify-between text-xs text-ink-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy">Category Spotlight:</span>
            <span className="text-ink font-medium">{displayCats[activeIndex]?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Use mouse wheel, trackpad swipe or scroll down</span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-brand font-bold">{Math.round(progress * 100)}%</span>
              <span>explored</span>
            </div>
          </div>
        </div>
      </div>

      {/* Non-sticky B2B Guarantee and Assurance Ribbon at the end of the section */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-line/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-2xs border border-line/70">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <Ruler className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-navy">Custom Fabrication</p>
              <p className="text-[11px] text-ink-2 mt-0.5">Millimeter custom dimensions & artwork</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-2xs border border-line/70">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Truck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-navy">PAN-India Dispatch</p>
              <p className="text-[11px] text-ink-2 mt-0.5">Wooden crated secure freight transit</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-2xs border border-line/70">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <Box className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-navy">Complete Assemblies</p>
              <p className="text-[11px] text-ink-2 mt-0.5">Adapters, mounts & HP prints included</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-2xs border border-line/70">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-navy">Commercial Warranty</p>
              <p className="text-[11px] text-ink-2 mt-0.5">1-Year hardware warranty & quote desk</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home({ previewProps }: { previewProps?: HomePreviewProps } = {}) {
  const { products, categories, isLoadingCatalogue } = useApp()
  const [homeData, setHomeData] = useState<ApiHomepageData | null>(null)
  const [faqs, setFaqs] = useState<[string, string][]>([])
  const [loading, setLoading] = useState(!previewProps)
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null)
  const [activeInstagram, setActiveInstagram] = useState<{ embedUrl: string; cleanUrl: string; title: string } | null>(null)
  const [activeCatTab, setActiveCatTab] = useState<string>('all')

  useEffect(() => {
    let active = true

    // Safety timeout: don't block user indefinitely if network is sluggish
    const timer = setTimeout(() => {
      if (active) setLoading(false)
    }, 5000)

    Promise.allSettled([
      catalogueApi.getHomepage(),
      catalogueApi.getFaqs(),
    ]).then(([hRes, fRes]) => {
      if (!active) return
      if (hRes.status === 'fulfilled' && hRes.value) {
        setHomeData(hRes.value)
      }
      if (fRes.status === 'fulfilled' && fRes.value?.length > 0) {
        setFaqs(fRes.value.map((i) => [i.question, i.answer]))
      } else {
        setFaqs(FALLBACK_FAQS as any)
      }
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [])

  // Live or preview configuration values
  const c = previewProps?.c
  const activeHero = c?.hero || homeData?.hero
  const activeAnnounce = c?.announce || homeData?.announce
  const activeIntro = c?.intro || homeData?.intro
  const activeVideo = c?.video || homeData?.video
  const activeContact = c?.contact || homeData?.contact

  // Featured products from preview config or real DB
  const featured = useMemo(() => {
    if (c?.featured && Array.isArray(c.featured) && c.featured.length > 0) {
      return c.featured.map((k: string) => {
        const found = products.find((p) => p.id === k || p.sku === k || p.slug === k) || byId(k)
        return found ? normalizeProduct(found as any) : {
          id: k,
          name: k,
          price: 2499,
          img: resolveAssetUrl('/p/i-standee.jpg'),
          cat: 'digital-signage',
          sku: k,
          sizes: ['Standard'],
          status: 'Published',
        }
      })
    }
    return homeData?.featured_products && homeData.featured_products.length > 0
      ? homeData.featured_products.map(normalizeProduct)
      : products.slice(0, 6)
  }, [c?.featured, homeData?.featured_products, products])

  // Categories from preview config or real DB
  const displayCats = useMemo(() => {
    if (c?.cats && Array.isArray(c.cats) && c.cats.length > 0) {
      return c.cats.map((k: string) => {
        const found = categories.find((cat) => cat.id === k || cat.name.toLowerCase() === k.toLowerCase()) || CATS.find((cat) => cat.id === k)
        return found ? {
          id: found.id,
          name: found.name,
          img: resolveAssetUrl(found.img),
          blurb: found.blurb || '',
        } : {
          id: k,
          name: k,
          img: resolveAssetUrl('/p/i-standee.jpg'),
          blurb: '',
        }
      })
    }
    return homeData?.categories && homeData.categories.length > 0
      ? homeData.categories.map((cat) => ({
          id: cat.slug,
          name: cat.name,
          img: resolveAssetUrl(cat.image_url || '/p/i-standee.jpg'),
          blurb: cat.description || '',
        }))
      : categories
  }, [c?.cats, homeData?.categories, categories])

  // Filtered categories based on selected category tab
  const filteredCats = useMemo(() => {
    if (activeCatTab === 'all') return displayCats
    return displayCats.filter((cat) => cat.id === activeCatTab || cat.name.toLowerCase().includes(activeCatTab.toLowerCase()))
  }, [displayCats, activeCatTab])

  // Approved testimonials from DB
  const testimonials = homeData?.testimonials || []
  // Approved client logos from DB
  const clientLogos = homeData?.client_logos || []

  // Dynamic industries
  const industriesList = useMemo(() => {
    if (c?.industries && Array.isArray(c.industries) && c.industries.length > 0) {
      return c.industries.map((i: number) => {
        const ind = INDUSTRIES[i] || ['Commercial Displays', 'Engineered for public spaces.', '/p/i-standee.jpg']
        return [ind[0], ind[1], resolveAssetUrl(ind[2])]
      })
    }
    return homeData?.industries && homeData.industries.length > 0
      ? homeData.industries.map((ind) => [ind.name, ind.description, resolveAssetUrl(ind.image_url)])
      : INDUSTRIES.map(([t, d, img]) => [t, d, resolveAssetUrl(img)])
  }, [c?.industries, homeData?.industries])

  // Dynamic gallery
  const galleryItems = homeData?.gallery && homeData.gallery.length > 0
    ? homeData.gallery
    : null

  // Dynamic benefits
  const benefitIcons = [Wand2, Ruler, Truck, MessageCircle]
  const benefitsList = useMemo(() => {
    if (c?.benefits && Array.isArray(c.benefits) && c.benefits.length > 0) {
      return c.benefits.map((b: any) => ({
        t: b.t || 'Benefit title',
        d: b.d || 'Benefit description',
      }))
    }
    return homeData?.benefits?.items && homeData.benefits.items.length > 0
      ? homeData.benefits.items
      : [
          { t: 'Made to your artwork', d: 'Upload a logo, set text, font and colour on customizable products and preview before you order.' },
          { t: 'Right size, right mount', d: 'Wall mount, floor stand or tabletop — pick from the sizes each product supports.' },
          { t: 'Portable when you need it', d: 'Foldable roll-ups, tents and tripod stands for events and outdoor branding.' },
          { t: 'Quote when it is bigger', d: 'Need a custom shape or larger quantity? Request a quote from any product page.' },
        ]
  }, [c?.benefits, homeData?.benefits?.items])

  const activeFaqs = useMemo(() => {
    if (c?.tf?.faqs && Array.isArray(c.tf.faqs) && c.tf.faqs.length > 0) {
      return c.tf.faqs.map((i: number) => {
        const item = faqs[i] || FALLBACK_FAQS[i]
        return item || ['Frequently Asked Question', 'Answer details will appear here.']
      })
    }
    return faqs.length > 0 ? faqs : (FALLBACK_FAQS as any)
  }, [c?.tf?.faqs, faqs])

  const activeSecs = useMemo(() => {
    if (previewProps?.secs && previewProps.secs.length > 0) {
      return previewProps.secs
    }
    const orderFromDb = homeData?.sections_order || (Array.isArray(homeData?.sections) ? homeData.sections.map((s: any) => s.section_key || s.id).filter(Boolean) : null)
    if (orderFromDb && orderFromDb.length > 0) {
      const list: Array<{ id: string; label: string; on: boolean }> = []
      const seen = new Set<string>()
      orderFromDb.forEach((key: string) => {
        const def = DEFAULT_SECS.find((d) => d.id === key)
        const isVis = homeData?.sections_visibility ? homeData.sections_visibility[key] !== false : true
        list.push({ id: key, label: def?.label || key, on: isVis })
        seen.add(key)
      })
      DEFAULT_SECS.forEach((def) => {
        if (!seen.has(def.id)) {
          const isVis = homeData?.sections_visibility ? homeData.sections_visibility[def.id] !== false : true
          list.push({ ...def, on: isVis })
        }
      })
      return list
    }
    return DEFAULT_SECS.map((s) => ({ ...s, on: true }))
  }, [previewProps?.secs, homeData?.sections_order, homeData?.sections, homeData?.sections_visibility])

  // User requirement:
  // "before the realtime data got loaded show the loading page dont show the defaut details on the website"
  if (!previewProps && (loading || (!homeData && isLoadingCatalogue))) {
    return <StoreLoader title="Loading DisplayDelight Displays" subtitle="Synchronizing real-time commercial catalogue & showroom..." />
  }

  const isVisible = (key: string) => {
    if (previewProps?.secs) {
      const found = previewProps.secs.find((s) => s.id === key)
      return found ? Boolean(found.on) : true
    }
    return homeData?.sections_visibility?.[key] !== false
  }

  const renderSectionWrapper = (id: string, content: ReactNode, label: string, index: number, total: number) => {
    if (!previewProps) return <div key={id}>{content}</div>
    const isSelected = previewProps.selectedSection === id
    return (
      <div
        key={id}
        onClick={(e) => {
          e.stopPropagation()
          previewProps.onSelectSection?.(id)
        }}
        className={cx(
          'group/sec relative transition-all duration-150',
          previewProps.onSelectSection && 'cursor-pointer',
          isSelected
            ? 'ring-4 ring-brand ring-offset-2 z-20 shadow-xl'
            : 'hover:ring-2 hover:ring-brand/40'
        )}
      >
        {/* Floating section management badge & position controls directly on the canvas */}
        <div
          className={cx(
            'absolute top-3 left-3 z-30 flex items-center gap-2 rounded-lg shadow-xl backdrop-blur transition-all duration-200 pointer-events-auto',
            isSelected
              ? 'opacity-100 bg-brand text-white p-1 pl-3 ring-2 ring-white/30 scale-100'
              : 'opacity-0 group-hover/sec:opacity-100 bg-navy/90 text-white p-1 pl-2.5 scale-95 group-hover/sec:scale-100'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="size-2 rounded-full bg-white animate-pulse" />
            <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] tracking-wide">#{index + 1}</span>
            <span className="truncate max-w-[140px] sm:max-w-none">{label}</span>
          </div>

          <div className="flex items-center gap-0.5 border-l border-white/20 pl-1.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => previewProps.onMoveSection?.(id, -1)}
              title="Move section up"
              className="grid size-6 place-items-center rounded bg-white/15 hover:bg-white/35 active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => previewProps.onMoveSection?.(id, 1)}
              title="Move section down"
              className="grid size-6 place-items-center rounded bg-white/15 hover:bg-white/35 active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition"
            >
              <ArrowDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => previewProps.onSelectSection?.(id)}
              className="ml-0.5 rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold hover:bg-white/35 active:scale-95 transition"
            >
              {isSelected ? 'Editing' : 'Edit'}
            </button>
          </div>
        </div>

        {content}
      </div>
    )
  }

  const sectionRenderers: Record<string, () => ReactNode> = {
    announce: () => (
      activeAnnounce?.text ? (
        <div className="bg-brand px-4 py-2 text-center text-xs font-semibold text-white shadow-inner">
          <Link to={activeAnnounce.link || '/shop'} className="inline-flex items-center gap-1.5 hover:underline">
            <span>📢 {activeAnnounce.text}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null
    ),
    header: () => (
      previewProps ? (
        <div className="border-b border-line bg-white/95 backdrop-blur pointer-events-none">
          <Header />
        </div>
      ) : null
    ),
    hero: () => (
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-brand/25 blur-[120px]" />
        <Container className="relative grid items-center gap-10 py-12 lg:grid-cols-[1.02fr_1fr] lg:py-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[.16em] text-[#ffb597]">
              <span className="size-1.5 rounded-full bg-brand" />Digital signage for business
            </p>
            <h1 className="hero-heading font-bold uppercase font-display">
              {activeHero?.headline || (
                <>Light up.<br />Stand out.<br /><span className="text-brand">Sell more.</span></>
              )}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:mt-6 sm:text-base md:text-lg">
              {activeHero?.sub || 'Digital standees, illuminated light boxes, roll-ups and customised signage — powered directly by our live commercial catalogue.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <Btn size="lg" className="w-full sm:w-auto" to={activeHero?.c1to || '/shop'} iconRight icon={<ArrowRight className="size-5" />}>{activeHero?.c1 || 'Shop products'}</Btn>
              <Btn size="lg" className="w-full sm:w-auto" variant="ghostLight" to={activeHero?.c2to || '/quote'}>{activeHero?.c2 || 'Request a quote'}</Btn>
            </div>
            <ul className="mt-8 grid max-w-xl grid-cols-1 gap-3.5 border-t border-white/15 pt-5 text-sm sm:grid-cols-3 sm:mt-10 sm:gap-4 sm:pt-6">
              {[[Wand2, 'Customizable', 'Your artwork & size'], [Layers, 'Floor to table', 'Standees & boxes'], [Mail, 'Quote support', 'Straight from the page']].map(([I, t, s]: any) => (
                <li key={t} className="flex items-center gap-3 sm:block">
                  <I className="size-5 text-brand shrink-0" />
                  <div>
                    <p className="font-semibold text-sm sm:mt-2">{t}</p>
                    <p className="text-xs text-white/60">{s}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-pop">
              <img
                src={resolveAssetUrl(activeHero?.img || '/p/hero.jpg')}
                alt="DisplayDelight digital standees, easel frames and light boxes in a showroom"
                className="aspect-[4/3.6] w-full object-cover object-[78%_50%]"
                onError={(e) => {
                  const t = e.currentTarget
                  if (!t.dataset.fallback) {
                    t.dataset.fallback = '1'
                    t.src = resolveAssetUrl('/p/hero.jpg')
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />
            </div>
            {featured[0] && (
              <Link to={`/product/${featured[0].id}`} className="group absolute left-3 sm:-left-6 bottom-4 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl bg-white p-2.5 pr-3.5 text-ink shadow-pop transition hover:-translate-y-0.5 sm:max-w-none">
                <img src={featured[0].img} alt="" className="size-11 shrink-0 rounded-lg bg-[#f3f1ee] object-cover mix-blend-multiply sm:size-16" />
                <span className="min-w-0">
                  <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand">Featured Display</span>
                  <span className="block font-semibold truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none text-xs sm:text-sm">{featured[0].name}</span>
                  <span className="block text-[11px] sm:text-xs text-ink-2">{featured[0].sku} · In stock</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-ink-2 transition group-hover:text-brand" />
              </Link>
            )}
            {featured[1] && (
              <Link to={`/product/${featured[1].id}`} className="absolute -right-2 top-6 hidden items-center gap-2 rounded-xl bg-navy-2/90 p-2 pr-3.5 text-white shadow-pop ring-1 ring-white/15 backdrop-blur transition hover:-translate-y-0.5 sm:flex">
                <img src={featured[1].img} alt="" className="size-12 rounded-lg object-cover" />
                <span className="text-xs">
                  <span className="block font-semibold">{featured[1].name}</span>
                  <span className="text-white/60">Live Catalogue</span>
                </span>
              </Link>
            )}
          </div>
        </Container>
      </section>
    ),
    cats: () => (
      <HorizontalCategorySection
        displayCats={displayCats}
        products={products}
        isPreview={Boolean(previewProps)}
      />
    ),
    featured: () => (
      <section className="bg-soft py-12 sm:py-20">
        <Container>
          <SectionHead eyebrow="Featured products" title="Live Database Catalogue" action={<Btn variant="secondary" to="/shop">View all products</Btn>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          <p className="mt-6 text-xs text-ink-2">Synchronized in real-time with the production database catalogue.</p>
        </Container>
      </section>
    ),
    intro: () => (
      <section className="py-12 sm:py-20">
        <Container className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative">
            <img
              src={resolveAssetUrl(activeIntro?.img || '/p/backlit.jpg')}
              alt="Commercial signage solutions"
              className="aspect-[5/4] w-full rounded-2xl object-cover"
              onError={(e) => {
                const t = e.currentTarget
                if (!t.dataset.fallback) {
                  t.dataset.fallback = '1'
                  t.src = resolveAssetUrl('/p/backlit.jpg')
                }
              }}
            />
            <img
              src={resolveAssetUrl('/p/t-led.jpg')}
              alt="T LED light box range"
              className="absolute -bottom-8 right-4 hidden w-2/5 rounded-xl border-4 border-white object-cover shadow-pop sm:block"
              onError={(e) => {
                const t = e.currentTarget
                if (!t.dataset.fallback) {
                  t.dataset.fallback = '1'
                  t.src = resolveAssetUrl('/p/t-led.jpg')
                }
              }}
            />
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand"><span className="h-0.5 w-6 bg-brand" />About DisplayDelight</p>
            <h2 className="intro-heading font-bold font-display">{activeIntro?.title || 'All business solutions, one display partner.'}</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-2 sm:mt-5 sm:text-[17px]">{activeIntro?.text || 'We supply digital standees, illuminated and acrylic LED displays, tabletop signage, roll-ups, fabric displays and customised branding products — so cafés, showrooms, offices and event teams can put their message in front of customers.'}</p>
            <ul className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-2">
              {['Digital standees: I, A and tabletop types', 'LED light boxes & clip-on frames', 'Roll-ups, fabric displays, gazebo tents', 'Custom print, shape and size on supported products'].map((t) => <li key={t} className="flex items-start gap-2.5 text-sm font-medium"><Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />{t}</li>)}
            </ul>
            <Btn className="mt-7 sm:mt-8" variant="dark" to="/about" iconRight icon={<ArrowRight className="size-4" />}>Learn more about us</Btn>
          </div>
        </Container>
      </section>
    ),
    industries: () => (
      <section className="bg-navy py-20 text-white">
        <Container>
          <SectionHead light eyebrow="Industries & use cases" title="Know your business, not the product name?" />
          <div className="hide-scroll -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {industriesList.map(([t, d, img]) => (
              <Link key={t} to="/shop" className="group relative w-64 shrink-0 snap-start overflow-hidden rounded-xl bg-navy-2 lg:w-auto">
                <img
                  src={resolveAssetUrl(img)}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/4.4] w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                  onError={(e) => {
                    const t = e.currentTarget
                    if (!t.dataset.fallback) {
                      t.dataset.fallback = '1'
                      t.src = resolveAssetUrl('/p/i-standee.jpg')
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4"><h3 className="text-2xl font-bold leading-tight">{t}</h3><p className="mt-1 text-[13px] text-white/70">{d}</p></div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    ),
    logos: () => (
      clientLogos.length > 0 ? (
        <section className="py-16">
          <Container>
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-[.18em] text-ink-2">Trusted by Leading Enterprises & Brands</p>
            <div className="grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {clientLogos.map((logo) => {
                const rawSrc = logo.logo_url?.startsWith('blob:') ? '/uploads/med_93e97a899515_logo.jpg' : logo.logo_url
                const src = resolveAssetUrl(rawSrc)
                return (
                  <div key={logo.id} className="flex h-20 items-center justify-center rounded-xl border border-line bg-white p-4 shadow-sm transition hover:shadow-md">
                    {logo.website_url ? (
                      <a href={logo.website_url} target="_blank" rel="noreferrer" title={logo.name}>
                        <img src={src} alt={logo.name} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="text-xs font-bold text-ink-2 px-2 text-center">${logo.name}</span>`) }} className="max-h-12 max-w-full object-contain filter grayscale transition duration-300 hover:grayscale-0" />
                      </a>
                    ) : (
                      <img src={src} alt={logo.name} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="text-xs font-bold text-ink-2 px-2 text-center">${logo.name}</span>`) }} className="max-h-12 max-w-full object-contain filter grayscale transition duration-300 hover:grayscale-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </Container>
        </section>
      ) : (
        <section className="py-10 border-y border-line/60 bg-soft/40">
          <Container>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-[.18em] text-ink-2">Trusted by Leading Enterprises</p>
            <p className="text-center text-xs text-ink-2">Client logos managed via Client Logos admin will display here.</p>
          </Container>
        </section>
      )
    ),
    video: () => (
      <section className="bg-soft py-20">
        <Container>
          <SectionHead eyebrow="Product videos" title={activeVideo?.title || 'See the displays in action'} action={<Btn variant="secondary" to="/shop">Explore catalogue</Btn>} />
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <div
              onClick={() => {
                if (activeVideo?.url) {
                  setActiveVideoModal(activeVideo.url)
                }
              }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-navy"
            >
              <img
                src={resolveAssetUrl(activeVideo?.poster || featured[0]?.img || '/p/i-standee.jpg')}
                alt=""
                className="aspect-video w-full object-cover opacity-80 transition duration-700 group-hover:scale-105"
                onError={(e) => {
                  const t = e.currentTarget
                  if (!t.dataset.fallback) {
                    t.dataset.fallback = '1'
                    t.src = resolveAssetUrl('/p/i-standee.jpg')
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-transparent" />
              <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-pop transition group-hover:scale-110"><Play className="ml-1 size-8" fill="currentColor" /></span>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white"><Badge tone="brand">Video tour</Badge><h3 className="mt-2 text-3xl font-bold">{activeVideo?.title || featured[0]?.name || 'Commercial Video Wall'}</h3><p className="mt-1 max-w-md text-sm text-white/70">{featured[0]?.blurb || 'Ultra-high definition commercial display in retail and enterprise environments.'}</p></div>
            </div>
            <div className="flex flex-col gap-5">
              {featured.slice(1, 3).map((fp) => (
                <Link key={fp.id} to={`/product/${fp.id}`} className="group flex flex-1 overflow-hidden rounded-xl border border-line bg-white">
                  <span className="relative w-2/5 shrink-0 overflow-hidden bg-navy">
                    <img
                      src={resolveAssetUrl(fp.img)}
                      alt=""
                      className="size-full object-cover opacity-85 transition group-hover:scale-105"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.dataset.fallback) {
                          t.dataset.fallback = '1'
                          t.src = resolveAssetUrl('/p/i-standee.jpg')
                        }
                      }}
                    />
                    <span className="absolute inset-0 grid place-items-center"><span className="grid size-11 place-items-center rounded-full bg-white/90 text-brand"><Play className="ml-0.5 size-5" fill="currentColor" /></span></span>
                  </span>
                  <span className="p-4"><span className="text-[11px] font-bold uppercase tracking-wider text-brand">Demonstration</span><span className="mt-1 block text-xl font-bold leading-tight">{fp.name}</span><span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand">View product <ArrowRight className="size-3.5" /></span></span>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>
    ),
    benefits: () => (
      <section className="py-12 sm:py-20">
        <Container>
          <SectionHead eyebrow="Why DisplayDelight" title={homeData?.benefits?.title || 'Built around your branding'} />
          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {benefitsList.map((b, i) => {
              const IconComponent = benefitIcons[i % benefitIcons.length]
              return (
                <div key={b.t + i} className="bg-white p-5 sm:p-7">
                  <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand sm:size-12"><IconComponent className="size-5 sm:size-6" /></span>
                  <h3 className="mt-4 text-xl font-bold sm:mt-5 sm:text-2xl">{b.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{b.d}</p>
                </div>
              )
            })}
          </div>
        </Container>
      </section>
    ),
    gallery: () => (
      <section className="pb-16 sm:pb-20">
        <Container>
          <SectionHead eyebrow="Gallery" title="Displays at work" action={<Btn variant="secondary" to="/gallery">Explore the gallery</Btn>} />
          <div className="gallery-grid">
            {galleryItems ? (
              galleryItems.slice(0, 5).map((m) => {
                const handleClick = (e: React.MouseEvent) => {
                  if (m.media_type === 'video') {
                    e.preventDefault()
                    setActiveVideoModal(m.media_url)
                  } else if (m.media_type === 'instagram') {
                    e.preventDefault()
                    const scMatch = m.media_url?.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
                    const shortcode = scMatch ? scMatch[1] : ''
                    setActiveInstagram({
                      embedUrl: m.embed_url || `https://www.instagram.com/p/${shortcode}/embed/`,
                      cleanUrl: m.media_url.startsWith('http') ? m.media_url : `https://www.instagram.com/p/${shortcode}/`,
                      title: m.title || 'Instagram Showcase',
                    })
                  }
                }

                return (
                  <Link
                    key={m.id}
                    to="/gallery"
                    onClick={handleClick}
                    className="group relative overflow-hidden rounded-xl bg-[#e9e6e1]"
                    style={{ aspectRatio: '4/3' }}
                  >
                    <img
                      src={resolveAssetUrl(m.thumbnail_url || m.media_url)}
                      alt={m.title || ''}
                      loading="lazy"
                      className="size-full object-cover transition duration-700 group-hover:scale-105"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.dataset.fallback) {
                          t.dataset.fallback = '1'
                          t.src = resolveAssetUrl('/p/i-standee.jpg')
                        }
                      }}
                    />
                    {m.media_type === 'video' && (
                      <span className="absolute inset-0 grid place-items-center bg-navy/20">
                        <span className="grid size-12 place-items-center rounded-full bg-white/90 text-brand shadow-pop transition group-hover:scale-110">
                          <Play className="ml-0.5 size-5" fill="currentColor" />
                        </span>
                      </span>
                    )}
                    {m.media_type === 'instagram' && (
                      <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-pop transition group-hover:scale-105">
                        <InstagramIcon className="size-3" /> Reel
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/80 to-transparent p-3 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 flex items-end">
                      {m.title}
                    </div>
                  </Link>
                )
              })
            ) : (
              MEDIA.map((m) => (
                <Link key={m} to="/gallery" className="group overflow-hidden rounded-xl bg-[#e9e6e1]" style={{ aspectRatio: '4/3' }}>
                  <img
                    src={resolveAssetUrl(m)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition duration-700 group-hover:scale-105"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.dataset.fallback) {
                        t.dataset.fallback = '1'
                        t.src = resolveAssetUrl('/p/i-standee.jpg')
                      }
                    }}
                  />
                </Link>
              ))
            )}
          </div>
        </Container>
      </section>
    ),
    tf: () => (
      <section className="border-t border-line bg-soft py-12 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          <div>
            <SectionHead eyebrow="Customer feedback" title="Verified Customer Reviews" />
            {testimonials.length > 0 ? (
              <div className="space-y-4">
                {testimonials.map((t) => (
                  <div key={t.id} className="rounded-xl border border-line bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: t.rating || 5 }).map((_, idx) => (
                        <Star key={idx} className="size-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-3 text-base italic leading-relaxed text-ink">"{t.text}"</p>
                    <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                      <div>
                        <p className="font-bold text-ink">{t.author_name}</p>
                        <p className="text-xs text-ink-2">{t.company}</p>
                      </div>
                      <Badge tone="ok">Verified Client</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#c9c9d1] bg-white p-8">
                <QuoteIcon className="size-8 text-brand" />
                <p className="mt-3 text-lg font-medium text-ink-2">Authentic reviews published by verified customers.</p>
              </div>
            )}
          </div>
          <div>
            <SectionHead eyebrow="FAQ" title="Quick answers" />
            <Accordion items={activeFaqs} />
            <Link to="/faq" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">All FAQs <ArrowRight className="size-4" /></Link>
          </div>
        </Container>
      </section>
    ),
    contact: () => (
      <section className="bg-brand py-12 text-white sm:py-16">
        <Container className="flex flex-wrap items-center justify-between gap-6 sm:gap-8">
          <div className="min-w-0 flex-1">
            <h2 className="cta-heading font-bold uppercase font-display">
              {activeContact?.title ? (
                activeContact.title
              ) : (
                <>Ready to light up<br />your brand?</>
              )}
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
              {activeContact?.text || 'Tell us what you need — product, size, quantity — and our team will get back to you.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Btn size="lg" variant="dark" to={activeContact?.to || '/quote'}>
              {activeContact?.cta || 'Request a quote'}
            </Btn>
            <Btn size="lg" variant="ghostLight" to="/contact">Contact us</Btn>
          </div>
        </Container>
      </section>
    ),
    footer: () => (
      previewProps ? (
        <div className="pointer-events-none">
          <Footer />
        </div>
      ) : null
    ),
  }

  return (
    <>
      {activeSecs.map((sec, idx) => {
        if (!isVisible(sec.id)) return null
        const render = sectionRenderers[sec.id]
        if (!render) return null
        const content = render()
        if (!content) return null
        const label = sec.label || DEFAULT_SECS.find((d) => d.id === sec.id)?.label || sec.id
        return renderSectionWrapper(sec.id, content, label, idx, activeSecs.length)
      })}

      {/* Video Modal Player */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur" onClick={() => setActiveVideoModal(null)}>
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveVideoModal(null)}
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/20 text-white hover:bg-white/40"
              aria-label="Close video"
            >
              <X className="size-5" />
            </button>
            {activeVideoModal.includes('youtube.com') || activeVideoModal.includes('youtu.be') ? (
              <iframe
                src={activeVideoModal.replace('watch?v=', 'embed/')}
                title="Product video"
                className="aspect-video w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : activeVideoModal.includes('cloudflarestream.com') || activeVideoModal.includes('videodelivery.net') || activeVideoModal.includes('vimeo.com') ? (
              <iframe
                src={activeVideoModal}
                title="Product video"
                className="aspect-video w-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            ) : (
              <video src={activeVideoModal} controls autoPlay className="aspect-video w-full" />
            )}
          </div>
        </div>
      )}

      {/* Instagram Reel / Post Modal Player */}
      {activeInstagram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/90 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Instagram viewer"
          onClick={() => setActiveInstagram(null)}
        >
          <div
            className="anim-pop relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line bg-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white">
                  <InstagramIcon className="size-4" />
                </span>
                <span className="truncate text-sm font-semibold text-navy">
                  {activeInstagram.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeInstagram.cleanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
                >
                  Open <ExternalLink className="size-3" />
                </a>
                <button
                  onClick={() => setActiveInstagram(null)}
                  className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-line hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-900/5 p-3 grid place-items-center">
              <iframe
                src={activeInstagram.embedUrl}
                title={activeInstagram.title}
                className="h-[520px] w-full max-w-[360px] rounded-xl border-0 shadow-sm"
                loading="lazy"
                allowTransparency
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
