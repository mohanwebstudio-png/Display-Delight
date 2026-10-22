import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type AnchorHTMLAttributes } from 'react'
import { byId, setLiveCatalogue, PRODUCTS as INITIAL_PRODUCTS, CATS as INITIAL_CATS, type Product, type CategoryItem } from './data'
import { catalogueApi, cartApi, authApi, settingsApi, normalizeProduct, resolveAssetUrl, getAuthToken, type ApiPriceBreakdown, type PublicStoreSettings } from './api'
export { resolveAssetUrl }

export const DEFAULT_STORE_SETTINGS: PublicStoreSettings = {
  site_name: 'DisplayDelight',
  site_tagline: 'INNOVATION IS KEY TO SUCCESS',
  site_logo_url: '/logo-orange.png',
  contact_email: 'Displaydelight@gmail.com',
  contact_phone: '+91 98403 27440',
  business_address: 'Chennai / Bangalore Showroom Distribution Hub, No. 42 Commercial Complex, MG Road, Bangalore 560001',
  business_hours: 'Mon – Sat: 9:30 AM – 7:00 PM IST',
  announcement_enabled: true,
  announcement_text: 'All Business Solutions — DisplayDelight · Premium Commercial Displays & Custom Signage',
  contact_map_enabled: true,
  contact_map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.9854483726593!2d77.5945627!3d12.9715987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin',
  whatsapp_number: '919840327440',
  whatsapp_message: 'Hi DisplayDelight, I would like to know more about your commercial displays and custom signage.',
  social_links: [
    ['Instagram', 'https://instagram.com/displaydelight', true],
    ['Facebook', 'https://facebook.com/displaydelight', true],
    ['YouTube', 'https://youtube.com/@displaydelight', true],
    ['LinkedIn', 'https://linkedin.com/company/displaydelight', true],
  ],
  payment_mode: 'test',
  razorpay_key_id: 'rzp_test_Tq2xyBU7kvMX7q',
  images_cdn_hostname: 'cdn.displaydelight.in',
  gst_registered: true,
  company_gstin: '29AAAAA0000A1Z5',
  default_gst_rate: 18,
  gst_pricing_mode: 'excl',
  shipping_zones: [
    { z: 'Local (same city)', rate: '300', days: '1–2 business days' },
    { z: 'Within state', rate: '600', days: '2–3 business days' },
    { z: 'Rest of India', rate: '1200', days: '4–6 business days' },
    { z: 'Remote and island regions', rate: '2500', days: '7–10 business days' },
  ],
  shipping_free_enabled: true,
  shipping_free_threshold_inr: 50000,
}

let activeStoreSettings: PublicStoreSettings = DEFAULT_STORE_SETTINGS


/* ---------------- hash and pathname router ---------------- */
function parse() {
  const hash = window.location.hash.replace(/^#/, '')
  const raw = hash || window.location.pathname || '/'
  const [path, qs] = raw.split('?')
  const clean = path.startsWith('/') ? path : '/' + path
  const search = qs ?? (window.location.search ? window.location.search.replace(/^\?/, '') : '')
  return { path: clean || '/', query: new URLSearchParams(search) }
}

export function useRoute() {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const f = () => { setR(parse()); window.scrollTo({ top: 0 }) }
    window.addEventListener('hashchange', f)
    window.addEventListener('popstate', f)
    return () => {
      window.removeEventListener('hashchange', f)
      window.removeEventListener('popstate', f)
    }
  }, [])
  return r
}

export const go = (to: string) => { window.location.hash = to }

