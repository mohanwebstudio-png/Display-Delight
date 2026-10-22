import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { CATS, FILTERS_BY_CAT, PRODUCTS, toArr, catName } from '../data'
import { Badge, Btn, Check_, Drawer, Field, Input, Modal, Notice, Segmented, Select, Switch, Textarea, Uploader, cx, useUpload } from '../ui'
import { AdminPage, Card, Table, Td, Tr } from './kit'
import { Chips, move, slug } from './Builder'
import { adminApi } from '../api'

const Foot = ({ onCancel, onSave, label = 'Save', busy }: { onCancel: () => void; onSave: () => void; label?: string; busy?: boolean }) => (
  <div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onCancel}>Cancel</Btn><Btn onClick={onSave} loading={busy}>{label}</Btn></div>
)

/* ================= Categories ================= */
interface Cat { id: string; name: string; slug: string; parent: string; img: string; visible: boolean; desc: string }
export function Categories() {
  const { toast, categories, products, refreshCatalogue } = useApp()
  const [list, setList] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getCategories()
      if (Array.isArray(data) && data.length > 0) {
        setList(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug || c.id,
          parent: c.parent_id || '',
          img: c.image_url || '/p/a-card.jpg',
          visible: c.is_visible ?? (c.status === 'published'),
          desc: c.description || '',
        })))
      } else {
        const sourceCats = categories.length > 0 ? categories : CATS
        setList(sourceCats.map((c) => ({ id: c.id, name: c.name, slug: c.id, parent: '', img: c.img, visible: true, desc: c.blurb })))
      }
    } catch (err) {
      console.warn('Failed to load categories from backend:', err)
      const sourceCats = categories.length > 0 ? categories : CATS
      setList(sourceCats.map((c) => ({ id: c.id, name: c.name, slug: c.id, parent: '', img: c.img, visible: true, desc: c.blurb })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const [edit, setEdit] = useState<Cat | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [err, setErr] = useState('')
  const up = useUpload()
  const count = (id: string) => products.filter((p) => p.cat === id || p.cat === list.find((x) => x.id === id)?.slug).length
  const open = (c?: Cat) => { setIsNew(!c); setEdit(c ?? { id: '', name: '', slug: '', parent: '', img: '', visible: true, desc: '' }); setSlugTouched(!!c); setErr(''); up.remove() }
  const tree = list.filter((c) => !c.parent).flatMap((c) => [c, ...list.filter((x) => x.parent === c.id)])
  
  const shift = async (c: Cat, d: number) => {
    const sibs = list.filter((x) => x.parent === c.parent)
    const t = sibs[sibs.indexOf(c) + d]
    if (!t) return
    const a = list.indexOf(c), b = list.indexOf(t)
    const n = [...list]; n[a] = t; n[b] = c; setList(n)
    try {
      const orderPayload = n.map((item, idx) => ({ id: item.id, display_order: idx + 1 }))
      await adminApi.reorderCategories(orderPayload)
      await refreshCatalogue()
    } catch (e) {
      console.warn('Reorder failed:', e)
    }
  }

  const save = async () => {
    if (!edit) return
    if (!edit.name.trim()) return setErr('Category name is required')
    setSaving(true)
    try {
      const c = {
        name: edit.name.trim(),
        slug: edit.slug || slug(edit.name).replace(/_/g, '-'),
        description: edit.desc,
        image_url: up.state.status === 'done' ? up.state.url : edit.img,
        parent_id: edit.parent || null,
        visible: edit.visible,
      }
      if (isNew) {
        await adminApi.createCategory(c)
        toast('Category created and synced with storefront', 'ok')
      } else {
        await adminApi.updateCategory(edit.id, c)
        toast('Category updated and synced with storefront', 'ok')
      }
      await refreshCatalogue()
      await loadCategories()
      setEdit(null)
    } catch (apiErr: any) {
      console.error('Save category error:', apiErr)
      toast(apiErr.error || 'Failed to save category', 'err')
    } finally {
      setSaving(false)
    }
  }

  const row = (c: Cat, i: number) => {
    const sibs = list.filter((x) => x.parent === c.parent), si = sibs.indexOf(c)
    return { sibs, si, i }
  }
  const Order = ({ c }: { c: Cat }) => { const { sibs, si } = row(c, 0); return (
    <div className="flex gap-1"><button aria-label="Move up" disabled={si === 0} onClick={() => shift(c, -1)} className="grid size-8 place-items-center rounded border border-line hover:bg-soft disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
      <button aria-label="Move down" disabled={si === sibs.length - 1} onClick={() => shift(c, 1)} className="grid size-8 place-items-center rounded border border-line hover:bg-soft disabled:opacity-30"><ArrowDown className="size-3.5" /></button></div>) }

  const flip = async (c: Cat) => {
    const nextVis = !c.visible
    setList(list.map((x) => (x.id === c.id ? { ...x, visible: nextVis } : x)))
    try {
      await adminApi.updateCategory(c.id, { visible: nextVis })
      await refreshCatalogue()
      toast(`Category "${c.name}" ${nextVis ? 'published to storefront' : 'hidden'}`, 'info')
    } catch (e) {
      console.warn('Visibility toggle error:', e)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will remain available.')) return
    try {
      await adminApi.deleteCategory(id)
      toast('Category removed', 'ok')
      await refreshCatalogue()
      await loadCategories()
      setEdit(null)
    } catch (apiErr: any) {
      toast(apiErr.error || 'Failed to delete category', 'err')
    }
  }

  return (
    <AdminPage title="Categories" desc="Organise the catalogue. Real-time sync with database and storefront navigation." actions={<Btn icon={<Plus className="size-4" />} onClick={() => open()}>Add category</Btn>}>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live SQLite Database Categories: {list.length} categories active</span>
        </div>
        <span className="text-[11px] text-emerald-700">Changes immediately reflect in mega-menu & storefront</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="hidden md:block">
          <Table head={['Category', 'Slug', 'Products', 'Order', 'Visible', '']}>
            {tree.map((c) => (
              <Tr key={c.id}>
                <Td><div className={cx('flex items-center gap-3', c.parent && 'pl-9')}><img src={c.img || '/p/a-card.jpg'} alt="" className="size-11 rounded-lg bg-soft object-cover" /><div><p className="font-semibold">{c.name}</p><p className="line-clamp-1 max-w-xs text-xs text-ink-2">{c.desc}</p></div></div></Td>
                <Td className="font-mono text-xs text-ink-2">/{c.slug}</Td>
                <Td className="tabular-nums">{count(c.id)}</Td>
                <Td><Order c={c} /></Td>
                <Td><Switch on={c.visible} onChange={() => flip(c)} label={`Visible: ${c.name}`} /></Td>
                <Td className="text-right"><Btn size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => open(c)}>Edit</Btn></Td>
              </Tr>
            ))}
          </Table>
        </div>
        <ul className="divide-y divide-line md:hidden">
          {tree.map((c) => (
            <li key={c.id} className={cx('flex items-center gap-3 p-3', c.parent && 'pl-8')}>
              <img src={c.img || '/p/a-card.jpg'} alt="" className="size-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.name}</p><p className="text-xs text-ink-2">{count(c.id)} products</p><div className="mt-1.5 flex items-center gap-2"><Switch on={c.visible} onChange={() => flip(c)} label="Visible" /><Order c={c} /></div></div>
              <Btn size="sm" variant="secondary" onClick={() => open(c)}>Edit</Btn>
            </li>
          ))}
        </ul>
      </div>
      <Drawer open={!!edit} onClose={() => setEdit(null)} title={isNew ? 'Add category' : 'Edit category'} footer={
        <div className="flex w-full items-center justify-between">
          {!isNew && edit ? (
            <button type="button" onClick={() => deleteCategory(edit.id)} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700">
              <Trash2 className="size-3.5" /> Delete
            </button>
          ) : <div />}
          <Foot onCancel={() => setEdit(null)} onSave={save} busy={saving} />
        </div>
      }>
        {edit && (
          <div className="space-y-4 p-5">
            <Field label="Name" required error={err}><Input value={edit.name} invalid={!!err} onChange={(e) => { setErr(''); setEdit({ ...edit, name: e.target.value, ...(slugTouched ? {} : { slug: slug(e.target.value).replace(/_/g, '-') }) }) }} /></Field>
            <Field label="Slug" hint="Used in the storefront URL."><Input value={edit.slug} className="font-mono text-[13px]" onChange={(e) => { setSlugTouched(true); setEdit({ ...edit, slug: slug(e.target.value).replace(/_/g, '-') }) }} /></Field>
            <Field label="Description"><Textarea value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></Field>
            <Field label="Parent category"><Select value={edit.parent} onChange={(e) => setEdit({ ...edit, parent: e.target.value })}><option value="">None (top level)</option>{list.filter((c) => !c.parent && c.id !== edit.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <div><p className="mb-1.5 text-[13px] font-semibold">Image</p>
              {edit.img && up.state.status === 'idle' && <img src={edit.img} alt="" className="mb-2 h-28 w-full rounded-xl object-cover" />}
              <Uploader state={up.state} onFile={(f) => up.start(f)} onRemove={up.remove} onRetry={up.retry} formats="JPG, PNG, WebP" maxSize="Max 5 MB" /></div>
            <div className="flex items-center justify-between rounded-dd border border-line p-3"><div><p className="text-sm font-semibold">Visible on storefront</p><p className="text-xs text-ink-2">Hidden categories stay in the admin.</p></div><Switch on={edit.visible} onChange={(v) => setEdit({ ...edit, visible: v })} label="Visible" /></div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  )
}

/* ================= Variants ================= */
interface VSet { id: string; name: string; applies: string; values: string[]; style: 'dropdown' | 'buttons' | 'swatches'; required: boolean }
export function Variants() {
  const { toast, categories } = useApp()
  const cats = categories.length > 0 ? categories : CATS
  const [sets, setSets] = useState<VSet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [e, setE] = useState<VSet | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [err, setErr] = useState('')

  const loadVariants = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getVariants()
      if (Array.isArray(data) && data.length > 0) {
        setSets(data.map((s: any) => ({
          id: s.id,
          name: s.name,
          applies: s.applies,
          values: Array.isArray(s.values) ? s.values : [],
          style: s.style || 'buttons',
          required: Boolean(s.required),
        })))
      }
    } catch (err) {
      console.warn('Failed to fetch variants from backend:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVariants()
  }, [])

  const open = (s?: VSet) => {
    setIsNew(!s)
    setE(s ?? { id: '', name: '', applies: cats[0]?.id || 'digital-standees', values: [], style: 'buttons', required: false })
    setErr('')
  }

  const save = async () => {
    if (!e) return
    if (!e.name.trim()) return setErr('Option name is required')
    if (!e.values.length) return setErr('Add at least one value')
    setSaving(true)
    try {
      const payload = {
        name: e.name.trim(),
        applies: e.applies,
        values: e.values,
        style: e.style,
        required: e.required,
      }
      if (isNew) {
        await adminApi.createVariant(payload)
        toast('Option set created in SQLite database', 'ok')
      } else {
        await adminApi.updateVariant(e.id, payload)
        toast('Option set updated in SQLite database', 'ok')
      }
      await loadVariants()
      setE(null)
    } catch (apiErr: any) {
      toast(apiErr.error || 'Failed to save variant option set', 'err')
    } finally {
      setSaving(false)
    }
  }

  const deleteSet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this option set?')) return
    try {
      await adminApi.deleteVariant(id)
      toast('Option set deleted', 'ok')
      await loadVariants()
      setE(null)
    } catch (apiErr: any) {
      toast(apiErr.error || 'Failed to delete option set', 'err')
    }
  }

  return (
    <AdminPage title="Product Variants" desc="Option sets customers choose on product pages, stored in the SQLite database." actions={<Btn icon={<Plus className="size-4" />} onClick={() => open()}>Add option set</Btn>}>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-900">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live SQLite Database Option Sets: {sets.length} option sets active</span>
        </div>
        <span className="text-[11px] text-emerald-700">Real-time options applied to storefront product customizers</span>
      </div>
      <div className="space-y-6">
        {cats.map((c) => {
          const mine = sets.filter((s) => s.applies === c.id || s.applies === (c as any).slug)
          if (!mine.length) return null
          return (
            <section key={c.id}>
              <h2 className="mb-2 text-xl font-bold">{c.name}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mine.map((s) => (
                  <div key={s.id} className="rounded-xl border border-line bg-white p-4">
                    <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{s.name}</p><p className="text-xs text-ink-2">{s.style === 'buttons' ? 'Buttons' : s.style === 'swatches' ? 'Swatches' : 'Dropdown'} · {s.required ? 'Required' : 'Optional'}</p></div><Btn size="sm" variant="secondary" onClick={() => open(s)}>Edit</Btn></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{s.values.map((v) => <span key={v} className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-medium">{v}</span>)}</div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <Drawer open={!!e} onClose={() => setE(null)} title={isNew ? 'Add option set' : 'Edit option set'} footer={
        <div className="flex w-full items-center justify-between">
          {!isNew && e ? (
            <button type="button" onClick={() => deleteSet(e.id)} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700">
              <Trash2 className="size-3.5" /> Delete
            </button>
          ) : <div />}
          <Foot onCancel={() => setE(null)} onSave={save} busy={saving} />
        </div>
      }>
        {e && (
          <div className="space-y-4 p-5">
            <Field label="Option name" required><Input value={e.name} onChange={(x) => { setErr(''); setE({ ...e, name: x.target.value }) }} placeholder="e.g. Size, Finish, Mounting" /></Field>
            <Field label="Applies to product type"><Select value={e.applies} onChange={(x) => setE({ ...e, applies: x.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Values" error={err} hint="Press Enter after each value."><Chips values={e.values} onChange={(values) => { setErr(''); setE({ ...e, values }) }} /></Field>
            <div><p className="mb-1.5 text-[13px] font-semibold">Display style</p><Segmented value={e.style} onChange={(style) => setE({ ...e, style })} options={[{ value: 'buttons', label: 'Buttons' }, { value: 'dropdown', label: 'Dropdown' }, { value: 'swatches', label: 'Swatches' }]} /></div>
            <div className="flex items-center justify-between rounded-dd border border-line p-3"><p className="text-sm font-semibold">Customer must choose a value</p><Switch on={e.required} onChange={(required) => setE({ ...e, required })} label="Required" /></div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  )
}

/* ================= Attributes / Filters ================= */
type AType = 'text' | 'number' | 'single' | 'multi' | 'bool' | 'range'
const ATYPES: { value: AType; label: string }[] = [{ value: 'text', label: 'Text' }, { value: 'number', label: 'Number' }, { value: 'single', label: 'Single select' }, { value: 'multi', label: 'Multi select' }, { value: 'bool', label: 'Yes / No' }, { value: 'range', label: 'Range' }]
interface Attr { key: string; label: string; type: AType; values: string[]; cats: string[]; filterable: boolean; searchable: boolean; visible: boolean; behaviour: 'single' | 'multi'; min: string; max: string; regex: string }
const valuesFor = (key: string) => [...new Set(PRODUCTS.flatMap((p) => toArr(p.attrs[key])))]
const seedAttrs = (): Attr[] => {
  const keys = ['type', 'size', 'orientation', 'mounting', 'use', 'material', 'sided', 'touch', 'customizable']
  return keys.map((key) => {
    const defs = Object.entries(FILTERS_BY_CAT).filter(([c, d]) => c !== 'all' && d.some((x) => x.key === key))
    const def = defs[0]?.[1].find((x) => x.key === key)
    const type: AType = key === 'customizable' ? 'bool' : key === 'size' || key === 'use' ? 'multi' : key === 'type' ? 'text' : 'single'
    return { key, label: (FILTERS_BY_CAT.all.find((x) => x.key === key) ?? def)?.label ?? key, type, values: type === 'bool' ? ['Yes', 'No'] : type === 'text' ? [] : valuesFor(key), cats: defs.map(([c]) => c), filterable: true, searchable: key === 'type' || key === 'material', visible: true, behaviour: def?.type === 'radio' ? 'single' : 'multi', min: '', max: '', regex: '' }
  })
}
const isSel = (t: AType) => t === 'single' || t === 'multi'

export function Attributes({ filters }: { filters?: boolean }) {
  const { toast, categories, refreshCatalogue } = useApp()
  const activeCats = categories.length > 0 ? categories : CATS
  const [attrs, setAttrs] = useState<Attr[]>(seedAttrs)
  const [loading, setLoading] = useState(false)
  const [e, setE] = useState<Attr | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pcat, setPcat] = useState(activeCats[0]?.id || 'led-video-walls')

  const loadAttributes = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getAttributes()
      if (Array.isArray(data) && data.length > 0) {
        setAttrs(data)
      }
    } catch (err) {
      console.warn('Failed to fetch backend attributes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttributes()
  }, [])

  const open = (a?: Attr) => { setIsNew(!a); setE(a ?? { key: '', label: '', type: 'single', values: [], cats: [], filterable: true, searchable: false, visible: true, behaviour: 'multi', min: '', max: '', regex: '' }); setErrs({}); setKeyAuto(!a) }
  const [keyAuto, setKeyAuto] = useState(true)
  const commit = async () => {
    if (!e) return
    setSaving(true)
    try {
      if (isNew) {
        await adminApi.createAttribute(e)
        toast('Attribute created in database and live on storefront', 'ok')
      } else {
        await adminApi.updateAttribute(e.key, e)
        toast('Attribute updated in database and storefront filters refreshed', 'ok')
      }
      await refreshCatalogue()
      await loadAttributes()
      setConfirm(false)
      setE(null)
    } catch (err: any) {
      toast(err?.error || 'Failed to save attribute', 'err')
    } finally {
      setSaving(false)
    }
  }
  const del = async (key: string) => {
    try {
      await adminApi.deleteAttribute(key)
      await refreshCatalogue()
      await loadAttributes()
      setE(null)
      toast('Attribute removed from database', 'ok')
    } catch (err: any) {
      toast(err?.error || 'Failed to delete attribute', 'err')
    }
  }
  const trySave = () => {
    if (!e) return
    const x: Record<string, string> = {}
    if (!e.label.trim()) x.label = 'Label is required'
    if (!e.key) x.key = 'Key is required'
    else if (isNew && attrs.some((a) => a.key === e.key)) x.key = 'This key already exists'
    if (isSel(e.type) && !e.values.length) x.values = 'Add at least one allowed value'
    if ((e.type === 'number' || e.type === 'range') && e.min && e.max && +e.min > +e.max) x.min = 'Minimum cannot exceed maximum'
    if (e.regex) { try { new RegExp(e.regex) } catch { x.regex = 'Not a valid pattern' } }
    setErrs(x)
    if (Object.keys(x).length) return
    const old = attrs.find((a) => a.key === e.key)
    const affects = isNew ? e.filterable : !!old && JSON.stringify([old.label, old.type, old.values, old.cats, old.filterable, old.visible, old.behaviour]) !== JSON.stringify([e.label, e.type, e.values, e.cats, e.filterable, e.visible, e.behaviour])
    affects ? setConfirm(true) : commit()
  }
  const shift = (i: number, d: number) => setAttrs(move(attrs, i, d))
  const flag = (b: boolean, l: string) => <Badge tone={b ? 'ok' : 'neutral'}>{b ? <Check className="size-3" /> : null}{l}</Badge>

  const groups = (() => {
    const base = (FILTERS_BY_CAT[pcat] ?? []).map((d) => d.key)
    const extra = attrs.filter((a) => a.cats.includes(pcat) && !base.includes(a.key)).map((a) => a.key)
    return [...base, ...extra].map((k) => attrs.find((a) => a.key === k)).filter((a): a is Attr => !!a && a.filterable && a.visible && a.cats.includes(pcat) && a.type !== 'text')
  })()
  const preview = (
    <Card title="Storefront filter preview" desc="Rendered from attribute metadata, as shoppers will see it." actions={<div className="w-56"><Select value={pcat} onChange={(x) => setPcat(x.target.value)} aria-label="Preview category">{CATS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>}>
      {groups.length === 0 ? <p className="text-sm text-ink-2">No filters are enabled for {catName(pcat)}.</p> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((a) => (
            <div key={a.key} className="rounded-dd border border-line p-3">
              <p className="mb-1 text-sm font-bold">{a.label}</p>
              {a.type === 'range' || a.type === 'number' ? <div className="flex items-center gap-2 pt-1"><Input placeholder={a.min || 'Min'} className="h-9" readOnly /><span>–</span><Input placeholder={a.max || 'Max'} className="h-9" readOnly /></div>
                : a.values.slice(0, 5).map((v, i) => <Check_ key={v} radio={a.type === 'bool' || a.behaviour === 'single'} checked={i === 0 && a.type !== 'bool' ? false : false} onChange={() => {}} label={v} />)}
              {a.values.length > 5 && <p className="text-xs text-ink-2">+{a.values.length - 5} more</p>}
              <p className="mt-1 text-[11px] text-ink-2">{a.type === 'bool' || a.behaviour === 'single' ? 'Pick one' : 'Pick several'}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
  return (
    <AdminPage title={filters ? 'Product Filters' : 'Product Attributes'} desc={filters ? 'Filters on the storefront are generated from attributes. Control which attributes become filters and where.' : 'Define the structured data products carry. Attributes drive specifications, filters and search.'} actions={<Btn icon={<Plus className="size-4" />} onClick={() => open()}>Add attribute</Btn>}>
      <div className="mb-4"><Notice tone="warn" title="Changing an attribute can change product listings and storefront filters">Keys never change after creation. Review the preview below before saving.</Notice></div>
      <div className="space-y-4">
        {filters && preview}
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="hidden md:block">
            <Table head={['Label', 'Key', 'Type', 'Allowed values', 'Categories', 'Flags', 'Order', '']}>
              {attrs.map((a, i) => (
                <Tr key={a.key}>
                  <Td className="font-semibold">{a.label}</Td>
                  <Td><code className="rounded bg-soft px-1.5 py-0.5 font-mono text-xs">{a.key}</code></Td>
                  <Td>{ATYPES.find((t) => t.value === a.type)?.label}</Td>
                  <Td><div className="flex max-w-56 flex-wrap gap-1">{a.values.slice(0, 3).map((v) => <span key={v} className="rounded-full bg-soft px-2 py-0.5 text-[11px]">{v}</span>)}{a.values.length > 3 && <span className="text-[11px] text-ink-2">+{a.values.length - 3}</span>}{!a.values.length && <span className="text-xs text-ink-2">Free input</span>}</div></Td>
                  <Td className="text-xs text-ink-2" ><span title={a.cats.map(catName).join(', ')}>{a.cats.length} of {CATS.length}</span></Td>
                  <Td><div className="flex flex-wrap gap-1">{flag(a.filterable, 'Filter')}{flag(a.searchable, 'Search')}{flag(a.visible, 'Visible')}</div></Td>
                  <Td><div className="flex gap-1"><button aria-label="Move up" disabled={i === 0} onClick={() => shift(i, -1)} className="grid size-7 place-items-center rounded border border-line disabled:opacity-30"><ArrowUp className="size-3.5" /></button><button aria-label="Move down" disabled={i === attrs.length - 1} onClick={() => shift(i, 1)} className="grid size-7 place-items-center rounded border border-line disabled:opacity-30"><ArrowDown className="size-3.5" /></button></div></Td>
                  <Td className="text-right"><Btn size="sm" variant="secondary" onClick={() => open(a)}>Edit</Btn></Td>
                </Tr>
              ))}
            </Table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {attrs.map((a) => (
              <li key={a.key} className="p-4">
                <div className="flex items-start justify-between"><div><p className="font-semibold">{a.label}</p><code className="font-mono text-xs text-ink-2">{a.key}</code></div><Btn size="sm" variant="secondary" onClick={() => open(a)}>Edit</Btn></div>
                <div className="mt-2 flex flex-wrap gap-1">{flag(a.filterable, 'Filter')}{flag(a.searchable, 'Search')}{flag(a.visible, 'Visible')}<Badge>{ATYPES.find((t) => t.value === a.type)?.label}</Badge></div>
              </li>
            ))}
          </ul>
        </div>
        {!filters && preview}
      </div>

      <Drawer open={!!e} onClose={() => setE(null)} width="max-w-lg" title={isNew ? 'Add attribute' : `Edit ${e?.label ?? 'attribute'}`} footer={
        <div className="flex w-full items-center justify-between">
          {!isNew && <Btn variant="danger" size="sm" onClick={() => e && del(e.key)}>Delete</Btn>}
          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" onClick={() => setE(null)}>Cancel</Btn>
            <Btn onClick={trySave} loading={saving}>{isNew ? 'Create attribute' : 'Save changes'}</Btn>
          </div>
        </div>
      }>
        {e && (
          <div className="space-y-4 p-5">
            <Field label="Label" required error={errs.label}><Input value={e.label} invalid={!!errs.label} onChange={(x) => setE({ ...e, label: x.target.value, ...(isNew && keyAuto ? { key: slug(x.target.value) } : {}) })} /></Field>
            <Field label="Key" error={errs.key} hint="Stable key — used by the API and URLs"><Input value={e.key} readOnly={!isNew} disabled={!isNew} invalid={!!errs.key} className="font-mono text-[13px]" onChange={(x) => { setKeyAuto(false); setE({ ...e, key: slug(x.target.value) }) }} /></Field>
            <Field label="Field type"><Select value={e.type} onChange={(x) => setE({ ...e, type: x.target.value as AType, behaviour: x.target.value === 'single' ? 'single' : e.behaviour })}>{ATYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
            {isSel(e.type) && <Field label="Allowed values" error={errs.values}><Chips values={e.values} onChange={(values) => setE({ ...e, values })} /></Field>}
            {isSel(e.type) && <div><p className="mb-1.5 text-[13px] font-semibold">Filter behaviour</p><Segmented value={e.behaviour} onChange={(behaviour) => setE({ ...e, behaviour })} options={[{ value: 'single', label: 'Single choice' }, { value: 'multi', label: 'Multiple choices' }]} /></div>}
            <div><p className="mb-1 text-[13px] font-semibold">Applies to categories</p>
              <div className="rounded-dd border border-line px-3 py-1">{activeCats.map((c) => <Check_ key={c.id} checked={e.cats.includes(c.id)} onChange={() => setE({ ...e, cats: e.cats.includes(c.id) ? e.cats.filter((x) => x !== c.id) : [...e.cats, c.id] })} label={c.name} />)}</div></div>
            <div className="divide-y divide-line rounded-dd border border-line">
              {([['filterable', 'Filterable', 'Appears as a storefront filter'], ['searchable', 'Searchable', 'Included in storefront search'], ['visible', 'Customer-visible', 'Shown in product specifications']] as const).map(([k, l, d]) => (
                <div key={k} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-semibold">{l}</p><p className="text-xs text-ink-2">{d}</p></div><Switch on={e[k]} onChange={(v) => setE({ ...e, [k]: v })} label={l} /></div>
              ))}
            </div>
            {(e.type === 'number' || e.type === 'range') && <div className="grid grid-cols-2 gap-3"><Field label="Minimum" error={errs.min}><Input type="number" value={e.min} onChange={(x) => setE({ ...e, min: x.target.value })} /></Field><Field label="Maximum"><Input type="number" value={e.max} onChange={(x) => setE({ ...e, max: x.target.value })} /></Field></div>}
            {e.type === 'text' && <Field label="Validation pattern (regex)" error={errs.regex} hint="Optional. Leave blank to accept any text."><Input value={e.regex} invalid={!!errs.regex} className="font-mono text-[13px]" onChange={(x) => setE({ ...e, regex: x.target.value })} placeholder="^[A-Z0-9-]+$" /></Field>}
          </div>
        )}
      </Drawer>
      <Modal open={confirm} onClose={() => !saving && setConfirm(false)} title="Apply this change?" footer={<><Btn variant="secondary" disabled={saving} onClick={() => setConfirm(false)}>Go back</Btn><Btn loading={saving} onClick={commit}>{saving ? 'Saving…' : 'Confirm and save'}</Btn></>}>
        <p>This attribute is used in storefront filters. Saving updates the filters for <b className="text-ink">{e?.cats.length ?? 0} categor{e?.cats.length === 1 ? 'y' : 'ies'}</b> and may change which products appear for shoppers who use it.</p>
      </Modal>
    </AdminPage>
  )
}
