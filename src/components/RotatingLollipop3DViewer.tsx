import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import lollipopStorefrontImg from '../assets/environments/lollipop_storefront.jpg'
import lollipopDuskImg from '../assets/environments/lollipop_dusk.jpg'

export interface RotatingLollipop3DViewerProps {
  size?: string // '18 x 18 in' | '18' | '24 x 24 in' | '24'
  ledOn?: boolean
  motorOn?: boolean
  rotationSpeed?: number // radians per second (~0.5 rad/s = ~4.8 RPM)
  environment?: 'shop' | 'hall'
  customShopImageUrl?: string | null
  customHallImageUrl?: string | null
  uploadedImageUrl?: string | null
  className?: string
}

interface RotatingConfig {
  code: string
  label: string
  inches: number
  scale: number
}

const SIZE_CONFIGS: Record<string, RotatingConfig> = {
  '18': { code: '18"', label: '18 × 18 in', inches: 18, scale: 0.88 },
  '18X18': { code: '18"', label: '18 × 18 in', inches: 18, scale: 0.88 },
  '18X18IN': { code: '18"', label: '18 × 18 in', inches: 18, scale: 0.88 },
  '24': { code: '24"', label: '24 × 24 in', inches: 24, scale: 1.16 },
  '24X24': { code: '24"', label: '24 × 24 in', inches: 24, scale: 1.16 },
  '24X24IN': { code: '24"', label: '24 × 24 in', inches: 24, scale: 1.16 },
}

function resolveRotatingConfig(sizeStr: string): RotatingConfig {
  const norm = (sizeStr || '').toUpperCase().replace(/[^0-9]/g, '')
  if (norm.includes('24')) return SIZE_CONFIGS['24']
  if (norm.includes('18')) return SIZE_CONFIGS['18']
  if ((sizeStr || '').includes('24')) return SIZE_CONFIGS['24']
  return SIZE_CONFIGS['18']
}

// Generate the authentic rotating lollipop display flag artwork texture matching reference image
function createDefaultRotatingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  // Milky opal translucent background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1024, 1024)

  const cx = 512
  const cy = 512

  // Outer dark border ring
  ctx.strokeStyle = '#18181b'
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.arc(cx, cy, 480, 0, Math.PI * 2)
  ctx.stroke()

  // Inner circular background with vibrant emerald/jade gradient (matching reference Photo)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 470, 0, Math.PI * 2)
  ctx.clip()

  const grad = ctx.createRadialGradient(cx, cy - 80, 50, cx, cy, 500)
  grad.addColorStop(0, '#22c55e')    // Vibrant green highlight
  grad.addColorStop(0.5, '#16a34a')  // Jade green
  grad.addColorStop(0.85, '#15803d') // Deep emerald
  grad.addColorStop(1, '#14532d')    // Dark forest edge
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 1024)

  // Top Dark Pill: "META BRANDING"
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  const pillW = 280, pillH = 68, pillX = cx - pillW / 2, pillY = 160, pillR = 34
  ctx.roundRect ? ctx.roundRect(pillX, pillY, pillW, pillH, pillR) : ctx.rect(pillX, pillY, pillW, pillH)
  ctx.fill()

  // Orange Meta emblem logo
  ctx.fillStyle = '#ea580c'
  ctx.beginPath()
  ctx.arc(pillX + 44, pillY + 34, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('M', pillX + 44, pillY + 35)

  // Brand text inside top pill
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 22px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('META', pillX + 76, pillY + 26)
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('BRANDING', pillX + 76, pillY + 47)

  // Middle Pill Banner (Yellow curved banner): "ROTATING ROUND LOLLIPOP DISPLAY FLAGE"
  const midW = 490, midH = 82, midX = cx - midW / 2, midY = 270, midR = 40
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(midX - 4, midY - 4, midW + 8, midH + 8, midR + 4) : ctx.rect(midX - 4, midY - 4, midW + 8, midH + 8)
  ctx.fill()

  const bannerGrad = ctx.createLinearGradient(midX, midY, midX, midY + midH)
  bannerGrad.addColorStop(0, '#fef08a')
  bannerGrad.addColorStop(1, '#eab308')
  ctx.fillStyle = bannerGrad
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(midX, midY, midW, midH, midR) : ctx.rect(midX, midY, midW, midH)
  ctx.fill()

  ctx.fillStyle = '#0f172a'
  ctx.font = '900 18px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ROTATING ROUND', cx, midY + 28)
  ctx.fillText('LOLLIPOP DISPLAY FLAGE', cx, midY + 48)
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#713f12'
  ctx.fillText('SIZE - 18 X 18 INCH', cx, midY + 68)

  // Dark horizontal bar: "www.metabranding.in"
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
  ctx.fillRect(80, 410, 864, 46)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 24px "Segoe UI", monospace, sans-serif'
  ctx.fillText('www.metabranding.in', cx, 440)

  // Large bold headlines: "PREMIUM SELECTION"
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 44px "Segoe UI", Arial, sans-serif'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 8
  ctx.fillText('PREMIUM', cx, 520)
  ctx.fillText('SELECTION', cx, 575)
  ctx.shadowBlur = 0

  // White curved crest at bottom
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(80, 800)
  ctx.quadraticCurveTo(cx, 630, 944, 800)
  ctx.lineTo(944, 1024)
  ctx.lineTo(80, 1024)
  ctx.closePath()
  ctx.fill()

  // Subtitle inside white crest: "FOR EVERY BUSINESS"
  ctx.fillStyle = '#14532d'
  ctx.font = '900 30px "Times New Roman", Georgia, serif'
  ctx.fillText('FOR EVERY', cx, 715)
  ctx.fillText('BUSINESS', cx, 755)

  // Bottom footer text
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif'
  ctx.fillText('Visit Our Website : www.metabranding.in', cx, 830)

  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Generate customer uploaded design circular texture
