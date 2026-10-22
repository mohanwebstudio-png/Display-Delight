import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import shopBoardImg from '../assets/environments/shop_board.jpg'
import hallWallImg from '../assets/environments/hall_wall.jpg'

export interface FabricSignage3DViewerProps {
  width: number // In current unit
  height: number // In current unit
  unit: 'ft' | 'in'
  thicknessMm: number // 60, 80, 100
  uploadedImageUrl?: string | null
  frameColor?: 'silver' | 'black' | 'white'
  ledOn?: boolean
  environment?: 'shop' | 'hall' | 'showroom' | 'dark'
  customShopImageUrl?: string | null
  customHallImageUrl?: string | null
  className?: string
}

export default function FabricSignage3DViewer({
  width = 4,
  height = 3,
  unit = 'ft',
  thicknessMm = 80,
  uploadedImageUrl,
  frameColor = 'silver',
  ledOn = true,
  environment = 'shop',
  customShopImageUrl,
  customHallImageUrl,
  className = '',
}: FabricSignage3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  const activeLed = ledOn
  const activeFrameColor = frameColor
  const isHall = environment === 'hall'
  const isDark = environment === 'dark'

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const fabricMeshRef = useRef<THREE.Mesh | null>(null)
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
  const frontLightRef = useRef<THREE.DirectionalLight | null>(null)
  const backlightRef = useRef<THREE.PointLight | null>(null)
  const reqAnimRef = useRef<number | null>(null)

  // Drag interaction state
  const isDraggingRef = useRef(false)
  const prevMousePos = useRef({ x: 0, y: 0 })
  // Ideal wall placement rotations matching the user's reference environments:
  // shop: straight-on flat front mount centered on the boutique column
  // hall: angled perspective matching the architectural wall
  const rotationTarget = useRef(isHall ? { x: 0.0, y: -0.17 } : isDark ? { x: 0.05, y: -0.25 } : { x: 0.0, y: 0.0 })
  const zoomTarget = useRef(3.8)

  // Update placement position & rotation when switching environments
  useEffect(() => {
    if (environment === 'hall') {
      rotationTarget.current = { x: 0.0, y: -0.17 }
      if (groupRef.current) groupRef.current.position.set(0.04, 0.07, 0)
    } else if (environment === 'dark') {
      rotationTarget.current = { x: 0.05, y: -0.25 }
      if (groupRef.current) groupRef.current.position.set(0.0, 0.0, 0)
    } else {
      // 'shop' / 'showroom' - squarely mounted on the boutique central wall
      rotationTarget.current = { x: 0.0, y: 0.0 }
      if (groupRef.current) groupRef.current.position.set(0.0, 0.13, 0)
    }
    zoomTarget.current = 3.8
  }, [environment])

  // Helper: generate high-res default fabric texture with backlight SEG graphic
  const createDefaultTexture = (wInches: number, hInches: number): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas')
    const aspect = Math.max(0.2, Math.min(5, wInches / (hInches || 1)))
    canvas.width = 1024
    canvas.height = Math.round(1024 / aspect)

    const ctx = canvas.getContext('2d')!
    
    // Rich gradient fabric background
    const grad = ctx.createRadialGradient(
      canvas.width * 0.5, canvas.height * 0.45, 60,
      canvas.width * 0.5, canvas.height * 0.45, canvas.width * 0.75
    )
    grad.addColorStop(0, '#2d1b4e')
    grad.addColorStop(0.5, '#16192e')
    grad.addColorStop(1, '#0c0e1a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Subtle fabric weave texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 12) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 12) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Glowing accent border
    ctx.save()
    ctx.shadowColor = '#e84b1a'
    ctx.shadowBlur = 40
    ctx.strokeStyle = '#e84b1a'
    ctx.lineWidth = 4
    const pad = 40
    ctx.strokeRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2)
    ctx.restore()

    // Brand typography
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText('DISPLAY DELIGHT', canvas.width / 2, canvas.height / 2 - 40)

    ctx.fillStyle = '#f97316'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('• BACKLIT LED FABRIC SIGNAGE •', canvas.width / 2, canvas.height / 2 + 10)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '18px sans-serif'
    ctx.fillText('Silicone Edge Graphic (SEG) • Tension Fabric Lightbox', canvas.width / 2, canvas.height / 2 + 50)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.font = '15px sans-serif'
    ctx.fillText('Upload your custom print image to preview on 3D wall display', canvas.width / 2, canvas.height / 2 + 95)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  // 1. Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const widthPx = container.clientWidth || 600
    const heightPx = container.clientHeight || 450

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera with standard architectural FOV
    const camera = new THREE.PerspectiveCamera(36, widthPx / heightPx, 0.1, 100)
    camera.position.set(0, 0, zoomTarget.current)
    cameraRef.current = camera

    // WebGL Renderer with alpha transparency so the wall photo shines through
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(widthPx, heightPx)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.domElement.style.backgroundColor = 'transparent'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, activeLed ? 0.95 : 0.7)
    scene.add(ambientLight)
    ambientLightRef.current = ambientLight

    // Ceiling spotlight matching the overhead track lights
    const ceilingSpot = new THREE.DirectionalLight(0xfff7ed, 1.8)
    ceilingSpot.position.set(0, 5, 4)
    ceilingSpot.castShadow = true
    scene.add(ceilingSpot)
    frontLightRef.current = ceilingSpot

    // Soft front fill light
    const frontFill = new THREE.DirectionalLight(0xffffff, 0.8)
    frontFill.position.set(2, 2, 5)
    scene.add(frontFill)

    // Warm internal LED backlight
    const backlight = new THREE.PointLight(0xffedd5, activeLed ? 2.5 : 0, 10)
    backlight.position.set(0, 0, 0)
    scene.add(backlight)
    backlightRef.current = backlight

    // Main 3D Sign Group positioned on the wall
    const group = new THREE.Group()
    const initialY = isHall ? 0.07 : isDark ? 0.0 : 0.13
    const initialX = isHall ? 0.04 : 0.0
    group.position.set(initialX, initialY, 0)
    group.rotation.x = rotationTarget.current.x
    group.rotation.y = rotationTarget.current.y
    scene.add(group)
    groupRef.current = group

    // Smooth Animation Loop
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

    // Resize Observer for responsive canvas sizing
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

  // 2. Rebuild Geometry & Materials when dimensions, thickness, artwork, or colors change
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

    // Convert dimensions to aspect ratio
    const safeW = Math.max(0.5, Number(width) || 4)
    const safeH = Math.max(0.5, Number(height) || 3)
    const aspect = safeW / safeH

    // Fit precisely on the architectural wall:
    // In shop: span between the wooden trims of the central beige pillar (width ~1.46)
    // In hall: mount on the white gallery wall below the track lights (width ~1.55)
    let meshW = isHall ? 1.55 : 1.46
    let meshH = meshW / aspect

    // Cap maximum height so it doesn't collide with floor or ceiling
    const maxWallHeight = 1.15
    if (meshH > maxWallHeight) {
      meshH = maxWallHeight
      meshW = maxWallHeight * aspect
    }

    // Physical extrusion depth in scene units (60mm, 80mm, 100mm)
    const depthScale = (Number(thicknessMm) || 80) / 80
    const meshD = 0.08 * depthScale

    // A. Extruded Aluminum Lightbox Frame
    const frameColorHex = activeFrameColor === 'black' ? 0x181c24 : activeFrameColor === 'white' ? 0xf8fafc : 0xd5d8de
    const frameRoughness = activeFrameColor === 'black' ? 0.38 : activeFrameColor === 'white' ? 0.25 : 0.22
    const frameMetalness = activeFrameColor === 'white' ? 0.2 : 0.9

    const frameMat = new THREE.MeshStandardMaterial({
      color: frameColorHex,
      metalness: frameMetalness,
      roughness: frameRoughness,
    })

    const frameGeo = new THREE.BoxGeometry(meshW + 0.035, meshH + 0.035, meshD)
    const frameMesh = new THREE.Mesh(frameGeo, frameMat)
    frameMesh.castShadow = true
    frameMesh.receiveShadow = true
    group.add(frameMesh)

    // B. Inner Backing Cavity
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.85,
      metalness: 0.1,
    })
    const backGeo = new THREE.PlaneGeometry(meshW, meshH)
    const backMesh = new THREE.Mesh(backGeo, backMat)
    backMesh.position.z = -meshD * 0.49
    backMesh.rotation.y = Math.PI
    group.add(backMesh)

    // C. Front Fabric Print Face (Silicone Edge Graphic)
    const fabricGeo = new THREE.PlaneGeometry(meshW, meshH)
    let fabricTexture: THREE.Texture

    if (uploadedImageUrl) {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      fabricTexture = loader.load(uploadedImageUrl, () => {
        fabricTexture.colorSpace = THREE.SRGBColorSpace
        fabricTexture.needsUpdate = true
      })
    } else {
      const wIn = unit === 'ft' ? safeW * 12 : safeW
      const hIn = unit === 'ft' ? safeH * 12 : safeH
      fabricTexture = createDefaultTexture(wIn, hIn)
    }

    const fabricMat = new THREE.MeshStandardMaterial({
      map: fabricTexture,
      emissiveMap: activeLed ? fabricTexture : null,
      emissive: activeLed ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: activeLed ? 0.4 : 0,
      roughness: 0.7,
      metalness: 0.04,
    })

    const fabricMesh = new THREE.Mesh(fabricGeo, fabricMat)
    fabricMesh.position.z = meshD * 0.5 + 0.002
    group.add(fabricMesh)
    fabricMeshRef.current = fabricMesh

    // D. SEG Silicone Bezel Inset Border
    const borderEdges = new THREE.EdgesGeometry(fabricGeo)
    const borderLine = new THREE.LineSegments(
      borderEdges,
      new THREE.LineBasicMaterial({ color: frameColorHex, linewidth: 2 })
    )
    borderLine.position.z = meshD * 0.5 + 0.004
    group.add(borderLine)

    // E. Realistic Wall Contact Shadow (Gives physical wall-mounted depth)
    const shadowGeo = new THREE.PlaneGeometry(meshW * 1.12, meshH * 1.12)
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = 256
    shadowCanvas.height = 256
    const sctx = shadowCanvas.getContext('2d')!
    const sgrad = sctx.createRadialGradient(128, 128, 50, 128, 128, 128)
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    sgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)')
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    sctx.fillStyle = sgrad
    sctx.fillRect(0, 0, 256, 256)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.position.z = -meshD * 0.5 - 0.015
    group.add(shadowMesh)

    // F. Realistic Backlit Wall Halo (Casts warm ambient light onto the wall when LED is ON)
    if (activeLed) {
      const glowGeo = new THREE.PlaneGeometry(meshW * 1.35, meshH * 1.35)
      const glowCanvas = document.createElement('canvas')
      glowCanvas.width = 256
      glowCanvas.height = 256
      const gctx = glowCanvas.getContext('2d')!
      const ggrad = gctx.createRadialGradient(128, 128, 40, 128, 128, 128)
      ggrad.addColorStop(0, 'rgba(255, 235, 205, 0.38)')
      ggrad.addColorStop(0.6, 'rgba(255, 220, 180, 0.12)')
      ggrad.addColorStop(1, 'rgba(255, 200, 150, 0)')
      gctx.fillStyle = ggrad
      gctx.fillRect(0, 0, 256, 256)
      const glowTexture = new THREE.CanvasTexture(glowCanvas)
      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const glowMesh = new THREE.Mesh(glowGeo, glowMat)
      glowMesh.position.z = -meshD * 0.5 - 0.02
      group.add(glowMesh)
    }
  }, [width, height, unit, thicknessMm, uploadedImageUrl, activeFrameColor, activeLed, environment])

  // 3. Update Lighting & Emission on LED toggle
  useEffect(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = activeLed ? 0.95 : 0.7
    }
    if (backlightRef.current) {
      backlightRef.current.intensity = activeLed ? 2.5 : 0
    }
    if (fabricMeshRef.current && fabricMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
      const mat = fabricMeshRef.current.material
      mat.emissive.set(activeLed ? 0xffffff : 0x000000)
      mat.emissiveIntensity = activeLed ? 0.4 : 0
      mat.emissiveMap = activeLed ? mat.map : null
      mat.needsUpdate = true
    }
  }, [activeLed])

  // Mouse / Touch Interaction Handlers for inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    prevMousePos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - prevMousePos.current.x
    const dy = e.clientY - prevMousePos.current.y
    prevMousePos.current = { x: e.clientX, y: e.clientY }

    rotationTarget.current.y += dx * 0.012
    rotationTarget.current.x = Math.max(-0.6, Math.min(0.6, rotationTarget.current.x + dy * 0.012))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomTarget.current = Math.max(2.4, Math.min(6.0, zoomTarget.current + e.deltaY * 0.003))
  }

  // Double click resets smoothly back to the preset wall placement
  const handleDoubleClick = () => {
    if (environment === 'hall') {
      rotationTarget.current = { x: 0.0, y: -0.17 }
    } else if (environment === 'dark') {
      rotationTarget.current = { x: 0.05, y: -0.25 }
    } else {
      rotationTarget.current = { x: 0.0, y: 0.0 }
    }
    zoomTarget.current = 3.8
  }

  // Choose environment image (prefer admin custom image if set)
  const bgImg =
    environment === 'hall'
      ? (customHallImageUrl || hallWallImg)
      : environment === 'dark'
      ? null
      : (customShopImageUrl || shopBoardImg)

  return (
    <div
      className={`relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-xl bg-[#12141c] select-none ${className}`}
    >
      {/* Photorealistic Wall Background Image */}
      {bgImg && (
        <img
          src={bgImg}
          alt="Wall background"
          className="absolute inset-0 size-full object-cover select-none pointer-events-none"
        />
      )}

      {/* 3D WebGL Canvas Layer - Placed on the wall */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="relative z-10 size-full cursor-grab touch-none active:cursor-grabbing bg-transparent"
      />
    </div>
  )
}
