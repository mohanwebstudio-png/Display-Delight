import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Badge, Breadcrumbs, Input, Notice, cx } from '../ui'

/** Page wrapper: header row + optional breadcrumbs. Every admin screen should render inside this. */
export function AdminPage({ title, desc, actions, crumbs, children, wide }: { title: string; desc?: string; actions?: ReactNode; crumbs?: { label: string; to?: string }[]; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cx('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', wide ? 'max-w-none' : 'max-w-[1280px]')}>
      {crumbs && <div className="mb-2"><Breadcrumbs items={crumbs} /></div>}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold leading-none">{title}</h1>
          {desc && <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{desc}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Card({ title, desc, actions, children, pad = true, className }: { title?: string; desc?: string; actions?: ReactNode; children: ReactNode; pad?: boolean; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-white', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>{title && <h2 className="text-xl font-bold leading-tight">{title}</h2>}{desc && <p className="mt-0.5 text-[13px] text-ink-2">{desc}</p>}</div>
          {actions}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

const statusTone: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand' | 'navy'> = {
  Published: 'ok', Active: 'ok', Paid: 'ok', Delivered: 'ok', Connected: 'ok', Ready: 'ok', Resolved: 'ok', Replied: 'ok', 'In stock': 'ok',
  Draft: 'neutral', Hidden: 'neutral', Archived: 'neutral', Disabled: 'neutral', Closed: 'neutral',
  Pending: 'warn', Processing: 'warn', 'Awaiting payment': 'warn', 'Paid — Awaiting Details': 'warn', 'Low stock': 'warn', Shipped: 'info', New: 'brand', Open: 'brand', 'In review': 'info', Quoted: 'info',
  Failed: 'bad', Cancelled: 'bad', Refunded: 'bad', 'Out of stock': 'bad', Error: 'bad', 'Not configured': 'warn',
}
export const StatusBadge = ({ s }: { s: string }) => <Badge tone={statusTone[s] ?? 'neutral'} dot>{s}</Badge>

/** Table shell: desktop table. Provide a separate mobile card list (md:hidden) beside it for narrow screens. */
export function Table({ head, children, className }: { head: (string | ReactNode)[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead><tr className="border-b border-line bg-soft text-[11px] font-bold uppercase tracking-wider text-ink-2">{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}
export const Tr = ({ children, onClick, selected }: { children: ReactNode; onClick?: () => void; selected?: boolean }) => (
  <tr onClick={onClick} className={cx('transition hover:bg-[#fafafb]', onClick && 'cursor-pointer', selected && 'bg-brand-soft/50')}>{children}</tr>
)
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cx('px-4 py-3 align-middle', className)}>{children}</td>

export function Toolbar({ search, onSearch, placeholder = 'Search…', children }: { search?: string; onSearch?: (v: string) => void; placeholder?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
      {onSearch && (
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-2" />
          <Input value={search ?? ''} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="h-10 pl-9" />
        </div>
      )}
      {children}
    </div>
  )
}

export function Pager({ page, pages, onChange, total }: { page: number; pages: number; onChange: (n: number) => void; total?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-ink-2">
      <span>{total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" className="grid size-8 place-items-center rounded border border-line disabled:opacity-40 hover:bg-soft"><ChevronLeft className="size-4" /></button>
        <span className="px-2 font-medium text-ink">Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page" className="grid size-8 place-items-center rounded border border-line disabled:opacity-40 hover:bg-soft"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  )
}

export function Stat({ label, value, note, tone, icon }: { label: string; value: ReactNode; note?: string; tone?: 'brand' | 'warn' | 'bad' | 'ok'; icon?: ReactNode }) {
  const c = { brand: 'bg-brand-soft text-brand', warn: 'bg-[#fff3e0] text-warn', bad: 'bg-[#fdecea] text-bad', ok: 'bg-[#e8f5e9] text-ok' }[tone ?? 'brand']
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-ink-2">{label}</p>{icon && <span className={cx('grid size-8 place-items-center rounded-lg', c)}>{icon}</span>}</div>
      <p className="mt-2 font-display text-4xl font-bold leading-none tabular-nums">{value}</p>
      {note && <p className="mt-1.5 text-xs text-ink-2">{note}</p>}
    </div>
  )
}

/** Use whenever a screen shows illustrative values so no one mistakes them for real business data. */
export const SampleNote = ({ text = 'Illustrative sample data for the design prototype. Live values come from the API.' }: { text?: string }) => <Notice tone="info">{text}</Notice>

/** Form row: label column + control column — keeps settings screens consistent. */
export function FormRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-4 last:border-0 md:grid-cols-[240px_1fr] md:gap-8">
      <div><p className="text-sm font-semibold">{label}</p>{hint && <p className="mt-0.5 text-xs text-ink-2">{hint}</p>}</div>
      <div>{children}</div>
    </div>
  )
}

/** Sticky save bar: shows unsaved-changes feedback. */
export function SaveBar({ dirty, onSave, onCancel, saving, saved }: { dirty: boolean; onSave: () => void; onCancel: () => void; saving?: boolean; saved?: boolean }) {
  if (!dirty && !saved) return null
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <p className="text-sm font-medium">{saved && !dirty ? <span className="text-ok">All changes saved</span> : <span className="text-warn">You have unsaved changes</span>}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="h-10 rounded-dd border border-line px-4 text-sm font-semibold hover:bg-soft">Discard</button>
        <button onClick={onSave} disabled={saving || !dirty} className="h-10 rounded-dd bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  )
}

export function useDirty<T>(initial: T) {
  const [v, setV] = useState(initial)
  const [base, setBase] = useState(initial)
  return { v, set: (p: Partial<T>) => setV((x) => ({ ...x, ...p })), dirty: JSON.stringify(v) !== JSON.stringify(base), commit: () => setBase(v), reset: () => setV(base) }
}
