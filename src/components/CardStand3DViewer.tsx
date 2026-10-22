import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import marbleShelfImg from '../assets/environments/marble_glass_shelf.jpg'
import counterDeskImg from '../assets/environments/counter_desk.jpg'

export interface CardStand3DViewerProps {
  size?: string // 'A4' | 'A5' | 'A6' | 'A7' | '55 × 90 mm' | 'DD-6280' etc.
  orientation?: 'Portrait' | 'Landscape'
  environment?: 'shelf' | 'counter'
  customShelfImageUrl?: string | null
  customCounterImageUrl?: string | null
  uploadedImageUrl?: string | null
  className?: string
}

// Physical real-world dimensions in millimeters & 3D display scales
interface SizeConfig {
  code: string
  label: string
  mmW: number
  mmH: number
  scaleH: number // Normalized 3D height scale so sizes visibly contrast
}

const SIZE_CONFIGS: Record<string, SizeConfig> = {
  'A4': { code: 'DD-6280', label: 'A4', mmW: 210, mmH: 297, scaleH: 1.35 },
  'DD-6280': { code: 'DD-6280', label: 'A4', mmW: 210, mmH: 297, scaleH: 1.35 },
  'A5': { code: 'DD-6279', label: 'A5', mmW: 148, mmH: 210, scaleH: 1.12 },
  'DD-6279': { code: 'DD-6279', label: 'A5', mmW: 148, mmH: 210, scaleH: 1.12 },
  'A6': { code: 'DD-6278', label: 'A6', mmW: 105, mmH: 148, scaleH: 0.94 },
  'DD-6278': { code: 'DD-6278', label: 'A6', mmW: 105, mmH: 148, scaleH: 0.94 },
  'A7': { code: 'DD-6277', label: 'A7', mmW: 74, mmH: 105, scaleH: 0.78 },
  'DD-6277': { code: 'DD-6277', label: 'A7', mmW: 74, mmH: 105, scaleH: 0.78 },
  '55 × 90 MM': { code: 'DD-6276', label: '55 × 90 mm', mmW: 55, mmH: 90, scaleH: 0.68 },
  '55 X 90 MM': { code: 'DD-6276', label: '55 × 90 mm', mmW: 55, mmH: 90, scaleH: 0.68 },
  'DD-6276': { code: 'DD-6276', label: '55 × 90 mm', mmW: 55, mmH: 90, scaleH: 0.68 },
}

function resolveSizeConfig(sizeStr: string): SizeConfig {
  const norm = sizeStr.toUpperCase().trim()
  if (norm.includes('6280') || norm.includes('A4')) return SIZE_CONFIGS['A4']
  if (norm.includes('6279') || norm.includes('A5')) return SIZE_CONFIGS['A5']
  if (norm.includes('6278') || norm.includes('A6')) return SIZE_CONFIGS['A6']
  if (norm.includes('6277') || norm.includes('A7')) return SIZE_CONFIGS['A7']
  if (norm.includes('6276') || norm.includes('55')) return SIZE_CONFIGS['DD-6276']
  return SIZE_CONFIGS['A4']
}

