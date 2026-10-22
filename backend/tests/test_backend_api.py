"""
DisplayDelight V2 — Comprehensive Backend Integration Tests.
Verifies:
1. System Health & Security Headers
2. Authentication (Registration, Login, Protected Me)
3. Catalogue, Categories & Filter sidebar API
4. Cart & Server-Authoritative Pricing Engine (Coupon & GST in paise)
5. Checkout, Razorpay order generation & Payment Verification
6. Order status polling & public tracking
7. Quotations Workflow
8. CMS Content (Home, Policies, FAQs)
9. Admin RBAC Authorization Guards & Analytics
"""
from __future__ import annotations

import uuid
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "timestamp" in data


def test_security_headers(client: TestClient):
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers


def test_auth_workflow(client: TestClient):
    random_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "StrongPassword@2026"

    # Register
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": random_email,
            "password": pwd,
            "full_name": "Test Engineering User",
            "phone": "9876543210",
        },
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == random_email

    # Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": random_email, "password": pwd},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Access current user profile
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == random_email


def test_catalogue_and_categories(client: TestClient):
    # Categories
    cat_res = client.get("/api/v1/categories")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) >= 5

    # Filter metadata for first category
    first_cat = categories[0]["slug"]
    filter_res = client.get(f"/api/v1/categories/{first_cat}/filters")
    assert filter_res.status_code == 200
    assert isinstance(filter_res.json(), list)

    # Products listing
    prod_res = client.get("/api/v1/products")
    assert prod_res.status_code == 200
    prods_data = prod_res.json()
    assert "items" in prods_data
    assert len(prods_data["items"]) >= 5

    # Single product detail
    product_slug = prods_data["items"][0]["slug"]
    detail_res = client.get(f"/api/v1/products/{product_slug}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["slug"] == product_slug
    assert "base_price_paise" in detail


def test_cart_and_authoritative_pricing(client: TestClient):
    session_id = f"test_session_{uuid.uuid4().hex[:8]}"

    # Get products to find a purchasable one
    prods = client.get("/api/v1/products").json()["items"]
    purchasable = [p for p in prods if p.get("base_price_paise") is not None][0]

    # Add to cart
    add_res = client.post(
        "/api/v1/cart",
        json={
            "product_id": purchasable["id"],
            "quantity": 2,
            "options": {"finish_color": "#1A1A1A"},
        },
        headers={"X-Session-ID": session_id},
    )
    assert add_res.status_code == 200
    cart_data = add_res.json()
    assert len(cart_data["items"]) == 1
    assert cart_data["items"][0]["quantity"] == 2
    assert cart_data["totals"]["subtotal_paise"] == purchasable["base_price_paise"] * 2

    # Apply Coupon WELCOME10
    coupon_res = client.post(
        "/api/v1/cart/coupon",
        json={"code": "WELCOME10"},
        headers={"X-Session-ID": session_id},
    )
    assert coupon_res.status_code == 200
    coupon_data = coupon_res.json()
    assert coupon_data["coupon_code"] == "WELCOME10"
    assert coupon_data["totals"]["discount_paise"] > 0

    # Server price calculation
    price_res = client.post(
        "/api/v1/cart/price",
        headers={"X-Session-ID": session_id},
    )
    assert price_res.status_code == 200
    assert "price_token" in price_res.json()


def test_checkout_and_payment_flow(client: TestClient):
    session_id = f"test_sess_{uuid.uuid4().hex[:8]}"

    # 1. Add item to cart
    prods = client.get("/api/v1/products").json()["items"]
    purchasable = [p for p in prods if p.get("base_price_paise") is not None][0]

    client.post(
        "/api/v1/cart",
        json={"product_id": purchasable["id"], "quantity": 1},
        headers={"X-Session-ID": session_id},
    )

    # 2. Checkout
    checkout_res = client.post(
        "/api/v1/checkout",
        json={
            "customer_name": "Vikram Adithya",
            "customer_email": "vikram@enterprise.in",
            "customer_phone": "9876543210",
            "billing_address": {
                "full_name": "Vikram Adithya",
                "phone": "9876543210",
                "address_line1": "Tech Park Phase 1",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pin_code": "560100",
                "country": "India",
            },
            "shipping_address": {
                "full_name": "Vikram Adithya",
                "phone": "9876543210",
                "address_line1": "Tech Park Phase 1",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pin_code": "560100",
                "country": "India",
            },
            "notes": "Gate 3 delivery access",
        },
        headers={"X-Session-ID": session_id},
    )
    assert checkout_res.status_code == 200, checkout_res.text
    order_data = checkout_res.json()
    order_ref = order_data["order_reference"]
    rzp_order_id = order_data["razorpay_order_id"]
    assert order_ref.startswith("DD-")
    assert rzp_order_id != ""

    # 3. Poll payment status
    status_res = client.get(f"/api/v1/orders/{order_ref}/status")
    assert status_res.status_code == 200
    assert status_res.json()["order_status"] == "pending_payment"

    # 4. Verify payment callback
    verify_res = client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": f"pay_test_{uuid.uuid4().hex[:10]}",
            "razorpay_signature": "simulated_signature",
            "order_reference": order_ref,
        },
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["payment_status"] == "captured"
    assert verify_res.json()["order_status"] == "paid"

    # 5. Public order tracking
    track_res = client.post(
        "/api/v1/orders/track",
        json={"order_reference": order_ref, "email": "vikram@enterprise.in"},
    )
    assert track_res.status_code == 200
    assert track_res.json()["status"] == "paid"


