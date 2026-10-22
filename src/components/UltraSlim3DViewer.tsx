import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import counterDeskImg from '../assets/environments/counter_desk.jpg'
import galleryWallImg from '../assets/environments/gallery_wall.jpg'
import defaultPosterImg from '../assets/environments/ultra_slim_default_poster.jpg'

export interface UltraSlim3DViewerProps {
  size?: string // 'A5' | 'A4' | 'A3' | 'A2' | 'A1' | 'BO'
  orientation?: 'Portrait' | 'Landscape'
  frameColor?: 'black' | 'silver' | 'gold'
  ledOn?: boolean
  environment?: 'counter' | 'gallery'
  customCounterImageUrl?: string | null
  customGalleryImageUrl?: string | null
  uploadedImageUrl?: string | null
  className?: string
}

export interface UltraSlimSizeConfig {
  code: string
  label: string
  dimInches: string
  wInches: number
  hInches: number
  scale: number // Normalized visual 3D scale so physical size differences are clearly visible
}

export const ULTRA_SLIM_CONFIGS: Record<string, UltraSlimSizeConfig> = {
  'A5': { code: 'DD-USL-A5', label: 'A5', dimInches: '5.8" × 8.2"', wInches: 5.8, hInches: 8.2, scale: 0.74 },
  'A4': { code: 'DD-USL-A4', label: 'A4', dimInches: '8.2" × 11.6"', wInches: 8.2, hInches: 11.6, scale: 0.94 },
  'A3': { code: 'DD-USL-A3', label: 'A3', dimInches: '11.6" × 16.5"', wInches: 11.6, hInches: 16.5, scale: 1.18 },
  'A2': { code: 'DD-USL-A2', label: 'A2', dimInches: '16.5" × 23.3"', wInches: 16.5, hInches: 23.3, scale: 1.42 },
  'A1': { code: 'DD-USL-A1', label: 'A1', dimInches: '23.3" × 33.1"', wInches: 23.3, hInches: 33.1, scale: 1.68 },
  'BO': { code: 'DD-USL-BO', label: 'BO', dimInches: '48" × 24"', wInches: 48, hInches: 24, scale: 1.95 },
  'B0': { code: 'DD-USL-BO', label: 'BO', dimInches: '48" × 24"', wInches: 48, hInches: 24, scale: 1.95 },
}

export function resolveUltraSlimConfig(sizeStr: string): UltraSlimSizeConfig {
  const s = (sizeStr || '').toUpperCase().trim()
  if (s.includes('BO') || s.includes('B0') || s.includes('48')) return ULTRA_SLIM_CONFIGS['BO']
  if (s.includes('A1') || s.includes('33.1')) return ULTRA_SLIM_CONFIGS['A1']
  if (s.includes('A2') || s.includes('23.3')) return ULTRA_SLIM_CONFIGS['A2']
  if (s.includes('A3') || s.includes('16.5')) return ULTRA_SLIM_CONFIGS['A3']
  if (s.includes('A5') || s.includes('5.8')) return ULTRA_SLIM_CONFIGS['A5']
  if (s.includes('A4') || s.includes('11.6') || s.includes('8.2')) return ULTRA_SLIM_CONFIGS['A4']
  return ULTRA_SLIM_CONFIGS['A4']
}