export function Link({ to, children, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={'#' + to} {...rest}>{children}</a>
}

/* ---------------- app state (connected to FastAPI database backend) ---------------- */
export interface CartLine {
  key: string
  productId: string
  variantId?: string
  qty: number
  options: Record<string, string>
  price?: number
  artwork?: string
  invalid?: boolean
}

interface Toast { id: number; msg: string; tone: 'ok' | 'err' | 'info' }

interface Ctx {
  cart: CartLine[]
  addToCart: (l: Omit<CartLine, 'key'>) => void
  setQty: (key: string, q: number) => void
  removeLine: (key: string) => void
  restoreLine: (l: CartLine) => void
  clearCart: () => void
  wishlist: string[]
  toggleWish: (id: string) => void
  compare: string[]
  toggleCompare: (id: string) => void
  recent: string[]
  pushRecent: (id: string) => void
  toasts: Toast[]
  toast: (msg: string, tone?: Toast['tone']) => void
  quoteDraft: { productId?: string; options?: Record<string, string> }
  setQuoteDraft: (d: Ctx['quoteDraft']) => void
  
  // Real-time backend data
  products: Product[]
  categories: CategoryItem[]
  isLoadingCatalogue: boolean
  refreshCatalogue: () => Promise<void>
  serverTotals: ApiPriceBreakdown | null
  coupon: string | null
  setCoupon: (c: string | null) => void
  priceToken: string | null
  pricingError: string | null
  isPricingLoading: boolean
  
  // Auth state
  user: any | null
  isUserLoading: boolean
  login: (email: string, pass: string) => Promise<any>
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<any>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>

  // Storefront & Brand Settings
  storeSettings: PublicStoreSettings
  refreshSettings: () => Promise<void>
}

const fallbackCtx: any = {
  cart: [],
  wishlist: [],
  compare: [],
  recent: [],
  products: INITIAL_PRODUCTS,
  categories: INITIAL_CATS,
  toast: () => {},
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  clearCart: () => {},
  toggleWishlist: () => {},
  toggleCompare: () => {},
  inWishlist: () => false,
  inCompare: () => false,
  setQuoteDraft: () => {},
  setLiveCatalogue: () => {},
  isLoadingCatalogue: false,
  user: null,
  isUserLoading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  serverTotals: null,
  coupon: null,
  pricingError: null,
  isPricingLoading: false,
  applyCoupon: async () => {},
  removeCoupon: () => {},
  storeSettings: DEFAULT_STORE_SETTINGS,
  refreshSettings: async () => {},
}


const C = createContext<Ctx>(fallbackCtx)
export const useApp = () => useContext(C) || fallbackCtx

const load = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d }
}

