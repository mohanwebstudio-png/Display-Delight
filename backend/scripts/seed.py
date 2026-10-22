"""
DisplayDelight V3 — Production Catalogue Seeding Script.
Populates all 33 products and 6 categories exactly as transcribed from the
official DisplayDelight Digital Signage Product Catalogue PDF.
"""
from __future__ import annotations

import json
import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sqlalchemy import or_
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.models import (
    AttributeDataType,
    AttributeOption,
    Category,
    CategoryFilterConfig,
    ClientLogo,
    ContentPage,
    Coupon,
    CustomizationField,
    CustomizationProfile,
    Faq,
    FieldType,
    FilterType,
    HomepageSection,
    Inventory,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductImage,
    ProductKind,
    ProductReview,
    ProductSpec,
    ProductVariant,
    PublishStatus,
    QuoteRequest,
    QuoteStatus,
    Testimonial,
    User,
    UserRole,
    VariantOptionSet,
    WebsiteSetting,
)


def seed():
    print("Beginning DisplayDelight V3 catalogue database seed...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Admin User & Test Customer
        admin = db.query(User).filter(User.email == "admin@displaydelight.in").first()
        if not admin:
            admin = User(
                email="admin@displaydelight.in",
                hashed_password=hash_password("Admin@DisplayDelight2026!"),
                full_name="Operations Administrator",
                phone="9876543210",
                role=UserRole.admin,
                is_email_verified=True,
                is_active=True,
            )
            db.add(admin)
            print("  Created Admin user: admin@displaydelight.in")

        customer = db.query(User).filter(User.email == "customer@displaydelight.in").first()
        if not customer:
            customer = User(
                email="customer@displaydelight.in",
                hashed_password=hash_password("Customer@123456"),
                full_name="Rahul Verma",
                phone="9811223344",
                role=UserRole.customer,
                is_email_verified=True,
                is_active=True,
            )
            db.add(customer)
            print("  Created Customer user: customer@displaydelight.in")

        db.commit()

        # 2. System Settings
        settings_data = [
            ("company_name", "DisplayDelight Commercial Displays Pvt Ltd", False),
            ("company_gstin", "29AAAAA0000A1Z5", False),
            ("business_state", "Karnataka", False),
            ("support_email", "Displaydelight@gmail.com", False),
            ("support_phone", "+91 98403 27440", False),
            ("default_gst_rate", "18", False),
            ("free_shipping_threshold_paise", "5000000", False),
            ("standard_shipping_charge_paise", "60000", False),
            ("razorpay_key_id", "rzp_test_Tq2xyBU7kvMX7q", False),
            ("razorpay_key_secret", "W4N2aajElPsDN4T64f0oPZx3", True),
            ("razorpay_webhook_secret", "Sequvar@2004", True),
        ]
        for key, val, is_sens in settings_data:
            setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
            if not setting:
                db.add(WebsiteSetting(key=key, value=val, is_sensitive=is_sens))
            else:
                setting.value = val
        db.commit()
        print("  Configured core website settings.")

        # 3. Clean up old dummy products and dummy categories
        dummy_skus = ["DD-VW-P18", "DD-STD-55", "DD-KSK-43", "DD-OD-75", "DD-DMB-43", "DD-BESPOKE-LED", "SKU"]
        dummy_cat_slugs = ["led-video-walls", "digital-standees", "interactive-touch-kiosks", "outdoor-displays", "digital-menu-boards"]

        # Find any dummy products or leftover test products
        obsolete_products = db.query(Product).filter(
            or_(
                Product.sku.in_(dummy_skus),
                Product.sku.like("DD-TEST%"),
                Product.category_id == None,
            )
        ).all()

        for old_p in obsolete_products:
            db.query(OrderItem).filter(OrderItem.product_id == old_p.id).update({OrderItem.product_id: None})
            db.query(ProductReview).filter(ProductReview.product_id == old_p.id).delete()
            db.query(Inventory).filter(Inventory.product_id == old_p.id).delete()
            db.query(ProductSpec).filter(ProductSpec.product_id == old_p.id).delete()
            db.query(ProductImage).filter(ProductImage.product_id == old_p.id).delete()
            db.query(ProductAttributeValue).filter(ProductAttributeValue.product_id == old_p.id).delete()
            db.query(ProductVariant).filter(ProductVariant.product_id == old_p.id).delete()
            prof = db.query(CustomizationProfile).filter(CustomizationProfile.product_id == old_p.id).first()
            if prof:
                db.query(CustomizationField).filter(CustomizationField.profile_id == prof.id).delete()
                db.delete(prof)
            db.delete(old_p)
        db.commit()

        for old_slug in dummy_cat_slugs:
            old_c = db.query(Category).filter(Category.slug == old_slug).first()
            if old_c:
                db.query(CategoryFilterConfig).filter(CategoryFilterConfig.category_id == old_c.id).delete()
                db.delete(old_c)
        db.commit()
        print(f"  Removed {len(obsolete_products)} obsolete dummy/test products and legacy categories.")

        # 4. Authentic Categories from PDF Catalogue
        categories_data = [
            (
                "led-fabric-signage",
                "LED Fabric Signage",
                "Backlit fabric display signage with custom dimensions and artwork options.",
                "/p/fabric.jpg",
                1,
            ),
            (
                "premium-ultra-slim",
                "Premium Ultra Slim Signage",
                "Slim LED frame signage with multiple standard sizes (A5 to B0) and orientation options. Included: HP print, clamp and adapter.",
                "/p/ultraslim.jpg",
                2,
            ),
            (
                "card-stands",
                "T-Shaped Card Stands",
                "Compact transparent cast acrylic stands for tabletop cards, menus, QR codes and price displays.",
                "/p/card-stand.jpg",
                3,
            ),
            (
                "lollipop-boards",
                "LED Lollipop Boards",
                "Round, square and 360-degree rotating illuminated projection boards with custom double-sided artwork.",
                "/p/lightbox-round.jpg",
                4,
            ),
            (
                "e-series",
                "E Series Digital Signage",
                "Commercial non-touch Android 9 digital signage models in wall-mount, A-type floor-mount and floor-mount configurations.",
                "/p/frames.jpg",
                5,
            ),
            (
                "trueview",
                "Trueview Digital Signage",
                "Commercial grade Trueview digital signage in wall-mount, floor-mount and kiosk configurations with Android 11 and DOS options.",
                "/p/i-standee.jpg",
                6,
            ),
        ]

        cat_map: dict[str, Category] = {}
        for slug, name, desc, img, order in categories_data:
            cat = db.query(Category).filter(Category.slug == slug).first()
            if not cat:
                cat = Category(
                    slug=slug,
                    name=name,
                    description=desc,
                    image_url=img,
                    display_order=order,
                    status=PublishStatus.published,
                )
                db.add(cat)
                db.flush()
            else:
                cat.name = name
                cat.description = desc
                cat.image_url = img
                cat.display_order = order
                cat.status = PublishStatus.published
            cat_map[slug] = cat
        db.commit()
        print("  Configured 6 authentic catalogue categories.")

        # 5. Filter Attributes
        attributes_data = [
            ("size", "Screen Size", AttributeDataType.select, FilterType.checkbox, "in"),
            ("mounting", "Mounting Type", AttributeDataType.select, FilterType.checkbox, ""),
            ("touch", "Touch Enabled", AttributeDataType.boolean, FilterType.radio, ""),
            ("os", "Operating System", AttributeDataType.select, FilterType.checkbox, ""),
            ("thickness", "Frame Thickness", AttributeDataType.select, FilterType.checkbox, "mm"),
            ("shape", "Shape", AttributeDataType.select, FilterType.checkbox, ""),
            ("orientation", "Orientation", AttributeDataType.select, FilterType.radio, ""),
            ("customizable", "Customizable", AttributeDataType.boolean, FilterType.radio, ""),
        ]
        attr_map: dict[str, ProductAttribute] = {}
        for key, label, a_type, ui, unit in attributes_data:
            attr = db.query(ProductAttribute).filter(ProductAttribute.key == key).first()
            if not attr:
                attr = ProductAttribute(
                    key=key,
                    label=label,
                    data_type=a_type,
                    filter_type=ui,
                    unit=unit,
                    is_filterable=True,
                    is_active=True,
                )
                db.add(attr)
                db.flush()
            else:
                attr.label = label
                attr.data_type = a_type
                attr.filter_type = ui
                attr.unit = unit
                attr.is_filterable = True
                attr.is_active = True
            attr_map[key] = attr
        db.commit()

        # Connect Category Filter Configs
        category_filters = {
            "led-fabric-signage": ["thickness", "orientation", "customizable"],
            "premium-ultra-slim": ["size", "orientation"],
            "card-stands": ["size", "shape"],
            "lollipop-boards": ["shape", "size", "customizable"],
            "e-series": ["size", "mounting", "touch", "os"],
            "trueview": ["size", "mounting", "touch", "os"],
        }
        for c_slug, a_keys in category_filters.items():
            cat_obj = cat_map[c_slug]
            for idx, a_key in enumerate(a_keys):
                existing = db.query(CategoryFilterConfig).filter(
                    CategoryFilterConfig.category_id == cat_obj.id,
                    CategoryFilterConfig.attribute_id == attr_map[a_key].id,
                ).first()
                if not existing:
                    db.add(CategoryFilterConfig(
                        category_id=cat_obj.id,
                        attribute_id=attr_map[a_key].id,
                        display_order=idx,
                        is_visible=True,
                    ))
        db.commit()
        print("  Configured faceted filter attributes and category associations.")

        # 6. All 33 Catalogue Products from PDF
        products_data = [
            # ── Page 2: LED Fabric Signage ──
            {
                "sku": "DD-FAB-01",
                "slug": "led-fabric-signage",
                "name": "LED Fabric Signage",
                "category": "led-fabric-signage",
                "kind": ProductKind.custom,
                "blurb": "Backlit fabric display signage with custom dimensions and artwork options.",
                "description": "Custom-sized backlit fabric signage featuring edge or perimeter LED illumination, lightweight extruded aluminum frames (60mm, 80mm, or 100mm thickness), and tension fabric silicone edge graphics (SEG). Perfect for retail showrooms, exhibition booths, corporate lobbies, and backlit wall murals.",
                "base_price_paise": None,  # Quote required
                "gst_rate": 18,
                "is_customizable": True,
                "images": ["/p/fabric.jpg"],
                "sizes": ["Custom Dimensions"],
                "attrs": {
                    "thickness": ["60 mm", "80 mm", "100 mm"],
                    "orientation": ["Landscape", "Portrait"],
                    "customizable": "Yes",
                },
                "specs": [
                    ("Product Type", "Backlit Fabric Display Signage"),
                    ("Frame Thickness Options", "60 mm, 80 mm, 100 mm"),
                    ("Dimensions", "Custom Height x Width in feet or inches"),
                    ("Illumination", "High-efficiency Backlit LED Modules"),
                    ("Artwork & Graphics", "Silicone Edge Graphic (SEG) Tension Fabric Print"),
                    ("Pricing Note", "Custom size — Quote required"),
                ],
                "variants": [],
                "custom_profile": {
                    "name": "Fabric Signage Customizer",
                    "supports_front": True,
                    "supports_back": False,
                    "fields": [
                        ("artwork", "Upload Design / Artwork", FieldType.artwork_upload, True, False, 0, 1),
                        ("dimensions", "Custom Dimensions (Height x Width)", FieldType.text, True, False, 0, 2),
                        ("thickness", "Frame Thickness", FieldType.dropdown, True, False, 0, 3, ["60 mm", "80 mm", "100 mm"]),
                        ("orientation", "Orientation", FieldType.orientation, True, False, 0, 4, ["Landscape", "Portrait"]),
                    ],
                },
            },

            # ── Page 3: Premium Ultra Slim Signage ──
            {
                "sku": "DD-USL-01",
                "slug": "premium-ultra-slim-signage",
                "name": "Premium Ultra Slim Signage",
                "category": "premium-ultra-slim",
                "kind": ProductKind.standard,
                "blurb": "Slim LED frame signage with multiple standard sizes and orientation options. Included: HP print, clamp and adapter.",
                "description": "Ultra-slim illuminated LED snap frame display with edge-lit acrylic light guide technology. Delivers uniform light distribution with crystal-clear graphics. Each unit comes fully equipped with high-resolution HP print, mounting clamps, and 12V DC power adapter. Available in standard paper sizes from A5 to large B0 format in landscape or portrait orientation.",
                "base_price_paise": 95000,  # ₹950 (A5 starting price)
                "gst_rate": 18,
                "is_customizable": True,
                "images": ["/p/ultraslim.jpg"],
                "sizes": ["A5", "A4", "A3", "A2", "A1", "BO"],
                "attrs": {
                    "size": ["A5", "A4", "A3", "A2", "A1", "BO"],
                    "orientation": ["Landscape", "Portrait"],
                },
                "specs": [
                    ("Included Accessories", "HP print, clamp and adapter"),
                    ("Orientation Options", "Landscape or Portrait"),
                    ("Standard Sizes", "A5, A4, A3, A2, A1, B0 (48 x 24 in)"),
                    ("Lighting Technology", "Edge-lit Optical Acrylic Light Guide Plate"),
                    ("Frame Construction", "Ultra Slim Snap Frame Profile"),
                    ("Power Supply", "12V DC Adapter Included"),
                ],
                "variants": [
                    ("DD-USL-A5", "A5 (5.8 x 8.2 in)", 0),
                    ("DD-USL-A4", "A4 (8.2 x 11.6 in)", 20000),      # ₹1,150
                    ("DD-USL-A3", "A3 (11.6 x 16.5 in)", 80000),     # ₹1,750
                    ("DD-USL-A2", "A2 (16.5 x 23.3 in)", 200000),    # ₹2,950
                    ("DD-USL-A1", "A1 (23.3 x 33.1 in)", 375000),    # ₹4,700
                    ("DD-USL-BO", "BO (48 x 24 in)", 545000),        # ₹6,400
                ],
                "custom_profile": {
                    "name": "Ultra Slim Configuration Profile",
                    "supports_front": True,
                    "supports_back": False,
                    "fields": [
                        ("size", "Frame Size", FieldType.dropdown, True, True, 0, 1, ["A5", "A4", "A3", "A2", "A1", "BO"]),
                        ("orientation", "Orientation", FieldType.orientation, True, False, 0, 2, ["Landscape", "Portrait"]),
                        ("artwork", "Design / Artwork for HP Print", FieldType.artwork_upload, False, False, 0, 3),
                    ],
                },
            },

            # ── Page 4: T-Shaped Card Stand ──
            {
                "sku": "DD-TCS-01",
                "slug": "t-shaped-card-stand",
                "name": "T-Shaped Card Stand",
                "category": "card-stands",
                "kind": ProductKind.standard,
                "blurb": "Compact transparent stand for tabletop cards, menus, QR codes and information displays.",
                "description": "Heavy-duty transparent cast acrylic T-shaped card stand designed for retail counters, hotel reception desks, restaurant tables, and exhibition booths. Provides double-sided visibility and scratch-resistant durability. Accommodates standard visiting cards, promotional flyers, QR payment codes, and printed table menus.",
                "base_price_paise": 15000,  # ₹150 (DD-6276 starting price)
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/card-stand.jpg"],
                "sizes": ["55 x 90 mm", "A7", "A6", "A5", "A4"],
                "attrs": {
                    "size": ["55 x 90 mm", "A7", "A6", "A5", "A4"],
                    "shape": ["T-Shape"],
                },
                "specs": [
                    ("Material", "High-Clarity Optical Grade Cast Acrylic"),
                    ("Stand Design", "T-Shaped Double-Sided Vertical Base"),
                    ("Supported Formats", "55 x 90 mm, A7, A6, A5, A4"),
                    ("Good For", "Countertop promotions, price cards, QR codes, menus"),
                    ("Price Range", "₹150 to ₹350"),
                ],
                "variants": [
                    ("DD-6276", "55 x 90 mm (Visiting Card)", 0),
                    ("DD-6277", "A7 Format", 3000),   # ₹180
                    ("DD-6278", "A6 Format", 5000),   # ₹200
                    ("DD-6279", "A5 Format", 10000),  # ₹250
                    ("DD-6280", "A4 Format", 20000),  # ₹350
                ],
                "custom_profile": None,
            },

            # ── Page 5: LED Lollipop Board ──
            {
                "sku": "DD-LPB-01",
                "slug": "led-lollipop-board",
                "name": "LED Lollipop Board",
                "category": "lollipop-boards",
                "kind": ProductKind.custom,
                "blurb": "Round and square illuminated boards with custom artwork.",
                "description": "Double-sided illuminated outdoor lollipop projection sign board with sturdy mounting flange. Engineered for high street visibility for cafes, salons, pharmacies, and boutique retail storefronts. High-lumen waterproof LED modules illuminate custom vinyl graphics on both faces.",
                "base_price_paise": 300000,  # ₹3,000 (18x18 starting price)
                "gst_rate": 18,
                "is_customizable": True,
                "images": ["/p/lightbox-round.jpg", "/p/lightbox-rect.jpg"],
                "sizes": ["18 x 18 in", "24 x 24 in"],
                "attrs": {
                    "shape": ["Round", "Square"],
                    "size": ["18 x 18 in", "24 x 24 in"],
                    "customizable": "Yes",
                },
                "specs": [
                    ("Shape Options", "Round, Square"),
                    ("Available Sizes", "18 x 18 in, 24 x 24 in"),
                    ("Illumination", "Internal High-Brightness LED Modules"),
                    ("Mounting", "Heavy-Duty Side Wall Mounting Arm Included"),
                    ("Weather Resistance", "Outdoor / Indoor Commercial Ingress Protected"),
                    ("Artwork Details", "Custom Double-Sided Artwork Upload"),
                ],
                "variants": [
                    ("DD-LPB-18-RND", "Round 18 x 18 in", 0),
                    ("DD-LPB-24-RND", "Round 24 x 24 in", 150000),  # ₹4,500
                    ("DD-LPB-18-SQR", "Square 18 x 18 in", 0),
                    ("DD-LPB-24-SQR", "Square 24 x 24 in", 150000), # ₹4,500
                ],
                "custom_profile": {
                    "name": "Lollipop Board Artwork Studio",
                    "supports_front": True,
                    "supports_back": True,
                    "fields": [
                        ("shape", "Board Shape", FieldType.dropdown, True, False, 0, 1, ["Round", "Square"]),
                        ("size", "Board Size", FieldType.dropdown, True, True, 0, 2, ["18 x 18 in", "24 x 24 in"]),
                        ("artwork_front", "Front Display Artwork", FieldType.artwork_upload, True, False, 0, 3),
                        ("artwork_back", "Back Display Artwork", FieldType.artwork_upload, False, False, 0, 4),
                    ],
                },
            },

            # ── Page 6: LED Rotating Lollipop Board ──
            {
                "sku": "DD-RLPB-18",
                "slug": "led-rotating-lollipop-board",
                "name": "LED Rotating Lollipop Board",
                "category": "lollipop-boards",
                "kind": ProductKind.custom,
                "blurb": "Rotating illuminated lollipop-style display with custom artwork.",
                "description": "Motorized 360-degree rotating illuminated projection sign designed for premium brand visibility. Features internal synchronous motor for silent continuous rotation, durable weather-resistant acrylic housing, and vivid double-sided illuminated graphics.",
                "base_price_paise": 550000,  # ₹5,500+
                "gst_rate": 18,
                "is_customizable": True,
                "images": ["/p/l-led.jpg"],
                "sizes": ["18 x 18 in"],
                "attrs": {
                    "shape": ["Round"],
                    "size": ["18 x 18 in"],
                    "customizable": "Yes",
                },
                "specs": [
                    ("Display Feature", "360-Degree Continuous Motorized Rotation"),
                    ("Available Configuration", "18 x 18 in"),
                    ("Motor", "Heavy-Duty Low-RPM Synchronous Motor"),
                    ("Illumination", "Internal High-Efficiency LED Module"),
                    ("Mounting", "Heavy-Duty Wall Mount Bracket Included"),
                    ("Starting Price", "₹5,500+"),
                ],
                "variants": [],
                "custom_profile": {
                    "name": "Rotating Lollipop Studio",
                    "supports_front": True,
                    "supports_back": True,
                    "fields": [
                        ("artwork_front", "Front Design Artwork", FieldType.artwork_upload, True, False, 0, 1),
                        ("artwork_back", "Back Design Artwork", FieldType.artwork_upload, False, False, 0, 2),
                    ],
                },
            },

            # ── Page 7: E Series Digital Signages (9 Models) ──
            # T291094-A 32 in | Wall Mount
            {
                "sku": "T291094-A",
                "slug": "e-series-32-inch-wall-mount-t291094-a",
                "name": "E Series 32-inch Wall Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Non-touch Android 9 commercial digital signage in 32-inch wall-mount format.",
                "description": "Commercial-grade non-touch 32-inch display designed for 24/7 indoor information broadcast, retail advertising, and digital posters. Powered by Android 9 with 2GB RAM, 16GB ROM, 350 nits brightness, and full HDMI input capability.",
                "base_price_paise": 2316000,  # MOP: ₹23,160
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["32 in"],
                "attrs": {
                    "size": "32 in",
                    "mounting": "Wall Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291094-A"),
                    ("Screen Size", "32 in"),
                    ("Mounting Type", "Wall Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹19,300"),
                    ("MOP", "₹23,160"),
                    ("MOP 1", "₹22,195"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291095-A 43 in | Wall Mount
            {
                "sku": "T291095-A",
                "slug": "e-series-43-inch-wall-mount-t291095-a",
                "name": "E Series 43-inch Wall Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Non-touch Android 9 commercial digital signage in 43-inch wall-mount format.",
                "description": "Commercial-grade non-touch 43-inch display designed for 24/7 indoor information broadcast, retail advertising, and digital posters. Powered by Android 9 with 2GB RAM, 16GB ROM, 350 nits brightness, and full HDMI input capability.",
                "base_price_paise": 3201000,  # MOP: ₹32,010
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Wall Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291095-A"),
                    ("Screen Size", "43 in"),
                    ("Mounting Type", "Wall Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹26,675"),
                    ("MOP", "₹32,010"),
                    ("MOP 1", "₹30,676"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291096-A 55 in | Wall Mount
            {
                "sku": "T291096-A",
                "slug": "e-series-55-inch-wall-mount-t291096-a",
                "name": "E Series 55-inch Wall Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Non-touch Android 9 commercial digital signage in 55-inch wall-mount format.",
                "description": "Commercial-grade non-touch 55-inch display designed for high-impact indoor information broadcast, flagship showrooms, and digital posters. Powered by Android 9 with 2GB RAM, 16GB ROM, 350 nits brightness, and full HDMI input capability.",
                "base_price_paise": 4579200,  # MOP: ₹45,792
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Wall Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291096-A"),
                    ("Screen Size", "55 in"),
                    ("Mounting Type", "Wall Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹38,160"),
                    ("MOP", "₹45,792"),
                    ("MOP 1", "₹43,884"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291100-A 32 in | A-Type Floor Mount
            {
                "sku": "T291100-A",
                "slug": "e-series-32-inch-a-type-floor-mount-t291100-a",
                "name": "E Series 32-inch A-Type Floor Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Portable A-frame freestanding commercial digital poster in 32-inch format.",
                "description": "Portable A-type floor mount digital standee designed for retail entrances, restaurants, events, and hotel lobbies. Includes robust A-frame easel stand, Android 9 media processor, 2GB RAM, 16GB ROM, and 350 nits high-contrast panel.",
                "base_price_paise": 3085800,  # MOP: ₹30,858
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["32 in"],
                "attrs": {
                    "size": "32 in",
                    "mounting": "A-Type Floor Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291100-A"),
                    ("Screen Size", "32 in"),
                    ("Mounting Type", "A-Type Floor Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹25,715"),
                    ("MOP", "₹30,858"),
                    ("MOP 1", "₹29,572"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291101-A 43 in | A-Type Floor Mount
            {
                "sku": "T291101-A",
                "slug": "e-series-43-inch-a-type-floor-mount-t291101-a",
                "name": "E Series 43-inch A-Type Floor Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Portable A-frame freestanding commercial digital poster in 43-inch format.",
                "description": "Portable A-type floor mount digital standee designed for retail entrances, restaurants, events, and hotel lobbies. Includes robust A-frame easel stand, Android 9 media processor, 2GB RAM, 16GB ROM, and 350 nits high-contrast panel.",
                "base_price_paise": 4146000,  # MOP: ₹41,460
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "A-Type Floor Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291101-A"),
                    ("Screen Size", "43 in"),
                    ("Mounting Type", "A-Type Floor Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹34,550"),
                    ("MOP", "₹41,460"),
                    ("MOP 1", "₹39,733"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291102-A 55 in | A-Type Floor Mount
            {
                "sku": "T291102-A",
                "slug": "e-series-55-inch-a-type-floor-mount-t291102-a",
                "name": "E Series 55-inch A-Type Floor Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Portable A-frame freestanding commercial digital poster in 55-inch format.",
                "description": "Portable A-type floor mount digital standee designed for retail entrances, restaurants, events, and hotel lobbies. Includes robust A-frame easel stand, Android 9 media processor, 2GB RAM, 16GB ROM, and 350 nits high-contrast panel.",
                "base_price_paise": 5832000,  # MOP: ₹58,320
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "A-Type Floor Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291102-A"),
                    ("Screen Size", "55 in"),
                    ("Mounting Type", "A-Type Floor Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹48,600"),
                    ("MOP", "₹58,320"),
                    ("MOP 1", "₹55,890"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291097-A 32 in | Floor Mount
            {
                "sku": "T291097-A",
                "slug": "e-series-32-inch-floor-mount-t291097-a",
                "name": "E Series 32-inch Floor Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Floor-standing commercial digital standee in 32-inch format.",
                "description": "Floor-standing commercial digital kiosk with heavy steel pedestal base. Powered by Android 9, 2GB RAM, 16GB storage, and 350 nits display panel for non-stop commercial foot traffic.",
                "base_price_paise": 3186000,  # MOP: ₹31,860
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["32 in"],
                "attrs": {
                    "size": "32 in",
                    "mounting": "Floor Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291097-A"),
                    ("Screen Size", "32 in"),
                    ("Mounting Type", "Floor Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹26,550"),
                    ("MOP", "₹31,860"),
                    ("MOP 1", "₹30,533"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291098-A 43 in | Floor Mount
            {
                "sku": "T291098-A",
                "slug": "e-series-43-inch-floor-mount-t291098-a",
                "name": "E Series 43-inch Floor Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Floor-standing commercial digital standee in 43-inch format.",
                "description": "Floor-standing commercial digital kiosk with heavy steel pedestal base. Powered by Android 9, 2GB RAM, 16GB storage, and 350 nits display panel for non-stop commercial foot traffic.",
                "base_price_paise": 4272000,  # MOP: ₹42,720
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Floor Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291098-A"),
                    ("Screen Size", "43 in"),
                    ("Mounting Type", "Floor Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹35,600"),
                    ("MOP", "₹42,720"),
                    ("MOP 1", "₹40,940"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291099-A 55 in | Floor Mount
            {
                "sku": "T291099-A",
                "slug": "e-series-55-inch-floor-mount-t291099-a",
                "name": "E Series 55-inch Floor Mount Digital Signage",
                "category": "e-series",
                "kind": ProductKind.digital,
                "blurb": "Floor-standing commercial digital standee in 55-inch format.",
                "description": "Floor-standing commercial digital kiosk with heavy steel pedestal base. Powered by Android 9, 2GB RAM, 16GB storage, and 350 nits display panel for non-stop commercial foot traffic.",
                "base_price_paise": 5964000,  # MOP: ₹59,640
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Floor Mount",
                    "touch": "No",
                    "os": "Android 9",
                },
                "specs": [
                    ("Model Code", "T291099-A"),
                    ("Screen Size", "55 in"),
                    ("Mounting Type", "Floor Mount"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 9"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-5%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "Yes"),
                    ("Dealer Price", "₹49,700"),
                    ("MOP", "₹59,640"),
                    ("MOP 1", "₹57,155"),
                ],
                "variants": [],
                "custom_profile": None,
            },

            # ── Page 8: Trueview Wall Mount Digital Signage (7 Models) ──
            # T29849-A
            {
                "sku": "T29849-A",
                "slug": "trueview-32-inch-wall-mount-non-touch-metal-t29849-a",
                "name": "Trueview 32-inch Wall Mount Non-Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal wall-mount commercial non-touch signage with Android 11.",
                "description": "Rugged all-metal enclosure commercial display engineered for high reliability in public environments. Runs Android 11 with 1GB RAM, 8GB ROM, and 350 nits (+/-10%) luminance.",
                "base_price_paise": 3717600,  # MOP: ₹37,176
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["32 in"],
                "attrs": {
                    "size": "32 in",
                    "mounting": "Wall Mount",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29849-A"),
                    ("Product Style", "Wall Mount Non-Touch (Metal)"),
                    ("Screen Size", "32 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "1GB / 8GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹30,980"),
                    ("MOP", "₹37,176"),
                    ("MOP 1", "₹35,627"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29950-A
            {
                "sku": "T29950-A",
                "slug": "trueview-43-inch-wall-mount-non-touch-metal-t29950-a",
                "name": "Trueview 43-inch Wall Mount Non-Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal wall-mount commercial non-touch signage with Android 11.",
                "description": "Rugged all-metal enclosure commercial display engineered for high reliability in public environments. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits (+/-10%) luminance.",
                "base_price_paise": 4359000,  # MOP: ₹43,590
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Wall Mount",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29950-A"),
                    ("Product Style", "Wall Mount Non-Touch (Metal)"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹36,325"),
                    ("MOP", "₹43,590"),
                    ("MOP 1", "₹41,774"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29846-A
            {
                "sku": "T29846-A",
                "slug": "trueview-55-inch-wall-mount-non-touch-metal-t29846-a",
                "name": "Trueview 55-inch Wall Mount Non-Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal wall-mount commercial non-touch signage with Android 11.",
                "description": "Rugged all-metal enclosure commercial display engineered for high reliability in public environments. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits (+/-10%) luminance.",
                "base_price_paise": 6259800,  # MOP: ₹62,598
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Wall Mount",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29846-A"),
                    ("Product Style", "Wall Mount Non-Touch (Metal)"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹52,165"),
                    ("MOP", "₹62,598"),
                    ("MOP 1", "₹59,990"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29939-A
            {
                "sku": "T29939-A",
                "slug": "trueview-43-inch-wall-mount-with-touch-metal-t29939-a",
                "name": "Trueview 43-inch Wall Mount with Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Interactive capacitive touch metal wall-mount display with Android 11.",
                "description": "Interactive wall-mount digital display with high-precision multi-touch capability. Built inside a robust metal chassis with Android 11, 2GB RAM, 16GB ROM, and 350 nits brightness.",
                "base_price_paise": 5292000,  # MOP: ₹52,920
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Wall Mount",
                    "touch": "Yes",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29939-A"),
                    ("Product Style", "Wall Mount with Touch (Metal)"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "Yes (Multi-Touch)"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹44,100"),
                    ("MOP", "₹52,920"),
                    ("MOP 1", "₹50,715"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29993-A
            {
                "sku": "T29993-A",
                "slug": "trueview-55-inch-wall-mount-with-touch-metal-t29993-a",
                "name": "Trueview 55-inch Wall Mount with Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Interactive capacitive touch metal wall-mount display with Android 11.",
                "description": "Interactive wall-mount digital display with high-precision multi-touch capability. Built inside a robust metal chassis with Android 11, 2GB RAM, 16GB ROM, and 350 nits brightness.",
                "base_price_paise": 6969000,  # MOP: ₹69,690
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Wall Mount",
                    "touch": "Yes",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29993-A"),
                    ("Product Style", "Wall Mount with Touch (Metal)"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "Yes (Multi-Touch)"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹58,075"),
                    ("MOP", "₹69,690"),
                    ("MOP 1", "₹66,786"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291129-A (DOS)
            {
                "sku": "T291129-A",
                "slug": "trueview-43-inch-wall-mount-touch-metal-dos-t291129-a",
                "name": "Trueview 43-inch Wall Mount Touch Digital Signage (Metal) - DOS",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Touch-enabled commercial wall display with HDMI input and DOS (without OPS).",
                "description": "Touch-enabled commercial wall display featuring HDMI input and DOS architecture (without internal OPS), ideal for connecting custom external media players, Windows PCs, or Linux signage servers.",
                "base_price_paise": 5292000,  # MOP: ₹52,920
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Wall Mount",
                    "touch": "Yes",
                    "os": "DOS (without OPS)",
                },
                "specs": [
                    ("Model Code", "T291129-A"),
                    ("Product Style", "Wall Mount Touch (Metal) - DOS"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "Yes"),
                    ("Operating System", "DOS (without OPS)"),
                    ("HDMI Input", "Yes"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("Dealer Price", "₹44,100"),
                    ("MOP", "₹52,920"),
                    ("MOP 1", "₹50,715"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T290134-A (DOS)
            {
                "sku": "T290134-A",
                "slug": "trueview-55-inch-wall-mount-touch-metal-dos-t290134-a",
                "name": "Trueview 55-inch Wall Mount Touch Digital Signage (Metal) - DOS",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Touch-enabled commercial wall display with HDMI input and DOS (without OPS).",
                "description": "Touch-enabled commercial wall display featuring HDMI input and DOS architecture (without internal OPS), ideal for connecting custom external media players, Windows PCs, or Linux signage servers.",
                "base_price_paise": 6969000,  # MOP: ₹69,690
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/frames.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Wall Mount",
                    "touch": "Yes",
                    "os": "DOS (without OPS)",
                },
                "specs": [
                    ("Model Code", "T290134-A"),
                    ("Product Style", "Wall Mount Touch (Metal) - DOS"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "Yes"),
                    ("Operating System", "DOS (without OPS)"),
                    ("HDMI Input", "Yes"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("Dealer Price", "₹58,075"),
                    ("MOP", "₹69,690"),
                    ("MOP 1", "₹66,786"),
                ],
                "variants": [],
                "custom_profile": None,
            },

            # ── Page 9: Trueview Floor Mount Digital Signage (6 Models) ──
            # T29942-A
            {
                "sku": "T29942-A",
                "slug": "trueview-43-inch-floor-mount-non-touch-metal-t29942-a",
                "name": "Trueview 43-inch Floor Mount Non-Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal floor-standing commercial display with Android 11.",
                "description": "Metal floor-standing commercial display in non-touch format. Features integrated heavy pedestal base, Android 11, 2GB RAM, 16GB ROM, and 350 nits high-luminance panel.",
                "base_price_paise": 5609400,  # MOP: ₹56,094
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Floor Mount",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29942-A"),
                    ("Product Style", "Floor Mount Non-Touch (Metal)"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹46,745"),
                    ("MOP", "₹56,094"),
                    ("MOP 1", "₹53,757"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29944-A
            {
                "sku": "T29944-A",
                "slug": "trueview-55-inch-floor-mount-non-touch-metal-t29944-a",
                "name": "Trueview 55-inch Floor Mount Non-Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal floor-standing commercial display with Android 11.",
                "description": "Metal floor-standing commercial display in non-touch format. Features integrated heavy pedestal base, Android 11, 2GB RAM, 16GB ROM, and 350 nits high-luminance panel.",
                "base_price_paise": 7512000,  # MOP: ₹75,120
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Floor Mount",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29944-A"),
                    ("Product Style", "Floor Mount Non-Touch (Metal)"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹62,600"),
                    ("MOP", "₹75,120"),
                    ("MOP 1", "₹71,990"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T290135-A
            {
                "sku": "T290135-A",
                "slug": "trueview-43-inch-floor-mount-with-touch-metal-t290135-a",
                "name": "Trueview 43-inch Floor Mount with Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Interactive touch floor-standing commercial display with Android 11.",
                "description": "Interactive touch commercial floor standee with multi-point capacitive touch sensor, high-grade powder-coated steel chassis, Android 11, 2GB RAM, and 16GB storage.",
                "base_price_paise": 6294000,  # MOP: ₹62,940
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Floor Mount",
                    "touch": "Yes",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T290135-A"),
                    ("Product Style", "Floor Mount with Touch (Metal)"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "Yes (Capacitive Touch)"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹52,450"),
                    ("MOP", "₹62,940"),
                    ("MOP 1", "₹60,318"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29840-A
            {
                "sku": "T29840-A",
                "slug": "trueview-55-inch-floor-mount-with-touch-metal-t29840-a",
                "name": "Trueview 55-inch Floor Mount with Touch Digital Signage (Metal)",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Interactive touch floor-standing commercial display with Android 11.",
                "description": "Interactive touch commercial floor standee with multi-point capacitive touch sensor, high-grade powder-coated steel chassis, Android 11, 2GB RAM, and 16GB storage.",
                "base_price_paise": 8220000,  # MOP: ₹82,200
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Floor Mount",
                    "touch": "Yes",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29840-A"),
                    ("Product Style", "Floor Mount with Touch (Metal)"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "Yes (Capacitive Touch)"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹68,500"),
                    ("MOP", "₹82,200"),
                    ("MOP 1", "₹78,775"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291033-A (DOS)
            {
                "sku": "T291033-A",
                "slug": "trueview-43-inch-floor-mount-touch-metal-dos-t291033-a",
                "name": "Trueview 43-inch Floor Mount Touch Digital Signage (Metal) - DOS",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal floor-standing touch display with HDMI input and DOS (without OPS).",
                "description": "Metal floor-standing touch display with HDMI input and DOS (without OPS). Ideal for connecting external player PCs or digital media servers.",
                "base_price_paise": 6294000,  # MOP: ₹62,940
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Floor Mount",
                    "touch": "Yes",
                    "os": "DOS (without OPS)",
                },
                "specs": [
                    ("Model Code", "T291033-A"),
                    ("Product Style", "Floor Mount Touch (Metal) - DOS"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "Yes"),
                    ("Operating System", "DOS (without OPS)"),
                    ("HDMI Input", "Yes"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("Dealer Price", "₹52,450"),
                    ("MOP", "₹62,940"),
                    ("MOP 1", "₹60,318"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T291019-A (DOS)
            {
                "sku": "T291019-A",
                "slug": "trueview-55-inch-floor-mount-touch-metal-dos-t291019-a",
                "name": "Trueview 55-inch Floor Mount Touch Digital Signage (Metal) - DOS",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Metal floor-standing touch display with HDMI input and DOS (without OPS).",
                "description": "Metal floor-standing touch display with HDMI input and DOS (without OPS). Ideal for connecting external player PCs or digital media servers.",
                "base_price_paise": 8220000,  # MOP: ₹82,200
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/a-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Floor Mount",
                    "touch": "Yes",
                    "os": "DOS (without OPS)",
                },
                "specs": [
                    ("Model Code", "T291019-A"),
                    ("Product Style", "Floor Mount Touch (Metal) - DOS"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "Yes"),
                    ("Operating System", "DOS (without OPS)"),
                    ("HDMI Input", "Yes"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("Dealer Price", "₹68,500"),
                    ("MOP", "₹82,200"),
                    ("MOP 1", "₹78,775"),
                ],
                "variants": [],
                "custom_profile": None,
            },

            # ── Page 10: Trueview Kiosk Digital Signage (6 Models) ──
            # T29802-A
            {
                "sku": "T29802-A",
                "slug": "trueview-43-inch-kiosk-non-touch-t29802-a",
                "name": "Trueview 43-inch Kiosk Non-Touch Digital Signage",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Commercial freestanding kiosk display in 43-inch non-touch format.",
                "description": "All-in-one commercial digital kiosk display housed in an elegant curved freestanding enclosure. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits brightness.",
                "base_price_paise": 6109800,  # MOP: ₹61,098
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Kiosk",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29802-A"),
                    ("Product Style", "KIOSK - Non-Touch"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹50,915"),
                    ("MOP", "₹61,098"),
                    ("MOP 1", "₹58,552"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29804-A
            {
                "sku": "T29804-A",
                "slug": "trueview-55-inch-kiosk-non-touch-t29804-a",
                "name": "Trueview 55-inch Kiosk Non-Touch Digital Signage",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Commercial freestanding kiosk display in 55-inch non-touch format.",
                "description": "All-in-one commercial digital kiosk display housed in an elegant curved freestanding enclosure. Runs Android 11 with 2GB RAM, 16GB ROM, and 350 nits brightness.",
                "base_price_paise": 8010000,  # MOP: ₹80,100
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Kiosk",
                    "touch": "No",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29804-A"),
                    ("Product Style", "KIOSK - Non-Touch"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "No"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹66,750"),
                    ("MOP", "₹80,100"),
                    ("MOP 1", "₹76,763"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29803-A
            {
                "sku": "T29803-A",
                "slug": "trueview-43-inch-kiosk-with-touch-t29803-a",
                "name": "Trueview 43-inch Kiosk with Touch Digital Signage",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Interactive touch commercial kiosk display in 43-inch format with Android 11.",
                "description": "Interactive touch kiosk station designed for self-service wayfinding, catalog browsing, and visitor registration. Features fast capacitive touch response, Android 11, 2GB RAM, and 16GB storage.",
                "base_price_paise": 7043400,  # MOP: ₹70,434
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Kiosk",
                    "touch": "Yes",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29803-A"),
                    ("Product Style", "KIOSK - with Touch"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "Yes (Capacitive Touch)"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹58,695"),
                    ("MOP", "₹70,434"),
                    ("MOP 1", "₹67,499"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29994-A
            {
                "sku": "T29994-A",
                "slug": "trueview-55-inch-kiosk-with-touch-t29994-a",
                "name": "Trueview 55-inch Kiosk with Touch Digital Signage",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Interactive touch commercial kiosk display in 55-inch format with Android 11.",
                "description": "Interactive touch kiosk station designed for self-service wayfinding, catalog browsing, and visitor registration. Features fast capacitive touch response, Android 11, 2GB RAM, and 16GB storage.",
                "base_price_paise": 8718000,  # MOP: ₹87,180
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Kiosk",
                    "touch": "Yes",
                    "os": "Android 11",
                },
                "specs": [
                    ("Model Code", "T29994-A"),
                    ("Product Style", "KIOSK - with Touch"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "Yes (Capacitive Touch)"),
                    ("Operating System", "Android 11"),
                    ("RAM / ROM", "2GB / 16GB"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("HDMI Input", "No"),
                    ("Dealer Price", "₹72,650"),
                    ("MOP", "₹87,180"),
                    ("MOP 1", "₹83,548"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29848-A (DOS)
            {
                "sku": "T29848-A",
                "slug": "trueview-43-inch-kiosk-touch-dos-t29848-a",
                "name": "Trueview 43-inch Kiosk Touch Digital Signage - DOS",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Touch-enabled commercial kiosk with HDMI input and DOS (without OPS).",
                "description": "Touch-enabled commercial digital kiosk with HDMI input and DOS architecture (without OPS), engineered for custom software installations, Windows/Linux controllers, and ticketing machines.",
                "base_price_paise": 7043400,  # MOP: ₹70,434
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["43 in"],
                "attrs": {
                    "size": "43 in",
                    "mounting": "Kiosk",
                    "touch": "Yes",
                    "os": "DOS (without OPS)",
                },
                "specs": [
                    ("Model Code", "T29848-A"),
                    ("Product Style", "KIOSK - Touch, DOS"),
                    ("Screen Size", "43 in"),
                    ("Touch Support", "Yes"),
                    ("Operating System", "DOS (without OPS)"),
                    ("HDMI Input", "Yes"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("Dealer Price", "₹58,695"),
                    ("MOP", "₹70,434"),
                    ("MOP 1", "₹67,499"),
                ],
                "variants": [],
                "custom_profile": None,
            },
            # T29887-A (DOS)
            {
                "sku": "T29887-A",
                "slug": "trueview-55-inch-kiosk-touch-dos-t29887-a",
                "name": "Trueview 55-inch Kiosk Touch Digital Signage - DOS",
                "category": "trueview",
                "kind": ProductKind.digital,
                "blurb": "Touch-enabled commercial kiosk with HDMI input and DOS (without OPS).",
                "description": "Touch-enabled commercial digital kiosk with HDMI input and DOS architecture (without OPS), engineered for custom software installations, Windows/Linux controllers, and ticketing machines.",
                "base_price_paise": 8718600,  # MOP: ₹87,186
                "gst_rate": 18,
                "is_customizable": False,
                "images": ["/p/i-standee.jpg"],
                "sizes": ["55 in"],
                "attrs": {
                    "size": "55 in",
                    "mounting": "Kiosk",
                    "touch": "Yes",
                    "os": "DOS (without OPS)",
                },
                "specs": [
                    ("Model Code", "T29887-A"),
                    ("Product Style", "KIOSK - Touch, DOS"),
                    ("Screen Size", "55 in"),
                    ("Touch Support", "Yes"),
                    ("Operating System", "DOS (without OPS)"),
                    ("HDMI Input", "Yes"),
                    ("Brightness", "350 nits (+/-10%)"),
                    ("Environment", "Indoor"),
                    ("Dealer Price", "₹72,655"),
                    ("MOP", "₹87,186"),
                    ("MOP 1", "₹83,553"),
                ],
                "variants": [],
                "custom_profile": None,
            },
        ]

        created_prods: dict[str, Product] = {}
        for p_data in products_data:
            prod = db.query(Product).filter(Product.sku == p_data["sku"]).first()
            if not prod:
                prod = Product(
                    sku=p_data["sku"],
                    slug=p_data["slug"],
                    name=p_data["name"],
                    category_id=cat_map[p_data["category"]].id,
                    kind=p_data["kind"],
                    blurb=p_data["blurb"],
                    description=p_data["description"],
                    status=PublishStatus.published,
                    base_price_paise=p_data["base_price_paise"],
                    gst_rate=p_data["gst_rate"],
                    is_customizable=p_data["is_customizable"],
                )
                db.add(prod)
                db.flush()
            else:
                prod.slug = p_data["slug"]
                prod.name = p_data["name"]
                prod.category_id = cat_map[p_data["category"]].id
                prod.kind = p_data["kind"]
                prod.blurb = p_data["blurb"]
                prod.description = p_data["description"]
                prod.status = PublishStatus.published
                prod.base_price_paise = p_data["base_price_paise"]
                prod.gst_rate = p_data["gst_rate"]
                prod.is_customizable = p_data["is_customizable"]

            created_prods[p_data["sku"]] = prod

            # Clear old images & add new
            db.query(ProductImage).filter(ProductImage.product_id == prod.id).delete()
            for idx, url in enumerate(p_data["images"]):
                db.add(ProductImage(
                    product_id=prod.id,
                    url=url,
                    alt_text=f"{prod.name} image {idx+1}",
                    is_primary=(idx == 0),
                    display_order=idx,
                ))

            # Clear old specs & add new
            db.query(ProductSpec).filter(ProductSpec.product_id == prod.id).delete()
            for idx, (lbl, val) in enumerate(p_data["specs"]):
                db.add(ProductSpec(
                    product_id=prod.id,
                    label=lbl,
                    value=val,
                    display_order=idx,
                ))

            # Clear old attributes & add new
            db.query(ProductAttributeValue).filter(ProductAttributeValue.product_id == prod.id).delete()
            if "attrs" in p_data:
                for a_key, a_val in p_data["attrs"].items():
                    if a_key in attr_map:
                        vals = a_val if isinstance(a_val, list) else [a_val]
                        for v in vals:
                            db.add(ProductAttributeValue(
                                product_id=prod.id,
                                attribute_id=attr_map[a_key].id,
                                value=str(v),
                            ))

            # Clear old variants & add new
            db.query(ProductVariant).filter(ProductVariant.product_id == prod.id).delete()
            for v_sku, v_name, v_delta in p_data.get("variants", []):
                db.add(ProductVariant(
                    product_id=prod.id,
                    sku=v_sku,
                    name=v_name,
                    price_delta_paise=v_delta,
                    is_active=True,
                ))

            # Inventory
            inv = db.query(Inventory).filter(Inventory.product_id == prod.id).first()
            if not inv:
                db.add(Inventory(
                    product_id=prod.id,
                    quantity=20,
                    reserved=0,
                    track_stock=True,
                    low_stock_threshold=2,
                ))
            else:
                inv.quantity = max(inv.quantity, 15)

            # Customization profile
            if p_data.get("custom_profile"):
                prof_data = p_data["custom_profile"]
                profile = db.query(CustomizationProfile).filter(CustomizationProfile.product_id == prod.id).first()
                if not profile:
                    profile = CustomizationProfile(
                        product_id=prod.id,
                        name=prof_data["name"],
                        supports_front=prof_data.get("supports_front", True),
                        supports_back=prof_data.get("supports_back", False),
                        status=PublishStatus.published,
                        version=1,
                    )
                    db.add(profile)
                    db.flush()
                else:
                    profile.name = prof_data["name"]
                    profile.supports_front = prof_data.get("supports_front", True)
                    profile.supports_back = prof_data.get("supports_back", False)
                    profile.status = PublishStatus.published

                db.query(CustomizationField).filter(CustomizationField.profile_id == profile.id).delete()
                for item in prof_data["fields"]:
                    f_key = item[0]
                    f_lbl = item[1]
                    f_type = item[2]
                    f_req = item[3]
                    f_affects = item[4]
                    f_delta = item[5]
                    f_order = item[6]
                    f_allowed = json.dumps(item[7]) if len(item) > 7 else None
                    db.add(CustomizationField(
                        profile_id=profile.id,
                        key=f_key,
                        label=f_lbl,
                        field_type=f_type,
                        is_required=f_req,
                        affects_price=f_affects,
                        price_delta_paise=f_delta,
                        display_order=f_order,
                        allowed_values=f_allowed,
                    ))

        db.commit()
        print(f"  Successfully seeded all {len(products_data)} PDF catalogue products with specs, attributes, and variants.")

        # 7. Promotional Coupon
        if not db.query(Coupon).filter(Coupon.code == "WELCOME10").first():
            db.add(Coupon(
                code="WELCOME10",
                discount_percent=10,
                max_discount_paise=500000,
                min_order_paise=1000000,
                is_active=True,
                max_uses=500,
            ))
            db.commit()
            print("  Created promotional coupon: WELCOME10")

        # 8. Testimonials & Client Logos
        if db.query(Testimonial).count() == 0:
            testimonials = [
                ("Arun Sundaram", "Taj Vivanta Bengaluru", "The 55-inch Trueview standees in our hotel lobby have transformed guest wayfinding. Robust metal build quality.", 5, 1),
                ("Priya Nambiar", "Phoenix Marketcity", "DisplayDelight delivered our ultra-slim illuminated signage and lollipop boards on time. Clean, crisp illumination.", 5, 2),
            ]
            for author, co, txt, rating, order in testimonials:
                db.add(Testimonial(
                    author_name=author,
                    company=co,
                    text=txt,
                    rating=rating,
                    display_order=order,
                    is_published=True,
                ))

        if db.query(ClientLogo).count() == 0:
            logos = [
                ("Marriott Hotels", "https://upload.wikimedia.org/wikipedia/commons/b/b2/Marriott_Hotels_logo.svg", 1),
                ("Reliance Retail", "https://upload.wikimedia.org/wikipedia/commons/e/e0/Reliance_Retail_logo.svg", 2),
                ("Infosys Campuses", "https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg", 3),
            ]
            for name, url, order in logos:
                db.add(ClientLogo(
                    name=name,
                    logo_url=url,
                    display_order=order,
                    is_published=True,
                ))

        # 9. CMS Pages & Policies
        pages = [
            ("about-us", "About DisplayDelight", "DisplayDelight is India's leading technology provider for commercial digital signage displays, LED fabric frames, tabletop stands, and illuminated lollipop boards.", "About DisplayDelight | Commercial Displays", "Learn about DisplayDelight commercial display engineering."),
            ("privacy-policy", "Privacy Policy", "We adhere to DPDP Act regulations. Customer artwork is strictly isolated in private cloud storage and never shared.", "Privacy Policy | DisplayDelight", "DisplayDelight customer data and privacy policy."),
            ("terms-policy", "Terms of Service", "Standard commercial warranty: 2 years on panel components, 1 year on internal media power modules.", "Terms of Service | DisplayDelight", "Commercial terms and supply conditions."),
            ("refund-policy", "Return & Refund Policy", "Custom fabricated displays and printed artworks are non-refundable once production commences. Damaged in transit units are replaced immediately.", "Refund Policy | DisplayDelight", "DisplayDelight returns policy."),
            ("shipping-policy", "Shipping & Freight Policy", "All commercial shipments are crated in protective packaging and dispatched via insured road freight across India.", "Shipping Policy | DisplayDelight", "Logistics and shipping guidelines."),
        ]
        for slug, title, content, seo_t, seo_d in pages:
            if not db.query(ContentPage).filter(ContentPage.slug == slug).first():
                db.add(ContentPage(
                    slug=slug,
                    title=title,
                    content=content,
                    seo_title=seo_t,
                    seo_description=seo_d,
                    status=PublishStatus.published,
                ))

        # 10. FAQs
        if db.query(Faq).count() == 0:
            faqs = [
                ("What products does DisplayDelight supply?", "We supply LED fabric signage, ultra-slim acrylic frames, T-shaped card stands, LED lollipop boards, rotating lollipop boards, and a full range of E-Series and Trueview digital signage displays for businesses.", "Products", 1),
                ("Can I upload my own artwork?", "Yes. Selected products such as LED Fabric Signage and Lollipop Boards support artwork upload in JPEG, PNG, or PDF format. You can upload and preview your design before placing an order.", "Customization", 2),
                ("Do you provide a quote for custom sizes?", "Absolutely. Use the 'Request a Quote' option on any product page or contact us directly. Our team will respond with pricing and lead times based on your requirements.", "Quotes", 3),
            ]
            for q, a, cat, order in faqs:
                db.add(Faq(question=q, answer=a, category=cat, display_order=order, is_published=True))

        # 11. Homepage Sections
        if db.query(HomepageSection).count() == 0:
            db.add(HomepageSection(
                section_key="hero",
                title="Commercial Displays & Digital Signage",
                subtitle="Light Up. Stand Out. Sell More! Commercial LED signage, illuminated frames, and digital display solutions.",
                image_url="/p/frames.jpg",
                cta_label="Explore Display Catalogue",
                cta_url="/products",
                is_visible=True,
                display_order=1,
                status=PublishStatus.published,
            ))
            db.add(HomepageSection(
                section_key="customizer_banner",
                title="Interactive Signage Customizer",
                subtitle="Configure dimensions, illuminated frames, and upload custom brand artwork in real time.",
                image_url="/p/fabric.jpg",
                cta_label="Launch Studio Customizer",
                cta_url="/studio",
                is_visible=True,
                display_order=2,
                status=PublishStatus.published,
            ))

        # 12. Variant Option Sets
        if db.query(VariantOptionSet).count() == 0:
            variant_sets = [
                ("Frame Thickness", "led-fabric-signage", ["60 mm", "80 mm", "100 mm"], "buttons", True, 1),
                ("Size", "premium-ultra-slim", ["A5", "A4", "A3", "A2", "A1", "BO"], "buttons", True, 2),
                ("Orientation", "premium-ultra-slim", ["Portrait", "Landscape"], "dropdown", False, 3),
                ("Card Size", "card-stands", ["55 x 90 mm", "A7", "A6", "A5", "A4"], "buttons", True, 4),
                ("Shape", "lollipop-boards", ["Round", "Square"], "buttons", True, 5),
                ("Screen Size", "e-series", ["32 in", "43 in", "55 in"], "buttons", True, 6),
                ("Mounting Style", "e-series", ["Wall Mount", "A-Type Floor Mount", "Floor Mount"], "dropdown", True, 7),
                ("Screen Size", "trueview", ["32 in", "43 in", "55 in"], "buttons", True, 8),
                ("Mounting Solution", "trueview", ["Wall Mount", "Floor Mount", "Kiosk"], "dropdown", True, 9),
            ]
            for name, cat_slug, vals, style, req, ord_num in variant_sets:
                db.add(VariantOptionSet(
                    name=name,
                    applies_to_category=cat_slug,
                    values_json=json.dumps(vals),
                    style=style,
                    is_required=req,
                    display_order=ord_num,
                ))
            print("  Seeded variant option sets for all catalogue families.")

        # Re-link any existing review to a new published product if needed
        first_p = db.query(Product).first()
        if first_p:
            db.query(ProductReview).filter(ProductReview.product_id == None).update({ProductReview.product_id: first_p.id})

        db.commit()
        print("\nDisplayDelight V3 Seed completed successfully! Database is populated with genuine catalogue.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