def test_quotations_submission(client: TestClient):
    quote_res = client.post(
        "/api/v1/quotes",
        json={
            "contact_name": "Ananya Sharma",
            "business_name": "Metro Retailers Ltd",
            "email": "ananya@metroretail.in",
            "phone": "9988776655",
            "city": "Mumbai",
            "state": "Maharashtra",
            "quantity": 4,
            "notes": "Looking for custom 65-inch outdoor kiosks with high-bright panels.",
        },
    )
    assert quote_res.status_code == 200
    quote = quote_res.json()
    assert quote["reference"].startswith("QT-")
    assert quote["status"] == "submitted"


def test_cms_and_faqs(client: TestClient):
    # Homepage
    home_res = client.get("/api/v1/home")
    assert home_res.status_code == 200
    home = home_res.json()
    assert len(home["sections"]) >= 1
    assert len(home["categories"]) >= 1
    assert len(home["testimonials"]) >= 1
    assert len(home["client_logos"]) >= 1

    # Policies
    pol_res = client.get("/api/v1/policies/privacy-policy")
    assert pol_res.status_code == 200
    assert "privacy" in pol_res.json()["slug"].lower()

    # FAQs
    faq_res = client.get("/api/v1/faqs")
    assert faq_res.status_code == 200
    assert len(faq_res.json()) >= 1


def test_admin_rbac_and_analytics(client: TestClient):
    # 1. Customer token should be rejected on admin analytics
    cust_login = client.post(
        "/api/v1/auth/login",
        json={"email": "customer@displaydelight.in", "password": "Customer@123456"},
    )
    assert cust_login.status_code == 200
    cust_token = cust_login.json()["access_token"]

    forbidden_res = client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert forbidden_res.status_code == 403

    # 2. Admin token should succeed
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    admin_res = client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_res.status_code == 200
    metrics = admin_res.json()
    assert "revenue" in metrics
    assert "orders" in metrics
    assert "catalogue" in metrics


def test_admin_categories_and_variants(client: TestClient):
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Admin categories list
    cats_res = client.get("/api/v1/admin/categories", headers=headers)
    assert cats_res.status_code == 200
    cats = cats_res.json()
    assert len(cats) >= 5

    # 2. Admin create category
    test_slug = f"test-cat-{uuid.uuid4().hex[:6]}"
    create_cat_res = client.post(
        "/api/v1/admin/categories",
        headers=headers,
        json={
            "name": "Holographic 3D Displays",
            "slug": test_slug,
            "description": "High-framerate spinning LED fan 3D holographic display rotors.",
            "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475",
            "visible": True,
        },
    )
    assert create_cat_res.status_code == 200
    created_cat = create_cat_res.json()["category"]
    cat_id = created_cat["id"]

    # 3. Storefront sees new category
    store_cats = client.get("/api/v1/categories").json()
    assert any(c["slug"] == test_slug for c in store_cats)

    # 4. Update category
    up_cat_res = client.put(
        f"/api/v1/admin/categories/{cat_id}",
        headers=headers,
        json={"name": "Holographic 3D Fans & Rotors", "visible": True},
    )
    assert up_cat_res.status_code == 200

    # 5. Delete category
    del_cat_res = client.delete(f"/api/v1/admin/categories/{cat_id}", headers=headers)
    assert del_cat_res.status_code == 200

    # 6. Admin Variants / Option Sets
    var_list_res = client.get("/api/v1/admin/variants", headers=headers)
    assert var_list_res.status_code == 200
    vars_list = var_list_res.json()
    assert len(vars_list) >= 6

    # 7. Create Variant Option Set
    create_var_res = client.post(
        "/api/v1/admin/variants",
        headers=headers,
        json={
            "name": "Rotor Diameter",
            "applies": "holographic-displays",
            "values": ["50cm", "65cm", "100cm"],
            "style": "buttons",
            "required": True,
        },
    )
    assert create_var_res.status_code == 200
    var_id = create_var_res.json()["item"]["id"]

    # 8. Storefront variants API returns option set
    store_vars = client.get("/api/v1/variants?category_id=holographic-displays").json()
    assert any(v["name"] == "Rotor Diameter" for v in store_vars)

    # 9. Delete Variant Option Set
    del_var_res = client.delete(f"/api/v1/admin/variants/{var_id}", headers=headers)
    assert del_var_res.status_code == 200


