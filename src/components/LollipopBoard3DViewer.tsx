import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import lollipopStorefrontImg from '../assets/environments/lollipop_storefront.jpg'
import lollipopDuskImg from '../assets/environments/lollipop_dusk.jpg'

export interface LollipopBoard3DViewerProps {
  shape?: 'Round' | 'Square' | 'round' | 'square'
  size?: string // '18 x 18 in' | '24 x 24 in' | '18' | '24'
  ledOn?: boolean
  frameColor?: 'white' | 'black'
  environment?: 'shop' | 'hall'
  customShopImageUrl?: string | null
  customHallImageUrl?: string | null
  uploadedImageUrl?: string | null
  className?: string
}

interface LollipopConfig {
  code: string
  label: string
  inches: number
  scale: number // Dynamic visual scaling factor
}

const SIZE_CONFIGS: Record<string, LollipopConfig> = {
  '18': { code: '18"', label: '18 × 18 in', inches: 18, scale: 0.84 },
  '18X18': { code: '18"', label: '18 × 18 in', inches: 18, scale: 0.84 },
  '18X18IN': { code: '18"', label: '18 × 18 in', inches: 18, scale: 0.84 },
  '24': { code: '24"', label: '24 × 24 in', inches: 24, scale: 1.18 },
  '24X24': { code: '24"', label: '24 × 24 in', inches: 24, scale: 1.18 },
  '24X24IN': { code: '24"', label: '24 × 24 in', inches: 24, scale: 1.18 },
}

function resolveLollipopConfig(sizeStr: string): LollipopConfig {
  const norm = (sizeStr || '').toUpperCase().replace(/[^0-9]/g, '')
  if (norm.includes('24')) return SIZE_CONFIGS['24']
  if (norm.includes('18')) return SIZE_CONFIGS['18']
  if ((sizeStr || '').includes('24')) return SIZE_CONFIGS['24']
  return SIZE_CONFIGS['18']
}

// Cross-browser canvas rounded rectangle drawer
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }
}

// Safe Three.js 2D Shape generator with smooth rounded corners
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  const r = Math.min(radius, width / 2, height / 2)

  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r)
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)

  return shape
}