let activeServerTotals: ApiPriceBreakdown | null = null

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => load('dd.cart', []))
  const [wishlist, setWish] = useState<string[]>(() => load('dd.wish', []))
  const [compare, setCompare] = useState<string[]>(() => load('dd.cmp', []))
  const [recent, setRecent] = useState<string[]>(() => load('dd.recent', []))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [quoteDraft, setQuoteDraft] = useState<Ctx['quoteDraft']>({})

  // Database Catalogue State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATS)
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(true)

  // Real-time authoritative server pricing
  const [coupon, setCoupon] = useState<string | null>(null)
  const [serverTotals, setServerTotals] = useState<ApiPriceBreakdown | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [isPricingLoading, setIsPricingLoading] = useState(false)

  // Auth state
  const [user, setUser] = useState<any | null>(null)
  const [isUserLoading, setIsUserLoading] = useState<boolean>(() => !!getAuthToken())

  useEffect(() => { try { localStorage.setItem('dd.cart', JSON.stringify(cart)) } catch { /* quota */ } }, [cart])
  useEffect(() => localStorage.setItem('dd.wish', JSON.stringify(wishlist)), [wishlist])
  useEffect(() => localStorage.setItem('dd.cmp', JSON.stringify(compare)), [compare])
  useEffect(() => localStorage.setItem('dd.recent', JSON.stringify(recent)), [recent])

  const toast = useCallback((msg: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  // 1. Fetch live products and categories from SQLite backend
  const refreshCatalogue = useCallback(async () => {
    try {
      setIsLoadingCatalogue(true)
      const [prodRes, catRes] = await Promise.all([
        catalogueApi.getProducts({ page_size: 100 }),
        catalogueApi.getCategories(),
      ])

      const mappedProds: Product[] = prodRes.items.map(normalizeProduct)
      const mappedCats: CategoryItem[] = catRes.map((c) => ({
        id: c.slug,
        slug: c.slug,
        name: c.name,
        img: resolveAssetUrl(c.image_url || '/p/i-standee.jpg'),
        blurb: c.description || '',
      }))

      if (mappedProds.length > 0) {
        setProducts(mappedProds)
      }
      if (mappedCats.length > 0) {
        setCategories(mappedCats)
      }
      setLiveCatalogue(mappedProds, mappedCats)
    } catch (err: any) {
      console.warn('Backend catalogue sync error, using cached catalogue:', err)
    } finally {
      setIsLoadingCatalogue(false)
    }
  }, [])

  // 2. Fetch authenticated user if token exists
  const refreshUser = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setIsUserLoading(false)
      return
    }
    setIsUserLoading(true)
    try {
      const me = await authApi.getMe()
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setIsUserLoading(false)
    }
  }, [])

  // 3. Storefront brand and integration settings
  const [storeSettings, setStoreSettings] = useState<PublicStoreSettings>(DEFAULT_STORE_SETTINGS)
  const refreshSettings = useCallback(async () => {
    try {
      const s = await settingsApi.getPublicSettings()
      if (s) {
        setStoreSettings(s)
        activeStoreSettings = s
      }
    } catch (err: any) {
      console.warn('Could not sync public store settings:', err)
    }
  }, [])

  useEffect(() => {
    refreshCatalogue()
    refreshUser()
    refreshSettings()
  }, [refreshCatalogue, refreshUser, refreshSettings])

  // 4. Real-time server-authoritative cart pricing calculation
  useEffect(() => {
    if (cart.length === 0) {
      setServerTotals(null)
      activeServerTotals = null
      setPricingError(null)
      return
    }

    let isMounted = true
    setIsPricingLoading(true)
    setPricingError(null)

    const itemsForServer = cart.map((l) => {
      const p = byId(l.productId)
      return {
        product_id: p?.db_id || p?.id || l.productId,
        variant_id: l.variantId,
        quantity: l.qty,
        options: l.options,
      }
    })

    cartApi.calculatePrice(itemsForServer, coupon)
      .then((breakdown) => {
        if (isMounted) {
          setServerTotals(breakdown)
          activeServerTotals = breakdown
          setPricingError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPricingError(err.error || 'Could not verify server price')
        }
      })
      .finally(() => {
        if (isMounted) setIsPricingLoading(false)
      })

    return () => { isMounted = false }
  }, [cart, coupon])

  const login = useCallback(async (email: string, pass: string) => {
    setIsUserLoading(true)
    try {
      const res = await authApi.login({ email, password: pass })
      if (res.user) {
        setUser(res.user)
      } else {
        await refreshUser()
      }
      toast(`Welcome back, ${res.user?.full_name || 'Customer'}!`, 'ok')
      return res
    } finally {
      setIsUserLoading(false)
    }
  }, [toast, refreshUser])

  const register = useCallback(async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    setIsUserLoading(true)
    try {
      const res = await authApi.register(data)
      if (res.user) {
        setUser(res.user)
      } else {
        await refreshUser()
      }
      toast(`Account created! Welcome, ${data.full_name || 'Customer'}!`, 'ok')
      return res
    } finally {
      setIsUserLoading(false)
    }
  }, [toast, refreshUser])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setIsUserLoading(false)
    toast('Logged out successfully', 'info')
  }, [toast])

  const value = useMemo<Ctx>(() => ({
    cart,
    addToCart: (l) => {
      const key = l.productId + (l.variantId ? `_${l.variantId}` : '') + JSON.stringify(l.options)
      setCart((c) =>
        c.find((x) => x.key === key)
          ? c.map((x) =>
              x.key === key
                ? { ...x, qty: x.qty + l.qty, price: l.price ?? x.price, artwork: l.artwork ?? x.artwork }
                : x
            )
          : [...c, { ...l, key }]
      )
      toast(`${byId(l.productId)?.name ?? 'Item'} added to cart`)
    },
    setQty: (key, q) => setCart((c) => c.map((x) => x.key === key ? { ...x, qty: Math.max(1, q) } : x)),
    removeLine: (key) => setCart((c) => c.filter((x) => x.key !== key)),
    restoreLine: (l) => setCart((c) => [...c, l]),
    clearCart: () => setCart([]),
    wishlist,
    toggleWish: (id) => setWish((w) => { const has = w.includes(id); toast(has ? 'Removed from wishlist' : 'Saved to wishlist', 'info'); return has ? w.filter((x) => x !== id) : [...w, id] }),
    compare,
    toggleCompare: (id) => setCompare((w) => {
      if (w.includes(id)) return w.filter((x) => x !== id)
      if (w.length >= 4) { toast('You can compare up to 4 products', 'err'); return w }
      toast('Added to compare', 'info'); return [...w, id]
    }),
    recent,
    pushRecent: (id) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8)),
    toasts, toast, quoteDraft, setQuoteDraft,
    
    // Live backend catalogue
    products,
    categories,
    isLoadingCatalogue,
    refreshCatalogue,
    serverTotals,
    coupon,
    setCoupon,
    priceToken: serverTotals?.price_token ?? null,
    pricingError,
    isPricingLoading,

    // Auth
    user,
    isUserLoading,
    login,
    register,
    logout,
    refreshUser,

    // Storefront & Brand Settings
    storeSettings,
    refreshSettings,
  }), [
    cart, wishlist, compare, recent, toasts, toast, quoteDraft,
    products, categories, isLoadingCatalogue, refreshCatalogue,
    serverTotals, coupon, pricingError, isPricingLoading,
    user, isUserLoading, login, register, logout, refreshUser,
    storeSettings, refreshSettings,
  ])

  return <C.Provider value={value}>{children}</C.Provider>
}

