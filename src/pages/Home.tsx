import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  ArrowRight, ArrowUp, ArrowDown, ArrowUpRight, Layers, Mail, MessageCircle, Play,
  Quote as QuoteIcon, Ruler, Sparkles, Star, Truck, Wand2, ExternalLink, X,
  ShieldCheck, Box, SlidersHorizontal, Check, RefreshCw, ChevronLeft, ChevronRight,
  Volume2, VolumeX, ShoppingBag,
  ShoppingCart, Pause
} from 'lucide-react'
import { INDUSTRIES, FAQS as FALLBACK_FAQS, CATS, byId, catName } from '../data'
import { Link, useApp, resolveAssetUrl, go } from '../store'
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
  { id: 'featured', label: 'Featured products for sale' },
  { id: 'reels', label: 'Commercial display reels' },
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
  editOpen?: boolean
  onSelectSection?: (id: string) => void
  onMoveSection?: (id: string, delta: number) => void
  onToggleSection?: (id: string, on: boolean) => void
  mode?: string
}

function HorizontalCategorySection({
  displayCats,
  products,
  isPreview,
  title,
  eyebrow,
}: {
  displayCats: any[]
  products: any[]
  isPreview?: boolean
  title?: string
  eyebrow?: string
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
      className="relative bg-white"
      style={{ minHeight: isPreview ? 'auto' : `${Math.max(180, (totalCards + 1) * 35)}vh` }}
    >
      <div
        ref={stickyRef}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cx(
          'sticky top-0 h-screen max-h-screen overflow-hidden flex flex-col justify-between py-8 sm:py-12 z-10',
          isPreview && 'static h-auto max-h-none py-8'
        )}
      >
        {/* Minimal Header */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 shrink-0">
          <div className="flex items-end justify-between gap-6 pb-4 border-b border-line/50">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-1">
                {eyebrow || 'Categories'}
              </p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy">
                {title || 'Shop by category'}
              </h2>
            </div>

            {/* Clean Controls: Counter + Prev/Next + All Products */}
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-xs font-mono text-ink-2">
                0{activeIndex + 1} <span className="opacity-40">/</span> 0{totalCards}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  aria-label="Previous category"
                  className="grid size-9 place-items-center rounded-full border border-line bg-white hover:bg-slate-50 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer text-navy"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={activeIndex === totalCards - 1}
                  aria-label="Next category"
                  className="grid size-9 place-items-center rounded-full border border-line bg-white hover:bg-slate-50 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer text-navy"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <Link
                to="/shop"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline pl-2"
              >
                All products <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Minimal Cards Track */}
        <div className="w-full overflow-hidden flex-1 flex items-center">
          <div
            ref={trackRef}
            className={cx(
              'flex items-center gap-5 sm:gap-7 px-4 sm:px-8 lg:px-12 transition-transform duration-100 ease-out will-change-transform',
              isPreview && 'overflow-x-auto max-w-full pb-4 scrollbar-none'
            )}
          >
            {displayCats.map((cat) => {
              const catProducts = products.filter(
                (p) =>
                  p.cat === cat.id ||
                  p.category_slug === cat.id ||
                  p.category_id === cat.id ||
                  p.cat?.toLowerCase() === cat.name?.toLowerCase()
              )
              const validPrices = catProducts
                .map((p) => p.price)
                .filter((pr): pr is number => typeof pr === 'number' && pr > 0)
              const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null
              const meta = CATEGORY_META[cat.id]
              const priceTag = meta?.startingPrice || (minPrice ? `From ₹${minPrice.toLocaleString('en-IN')}` : '')

              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  className="group relative flex flex-col justify-end overflow-hidden rounded-2xl sm:rounded-3xl bg-neutral-900 shadow-lg transition-transform duration-500 hover:-translate-y-1 shrink-0 select-none w-[78vw] max-w-[340px] sm:w-[420px] md:w-[480px] lg:w-[520px] h-[440px] sm:h-[480px] lg:h-[520px]"
                >
                  {/* Clean Background Image */}
                  <img
                    src={resolveAssetUrl(cat.img)}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={(e) => {
                      const t = e.currentTarget
                      if (!t.dataset.fallback) {
                        t.dataset.fallback = '1'
                        t.src = resolveAssetUrl('/p/i-standee.jpg')
                      }
                    }}
                  />

                  {/* Soft Vignette / Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                  {/* Minimal Content Overlay */}
                  <div className="relative z-10 p-6 sm:p-8 text-white flex items-end justify-between gap-4">
                    <div>
                      {priceTag && (
                        <p className="text-xs font-medium text-white/70 mb-1 tracking-wide">
                          {priceTag}
                        </p>
                      )}
                      <h3 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug group-hover:text-brand transition-colors">
                        {cat.name}
                      </h3>
                    </div>

                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur-md text-white transition-all group-hover:bg-brand group-hover:scale-110">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 shrink-0">
          <div className="h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-100 ease-out rounded-full"
              style={{ width: `${Math.max(progress * 100, 3)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

interface TedyGallerySlide {
  id: string | number
  title: string
  venue: string
  tag: string
  img: string
  media_type?: string
  media_url?: string
  embed_url?: string
}

function TedyScrollGallery({
  slides,
  isPreview,
  title = 'Displays at work',
  eyebrow = 'Live Installations',
  onOpenVideo,
  onOpenInstagram,
}: {
  slides: TedyGallerySlide[]
  isPreview?: boolean
  title?: string
  eyebrow?: string
  onOpenVideo?: (url: string) => void
  onOpenInstagram?: (data: { embedUrl: string; cleanUrl: string; title: string }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const totalSlides = slides.length

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scrollParent = container.closest('.overflow-y-auto') || window

    const onScroll = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight
      if (totalScrollable <= 0) return

      let p = 0
      if (scrollParent === window) {
        const scrolled = -rect.top
        p = Math.min(Math.max(scrolled / totalScrollable, 0), 1)
      } else {
        const parentElem = scrollParent as HTMLElement
        const parentScrollTop = parentElem.scrollTop
        const sectionOffsetTop = containerRef.current.offsetTop
        const height = containerRef.current.offsetHeight - parentElem.clientHeight
        if (height > 0) {
          const scrolled = parentScrollTop - sectionOffsetTop
          p = Math.min(Math.max(scrolled / height, 0), 1)
        }
      }

      setProgress(p)
      const currentIdx = Math.min(totalSlides - 1, Math.floor(p * totalSlides))
      setActiveIndex(currentIdx)
    }

    if (scrollParent === window) {
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    } else {
      const parentElem = scrollParent as HTMLElement
      parentElem.addEventListener('scroll', onScroll, { passive: true })
      return () => parentElem.removeEventListener('scroll', onScroll)
    }
  }, [totalSlides])

  // Slide navigation by clicking dots, chevrons, or swiping
  const goToSlide = (index: number) => {
    const targetIdx = Math.max(0, Math.min(totalSlides - 1, index))
    setActiveIndex(targetIdx)
    if (!containerRef.current) return
    const container = containerRef.current
    const scrollParent = container.closest('.overflow-y-auto') || window
    const targetP = totalSlides > 1 ? targetIdx / (totalSlides - 1) : 0
    const totalScrollable = container.offsetHeight - (scrollParent === window ? window.innerHeight : (scrollParent as HTMLElement).clientHeight)
    if (totalScrollable <= 0) return

    const targetScrollY = container.offsetTop + targetP * totalScrollable
    if (scrollParent === window) {
      window.scrollTo({ top: targetScrollY, behavior: 'smooth' })
    } else {
      (scrollParent as HTMLElement).scrollTo({ top: targetScrollY, behavior: 'smooth' })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToSlide(activeIndex + 1)
      } else {
        goToSlide(activeIndex - 1)
      }
    }
    setTouchStartX(null)
  }

  // Calculate local progress within the active slide (0 -> 1)
  const segmentSize = totalSlides > 0 ? 1 / totalSlides : 1
  const localSlideProgress = Math.min(
    1,
    Math.max(0, (progress - activeIndex * segmentSize) / segmentSize)
  )

  // 3D perspective & scale effect calculation (Tedy signature feel)
  const tiltDeg = (1 - localSlideProgress) * -1.8
  const scaleVal = 0.98 + localSlideProgress * 0.03

  const currentSlide = slides[activeIndex] || slides[0]

  return (
    <div
      ref={containerRef}
      className={cx(
        'relative bg-navy text-white selection:bg-brand selection:text-white',
        isPreview ? 'min-h-[160vh]' : 'min-h-[260vh] sm:min-h-[300vh]'
      )}
    >
      {/* Sticky viewport frame that locks in place while user scrolls through the timeline */}
      <div
        ref={stickyRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="sticky top-0 h-screen max-h-screen w-full flex flex-col justify-between py-6 sm:py-8 overflow-hidden z-10"
      >
        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -left-48 top-1/3 size-[500px] rounded-full bg-brand/12 blur-[140px]" />
        <div className="pointer-events-none absolute -right-48 bottom-1/4 size-[500px] rounded-full bg-purple-600/10 blur-[140px]" />

        <Container className="relative flex flex-col justify-between h-full max-w-6xl mx-auto w-full px-4 sm:px-6">
          {/* Minimal Header */}
          <div className="flex items-center justify-between gap-4 shrink-0 pb-3 border-b border-white/10">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#ff9b73]">
                {eyebrow}
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white font-display mt-0.5">
                {title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Slide Counter */}
              <div className="font-mono text-xs sm:text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                <span className="font-bold text-white">0{activeIndex + 1}</span>
                <span className="text-white/40 mx-1.5">/</span>
                <span>0{totalSlides}</span>
              </div>

              {/* Prev / Next Chevrons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndex - 1)}
                  disabled={activeIndex === 0}
                  aria-label="Previous installation"
                  className="grid size-8 sm:size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-20 disabled:pointer-events-none text-white transition border border-white/10 cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndex + 1)}
                  disabled={activeIndex === totalSlides - 1}
                  aria-label="Next installation"
                  className="grid size-8 sm:size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-20 disabled:pointer-events-none text-white transition border border-white/10 cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Minimal Link */}
              <Link
                to="/gallery"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-brand transition pl-2"
              >
                <span>All installations</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Central Tedy Media Stage with 3D Tilt & Subtle Perspective */}
          <div className="relative flex-1 flex items-center justify-center py-3 sm:py-5 min-h-0 [perspective:1200px]">
            <div
              className="relative w-full max-w-4xl h-full max-h-[58vh] sm:max-h-[64vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 border border-white/15 shadow-2xl transition-transform duration-300 ease-out will-change-transform"
              style={{
                transform: `scale(${scaleVal}) rotateX(${tiltDeg}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Stacked Images / Media with Smooth Scroll Transitions */}
              {slides.map((s, idx) => {
                const isActive = idx === activeIndex
                const isPassed = idx < activeIndex
                return (
                  <div
                    key={s.id}
                    className={cx(
                      'absolute inset-0 size-full transition-all duration-700 ease-out',
                      isActive
                        ? 'opacity-100 scale-100 z-10 pointer-events-auto'
                        : isPassed
                        ? 'opacity-0 scale-95 z-0 pointer-events-none'
                        : 'opacity-0 scale-105 z-0 pointer-events-none'
                    )}
                  >
                    <img
                      src={resolveAssetUrl(s.img)}
                      alt={s.title}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      className="size-full object-cover object-center"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.dataset.fallback) {
                          t.dataset.fallback = '1'
                          t.src = resolveAssetUrl('/p/hero.jpg')
                        }
                      }}
                    />

                    {/* Subtle Cinematic Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Media Type Badges / Lightbox Triggers */}
                    {s.media_type === 'video' && s.media_url && (
                      <button
                        type="button"
                        onClick={() => onOpenVideo?.(s.media_url!)}
                        className="absolute inset-0 grid place-items-center group/btn z-20 cursor-pointer"
                        aria-label="Play video"
                      >
                        <span className="grid size-14 sm:size-16 place-items-center rounded-full bg-white/90 text-brand shadow-2xl transition-all duration-300 group-hover/btn:scale-110 group-hover/btn:bg-white">
                          <Play className="ml-1 size-6 sm:size-7" fill="currentColor" />
                        </span>
                      </button>
                    )}

                    {s.media_type === 'instagram' && (
                      <button
                        type="button"
                        onClick={() => {
                          const scMatch = s.media_url?.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
                          const shortcode = scMatch ? scMatch[1] : ''
                          onOpenInstagram?.({
                            embedUrl: s.embed_url || `https://www.instagram.com/p/${shortcode}/embed/`,
                            cleanUrl: s.media_url?.startsWith('http') ? s.media_url : `https://www.instagram.com/p/${shortcode}/`,
                            title: s.title,
                          })
                        }}
                        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xl hover:scale-105 transition cursor-pointer"
                      >
                        <InstagramIcon className="size-3.5" />
                        <span>Watch Reel</span>
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Minimal Floating Info Capsule (Bottom Overlay) */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-20 flex items-end justify-between gap-4 pointer-events-auto">
                <div className="rounded-xl sm:rounded-2xl bg-black/60 backdrop-blur-md p-3 sm:p-4 border border-white/15 max-w-lg shadow-xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff9b73] border border-brand/30 mb-1.5">
                    <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                    {currentSlide.tag}
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">
                    {currentSlide.title}
                  </h3>
                  <p className="text-xs text-white/70 truncate mt-0.5">
                    {currentSlide.venue}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-xl bg-black/50 backdrop-blur-md px-3.5 py-2 border border-white/10 text-xs text-white/60">
                  <span className="size-1.5 rounded-full bg-white/40 animate-ping" />
                  <span>Scroll to advance</span>
                  <ArrowDown className="size-3 text-white/50 animate-bounce" />
                </div>
              </div>
            </div>
          </div>

          {/* Minimalist Segmented Scrubber (Tedy timeline signature) */}
          <div className="shrink-0 pt-2 pb-1">
            <div className="flex items-center gap-1.5 sm:gap-2 w-full max-w-4xl mx-auto">
              {slides.map((_, i) => {
                const isPast = i < activeIndex
                const isCurrent = i === activeIndex
                const fillWidth = isPast ? 100 : isCurrent ? localSlideProgress * 100 : 0

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToSlide(i)}
                    aria-label={`Jump to slide ${i + 1}`}
                    className="group/seg relative h-2 flex-1 rounded-full bg-white/15 overflow-hidden transition-all duration-200 cursor-pointer hover:h-2.5 hover:bg-white/25"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-brand rounded-full transition-all duration-100 ease-out"
                      style={{ width: `${fillWidth}%` }}
                    />
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/45 max-w-4xl mx-auto mt-2 px-0.5 font-medium">
              <span>01 / {slides[0]?.tag || 'Showroom'}</span>
              <span className="hidden xs:inline">Interactive Scroll Timeline</span>
              <span>0{totalSlides} / {slides[totalSlides - 1]?.tag || 'Outdoor'}</span>
            </div>
          </div>
        </Container>
      </div>
    </div>
  )
}

interface FeyGalleryItem {
  id: string | number
  title: string
  venue: string
  city: string
  tag: string
  specs: string[]
  img: string
  media_type?: string
  media_url?: string
  embed_url?: string
}

function FeyStackedGallery({
  items,
  title = 'Displays at work',
  eyebrow = 'Live Installations',
  isPreview,
  onOpenVideo,
  onOpenInstagram,
}: {
  items: FeyGalleryItem[]
  title?: string
  eyebrow?: string
  isPreview?: boolean
  onOpenVideo?: (url: string) => void
  onOpenInstagram?: (data: { embedUrl: string; cleanUrl: string; title: string }) => void
}) {
  return (
    <section className="relative py-16 sm:py-24 bg-[#0a0f1d] text-white overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-48 top-1/4 size-[550px] rounded-full bg-brand/10 blur-[150px]" />
      <div className="pointer-events-none absolute -right-48 bottom-1/4 size-[550px] rounded-full bg-blue-600/10 blur-[150px]" />

      <Container className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Minimal Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-14 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#ff9b73] border border-brand/30 mb-2">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              {eyebrow}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white font-display">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-white/50 font-mono hidden sm:inline">
              Scroll down to stack installations ↓
            </span>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-brand transition rounded-full bg-white/10 px-4 py-2 border border-white/15 hover:bg-white/15"
            >
              <span>Explore full gallery</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* The Stacked Card Deck (Fey Animation) */}
        <div className="relative space-y-8 sm:space-y-10 pb-12">
          {items.map((item, index) => {
            return (
              <div
                key={item.id}
                style={{
                  top: `calc(72px + ${index * 20}px)`,
                  zIndex: index + 1,
                }}
                className="sticky rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-[#131c2e] via-[#0d1424] to-[#0a0f1d] shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-7 lg:p-8 items-center">
                  {/* Left Column: Minimal Details */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white/50 bg-white/10 px-2.5 py-0.5 rounded border border-white/10">
                          0{index + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#ff9b73]">
                          {item.tag}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                        {item.venue}
                      </p>
                    </div>

                    {/* Minimal Action Row */}
                    <div className="pt-2 flex items-center gap-3">
                      <Link
                        to="/gallery"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-white transition group"
                      >
                        <span>View site deployment</span>
                        <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>

                      {item.media_type === 'instagram' && (
                        <button
                          type="button"
                          onClick={() => {
                            const scMatch = item.media_url?.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
                            const shortcode = scMatch ? scMatch[1] : ''
                            onOpenInstagram?.({
                              embedUrl: item.embed_url || `https://www.instagram.com/p/${shortcode}/embed/`,
                              cleanUrl: item.media_url?.startsWith('http') ? item.media_url : `https://www.instagram.com/p/${shortcode}/`,
                              title: item.title,
                            })
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-3 py-1 rounded-full hover:opacity-90 transition shadow-sm cursor-pointer"
                        >
                          <InstagramIcon className="size-3" />
                          <span>Reel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: High-Res Media Showcase */}
                  <div className="lg:col-span-7 relative group/img overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 aspect-[16/10] sm:aspect-[16/9]">
                    <img
                      src={resolveAssetUrl(item.img)}
                      alt={item.title}
                      loading="lazy"
                      className="size-full object-cover object-center transition-transform duration-700 group-hover/img:scale-105"
                      onError={(e) => {
                        const t = e.currentTarget
                        if (!t.dataset.fallback) {
                          t.dataset.fallback = '1'
                          t.src = resolveAssetUrl('/p/hero.jpg')
                        }
                      }}
                    />

                    {/* Subtle Gradient Shadow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Video Play Button Overlay */}
                    {item.media_type === 'video' && item.media_url && (
                      <button
                        type="button"
                        onClick={() => onOpenVideo?.(item.media_url!)}
                        className="absolute inset-0 grid place-items-center group/play z-10 cursor-pointer"
                        aria-label="Play video"
                      >
                        <span className="grid size-12 sm:size-14 place-items-center rounded-full bg-white/90 text-brand shadow-2xl transition-all duration-300 group-hover/play:scale-110 group-hover/play:bg-white">
                          <Play className="ml-1 size-5 sm:size-6" fill="currentColor" />
                        </span>
                      </button>
                    )}

                    {/* City Location Tag in Image Corner */}
                    <div className="absolute bottom-3 right-3 z-10 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-white/80">
                      📍 {item.city}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

interface TickerCardData {
  id: string | number
  title: string
  venue: string
  city?: string
  tag: string
  specs?: string[]
  img: string
  media_type?: string
  media_url?: string
  embed_url?: string
}

function FramerTickerRow({
  items,
  direction = 'left',
  speedMultiplier = 1,
  isPaused = false,
  onOpenVideo,
  onOpenInstagram,
}: {
  items: TickerCardData[]
  direction?: 'left' | 'right'
  speedMultiplier?: number
  isPaused?: boolean
  onOpenVideo?: (url: string) => void
  onOpenInstagram?: (data: { embedUrl: string; cleanUrl: string; title: string }) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const offsetRef = useRef(0)
  const targetOffsetRef = useRef(0)
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0)
  const setWidthRef = useRef(0)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartOffsetRef = useRef(0)

  // Quadruple items to guarantee seamless infinite wrapping across 4K displays
  const quadItems = useMemo(() => [...items, ...items, ...items, ...items], [items])

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return
      const totalWidth = trackRef.current.scrollWidth
      if (totalWidth > 0) {
        setWidthRef.current = totalWidth / 4
      }
    }
    measure()
    const timer = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [quadItems])

  useEffect(() => {
    let animId: number
    const baseAmbient = direction === 'left' ? 0.65 : -0.65

    const onScroll = () => {
      const currentScrollY = window.scrollY
      const deltaY = currentScrollY - lastScrollYRef.current
      lastScrollYRef.current = currentScrollY

      // Framer Ticker scroll physics:
      // Scrolling down drives leftward motion for 'left' row, rightward for 'right' row
      const scrollFactor = direction === 'left' ? 0.95 : -0.95
      targetOffsetRef.current += deltaY * scrollFactor * speedMultiplier
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    const tick = () => {
      // Ambient drift when not dragging and not paused
      if (!isDraggingRef.current && !isPaused) {
        if (!isHovered) {
          targetOffsetRef.current += baseAmbient * speedMultiplier
        } else {
          // Slow silky crawl on card hover so user can read details
          targetOffsetRef.current += (baseAmbient * 0.15) * speedMultiplier
        }
      }

      // Spring-damped lerp interpolation (Framer smooth physics)
      offsetRef.current += (targetOffsetRef.current - offsetRef.current) * 0.1

      const setWidth = setWidthRef.current
      if (setWidth > 0) {
        let wrapped = offsetRef.current % setWidth
        if (wrapped < 0) wrapped += setWidth
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(-${wrapped}px, 0, 0)`
        }
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(animId)
    }
  }, [direction, speedMultiplier, isHovered, isPaused])

  const handleWheel = (e: React.WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    targetOffsetRef.current += delta * 0.8
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true
    dragStartXRef.current = e.touches[0].clientX
    dragStartOffsetRef.current = targetOffsetRef.current
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return
    const deltaX = dragStartXRef.current - e.touches[0].clientX
    targetOffsetRef.current = dragStartOffsetRef.current + deltaX * 1.2
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
  }

  return (
    <div
      className="relative w-full overflow-hidden select-none py-2 cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={trackRef}
        className="flex items-center gap-5 sm:gap-6 will-change-transform"
        style={{ width: 'max-content' }}
      >
        {quadItems.map((card, idx) => (
          <div
            key={`${card.id}-${idx}`}
            className="group relative w-[310px] sm:w-[370px] md:w-[420px] shrink-0 rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-[#131c2e]/90 via-[#0d1424]/90 to-[#070b14]/90 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:border-brand/60 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(255,107,38,0.18)]"
          >
            {/* Visual Media with 16:10 ratio */}
            <div className="relative aspect-[16/10] overflow-hidden bg-black/50">
              <img
                src={resolveAssetUrl(card.img)}
                alt={card.title}
                loading="lazy"
                className="size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                onError={(e) => {
                  const t = e.currentTarget
                  if (!t.dataset.fallback) {
                    t.dataset.fallback = '1'
                    t.src = resolveAssetUrl('/p/ultraslim.jpg')
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

              {/* Minimal Tag Pill */}
              {card.tag && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-white/80 border border-white/10">
                    {card.tag}
                  </span>
                </div>
              )}

              {/* Video Play Overlay */}
              {card.media_type === 'video' && card.media_url && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenVideo?.(card.media_url!)
                  }}
                  className="absolute inset-0 grid place-items-center group/play z-20 cursor-pointer"
                  aria-label="Play video demo"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-white/90 text-brand shadow-xl transition-all duration-300 group-hover/play:scale-110 group-hover/play:bg-white">
                    <Play className="ml-0.5 size-4" fill="currentColor" />
                  </span>
                </button>
              )}

              {/* Instagram Reel Overlay */}
              {card.media_type === 'instagram' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const scMatch = card.media_url?.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
                    const shortcode = scMatch ? scMatch[1] : ''
                    onOpenInstagram?.({
                      embedUrl: card.embed_url || `https://www.instagram.com/p/${shortcode}/embed/`,
                      cleanUrl: card.media_url?.startsWith('http') ? card.media_url : `https://www.instagram.com/p/${shortcode}/`,
                      title: card.title,
                    })
                  }}
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md hover:scale-105 transition cursor-pointer"
                >
                  <InstagramIcon className="size-3" />
                  <span>Reel</span>
                </button>
              )}
            </div>

            {/* Minimal Content Details */}
            <div className="p-3.5 sm:p-4">
              <h4 className="text-sm font-semibold text-white tracking-tight line-clamp-1 group-hover:text-brand transition">
                {card.title}
              </h4>
              <p className="mt-1 text-xs text-white/50 truncate">
                {card.city ? `${card.city} · ${card.venue}` : card.venue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FramerTickerGallery({
  items,
  title = 'Displays at work',
  eyebrow = 'Live Installations Across India',
  isPreview,
  onOpenVideo,
  onOpenInstagram,
}: {
  items: TickerCardData[]
  title?: string
  eyebrow?: string
  isPreview?: boolean
  onOpenVideo?: (url: string) => void
  onOpenInstagram?: (data: { embedUrl: string; cleanUrl: string; title: string }) => void
}) {
  const [isPaused, setIsPaused] = useState(false)

  // Split into two complementary rows
  const { row1, row2 } = useMemo(() => {
    if (items.length >= 8) {
      return {
        row1: items.filter((_, i) => i % 2 === 0),
        row2: items.filter((_, i) => i % 2 === 1),
      }
    }
    // Fallback curated split
    return {
      row1: [
        {
          id: 'ft1',
          title: 'Ultra-Slim Backlit Commercial Light Box',
          venue: 'Phoenix Marketcity Mall · Main Luxury Atrium',
          city: 'Mumbai',
          tag: '✦ Storefront Flagship',
          specs: ['1200 Nits Edge-LED', '28mm Aircraft Frame'],
          img: '/p/ultraslim.jpg',
        },
        {
          id: 'ft2',
          title: 'Magnetic Seamless LED Fabric Light Box',
          venue: 'Mercedes-Benz Experience Center · Feature Wall',
          city: 'Chennai',
          tag: '✦ Automobile Showroom',
          specs: ['Frameless Silicone Edge', '24/7 Continuous Rating'],
          img: '/p/fabric.jpg',
        },
        {
          id: 'ft3',
          title: 'Heavy-Duty Commercial Outdoor Pavilion Display',
          venue: 'DLF CyberHub Open Promenade & Boulevard',
          city: 'Gurugram',
          tag: '✦ Outdoor Signage',
          specs: ['IP65 Weatherproof', 'Anti-Glare Glass'],
          img: '/p/gazebo.jpg',
        },
        {
          id: 'ft4',
          title: 'Frameless Fabric Illuminated Column',
          venue: 'Kempegowda Int\'l Airport T2 · Departure Terminal',
          city: 'Bengaluru',
          tag: '✦ Airport Terminal',
          specs: ['High CRI 95+', '360° Uniform Illumination'],
          img: '/p/banner.jpg',
        },
        {
          id: 'ft5',
          title: 'A-Frame Magnetic Sidewalk Display Board',
          venue: 'Connaught Place Luxury Fashion Storefront',
          city: 'New Delhi',
          tag: '✦ Retail Pavement',
          specs: ['Anodized Jet-Black', 'Instant Poster Swap'],
          img: '/p/a-board.jpg',
        },
      ],
      row2: [
        {
          id: 'ft6',
          title: 'E-Series 55" 4K Commercial Wall Signage',
          venue: 'Global Tech Park Headquarters · Reception Directory',
          city: 'Bangalore',
          tag: '✦ Corporate Lobby',
          specs: ['4K Ultra HD IPS', 'Cloud CMS Broadcaster'],
          img: '/p/frames.jpg',
        },
        {
          id: 'ft7',
          title: 'Freestanding Double-Sided Digital Standee',
          venue: 'Pragati Maidan Convention Center · Hall 4 Exhibition',
          city: 'New Delhi',
          tag: '✦ Exhibition & Events',
          specs: ['Dual 55" FHD Displays', 'Heavy-Duty Steel Base'],
          img: '/p/i-standee.jpg',
        },
        {
          id: 'ft8',
          title: 'Rotating Cylindrical LED Light Pillar',
          venue: 'Jio World Drive Luxury Mall · BKC Luxury Wing',
          city: 'Mumbai',
          tag: '✦ Luxury Retail',
          specs: ['360° Uniform Light', 'Mirror Polished Base'],
          img: '/p/standee.jpg',
        },
        {
          id: 'ft9',
          title: 'Interactive Commercial Wayfinding Kiosk',
          venue: 'Apollo Medical Center Atrium · Patient Navigation',
          city: 'Hyderabad',
          tag: '✦ Healthcare Directory',
          specs: ['Capacitive Multi-Touch', 'Antimicrobial Coating'],
          img: '/p/counter.jpg',
        },
        {
          id: 'ft10',
          title: 'Architectural LED Backlit Reception Sign',
          venue: 'WeWork Galaxy HQ · Residency Road Center',
          city: 'Bangalore',
          tag: '✦ Tech Co-Working',
          specs: ['Laser-Cut Acrylic', 'Ambient Halo Glow'],
          img: '/p/round.jpg',
        },
      ],
    }
  }, [items])

  return (
    <section className="relative py-10 sm:py-14 bg-[#060913] text-white overflow-hidden">
      {/* Ambient Radial Lighting */}
      <div className="pointer-events-none absolute -left-40 top-1/4 size-[500px] rounded-full bg-brand/10 blur-[150px]" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 size-[500px] rounded-full bg-blue-600/10 blur-[150px]" />

      <Container className="relative max-w-7xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8">
        {/* Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#ff9b73]">{eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display mt-1">
              {title}
            </h2>
          </div>

          {/* Interactive Controls & Link */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-white/10 px-3 py-1.5 border border-white/15 hover:bg-white/15 text-white/80 transition cursor-pointer"
            >
              {isPaused ? <Play className="size-3 text-emerald-400" /> : <Pause className="size-3 text-amber-400" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <Link
              to="/gallery"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-white transition"
            >
              <span>View full gallery</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Container>

      {/* Panoramic Framer Ticker Streams with Edge Fade Masks */}
      <div
        className="relative w-full space-y-4 sm:space-y-5"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
        }}
      >
        {/* Soft edge curtains for extra polish */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#060913] to-transparent z-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#060913] to-transparent z-20" />

        {/* Row 1: Leftward drift / accelerated leftward on scroll-down */}
        <FramerTickerRow
          items={row1}
          direction="left"
          speedMultiplier={1}
          isPaused={isPaused}
          onOpenVideo={onOpenVideo}
          onOpenInstagram={onOpenInstagram}
        />

        {/* Row 2: Rightward drift / accelerated rightward on scroll-down */}
        <FramerTickerRow
          items={row2}
          direction="right"
          speedMultiplier={0.95}
          isPaused={isPaused}
          onOpenVideo={onOpenVideo}
          onOpenInstagram={onOpenInstagram}
        />
      </div>
    </section>
  )
}

export default function Home({ previewProps }: { previewProps?: HomePreviewProps } = {}) {
  const { products, categories, isLoadingCatalogue, addToCart, toast } = useApp()
  const [homeData, setHomeData] = useState<ApiHomepageData | null>(null)
  const [faqs, setFaqs] = useState<[string, string][]>([])
  const [loading, setLoading] = useState(!previewProps)
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null)
  const [activeInstagram, setActiveInstagram] = useState<{ embedUrl: string; cleanUrl: string; title: string } | null>(null)
  const [activeCatTab, setActiveCatTab] = useState<string>('all')

  // Direct Product Selling Filter
  const [activeProductTab, setActiveProductTab] = useState<string>('all')

  // Commercial Reels Showcase State
  const [activeReel, setActiveReel] = useState<any | null>(null)
  const [reelMuted, setReelMuted] = useState(true)
  const reelsScrollRef = useRef<HTMLDivElement>(null)

  const scrollReels = (delta: number) => {
    if (reelsScrollRef.current) {
      reelsScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' })
    }
  }

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
    const rawList = Array.isArray(c?.cats)
      ? c.cats
      : Array.isArray(c?.cats?.items)
      ? c.cats.items
      : null

    if (rawList && rawList.length > 0) {
      return rawList.map((k: string) => {
        const found = categories.find((cat) => cat.id === k || cat.slug === k || cat.name.toLowerCase() === k.toLowerCase()) || CATS.find((cat) => cat.id === k)
        return found ? {
          id: found.id || found.slug,
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
          id: cat.slug || cat.id,
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

  // Filtered products for direct commercial selling grid (immediate commerce, no fluff)
  const filteredProductsForSale = useMemo(() => {
    if (activeProductTab === 'all') {
      return featured.length > 0 ? featured : products.slice(0, 8)
    }
    const tabMatch = products.filter((p) => {
      const cat = (p.cat || '').toLowerCase()
      const name = (p.name || '').toLowerCase()
      if (activeProductTab === 'digital') {
        return cat.includes('digital') || cat.includes('kiosk') || cat.includes('standee') || name.includes('kiosk') || name.includes('standee')
      }
      if (activeProductTab === 'lightbox') {
        return cat.includes('led') || cat.includes('light') || cat.includes('box') || cat.includes('fabric') || name.includes('box') || name.includes('frame')
      }
      if (activeProductTab === 'acrylic') {
        return cat.includes('card') || cat.includes('acrylic') || cat.includes('tabletop') || name.includes('acrylic') || name.includes('stand')
      }
      if (activeProductTab === 'signage') {
        return cat.includes('lollipop') || cat.includes('roll') || cat.includes('sign') || cat.includes('outdoor') || name.includes('board')
      }
      return cat === activeProductTab || cat.includes(activeProductTab)
    })
    return tabMatch.length > 0 ? tabMatch : products.slice(0, 8)
  }, [activeProductTab, featured, products])

  // Vertical 9:16 Display Reels Showcase (curated video demos + live gallery items)
  const allReels = useMemo(() => {
    const curated = [
      {
        id: 'reel-1',
        title: '55" 4K Commercial Touch Kiosk · Live Store Demo',
        desc: 'Interactive 4K IPS capacitive touch kiosk running digital store showcase with 24/7 commercial hardware.',
        thumbnail: resolveAssetUrl('/p/i-standee.jpg'),
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-1728-large.mp4',
        duration: '0:34',
        views: '28.4K',
        likes: '1.4K',
        author: '@displaydelight',
        productId: products[0]?.id || '1',
        productName: products[0]?.name || '55" 4K Touch Kiosk',
        productPrice: products[0]?.price || 34900,
        productImg: resolveAssetUrl(products[0]?.img || '/p/i-standee.jpg'),
      },
      {
        id: 'reel-2',
        title: 'Ultra-Slim Edge-Lit Acrylic Snap Frame Glow',
        desc: 'Edge-lit 18mm optical cast acrylic frame with magnetic snap profile and 10-second graphic swap.',
        thumbnail: resolveAssetUrl('/p/ultraslim.jpg'),
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-wearing-a-face-mask-using-his-cell-phone-39757-large.mp4',
        duration: '0:22',
        views: '19.8K',
        likes: '940',
        author: '@displaydelight',
        productId: products[1]?.id || '2',
        productName: products[1]?.name || 'Ultra-Slim Snap Frame',
        productPrice: products[1]?.price || 950,
        productImg: resolveAssetUrl(products[1]?.img || '/p/ultraslim.jpg'),
      },
      {
        id: 'reel-3',
        title: '360° Motorized Rotating Outdoor Lollipop Board',
        desc: 'IP65 waterproof double-sided projection board for high-street footfall and 360-degree store visibility.',
        thumbnail: resolveAssetUrl('/p/t-led.jpg'),
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-video-of-a-woman-filming-a-city-at-night-42861-large.mp4',
        duration: '0:28',
        views: '32.1K',
        likes: '2.1K',
        author: '@displaydelight',
        productId: products[2]?.id || '3',
        productName: products[2]?.name || 'Rotating Lollipop Board',
        productPrice: products[2]?.price || 3200,
        productImg: resolveAssetUrl(products[2]?.img || '/p/t-led.jpg'),
      },
      {
        id: 'reel-4',
        title: 'High-Lumen Edge-Lit SEG Fabric Tension Box',
        desc: 'Seamless silicone edge tension fabric light box with edge-to-edge frameless glow and vibrant backlighting.',
        thumbnail: resolveAssetUrl('/p/backlit.jpg'),
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-vertical-41532-large.mp4',
        duration: '0:31',
        views: '15.6K',
        likes: '810',
        author: '@displaydelight',
        productId: products[3]?.id || '4',
        productName: products[3]?.name || 'SEG Fabric Light Box',
        productPrice: products[3]?.price || 8500,
        productImg: resolveAssetUrl(products[3]?.img || '/p/backlit.jpg'),
      },
      {
        id: 'reel-5',
        title: 'Commercial A-Stand Digital Poster Board',
        desc: 'Plug-and-play Android 24/7 commercial poster standee with anti-glare screen and heavy-duty casters.',
        thumbnail: resolveAssetUrl('/p/frames.jpg'),
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-shot-of-a-woman-reading-a-tablet-screen-41228-large.mp4',
        duration: '0:25',
        views: '24.9K',
        likes: '1.2K',
        author: '@displaydelight',
        productId: products[4]?.id || '5',
        productName: products[4]?.name || 'A-Stand Digital Poster',
        productPrice: products[4]?.price || 23160,
        productImg: resolveAssetUrl(products[4]?.img || '/p/frames.jpg'),
      },
    ]

    if (galleryItems && galleryItems.length > 0) {
      const dbReels = galleryItems
        .filter((g) => g.media_type === 'instagram' || g.media_type === 'video')
        .map((g, idx) => ({
          id: `db-reel-${g.id || idx}`,
          title: g.title || 'Client Installation Showcase',
          desc: 'Verified DisplayDelight commercial display setup in live client space.',
          thumbnail: resolveAssetUrl(g.thumbnail_url || g.media_url || '/p/i-standee.jpg'),
          videoUrl: g.media_url,
          embedUrl: g.embed_url,
          isInstagram: g.media_type === 'instagram',
          duration: '0:30',
          views: `${(18 + (idx * 3.4)).toFixed(1)}K`,
          likes: `${(900 + (idx * 140))}`,
          author: '@displaydelight',
          productId: g.prod || products[idx % products.length]?.id || '1',
          productName: products[idx % products.length]?.name || 'Commercial Display',
          productPrice: products[idx % products.length]?.price || 2499,
          productImg: resolveAssetUrl(products[idx % products.length]?.img || '/p/i-standee.jpg'),
        }))
      return [...dbReels, ...curated]
    }
    return curated
  }, [galleryItems, products])

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

        // Ensure reels is placed right after featured if not explicitly positioned yet
        if (key === 'featured' && !orderFromDb.includes('reels') && !seen.has('reels')) {
          const reelsDef = DEFAULT_SECS.find((d) => d.id === 'reels')
          if (reelsDef) {
            const reelsVis = homeData?.sections_visibility?.reels !== false
            list.push({ id: 'reels', label: reelsDef.label, on: reelsVis })
            seen.add('reels')
          }
        }
      })
      DEFAULT_SECS.forEach((def) => {
        if (!seen.has(def.id)) {
          const isVis = homeData?.sections_visibility ? homeData.sections_visibility[def.id] !== false : true
          const footerIdx = list.findIndex((s) => s.id === 'footer')
          if (footerIdx !== -1) {
            list.splice(footerIdx, 0, { ...def, on: isVis })
          } else {
            list.push({ ...def, on: isVis })
          }
          seen.add(def.id)
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
            isSelected && previewProps.editOpen
              ? 'opacity-100 bg-brand text-white p-1 pl-3 ring-2 ring-white/30 scale-100'
              : isSelected
              ? 'opacity-100 bg-navy/95 text-white p-1 pl-3 ring-2 ring-brand/50 scale-100'
              : 'opacity-0 group-hover/sec:opacity-100 bg-navy/90 text-white p-1 pl-2.5 scale-95 group-hover/sec:scale-100'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className={cx(
              'size-2 rounded-full',
              isSelected && previewProps.editOpen ? 'bg-emerald-400 animate-ping' : 'bg-white animate-pulse'
            )} />
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
              className={cx(
                'ml-0.5 rounded px-2.5 py-0.5 text-[11px] font-bold transition active:scale-95 flex items-center gap-1',
                isSelected && previewProps.editOpen
                  ? 'bg-white text-brand shadow-xs hover:bg-white/90 font-extrabold'
                  : 'bg-white/20 hover:bg-white/35 text-white'
              )}
            >
              <span>{isSelected && previewProps.editOpen ? 'Editing' : 'Edit'}</span>
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
        title={c?.cats?.title || homeData?.cats?.title}
        eyebrow={c?.cats?.subtitle || homeData?.cats?.subtitle}
      />
    ),
    featured: () => {
      const productTabs = [
        { id: 'all', label: 'All Displays for Sale' },
        { id: 'digital', label: 'Digital Standees & Kiosks' },
        { id: 'lightbox', label: 'LED Light Boxes' },
        { id: 'acrylic', label: 'Tabletop & Acrylic' },
        { id: 'signage', label: 'Outdoor & Signage' },
      ]

      return (
        <section className="bg-soft/70 py-10 sm:py-14 border-y border-line/60">
          <Container>
            {/* Minimal Clean Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy font-display">
                  Commercial Displays for Sale
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-ink-2">
                  In stock · Pan-India dispatch in 24–48 hrs · 1-Year Warranty · 18% GST Invoice
                </p>
              </div>

              <div className="shrink-0">
                <Btn variant="secondary" size="sm" to="/shop" iconRight icon={<ArrowRight className="size-4" />}>
                  Explore All ({products.length})
                </Btn>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 hide-scroll">
              {productTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveProductTab(tab.id)}
                  className={cx(
                    'shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer shadow-xs',
                    activeProductTab === tab.id
                      ? 'bg-navy text-white shadow-md ring-2 ring-brand/30'
                      : 'bg-white text-ink hover:bg-neutral-100 hover:text-navy border border-line'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Product Sales Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProductsForSale.slice(0, 8).map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>

            {/* Bottom Navigation Link */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line/70 pt-6">
              <p className="text-xs text-ink-2">
                Showing {Math.min(8, filteredProductsForSale.length)} of {products.length} commercial display units in stock.
              </p>
              <Btn to="/shop" size="md" iconRight icon={<ArrowRight className="size-4" />}>
                Browse Complete Storefront
              </Btn>
            </div>
          </Container>
        </section>
      )
    },
    reels: () => (
      <section className="bg-navy py-14 sm:py-20 text-white relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-40 top-1/2 size-96 -translate-y-1/2 rounded-full bg-brand/15 blur-[100px]" />
        <div className="pointer-events-none absolute -right-40 top-1/2 size-96 -translate-y-1/2 rounded-full bg-purple-600/15 blur-[100px]" />

        <Container className="relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-3.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/30 mb-2">
                <InstagramIcon className="size-3.5 text-rose-400" />
                Featured Commercial Reels · 9:16 Video Showcase
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight font-display">
                See Our Displays In Action
              </h2>
              <p className="mt-1 text-sm text-white/70 max-w-lg">
                Real customer unboxings, brightness demos, and showroom walk-throughs recorded directly from commercial installations.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollReels(-320)}
                aria-label="Previous reels"
                className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 text-white transition border border-white/10"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollReels(320)}
                aria-label="Next reels"
                className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 text-white transition border border-white/10"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {/* Reels Horizontal Carousel */}
          <div
            ref={reelsScrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 hide-scroll snap-x snap-mandatory scroll-smooth"
          >
            {allReels.map((reel) => (
              <div
                key={reel.id}
                onClick={() => setActiveReel(reel)}
                className="group relative w-60 sm:w-68 md:w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-900 border border-white/15 cursor-pointer shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-brand/60 hover:shadow-brand/20"
                style={{ aspectRatio: '9/16' }}
              >
                {/* Reel Poster Image */}
                <img
                  src={resolveAssetUrl(reel.thumbnail)}
                  alt={reel.title}
                  loading="lazy"
                  className="size-full object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
                  onError={(e) => {
                    const t = e.currentTarget
                    if (!t.dataset.fallback) {
                      t.dataset.fallback = '1'
                      t.src = resolveAssetUrl('/p/i-standee.jpg')
                    }
                  }}
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60 pointer-events-none" />

                {/* Top Badge: Instagram Tag + Views */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                  <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md">
                    <InstagramIcon className="size-3" /> Reel
                  </span>
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur">
                    👁 {reel.views}
                  </span>
                </div>

                {/* Center Play Button with Hover Pulse */}
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="grid size-14 place-items-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/40 shadow-2xl transition duration-300 group-hover:scale-115 group-hover:bg-brand">
                    <Play className="ml-1 size-6" fill="currentColor" />
                  </span>
                </div>

                {/* Bottom Overlay: Title & Tagged Product Buy Pill */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono font-bold text-brand">
                      {reel.duration}
                    </span>
                    <span className="text-[11px] text-white/70 truncate">{reel.author}</span>
                  </div>

                  <h3 className="text-sm font-bold leading-snug text-white line-clamp-2 drop-shadow-sm">
                    {reel.title}
                  </h3>

                  {/* Pinned Tagged Product Chip */}
                  {reel.productId && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        go(`/product/${reel.productId}`)
                      }}
                      className="mt-1 flex items-center gap-2 rounded-xl bg-white/95 p-1.5 pr-2.5 text-navy shadow-lg backdrop-blur transition hover:bg-white active:scale-98"
                    >
                      <img
                        src={resolveAssetUrl(reel.productImg)}
                        alt=""
                        className="size-8 rounded-lg object-cover bg-neutral-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate leading-tight text-navy">{reel.productName}</p>
                        <p className="text-[10px] font-black text-brand leading-none">₹{Number(reel.productPrice).toLocaleString('en-IN')}</p>
                      </div>
                      <span className="rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shrink-0">
                        Buy
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-white/60">
            <span>Tap any reel to preview screen quality and live specifications in full vertical player.</span>
            <Link to="/gallery" className="inline-flex items-center gap-1 font-bold text-brand hover:underline">
              View All Video & Installation Demos <ArrowRight className="size-3.5" />
            </Link>
          </div>
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
    gallery: () => {
      if (c?.gallery?.style === 'tedy') {
        const tedySlides: TedyGallerySlide[] = (galleryItems && galleryItems.length > 0)
          ? galleryItems.slice(0, 6).map((item, idx) => ({
              id: item.id || idx,
              title: item.title || 'Commercial Display Installation',
              venue: item.description || 'Showroom & Retail Deployment · Real World Site',
              tag: item.media_type === 'video' ? 'Video Demo' : item.media_type === 'instagram' ? 'Reel Showcase' : 'Live Installation',
              img: item.thumbnail_url || item.media_url || '/p/ultraslim.jpg',
              media_type: item.media_type,
              media_url: item.media_url,
              embed_url: item.embed_url,
            }))
          : [
              {
                id: 'g1',
                title: 'Ultra-Slim Backlit Commercial Light Box',
                venue: 'Flagship Luxury Storefront · Mumbai Retail Center',
                tag: 'Storefront Display',
                img: '/p/ultraslim.jpg',
              },
              {
                id: 'g2',
                title: 'E-Series 55" 4K Digital Wall Signage',
                venue: 'Corporate Headquarters Atrium · Bangalore Tech Park',
                tag: 'Corporate Signage',
                img: '/p/frames.jpg',
              },
              {
                id: 'g3',
                title: 'Freestanding Double-Sided Digital Standee',
                venue: 'Convention Center Lobby · New Delhi Exhibition',
                tag: 'Freestanding Standee',
                img: '/p/i-standee.jpg',
              },
              {
                id: 'g4',
                title: 'Magnetic Seamless LED Fabric Light Box',
                venue: 'Automobile Experience Center · Chennai',
                tag: 'Showroom Illumination',
                img: '/p/fabric.jpg',
              },
              {
                id: 'g5',
                title: 'Heavy-Duty Commercial Outdoor Display',
                venue: 'Shopping Boulevard & Pavilion Entrance',
                tag: 'Outdoor Branding',
                img: '/p/gazebo.jpg',
              },
            ]

        return (
          <TedyScrollGallery
            slides={tedySlides}
            isPreview={Boolean(previewProps)}
            title={c?.gallery?.title || homeData?.gallery_title || 'Displays at work'}
            eyebrow={c?.gallery?.subtitle || 'Commercial Installations'}
            onOpenVideo={(url) => setActiveVideoModal(url)}
            onOpenInstagram={(data) => setActiveInstagram(data)}
          />
        )
      }

      if (c?.gallery?.style === 'fey') {
        const feyItems: FeyGalleryItem[] = (galleryItems && galleryItems.length > 0)
          ? galleryItems.slice(0, 5).map((item, idx) => ({
              id: item.id || idx,
              title: item.title || 'Commercial Display Installation',
              venue: item.description || 'Corporate & Retail Site Deployment',
              city: (item as any).city || 'Pan-India',
              tag: item.media_type === 'video' ? 'Video Demo' : item.media_type === 'instagram' ? 'Reel Showcase' : 'Live Installation',
              specs: ['Commercial Grade', 'High Luminance', 'Custom Branded'],
              img: item.thumbnail_url || item.media_url || '/p/ultraslim.jpg',
              media_type: item.media_type,
              media_url: item.media_url,
              embed_url: item.embed_url,
            }))
          : [
              {
                id: 'f1',
                title: 'Ultra-Slim Backlit Commercial Light Box',
                venue: 'Phoenix Marketcity Mall · Main Luxury Atrium',
                city: 'Mumbai',
                tag: '✦ Storefront Flagship',
                specs: ['1200 Nits Edge-LED', '28mm Aircraft Aluminum', 'Snap-Frame Poster Swap'],
                img: '/p/ultraslim.jpg',
              },
              {
                id: 'f2',
                title: 'E-Series 55" 4K Commercial Wall Signage',
                venue: 'Global Tech Park Headquarters · Reception & Directory',
                city: 'Bangalore',
                tag: '✦ Corporate Lobby',
                specs: ['4K Ultra HD IPS', '24/7 Continuous Operation', 'Cloud CMS Broadcaster'],
                img: '/p/frames.jpg',
              },
              {
                id: 'f3',
                title: 'Freestanding Double-Sided Digital Standee',
                venue: 'Pragati Maidan Convention Center · Hall 4 Exhibition',
                city: 'New Delhi',
                tag: '✦ Exhibition & Events',
                specs: ['Dual 55" FHD Displays', 'Heavy-Duty Steel Base', 'Built-in Stereo Audio'],
                img: '/p/i-standee.jpg',
              },
              {
                id: 'f4',
                title: 'Magnetic Seamless LED Fabric Light Box',
                venue: 'Mercedes-Benz Experience Center · Showroom Feature Wall',
                city: 'Chennai',
                tag: '✦ Automobile Showroom',
                specs: ['Frameless Silicone Edge Graphic', 'Vibrant Color Accuracy', 'Modular Extrusion'],
                img: '/p/fabric.jpg',
              },
              {
                id: 'f5',
                title: 'Heavy-Duty Commercial Outdoor Pavilion Display',
                venue: 'DLF CyberHub Open Promenade & Boulevard',
                city: 'Gurugram',
                tag: '✦ Outdoor Signage',
                specs: ['IP65 Weatherproof', 'Anti-Glare Tempered Glass', 'Wind-Resistant Base'],
                img: '/p/gazebo.jpg',
              },
            ]

        return (
          <FeyStackedGallery
            items={feyItems}
            title={c?.gallery?.title || homeData?.gallery_title || 'Displays at work'}
            eyebrow={c?.gallery?.subtitle || 'Live Installations'}
            isPreview={Boolean(previewProps)}
            onOpenVideo={(url) => setActiveVideoModal(url)}
            onOpenInstagram={(data) => setActiveInstagram(data)}
          />
        )
      }

      // Default & Highly-Requested: Framer University Ticker Scroll (Dual-Row Reactive Physics)
      const tickerItems: TickerCardData[] = (galleryItems && galleryItems.length > 0)
        ? galleryItems.map((item, idx) => ({
            id: item.id || idx,
            title: item.title || 'Commercial Display Installation',
            venue: item.description || 'Corporate & Retail Site Deployment',
            city: (item as any).city || 'Pan-India',
            tag: item.media_type === 'video' ? 'Video Demo' : item.media_type === 'instagram' ? 'Reel Showcase' : 'Live Installation',
            specs: ['Commercial Grade', 'High Luminance', 'Custom Branded'],
            img: item.thumbnail_url || item.media_url || '/p/ultraslim.jpg',
            media_type: item.media_type,
            media_url: item.media_url,
            embed_url: item.embed_url,
          }))
        : []

      return (
        <FramerTickerGallery
          items={tickerItems}
          title={c?.gallery?.title || homeData?.gallery_title || 'Displays at work'}
          eyebrow={c?.gallery?.subtitle || 'Live Installations Across India'}
          isPreview={Boolean(previewProps)}
          onOpenVideo={(url) => setActiveVideoModal(url)}
          onOpenInstagram={(data) => setActiveInstagram(data)}
        />
      )
    },
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

      {/* Interactive Vertical Reel Player Modal */}
      {activeReel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveReel(null)}
        >
          <div
            className="relative flex flex-col md:flex-row items-center gap-4 max-h-[96vh] w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Phone Container */}
            <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[9/16] overflow-hidden rounded-3xl bg-neutral-950 border border-white/20 shadow-2xl shrink-0">
              {/* Video Element */}
              <video
                src={activeReel.videoUrl}
                poster={activeReel.thumbnail}
                autoPlay
                loop
                playsInline
                muted={reelMuted}
                className="size-full object-cover"
              />

              {/* Gradient overlays */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

              {/* Top Bar Controls */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow">
                    <InstagramIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{activeReel.author}</p>
                    <p className="text-[10px] text-white/60">DisplayDelight Showroom</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReelMuted(!reelMuted)}
                    className="grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur transition"
                    title={reelMuted ? 'Unmute' : 'Mute'}
                  >
                    {reelMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReel(null)}
                    className="grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur transition"
                    title="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Bottom Details & Direct Product Action */}
              <div className="absolute bottom-4 inset-x-4 z-20 flex flex-col gap-2.5">
                <p className="text-sm font-bold text-white leading-tight drop-shadow">
                  {activeReel.title}
                </p>
                <p className="text-xs text-white/80 line-clamp-2">
                  {activeReel.desc}
                </p>

                {/* Tagged Product Box inside phone */}
                {activeReel.productId && (
                  <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 p-2 pr-3 text-navy shadow-xl backdrop-blur">
                    <img
                      src={resolveAssetUrl(activeReel.productImg)}
                      alt=""
                      className="size-11 rounded-xl object-cover bg-neutral-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-navy">{activeReel.productName}</p>
                      <p className="text-xs font-black text-brand">₹{Number(activeReel.productPrice).toLocaleString('en-IN')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart({
                          productId: activeReel.productId,
                          qty: 1,
                          options: { Size: 'Standard' },
                        })
                        toast(`Added ${activeReel.productName} to cart!`)
                      }}
                      className="rounded-xl bg-brand hover:bg-brand-dark px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ShoppingCart className="size-3.5" />
                      Add to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Side Action Panel on Desktop */}
            <div className="hidden md:flex flex-col gap-4 text-white bg-neutral-900/90 border border-white/10 rounded-2xl p-5 w-72">
              <div className="border-b border-white/10 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Featured Display Unit</span>
                <h4 className="text-base font-bold mt-1">{activeReel.productName}</h4>
                <p className="text-lg font-black text-brand mt-0.5">₹{Number(activeReel.productPrice).toLocaleString('en-IN')}</p>
              </div>

              <div className="space-y-2 text-xs text-white/70">
                <p className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> Commercial 24/7 Run Rated</p>
                <p className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> 1-Year Comprehensive Warranty</p>
                <p className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> GST 18% Input Tax Invoice</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Btn
                  size="md"
                  onClick={() => {
                    addToCart({
                      productId: activeReel.productId,
                      qty: 1,
                      options: { Size: 'Standard' },
                    })
                    setActiveReel(null)
                    go('/checkout')
                  }}
                  icon={<ShoppingBag className="size-4" />}
                >
                  Buy Now · ₹{Number(activeReel.productPrice).toLocaleString('en-IN')}
                </Btn>
                <Btn
                  size="sm"
                  variant="secondary"
                  to={`/product/${activeReel.productId}`}
                  onClick={() => setActiveReel(null)}
                >
                  View Full Specifications
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