// Generate authentic Kejea-style reference card insert texture matching the user's photo
function createCardInsertTexture(cfg: SizeConfig, isLandscape: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const baseW = isLandscape ? 1024 : Math.round(1024 * (cfg.mmW / cfg.mmH))
  const baseH = isLandscape ? Math.round(1024 * (cfg.mmW / cfg.mmH)) : 1024
  canvas.width = Math.max(512, baseW)
  canvas.height = Math.max(512, baseH)

  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height

  // 1. Crisp white paper background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // Outer safety margin border
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 4
  ctx.strokeRect(16, 16, w - 32, h - 32)

  // 2. Header Brand Tag (KEJEA style yellow rounded box)
  const tagW = Math.min(w * 0.45, 260)
  const tagH = 52
  const tagX = 36
  const tagY = 36

  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.roundRect(tagX, tagY, tagW, tagH, 8)
  ctx.fill()
  ctx.strokeStyle = '#ca8a04'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#1e3a8a'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('DISPLAYDELIGHT', tagX + tagW * 0.5, tagY + tagH * 0.5)

  // 3. Product Title & Model Badge
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 26px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Integrated T-Shaped Card Stand', 36, tagY + tagH + 42)

  ctx.fillStyle = '#dc2626'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText(`Model: ${cfg.code}`, 36, tagY + tagH + 74)

  // Large Bold Size Label Box
  const sizeBoxW = 140
  const sizeBoxH = 75
  const sizeBoxX = w - sizeBoxW - 36
  const sizeBoxY = 36

  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.roundRect(sizeBoxX, sizeBoxY, sizeBoxW, sizeBoxH, 10)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(cfg.label, sizeBoxX + sizeBoxW * 0.5, sizeBoxY + 30)

  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText(`${cfg.mmW}×${cfg.mmH} mm`, sizeBoxX + sizeBoxW * 0.5, sizeBoxY + 56)

  // 4. Middle Diagram Section (Showing Portrait & Landscape Tabletop Usage)
  const midY = tagY + tagH + 95
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.roundRect(36, midY, w - 72, Math.max(60, h * 0.22), 8)
  ctx.fill()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#475569'
  ctx.font = 'bold 15px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Dual-Sided Transparent Acrylic Display · Flat Inverted T-Base', w * 0.5, midY + 32)
  ctx.font = '13px sans-serif'
  ctx.fillText('Easy Top / Side Slide-in · Stable Tabletop Stand', w * 0.5, midY + 54)

  // 5. Bottom Rich Dark Crimson/Burgundy Section (As in reference image)
  const bottomH = Math.max(140, h * 0.42)
  const bottomY = h - bottomH - 36

  const grad = ctx.createLinearGradient(0, bottomY, 0, h - 36)
  grad.addColorStop(0, '#7f1d1d')
  grad.addColorStop(0.5, '#5c1313')
  grad.addColorStop(1, '#3f0c0c')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(36, bottomY, w - 72, bottomH, 8)
  ctx.fill()

  // Bullet Points
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Ideal Applications & Uses:', 54, bottomY + 32)

  ctx.fillStyle = '#fecaca'
  ctx.font = '13px sans-serif'
  const bullets = [
    '• Company reception, meeting desk & office table card',
    '• QR Code UPI payment & hotel counter reservation sign',
    '• Shopping mall price indicator & restaurant menu card',
    '• Conference guest nameplate & exhibition showcase',
  ]
  bullets.forEach((b, idx) => {
    ctx.fillText(b, 54, bottomY + 60 + idx * 22)
  })

  // Barcode decoration at the bottom center of crimson box
  const barcodeY = bottomY + bottomH - 36
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(w * 0.5 - 90, barcodeY - 4, 180, 28)
  ctx.fillStyle = '#000000'
  for (let bx = -80; bx < 80; bx += 5) {
    const barW = (bx % 3 === 0) ? 3 : (bx % 4 === 0) ? 1.5 : 2.5
    ctx.fillRect(w * 0.5 + bx, barcodeY, barW, 20)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export default function CardStand3DViewer({
  size = 'A4',
  orientation = 'Portrait',
  environment = 'shelf',
  customShelfImageUrl,
  customCounterImageUrl,
  uploadedImageUrl,
  className = '',
}: CardStand3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  const isShelf = environment === 'shelf'
  const isLandscape = orientation === 'Landscape'

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const reqAnimRef = useRef<number | null>(null)

  // Drag interaction state
  const isDraggingRef = useRef(false)
  const prevMousePos = useRef({ x: 0, y: 0 })
  // Presentation angle: subtle 3D tilt highlighting both acrylic faces & T-base
  const rotationTarget = useRef({ x: 0.04, y: -0.22 })
  const zoomTarget = useRef(3.8)

  // Update placement position & rotation when switching environments
  useEffect(() => {
    if (environment === 'shelf') {
      rotationTarget.current = { x: 0.04, y: -0.22 }
      if (groupRef.current) groupRef.current.position.set(0.0, -0.05, 0.0)
    } else {
      // Counter desk
      rotationTarget.current = { x: 0.06, y: -0.26 }
      if (groupRef.current) groupRef.current.position.set(0.0, -0.08, 0.0)
    }
    zoomTarget.current = 3.8
  }, [environment])

  // 1. Initialize Scene, Camera, Lighting
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 640
    const height = container.clientHeight || 480

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0, zoomTarget.current)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting specifically tuned for Crystal Acrylic
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    // Key Light for crisp acrylic edge specular reflections
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
    keyLight.position.set(3.0, 4.5, 4.0)
    scene.add(keyLight)

    // Back rim light highlighting transparent edges & depth
    const backRim = new THREE.DirectionalLight(0xdbeafe, 1.2)
    backRim.position.set(-2.5, 3.0, -3.0)
    scene.add(backRim)

    // Soft fill
    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.7)
    fillLight.position.set(-3.5, 1.5, 2.5)
    scene.add(fillLight)

    const group = new THREE.Group()
    group.position.set(0, isShelf ? -0.05 : -0.08, 0)
    group.rotation.x = rotationTarget.current.x
    group.rotation.y = rotationTarget.current.y
    scene.add(group)
    groupRef.current = group

    // Animation Loop
    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate)

      if (groupRef.current) {
        groupRef.current.rotation.x += (rotationTarget.current.x - groupRef.current.rotation.x) * 0.1
        groupRef.current.rotation.y += (rotationTarget.current.y - groupRef.current.rotation.y) * 0.1
      }

      if (cameraRef.current) {
        cameraRef.current.position.z += (zoomTarget.current - cameraRef.current.position.z) * 0.1
      }

      renderer.render(scene, camera)
    }
    reqAnimRef.current = requestAnimationFrame(animate)

    const ro = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current)
      if (rendererRef.current?.domElement && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // 2. Rebuild 3D Acrylic T-Stand Geometry & Materials when size, orientation, or card changes
  useEffect(() => {
    if (!groupRef.current) return
    const group = groupRef.current

    // Clear previous meshes
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material?.dispose()
        }
      }
    }

    const cfg = resolveSizeConfig(size)
    const aspect = isLandscape ? (cfg.mmH / cfg.mmW) : (cfg.mmW / cfg.mmH)

    // Dynamic Size Scaling:
    // A4 (scaleH 1.35) -> Largest
    // A5 (scaleH 1.12)
    // A6 (scaleH 0.94)
    // A7 (scaleH 0.78)
    // 55x90mm (scaleH 0.68) -> Smallest
    let meshH = isLandscape ? (cfg.scaleH * 0.8) : cfg.scaleH
    let meshW = meshH * aspect

    // High quality crystal-clear transparent Acrylic Material
    const acrylicMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.94,
      opacity: 0.32,
      transparent: true,
      roughness: 0.04,
      metalness: 0.05,
      ior: 1.49, // Acrylic glass index of refraction
      reflectivity: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
    })

    // Subtly tinted edge material showing light trapped inside acrylic borders
    const acrylicEdgeMat = new THREE.MeshPhysicalMaterial({
      color: 0xdff8eb,
      transmission: 0.88,
      opacity: 0.5,
      transparent: true,
      roughness: 0.1,
      metalness: 0.08,
      ior: 1.49,
      clearcoat: 1.0,
    })

    const sheetThickness = 0.016 // Thin vertical acrylic sheets
    const paperSlotGap = 0.006

    // A. Front Acrylic Vertical Face Sheet
    const frontSheetGeo = new THREE.BoxGeometry(meshW, meshH, sheetThickness)
    const frontSheetMesh = new THREE.Mesh(frontSheetGeo, acrylicMat)
    frontSheetMesh.position.z = paperSlotGap * 0.5 + sheetThickness * 0.5
    frontSheetMesh.castShadow = true
    group.add(frontSheetMesh)

    // B. Back Acrylic Vertical Face Sheet
    const backSheetGeo = new THREE.BoxGeometry(meshW, meshH, sheetThickness)
    const backSheetMesh = new THREE.Mesh(backSheetGeo, acrylicMat)
    backSheetMesh.position.z = -paperSlotGap * 0.5 - sheetThickness * 0.5
    backSheetMesh.castShadow = true
    group.add(backSheetMesh)

    // C. The Inverted T-Shaped Acrylic Base (The iconic T-base)
    // Sturdy horizontal slab spanning full width with forward and backward wings
    const baseW = meshW + 0.06 // Extends slightly past vertical frame
    const baseDepth = Math.max(0.24, meshH * 0.28) // Deep enough for stability
    const baseThickness = 0.038 // Solid molded foot

    const baseGeo = new THREE.BoxGeometry(baseW, baseThickness, baseDepth)
    const baseMesh = new THREE.Mesh(baseGeo, acrylicEdgeMat)
    baseMesh.position.set(0, -meshH * 0.5 - baseThickness * 0.5, 0)
    baseMesh.castShadow = true
    baseMesh.receiveShadow = true
    group.add(baseMesh)

    // D. Paper Card Graphic Insert (Inside the acrylic slot)
    const cardGeo = new THREE.PlaneGeometry(meshW * 0.96, meshH * 0.96)
    let cardTexture: THREE.Texture

    if (uploadedImageUrl) {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      cardTexture = loader.load(uploadedImageUrl, () => {
        cardTexture.colorSpace = THREE.SRGBColorSpace
        cardTexture.needsUpdate = true
      })
    } else {
      cardTexture = createCardInsertTexture(cfg, isLandscape)
    }

    const cardMat = new THREE.MeshStandardMaterial({
      map: cardTexture,
      roughness: 0.55,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })

    const cardMesh = new THREE.Mesh(cardGeo, cardMat)
    cardMesh.position.z = 0
    group.add(cardMesh)

    // E. Realistic Shelf / Counter Surface Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(baseW * 1.25, baseDepth * 1.5)
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = 256
    shadowCanvas.height = 128
    const sctx = shadowCanvas.getContext('2d')!
    const sgrad = sctx.createRadialGradient(128, 64, 15, 128, 64, 115)
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    sgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    sctx.fillStyle = sgrad
    sctx.fillRect(0, 0, 256, 128)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.7,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = -Math.PI * 0.5
    shadowMesh.position.set(0, -meshH * 0.5 - baseThickness - 0.002, 0)
    group.add(shadowMesh)
  }, [size, orientation, environment, uploadedImageUrl])

  // Mouse / Touch Drag handlers for smooth 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    prevMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - prevMousePos.current.x
    const deltaY = e.clientY - prevMousePos.current.y
    prevMousePos.current = { x: e.clientX, y: e.clientY }

    rotationTarget.current.y += deltaX * 0.008
    rotationTarget.current.x += deltaY * 0.008
    rotationTarget.current.x = Math.max(-0.4, Math.min(0.4, rotationTarget.current.x))
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomTarget.current = Math.max(2.4, Math.min(5.2, zoomTarget.current + e.deltaY * 0.003))
  }

  const resetView = () => {
    rotationTarget.current = { x: 0.04, y: -0.22 }
    zoomTarget.current = 3.8
  }

  const bgImg = isShelf
    ? (customShelfImageUrl || marbleShelfImg)
    : (customCounterImageUrl || counterDeskImg)

  const cfg = resolveSizeConfig(size)

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl select-none shadow-xl border border-line ${className}`}
      style={{ minHeight: '440px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Photorealistic Environment Background */}
      {bgImg && (
        <img
          src={bgImg}
          alt={isShelf ? 'Marble Glass Shelf' : 'Reception Counter'}
          className="absolute inset-0 size-full object-cover pointer-events-none transition duration-700 filter brightness-[0.98]"
        />
      )}

      {/* Subtle lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/10 pointer-events-none" />

      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="relative z-10 size-full cursor-grab active:cursor-grabbing"
      />

      {/* Helper badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 pointer-events-none">
        <span className="size-1.5 rounded-full bg-brand animate-pulse" />
        Drag to rotate · Scroll to zoom
      </div>

      {/* Reset view floating action */}
      <button
        type="button"
        onClick={resetView}
        title="Reset 3D View"
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-lg bg-black/50 hover:bg-black/75 backdrop-blur-md px-2.5 py-1.5 text-xs font-medium text-white shadow-md transition cursor-pointer"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span>Reset</span>
      </button>

      {/* Active size tag */}
      <div className="absolute bottom-3 left-3 z-20 rounded-md bg-black/45 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/90 pointer-events-none">
        {cfg.code} · {cfg.label} ({cfg.mmW}×{cfg.mmH} mm) · {orientation}
      </div>
    </div>
  )
}
