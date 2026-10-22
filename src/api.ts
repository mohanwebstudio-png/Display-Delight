/**
 * DisplayDelight V2 — Production API Client Layer.
 * Connects frontend directly to the FastAPI database-backed service.
 * Server is the single source of truth for catalogue, cart totals, GST, inventory, and orders.
 */

// Determine base API path (uses Vite dev proxy `/api/v1` or explicit port if needed)
export const API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '8443')
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1')

const TOKEN_KEY = 'dd.auth_token'
const REFRESH_KEY = 'dd.refresh_token'

export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setAuthToken(token: string, refresh?: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  } catch { /* storage quota */ }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch { /* storage quota */ }
}

export interface ApiError {
  error: string
  error_type?: string
  details?: any[]
  status: number
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err: any) {
    // If relative `/api/v1` failed (e.g. proxy mismatch), try direct backend port 8001
    if (!endpoint.startsWith('http')) {
      const fallbackUrl = `http://127.0.0.1:8001/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
      try {
        res = await fetch(fallbackUrl, { ...options, headers })
      } catch (fallbackErr) {
        throw new Error(`Network error connecting to backend: ${err.message}`)
      }
    } else {
      throw new Error(`Network error: ${err.message}`)
    }
  }

  if (!res.ok) {
    let errBody: any
    try {
      errBody = await res.json()
    } catch {
      errBody = { error: res.statusText || 'Request failed' }
    }
    let errorMessage = res.statusText || 'Request failed'
    if (typeof errBody.error === 'string') {
      errorMessage = errBody.error
    } else if (typeof errBody.detail === 'string') {
      errorMessage = errBody.detail
    } else if (errBody.error?.message) {
      errorMessage = errBody.error.message
    } else if (errBody.message) {
      errorMessage = errBody.message
    } else if (Array.isArray(errBody.details) && errBody.details.length > 0) {
      errorMessage = errBody.details.map((d: any) => d.message || `${d.field}: ${d.message}`).join(', ')
    } else if (Array.isArray(errBody.detail) && errBody.detail.length > 0) {
      errorMessage = errBody.detail.map((d: any) => d.msg || `${d.loc?.join('.')}: ${d.msg}`).join(', ')
    }

    const apiErr: ApiError = {
      error: errorMessage,
      error_type: errBody.error_type || errBody.error?.code,
      details: errBody.details || errBody.detail,
      status: res.status,
    }
    if (res.status === 401) {
      clearAuthToken()
    }
    throw apiErr
  }

  // 204 No Content
  if (res.status === 204) {
    return {} as T
  }

  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiCategory {
  id: string
  slug: string
  name: string
  description?: string
  image_url?: string
  product_count?: number
  sort_order?: number
}

export interface ApiProduct {
  id: string
  slug: string
  sku: string
  name: string
  blurb?: string
  short_description?: string
  description?: string
  kind: 'digital' | 'custom' | 'standard'
  category_slug?: string
  category_name?: string
  category_id?: string
  base_price_paise?: number | null
  base_price_inr?: number | null
  price?: number | null
  mrp?: number | null
  price_label?: string | null
  purchase_mode?: 'purchasable' | 'quote_only' | 'sample_only'
  is_customizable?: boolean
  primary_image?: string
  image_url?: string
  images?: Array<{ url: string; alt?: string; is_primary?: boolean }>
  sizes?: string[]
  specs?: Array<[string, string]> | Array<{ group?: string; label: string; value: string }>
  attrs?: Record<string, string | string[]>
  features?: string[]
  highlights?: string[]
  stock?: number
  track_stock?: boolean
  availability?: { status: string; label: string }
  badges?: string[]
  warranty?: string
  shipping_info?: string
  variants?: Array<{ id: string; sku: string; name: string; price_delta_paise: number; is_active?: boolean }>
}

export interface ApiFilterDef {
  key: string
  label: string
  type: 'checkbox' | 'radio'
  options?: string[]
}

export interface ApiPriceBreakdown {
  subtotal_paise: number
  discount_paise: number
  taxable_paise: number
  gst_paise: number
  shipping_paise: number
  total_paise: number
  subtotal_inr: number
  discount_inr: number
  gst_inr: number
  shipping_inr: number
  total_inr: number
  coupon_code?: string | null
  price_token: string
  lines?: any[]
}

export interface ApiCheckoutResponse {
  order_reference: string
  razorpay_order_id: string
  key_id: string
  amount_paise: number
  amount_inr?: number
  currency: string
  is_mock?: boolean
  is_simulated?: boolean
  customer_email?: string
  customer_name?: string
  customer_phone?: string
}

export interface ApiOrderSummary {
  id: string
  reference: string
  status: string
  payment_status: string
  total_amount_paise: number
  total_amount_inr: number
  currency: string
  item_count: number
  created_at: string
  customer_name?: string
  customer_email?: string
}

export interface ApiOrderDetail extends ApiOrderSummary {
  shipping_address: any
  billing_address?: any
  items: Array<{
    id: string
    product_name: string
    product_sku: string
    quantity: number
    unit_price_inr: number
    total_price_inr: number
    artwork_url?: string
    specifications?: any
  }>
  timeline: Array<{
    status: string
    notes?: string
    created_at: string
  }>
}

export interface ApiHomepageData {
  sections?: any[]
  sections_visibility?: Record<string, boolean>
  hero?: {
    headline?: string
    sub?: string
    img?: string
    video?: string
    c1?: string
    c1to?: string
    c2?: string
    c2to?: string
    is_visible?: boolean
  }
  announce?: {
    text?: string
    link?: string
    is_visible?: boolean
  }
  intro?: {
    title?: string
    text?: string
    img?: string
    is_visible?: boolean
  }
  video?: {
    title?: string
    url?: string
    poster?: string
    is_visible?: boolean
  }
  benefits?: {
    title?: string
    items?: Array<{ t: string; d: string }>
    is_visible?: boolean
  }
  contact?: {
    title?: string
    text?: string
    cta?: string
    to?: string
    is_visible?: boolean
  }
  industries?: Array<{
    id: string
    name: string
    description: string
    image_url: string
  }>
  gallery?: Array<{
    id: string
    title: string
    media_url: string
    thumbnail_url?: string
    embed_url?: string
    media_type: string
    placement?: string
    cat?: string
    prod?: string
  }>
  hero_slides?: any[]
  featured_products: ApiProduct[]
  categories: ApiCategory[]
  testimonials: Array<{
    id: string
    author_name: string
    company: string
    text: string
    rating: number
    avatar_url?: string
  }>
  client_logos: Array<{
    id: string
    name: string
    logo_url: string
    website_url?: string
  }>
  stats?: Array<{ label: string; value: string }>
}

// ── Asset URL Resolver ─────────────────────────────────────────────────────
export function resolveAssetUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const base = import.meta.env.BASE_URL || '/'
  if (base !== '/' && url.startsWith(base)) return url
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  return `${cleanBase}${cleanUrl}`
}

// ── Product Adapter ────────────────────────────────────────────────────────
// Normalizes raw backend database objects into standard frontend Product format
import type { Product } from './data'

export function normalizeProduct(p: ApiProduct): Product {
  const isRotating = p.sku === 'DD-RLPB-18' || p.slug === 'led-rotating-lollipop-board' || (p.name && /rotating.*lollipop|lollipop.*rotating/i.test(p.name))
  const rawImages = (p.images && p.images.length > 0)
    ? p.images
        .map((im: any) => typeof im === 'string' ? im : (im.url || im.image_url))
        .filter((u: string) => Boolean(u) && typeof u === 'string' && !u.startsWith('blob:'))
    : []

  if (isRotating && rawImages.length === 0) {
    rawImages.push('/p/rotating-lollipop-1.jpg', '/p/rotating-lollipop-2.jpg')
  }

  let rawImg = p.primary_image || p.image_url || rawImages[0]
  if (!rawImg || (typeof rawImg === 'string' && rawImg.startsWith('blob:'))) {
    rawImg = isRotating ? '/p/rotating-lollipop-1.jpg' : (rawImages[0] || '/p/i-standee.jpg')
  }
  const img = resolveAssetUrl(rawImg)
  const images = rawImages.length > 0 ? rawImages.map(resolveAssetUrl) : [img]
  const inrPrice = p.price ?? p.base_price_inr ?? (p.base_price_paise ? Math.round(p.base_price_paise / 100) : null)
  
  // Normalize specs into [string, string][]
  let specsList: [string, string][] = []
  if (Array.isArray(p.specs)) {
    specsList = p.specs.map((item: any) => {
      if (Array.isArray(item)) return [String(item[0]), String(item[1])] as [string, string]
      if (item && typeof item === 'object') return [String(item.label || item.group || ''), String(item.value || '')] as [string, string]
      return ['', ''] as [string, string]
    }).filter(([k, v]) => Boolean(k))
  }

  // Normalize attrs & sizes
  const attrs: Record<string, any> = { ...(p.attrs || {}) }
  if ((p as any).attribute_values && Array.isArray((p as any).attribute_values)) {
    for (const av of (p as any).attribute_values) {
      if (av.key && av.values && !attrs[av.key]) {
        attrs[av.key] = av.values
      }
    }
  }

  // Extract 3D environment images and default scene if present in specs
  for (const [k, v] of specsList) {
    if ((k === '3D Wall: Shop Board' || k === '3D Wall: Counter Desk' || k === '3D Scene: Counter Desk') && v) {
      attrs.shop_wall_image = v
      attrs.counter_desk_image = v
    }
    if ((k === '3D Wall: Commercial Hall' || k === '3D Wall: Gallery Wall') && v) {
      attrs.hall_wall_image = v
      attrs.gallery_wall_image = v
    }
    if ((k === '3D Scene: Marble Shelf' || k === '3D Wall: Marble Shelf') && v) {
      attrs.shelf_image = v
      attrs.marble_shelf_image = v
    }
    if (k === '3D Default Scene' && v) attrs.default_scene = v
    if (k === '3D Default Orientation' && v) attrs.default_orientation = v
  }
  let sizes: string[] = []
  if (p.variants && p.variants.length > 0) {
    sizes = p.variants
      .filter((v: any) => v.is_active !== false)
      .map((v: any) => {
        const cardMatch = v.name?.match(/^DD-\d+\s*\(([^)]+)\)/i)
        if (cardMatch) return cardMatch[1].trim()
        const sizeMatch = v.name?.match(/^([A-Za-z0-9]+)\s*\(([^)]+)\)/)
        if (sizeMatch) return sizeMatch[1].trim()
        return v.name ? v.name.split(/[\s(]/)[0].trim() : ''
      })
      .filter(Boolean)
  }

  if (sizes.length === 0) {
    if (p.sizes && p.sizes.length > 0) {
      sizes = p.sizes.map(String)
    } else if (attrs.size) {
      sizes = (Array.isArray(attrs.size) ? attrs.size : [attrs.size]).map(String)
    } else if ((p as any).attribute_values && Array.isArray((p as any).attribute_values)) {
      const sizeAttr = (p as any).attribute_values.find((av: any) => av.key === 'size' || av.label?.toLowerCase() === 'size')
      if (sizeAttr && Array.isArray(sizeAttr.values)) {
        sizes = sizeAttr.values.map(String)
      }
    }
  }

  if (sizes.length === 0) {
    if (p.sku === 'DD-USL-01' || p.slug === 'premium-ultra-slim-signage' || p.id === 'premium-ultra-slim-signage') {
      sizes = ['A5', 'A4', 'A3', 'A2', 'A1', 'BO']
    } else if (p.sku === 'DD-TCS-01' || p.slug === 't-shaped-card-stand' || p.id === 't-shaped-card-stand' || p.category_slug === 'card-stands') {
      sizes = ['55 × 90 mm', 'A7', 'A6', 'A5', 'A4']
    }
  }
  const features = p.features || p.highlights || []

  const statusCapitalized = (p as any).status
    ? ((p as any).status.charAt(0).toUpperCase() + (p as any).status.slice(1).toLowerCase())
    : 'Published'

  return {
    id: p.slug || p.id,
    db_id: p.id,
    name: p.name,
    cat: p.category_slug || p.category_id || 'digital-signage',
    category_id: p.category_id,
    category_slug: p.category_slug,
    sku: p.sku,
    img,
    images: images.length > 0 ? images : [img],
    price: inrPrice,
    kind: p.kind || 'digital',
    blurb: p.blurb || p.short_description || p.description || '',
    description: p.description || p.short_description || p.blurb || '',
    sizes: sizes.map(String),
    specs: specsList,
    attrs,
    features,
    status: statusCapitalized,
    stock: p.stock ?? 15,
    slug: p.slug,
    customizable: Boolean(p.is_customizable ?? (p.kind === 'custom')),
    variants: p.variants || [],
  }
}

// ── Public Storefront API ──────────────────────────────────────────────────

export const catalogueApi = {
  async getCategories(): Promise<ApiCategory[]> {
    return apiFetch<ApiCategory[]>('/categories')
  },

  async getCategoryFilters(slug: string): Promise<ApiFilterDef[]> {
    return apiFetch<ApiFilterDef[]>(`/categories/${slug}/filters`)
  },

  async getFilters(category?: string): Promise<ApiFilterDef[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : ''
    return apiFetch<ApiFilterDef[]>(`/products/filters${q}`)
  },

  async getProducts(params: {
    category?: string
    kind?: string
    search?: string
    page?: number
    page_size?: number
    sort_by?: string
  } = {}): Promise<{ items: ApiProduct[]; total: number; page: number; page_size: number }> {
    const qs = new URLSearchParams()
    if (params.category && params.category !== 'all') qs.set('category', params.category)
    if (params.kind) qs.set('kind', params.kind)
    if (params.search) qs.set('search', params.search)
    if (params.page) qs.set('page', String(params.page))
    if (params.page_size) qs.set('page_size', String(params.page_size))
    if (params.sort_by) qs.set('sort_by', params.sort_by)

    const qStr = qs.toString()
    return apiFetch(`/products${qStr ? '?' + qStr : ''}`)
  },

  async getProduct(slugOrId: string): Promise<ApiProduct> {
    return apiFetch<ApiProduct>(`/products/${slugOrId}`)
  },

  async getHomepage(): Promise<ApiHomepageData> {
    return apiFetch<ApiHomepageData>('/home')
  },

  async getFaqs(): Promise<Array<{ question: string; answer: string; category?: string }>> {
    return apiFetch('/faqs')
  },

  async getPolicy(slug: string): Promise<{ title: string; content: string; updated_at?: string }> {
    return apiFetch(`/policies/${slug}`)
  },

  async getVariants(categoryId?: string): Promise<any[]> {
    const qs = categoryId ? `?category_id=${categoryId}` : ''
    return apiFetch<any[]>(`/variants${qs}`)
  },

  async getCustomizationProfile(productId: string): Promise<any> {
    return apiFetch<any>(`/products/${productId}/customization-profile`)
  },

  async getGallery(params?: { placement?: string; media_type?: string }): Promise<Array<{
    id: string
    title?: string
    media_url: string
    thumbnail_url?: string
    embed_url?: string
    media_type: string
    placement?: string
    caption?: string
    cat?: string
    prod?: string
  }>> {
    const sp = new URLSearchParams()
    if (params?.placement) sp.set('placement', params.placement)
    if (params?.media_type) sp.set('media_type', params.media_type)
    const qs = sp.toString()
    return apiFetch(`/gallery${qs ? `?${qs}` : ''}`)
  },

  async getNavigation(): Promise<{
    header: Array<{ id: number; label: string; to: string; on: boolean; d: number }>
    footer: Array<{ id: number; label: string; to: string; on: boolean; d: number }>
  }> {
    return apiFetch('/navigation')
  },

  async getIndustries(): Promise<Array<{
    id: string
    name: string
    description: string
    image_url: string
  }>> {
    return apiFetch('/industries')
  },

  async getFooter(): Promise<{
    desc: string
    cols: Array<{ t: string; links: [string, string][] }>
    pol: Record<string, boolean>
    email: string
    phone: string
    addr: string
    soc: Record<string, boolean>
  }> {
    return apiFetch('/footer')
  },

  async getPage(slug: string): Promise<{
    slug: string
    title: string
    content: string
    seo_title?: string
    seo_description?: string
    banner_image_url?: string
  }> {
    return apiFetch(`/pages/${slug}`)
  },

  async getClientLogos(): Promise<Array<{
    id: string
    name: string
    logo_url: string
    website_url?: string
  }>> {
    return apiFetch('/client-logos')
  },

  async getTestimonials(): Promise<Array<{
    id: string
    author_name: string
    company: string
    role?: string
    text: string
    rating: number
    avatar_url?: string
  }>> {
    return apiFetch('/testimonials')
  },

  async getProductReviews(productId: string): Promise<Array<{
    id: string
    author_name: string
    rating: number
    title?: string
    body?: string
    text?: string
    verified?: boolean
    company?: string
    created_at?: string
  }>> {
    return apiFetch(`/products/${productId}/reviews`)
  },

  async submitProductReview(productId: string, data: {
    rating: number
    title?: string
    body: string
    author_name: string
  }): Promise<{ id: string; status: string }> {
    return apiFetch(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getSEOMeta(path: string): Promise<{
    title?: string
    description?: string
    og_image?: string
    canonical?: string
    noindex?: boolean
  }> {
    return apiFetch(`/seo-meta?path=${encodeURIComponent(path)}`)
  },
}

// ── Cart & Authoritative Pricing API ───────────────────────────────────────

export const cartApi = {
  async calculatePrice(
    items: Array<{ product_id: string; quantity: number; options?: Record<string, string> }>,
    couponCode?: string | null
  ): Promise<ApiPriceBreakdown> {
    return apiFetch<ApiPriceBreakdown>('/cart/price', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          customization: i.options,
        })),
        coupon_code: couponCode || null,
      }),
    })
  },
}

// ── Checkout & Payment API ─────────────────────────────────────────────────

export const checkoutApi = {
  async initiateCheckout(payload: {
    customer_email?: string
    customer_phone?: string
    customer_name?: string
    shipping_address?: {
      full_name?: string
      phone?: string
      address_line1: string
      address_line2?: string
      city: string
      state: string
      postal_code?: string
      pin_code?: string
      country?: string
    }
    billing_address?: any
    price_token?: string
    items?: Array<{ product_id: string; quantity: number; options?: Record<string, any>; artwork?: string; variant_id?: string }>
    notes?: string
    coupon_code?: string
    company_name?: string
    gstin?: string
  }): Promise<ApiCheckoutResponse> {
    return apiFetch<ApiCheckoutResponse>('/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async verifyPayment(payload: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    order_reference: string
  }): Promise<{
    status: string
    order_reference: string
    payment_status?: string
    order_status?: string
    details_pending?: boolean
  }> {
    return apiFetch('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getOrderStatus(reference: string): Promise<ApiOrderDetail> {
    return apiFetch<ApiOrderDetail>(`/orders/${reference}/status`)
  },

  async getDetailsPendingStatus(reference: string): Promise<{
    reference: string
    status: string
    total_paise: number
    total_inr: number
    details_pending: boolean
    customer_name?: string
    customer_email?: string
    customer_phone?: string
    company_name?: string
    gstin?: string
    billing_address?: any
    shipping_address?: any
  }> {
    return apiFetch(`/orders/${reference}/details-pending`)
  },

  async submitPostPaymentDetails(reference: string, payload: {
    customer_name: string
    customer_email: string
    customer_phone: string
    billing_address: {
      full_name?: string
      phone?: string
      address_line1: string
      address_line2?: string
      city: string
      state: string
      pin_code?: string
      postal_code?: string
      country?: string
    }
    shipping_address?: {
      full_name?: string
      phone?: string
      address_line1: string
      address_line2?: string
      city: string
      state: string
      pin_code?: string
      postal_code?: string
      country?: string
    }
    company_name?: string
    gstin?: string
    notes?: string
    create_account?: boolean
    password?: string
  }): Promise<{
    status: string
    order_reference: string
    order_status: string
    message: string
    tracking_token?: string
  }> {
    return apiFetch(`/orders/${reference}/customer-details`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async trackOrder(payload: { reference: string; email_or_phone: string }): Promise<ApiOrderDetail> {
    return apiFetch<ApiOrderDetail>('/orders/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

// ── Quotes API ─────────────────────────────────────────────────────────────

export const quotesApi = {
  async submitQuote(payload: {
    product_id?: string
    name: string
    email: string
    phone: string
    company_name?: string
    quantity: number
    specifications?: Record<string, any>
    notes?: string
  }): Promise<{ reference: string; message: string }> {
    return apiFetch('/quotes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

// ── Customer Auth & Profile API ───────────────────────────────────────────

export const authApi = {
  async register(payload: { email: string; password: string; full_name: string; phone?: string }): Promise<any> {
    const res = await apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.access_token) {
      setAuthToken(res.access_token, res.refresh_token)
    }
    return res
  },

  async login(payload: { email: string; password: string }): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const res = await apiFetch<{ access_token: string; refresh_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.access_token) {
      setAuthToken(res.access_token, res.refresh_token)
    }
    return res
  },

  async getMe(): Promise<any> {
    return apiFetch('/auth/me')
  },

  async getMyOrders(): Promise<ApiOrderSummary[]> {
    return apiFetch('/customer/orders')
  },

  async getMyAddresses(): Promise<any[]> {
    return apiFetch('/customer/addresses')
  },

  async saveAddress(payload: any): Promise<any> {
    return apiFetch('/customer/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async logout(): Promise<void> {
    clearAuthToken()
  },

  async getInvite(token: string): Promise<{ valid: boolean; email: string; name?: string; role: string; expires_at?: string }> {
    return apiFetch(`/auth/invite/${token}`)
  },

  async acceptInvite(payload: { token: string; password: string; name?: string }): Promise<{ access_token: string; refresh_token: string; user: any; message: string }> {
    const res = await apiFetch<{ access_token: string; refresh_token: string; user: any; message: string }>('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.access_token) {
      setAuthToken(res.access_token, res.refresh_token)
    }
    return res
  },
}

// ── Artwork Upload API ─────────────────────────────────────────────────────

export const uploadApi = {
  async uploadArtwork(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return apiFetch('/uploads/artwork', {
      method: 'POST',
      body: formData,
    })
  },
}

// ── Admin API ──────────────────────────────────────────────────────────────
export const uploadsApi = {
  async uploadArtwork(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const token = getAuthToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch('/api/v1/uploads/artwork', {
        method: 'POST',
        body: formData,
        headers,
      })
      if (res.ok) {
        const data = await res.json()
        if (data.public_url || data.url) return data.public_url || data.url
      }
    } catch {}

    // Fallback: convert to base64 Data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) || '')
      reader.readAsDataURL(file)
    })
  },
}

export const adminApi = {
  async getAnalytics(range: string = '30d'): Promise<any> {
    return apiFetch(`/admin/analytics?range=${range}`)
  },
  async getProducts(params?: { page?: number; page_size?: number; status?: string; category_id?: string; q?: string }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.category_id) searchParams.set('category_id', params.category_id)
    if (params?.q) searchParams.set('q', params.q)
    const qs = searchParams.toString()
    return apiFetch(`/admin/products${qs ? `?${qs}` : ''}`)
  },
  async getProduct(id: string): Promise<any> {
    return apiFetch(`/admin/products/${id}`)
  },
  async createProduct(payload: any): Promise<any> {
    return apiFetch('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateProduct(id: string, payload: any): Promise<any> {
    return apiFetch(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteProduct(id: string): Promise<any> {
    return apiFetch(`/admin/products/${id}`, {
      method: 'DELETE',
    })
  },
  async getOrders(params?: { page?: number; page_size?: number; status?: string; q?: string }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.q) searchParams.set('q', params.q)
    const qs = searchParams.toString()
    return apiFetch(`/admin/orders${qs ? `?${qs}` : ''}`)
  },
  async getOrder(id: string): Promise<any> {
    return apiFetch(`/admin/orders/${id}`)
  },
  async updateOrderStatus(id: string, status: string, notes?: string, shipment_info?: any): Promise<any> {
    const payload: any = { status, notes, note: notes }
    if (shipment_info) {
      payload.shipment_info = shipment_info
      if (shipment_info.carrier) payload.carrier = shipment_info.carrier
      if (shipment_info.tracking_number) payload.tracking_number = shipment_info.tracking_number
    }
    return apiFetch(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async getQuotes(params?: { page?: number; page_size?: number; status?: string }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status) searchParams.set('status', params.status)
    const qs = searchParams.toString()
    return apiFetch(`/admin/quotes${qs ? `?${qs}` : ''}`)
  },
  async replyQuote(id: string, quoted_amount_rupees: number, notes?: string): Promise<any> {
    return apiFetch(`/admin/quotes/${id}/quote`, {
      method: 'POST',
      body: JSON.stringify({ quoted_amount_rupees, notes }),
    })
  },
  async getCoupons(): Promise<any[]> {
    return apiFetch('/admin/coupons')
  },
  async createCoupon(payload: any): Promise<any> {
    return apiFetch('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async toggleCoupon(id: string, is_active?: boolean): Promise<any> {
    return apiFetch(`/admin/coupons/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    })
  },
  async deleteCoupon(id: string): Promise<any> {
    return apiFetch(`/admin/coupons/${id}`, {
      method: 'DELETE',
    })
  },
  async getHomepageContent(): Promise<any> {
    return apiFetch('/admin/content/homepage')
  },
  async updateHomepageContent(payload: any): Promise<any> {
    return apiFetch('/admin/content/homepage', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  // Content Pages Management
  async getPages(): Promise<any[]> {
    return apiFetch('/admin/content/pages')
  },
  async createPage(payload: any): Promise<any> {
    return apiFetch('/admin/content/pages', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updatePage(id: string, payload: any): Promise<any> {
    return apiFetch(`/admin/content/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deletePage(id: string): Promise<any> {
    return apiFetch(`/admin/content/pages/${id}`, {
      method: 'DELETE',
    })
  },

  // Navigation Menus Management
  async getNavigation(): Promise<any> {
    return apiFetch('/admin/content/navigation')
  },
  async updateNavigation(payload: any): Promise<any> {
    return apiFetch('/admin/content/navigation', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  // Gallery & Videos Management
  async getGallery(): Promise<any[]> {
    return apiFetch('/admin/content/gallery')
  },
  async createGalleryItem(payload: any): Promise<any> {
    return apiFetch('/admin/content/gallery', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateGalleryItem(id: string | number, payload: any): Promise<any> {
    return apiFetch(`/admin/content/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteGalleryItem(id: string | number): Promise<any> {
    return apiFetch(`/admin/content/gallery/${id}`, {
      method: 'DELETE',
    })
  },
  async validateInstagram(url: string): Promise<{
    valid: boolean
    shortcode: string
    embed_url: string
    clean_url: string
    thumbnail_hint: string
  }> {
    return apiFetch('/admin/content/validate-instagram', {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  },

  // Client Logos Management
  async getClientLogos(): Promise<any[]> {
    return apiFetch('/admin/content/client-logos')
  },
  async createClientLogo(payload: any): Promise<any> {
    return apiFetch('/admin/content/client-logos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async approveClientLogo(id: string | number, approved: boolean): Promise<any> {
    return apiFetch(`/admin/content/client-logos/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ is_approved: approved }),
    })
  },
  async updateClientLogo(id: string | number, payload: any): Promise<any> {
    return apiFetch(`/admin/content/client-logos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteClientLogo(id: string | number): Promise<any> {
    return apiFetch(`/admin/content/client-logos/${id}`, {
      method: 'DELETE',
    })
  },

  // Industries Management
  async getIndustries(): Promise<any[]> {
    return apiFetch('/admin/content/industries')
  },
  async updateIndustries(payload: any[]): Promise<any> {
    return apiFetch('/admin/content/industries', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async createIndustry(payload: any): Promise<any> {
    return apiFetch('/admin/content/industries', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async deleteIndustry(id: string): Promise<any> {
    return apiFetch(`/admin/content/industries/${id}`, {
      method: 'DELETE',
    })
  },

  // FAQs Management
  async getFaqs(): Promise<any[]> {
    return apiFetch('/admin/content/faqs')
  },
  async createFaq(payload: any): Promise<any> {
    return apiFetch('/admin/content/faqs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateFaq(id: string | number, payload: any): Promise<any> {
    return apiFetch(`/admin/content/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteFaq(id: string | number): Promise<any> {
    return apiFetch(`/admin/content/faqs/${id}`, {
      method: 'DELETE',
    })
  },

  // Testimonials Management
  async getTestimonials(): Promise<any[]> {
    return apiFetch('/admin/content/testimonials')
  },
  async createTestimonial(payload: any): Promise<any> {
    return apiFetch('/admin/content/testimonials', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async approveTestimonial(id: string | number, approved: boolean): Promise<any> {
    return apiFetch(`/admin/content/testimonials/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ is_approved: approved }),
    })
  },
  async updateTestimonial(id: string | number, payload: any): Promise<any> {
    return apiFetch(`/admin/content/testimonials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteTestimonial(id: string | number): Promise<any> {
    return apiFetch(`/admin/content/testimonials/${id}`, {
      method: 'DELETE',
    })
  },

  // Footer & Policies Management
  async getFooterConfig(): Promise<any> {
    return apiFetch('/admin/content/footer')
  },
  async updateFooterConfig(payload: any): Promise<any> {
    return apiFetch('/admin/content/footer', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async getSettings(): Promise<any> {
    return apiFetch('/admin/settings')
  },
  async updateSettings(data: any): Promise<any> {
    return apiFetch('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Categories Management
  async getCategories(): Promise<any[]> {
    return apiFetch('/admin/categories')
  },
  async createCategory(payload: any): Promise<any> {
    return apiFetch('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateCategory(id: string, payload: any): Promise<any> {
    return apiFetch(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteCategory(id: string): Promise<any> {
    return apiFetch(`/admin/categories/${id}`, {
      method: 'DELETE',
    })
  },
  async reorderCategories(list: { id: string; display_order: number }[]): Promise<any> {
    return apiFetch('/admin/categories/reorder', {
      method: 'POST',
      body: JSON.stringify(list),
    })
  },

  // Product Variants & Option Sets Management
  async getVariants(categoryId?: string): Promise<any[]> {
    const qs = categoryId ? `?category_id=${categoryId}` : ''
    return apiFetch(`/admin/variants${qs}`)
  },
  async createVariant(payload: any): Promise<any> {
    return apiFetch('/admin/variants', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateVariant(id: string, payload: any): Promise<any> {
    return apiFetch(`/admin/variants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteVariant(id: string): Promise<any> {
    return apiFetch(`/admin/variants/${id}`, {
      method: 'DELETE',
    })
  },

  // Product Attributes Management
  async getAttributes(): Promise<any[]> {
    return apiFetch('/admin/attributes')
  },
  async createAttribute(payload: any): Promise<any> {
    return apiFetch('/admin/attributes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateAttribute(id: string, payload: any): Promise<any> {
    return apiFetch(`/admin/attributes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteAttribute(id: string): Promise<any> {
    return apiFetch(`/admin/attributes/${id}`, {
      method: 'DELETE',
    })
  },
  async getFilters(): Promise<any[]> {
    return apiFetch('/admin/attributes/filters')
  },
  async updateFilters(payload: any[]): Promise<any> {
    return apiFetch('/admin/attributes/filters', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  // Customization Profiles Management
  async getCustomizationProfiles(): Promise<any[]> {
    return apiFetch('/admin/customization-profiles')
  },
  async getCustomizationProfile(id: string): Promise<any> {
    return apiFetch(`/admin/customization-profiles/${id}`)
  },
  async createCustomizationProfile(payload: any): Promise<any> {
    return apiFetch('/admin/customization-profiles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateCustomizationProfile(id: string, payload: any): Promise<any> {
    return apiFetch(`/admin/customization-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async deleteCustomizationProfile(id: string): Promise<any> {
    return apiFetch(`/admin/customization-profiles/${id}`, {
      method: 'DELETE',
    })
  },
  // Settings Management
  async getSettingsGrouped(): Promise<Record<string, any>> {
    return apiFetch('/admin/settings/grouped')
  },
  async updateSettingsGroup(groupKey: string, payload: any): Promise<any> {
    return apiFetch(`/admin/settings/grouped/${groupKey}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async testPaymentConfig(): Promise<any> {
    return apiFetch('/admin/settings/test-payment', {
      method: 'POST',
    })
  },
  async testEmailConfig(payload?: string | { to?: string; host?: string; port?: string; user?: string; password?: string; from?: string }): Promise<{ status: string; message: string }> {
    const body = typeof payload === 'string' ? { to: payload } : (payload || {})
    return apiFetch('/admin/settings/test-email', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  async getEmailTemplates(): Promise<any[]> {
    return apiFetch('/admin/email-templates')
  },
  async getEmailTemplate(id: string): Promise<any> {
    return apiFetch(`/admin/email-templates/${id}`)
  },
  async updateEmailTemplate(id: string, data: any): Promise<{ status: string; message: string; template: any }> {
    return apiFetch(`/admin/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  async resetEmailTemplate(id: string): Promise<{ status: string; message: string; template: any }> {
    return apiFetch(`/admin/email-templates/${id}/reset`, {
      method: 'POST',
    })
  },
  async previewEmailTemplate(id: string, data: any): Promise<{ subject: string; body_text: string; body_html: string }> {
    return apiFetch(`/admin/email-templates/${id}/preview`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  async testSendEmailTemplate(id: string, data: { to: string; [k: string]: any }): Promise<{ status: string; message: string }> {
    return apiFetch(`/admin/email-templates/${id}/test-send`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  async getStorageStatus(): Promise<{
    active_mode: string
    provider_summary: string
    local_storage: {
      healthy: boolean
      writable: boolean
      status: string
      path: string
      free_mb: number
      total_mb?: number
      durable?: boolean
      message: string
    }
    r2: {
      configured: boolean
      status: string
      bucket?: string | null
      account_id?: string | null
      mode: string
      message: string
    }
    images: {
      configured: boolean
      status: string
      cdn_host?: string | null
      mode: string
      message: string
    }
    stream: {
      configured: boolean
      status: string
      stream_code?: string | null
      mode: string
      message: string
    }
  }> {
    return apiFetch('/admin/settings/storage-status')
  },
  async testStorage(provider: 'local' | 'r2' | 'images' | 'stream'): Promise<{
    status: 'ok' | 'error' | 'fallback_active'
    provider: string
    message: string
    free_mb?: number
    bucket?: string
    cdn_host?: string
  }> {
    return apiFetch('/admin/settings/test-storage', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    })
  },

  // SEO Management
  async getSeoList(): Promise<any[]> {
    return apiFetch('/admin/seo')
  },
  async updateSeo(resourceType: string, resourceId: string, payload: any): Promise<any> {
    return apiFetch(`/admin/seo/${resourceType}/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  // Media Library Management
  async getMediaList(type?: string, q?: string): Promise<any[]> {
    const params = new URLSearchParams()
    if (type && type !== 'all') params.append('type', type)
    if (q) params.append('q', q)
    const qs = params.toString()
    return apiFetch(`/admin/media${qs ? `?${qs}` : ''}`)
  },
  async uploadMedia(file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    return apiFetch('/admin/media/upload', {
      method: 'POST',
      body: formData,
    })
  },
  async updateMedia(id: string | number, payload: any): Promise<any> {
    return apiFetch(`/admin/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async deleteMedia(id: string | number): Promise<any> {
    return apiFetch(`/admin/media/${id}`, {
      method: 'DELETE',
    })
  },

  // Notifications Management
  async getNotifications(tab: string = 'all', page: number = 1, limit: number = 20): Promise<{
    items: any[]
    total: number
    unread_count: number
    page: number
    pages: number
  }> {
    return apiFetch(`/admin/notifications?tab=${encodeURIComponent(tab)}&page=${page}&limit=${limit}`)
  },
  async markNotificationRead(id: string | number): Promise<any> {
    return apiFetch(`/admin/notifications/${id}/read`, {
      method: 'PATCH',
    })
  },
  async markAllNotificationsRead(): Promise<any> {
    return apiFetch('/admin/notifications/mark-all-read', {
      method: 'POST',
    })
  },
  async getNotificationPreferences(): Promise<Record<string, boolean[]>> {
    return apiFetch('/admin/notifications/preferences')
  },
  async saveNotificationPreferences(payload: Record<string, boolean[]>): Promise<any> {
    return apiFetch('/admin/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async getUnreadNotificationCount(): Promise<{ unread_count: number }> {
    return apiFetch('/admin/notifications/unread-count')
  },
  async getCompanionDevices(): Promise<any[]> {
    return apiFetch('/admin/devices')
  },
  async registerCompanionDevice(payload: { device_token: string; platform: string; device_name?: string; app_version?: string }): Promise<any> {
    return apiFetch('/admin/devices/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async deactivateCompanionDevice(deviceId: string): Promise<any> {
    return apiFetch(`/admin/devices/${deviceId}/deactivate`, {
      method: 'POST',
    })
  },
  async deleteCompanionDevice(deviceId: string): Promise<any> {
    return apiFetch(`/admin/devices/${deviceId}`, {
      method: 'DELETE',
    })
  },
  async testPushNotification(payload?: { title?: string; body?: string; device_id?: string; device_token?: string }): Promise<any> {
    return apiFetch('/admin/notifications/test-push', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },
  async getNotificationDeliveries(limit: number = 50): Promise<any[]> {
    return apiFetch(`/admin/notifications/deliveries?limit=${limit}`)
  },


  // Team & Admin User Management
  async getAdminUsers(): Promise<any[]> {
    return apiFetch('/admin/users')
  },
  async inviteAdminUser(payload: { email: string; name?: string; role: string }): Promise<any> {
    return apiFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async resendInvite(id: string): Promise<any> {
    return apiFetch(`/admin/users/${id}/resend-invite`, {
      method: 'POST',
    })
  },
  async updateAdminUser(id: string, payload: { name?: string; role?: string; is_active?: boolean }): Promise<any> {
    return apiFetch(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async deleteAdminUser(id: string): Promise<any> {
    return apiFetch(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  },

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number
    page_size?: number
    actor_email?: string
    action?: string
    resource_type?: string
  }): Promise<{
    items: any[]
    page: number
    page_size: number
    total: number
    total_pages: number
  }> {
    const sp = new URLSearchParams()
    if (params?.page) sp.set('page', String(params.page))
    if (params?.page_size) sp.set('page_size', String(params.page_size))
    if (params?.actor_email) sp.set('actor_email', params.actor_email)
    if (params?.action) sp.set('action', params.action)
    if (params?.resource_type) sp.set('resource_type', params.resource_type)
    const qs = sp.toString()
    return apiFetch(`/admin/audit-logs${qs ? `?${qs}` : ''}`)
  },

  // Reviews Moderation
  async getReviews(status?: string, productId?: string): Promise<Array<{
    id: string
    product_id: string
    product_name?: string
    author_name: string
    company?: string
    rating: number
    title?: string
    body: string
    status: 'pending' | 'published' | 'rejected'
    is_verified_purchase: boolean
    created_at?: string
  }>> {
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    if (productId) sp.set('product_id', productId)
    const qs = sp.toString()
    return apiFetch(`/admin/reviews${qs ? `?${qs}` : ''}`)
  },
  async moderateReview(id: string, status: 'published' | 'rejected' | 'pending'): Promise<any> {
    return apiFetch(`/admin/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  async deleteReview(id: string): Promise<any> {
    return apiFetch(`/admin/reviews/${id}`, {
      method: 'DELETE',
    })
  },
}

export interface PublicSeoData {
  title: string
  description: string
  og_image_url: string
  canonical_url: string
  noindex: boolean
  site_name: string
}

export const contentApi = {
  async getPublicSeo(path: string): Promise<PublicSeoData> {
    const cleaned = path.replace(/^\/+/, '') || 'home'
    return apiFetch<PublicSeoData>(`/content/seo/${cleaned}`)
  },
}

export interface PublicStoreSettings {
  site_name: string
  site_tagline: string
  site_logo_url: string
  contact_email: string
  contact_phone: string
  business_address: string
  business_hours: string
  announcement_enabled: boolean
  announcement_text: string
  contact_map_enabled: boolean
  contact_map_embed: string
  whatsapp_number: string
  whatsapp_message: string
  social_links: [string, string, boolean][]
  payment_mode: 'test' | 'live'
  razorpay_key_id: string
  images_cdn_hostname: string
  gst_registered: boolean
  company_gstin: string
  default_gst_rate: number
  gst_pricing_mode: 'excl' | 'incl'
  shipping_zones: { z: string; rate: string; days: string }[]
  shipping_free_enabled: boolean
  shipping_free_threshold_inr: number
}

export const settingsApi = {
  async getPublicSettings(): Promise<PublicStoreSettings> {
    return apiFetch<PublicStoreSettings>('/settings/public')
  },
}