def test_admin_products_crud_and_storefront_sync(client):
    """Verify admin product creation, update, detail lookup, inventory, and storefront sync."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Admin lists products
    res = client.get("/api/v1/admin/products", headers=headers)
    assert res.status_code == 200
    prods = res.json()["items"]
    assert len(prods) >= 1

    # 2. Admin creates a new product
    test_sku = f"DD-TEST-{uuid.uuid4().hex[:4].upper()}"
    test_slug = f"test-smart-kiosk-{uuid.uuid4().hex[:4]}"
    create_payload = {
        "name": "Ultra Smart Interactive Kiosk",
        "sku": test_sku,
        "slug": test_slug,
        "short_description": "Interactive 4K Android kiosk with touch screen.",
        "description": "Commercial kiosk built for retail stores with camera and NFC reader.",
        "base_price_paise": 7500000,  # ₹75,000
        "category_id": "digital-standees",
        "kind": "standard",
        "status": "published",
        "is_featured": True,
        "images": [
            "https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80"
        ],
        "specs": [
            ["Display Size", "55-inch"],
            ["Touch Points", "10-point capacitive"],
        ],
        "stock": 15,
    }
    create_res = client.post("/api/v1/admin/products", headers=headers, json=create_payload)
    assert create_res.status_code == 200
    prod_id = create_res.json()["product_id"]

    # 3. Admin gets product detail by ID and by slug
    get_by_id = client.get(f"/api/v1/admin/products/{prod_id}", headers=headers)
    assert get_by_id.status_code == 200
    assert get_by_id.json()["sku"] == test_sku

    get_by_slug = client.get(f"/api/v1/admin/products/{test_slug}", headers=headers)
    assert get_by_slug.status_code == 200
    assert get_by_slug.json()["name"] == "Ultra Smart Interactive Kiosk"
    assert get_by_slug.json()["stock"] == 15

    # 4. Storefront immediately sees the new product in public catalogue
    store_prods = client.get(f"/api/v1/products?q={test_sku}").json()
    assert any(p["sku"] == test_sku for p in store_prods["items"])
    found_item = next(p for p in store_prods["items"] if p["sku"] == test_sku)
    assert found_item["category_slug"] == "digital-standees"

    # 5. Storefront product detail page returns correct specs & category
    store_detail = client.get(f"/api/v1/products/{test_slug}").json()
    assert store_detail["name"] == "Ultra Smart Interactive Kiosk"
    assert store_detail["category_slug"] == "digital-standees"
    assert len(store_detail["specs"]) == 2

    # 6. Admin updates product price, name, and unpublishes to draft
    update_res = client.put(
        f"/api/v1/admin/products/{test_slug}",
        headers=headers,
        json={
            "name": "Ultra Smart Interactive Kiosk Pro",
            "base_price_paise": 8500000,  # ₹85,000
            "status": "draft",
        },
    )
    assert update_res.status_code == 200

    # 7. Storefront should NO LONGER show the draft product in published list
    store_draft = client.get(f"/api/v1/products?q={test_sku}").json()
    assert not any(p["sku"] == test_sku for p in store_draft["items"])

    # 8. Clean up: Delete / archive test product
    del_res = client.delete(f"/api/v1/admin/products/{prod_id}", headers=headers)
    assert del_res.status_code == 200


def test_reviews_workflow_and_moderation(client: TestClient):
    # 1. Admin login to obtain token
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get first product
    prods = client.get("/api/v1/products").json()["items"]
    assert len(prods) > 0
    prod_id = prods[0]["id"]

    # 3. Customer submits a new review
    submit_res = client.post(
        f"/api/v1/products/{prod_id}/reviews",
        json={
            "rating": 5,
            "author_name": "Kavitha Raman",
            "company": "Kavitha Jewelers",
            "title": "Stunning high-res display for our storefront",
            "body": "The vibrant colors and crisp details really highlight our jewelry collection. Installation was fast.",
        },
    )
    assert submit_res.status_code == 200
    review_data = submit_res.json()
    assert review_data["status"] == "pending_moderation"
    review_id = review_data["id"]

    # 4. Review should NOT yet appear in public published list
    pub_reviews = client.get(f"/api/v1/products/{prod_id}/reviews").json()
    assert not any(r["id"] == review_id for r in pub_reviews)

    # 5. Admin lists pending reviews and finds the newly submitted one
    admin_pending = client.get("/api/v1/admin/reviews?status=pending", headers=admin_headers).json()
    assert any(r["id"] == review_id for r in admin_pending)

    # 6. Admin approves the review
    approve_res = client.patch(
        f"/api/v1/admin/reviews/{review_id}",
        headers=admin_headers,
        json={"status": "published"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["review_status"] == "published"

    # 7. Storefront now displays the approved review
    pub_after = client.get(f"/api/v1/products/{prod_id}/reviews").json()
    assert any(r["id"] == review_id for r in pub_after)
    matched = next(r for r in pub_after if r["id"] == review_id)
    assert matched["author_name"] == "Kavitha Raman"
    assert matched["rating"] == 5

    # 8. Clean up: Admin deletes test review
    del_res = client.delete(f"/api/v1/admin/reviews/{review_id}", headers=admin_headers)
    assert del_res.status_code == 200


def test_v3_payment_first_checkout_workflow(client: TestClient):
    session_id = f"sess_pfirst_{uuid.uuid4().hex[:8]}"

    # 1. Fetch purchasable product and add to cart
    cat_res = client.get("/api/v1/products?limit=10")
    assert cat_res.status_code == 200
    items = cat_res.json()["items"]
    purchasable = [p for p in items if p.get("base_price_paise") is not None][0]
    prod_id = purchasable["id"]

    add_res = client.post(
        "/api/v1/cart",
        json={"product_id": prod_id, "quantity": 1},
        headers={"X-Session-ID": session_id},
    )
    assert add_res.status_code == 200

    # 2. Initiate Payment-First Checkout without prior contact or billing forms
    checkout_res = client.post(
        "/api/v1/checkout",
        json={},
        headers={"X-Session-ID": session_id},
    )
    assert checkout_res.status_code == 200, checkout_res.text
    ch_data = checkout_res.json()
    order_ref = ch_data["order_reference"]
    rzp_order_id = ch_data["razorpay_order_id"]
    assert order_ref.startswith("DD-")
    assert rzp_order_id != ""

    # 3. Simulate payment verification
    verify_res = client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:10]}",
            "razorpay_signature": "simulated_signature",
            "order_reference": order_ref,
        },
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["payment_status"] == "captured"
    assert v_data["order_status"] == "paid_details_pending"
    assert v_data["details_pending"] is True

    # 4. Check details-pending status endpoint
    pending_check = client.get(f"/api/v1/orders/{order_ref}/details-pending")
    assert pending_check.status_code == 200
    assert pending_check.json()["details_pending"] is True
    assert pending_check.json()["status"] == "paid_details_pending"

    # 5. Customer fills and submits post-payment delivery details
    new_cust_email = f"postpay_{uuid.uuid4().hex[:6]}@example.com"
    cust_details_res = client.post(
        f"/api/v1/orders/{order_ref}/customer-details",
        json={
            "customer_name": "Siddharth Verma",
            "customer_email": new_cust_email,
            "customer_phone": "9811223344",
            "billing_address": {
                "full_name": "Siddharth Verma",
                "phone": "9811223344",
                "address_line1": "Plot 42, Electronics City",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pin_code": "560100",
                "country": "India",
            },
            "shipping_address": {
                "full_name": "Siddharth Verma",
                "phone": "9811223344",
                "address_line1": "Plot 42, Electronics City",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pin_code": "560100",
                "country": "India",
            },
            "company_name": "Verma Visuals Pvt Ltd",
            "gstin": "29ABCDE1234F1Z5",
            "notes": "Deliver during office hours 10am to 5pm",
            "create_account": True,
            "password": "CustomerSecure@2026",
        },
    )
    assert cust_details_res.status_code == 200, cust_details_res.text
    details_res_data = cust_details_res.json()
    assert details_res_data["status"] == "success"
    assert details_res_data["order_status"] == "paid"

    # 6. Check that details are no longer pending
    pending_check_after = client.get(f"/api/v1/orders/{order_ref}/details-pending")
    assert pending_check_after.status_code == 200
    assert pending_check_after.json()["details_pending"] is False
    assert pending_check_after.json()["status"] == "paid"
    assert pending_check_after.json()["customer_name"] == "Siddharth Verma"

    # 7. Verify the customer can log in with the newly created account
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": new_cust_email, "password": "CustomerSecure@2026"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_video_and_instagram_embed_system(client: TestClient):
    # 1. Admin login to obtain token
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Instagram URL validator endpoint with valid reel
    val_res = client.post(
        "/api/v1/admin/content/validate-instagram",
        headers=admin_headers,
        json={"url": "https://www.instagram.com/reel/C8qXYZ123abc/?utm_source=ig_web_copy_link"},
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["shortcode"] == "C8qXYZ123abc"
    assert val_data["embed_url"] == "https://www.instagram.com/p/C8qXYZ123abc/embed/"

    # 3. Test Instagram URL validation rejection on unauthorized domain / scraper
    bad_scraper = client.post(
        "/api/v1/admin/content/validate-instagram",
        headers=admin_headers,
        json={"url": "https://scraped-insta-video-downloader.net/vid/12345.mp4"},
    )
    assert bad_scraper.status_code == 422
    assert "Invalid Instagram URL" in bad_scraper.json()["error"]

    # 4. Admin creates an Instagram reel gallery item
    create_insta = client.post(
        "/api/v1/admin/content/gallery",
        headers=admin_headers,
        json={
            "title": "Interactive Kiosk In-Store Reel",
            "type": "Instagram",
            "src": "https://www.instagram.com/reel/C9_TestReel456/",
            "thumbnail_url": "/p/i-standee.jpg",
            "placement": "both",
            "cat": "Installations",
            "prod": "i-type-standee",
            "on": True,
            "order": 10,
        },
    )
    assert create_insta.status_code == 200
    insta_id = create_insta.json()["id"]

    # 5. Admin creates a Video item with Cloudflare Stream / YouTube URL
    create_video = client.post(
        "/api/v1/admin/content/gallery",
        headers=admin_headers,
        json={
            "title": "Ultra-slim Light Box Demonstration",
            "type": "Video",
            "src": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "thumbnail_url": "/p/ultraslim.jpg",
            "placement": "homepage",
            "cat": "Products",
            "prod": "ultra-slim",
            "on": True,
            "order": 11,
        },
    )
    assert create_video.status_code == 200
    video_id = create_video.json()["id"]

    # 6. Verify public gallery listing includes embed_url and placement
    gallery_res = client.get("/api/v1/gallery")
    assert gallery_res.status_code == 200
    gallery_items = gallery_res.json()

    # Find created Instagram item
    insta_item = next((item for item in gallery_items if item["id"] == insta_id), None)
    assert insta_item is not None
    assert insta_item["media_type"] == "instagram"
    assert insta_item["embed_url"] == "https://www.instagram.com/p/C9_TestReel456/embed/"
    assert insta_item["placement"] == "both"

    # 7. Check homepage aggregated API includes gallery items with embed_url
    home_res = client.get("/api/v1/home")
    assert home_res.status_code == 200
    home_gallery = home_res.json().get("gallery", [])
    assert any(item["id"] == insta_id for item in home_gallery)
    assert any(item["id"] == video_id for item in home_gallery)

    # 8. Clean up created test items
    client.delete(f"/api/v1/admin/content/gallery/{insta_id}", headers=admin_headers)
    client.delete(f"/api/v1/admin/content/gallery/{video_id}", headers=admin_headers)


def test_cloudflare_storage_and_durable_fallback_system(client: TestClient):
    # 1. Check public storage status endpoint
    st_res = client.get("/api/v1/uploads/status")
    assert st_res.status_code == 200
    st_data = st_res.json()
    assert "active_mode" in st_data
    assert "local_storage" in st_data
    assert st_data["local_storage"]["healthy"] is True
    assert st_data["local_storage"]["writable"] is True

    # 2. Admin login to test storage admin endpoints
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 3. Admin storage status
    adm_st = client.get("/api/v1/admin/settings/storage-status", headers=admin_headers)
    assert adm_st.status_code == 200
    adm_data = adm_st.json()
    assert adm_data["local_storage"]["status"] == "healthy"
    assert "r2" in adm_data
    assert "images" in adm_data
    assert "stream" in adm_data

    # 4. Admin test storage providers
    t_local = client.post("/api/v1/admin/settings/test-storage", headers=admin_headers, json={"provider": "local"})
    assert t_local.status_code == 200
    assert t_local.json()["status"] == "ok"
    assert t_local.json()["writable"] is True

    t_r2 = client.post("/api/v1/admin/settings/test-storage", headers=admin_headers, json={"provider": "r2"})
    assert t_r2.status_code == 200
    assert t_r2.json()["status"] in ("ok", "fallback_active")

    t_img = client.post("/api/v1/admin/settings/test-storage", headers=admin_headers, json={"provider": "images"})
    assert t_img.status_code == 200
    assert t_img.json()["status"] in ("ok", "fallback_active")

    t_stream = client.post("/api/v1/admin/settings/test-storage", headers=admin_headers, json={"provider": "stream"})
    assert t_stream.status_code == 200
    assert t_stream.json()["status"] in ("ok", "fallback_active")

    # 5. Direct artwork upload with valid PNG file
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    up_res = client.post(
        "/api/v1/uploads/artwork",
        files={"file": ("client_logo.png", fake_png, "image/png")},
    )
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["status"] == "ready"
    assert up_data["url"].startswith("/uploads/")
    assert "file_id" in up_data

    # 6. Reject file with MIME/extension mismatch or disallowed type
    bad_up = client.post(
        "/api/v1/uploads/artwork",
        files={"file": ("malicious.exe", b"MZexecutable", "application/x-msdownload")},
    )
    assert bad_up.status_code == 422
    assert "Unsupported file type" in bad_up.json()["error"]

    # 7. Reject SVG with embedded malicious scripts
    bad_svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert('xss')</script></svg>"
    svg_res = client.post(
        "/api/v1/uploads/artwork",
        files={"file": ("injected.svg", bad_svg, "image/svg+xml")},
    )
    assert svg_res.status_code == 422
    assert "disallowed executable scripts" in svg_res.json()["error"]

    # 8. Clean SVG upload succeeds
    clean_svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>"
    clean_svg_res = client.post(
        "/api/v1/uploads/artwork",
        files={"file": ("clean_icon.svg", clean_svg, "image/svg+xml")},
    )
    assert clean_svg_res.status_code == 200
    assert clean_svg_res.json()["status"] == "ready"

    # 9. Test signed upload and direct upload workflow
    sign_res = client.post(
        "/api/v1/uploads/sign",
        json={"filename": "poster.jpg", "mime_type": "image/jpeg", "size_bytes": 1024},
    )
    assert sign_res.status_code == 200
    sign_data = sign_res.json()
    file_id = sign_data["file_id"]
    upload_url = sign_data["upload_url"]
    assert file_id is not None
    assert "/api/v1/uploads/direct/" in upload_url

    # Complete direct upload
    direct_res = client.post(
        f"/api/v1/uploads/direct/{file_id}",
        files={"file": ("poster.jpg", b"fake_jpeg_content_bytes", "image/jpeg")},
    )
    assert direct_res.status_code == 200
    view_url = direct_res.json()["view_url"]
    assert "/api/v1/uploads/view?key=" in view_url

    # Verify download via signed URL
    dl_res = client.get(view_url)
    assert dl_res.status_code == 200
    assert dl_res.content == b"fake_jpeg_content_bytes"
    assert dl_res.headers.get("x-content-type-options") == "nosniff"

    # Verify tampered signature fails
    tampered_url = view_url + "tampered"
    tamper_res = client.get(tampered_url)
    assert tamper_res.status_code == 403


def test_interactive_customization_builder_and_order_snapshots(client: TestClient):
    # 1. Admin login
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get an existing standard product to attach customization profile
    prod_res = client.get("/api/v1/products")
    assert prod_res.status_code == 200
    products = prod_res.json()["items"]
    target_product = next((p for p in products if p.get("price") and p["price"] > 0), products[0])
    prod_id = target_product["id"]

    # 3. Admin creates a dual-sided customization profile with conditional visibility and price add-ons
    profile_payload = {
        "name": f"Dual-Sided Dynamic Studio Profile {prod_id[:6]}",
        "product_id": prod_id,
        "status": "published",
        "supports_front": True,
        "supports_back": True,
        "fields": [
            {
                "key": "sides",
                "label": "Display Sides",
                "type": "dropdown",
                "required": True,
                "def": "Single-sided",
                "options": [
                    {"label": "Single-sided", "price": 0},
                    {"label": "Double-sided", "price": 500},
                ],
            },
            {
                "key": "front_text",
                "label": "Front Message Header",
                "type": "text",
                "required": True,
                "min_length": 3,
                "max_length": 40,
            },
            {
                "key": "back_artwork",
                "label": "Reverse Side Graphic",
                "type": "upload",
                "required": True,
                "cond_field": "sides",
                "cond_op": "equals",
                "cond_val": "Double-sided",
            },
            {
                "key": "neon_border",
                "label": "Neon Border Backlight",
                "type": "checkbox",
                "price": 250,
            },
        ],
    }

    create_prof_res = client.post(
        "/api/v1/admin/customization-profiles",
        headers=admin_headers,
        json=profile_payload,
    )
    assert create_prof_res.status_code == 200
    prof_id = create_prof_res.json()["profile_id"]
    assert prof_id is not None

    # 4. Fetch detail via Admin API to verify persistence of visibility rules and options
    adm_get = client.get(f"/api/v1/admin/customization-profiles/{prof_id}", headers=admin_headers)
    assert adm_get.status_code == 200
    adm_prof = adm_get.json()
    assert adm_prof["supports_back"] is True
    assert len(adm_prof["fields"]) == 4

    back_art_field = next(f for f in adm_prof["fields"] if f["key"] == "back_artwork")
    assert back_art_field["condField"] == "sides"
    assert back_art_field["condVal"] == "Double-sided"

    # 5. Customer fetches customization profile from storefront
    storefront_prof = client.get(f"/api/v1/products/{prod_id}/customization")
    assert storefront_prof.status_code == 200
    sf_data = storefront_prof.json()
    assert sf_data["supports_back"] is True
    assert len(sf_data["fields"]) == 4

    # 6. Customer tests validation: Single-sided with NO back artwork (Must succeed because back artwork is conditionally hidden)
    val_single = client.post(
        f"/api/v1/products/{prod_id}/customization/validate",
        json={
            "configuration": {
                "sides": "Single-sided",
                "front_text": "Grand Opening",
            }
        },
    )
    assert val_single.status_code == 200
    assert val_single.json()["valid"] is True
    assert len(val_single.json()["errors"]) == 0

    # 7. Customer tests validation: Double-sided with NO back artwork (Must fail because back artwork is required when Double-sided)
    val_double_missing = client.post(
        f"/api/v1/products/{prod_id}/customization/validate",
        json={
            "configuration": {
                "sides": "Double-sided",
                "front_text": "Grand Opening",
            }
        },
    )
    assert val_double_missing.status_code == 200
    assert val_double_missing.json()["valid"] is False
    assert "back_artwork" in val_double_missing.json()["errors"]

    # 8. Customer tests validation: Double-sided with back artwork (Must pass)
    val_double_valid = client.post(
        f"/api/v1/products/{prod_id}/customization/validate",
        json={
            "configuration": {
                "sides": "Double-sided",
                "front_text": "Grand Opening",
                "back_artwork": "/uploads/back_side_logo.png",
                "neon_border": True,
            }
        },
    )
    assert val_double_valid.status_code == 200
    assert val_double_valid.json()["valid"] is True

    # 9. Server pricing calculation with customization add-ons:
    # Double-sided option delta (+₹500 = 50000 paise) + neon_border (+₹250 = 25000 paise) = +75000 paise
    calc_res = client.post(
        "/api/v1/cart/price",
        json={
            "items": [
                {
                    "product_id": prod_id,
                    "quantity": 1,
                    "options": {
                        "sides": "Double-sided",
                        "front_text": "Grand Opening",
                        "back_artwork": "/uploads/back_side_logo.png",
                        "neon_border": True,
                    },
                }
            ]
        },
    )
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert len(calc_data["lines"]) == 1
    line = calc_data["lines"][0]
    base_paise = target_product.get("base_price_paise") or int(target_product["price"] * 100)
    assert line["unit_price_paise"] == base_paise + 75000


    # 10. Checkout with customized product and dual-side snapshots
    checkout_payload = {
        "customer_email": "customizer@enterprise.in",
        "customer_phone": "9840327440",
        "customer_name": "Rohan Designer",
        "shipping_address": {
            "full_name": "Rohan Designer",
            "phone": "9840327440",
            "address_line1": "45 Commercial Tech Park, Whitefield",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560066",
            "country": "India",
        },
        "billing_address": {
            "full_name": "Rohan Designer",
            "phone": "9840327440",
            "address_line1": "45 Commercial Tech Park, Whitefield",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560066",
            "country": "India",
        },
        "items": [
            {
                "product_id": prod_id,
                "quantity": 2,
                "options": {
                    "sides": "Double-sided",
                    "front_text": "Welcome to DisplayDelight",
                    "back_artwork": "/uploads/back_side_logo.png",
                    "neon_border": True,
                },
                "artwork": "/uploads/front_side_logo.png",
            }
        ],
    }

    checkout_res = client.post("/api/v1/checkout", json=checkout_payload)
    assert checkout_res.status_code == 200
    chk_data = checkout_res.json()
    order_ref = chk_data["order_reference"]
    assert order_ref is not None

    # 11. Verify Order Item snapshots via Admin Orders API
    ord_get = client.get(f"/api/v1/admin/orders/{order_ref}", headers=admin_headers)
    assert ord_get.status_code == 200
    order_data = ord_get.json()
    assert len(order_data["items"]) == 1
    order_item = order_data["items"][0]

    # Verify immutable configuration and artwork snapshots
    assert order_item["artwork_url"] == "/uploads/front_side_logo.png"
    cfg = order_item.get("configuration")
    if isinstance(cfg, str):
        cfg = json.loads(cfg)
    assert cfg["sides"] == "Double-sided"
    assert cfg["front_text"] == "Welcome to DisplayDelight"
    assert cfg["back_artwork"] == "/uploads/back_side_logo.png"
    assert cfg["neon_border"] is True


def test_customer_reviews_moderation_workflow(client: TestClient):
    # 1. Admin login
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get a product to review
    prod_res = client.get("/api/v1/products")
    assert prod_res.status_code == 200
    prod_id = prod_res.json()["items"][0]["id"]

    # 3. Storefront: submit customer review
    review_res = client.post(
        f"/api/v1/products/{prod_id}/reviews",
        json={
            "author_name": "Arjun Sundaram",
            "company": "Metro Retailers",
            "rating": 5,
            "title": "Outstanding Brightness and Finish",
            "body": "The ultra-slim magnetic light boxes transformed our flagship store entrance. Flawless build quality.",
        },
    )
    assert review_res.status_code == 200
    rev_data = review_res.json()
    assert rev_data["status"] == "pending_moderation"
    review_id = rev_data["id"]
    assert review_id is not None

    # 4. Public storefront should NOT display pending review yet
    public_revs = client.get(f"/api/v1/products/{prod_id}/reviews")
    assert public_revs.status_code == 200
    rev_ids = [r["id"] for r in public_revs.json()]
    assert review_id not in rev_ids

    # 5. Admin lists reviews filtered by status='pending'
    adm_revs = client.get("/api/v1/admin/reviews?status=pending", headers=admin_headers)
    assert adm_revs.status_code == 200
    pending_ids = [r["id"] for r in adm_revs.json()]
    assert review_id in pending_ids

    # 6. Admin approves review
    mod_res = client.patch(
        f"/api/v1/admin/reviews/{review_id}",
        headers=admin_headers,
        json={"status": "published"},
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["review_status"] == "published"

    # 7. Public storefront NOW displays the published review
    public_revs_after = client.get(f"/api/v1/products/{prod_id}/reviews")
    assert public_revs_after.status_code == 200
    matching = [r for r in public_revs_after.json() if r["id"] == review_id]
    assert len(matching) == 1
    assert matching[0]["rating"] == 5
    assert matching[0]["author_name"] == "Arjun Sundaram"
    assert matching[0]["title"] == "Outstanding Brightness and Finish"

    # 8. Admin rejects / unpublishes review
    reject_res = client.patch(
        f"/api/v1/admin/reviews/{review_id}",
        headers=admin_headers,
        json={"status": "rejected"},
    )
    assert reject_res.status_code == 200

    # 9. Verify it's no longer public
    public_revs_unpub = client.get(f"/api/v1/products/{prod_id}/reviews")
    assert review_id not in [r["id"] for r in public_revs_unpub.json()]

    # 10. Admin deletes review permanently
    del_res = client.delete(f"/api/v1/admin/reviews/{review_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"


def test_companion_devices_and_push_workflow(client: TestClient):
    # 1. Admin login
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@displaydelight.in", "password": "Admin@DisplayDelight2026!"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 2. Register Android companion device
    android_token = f"fcm_test_{uuid.uuid4().hex[:12]}"
    reg_android = client.post(
        "/api/v1/admin/devices/register",
        headers=admin_headers,
        json={
            "device_token": android_token,
            "platform": "android",
            "device_name": "Warehouse Scanner Tablet",
            "app_version": "3.1.0",
        },
    )
    assert reg_android.status_code == 200, reg_android.text
    android_data = reg_android.json()
    assert android_data["status"] == "success"
    assert android_data["platform"] == "android"
    assert android_data["is_active"] is True
    android_device_id = android_data["device_id"]

    # 3. Register iOS companion device via notifications/devices endpoint
    ios_token = f"apns_test_{uuid.uuid4().hex[:12]}"
    reg_ios = client.post(
        "/api/v1/admin/notifications/devices/register",
        headers=admin_headers,
        json={
            "device_token": ios_token,
            "platform": "ios",
            "device_name": "Admin Field iPhone",
            "app_version": "3.1.0",
        },
    )
    assert reg_ios.status_code == 200, reg_ios.text
    ios_data = reg_ios.json()
    assert ios_data["status"] == "success"
    assert ios_data["platform"] == "ios"
    ios_device_id = ios_data["device_id"]

    # 4. List devices and verify both are active
    devices_res = client.get("/api/v1/admin/devices", headers=admin_headers)
    assert devices_res.status_code == 200
    device_list = devices_res.json()
    tokens = [d["device_token"] for d in device_list]
    assert android_token in tokens
    assert ios_token in tokens

    # 5. Dispatch test push alert to companion devices
    test_push_res = client.post(
        "/api/v1/admin/notifications/test-push",
        headers=admin_headers,
        json={
            "title": "High Priority Fabricator Alert",
            "body": "Rush acrylic neon signage order confirmed for Bengaluru store.",
        },
    )
    assert test_push_res.status_code == 200, test_push_res.text
    push_data = test_push_res.json()
    assert push_data["status"] == "delivered"
    assert push_data["dispatched_count"] >= 2

    # 6. Check delivery audit logs
    deliv_res = client.get("/api/v1/admin/notifications/deliveries", headers=admin_headers)
    assert deliv_res.status_code == 200
    deliveries = deliv_res.json()
    push_deliveries = [
        d for d in deliveries
        if d["channel"] == "push" and d["title"] == "High Priority Fabricator Alert"
    ]
    assert len(push_deliveries) >= 2
    assert all(d["status"] == "delivered" for d in push_deliveries)

    # 7. Check unread notification count endpoint
    unread_res = client.get("/api/v1/admin/notifications/unread-count", headers=admin_headers)
    assert unread_res.status_code == 200
    assert "unread_count" in unread_res.json()
    assert isinstance(unread_res.json()["unread_count"], int)

    # 8. Deactivate companion device
    deact_res = client.post(
        f"/api/v1/admin/devices/{android_device_id}/deactivate",
        headers=admin_headers,
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # 9. Verify listing reflects deactivated state
    devices_after = client.get("/api/v1/admin/devices", headers=admin_headers).json()
    deact_dev = next(d for d in devices_after if d["id"] == android_device_id)
    assert deact_dev["is_active"] is False








