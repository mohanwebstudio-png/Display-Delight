export type Kind = 'digital' | 'custom' | 'standard'
export interface ProductVariantItem {
  id: string
  sku: string
  name: string
  price_delta_paise: number
  is_active?: boolean
}

export const ULTRA_SLIM_SIZE_META: Record<string, { label: string; dim: string; price: number; deltaPaise: number; sku: string }> = {
  'A5': { label: 'A5', dim: '5.8" × 8.2"', price: 950, deltaPaise: 0, sku: 'DD-USL-A5' },
  'A4': { label: 'A4', dim: '8.2" × 11.6"', price: 1150, deltaPaise: 20000, sku: 'DD-USL-A4' },
  'A3': { label: 'A3', dim: '11.6" × 16.5"', price: 1750, deltaPaise: 80000, sku: 'DD-USL-A3' },
  'A2': { label: 'A2', dim: '16.5" × 23.3"', price: 2950, deltaPaise: 200000, sku: 'DD-USL-A2' },
  'A1': { label: 'A1', dim: '23.3" × 33.1"', price: 4700, deltaPaise: 375000, sku: 'DD-USL-A1' },
  'BO': { label: 'BO', dim: '48" × 24"', price: 6400, deltaPaise: 545000, sku: 'DD-USL-BO' },
  'B0': { label: 'BO', dim: '48" × 24"', price: 6400, deltaPaise: 545000, sku: 'DD-USL-BO' },
}

export const CARD_STAND_SIZE_META: Record<string, { label: string; code: string; dim: string; price: number; deltaPaise: number; sku: string }> = {
  '55 × 90 mm': { label: '55 × 90 mm', code: 'DD-6276', dim: 'Visiting Card / 55 × 90 mm', price: 150, deltaPaise: 0, sku: 'DD-6276' },
  '55 x 90 mm': { label: '55 × 90 mm', code: 'DD-6276', dim: 'Visiting Card / 55 × 90 mm', price: 150, deltaPaise: 0, sku: 'DD-6276' },
  'DD - 6276 - 55 × 90 mm': { label: '55 × 90 mm', code: 'DD-6276', dim: 'Visiting Card / 55 × 90 mm', price: 150, deltaPaise: 0, sku: 'DD-6276' },
  'DD-6276': { label: '55 × 90 mm', code: 'DD-6276', dim: 'Visiting Card / 55 × 90 mm', price: 150, deltaPaise: 0, sku: 'DD-6276' },

  'A7': { label: 'A7', code: 'DD-6277', dim: '74 × 105 mm (A7)', price: 180, deltaPaise: 3000, sku: 'DD-6277' },
  'DD - 6277 - A7': { label: 'A7', code: 'DD-6277', dim: '74 × 105 mm (A7)', price: 180, deltaPaise: 3000, sku: 'DD-6277' },
  'DD-6277': { label: 'A7', code: 'DD-6277', dim: '74 × 105 mm (A7)', price: 180, deltaPaise: 3000, sku: 'DD-6277' },

  'A6': { label: 'A6', code: 'DD-6278', dim: '105 × 148 mm (A6)', price: 200, deltaPaise: 5000, sku: 'DD-6278' },
  'DD - 6278 - A6': { label: 'A6', code: 'DD-6278', dim: '105 × 148 mm (A6)', price: 200, deltaPaise: 5000, sku: 'DD-6278' },
  'DD-6278': { label: 'A6', code: 'DD-6278', dim: '105 × 148 mm (A6)', price: 200, deltaPaise: 5000, sku: 'DD-6278' },

  'A5': { label: 'A5', code: 'DD-6279', dim: '148 × 210 mm (A5)', price: 250, deltaPaise: 10000, sku: 'DD-6279' },
  'DD - 6279 - A5': { label: 'A5', code: 'DD-6279', dim: '148 × 210 mm (A5)', price: 250, deltaPaise: 10000, sku: 'DD-6279' },
  'DD-6279': { label: 'A5', code: 'DD-6279', dim: '148 × 210 mm (A5)', price: 250, deltaPaise: 10000, sku: 'DD-6279' },

  'A4': { label: 'A4', code: 'DD-6280', dim: '210 × 297 mm (A4)', price: 350, deltaPaise: 20000, sku: 'DD-6280' },
  'DD - 6280 - A4': { label: 'A4', code: 'DD-6280', dim: '210 × 297 mm (A4)', price: 350, deltaPaise: 20000, sku: 'DD-6280' },
  'DD-6280': { label: 'A4', code: 'DD-6280', dim: '210 × 297 mm (A4)', price: 350, deltaPaise: 20000, sku: 'DD-6280' },
}

export const LOLLIPOP_SIZE_META: Record<string, { label: string; dim: string; price: number; deltaPaise: number; skuPrefix: string }> = {
  '18 x 18 in': { label: '18 × 18 in', dim: '18" × 18" (45 × 45 cm)', price: 3000, deltaPaise: 0, skuPrefix: 'DD-LPB-18' },
  '18 × 18 in': { label: '18 × 18 in', dim: '18" × 18" (45 × 45 cm)', price: 3000, deltaPaise: 0, skuPrefix: 'DD-LPB-18' },
  '18 X 18 INCH': { label: '18 × 18 in', dim: '18" × 18" (45 × 45 cm)', price: 3000, deltaPaise: 0, skuPrefix: 'DD-LPB-18' },
  '18 x 18': { label: '18 × 18 in', dim: '18" × 18" (45 × 45 cm)', price: 3000, deltaPaise: 0, skuPrefix: 'DD-LPB-18' },
  '18"': { label: '18 × 18 in', dim: '18" × 18" (45 × 45 cm)', price: 3000, deltaPaise: 0, skuPrefix: 'DD-LPB-18' },
  '18': { label: '18 × 18 in', dim: '18" × 18" (45 × 45 cm)', price: 3000, deltaPaise: 0, skuPrefix: 'DD-LPB-18' },

  '24 x 24 in': { label: '24 × 24 in', dim: '24" × 24" (60 × 60 cm)', price: 4500, deltaPaise: 150000, skuPrefix: 'DD-LPB-24' },
  '24 × 24 in': { label: '24 × 24 in', dim: '24" × 24" (60 × 60 cm)', price: 4500, deltaPaise: 150000, skuPrefix: 'DD-LPB-24' },
  '24 X 24 INCH': { label: '24 × 24 in', dim: '24" × 24" (60 × 60 cm)', price: 4500, deltaPaise: 150000, skuPrefix: 'DD-LPB-24' },
  '24 x 24': { label: '24 × 24 in', dim: '24" × 24" (60 × 60 cm)', price: 4500, deltaPaise: 150000, skuPrefix: 'DD-LPB-24' },
  '24"': { label: '24 × 24 in', dim: '24" × 24" (60 × 60 cm)', price: 4500, deltaPaise: 150000, skuPrefix: 'DD-LPB-24' },
  '24': { label: '24 × 24 in', dim: '24" × 24" (60 × 60 cm)', price: 4500, deltaPaise: 150000, skuPrefix: 'DD-LPB-24' },
}