// Generate authentic storefront logo canvas texture when no custom artwork is uploaded
function createDefaultSignTexture(isSquare: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  // Milky opal translucent background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1024, 1024)

  const cx = 512
  const cy = 512

  // Decorative border
  if (isSquare) {
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 14
    ctx.beginPath()
    drawRoundRect(ctx, 90, 90, 844, 844, 90)
    ctx.stroke()

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 4
    ctx.beginPath()
    drawRoundRect(ctx, 114, 114, 796, 796, 70)
    ctx.stroke()
  } else {
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.arc(cx, cy, 410, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy, 388, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Central Emblem / Crest
  ctx.fillStyle = '#e84b1a' // DisplayDelight brand orange
  ctx.beginPath()
  ctx.arc(cx, cy - 110, 52, 0, Math.PI * 2)
  ctx.fill()

  // Inner icon (illuminated beacon)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy - 110, 22, 0, Math.PI * 2)
  ctx.fill()

  // Primary Typography
  ctx.fillStyle = '#0f172a'
  ctx.font = '900 64px "Outfit", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('DISPLAY DELIGHT', cx, cy + 20)

  // Subtitle / Store Tagline
  ctx.fillStyle = '#64748b'
  ctx.font = '600 28px "Inter", sans-serif'
  ctx.fillText('COFFEE & BAKEHOUSE', cx, cy + 90)

  // Est tag line with decorative rules
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 160, cy + 160)
  ctx.lineTo(cx - 50, cy + 160)
  ctx.moveTo(cx + 50, cy + 160)
  ctx.lineTo(cx + 160, cy + 160)
  ctx.stroke()

  ctx.fillStyle = '#e84b1a'
  ctx.font = 'bold 22px "Inter", sans-serif'
  ctx.fillText('EST. 2024', cx, cy + 160)

  // Bottom accent text
  ctx.fillStyle = '#94a3b8'
  ctx.font = '600 20px "Inter", sans-serif'
  ctx.fillText('AUTHENTIC HIGH-BRIGHTNESS LED', cx, cy + 240)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export default function LollipopBoard3DViewer({
  shape = 'Round',
  size = '18 x 18 in',
  ledOn = true,
  frameColor = 'white',
  environment = 'shop',
  customShopImageUrl,
  customHallImageUrl,
  uploadedImageUrl,
  className = '',
}: LollipopBoard3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  const isSquare = (shape || '').toLowerCase() === 'square'
  const isShop = environment === 'shop'
  const cfg = resolveLollipopConfig(size)

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const reqAnimRef = useRef<number | null>(null)

  // Interaction / Drag state
  const isDraggingRef = useRef(false)
  const prevMousePos = useRef({ x: 0, y: 0 })
  // Ideal projection sign angle: 3/4 perspective looking at projecting face and wall mount
  const rotationTarget = useRef({ x: 0.05, y: -0.42 })
  const zoomTarget = useRef(3.8)

  // Update placement position & rotation when switching environments
  useEffect(() => {
    if (environment === 'shop') {
      rotationTarget.current = { x: 0.05, y: -0.42 }
    } else {
      rotationTarget.current = { x: 0.04, y: -0.38 }
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

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
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

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    // Key directional light for crisp frame bevels & highlights
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45)
    keyLight.position.set(3.5, 4.0, 4.5)
    scene.add(keyLight)

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xf8fafc, 0.8)
    fillLight.position.set(-4.0, 2.0, 3.0)
    scene.add(fillLight)

    // Back rim light highlighting edges
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.1)
    rimLight.position.set(0.0, 3.5, -3.5)
    scene.add(rimLight)

    const group = new THREE.Group()
    group.position.set(0.18, 0.02, 0.0) // Positioned slightly right to connect with the wall facade on the left
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
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(w, h)
      }
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

  // 2. Build 3D Lollipop Board Geometry (Round or Square)
  useEffect(() => {
    if (!groupRef.current) return
    const group = groupRef.current

    // Clear previous children
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

    const currentCfg = resolveLollipopConfig(size)
    const currentIsSquare = (shape || '').toLowerCase() === 'square'

    // Dynamic Sizing:
    // 18 x 18 inch: scale = 0.84 -> radius/halfWidth ~ 0.52m
    // 24 x 24 inch: scale = 1.18 -> radius/halfWidth ~ 0.73m (visibly ~35% larger projection sign!)
    const baseRadius = 0.62 * currentCfg.scale
    const drumDepth = 0.16 * currentCfg.scale // Heavy-duty commercial double-sided depth

    // Powder-coated metal frame material (White as in reference image or Black)
    const isWhite = frameColor !== 'black'
    const frameHex = isWhite ? 0xf8fafc : 0x18181b
    const frameMat = new THREE.MeshStandardMaterial({
      color: frameHex,
      metalness: isWhite ? 0.25 : 0.75,
      roughness: isWhite ? 0.35 : 0.42,
    })

    const bracketMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xedeef2 : 0x27272a,
      metalness: isWhite ? 0.4 : 0.85,
      roughness: 0.28,
    })

    // Load active artwork texture
    let signTexture: THREE.Texture
    if (uploadedImageUrl) {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      signTexture = loader.load(uploadedImageUrl, () => {
        signTexture.colorSpace = THREE.SRGBColorSpace
        signTexture.needsUpdate = true
      })
    } else {
      signTexture = createDefaultSignTexture(currentIsSquare)
    }

    // Translucent Backlit Opal Acrylic Face Material (Emissive when LED is on)
    const acrylicFaceMat = new THREE.MeshStandardMaterial({
      map: signTexture,
      emissiveMap: ledOn ? signTexture : null,
      emissive: ledOn ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: ledOn ? 0.72 : 0,
      roughness: 0.32,
      metalness: 0.04,
    })

    // Glossy clear protective shield layer (gives realistic glass/acrylic reflection)
    const glossShieldMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.94,
      opacity: 0.24,
      transparent: true,
      roughness: 0.05,
      metalness: 0.05,
      reflectivity: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    })

    // ----------------------------------------------------
    // SHAPE 1: ROUND LOLLIPOP (Cylindrical Extrusion)
    // ----------------------------------------------------
    if (!currentIsSquare) {
      // A. Outer Aluminum Drum Casing
      const drumGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, drumDepth, 64, 1, true)
      const drumMesh = new THREE.Mesh(drumGeo, frameMat)
      drumMesh.rotation.x = Math.PI * 0.5 // Align cylinder axis along Z
      drumMesh.castShadow = true
      group.add(drumMesh)

      // Bezel Rings (Front & Back precision lip)
      const rimGeo = new THREE.TorusGeometry(baseRadius, 0.018 * currentCfg.scale, 16, 64)
      const frontRim = new THREE.Mesh(rimGeo, frameMat)
      frontRim.position.z = drumDepth * 0.5
      frontRim.castShadow = true
      group.add(frontRim)

      const backRim = new THREE.Mesh(rimGeo, frameMat)
      backRim.position.z = -drumDepth * 0.5
      backRim.castShadow = true
      group.add(backRim)

      // B. Front Illuminated Acrylic Face (+Z)
      const frontFaceGeo = new THREE.CircleGeometry(baseRadius - 0.006 * currentCfg.scale, 64)
      const frontFaceMesh = new THREE.Mesh(frontFaceGeo, acrylicFaceMat)
      frontFaceMesh.position.z = drumDepth * 0.5 + 0.002
      group.add(frontFaceMesh)

      const frontGlossMesh = new THREE.Mesh(frontFaceGeo, glossShieldMat)
      frontGlossMesh.position.z = drumDepth * 0.5 + 0.005
      group.add(frontGlossMesh)

      // C. Back Illuminated Acrylic Face (-Z) - Dual-sided sign!
      const backFaceGeo = new THREE.CircleGeometry(baseRadius - 0.006 * currentCfg.scale, 64)
      // Mirror UV coordinates horizontally so text is correctly readable from the back
      const bUvs = backFaceGeo.attributes.uv
      for (let i = 0; i < bUvs.count; i++) {
        bUvs.setX(i, 1 - bUvs.getX(i))
      }
      bUvs.needsUpdate = true

      const backFaceMesh = new THREE.Mesh(backFaceGeo, acrylicFaceMat)
      backFaceMesh.position.z = -drumDepth * 0.5 - 0.002
      backFaceMesh.rotation.y = Math.PI // Face outward towards -Z
      group.add(backFaceMesh)

      const backGlossMesh = new THREE.Mesh(backFaceGeo, glossShieldMat)
      backGlossMesh.position.z = -drumDepth * 0.5 - 0.005
      backGlossMesh.rotation.y = Math.PI
      group.add(backGlossMesh)

    } else {
      // ----------------------------------------------------
      // SHAPE 2: SQUARE LOLLIPOP (Rounded Rectangle / Squircle Extrusion)
      // ----------------------------------------------------
      const halfSize = baseRadius
      const cornerR = halfSize * 0.28 // Smooth corner radius matching Photo 2

      // Create rounded rectangle 2D shape using robust Three.js paths
      const sqShape = createRoundedRectShape(halfSize * 2, halfSize * 2, cornerR)

      // Extrude outer aluminum casing
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: drumDepth,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.016 * currentCfg.scale,
        bevelThickness: 0.016 * currentCfg.scale,
      }
      const squircleGeo = new THREE.ExtrudeGeometry(sqShape, extrudeSettings)
      squircleGeo.center()

      const squircleMesh = new THREE.Mesh(squircleGeo, frameMat)
      squircleMesh.castShadow = true
      group.add(squircleMesh)

      // Front & Back Faces (ShapeGeometry)
      const innerHalf = halfSize - 0.008 * currentCfg.scale
      const innerR = Math.max(0.02, cornerR - 0.008 * currentCfg.scale)
      const innerSqShape = createRoundedRectShape(innerHalf * 2, innerHalf * 2, innerR)

      // UV mapping generator for ShapeGeometry so textures map without distortion
      const frontFaceGeo = new THREE.ShapeGeometry(innerSqShape)
      const pos = frontFaceGeo.attributes.position
      const uvs = []
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        uvs.push((x + innerHalf) / (innerHalf * 2), (y + innerHalf) / (innerHalf * 2))
      }
      frontFaceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

      const frontFaceMesh = new THREE.Mesh(frontFaceGeo, acrylicFaceMat)
      frontFaceMesh.position.z = drumDepth * 0.5 + 0.016 * currentCfg.scale + 0.002
      group.add(frontFaceMesh)

      const frontGlossMesh = new THREE.Mesh(frontFaceGeo, glossShieldMat)
      frontGlossMesh.position.z = drumDepth * 0.5 + 0.016 * currentCfg.scale + 0.005
      group.add(frontGlossMesh)

      // Back Face (-Z)
      const backFaceGeo = frontFaceGeo.clone()
      const backUvs = backFaceGeo.attributes.uv
      for (let i = 0; i < backUvs.count; i++) {
        backUvs.setX(i, 1 - backUvs.getX(i))
      }
      backUvs.needsUpdate = true

      const backFaceMesh = new THREE.Mesh(backFaceGeo, acrylicFaceMat)
      backFaceMesh.position.z = -drumDepth * 0.5 - 0.016 * currentCfg.scale - 0.002
      backFaceMesh.rotation.y = Math.PI
      group.add(backFaceMesh)

      const backGlossMesh = new THREE.Mesh(backFaceGeo, glossShieldMat)
      backGlossMesh.position.z = -drumDepth * 0.5 - 0.016 * currentCfg.scale - 0.005
      backGlossMesh.rotation.y = Math.PI
      group.add(backGlossMesh)
    }

    // ----------------------------------------------------
    // CANTILEVER WALL MOUNTING BRACKET & ARM (Projecting from Wall)
    // ----------------------------------------------------
    // The bracket attaches to the left of the sign (-X) and connects to the wall plate
    const bracketArmLength = 0.28 * currentCfg.scale
    const bracketWidth = 0.045 * currentCfg.scale
    const bracketHeight = 0.08 * currentCfg.scale
    const signLeftX = -baseRadius

    // Horizontal support arm 1 (Top)
    const armGeo = new THREE.BoxGeometry(bracketArmLength, bracketHeight * 0.5, bracketWidth)
    const armTop = new THREE.Mesh(armGeo, bracketMat)
    armTop.position.set(signLeftX - bracketArmLength * 0.5, 0.12 * currentCfg.scale, 0)
    armTop.castShadow = true
    group.add(armTop)

    // Horizontal support arm 2 (Bottom)
    const armBottom = new THREE.Mesh(armGeo, bracketMat)
    armBottom.position.set(signLeftX - bracketArmLength * 0.5, -0.12 * currentCfg.scale, 0)
    armBottom.castShadow = true
    group.add(armBottom)

    // Center connecting rib / bridge between arms
    const bridgeGeo = new THREE.BoxGeometry(0.04 * currentCfg.scale, 0.28 * currentCfg.scale, bracketWidth)
    const bridgeMesh = new THREE.Mesh(bridgeGeo, bracketMat)
    bridgeMesh.position.set(signLeftX - bracketArmLength * 0.5, 0, 0)
    bridgeMesh.castShadow = true
    group.add(bridgeMesh)

    // Flange collar attaching to the sign body
    const collarGeo = new THREE.BoxGeometry(0.03 * currentCfg.scale, 0.36 * currentCfg.scale, drumDepth * 0.85)
    const collarMesh = new THREE.Mesh(collarGeo, bracketMat)
    collarMesh.position.set(signLeftX - 0.01 * currentCfg.scale, 0, 0)
    collarMesh.castShadow = true
    group.add(collarMesh)

    // Sturdy Rectangular Wall Base Plate (The plate that bolts to the wall)
    const plateWidth = 0.03 * currentCfg.scale
    const plateHeight = 0.44 * currentCfg.scale
    const plateDepth = 0.22 * currentCfg.scale
    const plateGeo = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth)
    const plateMesh = new THREE.Mesh(plateGeo, bracketMat)
    const wallX = signLeftX - bracketArmLength
    plateMesh.position.set(wallX - plateWidth * 0.5, 0, 0)
    plateMesh.castShadow = true
    group.add(plateMesh)

    // 4 Wall Anchor Bolts (Hex bolts on the wall plate)
    const boltGeo = new THREE.CylinderGeometry(0.009 * currentCfg.scale, 0.009 * currentCfg.scale, 0.012, 8)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })
    const boltOffsets = [
      [-plateHeight * 0.38, -plateDepth * 0.32],
      [-plateHeight * 0.38, plateDepth * 0.32],
      [plateHeight * 0.38, -plateDepth * 0.32],
      [plateHeight * 0.38, plateDepth * 0.32],
    ]
    boltOffsets.forEach(([by, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat)
      bolt.rotation.z = Math.PI * 0.5
      bolt.position.set(wallX - plateWidth - 0.004, by, bz)
      group.add(bolt)
    })

    // ----------------------------------------------------
    // REALISTIC WALL CAST SHADOW & AMBIENT LED HALO
    // ----------------------------------------------------
    const wallShadowGeo = new THREE.PlaneGeometry(baseRadius * 2.2, baseRadius * 2.2)
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = 256
    shadowCanvas.height = 256
    const sctx = shadowCanvas.getContext('2d')!
    const sgrad = sctx.createRadialGradient(128, 128, 20, 128, 128, 120)
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)')
    sgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)')
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    sctx.fillStyle = sgrad
    sctx.fillRect(0, 0, 256, 256)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.65,
    })
    const shadowMesh = new THREE.Mesh(wallShadowGeo, shadowMat)
    shadowMesh.rotation.y = Math.PI * 0.5
    shadowMesh.position.set(wallX - plateWidth - 0.008, 0, 0)
    group.add(shadowMesh)

    // Internal LED Bloom Light when illuminated
    if (ledOn) {
      const ledGlowLight = new THREE.PointLight(0xfff7ed, 1.8, 4.0)
      ledGlowLight.position.set(0, 0, 0)
      group.add(ledGlowLight)
    }

  }, [shape, size, ledOn, frameColor, uploadedImageUrl])

  // Mouse / Touch Drag handlers for 360 degree inspection
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
    rotationTarget.current.x = Math.max(-0.45, Math.min(0.45, rotationTarget.current.x))
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomTarget.current = Math.max(2.4, Math.min(5.2, zoomTarget.current + e.deltaY * 0.003))
  }

  const resetView = () => {
    rotationTarget.current = { x: 0.05, y: -0.42 }
    zoomTarget.current = 3.8
  }

  const bgImg = isShop
    ? (customShopImageUrl || lollipopStorefrontImg)
    : (customHallImageUrl || lollipopDuskImg)

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
      {/* Photorealistic Exterior Wall Environment */}
      {bgImg && (
        <img
          src={bgImg}
          alt={isShop ? 'Storefront Facade' : 'Twilight Cafe Exterior'}
          className="absolute inset-0 size-full object-cover pointer-events-none transition duration-700 filter brightness-[0.98]"
        />
      )}

      {/* Atmospheric lighting gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />

      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="relative z-10 size-full cursor-grab active:cursor-grabbing"
      />

      {/* Helper badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 pointer-events-none">
        <span className="size-1.5 rounded-full bg-brand animate-pulse" />
        Drag to rotate 360° · Double-Sided Lightbox
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

      {/* Active size & shape tag */}
      <div className="absolute bottom-3 left-3 z-20 rounded-md bg-black/45 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/90 pointer-events-none">
        {isSquare ? 'Square (Rounded Corners)' : 'Round Lollipop'} · {cfg.label} · {ledOn ? 'LED Illuminated' : 'Daylight Off'} · Double-Sided
      </div>
    </div>
  )
}
