"""
Test storefront synchronization with CMS content and Admin configurations.
"""
import requests
import json

BASE = "http://127.0.0.1:8001/api/v1"

def test_storefront():
    print("Testing storefront CMS endpoints...")
    
    # 1. Homepage
    r = requests.get(f"{BASE}/home")
    assert r.status_code == 200, f"Failed /home: {r.status_code}"
    home = r.json()
    print("[PASS] /home returned 200 OK")
    print(f"  - Sections visibility keys: {list(home.get('sections_visibility', {}).keys())}")
    print(f"  - Featured products count: {len(home.get('featured_products', []))}")
    print(f"  - Categories count: {len(home.get('categories', []))}")
    print(f"  - Testimonials count: {len(home.get('testimonials', []))}")
    print(f"  - Client logos count: {len(home.get('client_logos', []))}")
    print(f"  - Industries count: {len(home.get('industries', []))}")
    print(f"  - Gallery count: {len(home.get('gallery', []))}")
    
    # 2. Navigation
    r = requests.get(f"{BASE}/navigation")
    assert r.status_code == 200, f"Failed /navigation: {r.status_code}"
    nav = r.json()
    print("[PASS] /navigation returned 200 OK")
    print(f"  - Header items: {len(nav.get('header', []))}")
    print(f"  - Footer items: {len(nav.get('footer', []))}")
    
    # 3. Industries
    r = requests.get(f"{BASE}/industries")
    assert r.status_code == 200, f"Failed /industries: {r.status_code}"
    inds = r.json()
    print(f"[PASS] /industries returned 200 OK ({len(inds)} industries)")
    
    # 4. Footer
    r = requests.get(f"{BASE}/footer")
    assert r.status_code == 200, f"Failed /footer: {r.status_code}"
    footer = r.json()
    print("[PASS] /footer returned 200 OK")
    print(f"  - Active policies: {footer.get('pol')}")
    print(f"  - Custom columns count: {len(footer.get('cols', []))}")
    
    # 5. Gallery
    r = requests.get(f"{BASE}/gallery")
    assert r.status_code == 200, f"Failed /gallery: {r.status_code}"
    gallery = r.json()
    print(f"[PASS] /gallery returned 200 OK ({len(gallery)} items)")
    
    # 6. Client Logos
    r = requests.get(f"{BASE}/client-logos")
    assert r.status_code == 200, f"Failed /client-logos: {r.status_code}"
    logos = r.json()
    print(f"[PASS] /client-logos returned 200 OK ({len(logos)} items)")
    
    # 7. Testimonials
    r = requests.get(f"{BASE}/testimonials")
    assert r.status_code == 200, f"Failed /testimonials: {r.status_code}"
    testims = r.json()
    print(f"[PASS] /testimonials returned 200 OK ({len(testims)} items)")
    
    # 8. FAQs
    r = requests.get(f"{BASE}/faqs")
    assert r.status_code == 200, f"Failed /faqs: {r.status_code}"
    faqs = r.json()
    print(f"[PASS] /faqs returned 200 OK ({len(faqs)} items)")
    
    # 9. Policy
    r = requests.get(f"{BASE}/policies/shipping")
    assert r.status_code == 200, f"Failed /policies/shipping: {r.status_code}"
    pol = r.json()
    print(f"[PASS] /policies/shipping returned 200 OK (Title: {pol.get('title')})")

    # 10. SEO Metadata
    r = requests.get(f"{BASE}/seo/home")
    assert r.status_code == 200, f"Failed /seo/home: {r.status_code}"
    seo = r.json()
    print(f"[PASS] /seo/home returned 200 OK (Title: {seo.get('title')})")

    print("\nALL STOREFRONT CMS ENDPOINTS PASSED AUDIT SUCCESSFULLY!")

if __name__ == "__main__":
    test_storefront()
