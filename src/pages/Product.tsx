import { useEffect, useRef, useState } from 'react'
import {
  Check, GitCompareArrows, Heart, MessageCircle, MessageSquareQuote,
  Palette, ShoppingCart, Truck, ZoomIn, Star, Sparkles, Box, Upload,
  Image as ImageIcon, Trash2, ArrowRight, Sun, Layers, Ruler, Store, Building2
} from 'lucide-react'
import { FAQS, PRODUCTS, byId, catName, ULTRA_SLIM_SIZE_META, CARD_STAND_SIZE_META, LOLLIPOP_SIZE_META, type Product } from '../data'
import { go, useApp } from '../store'
import { catalogueApi, normalizeProduct, type ApiProduct } from '../api'
import { Accordion, Badge, Breadcrumbs, Btn, Container, EmptyState, Field, Notice, Price, ProductCard, Qty, ReviewCard, SpecTable, StarRating, Segmented, Select, StepIndicator, Tabs, cx } from '../ui'
import FabricSignage3DViewer from '../components/FabricSignage3DViewer'
import UltraSlim3DViewer from '../components/UltraSlim3DViewer'
import CardStand3DViewer from '../components/CardStand3DViewer'
import LollipopBoard3DViewer from '../components/LollipopBoard3DViewer'
import RotatingLollipop3DViewer from '../components/RotatingLollipop3DViewer'

