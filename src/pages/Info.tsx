import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, ImageOff, AtSign, Clock, Mail, MapPin, MessageCircle, Phone, Play, Search, X, CheckCircle2, AlertTriangle, Home, Star, ExternalLink } from 'lucide-react'
import { Accordion, Badge, Breadcrumbs, Btn, Container, Field, Input, Notice, SectionHead, Skeleton, Textarea, cx, InstagramIcon } from '../ui'
import { Link, go, useApp, resolveAssetUrl } from '../store'
import { CATS, FAQS, INDUSTRIES, PRODUCTS, catName, byId } from '../data'
import { apiFetch, catalogueApi } from '../api'

const PageHead = ({ eyebrow, title, text, crumb }: { eyebrow?: string; title: string; text?: string; crumb: string }) => (
  <div className="mb-8 sm:mb-10">
    <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: crumb }]} />
    {eyebrow && <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[.18em] text-brand sm:mt-6">{eyebrow}</p>}
    <h1 className={cx('page-heading font-bold font-display', !eyebrow && 'mt-5 sm:mt-6')}>{title}</h1>
    {text && <p className="mt-3 max-w-2xl text-base text-ink-2 sm:mt-4 sm:text-lg">{text}</p>}
  </div>
)

/* ================= About ================= */
export function About() {
  const { categories, storeSettings } = useApp()
  const cats = categories.length > 0 ? categories : CATS
  const siteName = storeSettings.site_name || 'DisplayDelight'
  const tagline = storeSettings.site_tagline || `All Business Solutions — ${siteName}`

  const [industries, setIndustries] = useState<Array<[string, string, string]>>(INDUSTRIES as any)
  const [clientLogos, setClientLogos] = useState<Array<{ id: string; name: string; logo_url: string; website_url?: string }>>([])

  useEffect(() => {
    let active = true
    catalogueApi.getIndustries()
      .then((items) => {
        if (active && items.length > 0) {
          setIndustries(items.map((i) => [i.name, i.description, i.image_url]))
        }
      })
      .catch(() => {})

    catalogueApi.getClientLogos()
      .then((logos) => {
        if (active && logos.length > 0) {
          setClientLogos(logos)
        }
      })
      .catch(() => {})

    return () => { active = false }
  }, [])

  return (
    <div>
      <section className="bg-navy text-white">
        <Container className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#ff8a5c]">About {siteName}</p>
            <h1 className="page-heading font-bold uppercase font-display">{tagline}</h1>
            <p className="mt-4 max-w-xl text-base text-white/75 sm:mt-5 sm:text-lg">We make digital signage, illuminated displays, tabletop signage, acrylic LED displays, customised signage and digital standees for businesses that want to be seen.</p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-7"><Btn to="/quote">Request a quote</Btn><Btn variant="ghostLight" to="/contact">Contact us</Btn></div>
          </div>
          <img src={resolveAssetUrl('/p/hero.jpg')} alt={`${siteName} signage`} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-pop" />
        </Container>
      </section>
      <Container className="py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">Our business focus</h2>
          <div className="space-y-4 text-lg leading-relaxed text-ink-2">
            <p>Our range spans digital standees, LED light boxes and frames, acrylic card stands, roll-up and fabric displays, and promotional products.</p>
            <p>Many products can be customised with your own artwork, size and shape, so your signage reflects your brand.</p>
          </div>
        </div>
      </Container>
      <section className="bg-soft py-16">
        <Container>
          <SectionHead eyebrow="Capabilities" title="What we make" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <Link key={c.id} to={`/shop/${c.id}`} className="group overflow-hidden rounded-xl border border-line bg-white transition hover:shadow-card">
                <img src={resolveAssetUrl(c.img)} alt={c.name} className="aspect-[16/10] w-full bg-[#f3f1ee] object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" />
                <div className="p-5"><h3 className="text-2xl font-bold group-hover:text-brand">{c.name}</h3><p className="mt-1 text-sm text-ink-2">{c.blurb}</p></div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <Container className="py-16">
        <SectionHead eyebrow="Industries" title="Who we serve" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map(([n, d, img]) => (
            <div key={n}><img src={resolveAssetUrl(img)} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" /><h3 className="mt-3 text-xl font-bold">{n}</h3><p className="text-sm text-ink-2">{d}</p></div>
          ))}
        </div>
      </Container>
      <Container className="pb-16">
        <div className="rounded-xl border border-line bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand">Our Trusted Clients</p>
          {clientLogos.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 items-center gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {clientLogos.map((logo) => {
                const src = resolveAssetUrl(logo.logo_url?.startsWith('blob:') ? '/uploads/med_93e97a899515_logo.jpg' : logo.logo_url)
                return (
                  <div key={logo.id} className="flex h-16 items-center justify-center rounded-lg border border-line bg-soft p-3 transition hover:shadow-sm">
                    {logo.website_url ? (
                      <a href={logo.website_url} target="_blank" rel="noreferrer" title={logo.name}>
                        <img src={src} alt={logo.name} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="text-xs font-bold text-ink-2 px-1 text-center">${logo.name}</span>`) }} className="max-h-10 max-w-full object-contain filter grayscale transition duration-300 hover:grayscale-0" />
                      </a>
                    ) : (
                      <img src={src} alt={logo.name} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="text-xs font-bold text-ink-2 px-1 text-center">${logo.name}</span>`) }} className="max-h-10 max-w-full object-contain filter grayscale transition duration-300 hover:grayscale-0" />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="grid h-16 place-items-center rounded-lg bg-soft text-xs text-ink-2">Verified Client Logo</div>)}
            </div>
          )}
          <p className="mt-4 text-xs font-medium text-ink-2">Authorized enterprise client displays across retail and corporate institutions</p>
        </div>
      </Container>
      <section className="bg-brand text-white">
        <Container className="flex flex-wrap items-center justify-between gap-6 py-12">
          <h2 className="text-3xl font-bold uppercase sm:text-4xl md:text-5xl">Light Up. Stand Out. Sell More!</h2>
          <div className="flex gap-3"><Btn variant="dark" to="/quote">Request a quote</Btn><Btn variant="ghostLight" to="/contact">Contact us</Btn></div>
        </Container>
      </section>
    </div>
  )
}