export interface Product {
  id: string
  db_id?: string
  name: string
  cat: string
  category_id?: string
  category_slug?: string
  sku: string
  img: string
  images?: string[]
  price: number | null // Authoritative prices calculated by the pricing API
  kind: Kind
  blurb: string
  description?: string
  sizes: string[]
  specs: [string, string][]
  attrs: Record<string, string | string[]>
  features: string[]
  status?: string
  stock?: number
  slug?: string
  customizable?: boolean
  quote_only?: boolean
  variants?: ProductVariantItem[]
}

export interface CategoryItem {
  id: string
  name: string
  img: string
  blurb: string
  slug?: string
}

// Live Catalogue populated directly from backend FastAPI database
export let CATS: CategoryItem[] = [
  {
    "id": "led-fabric-signage",
    "slug": "led-fabric-signage",
    "name": "LED Fabric Signage",
    "img": "/p/fabric.jpg",
    "blurb": "Backlit fabric display signage with custom dimensions and artwork options."
  },
  {
    "id": "premium-ultra-slim",
    "slug": "premium-ultra-slim",
    "name": "Premium Ultra Slim Signage",
    "img": "/p/ultraslim.jpg",
    "blurb": "Slim LED frame signage with multiple standard sizes (A5 to B0) and orientation options. Included: HP print, clamp and adapter."
  },
  {
    "id": "card-stands",
    "slug": "card-stands",
    "name": "T-Shaped Card Stands",
    "img": "/p/card-stand.jpg",
    "blurb": "Compact transparent cast acrylic stands for tabletop cards, menus, QR codes and price displays."
  },
  {
    "id": "lollipop-boards",
    "slug": "lollipop-boards",
    "name": "LED Lollipop Boards",
    "img": "/p/lightbox-round.jpg",
    "blurb": "Round, square and 360-degree rotating illuminated projection boards with custom double-sided artwork."
  },
  {
    "id": "e-series",
    "slug": "e-series",
    "name": "E Series Digital Signage",
    "img": "/p/frames.jpg",
    "blurb": "Commercial non-touch Android 9 digital signage models in wall-mount, A-type floor-mount and floor-mount configurations."
  },
  {
    "id": "trueview",
    "slug": "trueview",
    "name": "Trueview Digital Signage",
    "img": "/p/i-standee.jpg",
    "blurb": "Commercial grade Trueview digital signage in wall-mount, floor-mount and kiosk configurations with Android 11 and DOS options."
  }
]