/* Authoritative totals with seamless fallback. Uses POST /cart/price calculation from the server. */
export function sampleTotals(cart: CartLine[], coupon?: string | null) {
  if (activeServerTotals) {
    const sub = activeServerTotals.subtotal_inr ?? (typeof activeServerTotals.subtotal_paise === 'number' ? Math.round(activeServerTotals.subtotal_paise / 100) : 0)
    if (sub > 0 || cart.length === 0) {
      const discount = activeServerTotals.discount_inr ?? (typeof activeServerTotals.discount_paise === 'number' ? Math.round(activeServerTotals.discount_paise / 100) : 0)
      const gst = activeServerTotals.gst_inr ?? (typeof activeServerTotals.gst_paise === 'number' ? Math.round(activeServerTotals.gst_paise / 100) : 0)
      const shipping = activeServerTotals.shipping_inr ?? (typeof activeServerTotals.shipping_paise === 'number' ? Math.round(activeServerTotals.shipping_paise / 100) : 0)
      const total = activeServerTotals.total_inr ?? (typeof activeServerTotals.total_paise === 'number' ? Math.round(activeServerTotals.total_paise / 100) : (sub - discount + gst + shipping))
      return { sub, discount, gst, shipping, total }
    }
  }

  // Baseline calculation using live item prices from SQLite DB & dynamic admin tax/shipping settings
  const sub = cart.reduce((s, l) => s + (l.price ?? byId(l.productId)?.price ?? 0) * l.qty, 0)
  const discount = coupon ? Math.round(sub * 0.10) : 0
  const taxable = Math.max(0, sub - discount)
  const gstRate = activeStoreSettings.gst_registered ? (activeStoreSettings.default_gst_rate / 100) : 0
  const gst = Math.round(taxable * gstRate)
  const isFreeEligible = activeStoreSettings.shipping_free_enabled && sub >= (activeStoreSettings.shipping_free_threshold_inr || 50000)
  const shipping = sub > 0 ? (isFreeEligible ? 0 : 600) : 0
  return { sub, discount, gst, shipping, total: taxable + gst + shipping }
}