function createUploadedTexture(img: HTMLImageElement): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1024, 1024)

  const cx = 512
  const cy = 512

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 470, 0, Math.PI * 2)
  ctx.clip()

  // Draw customer image centered with cover aspect ratio
  const aspect = img.width / img.height
  let dw = 940
  let dh = 940
  if (aspect > 1) {
    dw = 940 * aspect
  } else {
    dh = 940 / aspect
  }
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)

  // Subtle circular inner border
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(cx, cy, 470, 0, Math.PI * 2)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default function RotatingLollipop3DViewer({
  size = '18 × 18 in',
  ledOn = true,
  motorOn = true,
  rotationSpeed = 0.52, // ~5 RPM
  environment = 'shop',
  customShopImageUrl,
  customHallImageUrl,
  uploadedImageUrl,
  className = '',
}: RotatingLollipop3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const isShop = environment === 'shop'

  // Local motor toggle state
  const [isMotorActive, setIsMotorActive] = useState<boolean>(motorOn)
  const motorActiveRef = useRef<boolean>(motorOn)
  useEffect(() => {
    motorActiveRef.current = isMotorActive
  }, [isMotorActive])
  useEffect(() => {
    setIsMotorActive(motorOn)
  }, [motorOn])

  // Mouse interaction state refs
  const isDragging = useRef<boolean>(false)
  const prevMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const rotTarget = useRef<{ x: number; y: number }>({ x: 0.05, y: -0.35 })
  const rotCurrent = useRef<{ x: number; y: number }>({ x: 0.05, y: -0.35 })
  const zoomTarget = useRef<number>(3.8)
  const zoomCurrent = useRef<number>(3.8)

  const rotatingGroupRef = useRef<THREE.Group | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const customTextureRef = useRef<THREE.CanvasTexture | null>(null)

  // Load customer uploaded image if present
  useEffect(() => {
    if (!uploadedImageUrl) {
      if (customTextureRef.current) {
        customTextureRef.current.dispose()
        customTextureRef.current = null
      }
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (customTextureRef.current) customTextureRef.current.dispose()
      customTextureRef.current = createUploadedTexture(img)
    }
    img.src = uploadedImageUrl
  }, [uploadedImageUrl])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 600
    const height = container.clientHeight || 450

    // 1. Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0, zoomTarget.current)
    cameraRef.current = camera

    // 3. Renderer with transparent background to display exterior environment
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, isShop ? 1.4 : 0.9)
    scene.add(ambientLight)

    const mainSun = new THREE.DirectionalLight(0xffffff, isShop ? 2.2 : 1.3)
    mainSun.position.set(4, 5, 4)
    mainSun.castShadow = true
    mainSun.shadow.mapSize.width = 1024
    mainSun.shadow.mapSize.height = 1024
    scene.add(mainSun)

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.2)
    rimLight.position.set(-4, -1, -3)
    scene.add(rimLight)

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.8)
    fillLight.position.set(1, -3, 3)
    scene.add(fillLight)

    // 5. Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x141416, // Matte black powder-coat (matching reference Photo)
      metalness: 0.82,
      roughness: 0.32,
    })

    const boltMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.25,
    })

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15,
    })

    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.05,
      emissive: ledOn ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: ledOn ? 0.38 : 0.0,
    })

    // Resolve scaling config based on size
    const config = resolveRotatingConfig(size)
    const discRadius = 0.98 * config.scale

    // 6. Master Model Group
    const modelGroup = new THREE.Group()
    scene.add(modelGroup)

    // ── Stationed Wall Mounting & C-Bracket Group (DOES NOT ROTATE) ──
    const bracketGroup = new THREE.Group()
    modelGroup.add(bracketGroup)

    // Left wall anchor position
    const wallX = -2.25
    const cBracketSpineX = -0.92

    // A. Wall Mounting Plate
    const wallPlateGeo = new THREE.BoxGeometry(0.12, 0.95, 0.36)
    const wallPlate = new THREE.Mesh(wallPlateGeo, metalMat)
    wallPlate.position.set(wallX + 0.06, 0, 0)
    wallPlate.castShadow = true
    wallPlate.receiveShadow = true
    bracketGroup.add(wallPlate)

    // 4 Hex Anchor Bolts on Wall Plate
    const boltGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.04, 6)
    const boltPositions = [
      [wallX + 0.125, 0.36, 0.12],
      [wallX + 0.125, -0.36, 0.12],
      [wallX + 0.125, 0.36, -0.12],
      [wallX + 0.125, -0.36, -0.12],
    ]
    boltPositions.forEach(([bx, by, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, boltMat)
      bolt.position.set(bx, by, bz)
      bolt.rotation.z = Math.PI / 2
      bracketGroup.add(bolt)
    })

    // B. Horizontal Standoff Bar (Wall plate -> C-bracket spine)
    const standoffLength = cBracketSpineX - (wallX + 0.12)
    const standoffBarGeo = new THREE.BoxGeometry(standoffLength, 0.09, 0.09)
    const standoffBar = new THREE.Mesh(standoffBarGeo, metalMat)
    standoffBar.position.set((wallX + 0.12 + cBracketSpineX) / 2, 0, 0)
    standoffBar.castShadow = true
    bracketGroup.add(standoffBar)

    // Reinforcing collar / gusset ring at spine junction
    const collarGeo = new THREE.BoxGeometry(0.12, 0.14, 0.14)
    const collar = new THREE.Mesh(collarGeo, metalMat)
    collar.position.set(cBracketSpineX, 0, 0)
    bracketGroup.add(collar)

    // C. C-Shaped Bracket / Yoke (Top arm, vertical spine, bottom arm)
    // Heights calculated dynamically based on disc radius
    const armY = discRadius + 0.26
    const armXEnd = 0.0 // Aligned with the center of rotation

    // 1. Vertical Spine
    const spineHeight = armY * 2
    const spineGeo = new THREE.BoxGeometry(0.08, spineHeight, 0.08)
    const spine = new THREE.Mesh(spineGeo, metalMat)
    spine.position.set(cBracketSpineX, 0, 0)
    spine.castShadow = true
    bracketGroup.add(spine)

    // 2. Top Horizontal Arm (Curves/extends from spine to top pivot)
    const topArmLen = armXEnd - cBracketSpineX
    const topArmGeo = new THREE.BoxGeometry(topArmLen, 0.08, 0.08)
    const topArm = new THREE.Mesh(topArmGeo, metalMat)
    topArm.position.set(cBracketSpineX + topArmLen / 2, armY, 0)
    topArm.castShadow = true
    bracketGroup.add(topArm)

    // Top outer corner curve block
    const topCornerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16)
    const topCorner = new THREE.Mesh(topCornerGeo, metalMat)
    topCorner.position.set(cBracketSpineX, armY, 0)
    topCorner.rotation.x = Math.PI / 2
    bracketGroup.add(topCorner)

    // 3. Bottom Horizontal Arm (Curves/extends from spine to bottom pivot)
    const bottomArmGeo = new THREE.BoxGeometry(topArmLen, 0.08, 0.08)
    const bottomArm = new THREE.Mesh(bottomArmGeo, metalMat)
    bottomArm.position.set(cBracketSpineX + topArmLen / 2, -armY, 0)
    bottomArm.castShadow = true
    bracketGroup.add(bottomArm)

    // Bottom outer corner curve block
    const bottomCorner = new THREE.Mesh(topCornerGeo, metalMat)
    bottomCorner.position.set(cBracketSpineX, -armY, 0)
    bottomCorner.rotation.x = Math.PI / 2
    bracketGroup.add(bottomCorner)

    // D. Top Pivot Bearings & Lock Nut (matching reference Photo)
    // Top Bearing Housing
    const topBearingGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.06, 24)
    const topBearing = new THREE.Mesh(topBearingGeo, metalMat)
    topBearing.position.set(armXEnd, armY, 0)
    bracketGroup.add(topBearing)

    // Top Lock Nut & Stud Pin
    const topNutGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.05, 6)
    const topNut = new THREE.Mesh(topNutGeo, boltMat)
    topNut.position.set(armXEnd, armY + 0.05, 0)
    bracketGroup.add(topNut)

    const topPinGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.09, 16)
    const topPin = new THREE.Mesh(topPinGeo, chromeMat)
    topPin.position.set(armXEnd, armY + 0.07, 0)
    bracketGroup.add(topPin)

    // E. Bottom Pivot Bearings / Motor Housing & Lock Nut
    const botBearingGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24)
    const botBearing = new THREE.Mesh(botBearingGeo, metalMat)
    botBearing.position.set(armXEnd, -armY, 0)
    bracketGroup.add(botBearing)

    const botNut = new THREE.Mesh(topNutGeo, boltMat)
    botNut.position.set(armXEnd, -armY - 0.05, 0)
    bracketGroup.add(botNut)

    const botPin = new THREE.Mesh(topPinGeo, chromeMat)
    botPin.position.set(armXEnd, -armY - 0.07, 0)
    bracketGroup.add(botPin)

    // ── ROTATING LOLLIPOP DISC ASSEMBLY (CONTINUOUSLY ROTATES) ──
    const rotatingGroup = new THREE.Group()
    rotatingGroup.position.set(armXEnd, 0, 0)
    modelGroup.add(rotatingGroup)
    rotatingGroupRef.current = rotatingGroup

    // Top spindle extension on disc
    const spindleGeo = new THREE.CylinderGeometry(0.026, 0.026, armY - discRadius, 16)
    const topSpindle = new THREE.Mesh(spindleGeo, chromeMat)
    topSpindle.position.set(0, discRadius + (armY - discRadius) / 2, 0)
    rotatingGroup.add(topSpindle)

    // Bottom spindle extension on disc
    const botSpindle = new THREE.Mesh(spindleGeo, chromeMat)
    botSpindle.position.set(0, -discRadius - (armY - discRadius) / 2, 0)
    rotatingGroup.add(botSpindle)

    // Circular aluminum housing rim (Torus / Cylinder)
    const rimDepth = 0.22
    const discCylinderGeo = new THREE.CylinderGeometry(discRadius, discRadius, rimDepth, 64, 1, true)
    const discRim = new THREE.Mesh(discCylinderGeo, metalMat)
    discRim.rotation.x = Math.PI / 2
    discRim.castShadow = true
    rotatingGroup.add(discRim)

    // Outer decorative bezel rings front & back
    const bezelTorusGeo = new THREE.TorusGeometry(discRadius, 0.024, 16, 64)
    const frontBezel = new THREE.Mesh(bezelTorusGeo, metalMat)
    frontBezel.position.set(0, 0, rimDepth / 2)
    rotatingGroup.add(frontBezel)

    const backBezel = new THREE.Mesh(bezelTorusGeo, metalMat)
    backBezel.position.set(0, 0, -rimDepth / 2)
    rotatingGroup.add(backBezel)

    // Disc Artwork Faces (Front & Back)
    const artworkTexture = customTextureRef.current || createDefaultRotatingTexture()
    faceMat.map = artworkTexture
    faceMat.needsUpdate = true

    const innerRadius = discRadius - 0.02
    const faceGeo = new THREE.CircleGeometry(innerRadius, 64)

    // Front Face (z = +rimDepth/2)
    const frontFace = new THREE.Mesh(faceGeo, faceMat)
    frontFace.position.set(0, 0, rimDepth / 2 + 0.002)
    rotatingGroup.add(frontFace)

    // Back Face (z = -rimDepth/2, rotated 180° around Y)
    // Flip UV coordinates horizontally so typography is not mirrored backwards
    const backFaceGeo = faceGeo.clone()
    const uvAttr = backFaceGeo.attributes.uv
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setX(i, 1 - uvAttr.getX(i))
    }
    uvAttr.needsUpdate = true

    const backFace = new THREE.Mesh(backFaceGeo, faceMat)
    backFace.position.set(0, 0, -rimDepth / 2 - 0.002)
    backFace.rotation.y = Math.PI
    rotatingGroup.add(backFace)

    // Internal PointLight for true double-sided illumination
    const innerLight = new THREE.PointLight(0xffffff, ledOn ? 2.8 : 0.0, 3.5)
    innerLight.position.set(0, 0, 0)
    rotatingGroup.add(innerLight)

    // Front & Back subtle soft glow helpers
    const frontGlow = new THREE.PointLight(0xfef08a, ledOn ? 1.4 : 0.0, 1.8)
    frontGlow.position.set(0, 0, rimDepth / 2 + 0.08)
    rotatingGroup.add(frontGlow)

    const backGlow = new THREE.PointLight(0xfef08a, ledOn ? 1.4 : 0.0, 1.8)
    backGlow.position.set(0, 0, -rimDepth / 2 - 0.08)
    rotatingGroup.add(backGlow)

    // ── Animation Loop ──
    const clock = new THREE.Clock()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      const delta = clock.getDelta()

      // Continuous Slow Motorized Rotation
      if (motorActiveRef.current && rotatingGroupRef.current) {
        rotatingGroupRef.current.rotation.y += delta * rotationSpeed
      }

      // Smooth camera orbit damping
      rotCurrent.current.x += (rotTarget.current.x - rotCurrent.current.x) * 0.08
      rotCurrent.current.y += (rotTarget.current.y - rotCurrent.current.y) * 0.08
      zoomCurrent.current += (zoomTarget.current - zoomCurrent.current) * 0.08

      modelGroup.rotation.x = rotCurrent.current.x
      modelGroup.rotation.y = rotCurrent.current.y

      camera.position.z = zoomCurrent.current

      // Dynamically update light emissive based on ledOn
      faceMat.emissiveIntensity = ledOn ? 0.38 : 0.0
      innerLight.intensity = ledOn ? 2.8 : 0.0
      frontGlow.intensity = ledOn ? 1.4 : 0.0
      backGlow.intensity = ledOn ? 1.4 : 0.0

      // Update texture if custom upload changed
      if (customTextureRef.current && faceMat.map !== customTextureRef.current) {
        faceMat.map = customTextureRef.current
        faceMat.needsUpdate = true
      }

      renderer.render(scene, camera)
    }

    animate()

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      artworkTexture.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [size, ledOn, rotationSpeed, isShop])

  // Mouse & Wheel Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    prevMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - prevMouse.current.x
    const dy = e.clientY - prevMouse.current.y
    rotTarget.current.y += dx * 0.008
    rotTarget.current.x = Math.max(-0.5, Math.min(0.5, rotTarget.current.x + dy * 0.008))
    prevMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomTarget.current = Math.max(2.4, Math.min(5.5, zoomTarget.current + e.deltaY * 0.003))
  }

  const resetView = () => {
    rotTarget.current = { x: 0.05, y: -0.35 }
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
      {/* Photorealistic Storefront Exterior Wall Environment */}
      {bgImg && (
        <img
          src={bgImg}
          alt={isShop ? 'Storefront Facade' : 'Twilight Cafe Exterior'}
          className="absolute inset-0 size-full object-cover pointer-events-none transition duration-700 filter brightness-[0.98]"
        />
      )}

      {/* Atmospheric vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />

      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="relative z-10 size-full cursor-grab active:cursor-grabbing"
      />

      {/* Helper badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/90 pointer-events-none">
        <span className={`size-1.5 rounded-full ${isMotorActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
        360° Motorized Rotating Lollipop · Double-Sided
      </div>

      {/* Motor Toggle Action Button */}
      <button
        type="button"
        onClick={() => setIsMotorActive(!isMotorActive)}
        title={isMotorActive ? 'Pause Motor Rotation' : 'Start Motor Rotation'}
        className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white shadow-md transition cursor-pointer"
      >
        <svg
          className={`size-3.5 ${isMotorActive ? 'animate-spin' : ''}`}
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
        <span>{isMotorActive ? 'Motor: Rotating' : 'Motor: Paused'}</span>
      </button>

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
        Reset View
      </button>
    </div>
  )
}