export let PRODUCTS: Product[] = [
  {
    "id": "led-fabric-signage",
    "sku": "DD-FAB-01",
    "name": "LED Fabric Signage",
    "cat": "led-fabric-signage",
    "category_id": "455577ca-f74b-43f0-8a01-9409dd176e75",
    "category_slug": "led-fabric-signage",
    "img": "/p/fabric.jpg",
    "images": [
      "/p/fabric.jpg"
    ],
    "price": null,
    "kind": "custom",
    "blurb": "Backlit fabric display signage with custom dimensions and artwork options.",
    "description": "Custom-sized backlit fabric signage featuring edge or perimeter LED illumination, lightweight extruded aluminum frames (60mm, 80mm, or 100mm thickness), and tension fabric silicone edge graphics (SEG). Perfect for retail showrooms, exhibition booths, corporate lobbies, and backlit wall murals.",
    "sizes": [],
    "specs": [
      [
        "Product Type",
        "Backlit Fabric Display Signage"
      ],
      [
        "Frame Thickness Options",
        "60 mm, 80 mm, 100 mm"
      ],
      [
        "Dimensions",
        "Custom Height x Width in feet or inches"
      ],
      [
        "Illumination",
        "High-efficiency Backlit LED Modules"
      ],
      [
        "Artwork & Graphics",
        "Silicone Edge Graphic (SEG) Tension Fabric Print"
      ],
      [
        "Pricing Note",
        "Custom size \u2014 Quote required"
      ]
    ],
    "attrs": {
      "thickness": [
        "60 mm",
        "80 mm",
        "100 mm"
      ],
      "orientation": [
        "Landscape",
        "Portrait"
      ],
      "customizable": "Yes"
    },
    "features": [
      "Backlit Fabric Display Signage",
      "60 mm, 80 mm, 100 mm",
      "Custom Height x Width in feet or inches",
      "High-efficiency Backlit LED Modules"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "led-fabric-signage",
    "customizable": true
  },
  {
    "id": "premium-ultra-slim-signage",
    "sku": "DD-USL-01",
    "name": "Premium Ultra Slim Signage",
    "cat": "premium-ultra-slim",
    "category_id": "a8339c48-4796-4830-ad6e-8dffdb9ad6ec",
    "category_slug": "premium-ultra-slim",
    "img": "/p/ultraslim.jpg",
    "images": [
      "/p/ultraslim.jpg"
    ],
    "price": 950,
    "kind": "standard",
    "blurb": "Slim LED frame signage with multiple standard sizes and orientation options. Included: HP print, clamp and adapter.",
    "description": "Ultra-slim illuminated LED snap frame display with edge-lit acrylic light guide technology. Delivers uniform light distribution with crystal-clear graphics. Each unit comes fully equipped with high-resolution HP print, mounting clamps, and 12V DC power adapter. Available in standard paper sizes from A5 to large B0 format in landscape or portrait orientation.",
    "sizes": [
      "A5",
      "A4",
      "A3",
      "A2",
      "A1",
      "BO"
    ],
    "specs": [
      [
        "Included Accessories",
        "HP print, clamp and adapter"
      ],
      [
        "Orientation Options",
        "Landscape or Portrait"
      ],
      [
        "Standard Sizes",
        "A5, A4, A3, A2, A1, B0 (48 x 24 in)"
      ],
      [
        "Lighting Technology",
        "Edge-lit Optical Acrylic Light Guide Plate"
      ],
      [
        "Frame Construction",
        "Ultra Slim Snap Frame Profile"
      ],
      [
        "Power Supply",
        "12V DC Adapter Included"
      ]
    ],
    "attrs": {
      "size": [
        "A5",
        "A4",
        "A3",
        "A2",
        "A1",
        "BO"
      ],
      "orientation": [
        "Landscape",
        "Portrait"
      ]
    },
    "features": [
      "HP print, clamp and adapter",
      "Landscape or Portrait",
      "A5, A4, A3, A2, A1, B0 (48 x 24 in)",
      "Edge-lit Optical Acrylic Light Guide Plate"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "premium-ultra-slim-signage",
    "customizable": true,
    "variants": [
      { "id": "DD-USL-A5", "sku": "DD-USL-A5", "name": "A5 (5.8 x 8.2 in)", "price_delta_paise": 0 },
      { "id": "DD-USL-A4", "sku": "DD-USL-A4", "name": "A4 (8.2 x 11.6 in)", "price_delta_paise": 20000 },
      { "id": "DD-USL-A3", "sku": "DD-USL-A3", "name": "A3 (11.6 x 16.5 in)", "price_delta_paise": 80000 },
      { "id": "DD-USL-A2", "sku": "DD-USL-A2", "name": "A2 (16.5 x 23.3 in)", "price_delta_paise": 200000 },
      { "id": "DD-USL-A1", "sku": "DD-USL-A1", "name": "A1 (23.3 x 33.1 in)", "price_delta_paise": 375000 },
      { "id": "DD-USL-BO", "sku": "DD-USL-BO", "name": "BO (48 x 24 in)", "price_delta_paise": 545000 }
    ]
  },
  {
    "id": "t-shaped-card-stand",
    "sku": "DD-TCS-01",
    "name": "T-Shaped Card Stand",
    "cat": "card-stands",
    "category_id": "f385df91-ab99-492b-b15f-4deb6b83b97c",
    "category_slug": "card-stands",
    "img": "/p/card-stand.jpg",
    "images": [
      "/p/card-stand.jpg"
    ],
    "price": 150,
    "kind": "standard",
    "blurb": "Compact transparent stand for tabletop cards, menus, QR codes and information displays.",
    "description": "Heavy-duty transparent cast acrylic T-shaped card stand designed for retail counters, hotel reception desks, restaurant tables, and exhibition booths. Provides double-sided visibility and scratch-resistant durability. Accommodates standard visiting cards, promotional flyers, QR payment codes, and printed table menus.",
    "sizes": [
      "55 x 90 mm",
      "A7",
      "A6",
      "A5",
      "A4"
    ],
    "specs": [
      [
        "Material",
        "High-Clarity Optical Grade Cast Acrylic"
      ],
      [
        "Stand Design",
        "T-Shaped Double-Sided Vertical Base"
      ],
      [
        "Supported Formats",
        "55 x 90 mm, A7, A6, A5, A4"
      ],
      [
        "Good For",
        "Countertop promotions, price cards, QR codes, menus"
      ],
      [
        "Price Range",
        "\u20b9150 to \u20b9350"
      ]
    ],
    "attrs": {
      "size": [
        "55 x 90 mm",
        "A7",
        "A6",
        "A5",
        "A4"
      ],
      "shape": "T-Shape"
    },
    "features": [
      "High-Clarity Optical Grade Cast Acrylic",
      "T-Shaped Double-Sided Vertical Base",
      "55 x 90 mm, A7, A6, A5, A4",
      "Countertop promotions, price cards, QR codes, menus"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "t-shaped-card-stand",
    "customizable": false,
    "variants": [
      { "id": "DD-6276", "sku": "DD-6276", "name": "DD-6276 (55 × 90 mm)", "price_delta_paise": 0 },
      { "id": "DD-6277", "sku": "DD-6277", "name": "DD-6277 (A7)", "price_delta_paise": 3000 },
      { "id": "DD-6278", "sku": "DD-6278", "name": "DD-6278 (A6)", "price_delta_paise": 5000 },
      { "id": "DD-6279", "sku": "DD-6279", "name": "DD-6279 (A5)", "price_delta_paise": 10000 },
      { "id": "DD-6280", "sku": "DD-6280", "name": "DD-6280 (A4)", "price_delta_paise": 20000 }
    ]
  },
  {
    "id": "led-lollipop-board",
    "sku": "DD-LPB-01",
    "name": "LED Lollipop Board",
    "cat": "lollipop-boards",
    "category_id": "a73cd7c3-40a4-426c-8026-3e643166305e",
    "category_slug": "lollipop-boards",
    "img": "/p/lightbox-round.jpg",
    "images": [
      "/p/lightbox-round.jpg",
      "/p/lightbox-rect.jpg"
    ],
    "price": 3000,
    "kind": "custom",
    "blurb": "Round and square illuminated boards with custom artwork.",
    "description": "Double-sided illuminated outdoor lollipop projection sign board with sturdy mounting flange. Engineered for high street visibility for cafes, salons, pharmacies, and boutique retail storefronts. High-lumen waterproof LED modules illuminate custom vinyl graphics on both faces.",
    "sizes": [
      "18 x 18 in",
      "24 x 24 in"
    ],
    "specs": [
      [
        "Shape Options",
        "Round, Square"
      ],
      [
        "Available Sizes",
        "18 x 18 in, 24 x 24 in"
      ],
      [
        "Illumination",
        "Internal High-Brightness LED Modules"
      ],
      [
        "Mounting",
        "Heavy-Duty Side Wall Mounting Arm Included"
      ],
      [
        "Weather Resistance",
        "Outdoor / Indoor Commercial Ingress Protected"
      ],
      [
        "Artwork Details",
        "Custom Double-Sided Artwork Upload"
      ]
    ],
    "attrs": {
      "shape": [
        "Round",
        "Square"
      ],
      "size": [
        "18 x 18 in",
        "24 x 24 in"
      ],
      "customizable": "Yes"
    },
    "features": [
      "Round, Square",
      "18 x 18 in, 24 x 24 in",
      "Internal High-Brightness LED Modules",
      "Heavy-Duty Side Wall Mounting Arm Included"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "led-lollipop-board",
    "customizable": true
  },
  {
    "id": "led-rotating-lollipop-board",
    "sku": "DD-RLPB-18",
    "name": "LED Rotating Lollipop Board",
    "cat": "lollipop-boards",
    "category_id": "a73cd7c3-40a4-426c-8026-3e643166305e",
    "category_slug": "lollipop-boards",
    "img": "/p/rotating-lollipop-1.jpg",
    "images": [
      "/p/rotating-lollipop-1.jpg",
      "/p/rotating-lollipop-2.jpg"
    ],
    "price": 5500,
    "kind": "custom",
    "blurb": "Rotating illuminated lollipop-style display with custom artwork.",
    "description": "Motorized 360-degree rotating illuminated projection sign designed for premium brand visibility. Features internal synchronous motor for silent continuous rotation, durable weather-resistant acrylic housing, and vivid double-sided illuminated graphics.",
    "sizes": [
      "18 x 18 in"
    ],
    "specs": [
      [
        "Display Feature",
        "360-Degree Continuous Motorized Rotation"
      ],
      [
        "Available Configuration",
        "18 x 18 in"
      ],
      [
        "Motor",
        "Heavy-Duty Low-RPM Synchronous Motor"
      ],
      [
        "Illumination",
        "Internal High-Efficiency LED Module"
      ],
      [
        "Mounting",
        "Heavy-Duty Wall Mount Bracket Included"
      ],
      [
        "Starting Price",
        "\u20b95,500+"
      ]
    ],
    "attrs": {
      "shape": "Round",
      "size": "18 x 18 in",
      "customizable": "Yes"
    },
    "features": [
      "360-Degree Continuous Motorized Rotation",
      "18 x 18 in",
      "Heavy-Duty Low-RPM Synchronous Motor",
      "Internal High-Efficiency LED Module"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "led-rotating-lollipop-board",
    "customizable": true
  },
  {
    "id": "e-series-32-inch-wall-mount-t291094-a",
    "sku": "T291094-A",
    "name": "E Series 32-inch Wall Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 23160,
    "kind": "digital",
    "blurb": "Non-touch Android 9 commercial digital signage in 32-inch wall-mount format.",
    "description": "Commercial-grade non-touch 32-inch display designed for 24/7 indoor information broadcast, retail advertising, and digital posters. Powered by Android 9 with 2GB RAM, 16GB ROM, 350 nits brightness, and full HDMI input capability.",
    "sizes": [
      "32 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291094-A"
      ],
      [
        "Screen Size",
        "32 in"
      ],
      [
        "Mounting Type",
        "Wall Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b919,300"
      ],
      [
        "MOP",
        "\u20b923,160"
      ],
      [
        "MOP 1",
        "\u20b922,195"
      ]
    ],
    "attrs": {
      "size": "32 in",
      "mounting": "Wall Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291094-A",
      "32 in",
      "Wall Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-32-inch-wall-mount-t291094-a",
    "customizable": false
  },
  {
    "id": "e-series-43-inch-wall-mount-t291095-a",
    "sku": "T291095-A",
    "name": "E Series 43-inch Wall Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 32010,
    "kind": "digital",
    "blurb": "Non-touch Android 9 commercial digital signage in 43-inch wall-mount format.",
    "description": "Commercial-grade non-touch 43-inch display designed for 24/7 indoor information broadcast, retail advertising, and digital posters. Powered by Android 9 with 2GB RAM, 16GB ROM, 350 nits brightness, and full HDMI input capability.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291095-A"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Mounting Type",
        "Wall Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b926,675"
      ],
      [
        "MOP",
        "\u20b932,010"
      ],
      [
        "MOP 1",
        "\u20b930,676"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Wall Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291095-A",
      "43 in",
      "Wall Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-43-inch-wall-mount-t291095-a",
    "customizable": false
  },
  {
    "id": "e-series-55-inch-wall-mount-t291096-a",
    "sku": "T291096-A",
    "name": "E Series 55-inch Wall Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 45792,
    "kind": "digital",
    "blurb": "Non-touch Android 9 commercial digital signage in 55-inch wall-mount format.",
    "description": "Commercial-grade non-touch 55-inch display designed for high-impact indoor information broadcast, flagship showrooms, and digital posters. Powered by Android 9 with 2GB RAM, 16GB ROM, 350 nits brightness, and full HDMI input capability.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291096-A"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Mounting Type",
        "Wall Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b938,160"
      ],
      [
        "MOP",
        "\u20b945,792"
      ],
      [
        "MOP 1",
        "\u20b943,884"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Wall Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291096-A",
      "55 in",
      "Wall Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-55-inch-wall-mount-t291096-a",
    "customizable": false
  },
  {
    "id": "e-series-32-inch-a-type-floor-mount-t291100-a",
    "sku": "T291100-A",
    "name": "E Series 32-inch A-Type Floor Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 30858,
    "kind": "digital",
    "blurb": "Portable A-frame freestanding commercial digital poster in 32-inch format.",
    "description": "Portable A-type floor mount digital standee designed for retail entrances, restaurants, events, and hotel lobbies. Includes robust A-frame easel stand, Android 9 media processor, 2GB RAM, 16GB ROM, and 350 nits high-contrast panel.",
    "sizes": [
      "32 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291100-A"
      ],
      [
        "Screen Size",
        "32 in"
      ],
      [
        "Mounting Type",
        "A-Type Floor Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b925,715"
      ],
      [
        "MOP",
        "\u20b930,858"
      ],
      [
        "MOP 1",
        "\u20b929,572"
      ]
    ],
    "attrs": {
      "size": "32 in",
      "mounting": "A-Type Floor Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291100-A",
      "32 in",
      "A-Type Floor Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-32-inch-a-type-floor-mount-t291100-a",
    "customizable": false
  },
  {
    "id": "e-series-43-inch-a-type-floor-mount-t291101-a",
    "sku": "T291101-A",
    "name": "E Series 43-inch A-Type Floor Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 41460,
    "kind": "digital",
    "blurb": "Portable A-frame freestanding commercial digital poster in 43-inch format.",
    "description": "Portable A-type floor mount digital standee designed for retail entrances, restaurants, events, and hotel lobbies. Includes robust A-frame easel stand, Android 9 media processor, 2GB RAM, 16GB ROM, and 350 nits high-contrast panel.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291101-A"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Mounting Type",
        "A-Type Floor Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b934,550"
      ],
      [
        "MOP",
        "\u20b941,460"
      ],
      [
        "MOP 1",
        "\u20b939,733"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "A-Type Floor Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291101-A",
      "43 in",
      "A-Type Floor Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-43-inch-a-type-floor-mount-t291101-a",
    "customizable": false
  },
  {
    "id": "e-series-55-inch-a-type-floor-mount-t291102-a",
    "sku": "T291102-A",
    "name": "E Series 55-inch A-Type Floor Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 58320,
    "kind": "digital",
    "blurb": "Portable A-frame freestanding commercial digital poster in 55-inch format.",
    "description": "Portable A-type floor mount digital standee designed for retail entrances, restaurants, events, and hotel lobbies. Includes robust A-frame easel stand, Android 9 media processor, 2GB RAM, 16GB ROM, and 350 nits high-contrast panel.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291102-A"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Mounting Type",
        "A-Type Floor Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b948,600"
      ],
      [
        "MOP",
        "\u20b958,320"
      ],
      [
        "MOP 1",
        "\u20b955,890"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "A-Type Floor Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291102-A",
      "55 in",
      "A-Type Floor Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-55-inch-a-type-floor-mount-t291102-a",
    "customizable": false
  },
  {
    "id": "e-series-32-inch-floor-mount-t291097-a",
    "sku": "T291097-A",
    "name": "E Series 32-inch Floor Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 31860,
    "kind": "digital",
    "blurb": "Floor-standing commercial digital standee in 32-inch format.",
    "description": "Floor-standing commercial digital kiosk with heavy steel pedestal base. Powered by Android 9, 2GB RAM, 16GB storage, and 350 nits display panel for non-stop commercial foot traffic.",
    "sizes": [
      "32 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291097-A"
      ],
      [
        "Screen Size",
        "32 in"
      ],
      [
        "Mounting Type",
        "Floor Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b926,550"
      ],
      [
        "MOP",
        "\u20b931,860"
      ],
      [
        "MOP 1",
        "\u20b930,533"
      ]
    ],
    "attrs": {
      "size": "32 in",
      "mounting": "Floor Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291097-A",
      "32 in",
      "Floor Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-32-inch-floor-mount-t291097-a",
    "customizable": false
  },
  {
    "id": "e-series-43-inch-floor-mount-t291098-a",
    "sku": "T291098-A",
    "name": "E Series 43-inch Floor Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 42720,
    "kind": "digital",
    "blurb": "Floor-standing commercial digital standee in 43-inch format.",
    "description": "Floor-standing commercial digital kiosk with heavy steel pedestal base. Powered by Android 9, 2GB RAM, 16GB storage, and 350 nits display panel for non-stop commercial foot traffic.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291098-A"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Mounting Type",
        "Floor Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b935,600"
      ],
      [
        "MOP",
        "\u20b942,720"
      ],
      [
        "MOP 1",
        "\u20b940,940"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Floor Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291098-A",
      "43 in",
      "Floor Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-43-inch-floor-mount-t291098-a",
    "customizable": false
  },
  {
    "id": "e-series-55-inch-floor-mount-t291099-a",
    "sku": "T291099-A",
    "name": "E Series 55-inch Floor Mount Digital Signage",
    "cat": "e-series",
    "category_id": "b8c7e336-b575-4d5a-b057-96a0563c32be",
    "category_slug": "e-series",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 59640,
    "kind": "digital",
    "blurb": "Floor-standing commercial digital standee in 55-inch format.",
    "description": "Floor-standing commercial digital kiosk with heavy steel pedestal base. Powered by Android 9, 2GB RAM, 16GB storage, and 350 nits display panel for non-stop commercial foot traffic.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291099-A"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Mounting Type",
        "Floor Mount"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 9"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-5%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Dealer Price",
        "\u20b949,700"
      ],
      [
        "MOP",
        "\u20b959,640"
      ],
      [
        "MOP 1",
        "\u20b957,155"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Floor Mount",
      "touch": "No",
      "os": "Android 9"
    },
    "features": [
      "T291099-A",
      "55 in",
      "Floor Mount",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "e-series-55-inch-floor-mount-t291099-a",
    "customizable": false
  },
  {
    "id": "trueview-32-inch-wall-mount-non-touch-metal-t29849-a",
    "sku": "T29849-A",
    "name": "Trueview 32-inch Wall Mount Non-Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 37176,
    "kind": "digital",
    "blurb": "Metal wall-mount commercial non-touch signage with Android 11.",
    "description": "Rugged all-metal enclosure commercial display engineered for high reliability in public environments. Runs Android 11 with 1GB RAM, 8GB ROM, and 350 nits (+/-10%) luminance.",
    "sizes": [
      "32 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29849-A"
      ],
      [
        "Product Style",
        "Wall Mount Non-Touch (Metal)"
      ],
      [
        "Screen Size",
        "32 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "1GB / 8GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b930,980"
      ],
      [
        "MOP",
        "\u20b937,176"
      ],
      [
        "MOP 1",
        "\u20b935,627"
      ]
    ],
    "attrs": {
      "size": "32 in",
      "mounting": "Wall Mount",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29849-A",
      "Wall Mount Non-Touch (Metal)",
      "32 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-32-inch-wall-mount-non-touch-metal-t29849-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-wall-mount-non-touch-metal-t29950-a",
    "sku": "T29950-A",
    "name": "Trueview 43-inch Wall Mount Non-Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 43590,
    "kind": "digital",
    "blurb": "Metal wall-mount commercial non-touch signage with Android 11.",
    "description": "Rugged all-metal enclosure commercial display engineered for high reliability in public environments. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits (+/-10%) luminance.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29950-A"
      ],
      [
        "Product Style",
        "Wall Mount Non-Touch (Metal)"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b936,325"
      ],
      [
        "MOP",
        "\u20b943,590"
      ],
      [
        "MOP 1",
        "\u20b941,774"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Wall Mount",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29950-A",
      "Wall Mount Non-Touch (Metal)",
      "43 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-wall-mount-non-touch-metal-t29950-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-wall-mount-non-touch-metal-t29846-a",
    "sku": "T29846-A",
    "name": "Trueview 55-inch Wall Mount Non-Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 62598,
    "kind": "digital",
    "blurb": "Metal wall-mount commercial non-touch signage with Android 11.",
    "description": "Rugged all-metal enclosure commercial display engineered for high reliability in public environments. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits (+/-10%) luminance.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29846-A"
      ],
      [
        "Product Style",
        "Wall Mount Non-Touch (Metal)"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b952,165"
      ],
      [
        "MOP",
        "\u20b962,598"
      ],
      [
        "MOP 1",
        "\u20b959,990"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Wall Mount",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29846-A",
      "Wall Mount Non-Touch (Metal)",
      "55 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-wall-mount-non-touch-metal-t29846-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-wall-mount-with-touch-metal-t29939-a",
    "sku": "T29939-A",
    "name": "Trueview 43-inch Wall Mount with Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 52920,
    "kind": "digital",
    "blurb": "Interactive capacitive touch metal wall-mount display with Android 11.",
    "description": "Interactive wall-mount digital display with high-precision multi-touch capability. Built inside a robust metal chassis with Android 11, 2GB RAM, 16GB ROM, and 350 nits brightness.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29939-A"
      ],
      [
        "Product Style",
        "Wall Mount with Touch (Metal)"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "Yes (Multi-Touch)"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b944,100"
      ],
      [
        "MOP",
        "\u20b952,920"
      ],
      [
        "MOP 1",
        "\u20b950,715"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Wall Mount",
      "touch": "Yes",
      "os": "Android 11"
    },
    "features": [
      "T29939-A",
      "Wall Mount with Touch (Metal)",
      "43 in",
      "Yes (Multi-Touch)"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-wall-mount-with-touch-metal-t29939-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-wall-mount-with-touch-metal-t29993-a",
    "sku": "T29993-A",
    "name": "Trueview 55-inch Wall Mount with Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 69690,
    "kind": "digital",
    "blurb": "Interactive capacitive touch metal wall-mount display with Android 11.",
    "description": "Interactive wall-mount digital display with high-precision multi-touch capability. Built inside a robust metal chassis with Android 11, 2GB RAM, 16GB ROM, and 350 nits brightness.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29993-A"
      ],
      [
        "Product Style",
        "Wall Mount with Touch (Metal)"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "Yes (Multi-Touch)"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b958,075"
      ],
      [
        "MOP",
        "\u20b969,690"
      ],
      [
        "MOP 1",
        "\u20b966,786"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Wall Mount",
      "touch": "Yes",
      "os": "Android 11"
    },
    "features": [
      "T29993-A",
      "Wall Mount with Touch (Metal)",
      "55 in",
      "Yes (Multi-Touch)"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-wall-mount-with-touch-metal-t29993-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-wall-mount-touch-metal-dos-t291129-a",
    "sku": "T291129-A",
    "name": "Trueview 43-inch Wall Mount Touch Digital Signage (Metal) - DOS",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 52920,
    "kind": "digital",
    "blurb": "Touch-enabled commercial wall display with HDMI input and DOS (without OPS).",
    "description": "Touch-enabled commercial wall display featuring HDMI input and DOS architecture (without internal OPS), ideal for connecting custom external media players, Windows PCs, or Linux signage servers.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291129-A"
      ],
      [
        "Product Style",
        "Wall Mount Touch (Metal) - DOS"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "Yes"
      ],
      [
        "Operating System",
        "DOS (without OPS)"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "Dealer Price",
        "\u20b944,100"
      ],
      [
        "MOP",
        "\u20b952,920"
      ],
      [
        "MOP 1",
        "\u20b950,715"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Wall Mount",
      "touch": "Yes",
      "os": "DOS (without OPS)"
    },
    "features": [
      "T291129-A",
      "Wall Mount Touch (Metal) - DOS",
      "43 in",
      "Yes"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-wall-mount-touch-metal-dos-t291129-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-wall-mount-touch-metal-dos-t290134-a",
    "sku": "T290134-A",
    "name": "Trueview 55-inch Wall Mount Touch Digital Signage (Metal) - DOS",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/frames.jpg",
    "images": [
      "/p/frames.jpg"
    ],
    "price": 69690,
    "kind": "digital",
    "blurb": "Touch-enabled commercial wall display with HDMI input and DOS (without OPS).",
    "description": "Touch-enabled commercial wall display featuring HDMI input and DOS architecture (without internal OPS), ideal for connecting custom external media players, Windows PCs, or Linux signage servers.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T290134-A"
      ],
      [
        "Product Style",
        "Wall Mount Touch (Metal) - DOS"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "Yes"
      ],
      [
        "Operating System",
        "DOS (without OPS)"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "Dealer Price",
        "\u20b958,075"
      ],
      [
        "MOP",
        "\u20b969,690"
      ],
      [
        "MOP 1",
        "\u20b966,786"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Wall Mount",
      "touch": "Yes",
      "os": "DOS (without OPS)"
    },
    "features": [
      "T290134-A",
      "Wall Mount Touch (Metal) - DOS",
      "55 in",
      "Yes"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-wall-mount-touch-metal-dos-t290134-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-floor-mount-non-touch-metal-t29942-a",
    "sku": "T29942-A",
    "name": "Trueview 43-inch Floor Mount Non-Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 56094,
    "kind": "digital",
    "blurb": "Metal floor-standing commercial display with Android 11.",
    "description": "Metal floor-standing commercial display in non-touch format. Features integrated heavy pedestal base, Android 11, 2GB RAM, 16GB ROM, and 350 nits high-luminance panel.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29942-A"
      ],
      [
        "Product Style",
        "Floor Mount Non-Touch (Metal)"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b946,745"
      ],
      [
        "MOP",
        "\u20b956,094"
      ],
      [
        "MOP 1",
        "\u20b953,757"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Floor Mount",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29942-A",
      "Floor Mount Non-Touch (Metal)",
      "43 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-floor-mount-non-touch-metal-t29942-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-floor-mount-non-touch-metal-t29944-a",
    "sku": "T29944-A",
    "name": "Trueview 55-inch Floor Mount Non-Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 75120,
    "kind": "digital",
    "blurb": "Metal floor-standing commercial display with Android 11.",
    "description": "Metal floor-standing commercial display in non-touch format. Features integrated heavy pedestal base, Android 11, 2GB RAM, 16GB ROM, and 350 nits high-luminance panel.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29944-A"
      ],
      [
        "Product Style",
        "Floor Mount Non-Touch (Metal)"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b962,600"
      ],
      [
        "MOP",
        "\u20b975,120"
      ],
      [
        "MOP 1",
        "\u20b971,990"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Floor Mount",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29944-A",
      "Floor Mount Non-Touch (Metal)",
      "55 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-floor-mount-non-touch-metal-t29944-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-floor-mount-with-touch-metal-t290135-a",
    "sku": "T290135-A",
    "name": "Trueview 43-inch Floor Mount with Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 62940,
    "kind": "digital",
    "blurb": "Interactive touch floor-standing commercial display with Android 11.",
    "description": "Interactive touch commercial floor standee with multi-point capacitive touch sensor, high-grade powder-coated steel chassis, Android 11, 2GB RAM, and 16GB storage.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T290135-A"
      ],
      [
        "Product Style",
        "Floor Mount with Touch (Metal)"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "Yes (Capacitive Touch)"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b952,450"
      ],
      [
        "MOP",
        "\u20b962,940"
      ],
      [
        "MOP 1",
        "\u20b960,318"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Floor Mount",
      "touch": "Yes",
      "os": "Android 11"
    },
    "features": [
      "T290135-A",
      "Floor Mount with Touch (Metal)",
      "43 in",
      "Yes (Capacitive Touch)"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-floor-mount-with-touch-metal-t290135-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-floor-mount-with-touch-metal-t29840-a",
    "sku": "T29840-A",
    "name": "Trueview 55-inch Floor Mount with Touch Digital Signage (Metal)",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 82200,
    "kind": "digital",
    "blurb": "Interactive touch floor-standing commercial display with Android 11.",
    "description": "Interactive touch commercial floor standee with multi-point capacitive touch sensor, high-grade powder-coated steel chassis, Android 11, 2GB RAM, and 16GB storage.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29840-A"
      ],
      [
        "Product Style",
        "Floor Mount with Touch (Metal)"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "Yes (Capacitive Touch)"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b968,500"
      ],
      [
        "MOP",
        "\u20b982,200"
      ],
      [
        "MOP 1",
        "\u20b978,775"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Floor Mount",
      "touch": "Yes",
      "os": "Android 11"
    },
    "features": [
      "T29840-A",
      "Floor Mount with Touch (Metal)",
      "55 in",
      "Yes (Capacitive Touch)"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-floor-mount-with-touch-metal-t29840-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-floor-mount-touch-metal-dos-t291033-a",
    "sku": "T291033-A",
    "name": "Trueview 43-inch Floor Mount Touch Digital Signage (Metal) - DOS",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 62940,
    "kind": "digital",
    "blurb": "Metal floor-standing touch display with HDMI input and DOS (without OPS).",
    "description": "Metal floor-standing touch display with HDMI input and DOS (without OPS). Ideal for connecting external player PCs or digital media servers.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291033-A"
      ],
      [
        "Product Style",
        "Floor Mount Touch (Metal) - DOS"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "Yes"
      ],
      [
        "Operating System",
        "DOS (without OPS)"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "Dealer Price",
        "\u20b952,450"
      ],
      [
        "MOP",
        "\u20b962,940"
      ],
      [
        "MOP 1",
        "\u20b960,318"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Floor Mount",
      "touch": "Yes",
      "os": "DOS (without OPS)"
    },
    "features": [
      "T291033-A",
      "Floor Mount Touch (Metal) - DOS",
      "43 in",
      "Yes"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-floor-mount-touch-metal-dos-t291033-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-floor-mount-touch-metal-dos-t291019-a",
    "sku": "T291019-A",
    "name": "Trueview 55-inch Floor Mount Touch Digital Signage (Metal) - DOS",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/a-standee.jpg",
    "images": [
      "/p/a-standee.jpg"
    ],
    "price": 82200,
    "kind": "digital",
    "blurb": "Metal floor-standing touch display with HDMI input and DOS (without OPS).",
    "description": "Metal floor-standing touch display with HDMI input and DOS (without OPS). Ideal for connecting external player PCs or digital media servers.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T291019-A"
      ],
      [
        "Product Style",
        "Floor Mount Touch (Metal) - DOS"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "Yes"
      ],
      [
        "Operating System",
        "DOS (without OPS)"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "Dealer Price",
        "\u20b968,500"
      ],
      [
        "MOP",
        "\u20b982,200"
      ],
      [
        "MOP 1",
        "\u20b978,775"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Floor Mount",
      "touch": "Yes",
      "os": "DOS (without OPS)"
    },
    "features": [
      "T291019-A",
      "Floor Mount Touch (Metal) - DOS",
      "55 in",
      "Yes"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-floor-mount-touch-metal-dos-t291019-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-kiosk-non-touch-t29802-a",
    "sku": "T29802-A",
    "name": "Trueview 43-inch Kiosk Non-Touch Digital Signage",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 61098,
    "kind": "digital",
    "blurb": "Commercial freestanding kiosk display in 43-inch non-touch format.",
    "description": "All-in-one commercial digital kiosk display housed in an elegant curved freestanding enclosure. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits brightness.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29802-A"
      ],
      [
        "Product Style",
        "KIOSK - Non-Touch"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b950,915"
      ],
      [
        "MOP",
        "\u20b961,098"
      ],
      [
        "MOP 1",
        "\u20b958,552"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Kiosk",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29802-A",
      "KIOSK - Non-Touch",
      "43 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-kiosk-non-touch-t29802-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-kiosk-non-touch-t29804-a",
    "sku": "T29804-A",
    "name": "Trueview 55-inch Kiosk Non-Touch Digital Signage",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 80100,
    "kind": "digital",
    "blurb": "Commercial freestanding kiosk display in 55-inch non-touch format.",
    "description": "All-in-one commercial digital kiosk display housed in an elegant curved freestanding enclosure. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits brightness.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29804-A"
      ],
      [
        "Product Style",
        "KIOSK - Non-Touch"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "No"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b966,750"
      ],
      [
        "MOP",
        "\u20b980,100"
      ],
      [
        "MOP 1",
        "\u20b976,763"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Kiosk",
      "touch": "No",
      "os": "Android 11"
    },
    "features": [
      "T29804-A",
      "KIOSK - Non-Touch",
      "55 in",
      "No"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-kiosk-non-touch-t29804-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-kiosk-with-touch-t29803-a",
    "sku": "T29803-A",
    "name": "Trueview 43-inch Kiosk with Touch Digital Signage",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 70434,
    "kind": "digital",
    "blurb": "Interactive touch commercial kiosk display in 43-inch format with Android 11.",
    "description": "Interactive touch kiosk station designed for self-service wayfinding, catalog browsing, and visitor registration. Features fast capacitive touch response, Android 11, 2GB RAM, and 16GB storage.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29803-A"
      ],
      [
        "Product Style",
        "KIOSK - with Touch"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "Yes (Capacitive Touch)"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b958,695"
      ],
      [
        "MOP",
        "\u20b970,434"
      ],
      [
        "MOP 1",
        "\u20b967,499"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Kiosk",
      "touch": "Yes",
      "os": "Android 11"
    },
    "features": [
      "T29803-A",
      "KIOSK - with Touch",
      "43 in",
      "Yes (Capacitive Touch)"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-kiosk-with-touch-t29803-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-kiosk-with-touch-t29994-a",
    "sku": "T29994-A",
    "name": "Trueview 55-inch Kiosk with Touch Digital Signage",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 87180,
    "kind": "digital",
    "blurb": "Interactive touch commercial kiosk display in 55-inch format with Android 11.",
    "description": "Interactive touch kiosk station designed for self-service wayfinding, catalog browsing, and visitor registration. Features fast capacitive touch response, Android 11, 2GB RAM, and 16GB storage.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29994-A"
      ],
      [
        "Product Style",
        "KIOSK - with Touch"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "Yes (Capacitive Touch)"
      ],
      [
        "Operating System",
        "Android 11"
      ],
      [
        "RAM / ROM",
        "2GB / 16GB"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "HDMI Input",
        "No"
      ],
      [
        "Dealer Price",
        "\u20b972,650"
      ],
      [
        "MOP",
        "\u20b987,180"
      ],
      [
        "MOP 1",
        "\u20b983,548"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Kiosk",
      "touch": "Yes",
      "os": "Android 11"
    },
    "features": [
      "T29994-A",
      "KIOSK - with Touch",
      "55 in",
      "Yes (Capacitive Touch)"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-kiosk-with-touch-t29994-a",
    "customizable": false
  },
  {
    "id": "trueview-43-inch-kiosk-touch-dos-t29848-a",
    "sku": "T29848-A",
    "name": "Trueview 43-inch Kiosk Touch Digital Signage - DOS",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 70434,
    "kind": "digital",
    "blurb": "Touch-enabled commercial kiosk with HDMI input and DOS (without OPS).",
    "description": "Touch-enabled commercial digital kiosk with HDMI input and DOS architecture (without OPS), engineered for custom software installations, Windows/Linux controllers, and ticketing machines.",
    "sizes": [
      "43 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29848-A"
      ],
      [
        "Product Style",
        "KIOSK - Touch, DOS"
      ],
      [
        "Screen Size",
        "43 in"
      ],
      [
        "Touch Support",
        "Yes"
      ],
      [
        "Operating System",
        "DOS (without OPS)"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "Dealer Price",
        "\u20b958,695"
      ],
      [
        "MOP",
        "\u20b970,434"
      ],
      [
        "MOP 1",
        "\u20b967,499"
      ]
    ],
    "attrs": {
      "size": "43 in",
      "mounting": "Kiosk",
      "touch": "Yes",
      "os": "DOS (without OPS)"
    },
    "features": [
      "T29848-A",
      "KIOSK - Touch, DOS",
      "43 in",
      "Yes"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-43-inch-kiosk-touch-dos-t29848-a",
    "customizable": false
  },
  {
    "id": "trueview-55-inch-kiosk-touch-dos-t29887-a",
    "sku": "T29887-A",
    "name": "Trueview 55-inch Kiosk Touch Digital Signage - DOS",
    "cat": "trueview",
    "category_id": "10b63342-f7e0-457e-b99a-5615b8e77d60",
    "category_slug": "trueview",
    "img": "/p/i-standee.jpg",
    "images": [
      "/p/i-standee.jpg"
    ],
    "price": 87186,
    "kind": "digital",
    "blurb": "Touch-enabled commercial kiosk with HDMI input and DOS (without OPS).",
    "description": "Touch-enabled commercial digital kiosk with HDMI input and DOS architecture (without OPS), engineered for custom software installations, Windows/Linux controllers, and ticketing machines.",
    "sizes": [
      "55 in"
    ],
    "specs": [
      [
        "Model Code",
        "T29887-A"
      ],
      [
        "Product Style",
        "KIOSK - Touch, DOS"
      ],
      [
        "Screen Size",
        "55 in"
      ],
      [
        "Touch Support",
        "Yes"
      ],
      [
        "Operating System",
        "DOS (without OPS)"
      ],
      [
        "HDMI Input",
        "Yes"
      ],
      [
        "Brightness",
        "350 nits (+/-10%)"
      ],
      [
        "Environment",
        "Indoor"
      ],
      [
        "Dealer Price",
        "\u20b972,655"
      ],
      [
        "MOP",
        "\u20b987,186"
      ],
      [
        "MOP 1",
        "\u20b983,553"
      ]
    ],
    "attrs": {
      "size": "55 in",
      "mounting": "Kiosk",
      "touch": "Yes",
      "os": "DOS (without OPS)"
    },
    "features": [
      "T29887-A",
      "KIOSK - Touch, DOS",
      "55 in",
      "Yes"
    ],
    "status": "Published",
    "stock": 15,
    "slug": "trueview-55-inch-kiosk-touch-dos-t29887-a",
    "customizable": false
  }
]

export function setLiveCatalogue(newProducts?: Product[], newCats?: CategoryItem[]) {
  if (newProducts && newProducts.length > 0) {
    PRODUCTS = newProducts
  }
  if (newCats && newCats.length > 0) {
    CATS = newCats
  }
}

export const byId = (id: string) => PRODUCTS.find((p) => p.id === id || p.sku === id || p.db_id === id || (p as any).slug === id || p.id.toLowerCase() === id.toLowerCase() || p.sku.toLowerCase() === id.toLowerCase())
export const catName = (id: string) => CATS.find((c) => c.id === id || (c as any).slug === id || c.id.toLowerCase() === id.toLowerCase())?.name ?? id

export const inr = (n: number | null | undefined) => {
  const num = typeof n === 'number' && !isNaN(n) ? n : 0
  return '₹' + num.toLocaleString('en-IN')
}

/* ---------- Category Filter Definitions ---------- */
export type FilterType = 'checkbox' | 'radio'
export interface FilterDef { key: string; label: string; type: FilterType }
const F = (key: string, label: string, type: FilterType = 'checkbox'): FilterDef => ({ key, label, type })

export const FILTERS_BY_CAT: Record<string, FilterDef[]> = {
  all: [
    F('size', 'Screen / Frame Size'),
    F('mounting', 'Mounting Type'),
    F('touch', 'Touch Enabled', 'radio'),
    F('os', 'Operating System'),
    F('customizable', 'Artwork Upload', 'radio'),
  ],
  'led-fabric-signage': [
    F('thickness', 'Frame Thickness'),
    F('orientation', 'Orientation'),
    F('customizable', 'Artwork Upload', 'radio'),
  ],
  'premium-ultra-slim': [
    F('size', 'Size'),
    F('orientation', 'Orientation'),
  ],
  'card-stands': [
    F('size', 'Size / Format'),
    F('shape', 'Shape'),
  ],
  'lollipop-boards': [
    F('shape', 'Shape'),
    F('size', 'Size'),
    F('customizable', 'Artwork Upload', 'radio'),
  ],
  'e-series': [
    F('size', 'Screen Size'),
    F('touch', 'Touch Enabled', 'radio'),
    F('os', 'Operating System'),
    F('mounting', 'Mounting'),
  ],
  'trueview': [
    F('size', 'Screen Size'),
    F('touch', 'Touch Enabled', 'radio'),
    F('mounting', 'Mounting Type'),
    F('os', 'Operating System'),
  ],
  'digital-signage': [
    F('size', 'Screen Size'),
    F('touch', 'Touch Enabled', 'radio'),
    F('mounting', 'Mounting Type'),
    F('os', 'Operating System'),
  ],
}

export const toArr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

export function optionsFor(def: FilterDef, list: Product[]) {
  const m = new Map<string, number>()
  const normDefKey = def.key.toLowerCase().replace(/[-_\s]+/g, '')
  const normDefLabel = def.label.toLowerCase().replace(/[-_\s]+/g, '')

  list.forEach((p) => {
    const prodValues = new Set<string>()

    if (p.attrs && typeof p.attrs === 'object') {
      if (p.attrs[def.key]) {
        toArr(p.attrs[def.key]).forEach((v) => {
          if (v && typeof v === 'string' && v.trim()) prodValues.add(v.trim())
        })
      }
      for (const [k, v] of Object.entries(p.attrs)) {
        const normK = k.toLowerCase().replace(/[-_\s]+/g, '')
        if (normK === normDefKey || normK === normDefLabel) {
          toArr(v).forEach((val) => {
            if (val && typeof val === 'string' && val.trim()) prodValues.add(val.trim())
          })
        }
      }
    }

    if (p.specs && Array.isArray(p.specs)) {
      for (const [sKey, sVal] of p.specs) {
        const normSKey = String(sKey).toLowerCase().replace(/[-_\s]+/g, '')
        if (
          normSKey === normDefKey ||
          normSKey === normDefLabel ||
          normSKey.includes(normDefKey) ||
          normDefKey.includes(normSKey) ||
          normSKey.includes(normDefLabel) ||
          normDefLabel.includes(normSKey)
        ) {
          if (sVal && typeof sVal === 'string' && sVal.trim()) {
            prodValues.add(sVal.trim())
          }
        }
      }
    }

    if ((normDefKey.includes('size') || normDefLabel.includes('size')) && p.sizes?.length) {
      p.sizes.forEach((s) => {
        if (s && typeof s === 'string' && s.trim()) prodValues.add(s.trim())
      })
    }

    prodValues.forEach((val) => {
      m.set(val, (m.get(val) ?? 0) + 1)
    })
  })

  return [...m.entries()].map(([value, count]) => ({ value, count }))
}

// Industries from DisplayDelight catalogue — B2B use cases
export const INDUSTRIES = [
  ['Cafés & Restaurants', 'Digital menu boards, table standees & branded displays.', '/p/i-standee.jpg'],
  ['Retail & Showrooms', 'High-visibility window displays & floor-standing standees.', '/p/ultraslim.jpg'],
  ['Salons & Wellness', 'Illuminated logo frames & promotions for reception areas.', '/p/backlit.jpg'],
  ['Hospitals & Clinics', 'Wayfinding signage, notice boards & patient information.', '/p/frames.jpg'],
  ['Offices & Corporates', 'Reception walls, meeting room ID & lobby brand moments.', '/p/i-standee.jpg'],
  ['Schools & Institutions', 'Notice boards, event promotions & LED hall displays.', '/p/ultraslim.jpg'],
  ['Hotels & Hospitality', 'Lobby directories, event boards & room-service menus.', '/p/backlit.jpg'],
  ['Events & Exhibitions', 'Portable roll-up, lollipop boards & branded booth displays.', '/p/frames.jpg'],
] as const

// FAQs from DisplayDelight catalogue
export const FAQS: [string, string][] = [
  ['What products does DisplayDelight supply?', 'We supply LED fabric signage, ultra-slim acrylic frames, T-shaped card stands, LED lollipop boards, rotating lollipop boards, and a full range of E-Series and Trueview digital signage displays for businesses.'],
  ['Can I upload my own artwork?', 'Yes. Selected products such as LED Fabric Signage and Lollipop Boards support artwork upload in JPEG, PNG, or PDF format. You can upload and preview your design before placing an order.'],
  ['Do you provide a quote for custom sizes?', 'Absolutely. Use the "Request a Quote" option on any product page or contact us directly. Our team will respond with pricing and lead times based on your requirements.'],
  ['What sizes are available for Ultra Slim Signage?', 'Premium Ultra Slim Signage is available in A5, A4, A3, A2, A1, and B0 sizes in both portrait and landscape orientations.'],
  ['Are the digital signage displays touch-enabled?', 'Trueview and E-Series displays are available in both touch and non-touch versions. Check the product specifications for supported configurations.'],
  ['What is your delivery timeline?', 'Standard orders ship within 3–5 business days. Custom artwork orders may take 5–7 business days. We deliver across India.'],
  ['Do you offer GST invoices?', 'Yes. All orders include a GST-compliant invoice. Our GSTIN is available on all tax documents.'],
  ['How do I track my order?', 'Use the Track Order feature on our website or contact our support team with your order number.'],
]