/* ================= Gallery ================= */
type Media = {
  kind: 'img' | 'video' | 'instagram' | 'broken'
  src: string
  thumbnail?: string
  embed_url?: string
  title: string
  pid: string
  ratio: string
  cat?: string
}
const RATIOS = ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]']

export function Gallery() {
  const { products, categories } = useApp()
  const [cat, setCat] = useState('all')
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'instagram'>('all')
  const [shown, setShown] = useState(9)
  const [loading, setLoading] = useState(true)
  const [lb, setLb] = useState<number | null>(null)
  const [bad, setBad] = useState<Set<string>>(new Set())
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)
  const [activeInstagram, setActiveInstagram] = useState<{ embedUrl: string; cleanUrl: string; title: string } | null>(null)
  const [dbMedia, setDbMedia] = useState<Media[]>([])

  const cats = categories.length > 0 ? categories : CATS
  const prods = products.length > 0 ? products : PRODUCTS

  useEffect(() => {
    let active = true
    catalogueApi.getGallery()
      .then((items) => {
        if (active && items.length > 0) {
          const mapped: Media[] = items.map((item, idx) => {
            let kind: 'img' | 'video' | 'instagram' = 'img'
            if (item.media_type === 'video') kind = 'video'
            else if (item.media_type === 'instagram') kind = 'instagram'

            return {
              kind,
              src: resolveAssetUrl(item.media_url || item.thumbnail_url || '/p/i-standee.jpg'),
              thumbnail: resolveAssetUrl(item.thumbnail_url || item.media_url || '/p/i-standee.jpg'),
              embed_url: item.embed_url,
              title: item.title || 'Commercial Display Showcase',
              pid: item.prod || prods[idx % prods.length]?.id || '1',
              ratio: RATIOS[idx % RATIOS.length],
              cat: item.cat || 'all',
            }
          })
          setDbMedia(mapped)
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [prods])

  const fallbackMediaList: Media[] = prods.map((p, i): Media => ({
    kind: i % 3 === 2 ? 'video' : 'img',
    src: resolveAssetUrl(p.img || '/p/i-standee.jpg'),
    thumbnail: resolveAssetUrl(p.img || '/p/i-standee.jpg'),
    title: p.name,
    pid: p.id,
    ratio: RATIOS[i % 4],
    cat: p.cat,
  }))

  const sourceList = dbMedia.length > 0 ? dbMedia : fallbackMediaList
  const list = sourceList.filter((m) => {
    const catMatch = cat === 'all' || (m.cat && m.cat.toLowerCase() === cat.toLowerCase()) || prods.find((p) => p.id === m.pid)?.cat === cat
    const typeMatch = mediaFilter === 'all' || m.kind === mediaFilter
    return catMatch && typeMatch
  })
  const vis = list.slice(0, shown)
  const imgs = vis.filter((m) => m.kind === 'img' && !bad.has(m.src))
  const cur = lb !== null ? imgs[lb] : null

  useEffect(() => {
    if (lb === null && !activeInstagram && !activeVideoUrl) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLb(null)
        setActiveInstagram(null)
        setActiveVideoUrl(null)
      }
      if (lb !== null && imgs.length > 0) {
        if (e.key === 'ArrowRight') setLb((i) => (i! + 1) % imgs.length)
        if (e.key === 'ArrowLeft') setLb((i) => (i! - 1 + imgs.length) % imgs.length)
      }
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [lb, imgs.length, activeInstagram, activeVideoUrl])

  const tile = (m: Media, i: number) => {
    const p = prods.find((x) => x.id === m.pid) || byId(m.pid) || { name: m.title || 'Commercial Display', id: m.pid, cat: 'digital-standees' }
    if (m.kind === 'broken' || bad.has(m.src))
      return <div key={i} className={cx('mb-4 grid place-items-center rounded-xl border border-dashed border-line bg-soft text-center text-xs text-ink-2 break-inside-avoid', m.ratio)}><div><ImageOff className="mx-auto mb-1 size-6" />Media unavailable</div></div>
    
    return (
      <figure key={i} className="group relative mb-4 overflow-hidden rounded-xl bg-[#f3f1ee] break-inside-avoid shadow-xs transition hover:shadow-md">
        <button
          className={cx('block w-full', m.ratio)}
          onClick={() => {
            if (m.kind === 'video') {
              setActiveVideoUrl(m.src)
            } else if (m.kind === 'instagram') {
              const scMatch = m.src.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
              const shortcode = scMatch ? scMatch[1] : ''
              setActiveInstagram({
                embedUrl: m.embed_url || `https://www.instagram.com/p/${shortcode}/embed/`,
                cleanUrl: m.src.startsWith('http') ? m.src : `https://www.instagram.com/p/${shortcode}/`,
                title: m.title || p.name,
              })
            } else {
              setLb(imgs.indexOf(m))
            }
          }}
          aria-label={
            m.kind === 'video'
              ? `Play video: ${m.title || p.name}`
              : m.kind === 'instagram'
              ? `View Instagram Reel: ${m.title || p.name}`
              : `Open ${m.title || p.name}`
          }
        >
          <img
            src={m.thumbnail || resolveAssetUrl(m.src)}
            alt={m.title || p.name}
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget
              if (!t.dataset.fallback) {
                t.dataset.fallback = '1'
                t.src = resolveAssetUrl('/p/i-standee.jpg')
              } else {
                setBad((s) => new Set(s).add(m.src))
              }
            }}
            className="size-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-105"
          />

          {m.kind === 'video' && (
            <span className="absolute inset-0 grid place-items-center bg-navy/30">
              <span className="grid size-14 place-items-center rounded-full bg-white text-brand shadow-pop transition group-hover:scale-110">
                <Play className="ml-0.5 size-6" fill="currentColor" />
              </span>
            </span>
          )}

          {m.kind === 'instagram' && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-3 py-1 text-xs font-bold text-white shadow-pop transition group-hover:scale-105">
              <InstagramIcon className="size-3.5" /> Instagram Reel
            </span>
          )}
        </button>

        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 to-transparent p-3 pt-6 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
          <p className="truncate">{m.title || p.name}</p>
          <span className="text-xs font-normal text-white/80">
            {m.kind === 'instagram' ? 'Watch Instagram Reel ↗' : m.kind === 'video' ? 'Play demonstration video' : 'Click to view photo'}
          </span>
        </figcaption>
      </figure>
    )
  }

  return (
    <Container className="py-10 sm:py-14">
      <PageHead
        crumb="Gallery"
        eyebrow="Visual Showroom"
        title="Our work, on display"
        text="Browse commercial installations, digital standees, product demonstration videos, and customer showcases."
      />

      {/* Filter Row: Category & Media Type */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="hide-scroll -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {[{ id: 'all', name: 'All Categories' }, ...cats].map((c) => (
            <button
              key={c.id}
              onClick={() => { setCat(c.id); setShown(9) }}
              aria-pressed={cat === c.id}
              className={cx('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition', cat === c.id ? 'border-navy bg-navy text-white' : 'border-line hover:border-ink')}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-line bg-soft p-1 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setMediaFilter('all')}
            className={cx('rounded-full px-3 py-1.5 transition', mediaFilter === 'all' ? 'bg-white text-navy shadow-xs' : 'text-ink-2 hover:text-ink')}
          >
            All
          </button>
          <button
            onClick={() => setMediaFilter('image')}
            className={cx('rounded-full px-3 py-1.5 transition', mediaFilter === 'image' ? 'bg-white text-navy shadow-xs' : 'text-ink-2 hover:text-ink')}
          >
            Photos
          </button>
          <button
            onClick={() => setMediaFilter('video')}
            className={cx('rounded-full px-3 py-1.5 transition', mediaFilter === 'video' ? 'bg-white text-navy shadow-xs' : 'text-ink-2 hover:text-ink')}
          >
            Videos
          </button>
          <button
            onClick={() => setMediaFilter('instagram')}
            className={cx('flex items-center gap-1 rounded-full px-3 py-1.5 transition', mediaFilter === 'instagram' ? 'bg-white text-pink-600 shadow-xs' : 'text-ink-2 hover:text-ink')}
          >
            <InstagramIcon className="size-3" /> Reels
          </button>
        </div>
      </div>

      {loading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3" aria-busy="true">{RATIOS.concat(RATIOS).map((r, i) => <Skeleton key={i} className={cx('mb-4 w-full rounded-xl', r)} />)}</div>
      ) : list.length === 0 ? (
        <div className="my-16 rounded-2xl border border-line bg-soft p-12 text-center text-ink-2">
          <InstagramIcon className="mx-auto mb-3 size-10 opacity-40 text-brand" />
          <h3 className="text-lg font-bold text-navy">No media found in this filter</h3>
          <p className="mt-1 text-sm">Try selecting a different category or media filter above.</p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">{vis.map(tile)}</div>
      )}

      {!loading && shown < list.length && (
        <div className="mt-8 text-center">
          <Btn variant="secondary" onClick={() => setShown(shown + 6)}>Load more items</Btn>
        </div>
      )}

      {/* Image Lightbox */}
      {cur && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-navy/95 p-4 text-white" role="dialog" aria-modal="true" aria-label="Image viewer">
          <div className="flex items-center justify-between"><span className="text-sm text-white/70">{lb! + 1} / {imgs.length}</span><button aria-label="Close" onClick={() => setLb(null)} className="grid size-10 place-items-center rounded-full hover:bg-white/10"><X className="size-6" /></button></div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <button aria-label="Previous" onClick={() => setLb((lb! - 1 + imgs.length) % imgs.length)} className="absolute left-0 z-10 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft /></button>
            <img src={cur.src} alt={cur.title || byId(cur.pid)?.name} className="max-h-full max-w-full rounded-lg object-contain" />
            <button aria-label="Next" onClick={() => setLb((lb! + 1) % imgs.length)} className="absolute right-0 z-10 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight /></button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <span className="font-semibold">{cur.title || byId(cur.pid)?.name}</span>
            <Link to={`/product/${cur.pid}`} onClick={() => setLb(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#ff8a5c] hover:underline">View product <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-navy/85 p-4 backdrop-blur" onClick={() => setActiveVideoUrl(null)}>
          <div className="anim-pop relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveVideoUrl(null)}
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/20 text-white hover:bg-white/40"
              aria-label="Close video"
            >
              <X className="size-5" />
            </button>
            {activeVideoUrl.includes('youtube.com') || activeVideoUrl.includes('youtu.be') ? (
              <iframe
                src={activeVideoUrl.replace('watch?v=', 'embed/')}
                title="Installation Video"
                className="aspect-video w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : activeVideoUrl.includes('cloudflarestream.com') || activeVideoUrl.includes('videodelivery.net') || activeVideoUrl.includes('vimeo.com') ? (
              <iframe
                src={activeVideoUrl}
                title="Installation Video"
                className="aspect-video w-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            ) : (
              <video src={activeVideoUrl} controls autoPlay className="aspect-video w-full" />
            )}
          </div>
        </div>
      )}

      {/* Interactive Permitted Instagram Reel / Post Modal */}
      {activeInstagram && (
        <div
          className="fixed inset-0 z-[95] grid place-items-center bg-navy/90 p-4 backdrop-blur"
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
                  View on Instagram <ExternalLink className="size-3" />
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
    </Container>
  )
}

/* ================= Contact ================= */
export function Contact() {
  const { storeSettings } = useApp()
  const [f, setF] = useState({ name: '', email: '', phone: '', msg: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [st, setSt] = useState<'form' | 'busy' | 'ok' | 'fail'>('form')
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setErr({ ...err, [k]: '' }) }

  const phone = storeSettings.contact_phone || '+91 98403 27440'
  const email = storeSettings.contact_email || 'Displaydelight@gmail.com'
  const siteName = storeSettings.site_name || 'DisplayDelight'
  const addr = storeSettings.business_address || 'Chennai / Bangalore Showroom Distribution Hub'
  const hours = storeSettings.business_hours || 'Mon – Sat: 9:30 AM – 7:00 PM IST'

  const waNum = (storeSettings.whatsapp_number || '919840327440').replace(/\D/g, '')
  const waMsg = encodeURIComponent(storeSettings.whatsapp_message || `Hi ${siteName}, I would like to make an enquiry about your commercial displays and custom signage.`)
  const waUrl = `https://wa.me/${waNum}?text=${waMsg}`

  const instagramEntry = (storeSettings.social_links || []).find(([p]) => p.toLowerCase().includes('instagram'))
  const instagramUrl = instagramEntry && instagramEntry[2] ? instagramEntry[1] : undefined

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const x: Record<string, string> = {}
    if (f.name.trim().length < 2) x.name = 'Enter your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) x.email = 'Enter a valid email address'
    if (f.phone && f.phone.replace(/\D/g, '').length < 10) x.phone = 'Enter a valid phone number'
    if (f.msg.trim().length < 10) x.msg = 'Please write at least 10 characters'
    setErr(x)
    if (Object.keys(x).length) return

    setSt('busy')
    try {
      await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: f.name,
          email: f.email,
          phone: f.phone || null,
          subject: 'Storefront Customer Enquiry',
          message: f.msg,
        }),
      })
      setSt('ok')
    } catch {
      setSt('fail')
    }
  }

  const row = (icon: ReactNode, label: string, v: ReactNode) => (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">{label}</p>
        <div className="text-sm font-semibold">{v}</div>
      </div>
    </div>
  )

  return (
    <Container className="py-10 sm:py-14">
      <PageHead crumb="Contact" eyebrow="Contact" title={`Talk to ${siteName}`} text="Questions about products, customisation or an existing order? Send us a message." />
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
          {st === 'ok' ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto size-12 text-ok" />
              <h2 className="mt-3 text-3xl font-bold">Message sent</h2>
              <p className="mt-1 text-sm text-ink-2">Thanks, {f.name.split(' ')[0]}. Saved to our database. We will reply to {f.email}.</p>
              <Btn className="mt-5" variant="secondary" onClick={() => { setSt('form'); setF({ name: '', email: '', phone: '', msg: '' }) }}>Send another</Btn>
            </div>
          ) : (
            <form onSubmit={send} noValidate className="space-y-5">
              {st === 'fail' && <Notice tone="bad" title="Message could not be sent" action={<Btn size="sm" variant="secondary" onClick={() => send()}>Retry</Btn>}>Please check your connection and try again.</Notice>}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name" required error={err.name}><Input value={f.name} invalid={!!err.name} onChange={(e) => set('name', e.target.value)} /></Field>
                <Field label="Email" required error={err.email}><Input type="email" value={f.email} invalid={!!err.email} onChange={(e) => set('email', e.target.value)} /></Field>
              </div>
              <Field label="Phone" error={err.phone}><Input type="tel" value={f.phone} invalid={!!err.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Message" required error={err.msg}><Textarea rows={6} value={f.msg} invalid={!!err.msg} onChange={(e) => set('msg', e.target.value)} /></Field>
              <Btn type="submit" size="lg" className="w-full sm:w-auto" loading={st === 'busy'}>Send message</Btn>
            </form>
          )}
        </div>
        <div className="space-y-6">
          <div className="space-y-5 rounded-xl border border-line bg-white p-6">
            {row(<Mail className="size-4" />, 'Email', <a className="break-all hover:text-brand" href={`mailto:${email}`}>{email}</a>)}
            {row(<Phone className="size-4" />, 'Phone', <a className="hover:text-brand" href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>)}
            {instagramUrl && (
              row(<AtSign className="size-4" />, 'Instagram', <a className="hover:text-brand" href={instagramUrl} target="_blank" rel="noreferrer">{instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '@').replace(/\/$/, '') || '@' + siteName.toLowerCase()}</a>)
            )}
            {row(<MapPin className="size-4" />, 'Address', <span className="font-normal text-ink-2">{addr}</span>)}
            {row(<Clock className="size-4" />, 'Hours', <span className="font-normal text-ink-2">{hours}</span>)}
            <Btn full variant="secondary" icon={<MessageCircle className="size-4" />} onClick={() => window.open(waUrl, '_blank')}>Chat on WhatsApp</Btn>
          </div>

          {storeSettings.contact_map_enabled && storeSettings.contact_map_embed && (
            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
              <div className="border-b border-line px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink-2">Our Location</div>
              {storeSettings.contact_map_embed.includes('<iframe') ? (
                <div
                  className="aspect-[16/9] w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: storeSettings.contact_map_embed }}
                />
              ) : (
                <iframe
                  src={storeSettings.contact_map_embed}
                  title="Store location map"
                  className="aspect-[16/9] w-full border-0"
                  loading="lazy"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

/* ================= FAQ ================= */
export function Faq() {
  const [q, setQ] = useState('')
  const [liveFaqs, setLiveFaqs] = useState<[string, string][]>([])

  useEffect(() => {
    let active = true
    catalogueApi.getFaqs()
      .then((items) => {
        if (active && items.length > 0) {
          setLiveFaqs(items.map((i) => [i.question, i.answer]))
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const allFaqs = liveFaqs.length > 0 ? liveFaqs : (FAQS as any)
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase())
  const filtered = allFaqs.filter(([a, b]: any) => match(a) || match(b))

  return (
    <Container className="py-10 sm:py-14">
      <PageHead crumb="FAQ" eyebrow="Help centre" title="Frequently asked questions" />
      <div className="relative mb-10 max-w-xl">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-2" />
        <Input aria-label="Search FAQs" className="pl-10" placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="max-w-3xl space-y-10">
        {filtered.length > 0 ? (
          <section><h2 className="mb-2 text-3xl font-bold">Frequently Asked Questions</h2><Accordion key={q} items={filtered} /></section>
        ) : (
          <p className="py-10 text-center text-ink-2">No questions match “{q}”.</p>
        )}
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy p-8 text-white">
        <div>
          <h2 className="text-3xl font-bold">Still need help?</h2>
          <p className="text-white/70">Our commercial display engineers are happy to answer your questions.</p>
        </div>
        <div className="flex gap-3">
          <Btn to="/contact">Contact us</Btn>
          <Btn variant="ghostLight" to="/quote">Request a quote</Btn>
        </div>
      </div>
    </Container>
  )
}

/* ================= Policy ================= */
const POLICIES: Record<string, [string, string[]]> = {
  shipping: ['Shipping Policy', ['Delivery areas', 'Dispatch & transit', 'Shipping charges', 'Damaged in transit']],
  returns: ['Returns & Refunds', ['Eligibility', 'How to request a return', 'Refund process', 'Non-returnable items']],
  warranty: ['Warranty', ['Coverage', 'Exclusions', 'How to claim']],
  privacy: ['Privacy Policy', ['Information we collect', 'How we use it', 'Sharing', 'Your rights', 'Contact']],
  terms: ['Terms & Conditions', ['Using this site', 'Orders & pricing', 'Customised products', 'Liability', 'Governing law']],
}

export function Policy({ slug }: { slug: string }) {
  const [title, secs] = POLICIES[slug] ?? POLICIES.terms
  const [policyData, setPolicyData] = useState<{ title: string; content: string } | null>(null)

  useEffect(() => {
    let active = true
    catalogueApi.getPolicy(slug)
      .then((data) => {
        if (active) setPolicyData(data)
      })
      .catch(() => {})
    return () => { active = false }
  }, [slug])

  const id = (s: string) => 'sec-' + s.toLowerCase().replace(/[^a-z]+/g, '-')

  return (
    <Container className="py-10 sm:py-14">
      <PageHead crumb={policyData?.title || title} title={policyData?.title || title} />
      {policyData ? (
        <div className="max-w-3xl rounded-xl border border-line bg-white p-8 shadow-sm">
          <div className="prose prose-navy max-w-none leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: policyData.content.replace(/\n/g, '<br />') }} />
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="lg:sticky lg:top-24 lg:self-start" aria-label="On this page">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-2">On this page</p>
            <ul className="space-y-1 border-l border-line">
              {secs.map((s) => (
                <li key={s}>
                  <a href={`#/policy/${slug}`} onClick={(e) => { e.preventDefault(); document.getElementById(id(s))?.scrollIntoView({ behavior: 'smooth' }) }} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-sm text-ink-2 hover:border-brand hover:text-brand">{s}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="max-w-3xl space-y-8">
            {secs.map((s) => (
              <section key={s} id={id(s)} className="scroll-mt-24">
                <h2 className="text-3xl font-bold">{s}</h2>
                <div className="mt-3 space-y-2 rounded-lg border border-dashed border-line p-5">
                  <p className="text-sm leading-relaxed text-ink-2">Standard business policy applies to all commercial display shipments, digital kiosk hardware installations, and on-site warranties.</p>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}

/* ================= Dynamic CMS Page ================= */
export function CmsPage({ slug }: { slug: string }) {
  const [pageData, setPageData] = useState<{ title: string; content: string; banner_image_url?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    catalogueApi.getPage(slug)
      .then((data) => {
        if (active) {
          setPageData(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError(true)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [slug])

  if (loading) {
    return (
      <Container className="py-12 sm:py-16">
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-4/6" />
        </div>
      </Container>
    )
  }

  if (error || !pageData) {
    return <NotFound />
  }

  return (
    <div>
      {pageData.banner_image_url && (
        <div className="relative h-64 w-full overflow-hidden bg-navy sm:h-80">
          <img src={pageData.banner_image_url} alt={pageData.title} className="size-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
          <Container className="absolute inset-x-0 bottom-8 text-white">
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: pageData.title }]} />
            <h1 className="mt-4 text-4xl font-bold uppercase sm:text-6xl">{pageData.title}</h1>
          </Container>
        </div>
      )}
      <Container className="py-12 sm:py-16">
        {!pageData.banner_image_url && (
          <PageHead crumb={pageData.title} title={pageData.title} />
        )}
        <div className="max-w-4xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-10">
          <div
            className="prose prose-navy max-w-none space-y-4 text-base leading-relaxed text-ink"
            dangerouslySetInnerHTML={{
              __html: pageData.content
                .replace(/\n\n/g, '<br /><br />')
                .replace(/\n/g, '<br />')
            }}
          />
        </div>
      </Container>
    </div>
  )
}

/* ================= 404 / Error ================= */
export function NotFound() {
  const [q, setQ] = useState('')
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-display text-[8rem] font-bold leading-none text-brand sm:text-[11rem]">404</p>
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p className="mt-2 text-ink-2">The page you are looking for may have moved or no longer exists.</p>
        <form onSubmit={(e) => { e.preventDefault(); go(`/shop?q=${encodeURIComponent(q)}`) }} className="mx-auto mt-6 flex max-w-md gap-2"><Input aria-label="Search products" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} /><Btn type="submit" icon={<Search className="size-4" />}>Search</Btn></form>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-brand">{[['Home', '/'], ['Shop', '/shop'], ['Request a quote', '/quote'], ['Contact', '/contact']].map(([l, t]) => <Link key={t} to={t} className="hover:underline">{l}</Link>)}</div>
      </div>
    </Container>
  )
}

export function ErrorPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[#fdecea] text-bad"><AlertTriangle className="size-8" /></div>
        <h1 className="text-3xl font-bold sm:text-5xl">Something went wrong</h1>
        <p className="mt-2 text-ink-2">An unexpected error occurred. Try again, or return to the home page.</p>
        <div className="mt-6 flex justify-center gap-3"><Btn onClick={() => window.location.reload()}>Try again</Btn><Btn variant="secondary" to="/" icon={<Home className="size-4" />}>Home</Btn></div>
        <Badge tone="neutral">Error reference shown here in production</Badge>
      </div>
    </Container>
  )
}