export default function UltraSlim3DViewer({
  size = 'A4',
  orientation = 'Portrait',
  frameColor = 'black',
  ledOn = true,
  environment = 'counter',
  customCounterImageUrl,
  customGalleryImageUrl,
  uploadedImageUrl,
  className = '',
}: UltraSlim3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  const isCounter = environment === 'counter'
  const isLandscape = orientation === 'Landscape'
  const cfg = resolveUltraSlimConfig(size)

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const faceMeshRef = useRef<THREE.Mesh | null>(null)
  const reqAnimRef = useRef<number | null>(null)

  // Interaction / Drag state
  const isDraggingRef = useRef(false)
  const prevMousePos = useRef({ x: 0, y: 0 })
  // Ideal presentation angles:
  // Counter: slight backward tilt (tabletop display with support feet)
  // Gallery: squarely mounted on wall
  const defaultTiltX = isCounter ? -0.14 : 0.0
  const rotationTarget = useRef({ x: defaultTiltX, y: 0.0 })
  const zoomTarget = useRef(3.8)

  // Update placement position & rotation when switching environments
  useEffect(() => {
    if (environment === 'counter') {
      rotationTarget.current = { x: -0.14, y: 0.0 }
      if (groupRef.current) groupRef.current.position.set(0.0, -0.06, 0.0)
    } else {
      // Gallery wall mount
      rotationTarget.current = { x: 0.0, y: 0.0 }
      if (groupRef.current) groupRef.current.position.set(0.0, 0.08, 0.0)
    }
    zoomTarget.current = 3.8
  }, [environment])

  // 1. Initialize Three.js Scene, Camera, and Lighting
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 640
    const height = container.clientHeight || 480

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0, zoomTarget.current)
    cameraRef.current = camera

    // WebGL Renderer with sRGB encoding and antialiasing
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting Setup
    // A. Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
    scene.add(ambientLight)

    // B. Key Front Downlight (Studio Key)
    const keyLight = new THREE.DirectionalLight(0xfff7ea, 1.4)
    keyLight.position.set(2.5, 4.0, 3.5)
    scene.add(keyLight)

    // C. Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xedf2ff, 0.65)
    fillLight.position.set(-3.0, 2.0, 2.5)
    scene.add(fillLight)

    // D. Subtle Backlight / Rim
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35)
    rimLight.position.set(0, 3.0, -2.5)
    scene.add(rimLight)

    // Main Group holding all sign meshes
    const group = new THREE.Group()
    group.position.set(0, isCounter ? -0.06 : 0.08, 0)
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

    // Resize Observer
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

  // 2. Rebuild Geometry & Materials when size, orientation, frame color, or poster changes
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

    // Determine dimensions & dynamic visual scale from size & orientation
    const isBO = cfg.label === 'BO'

    // Real proportions (Inches)
    const rawW = isLandscape ? (isBO ? 48 : cfg.hInches) : (isBO ? 24 : cfg.wInches)
    const rawH = isLandscape ? (isBO ? 24 : cfg.wInches) : (isBO ? 48 : cfg.hInches)
    const aspect = rawW / rawH

    // Base height scaled dynamically by the size configuration:
    // A5: 0.95 * 0.74 = 0.70m (compact tabletop)
    // A4: 0.95 * 0.94 = 0.89m (standard desktop)
    // A3: 0.95 * 1.18 = 1.12m
    // A2: 0.95 * 1.42 = 1.35m
    // A1: 0.95 * 1.68 = 1.60m
    // BO: 0.95 * 1.95 = 1.85m (grand format display)
    const baseH = isCounter ? 0.96 : 0.94
    let meshH = baseH * cfg.scale * (isLandscape ? (isBO ? 0.64 : 0.82) : 1.0)
    let meshW = meshH * aspect

    // Position group so bottom of frame aligns properly with counter desk surface
    if (isCounter) {
      if (groupRef.current) {
        groupRef.current.position.set(0.0, -0.06 - (cfg.scale - 1.0) * 0.12, 0.0)
      }
    } else {
      if (groupRef.current) {
        groupRef.current.position.set(0.0, 0.05, 0.0)
      }
    }

    // Ultra Slim Profile: Real-world 9-12mm depth
    const meshD = 0.024 // Sleek ultra-thin profile

    // Color definitions
    const frameHex = frameColor === 'silver' ? 0xd1d5db : frameColor === 'gold' ? 0xd4af37 : 0x1a1a1a
    const frameRoughness = frameColor === 'silver' ? 0.28 : frameColor === 'gold' ? 0.32 : 0.45
    const frameMetalness = frameColor === 'black' ? 0.65 : 0.9

    const frameMat = new THREE.MeshStandardMaterial({
      color: frameHex,
      metalness: frameMetalness,
      roughness: frameRoughness,
    })

    // A. Main Ultra-Slim Aluminum Outer Frame
    const borderThickness = 0.038 // Narrow precision bezel
    const frameGeo = new THREE.BoxGeometry(meshW + borderThickness, meshH + borderThickness, meshD)
    const frameMesh = new THREE.Mesh(frameGeo, frameMat)
    frameMesh.castShadow = true
    frameMesh.receiveShadow = true
    group.add(frameMesh)

    // B. Inner Backing Plate
    const backGeo = new THREE.PlaneGeometry(meshW, meshH)
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.1,
    })
    const backMesh = new THREE.Mesh(backGeo, backMat)
    backMesh.position.z = -meshD * 0.5 - 0.001
    backMesh.rotation.y = Math.PI
    group.add(backMesh)

    // C. Backlit Poster Graphic Face (Edge-lit Light Guide Panel)
    const posterGeo = new THREE.PlaneGeometry(meshW, meshH)
    let posterTexture: THREE.Texture

    const activePosterUrl = uploadedImageUrl || defaultPosterImg
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    posterTexture = loader.load(activePosterUrl, () => {
      posterTexture.colorSpace = THREE.SRGBColorSpace
      posterTexture.needsUpdate = true
    })

    const posterMat = new THREE.MeshStandardMaterial({
      map: posterTexture,
      emissiveMap: ledOn ? posterTexture : null,
      emissive: ledOn ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: ledOn ? 0.48 : 0,
      roughness: 0.35,
      metalness: 0.05,
    })

    const posterMesh = new THREE.Mesh(posterGeo, posterMat)
    posterMesh.position.z = meshD * 0.5 + 0.002
    group.add(posterMesh)
    faceMeshRef.current = posterMesh

    // D. Front Clear Protective Acrylic Sheet (Gives glossy glass sheen and subtle reflections)
    const glassGeo = new THREE.PlaneGeometry(meshW, meshH)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.92,
      opacity: 0.3,
      transparent: true,
      roughness: 0.08,
      metalness: 0.1,
      reflectivity: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    })
    const glassMesh = new THREE.Mesh(glassGeo, glassMat)
    glassMesh.position.z = meshD * 0.5 + 0.004
    group.add(glassMesh)

    // E. Sleek Desktop Kickstand / Support Legs (As in reference image for counter scene)
    if (isCounter) {
      const legRadius = 0.008
      const legLength = Math.max(0.22, meshH * 0.28)
      const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legLength, 16)
      const legMat = new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        metalness: 0.95,
        roughness: 0.18,
      })

      // Left support foot
      const leftLeg = new THREE.Mesh(legGeo, legMat)
      leftLeg.position.set(-meshW * 0.42, -meshH * 0.44, -legLength * 0.36)
      leftLeg.rotation.x = Math.PI * 0.28
      leftLeg.castShadow = true
      group.add(leftLeg)

      // Right support foot
      const rightLeg = new THREE.Mesh(legGeo, legMat)
      rightLeg.position.set(meshW * 0.42, -meshH * 0.44, -legLength * 0.36)
      rightLeg.rotation.x = Math.PI * 0.28
      rightLeg.castShadow = true
      group.add(rightLeg)

      // Bottom Counter Contact Shadow
      const deskShadowGeo = new THREE.PlaneGeometry(meshW * 1.25, Math.max(0.32, meshH * 0.35))
      const deskCanvas = document.createElement('canvas')
      deskCanvas.width = 256
      deskCanvas.height = 128
      const dctx = deskCanvas.getContext('2d')!
      const dgrad = dctx.createRadialGradient(128, 64, 10, 128, 64, 110)
      dgrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)')
      dgrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.25)')
      dgrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      dctx.fillStyle = dgrad
      dctx.fillRect(0, 0, 256, 128)
      const deskShadowTex = new THREE.CanvasTexture(deskCanvas)
      const deskShadowMat = new THREE.MeshBasicMaterial({
        map: deskShadowTex,
        transparent: true,
        opacity: 0.75,
      })
      const deskShadowMesh = new THREE.Mesh(deskShadowGeo, deskShadowMat)
      deskShadowMesh.rotation.x = -Math.PI * 0.45
      deskShadowMesh.position.set(0, -meshH * 0.5 - 0.012, -0.04)
      group.add(deskShadowMesh)
    } else {
      // Wall Contact Shadow for Gallery Scene
      const wallShadowGeo = new THREE.PlaneGeometry(meshW * 1.18, meshH * 1.18)
      const wallCanvas = document.createElement('canvas')
      wallCanvas.width = 256
      wallCanvas.height = 256
      const wctx = wallCanvas.getContext('2d')!
      const wgrad = wctx.createRadialGradient(128, 128, 40, 128, 128, 128)
      wgrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
      wgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
      wgrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      wctx.fillStyle = wgrad
      wctx.fillRect(0, 0, 256, 256)
      const wallShadowTex = new THREE.CanvasTexture(wallCanvas)
      const wallShadowMat = new THREE.MeshBasicMaterial({
        map: wallShadowTex,
        transparent: true,
        opacity: 0.65,
      })
      const wallShadowMesh = new THREE.Mesh(wallShadowGeo, wallShadowMat)
      wallShadowMesh.position.z = -meshD * 0.5 - 0.02
      group.add(wallShadowMesh)
    }
  }, [size, orientation, frameColor, ledOn, environment, uploadedImageUrl])

  // Mouse / Touch Drag handlers for intuitive smooth 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    prevMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - prevMousePos.current.x
    const deltaY = e.clientY - prevMousePos.current.y
    prevMousePos.current = { x: e.clientX, y: e.clientY }

    rotationTarget.current.y += deltaX * 0.007
    rotationTarget.current.x += deltaY * 0.007

    // Clamp vertical tilt
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
    rotationTarget.current = { x: isCounter ? -0.14 : 0.0, y: 0.0 }
    zoomTarget.current = 3.8
  }

  // Active realistic background image
  const bgImg = isCounter
    ? (customCounterImageUrl || counterDeskImg)
    : (customGalleryImageUrl || galleryWallImg)

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
          alt={isCounter ? 'Reception Counter Scene' : 'Gallery Wall Scene'}
          className="absolute inset-0 size-full object-cover pointer-events-none transition duration-700 filter brightness-[0.98]"
        />
      )}

      {/* Subtle lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/10 pointer-events-none" />

      {/* Interactive Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="relative z-10 size-full cursor-grab active:cursor-grabbing"
      />

      {/* Discreet floating helper badge in top corner */}
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

      {/* Scene indicator tag */}
      <div className="absolute bottom-3 left-3 z-20 rounded-md bg-black/45 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white/90 pointer-events-none">
        {cfg.code} · {cfg.label} ({cfg.dimInches}) · {isCounter ? 'Counter Stand' : 'Gallery Wall'} · {orientation}
      </div>
    </div>
  )
}