export default function ProductPage({ id }: { id: string }) {
  const { wishlist, toggleWish, compare, toggleCompare, addToCart, pushRecent, toast, setQuoteDraft, products, storeSettings } = useApp()
  const initial = products.find((x) => x.id === id || (x as any).slug === id) || byId(id)
  const [liveProduct, setLiveProduct] = useState<Product | null>(initial || null)
  const [loading, setLoading] = useState(!initial)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [reviewName, setReviewName] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)

  useEffect(() => {
    let active = true
    catalogueApi.getProduct(id)
      .then((raw) => {
        if (active) {
          const norm = normalizeProduct(raw)
          setLiveProduct(norm)
        }
      })
      .catch(() => {
        // Fall back to local or store catalogue
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id])

  // Load product reviews
  useEffect(() => {
    let active = true
    setReviewsLoading(true)
    catalogueApi.getProductReviews(id)
      .then((res) => {
        if (active) setReviews(Array.isArray(res) ? res : (res as any)?.items || [])
      })
      .catch(() => {})
      .finally(() => { if (active) setReviewsLoading(false) })
    return () => { active = false }
  }, [id])

  const p = liveProduct || initial
  const isCustomizable = Boolean(p?.customizable || p?.kind === 'custom')

  const isUltraSlim = p?.sku === 'DD-USL-01' || p?.id === 'premium-ultra-slim-signage' || p?.cat === 'premium-ultra-slim' || p?.slug === 'premium-ultra-slim-signage' || id === 'premium-ultra-slim-signage'
  const isCardStand = p?.sku === 'DD-TCS-01' || p?.id === 't-shaped-card-stand' || p?.slug === 't-shaped-card-stand' || id === 't-shaped-card-stand' || p?.cat === 'card-stands'
  const isLedFabric = p?.sku === 'DD-FAB-01' || p?.id === 'led-fabric-signage' || p?.slug === 'led-fabric-signage' || id === 'led-fabric-signage' || p?.cat === 'led-fabric-signage' || p?.name?.toLowerCase().includes('fabric signage') || p?.name?.toLowerCase().includes('fabric display')
  const isRotatingLollipop = p?.sku === 'DD-RLPB-18' || p?.id === 'led-rotating-lollipop-board' || p?.slug === 'led-rotating-lollipop-board' || id === 'led-rotating-lollipop-board' || (p?.name?.toLowerCase().includes('rotating') && p?.name?.toLowerCase().includes('lollipop'))
  const isLollipop = ((p?.sku === 'DD-LPB-01' || p?.id === 'led-lollipop-board' || p?.slug === 'led-lollipop-board' || id === 'led-lollipop-board' || p?.cat === 'lollipop-boards' || p?.name?.toLowerCase().includes('lollipop')) && !isRotatingLollipop)

  // Derive admin-determined thickness options dynamically:
  const adminThicknessOptions: string[] = (() => {
    if (p?.attrs?.thickness) {
      if (Array.isArray(p.attrs.thickness) && p.attrs.thickness.length > 0) {
        return p.attrs.thickness.map(String)
      }
      if (typeof p.attrs.thickness === 'string' && p.attrs.thickness.trim()) {
        return p.attrs.thickness.split(',').map((s) => s.trim()).filter(Boolean)
      }
    }
    const thickVariants = (p?.variants || []).filter((v) => v.is_active !== false && /60|80|100|mm/i.test(v.name))
    if (thickVariants.length > 0) {
      return thickVariants.map((v) => {
        const m = v.name.match(/(\d+\s*mm)/i)
        return m ? m[1].trim() : v.name.trim()
      })
    }
    return ['60 mm', '80 mm', '100 mm']
  })()

  // Extract admin configured 3D wall environments & default scene
  const adminShopWallImage = p?.attrs?.shop_wall_image || null
  const adminHallWallImage = p?.attrs?.hall_wall_image || null
  const adminDefaultScene = (p?.attrs?.default_scene === 'hall') ? 'hall' : 'shop'

  // Extract admin configured 3D environments & default scene for Ultra Slim
  const adminCounterDeskImage = p?.attrs?.counter_desk_image || p?.attrs?.shop_wall_image || null
  const adminGalleryWallImage = p?.attrs?.gallery_wall_image || p?.attrs?.hall_wall_image || null

  // Extract admin configured 3D environments for Card Stand
  const adminShelfImage = p?.attrs?.shelf_image || p?.attrs?.marble_shelf_image || null

  // Fabric Signage interactive 3D configuration state
  const [fabricUnit, setFabricUnit] = useState<'ft' | 'in'>('ft')
  const [fabricWidth, setFabricWidth] = useState<number>(4)
  const [fabricHeight, setFabricHeight] = useState<number>(3)
  const [fabricThickness, setFabricThickness] = useState<string>(() => adminThicknessOptions[1] || adminThicknessOptions[0] || '80 mm')
  const [fabricUploadedImage, setFabricUploadedImage] = useState<string | null>(null)
  const [fabricImageName, setFabricImageName] = useState<string>('')
  const [fabricFrameColor, setFabricFrameColor] = useState<'silver' | 'black' | 'white'>('silver')
  const [fabricLedOn, setFabricLedOn] = useState<boolean>(true)
  const [fabricEnvironment, setFabricEnvironment] = useState<'shop' | 'hall'>('shop')
  const [mediaMode, setMediaMode] = useState<'3d' | 'photos'>('3d')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ultra Slim Signage interactive 3D configuration state
  const [ultraSlimEnvironment, setUltraSlimEnvironment] = useState<'counter' | 'gallery'>('counter')
  const [ultraSlimLedOn, setUltraSlimLedOn] = useState<boolean>(true)
  const [ultraSlimUploadedImage, setUltraSlimUploadedImage] = useState<string | null>(null)
  const [ultraSlimImageName, setUltraSlimImageName] = useState<string>('')
  const ultraSlimFileInputRef = useRef<HTMLInputElement>(null)

  // T-Shaped Card Stand interactive 3D configuration state
  const [cardStandEnvironment, setCardStandEnvironment] = useState<'shelf' | 'counter'>('shelf')
  const [cardStandUploadedImage, setCardStandUploadedImage] = useState<string | null>(null)
  const [cardStandImageName, setCardStandImageName] = useState<string>('')
  const cardStandFileInputRef = useRef<HTMLInputElement>(null)

  // LED Lollipop Board interactive 3D configuration state (Static)
  const [lollipopShape, setLollipopShape] = useState<'Round' | 'Square'>('Round')
  const [lollipopLedOn, setLollipopLedOn] = useState<boolean>(true)
  const [lollipopEnvironment, setLollipopEnvironment] = useState<'shop' | 'hall'>('shop')
  const [lollipopUploadedImage, setLollipopUploadedImage] = useState<string | null>(null)
  const [lollipopImageName, setLollipopImageName] = useState<string>('')
  const lollipopFileInputRef = useRef<HTMLInputElement>(null)

  // LED Rotating Lollipop Board interactive 3D configuration state (Motorized 360°)
  const [rotatingMotorOn, setRotatingMotorOn] = useState<boolean>(true)
  const [rotatingLedOn, setRotatingLedOn] = useState<boolean>(true)
  const [rotatingEnvironment, setRotatingEnvironment] = useState<'shop' | 'hall'>('shop')
  const [rotatingUploadedImage, setRotatingUploadedImage] = useState<string | null>(null)
  const [rotatingImageName, setRotatingImageName] = useState<string>('')
  const rotatingFileInputRef = useRef<HTMLInputElement>(null)

  // Initialize with admin default scene when product loads
  useEffect(() => {
    if (isLedFabric && p?.attrs?.default_scene) {
      setFabricEnvironment(p.attrs.default_scene === 'hall' ? 'hall' : 'shop')
    }
    if (isUltraSlim) {
      if (p?.attrs?.default_scene) {
        setUltraSlimEnvironment(p.attrs.default_scene === 'gallery' || p.attrs.default_scene === 'hall' ? 'gallery' : 'counter')
      }
      if (p?.attrs?.default_orientation) {
        setOrient(p.attrs.default_orientation === 'Portrait' ? 'Portrait' : 'Landscape')
      }
    }
    if (isCardStand) {
      if (p?.attrs?.default_scene) {
        setCardStandEnvironment(p.attrs.default_scene === 'counter' ? 'counter' : 'shelf')
      }
      if (p?.attrs?.default_orientation) {
        setOrient(p.attrs.default_orientation === 'Landscape' ? 'Landscape' : 'Portrait')
      }
    }
    if (isLollipop) {
      if (p?.attrs?.default_shape) {
        setLollipopShape(p.attrs.default_shape === 'Square' ? 'Square' : 'Round')
      }
      if (p?.attrs?.default_scene) {
        setLollipopEnvironment(p.attrs.default_scene === 'hall' ? 'hall' : 'shop')
      }
    }
    if (isRotatingLollipop) {
      if (p?.attrs?.default_scene) {
        setRotatingEnvironment(p.attrs.default_scene === 'hall' ? 'hall' : 'shop')
      }
    }
  }, [p?.attrs?.default_scene, p?.attrs?.default_orientation, p?.attrs?.default_shape, isLedFabric, isUltraSlim, isCardStand, isLollipop, isRotatingLollipop])

  // Keep fabric thickness synchronized with admin options
  useEffect(() => {
    if (isLedFabric && adminThicknessOptions.length > 0) {
      if (!adminThicknessOptions.includes(fabricThickness)) {
        const preferred = adminThicknessOptions.find((t) => t.includes('80')) || adminThicknessOptions[0]
        setFabricThickness(preferred)
      }
    }
  }, [isLedFabric, adminThicknessOptions.join(',')])

  const numericThicknessMm = (() => {
    const m = fabricThickness.match(/(\d+)/)
    return m ? parseInt(m[1], 10) : 80
  })()

  const fabricSqFt = (() => {
    const w = Math.max(0.1, Number(fabricWidth) || 4)
    const h = Math.max(0.1, Number(fabricHeight) || 3)
    return fabricUnit === 'in' ? (w * h) / 144.0 : w * h
  })()
  const fabricSqIn = Math.round(fabricSqFt * 144)

  const handleArtworkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Please upload an image file (JPG, PNG, WebP)', 'err')
      return
    }
    const url = URL.createObjectURL(file)
    setFabricUploadedImage(url)
    setFabricImageName(file.name)
    setMediaMode('3d')
    toast(`Artwork placed onto 3D fabric model!`, 'ok')
  }

  const handleArtworkRemove = () => {
    setFabricUploadedImage(null)
    setFabricImageName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast('Artwork removed from 3D model', 'info')
  }

  // Derive product sizes dynamically: If product has active database variants, prioritize them!
  const activeVariants = (p?.variants || []).filter((v) => v.is_active !== false)
  const productSizes: string[] = (() => {
    if (isRotatingLollipop) {
      if (activeVariants.length > 0) {
        return activeVariants.map((v) => v.name)
      }
      return ['18 × 18 in']
    }
    if (isLollipop) return ['18 × 18 in', '24 × 24 in']
    if (activeVariants.length > 0) {
      return activeVariants.map((v) => {
        const cardMatch = v.name.match(/^DD-\d+\s*\(([^)]+)\)/i)
        if (cardMatch) return cardMatch[1].trim()
        const sizeMatch = v.name.match(/^([A-Za-z0-9]+)\s*\(([^)]+)\)/)
        if (sizeMatch) return sizeMatch[1].trim()
        return v.name.trim()
      })
    }
    if (isUltraSlim) return ['A5', 'A4', 'A3', 'A2', 'A1', 'BO']
    if (isCardStand) return ['55 × 90 mm', 'A7', 'A6', 'A5', 'A4']
    return p?.sizes && p.sizes.length > 0
      ? p.sizes
      : (p?.variants && p.variants.length > 0 ? p.variants.map((v) => v.name.split(/[\s(]/)[0]) : [])
  })()

  const defaultSize = isUltraSlim ? 'A5' : isCardStand ? '55 × 90 mm' : (isLollipop || isRotatingLollipop) ? '18 × 18 in' : (productSizes[0] ?? '')
  const [size, setSize] = useState(() => defaultSize)
  const [orient, setOrient] = useState('Landscape')
  const [finish, setFinish] = useState('Standard')
  const [touch, setTouch] = useState('Non-touch')
  const [mount, setMount] = useState('')
  const [acc, setAcc] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [thumb, setThumb] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [tab, setTab] = useState<'specs' | 'features' | 'reviews' | 'about'>('specs')

  useEffect(() => {
    if (p) {
      pushRecent(p.id)
      const defSize = isUltraSlim ? 'A5' : isCardStand ? '55 × 90 mm' : (isLollipop || isRotatingLollipop) ? '18 × 18 in' : (productSizes[0] ?? '')
      setSize((curr) => (curr && productSizes.includes(curr) ? curr : defSize))
      window.scrollTo(0, 0)
    }
  }, [id, p?.id, isUltraSlim, isCardStand, isLollipop, isRotatingLollipop, productSizes.length])

  const [dynVariants, setDynVariants] = useState<any[]>([])
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  useEffect(() => {
    if (p?.cat) {
      catalogueApi.getVariants(p.cat)
        .then((sets) => {
          if (Array.isArray(sets) && sets.length > 0) {
            setDynVariants(sets)
            const initialSel: Record<string, string> = {}
            sets.forEach((s) => {
              if (Array.isArray(s.values) && s.values.length > 0) {
                initialSel[s.name] = s.values[0]
              }
            })
            setSelectedVariants(initialSel)
          }
        })
        .catch(() => {})
    }
  }, [p?.cat])

  if (!p && !loading) return <Container className="py-16"><EmptyState title="Product not found" text="This product may have been unpublished or the link is incorrect." action={<Btn to="/shop">Browse products</Btn>} /></Container>
  if (!p) return <Container className="py-16"><div className="animate-pulse space-y-4"><div className="h-8 w-1/3 bg-soft rounded" /><div className="h-64 bg-soft rounded" /></div></Container>

  const w = wishlist.includes(p.id), c = compare.includes(p.id)
  const allProds = products && products.length > 0 ? products : PRODUCTS
  const related = allProds.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4)
  const mounts = Array.isArray(p.attrs.mounting) ? p.attrs.mounting : p.attrs.mounting ? [p.attrs.mounting] : []
  const matchedFabricVariant = isLedFabric ? p.variants?.find((v) => {
    if (!v.is_active) return false
    const vName = v.name.toLowerCase()
    const thkClean = fabricThickness.toLowerCase().replace(/\s+/g, '')
    return vName.includes(thkClean) || vName.includes(fabricThickness.toLowerCase())
  }) : null

  const options: Record<string, string> = { ...selectedVariants }
  if (isLedFabric) {
    options['Dimensions'] = `${fabricWidth} × ${fabricHeight} ${fabricUnit} (${fabricSqFt.toFixed(2)} sq.ft)`
    options['Width'] = `${fabricWidth} ${fabricUnit}`
    options['Height'] = `${fabricHeight} ${fabricUnit}`
    options['Thickness'] = fabricThickness
    options['Frame Finish'] = fabricFrameColor === 'silver' ? 'Anodized Silver' : fabricFrameColor === 'black' ? 'Matte Black' : 'Powder White'
    options['Backlight'] = fabricLedOn ? 'LED Backlit Active' : 'No Illumination'
    if (fabricImageName) {
      options['Artwork File'] = fabricImageName
    }
  } else {
    if (size) options.Size = size
    if (isRotatingLollipop) {
      options.Shape = 'Round'
      options.Size = size || '18 × 18 in'
      options.Rotation = rotatingMotorOn ? '360° Continuous Motor (Active)' : 'Motor Paused'
      options.Illumination = rotatingLedOn ? 'Dual-Sided Backlit LED' : 'Off'
      if (rotatingUploadedImage) {
        options['Custom Artwork'] = rotatingImageName || 'Uploaded Design'
      }
    }
    if (isLollipop) {
      options.Shape = lollipopShape
      options.Illumination = lollipopLedOn ? 'Active LED Backlit' : 'Off'
      if (lollipopUploadedImage) {
        options['Custom Artwork'] = lollipopImageName || 'Uploaded Graphic'
      }
    }
    if (isUltraSlim || isCardStand || p.kind === 'custom') {
      options.Orientation = orient
      if (!isCardStand && !isLollipop && !isRotatingLollipop) options.Finish = finish
    }
    if (isCardStand && cardStandUploadedImage) {
      options['Custom Card Graphic'] = cardStandImageName || 'Custom Artwork Insert'
    }
    if (p.kind === 'digital') { options.Touch = touch; if (mount || mounts[0]) options.Mounting = mount || mounts[0]; if (acc.length) options.Accessories = acc.join(', ') }
  }
  const gallery = (p.images && p.images.length > 0) ? p.images : [p.img]
  const accessories = ['Wall bracket', 'Media player stick', 'Wheel base']

  // Variant matching by size or option
  const matchedVariant = p.variants?.find((v) => {
    if (!size) return false
    const sLower = size.trim().toLowerCase().replace('×', 'x')
    const vName = v.name.toLowerCase().replace('×', 'x')
    const vSku = v.sku.toLowerCase()
    if (isLollipop) {
      const is24 = sLower.includes('24')
      const targetShape = lollipopShape.toLowerCase()
      const shapeCode = lollipopShape === 'Round' ? 'rnd' : 'sqr'
      const matchShape = vName.includes(targetShape) || vSku.includes(shapeCode)
      const matchSize = is24 ? (vName.includes('24') || vSku.includes('24')) : (vName.includes('18') || vSku.includes('18'))
      if (matchShape && matchSize) return true
      if (matchSize) return true
    }
    if (vName === sLower || vSku === sLower) return true
    if (vName.startsWith(sLower) || sLower.startsWith(vName.split(/[\s(]/)[0])) return true

    const m = vName.match(/\(([^)]+)\)/)
    if (m) {
      const paren = m[1].toLowerCase().replace('×', 'x').trim()
      if (paren === sLower || paren.startsWith(sLower) || sLower.startsWith(paren.split(/[\s(]/)[0])) return true
    }

    if ((sLower === 'bo' || sLower === 'b0') && (vSku.includes('bo') || vSku.includes('b0') || vName.includes('bo') || vName.includes('b0'))) {
      return true
    }
    if (isCardStand) {
      if (sLower.includes('55') && (vSku.includes('6276') || vName.includes('55') || vName.includes('6276'))) return true
      if (sLower.includes('a7') && (vSku.includes('6277') || vName.includes('a7') || vName.includes('6277'))) return true
      if (sLower.includes('a6') && (vSku.includes('6278') || vName.includes('a6') || vName.includes('6278'))) return true
      if (sLower.includes('a5') && (vSku.includes('6279') || vName.includes('a5') || vName.includes('6279'))) return true
      if (sLower.includes('a4') && (vSku.includes('6280') || vName.includes('a4') || vName.includes('6280'))) return true
    }
    return false
  })

  // Dynamic price calculation based on selected size — PRIORITIZES LIVE DATABASE VARIANTS
  const currentPrice = (() => {
    if (isLedFabric) {
      let baseRate = 700 // default 80 mm per sq.ft
      if (fabricThickness.includes('60')) baseRate = 650
      else if (fabricThickness.includes('100')) baseRate = 750

      if (matchedFabricVariant?.price_delta_paise != null) {
        const delta = Math.round(matchedFabricVariant.price_delta_paise / 100)
        baseRate = Math.max(500, baseRate + Math.round(delta / Math.max(1, fabricSqFt)))
      }
      return Math.max(2400, Math.round(fabricSqFt * baseRate))
    }

    if (p.price == null) return null
    if (isRotatingLollipop) {
      if (matchedVariant?.price_delta_paise != null) {
        return p.price + Math.round(matchedVariant.price_delta_paise / 100)
      }
      return 5500
    }
    if (isLollipop && size) {
      if (matchedVariant?.price_delta_paise != null) {
        return p.price + Math.round(matchedVariant.price_delta_paise / 100)
      }
      const sKey = size.trim().toLowerCase()
      if (sKey.includes('24')) return 4500
      return 3000
    }
    if (matchedVariant?.price_delta_paise != null) {
      return p.price + Math.round(matchedVariant.price_delta_paise / 100)
    }
    if (isUltraSlim && size) {
      const sKey = size.trim().toUpperCase()
      const meta = ULTRA_SLIM_SIZE_META[sKey] || ULTRA_SLIM_SIZE_META[sKey.slice(0, 2)]
      if (meta) return meta.price
    }
    if (isCardStand && size) {
      const sKey = size.trim()
      const meta = CARD_STAND_SIZE_META[sKey] || CARD_STAND_SIZE_META[sKey.replace('×', 'x')] || CARD_STAND_SIZE_META[sKey.toUpperCase()]
      if (meta) return meta.price
    }
    return p.price
  })()

  const add = () => {
    addToCart({
      productId: p.id,
      variantId: (isLedFabric ? matchedFabricVariant?.id : matchedVariant?.id) || undefined,
      price: currentPrice ?? undefined,
      qty,
      options,
    })
    const specSummary = isLedFabric
      ? `${fabricWidth}×${fabricHeight} ${fabricUnit}, ${fabricThickness}`
      : isRotatingLollipop
      ? `Rotating 18" · ${rotatingMotorOn ? '360° Motor' : 'Static'}`
      : isLollipop
      ? `${lollipopShape} ${size}`
      : (size || 'Standard')
    toast(`${p.name} (${specSummary}) added to cart · ₹${((currentPrice ?? p.price ?? 0) * qty).toLocaleString('en-IN')}`, 'ok')
  }
  const quote = () => { setQuoteDraft({ productId: p.id, options }); go(`/quote?product=${p.id}`) }

  // Review stats
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length : 0
  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({ n, count: reviews.filter(r => r.rating === n).length }))

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewRating || !reviewBody.trim()) return
    setReviewSubmitting(true)
    try {
      await catalogueApi.submitProductReview(id, { rating: reviewRating, title: reviewTitle, body: reviewBody, author_name: reviewName })
      setReviewDone(true)
      setShowReviewForm(false)
      toast('Review submitted for moderation. Thank you!', 'ok')
    } catch {
      toast('Could not submit review. Please try again.', 'err')
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="pb-24 lg:pb-0">
      <Container className="py-5">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: catName(p.cat), to: `/category/${p.cat}` }, { label: p.name }]} />
      </Container>

      <Container className="grid gap-6 pb-12 md:gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* gallery / 3D model */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {(isLedFabric || isUltraSlim || isCardStand || isLollipop || isRotatingLollipop) && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-soft/50 p-1">
              <button
                type="button"
                onClick={() => setMediaMode('3d')}
                className={cx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition cursor-pointer',
                  mediaMode === '3d'
                    ? 'bg-white text-ink shadow-sm ring-1 ring-black/5'
                    : 'text-ink-2 hover:text-ink'
                )}
              >
                <Box className="size-4 text-brand" />
                <span>3D Interactive Model</span>
                <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-extrabold text-brand">Live</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaMode('photos')}
                className={cx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition cursor-pointer',
                  mediaMode === 'photos'
                    ? 'bg-white text-ink shadow-sm ring-1 ring-black/5'
                    : 'text-ink-2 hover:text-ink'
                )}
              >
                <ImageIcon className="size-4" />
                <span>Product Photos</span>
                <span className="text-[11px] text-ink-2">({gallery.length})</span>
              </button>
            </div>
          )}

          {isLedFabric && mediaMode === '3d' ? (
            <div className="w-full">
              <FabricSignage3DViewer
                width={fabricWidth}
                height={fabricHeight}
                unit={fabricUnit}
                thicknessMm={numericThicknessMm}
                uploadedImageUrl={fabricUploadedImage}
                frameColor={fabricFrameColor}
                ledOn={fabricLedOn}
                environment={fabricEnvironment}
                customShopImageUrl={adminShopWallImage}
                customHallImageUrl={adminHallWallImage}
                className="w-full aspect-[4/3] max-h-[55vh] sm:max-h-none"
              />
            </div>
          ) : isUltraSlim && mediaMode === '3d' ? (
            <div className="w-full">
              <UltraSlim3DViewer
                size={size || 'A4'}
                orientation={orient as 'Portrait' | 'Landscape'}
                frameColor={finish.toLowerCase() === 'silver' ? 'silver' : finish.toLowerCase() === 'gold' ? 'gold' : 'black'}
                ledOn={ultraSlimLedOn}
                environment={ultraSlimEnvironment}
                customCounterImageUrl={adminCounterDeskImage}
                customGalleryImageUrl={adminGalleryWallImage}
                uploadedImageUrl={ultraSlimUploadedImage}
                className="w-full aspect-[4/3] max-h-[55vh] sm:max-h-none"
              />
            </div>
          ) : isCardStand && mediaMode === '3d' ? (
            <div className="w-full">
              <CardStand3DViewer
                size={size || '55 × 90 mm'}
                orientation={orient as 'Portrait' | 'Landscape'}
                environment={cardStandEnvironment}
                customShelfImageUrl={adminShelfImage}
                customCounterImageUrl={adminCounterDeskImage}
                uploadedImageUrl={cardStandUploadedImage}
                className="w-full aspect-[4/3] max-h-[55vh] sm:max-h-none"
              />
            </div>
          ) : isRotatingLollipop && mediaMode === '3d' ? (
            <div className="w-full">
              <RotatingLollipop3DViewer
                size={size || '18 × 18 in'}
                ledOn={rotatingLedOn}
                motorOn={rotatingMotorOn}
                environment={rotatingEnvironment}
                customShopImageUrl={adminShopWallImage}
                customHallImageUrl={adminHallWallImage}
                uploadedImageUrl={rotatingUploadedImage}
                className="w-full aspect-[4/3] max-h-[55vh] sm:max-h-none"
              />
            </div>
          ) : isLollipop && mediaMode === '3d' ? (
            <div className="w-full">
              <LollipopBoard3DViewer
                shape={lollipopShape}
                size={size || '18 × 18 in'}
                ledOn={lollipopLedOn}
                environment={lollipopEnvironment}
                customShopImageUrl={adminShopWallImage}
                customHallImageUrl={adminHallWallImage}
                uploadedImageUrl={lollipopUploadedImage}
                className="w-full aspect-[4/3] max-h-[55vh] sm:max-h-none"
              />
            </div>
          ) : (
            <div>
              <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
                <div className="order-2 flex gap-2 sm:order-1 sm:flex-col">
                  {gallery.map((g, i) => <button key={i} onClick={() => setThumb(i)} aria-label={`View image ${i + 1}`} className={cx('size-[72px] overflow-hidden rounded-lg border-2 bg-[#f3f1ee] transition', thumb === i ? 'border-brand' : 'border-line hover:border-ink-2')}><img src={g} alt="" className="size-full object-cover mix-blend-multiply" style={{ objectPosition: ['center', 'left', 'right'][i] }} /></button>)}
                </div>
                <button onClick={() => setZoom(!zoom)} className="group relative order-1 aspect-square overflow-hidden rounded-xl border border-line bg-[#f3f1ee] sm:order-2" aria-label="Toggle zoom">
                  <img src={gallery[thumb]} alt={p.name} className={cx('size-full object-cover mix-blend-multiply transition duration-500', zoom ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in')} style={{ objectPosition: ['center', 'left', 'right'][thumb] }} />
                  <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow-card opacity-0 group-hover:opacity-100 transition"><ZoomIn className="size-3.5" />{zoom ? 'Zoom out' : 'Zoom'}</span>
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-2">Image shown is from the product catalogue and may differ from the delivered configuration.</p>
            </div>
          )}
          
          {/* Review summary under gallery */}
          {avgRating > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-soft/50 px-4 py-3">
              <StarRating value={Math.round(avgRating)} size="sm" />
              <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-ink-2">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>

        {/* buy box */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="navy">{catName(p.cat)}</Badge>
            {isLedFabric ? (
              <Badge tone="brand">Interactive 3D Configurator</Badge>
            ) : p.kind === 'custom' ? (
              <Badge tone="brand">Customizable</Badge>
            ) : null}
            {p.stock === 0 ? (
              <Badge tone="bad" dot>Out of stock</Badge>
            ) : p.stock != null && p.stock < 5 ? (
              <Badge tone="warn" dot>Only {p.stock} left</Badge>
            ) : (
              <Badge tone="ok" dot>Available</Badge>
            )}
            <span className="text-xs text-ink-2">SKU: {p.sku}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-[0.95] sm:text-4xl lg:text-5xl">{p.name}</h1>
          <p className="mt-3 text-ink-2">{p.blurb}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Price p={p} value={currentPrice} prefix="" size="lg" />
            {isLedFabric ? (
              <Badge tone="brand">
                {fabricWidth} × {fabricHeight} {fabricUnit} · {fabricThickness} · {fabricSqFt.toFixed(1)} sq.ft
              </Badge>
            ) : size ? (
              <Badge tone="brand">
                {isLollipop ? `${lollipopShape} · ${size}` : size}
                {isUltraSlim && (ULTRA_SLIM_SIZE_META[size]?.dim || ULTRA_SLIM_SIZE_META[size.slice(0, 2)]?.dim)
                  ? ` · ${ULTRA_SLIM_SIZE_META[size]?.dim || ULTRA_SLIM_SIZE_META[size.slice(0, 2)]?.dim}`
                  : isCardStand && CARD_STAND_SIZE_META[size]?.code
                  ? ` · ${CARD_STAND_SIZE_META[size].code} (${CARD_STAND_SIZE_META[size].dim})`
                  : isLollipop && LOLLIPOP_SIZE_META[size]?.dim
                  ? ` · ${LOLLIPOP_SIZE_META[size].dim}`
                  : ''}
              </Badge>
            ) : null}
          </div>
          {p.price != null || isLedFabric ? (
            <p className="mt-1 text-xs text-ink-2">
              {isLedFabric
                ? 'Amount updates dynamically based on custom dimensions (Width × Height) and selected frame depth. Includes backlit LED module & SEG tension fabric print.'
                : isUltraSlim
                ? 'Amount updates dynamically based on selected size. Included: HP print, clamp and 12V adapter.'
                : isCardStand
                ? 'Amount updates dynamically based on selected card stand size (DD-6276 to DD-6280).'
                : isLollipop
                ? 'Amount updates dynamically based on selected shape & size (18 × 18 in: ₹3,000 | 24 × 24 in: ₹4,500). Dual-sided illuminated projection lightbox with wall mounting arm.'
                : 'Amount updates dynamically based on selected option. Server verifies exact tax and shipping.'}
            </p>
          ) : null}
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2"><Truck className="size-4" />Delivery timeline confirmed after order or enquiry.</p>
          {storeSettings.shipping_free_enabled && (
            <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-ok">
              <Truck className="size-3.5" />
              Free shipping on orders above ₹{storeSettings.shipping_free_threshold_inr?.toLocaleString('en-IN') ?? '50,000'}
            </p>
          )}

          <div className="mt-6 space-y-5 border-t border-line pt-6">
            {/* LED FABRIC SIGNAGE: Dedicated 3D Configurator Controls */}
            {isLedFabric && (
              <div className="space-y-4">
                {/* 1. Custom Dimensions (Width x Height, Unit) */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-2">1. Custom Dimensions</p>
                      <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <Ruler className="size-4 text-brand" />
                        Enter Width & Height
                      </h3>
                    </div>
                    {/* Unit Selector */}
                    <div className="inline-flex rounded-lg border border-line bg-soft/75 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (fabricUnit !== 'ft') {
                            setFabricUnit('ft')
                            setFabricWidth(Math.max(1, Math.round((fabricWidth / 12) * 10) / 10))
                            setFabricHeight(Math.max(1, Math.round((fabricHeight / 12) * 10) / 10))
                          }
                        }}
                        className={cx(
                          'rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer',
                          fabricUnit === 'ft' ? 'bg-white text-brand shadow-sm' : 'text-ink-2 hover:text-ink'
                        )}
                      >
                        Feet (ft)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (fabricUnit !== 'in') {
                            setFabricUnit('in')
                            setFabricWidth(Math.round(fabricWidth * 12))
                            setFabricHeight(Math.round(fabricHeight * 12))
                          }
                        }}
                        className={cx(
                          'rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer',
                          fabricUnit === 'in' ? 'bg-white text-brand shadow-sm' : 'text-ink-2 hover:text-ink'
                        )}
                      >
                        Inches (in)
                      </button>
                    </div>
                  </div>

                  {/* Inputs: Width & Height */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Width */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink flex items-center justify-between">
                        <span>Width</span>
                        <span className="text-[11px] font-normal text-ink-2">({fabricUnit})</span>
                      </label>
                      <div className="flex items-center rounded-lg border border-line bg-white shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                        <button
                          type="button"
                          onClick={() => setFabricWidth((w) => Math.max(fabricUnit === 'ft' ? 1 : 12, Math.round((w - (fabricUnit === 'ft' ? 0.5 : 6)) * 10) / 10))}
                          className="px-3 py-2 text-ink-2 hover:text-ink font-bold text-base transition select-none cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={fabricUnit === 'ft' ? 1 : 12}
                          max={fabricUnit === 'ft' ? 40 : 480}
                          step={fabricUnit === 'ft' ? 0.5 : 1}
                          value={fabricWidth}
                          onChange={(e) => setFabricWidth(Math.max(0.1, parseFloat(e.target.value) || 1))}
                          className="w-full text-center font-bold text-base text-ink outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFabricWidth((w) => Math.round((w + (fabricUnit === 'ft' ? 0.5 : 6)) * 10) / 10)}
                          className="px-3 py-2 text-ink-2 hover:text-ink font-bold text-base transition select-none cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Height */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink flex items-center justify-between">
                        <span>Height</span>
                        <span className="text-[11px] font-normal text-ink-2">({fabricUnit})</span>
                      </label>
                      <div className="flex items-center rounded-lg border border-line bg-white shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                        <button
                          type="button"
                          onClick={() => setFabricHeight((h) => Math.max(fabricUnit === 'ft' ? 1 : 12, Math.round((h - (fabricUnit === 'ft' ? 0.5 : 6)) * 10) / 10))}
                          className="px-3 py-2 text-ink-2 hover:text-ink font-bold text-base transition select-none cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={fabricUnit === 'ft' ? 1 : 12}
                          max={fabricUnit === 'ft' ? 40 : 480}
                          step={fabricUnit === 'ft' ? 0.5 : 1}
                          value={fabricHeight}
                          onChange={(e) => setFabricHeight(Math.max(0.1, parseFloat(e.target.value) || 1))}
                          className="w-full text-center font-bold text-base text-ink outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFabricHeight((h) => Math.round((h + (fabricUnit === 'ft' ? 0.5 : 6)) * 10) / 10)}
                          className="px-3 py-2 text-ink-2 hover:text-ink font-bold text-base transition select-none cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Popular Presets */}
                  <div>
                    <p className="text-[11px] font-semibold text-ink-2 mb-1.5">Standard Size Presets:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { w: 3, h: 2, label: '3 × 2 ft' },
                        { w: 4, h: 3, label: '4 × 3 ft' },
                        { w: 5, h: 3, label: '5 × 3 ft' },
                        { w: 6, h: 4, label: '6 × 4 ft' },
                        { w: 8, h: 5, label: '8 × 5 ft' },
                        { w: 10, h: 6, label: '10 × 6 ft' },
                      ].map((preset) => {
                        const targetW = fabricUnit === 'ft' ? preset.w : preset.w * 12
                        const targetH = fabricUnit === 'ft' ? preset.h : preset.h * 12
                        const isMatch = fabricWidth === targetW && fabricHeight === targetH
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setFabricWidth(targetW)
                              setFabricHeight(targetH)
                            }}
                            className={cx(
                              'rounded-md px-2.5 py-1 text-xs font-semibold transition border cursor-pointer',
                              isMatch
                                ? 'border-brand bg-brand-soft text-brand font-bold ring-1 ring-brand/30'
                                : 'border-line bg-white hover:border-ink-2 text-ink'
                            )}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Display Area Summary */}
                  <div className="flex items-center justify-between rounded-lg bg-soft/60 px-3 py-2 text-xs">
                    <span className="text-ink-2">Total Display Surface Area:</span>
                    <span className="font-bold text-ink">
                      {fabricSqFt.toFixed(2)} sq.ft <span className="font-normal text-ink-2">({fabricSqIn.toLocaleString('en-IN')} sq.in)</span>
                    </span>
                  </div>
                </div>

                {/* 2. Board Thickness (Admin Determined - User Selectable) */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-2">2. Frame Thickness</p>
                      <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <Layers className="size-4 text-brand" />
                        Select Board Depth (60 mm, 80 mm, 100 mm)
                      </h3>
                    </div>
                    <span className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                      Admin Determined
                    </span>
                  </div>
                  <p className="text-xs text-ink-2">
                    Admin specifies available board thicknesses. Select your preferred extrusion depth below:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {adminThicknessOptions.map((thk) => {
                      const isSelected = fabricThickness === thk
                      const is60 = thk.includes('60')
                      const is80 = thk.includes('80')
                      const is100 = thk.includes('100')
                      const subtext = is60
                        ? 'Slim Profile · Flush Wall Mount'
                        : is80
                        ? 'Standard Commercial · Balanced LED'
                        : is100
                        ? 'Heavy-Duty · Deep Mural Display'
                        : 'Architectural Frame'

                      return (
                        <button
                          key={thk}
                          type="button"
                          onClick={() => setFabricThickness(thk)}
                          aria-pressed={isSelected}
                          className={cx(
                            'group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer',
                            isSelected
                              ? 'border-brand bg-brand-soft/75 ring-2 ring-brand/50 shadow-sm text-ink'
                              : 'border-line hover:border-brand/40 bg-white hover:bg-soft/40 text-ink'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cx('text-base font-bold', isSelected ? 'text-brand' : 'text-ink')}>
                              {thk}
                            </span>
                            <span className={cx(
                              'flex size-5 items-center justify-center rounded-full border transition',
                              isSelected ? 'border-brand bg-brand text-white' : 'border-line bg-white group-hover:border-ink-2'
                            )}>
                              {isSelected && <Check className="size-3 stroke-[3]" />}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-ink-2 leading-tight">
                            {subtext}
                          </p>
                          <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand">
                            {is60 ? '₹650 / sq.ft' : is80 ? '₹700 / sq.ft' : is100 ? '₹750 / sq.ft' : 'Included'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Upload Artwork on 3D Model */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-2">3. Artwork & Print</p>
                      <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <Upload className="size-4 text-brand" />
                        Upload Image Placed on 3D Model
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                      3D Real-time Map
                    </span>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleArtworkUpload}
                    className="hidden"
                  />

                  {fabricUploadedImage ? (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50/50 p-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
                        <img src={fabricUploadedImage} alt="Artwork preview" className="size-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                          <Check className="size-3.5 text-emerald-600" />
                          <span>Placed on 3D Fabric Model</span>
                        </div>
                        <p className="truncate text-xs font-semibold text-ink mt-0.5">{fabricImageName || 'Uploaded Artwork'}</p>
                        <p className="text-[11px] text-ink-2">Silicone Edge Graphic (SEG) Tension Fabric</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold hover:border-ink transition shadow-xs cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleArtworkRemove}
                          className="flex items-center justify-center gap-1 text-[11px] font-semibold text-bad hover:underline cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const file = e.dataTransfer.files?.[0]
                        if (file && file.type.startsWith('image/')) {
                          const url = URL.createObjectURL(file)
                          setFabricUploadedImage(url)
                          setFabricImageName(file.name)
                          setMediaMode('3d')
                          toast(`Artwork placed onto 3D model!`, 'ok')
                        }
                      }}
                      className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line p-5 text-center transition hover:border-brand hover:bg-brand-soft/20 cursor-pointer"
                    >
                      <div className="grid size-10 place-items-center rounded-full bg-soft group-hover:bg-brand-soft group-hover:text-brand transition text-ink-2 mb-2">
                        <Upload className="size-5" />
                      </div>
                      <p className="text-xs font-bold text-ink">
                        Click to upload artwork or drag & drop here
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-2">
                        Supports high-res JPG, PNG, WebP · Placed directly onto the 3D model face
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand group-hover:underline">
                        Browse image file <ArrowRight className="size-3" />
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Frame Extrusion Color & Backlight Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2">
                    <label className="text-xs font-bold text-ink flex items-center justify-between">
                      <span>Extrusion Frame Finish</span>
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'silver', label: 'Silver', color: '#d1d5db' },
                        { id: 'black', label: 'Black', color: '#1f242d' },
                        { id: 'white', label: 'White', color: '#ffffff' },
                      ].map((clr) => (
                        <button
                          key={clr.id}
                          type="button"
                          onClick={() => setFabricFrameColor(clr.id as any)}
                          className={cx(
                            'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition cursor-pointer',
                            fabricFrameColor === clr.id
                              ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand/30'
                              : 'border-line bg-white hover:border-ink-2 text-ink'
                          )}
                        >
                          <span className="size-2.5 rounded-full border border-black/20" style={{ backgroundColor: clr.color }} />
                          {clr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2 flex flex-col justify-between">
                    <label className="text-xs font-bold text-ink flex items-center justify-between">
                      <span>Backlight Illumination</span>
                      <span className={cx('text-[11px] font-bold', fabricLedOn ? 'text-ok' : 'text-ink-2')}>
                        {fabricLedOn ? 'Active LED' : 'Off'}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFabricLedOn(!fabricLedOn)}
                      className={cx(
                        'flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs font-bold transition cursor-pointer',
                        fabricLedOn
                          ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                          : 'border-line bg-white text-ink-2 hover:border-ink'
                      )}
                    >
                      <Sun className={cx('size-4', fabricLedOn ? 'text-amber-500 fill-amber-400' : 'text-ink-2')} />
                      {fabricLedOn ? 'LED Backlight ON' : 'Turn LED Backlight OFF'}
                    </button>
                  </div>
                </div>

                {/* 5. Background Wall Scene Placement */}
                <div className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Background Wall Scene</span>
                    <span className="text-[11px] text-ink-2">Showcase placement</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFabricEnvironment('shop')}
                      className={cx(
                        'flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition cursor-pointer',
                        fabricEnvironment === 'shop'
                          ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand/30'
                          : 'border-line bg-white text-ink hover:border-ink-2'
                      )}
                    >
                      <Store className="size-3.5" />
                      Shop Board Wall
                    </button>
                    <button
                      type="button"
                      onClick={() => setFabricEnvironment('hall')}
                      className={cx(
                        'flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition cursor-pointer',
                        fabricEnvironment === 'hall'
                          ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand/30'
                          : 'border-line bg-white text-ink hover:border-ink-2'
                      )}
                    >
                      <Building2 className="size-3.5" />
                      Commercial Hall
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Products Size Selection */}
            {!isLedFabric && productSizes.length > 0 && (
              <Field
                label={`Select Size / Dimension${p.kind === 'standard' ? '' : ''}`}
                hint={
                  isUltraSlim
                    ? 'Amount updates immediately. Select your required size below:'
                    : isCardStand
                    ? 'Select product code & format. Standard tabletop acrylic card stand:'
                    : isLollipop
                    ? 'Select Lollipop Board outer diameter / dimension. The 3D model scales dynamically:'
                    : undefined
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {productSizes.map((s) => {
                    const vMatch = p.variants?.find((v) => {
                      const sLower = s.trim().toLowerCase().replace('×', 'x')
                      const vName = v.name.toLowerCase().replace('×', 'x')
                      const vSku = v.sku.toLowerCase()
                      if (isLollipop) {
                        const is24 = sLower.includes('24')
                        const shapeCode = lollipopShape === 'Round' ? 'rnd' : 'sqr'
                        const matchShape = vName.includes(lollipopShape.toLowerCase()) || vSku.includes(shapeCode)
                        const matchSize = is24 ? (vName.includes('24') || vSku.includes('24')) : (vName.includes('18') || vSku.includes('18'))
                        if (matchShape && matchSize) return true
                        if (matchSize) return true
                      }
                      if (vName === sLower || vSku === sLower || vName.startsWith(sLower)) return true
                      const m = vName.match(/\(([^)]+)\)/)
                      if (m && (m[1].toLowerCase().replace('×', 'x').trim() === sLower || sLower.includes(m[1].toLowerCase().trim()))) return true
                      if (isCardStand) {
                        if (sLower.includes('55') && (vSku.includes('6276') || vName.includes('6276'))) return true
                        if (sLower.includes('a7') && (vSku.includes('6277') || vName.includes('6277'))) return true
                        if (sLower.includes('a6') && (vSku.includes('6278') || vName.includes('6278'))) return true
                        if (sLower.includes('a5') && (vSku.includes('6279') || vName.includes('6279'))) return true
                        if (sLower.includes('a4') && (vSku.includes('6280') || vName.includes('6280'))) return true
                      }
                      return false
                    })

                    const meta = isUltraSlim
                      ? (ULTRA_SLIM_SIZE_META[s] || ULTRA_SLIM_SIZE_META[s.slice(0, 2)])
                      : isCardStand
                      ? (CARD_STAND_SIZE_META[s] || CARD_STAND_SIZE_META[s.replace('×', 'x')])
                      : isLollipop
                      ? LOLLIPOP_SIZE_META[s]
                      : null

                    const btnPrice = (vMatch?.price_delta_paise != null && p.price != null)
                      ? (p.price + Math.round(vMatch.price_delta_paise / 100))
                      : (meta ? meta.price : null)

                    const itemCode = (vMatch && /^DD-\d+/i.test(vMatch.sku))
                      ? vMatch.sku
                      : isLollipop && meta
                      ? `${(meta as any).skuPrefix}-${lollipopShape === 'Round' ? 'RND' : 'SQR'}`
                      : ((meta as any)?.code)

                    const dimText = meta?.dim || (vMatch?.name.includes('(') ? vMatch.name.match(/\(([^)]+)\)/)?.[1] : undefined)
                    const isSelected = size === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        aria-pressed={isSelected}
                        className={cx(
                          'group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 shadow-sm cursor-pointer',
                          isSelected
                            ? 'border-brand bg-brand-soft/75 ring-2 ring-brand/50 shadow-md text-ink'
                            : 'border-line hover:border-brand/40 bg-white hover:bg-soft/40 text-ink'
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className={cx('text-base font-bold', isSelected ? 'text-brand' : 'text-ink')}>{s}</span>
                          <span className={cx(
                            'flex size-5 items-center justify-center rounded-full border transition',
                            isSelected ? 'border-brand bg-brand text-white' : 'border-line bg-white group-hover:border-ink-2'
                          )}>
                            {isSelected && <Check className="size-3 stroke-[3]" />}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col">
                          {itemCode && (
                            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                              {itemCode}
                            </span>
                          )}
                          {dimText ? (
                            <span className="text-xs font-semibold text-ink-2">{dimText}</span>
                          ) : (
                            <span className="text-xs text-ink-2">Standard</span>
                          )}
                        </div>
                        {btnPrice != null && (
                          <div className="mt-2.5 flex items-baseline justify-between border-t border-line/60 pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-2">Amount</span>
                            <span className={cx('text-sm font-extrabold tabular-nums', isSelected ? 'text-brand' : 'text-ink')}>
                              ₹{btnPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}
            {p.kind === 'digital' && (
              <>
                <Field label="Touch"><Segmented value={touch as 'Touch'} onChange={setTouch} options={[{ value: 'Non-touch', label: 'Non-touch' }, { value: 'Touch', label: 'Touch' }]} /></Field>
                {mounts.length > 1 && <Field label="Stand / mounting"><Select value={mount || mounts[0]} onChange={(e) => setMount(e.target.value)}>{mounts.map((m) => <option key={m}>{m}</option>)}</Select></Field>}
                <Field label="Accessories" hint="Optional. Pricing confirmed at checkout or in your quote.">
                  <div className="flex flex-wrap gap-2">{accessories.map((a) => { const on = acc.includes(a); return <button key={a} aria-pressed={on} onClick={() => setAcc(on ? acc.filter((x) => x !== a) : [...acc, a])} className={cx('flex items-center gap-1.5 rounded-dd border px-3 py-2 text-sm font-medium transition', on ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line hover:border-ink')}>{on && <Check className="size-3.5" />}{a}</button> })}</div>
                </Field>
              </>
            )}
            {isUltraSlim && (
              <div className="space-y-4 rounded-2xl border border-line bg-soft/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles className="size-3.5 text-brand" />
                    Ultra Slim 3D Options
                  </div>
                  <Badge tone="brand">Interactive 3D</Badge>
                </div>

                {/* Orientation Selector */}
                <Field label="Orientation" hint="Choose Portrait or Landscape to rotate the 3D frame & swap dimensions:">
                  <Segmented
                    value={orient as 'Landscape' | 'Portrait'}
                    onChange={(val) => setOrient(val)}
                    options={[
                      { value: 'Portrait', label: 'Portrait (Vertical)' },
                      { value: 'Landscape', label: 'Landscape (Horizontal)' },
                    ]}
                  />
                </Field>

                {/* Frame Finish */}
                <Field label="Aluminum Frame Finish">
                  <Segmented
                    value={finish as 'Black'}
                    onChange={setFinish}
                    options={[
                      { value: 'Black', label: 'Matte Black' },
                      { value: 'Silver', label: 'Anodized Silver' },
                      { value: 'Gold', label: 'Champagne Gold' },
                    ]}
                  />
                </Field>

                {/* 3D Scene Selector */}
                <Field label="Environment Scene">
                  <Segmented
                    value={ultraSlimEnvironment}
                    onChange={(val) => setUltraSlimEnvironment(val as any)}
                    options={[
                      { value: 'counter', label: 'Reception Counter (Tabletop Stand)' },
                      { value: 'gallery', label: 'Gallery Wall (Wall Mount)' },
                    ]}
                  />
                </Field>

                {/* LED Backlight switch & Artwork Upload */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Sun className={cx('size-4 transition', ultraSlimLedOn ? 'text-amber-500 fill-amber-500' : 'text-ink-2')} />
                    <span className="text-xs font-bold text-ink">Edge-Lit LED Backlight</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ultraSlimLedOn}
                      onClick={() => setUltraSlimLedOn(!ultraSlimLedOn)}
                      className={cx(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        ultraSlimLedOn ? 'bg-brand' : 'bg-line'
                      )}
                    >
                      <span
                        className={cx(
                          'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                          ultraSlimLedOn ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  {/* Artwork Upload */}
                  <div>
                    <input
                      ref={ultraSlimFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setUltraSlimImageName(file.name)
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            setUltraSlimUploadedImage(ev.target?.result as string)
                            toast('Custom artwork applied to 3D Ultra Slim frame!', 'ok')
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    {ultraSlimUploadedImage ? (
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[130px] truncate text-xs text-ink-2" title={ultraSlimImageName}>
                          {ultraSlimImageName || 'Artwork loaded'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUltraSlimUploadedImage(null)
                            setUltraSlimImageName('')
                            if (ultraSlimFileInputRef.current) ultraSlimFileInputRef.current.value = ''
                            toast('Reverted to default poster graphic', 'ok')
                          }}
                          className="rounded p-1 text-ink-2 hover:bg-soft hover:text-bad transition cursor-pointer"
                          title="Remove custom graphic"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => ultraSlimFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand transition shadow-xs cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        Upload Artwork
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {isCardStand && (
              <div className="space-y-4 rounded-2xl border border-line bg-soft/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles className="size-3.5 text-brand" />
                    T-Shaped Card Stand 3D Options
                  </div>
                  <Badge tone="brand">Interactive 3D</Badge>
                </div>

                {/* Orientation Selector */}
                <Field label="Orientation" hint="Choose Portrait or Landscape to turn the 3D card stand:">
                  <Segmented
                    value={orient as 'Landscape' | 'Portrait'}
                    onChange={(val) => setOrient(val)}
                    options={[
                      { value: 'Portrait', label: 'Portrait (Vertical Stand)' },
                      { value: 'Landscape', label: 'Landscape (Horizontal Stand)' },
                    ]}
                  />
                </Field>

                {/* 3D Scene Selector */}
                <Field label="Environment Scene">
                  <Segmented
                    value={cardStandEnvironment}
                    onChange={(val) => setCardStandEnvironment(val as any)}
                    options={[
                      { value: 'shelf', label: 'Glass Shelf (Marble Fixture)' },
                      { value: 'counter', label: 'Reception Counter Desk' },
                    ]}
                  />
                </Field>

                {/* Insert Card Graphic Upload */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-ink">Insert Card Graphic</p>
                    <p className="text-[11px] text-ink-2">Standard product card or your custom graphic</p>
                  </div>

                  <div>
                    <input
                      ref={cardStandFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setCardStandImageName(file.name)
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            setCardStandUploadedImage(ev.target?.result as string)
                            toast('Custom graphic inserted into 3D acrylic card stand!', 'ok')
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    {cardStandUploadedImage ? (
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[130px] truncate text-xs text-ink-2" title={cardStandImageName}>
                          {cardStandImageName || 'Artwork loaded'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCardStandUploadedImage(null)
                            setCardStandImageName('')
                            if (cardStandFileInputRef.current) cardStandFileInputRef.current.value = ''
                            toast('Reverted to official size & model card graphic', 'ok')
                          }}
                          className="rounded p-1 text-ink-2 hover:bg-soft hover:text-bad transition cursor-pointer"
                          title="Remove custom graphic"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => cardStandFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand transition shadow-xs cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        Upload Custom Card
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {isRotatingLollipop && (
              <div className="space-y-4 rounded-2xl border border-line bg-soft/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles className="size-3.5 text-brand" />
                    LED Rotating Lollipop Board 3D Options
                  </div>
                  <Badge tone="brand">Motorized 360°</Badge>
                </div>

                {/* 1. Size & Model Overview */}
                <Field label="Configuration & Dimensions" hint="Standard 18 × 18 inch double-sided motorized rotating display:">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-brand bg-white p-3 text-left ring-2 ring-brand/30 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-brand">DD-RLPB-18</span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">360° Rotating</span>
                      </div>
                      <span className="text-sm font-bold text-ink block mt-1">18 × 18 in · Round Flag</span>
                      <span className="text-xs font-extrabold text-ink mt-0.5 block">₹5,500 (Complete Unit)</span>
                    </div>
                  </div>
                </Field>

                {/* 2. Environment Scene Selector */}
                <Field label="Environment Wall Scene">
                  <Segmented
                    value={rotatingEnvironment}
                    onChange={(val) => setRotatingEnvironment(val as any)}
                    options={[
                      { value: 'shop', label: 'Boutique Facade (Daylight)' },
                      { value: 'hall', label: 'Twilight Cafe (Atmospheric Glow)' },
                    ]}
                  />
                </Field>

                {/* 3. Motor Rotation & Dual-Sided LED Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-line/60">
                  {/* Motor Rotation Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-white shadow-2xs">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`size-4 text-brand ${rotatingMotorOn ? 'animate-spin' : 'text-ink-2'}`}
                        style={{ animationDuration: '3s' }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <div>
                        <span className="text-xs font-bold text-ink block">360° Motor Rotation</span>
                        <span className="text-[10px] text-ink-2 block">{rotatingMotorOn ? 'Continuous rotation active' : 'Motor paused'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rotatingMotorOn}
                      onClick={() => setRotatingMotorOn(!rotatingMotorOn)}
                      className={cx(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        rotatingMotorOn ? 'bg-brand' : 'bg-line'
                      )}
                    >
                      <span
                        className={cx(
                          'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                          rotatingMotorOn ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  {/* Dual-Sided LED Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-white shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Sun className={cx('size-4 transition', rotatingLedOn ? 'text-amber-500 fill-amber-500' : 'text-ink-2')} />
                      <div>
                        <span className="text-xs font-bold text-ink block">Dual-Sided LED Glow</span>
                        <span className="text-[10px] text-ink-2 block">{rotatingLedOn ? 'High-lumen backlit ON' : 'Illumination OFF'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rotatingLedOn}
                      onClick={() => setRotatingLedOn(!rotatingLedOn)}
                      className={cx(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        rotatingLedOn ? 'bg-brand' : 'bg-line'
                      )}
                    >
                      <span
                        className={cx(
                          'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                          rotatingLedOn ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* 4. Custom Design Upload */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/60">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-ink">Upload Your Design / Artwork</p>
                    <p className="text-[11px] text-ink-2">Applies immediately to both rotating circular faces</p>
                  </div>

                  <div>
                    <input
                      ref={rotatingFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setRotatingImageName(file.name)
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            setRotatingUploadedImage(ev.target?.result as string)
                            toast('Custom design mapped onto both sides of rotating lollipop!', 'ok')
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    {rotatingUploadedImage ? (
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[130px] truncate text-xs text-ink-2" title={rotatingImageName}>
                          {rotatingImageName || 'Artwork loaded'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRotatingUploadedImage(null)
                            setRotatingImageName('')
                            if (rotatingFileInputRef.current) rotatingFileInputRef.current.value = ''
                            toast('Reverted to default showcase branding', 'ok')
                          }}
                          className="rounded p-1 text-ink-2 hover:bg-soft hover:text-bad transition cursor-pointer"
                          title="Remove custom graphic"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => rotatingFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand transition shadow-xs cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        Upload Design
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {isLollipop && (
              <div className="space-y-4 rounded-2xl border border-line bg-soft/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles className="size-3.5 text-brand" />
                    LED Lollipop Board 3D Options
                  </div>
                  <Badge tone="brand">Interactive 3D</Badge>
                </div>

                {/* 1. Shape Selection: Round vs Square */}
                <Field label="Projection Lightbox Shape" hint="Select Round drum lightbox or Square lightbox with rounded corners:">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLollipopShape('Round')}
                      className={cx(
                        'flex items-center justify-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition cursor-pointer',
                        lollipopShape === 'Round'
                          ? 'border-brand bg-white text-brand ring-2 ring-brand/30 shadow-xs'
                          : 'border-line bg-white/70 text-ink hover:border-ink-2'
                      )}
                    >
                      <span className="size-4 rounded-full border-2 border-brand bg-brand/10 shrink-0" />
                      <span>Round Lollipop (Circular)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLollipopShape('Square')}
                      className={cx(
                        'flex items-center justify-center gap-2.5 rounded-xl border p-3 text-xs font-bold transition cursor-pointer',
                        lollipopShape === 'Square'
                          ? 'border-brand bg-white text-brand ring-2 ring-brand/30 shadow-xs'
                          : 'border-line bg-white/70 text-ink hover:border-ink-2'
                      )}
                    >
                      <span className="size-4 rounded-md border-2 border-brand bg-brand/10 shrink-0" />
                      <span>Square (Rounded Corners)</span>
                    </button>
                  </div>
                </Field>

                {/* 2. Environment Scene Selector */}
                <Field label="Environment Wall Scene">
                  <Segmented
                    value={lollipopEnvironment}
                    onChange={(val) => setLollipopEnvironment(val as any)}
                    options={[
                      { value: 'shop', label: 'Boutique Facade (Daylight)' },
                      { value: 'hall', label: 'Twilight Cafe (Atmospheric Glow)' },
                    ]}
                  />
                </Field>

                {/* 3. Dual-Sided LED Glow Switch & Custom Artwork Upload */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line/60">
                  <div className="flex items-center gap-2">
                    <Sun className={cx('size-4 transition', lollipopLedOn ? 'text-amber-500 fill-amber-500' : 'text-ink-2')} />
                    <span className="text-xs font-bold text-ink">Dual-Sided LED Light</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={lollipopLedOn}
                      onClick={() => setLollipopLedOn(!lollipopLedOn)}
                      className={cx(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        lollipopLedOn ? 'bg-brand' : 'bg-line'
                      )}
                    >
                      <span
                        className={cx(
                          'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                          lollipopLedOn ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  {/* Artwork Upload */}
                  <div>
                    <input
                      ref={lollipopFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setLollipopImageName(file.name)
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            setLollipopUploadedImage(ev.target?.result as string)
                            toast('Custom design mapped onto both sides of 3D Lollipop Board!', 'ok')
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    {lollipopUploadedImage ? (
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[130px] truncate text-xs text-ink-2" title={lollipopImageName}>
                          {lollipopImageName || 'Artwork loaded'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLollipopUploadedImage(null)
                            setLollipopImageName('')
                            if (lollipopFileInputRef.current) lollipopFileInputRef.current.value = ''
                            toast('Reverted to default Display Delight logo', 'ok')
                          }}
                          className="rounded p-1 text-ink-2 hover:bg-soft hover:text-bad transition cursor-pointer"
                          title="Remove custom graphic"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => lollipopFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand transition shadow-xs cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        Upload Design
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {isCustomizable && !isUltraSlim && !isLedFabric && !isCardStand && !isLollipop && !isRotatingLollipop && (
              <>
                <Field label="Orientation"><Segmented value={orient as 'Landscape'} onChange={setOrient} options={[{ value: 'Landscape', label: 'Landscape' }, { value: 'Portrait', label: 'Portrait' }]} /></Field>
                <Field label="Frame finish"><Segmented value={finish as 'Standard'} onChange={setFinish} options={[{ value: 'Standard', label: 'Standard' }, { value: 'Black', label: 'Black' }, { value: 'Silver', label: 'Silver' }]} /></Field>
                <Notice tone="info" title="Custom artwork?">
                  <span>You can order directly with included HP print, or upload your artwork during checkout or enquiry.</span>
                </Notice>
              </>
            )}
            {/* Dynamic Variant Options configured in Admin */}
            {!isLedFabric && dynVariants.map((s) => {
              if (s.name.toLowerCase() === 'size' && productSizes.length > 0) return null
              if (s.name.toLowerCase() === 'orientation' && (isCustomizable || isUltraSlim || isCardStand || isLollipop || isRotatingLollipop)) return null
              if (s.name.toLowerCase() === 'shape' && (isLollipop || isRotatingLollipop)) return null
              const currentVal = selectedVariants[s.name] || (s.values && s.values[0]) || ''
              return (
                <Field key={s.id || s.name} label={s.name}>
                  {s.style === 'dropdown' ? (
                    <Select value={currentVal} onChange={(e) => setSelectedVariants((prev) => ({ ...prev, [s.name]: e.target.value }))}>
                      {s.values.map((v: string) => <option key={v} value={v}>{v}</option>)}
                    </Select>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {s.values.map((v: string) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSelectedVariants((prev) => ({ ...prev, [s.name]: v }))}
                          aria-pressed={currentVal === v}
                          className={cx('min-w-14 rounded-dd border px-3.5 py-2 text-sm font-semibold transition', currentVal === v ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line hover:border-ink')}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Qty value={qty} onChange={setQty} />
            {currentPrice != null ? (
              <Btn size="lg" className="flex-1 font-bold text-base shadow-sm" icon={<ShoppingCart className="size-5" />} onClick={add} disabled={p.stock === 0}>
                {p.stock === 0 ? 'Out of stock' : `Add to cart · ₹${((currentPrice ?? 0) * qty).toLocaleString('en-IN')}`}
              </Btn>
            ) : (
              <Btn size="lg" className="flex-1" icon={<MessageSquareQuote className="size-5" />} onClick={quote}>
                Request a quote
              </Btn>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="secondary" icon={<MessageSquareQuote className="size-4" />} onClick={quote}>
              Request a quote
            </Btn>
            {storeSettings.whatsapp_number && (
              <Btn
                variant="secondary"
                icon={<MessageCircle className="size-4 text-[#25a55a]" />}
                onClick={() => {
                  const waNum = storeSettings.whatsapp_number.replace(/\D/g, '')
                  const waSpec = isLedFabric
                    ? `${fabricWidth}×${fabricHeight} ${fabricUnit}, ${fabricThickness}`
                    : (size || 'Standard')
                  const waMsg = encodeURIComponent(`${storeSettings.whatsapp_message || 'Hi, I would like to know more about'} Product: ${p.name} (SKU: ${p.sku}, Specs: ${waSpec})`)
                }}
              >
                Ask on WhatsApp
              </Btn>
            )}
            <Btn variant="tertiary" icon={<Heart className={cx('size-4', w && 'fill-brand text-brand')} />} onClick={() => toggleWish(p.id)}>{w ? 'Saved' : 'Wishlist'}</Btn>
            <Btn variant="tertiary" icon={<GitCompareArrows className={cx('size-4', c && 'text-brand')} />} onClick={() => toggleCompare(p.id)}>{c ? 'In compare' : 'Compare'}</Btn>
          </div>

          <div className="mt-8">
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'specs', label: 'Specifications' },
              { value: 'features', label: 'Features' },
              { value: 'reviews', label: 'Reviews', badge: reviews.length },
              { value: 'about', label: 'Description' },
            ]} />
            <div className="pt-4">
              {tab === 'specs' && (
                <SpecTable specs={p.specs} />
              )}
              {tab === 'features' && <ul className="space-y-2.5">{p.features.map((f) => <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{f}</li>)}</ul>}
              {tab === 'about' && <p className="text-sm leading-relaxed text-ink-2">{p.description || p.blurb || 'Detailed product specifications are available in our catalogue. Contact us for more information.'}</p>}
              {tab === 'reviews' && (
                <div className="space-y-4">
                  {/* Rating summary */}
                  {reviews.length > 0 && (
                    <div className="rounded-xl border border-line bg-soft/50 p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-5xl font-bold text-ink">{avgRating.toFixed(1)}</p>
                          <StarRating value={Math.round(avgRating)} size="sm" />
                          <p className="mt-1 text-xs text-ink-2">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          {ratingCounts.map(({ n, count }) => (
                            <div key={n} className="flex items-center gap-2 text-xs">
                              <span className="w-2">{n}</span>
                              <Star className="size-3 star-filled" />
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                                <div className="h-full bg-amber-400 transition-all" style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }} />
                              </div>
                              <span className="w-4 text-ink-2">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Review list */}
                  {reviewsLoading ? (
                    <div className="space-y-3">{[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-3">{reviews.slice(0, 6).map((r) => <ReviewCard key={r.id} review={r} />)}</div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line p-8 text-center">
                      <Star className="mx-auto size-8 text-brand" />
                      <p className="mt-3 font-semibold">No reviews yet</p>
                      <p className="mt-1 text-sm text-ink-2">Be the first to review this product.</p>
                    </div>
                  )}
                  {/* Write review CTA */}
                  {!reviewDone && !showReviewForm && (
                    <Btn variant="secondary" onClick={() => setShowReviewForm(true)} icon={<Star className="size-4" />}>Write a review</Btn>
                  )}
                  {reviewDone && <Notice tone="ok" title="Thank you!">Your review has been submitted and is pending moderation.</Notice>}
                  {showReviewForm && (
                    <form onSubmit={handleReviewSubmit} className="rounded-xl border border-line bg-soft/50 p-5 space-y-4">
                      <h3 className="text-xl font-bold">Write your review</h3>
                      <Field label="Your rating" required>
                        <StarRating value={reviewRating} size="lg" onChange={setReviewRating} />
                      </Field>
                      <Field label="Your name" required>
                        <input value={reviewName} onChange={e => setReviewName(e.target.value)} className="w-full h-11 rounded-dd border border-line px-3.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none" placeholder="Full name" required />
                      </Field>
                      <Field label="Review title">
                        <input value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} className="w-full h-11 rounded-dd border border-line px-3.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none" placeholder="Summarize your experience" />
                      </Field>
                      <Field label="Your review" required>
                        <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={4} className="w-full rounded-dd border border-line px-3.5 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none" placeholder="Share your experience with this product..." required />
                      </Field>
                      <p className="text-xs text-ink-2">Reviews are subject to moderation and must comply with our review guidelines. Only genuine customers may submit verified reviews.</p>
                      <div className="flex gap-3">
                        <Btn type="submit" loading={reviewSubmitting}>Submit review</Btn>
                        <Btn type="button" variant="secondary" onClick={() => setShowReviewForm(false)}>Cancel</Btn>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="border-t border-line bg-soft py-12">
          <Container><h2 className="mb-5 text-2xl font-bold sm:text-3xl md:text-4xl">You may also like</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div></Container>
        </section>
      )}
      <Container className="py-8 sm:py-12"><h2 className="mb-5 text-2xl font-bold sm:text-3xl md:text-4xl">Frequently asked</h2><div className="max-w-3xl"><Accordion items={FAQS.slice(0, 5).map((f) => [f[0], f[1]] as const)} /></div></Container>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white p-3 shadow-pop lg:hidden">
        <div className="min-w-0 flex-1">
          <Price p={p} value={currentPrice} prefix="" />
          {isLedFabric ? (
            <span className="block text-[11px] text-ink-2 font-medium truncate">
              {fabricWidth}×{fabricHeight} {fabricUnit} · {fabricThickness}
            </span>
          ) : size ? (
            <span className="block text-[11px] text-ink-2 font-medium truncate">
              {size}
              {isUltraSlim && (ULTRA_SLIM_SIZE_META[size]?.dim || ULTRA_SLIM_SIZE_META[size.slice(0, 2)]?.dim)
                ? ` · ${ULTRA_SLIM_SIZE_META[size]?.dim || ULTRA_SLIM_SIZE_META[size.slice(0, 2)]?.dim}`
                : isCardStand && CARD_STAND_SIZE_META[size]?.code
                ? ` · ${CARD_STAND_SIZE_META[size].code}`
                : ''}
            </span>
          ) : null}
        </div>
        {currentPrice != null ? (
          <Btn onClick={add} icon={<ShoppingCart className="size-4" />} disabled={p.stock === 0} className="px-3.5 sm:px-5 shrink-0 text-xs sm:text-sm">
            {p.stock === 0 ? 'Out of stock' : (
              <span>Add to cart<span className="hidden xs:inline"> · ₹{((currentPrice ?? 0) * qty).toLocaleString('en-IN')}</span></span>
            )}
          </Btn>
        ) : (
          <Btn onClick={quote} className="shrink-0 text-xs sm:text-sm">Request quote</Btn>
        )}
      </div>
    </div>
  )
}
