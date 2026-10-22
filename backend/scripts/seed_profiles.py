import os, sys, json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.session import SessionLocal
from app.models.models import CustomizationProfile, CustomizationField, FieldType, PublishStatus

db = SessionLocal()

SEED_PROFILES = [
    {
        'id': 'tabletop-led',
        'name': 'Tabletop LED signage',
        'desc': 'Light boxes and illuminated counter displays with text, logo and lighting options.',
        'fields': [
            ('text', 'text', 'Business name or display text', True, 0, 1, None),
            ('font', 'font', 'Font style', False, 0, 2, ['Barlow Condensed', 'Inter', 'Georgia']),
            ('colour', 'color', 'Light colour', False, 0, 3, ['Warm white', 'Cool white', 'Orange', 'Blue']),
            ('upload', 'artwork_upload', 'Logo or artwork', True, 0, 4, None),
            ('orientation', 'orientation', 'Orientation', True, 0, 5, ['Portrait', 'Landscape']),
            ('sides', 'dropdown', 'Single or double-sided', True, 120000, 6, ['Single-sided', 'Double-sided']),
            ('notes', 'textarea', 'Notes for our design team', False, 0, 7, None),
        ]
    },
    {
        'id': 'digital-display',
        'name': 'Digital display',
        'desc': 'Screen size, model, touch and mounting choices for digital standees.',
        'fields': [
            ('screen_size', 'dropdown', 'Screen size', True, 0, 1, ['32"', '43"', '50"', '55"', '65"']),
            ('model', 'radio', 'Model', True, 0, 2, ['I Type', 'A Type', 'Table Top']),
            ('touch', 'radio', 'Touch screen option', True, 650000, 3, ['Non-touch', 'Touch']),
            ('mounting', 'dropdown', 'Mounting', False, 0, 4, ['Floor stand', 'Wall mount', 'Table stand']),
            ('notes', 'textarea', 'Installation notes', False, 0, 5, None),
        ]
    },
    {
        'id': 'rollup-fabric',
        'name': 'Roll-up and fabric print',
        'desc': 'Print-ready artwork, size and material for roll-ups, fabric displays and tents.',
        'fields': [
            ('size', 'dropdown', 'Display size', True, 0, 1, ['3x6 ft', '4x6 ft', 'Custom size']),
            ('artwork', 'artwork_upload', 'Print-ready artwork', True, 0, 2, None),
            ('finish', 'dropdown', 'Material finish', False, 0, 3, ['Matte flex', 'Gloss flex', 'Tension fabric']),
            ('notes', 'textarea', 'Special instructions', False, 0, 4, None),
        ]
    },
    {
        'id': 'photo-frame',
        'name': 'Photo frame',
        'desc': 'Framed prints and clip-on frames made from customer artwork.',
        'fields': [
            ('size', 'dropdown', 'Frame size', True, 0, 1, ['8x10"', '12x18"', '18x24"', 'Custom size']),
            ('orientation', 'orientation', 'Orientation', False, 0, 2, ['Portrait', 'Landscape']),
            ('frame_color', 'color', 'Frame colour', False, 0, 3, ['Black', 'White', 'Walnut']),
            ('artwork', 'artwork_upload', 'Photo or artwork', True, 0, 4, None),
            ('caption', 'text', 'Caption text', False, 0, 5, None),
        ]
    }
]

for p in SEED_PROFILES:
    existing = db.query(CustomizationProfile).filter(CustomizationProfile.id == p['id']).first()
    if not existing:
        prof = CustomizationProfile(
            id=p['id'],
            name=p['name'],
            supports_front=True,
            supports_back=True,
            status=PublishStatus.published,
            version=1,
        )
        db.add(prof)
        db.flush()
        for key, ftype_str, lbl, req, delta, order, allowed in p['fields']:
            db.add(CustomizationField(
                profile_id=prof.id,
                key=key,
                label=lbl,
                field_type=FieldType(ftype_str),
                is_required=req,
                price_delta_paise=delta,
                affects_price=(delta > 0),
                allowed_values=json.dumps(allowed) if allowed else None,
                display_order=order,
            ))
        db.commit()
        print(f"Created profile: {p['name']}")
    else:
        print(f"Already exists: {p['name']}")

db.close()
