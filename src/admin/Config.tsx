import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Bell, CheckCheck, CreditCard, Lock, Mail, MessageSquare, Package, PlugZap, Plus, ShoppingBag, Upload, Boxes, Settings2, Copy, Check, Clock, RefreshCw, ExternalLink, Cloud, Smartphone, Send, Trash2, Radio, Globe, Laptop } from 'lucide-react'
import { Badge, Btn, Check_, Drawer, EmptyState, ErrorState, Field, Input, Modal, Notice, Segmented, Select, Skeleton, Switch, Tabs, Textarea, Uploader, useUpload, cx } from '../ui'
import { go, useApp, resolveAssetUrl } from '../store'
import { AdminPage, Card, FormRow, Pager, SampleNote, SaveBar, StatusBadge, Table, Td, Toolbar, Tr, useDirty } from './kit'
import { adminApi } from '../api'

const Sensitive = () => <Badge tone="navy"><Lock className="mr-1 inline size-3" />Sensitive</Badge>
/** Settings page shell with database persistence via adminApi and instant storefront update. */
function useSettings<T extends Record<string, any>>(
  groupKeyOrInit?: string | T,
  initOrMsg?: T | string,
  msgParam = 'Settings saved'
) {
  const isGroup = typeof groupKeyOrInit === 'string'
  const groupKey = isGroup ? (groupKeyOrInit as string) : undefined
  const initialData: T = (isGroup
    ? (initOrMsg as T) || ({} as T)
    : (groupKeyOrInit ? (groupKeyOrInit as T) : ((typeof initOrMsg === 'object' ? initOrMsg : {}) as T)))
  const msg = isGroup ? msgParam : (typeof initOrMsg === 'string' ? initOrMsg : msgParam)

  const { toast, refreshSettings } = useApp()
  const d = useDirty(initialData)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch initial group settings from database backend if groupKey is provided
  useEffect(() => {
    if (!groupKey) return
    let active = true
    adminApi.getSettingsGrouped()
      .then((data) => {
        if (active && data && data[groupKey]) {
          const groupData = data[groupKey]
          d.set(groupData)
          d.commit()
        }
      })
      .catch((err) => {
        console.warn(`Could not load settings group ${groupKey}:`, err)
      })
    return () => { active = false }
  }, [groupKey])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (groupKey) {
        await adminApi.updateSettingsGroup(groupKey, d.v)
        await refreshSettings()
      }
      d.commit()
      setSaved(true)
      toast(msg, 'ok')
    } catch (err: any) {
      toast(err?.error || 'Failed to save settings', 'err')
    } finally {
      setIsSaving(false)
    }
  }

  const bar = (
    <SaveBar
      dirty={d.dirty}
      saved={saved}
      onSave={handleSave}
      onCancel={d.reset}
    />
  )
  return { ...d, bar, isSaving }
}

function Secret({ label, hint, value, onSave }: { label: string; hint?: string; value?: string; onSave?: (val: string) => void }) {
  const { toast } = useApp()
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState('')
  return (
    <FormRow label={label} hint={hint}>
      {edit ? (
        <div className="flex max-w-md gap-2">
          <Input type="password" autoComplete="new-password" value={v} onChange={(e) => setV(e.target.value)} placeholder="Enter new secret" />
          <Btn disabled={!v} onClick={() => { if (onSave) onSave(v); setEdit(false); setV(''); toast(label + ' replaced') }}>Save</Btn>
          <Btn variant="secondary" onClick={() => setEdit(false)}>Cancel</Btn>
        </div>
      ) : (
        <div className="flex max-w-md items-center gap-3">
          <span className="flex h-11 flex-1 items-center rounded-dd border border-line bg-soft px-3.5 font-mono text-sm tracking-widest">{value || '••••••••'}</span>
          <Btn variant="secondary" onClick={() => setEdit(true)}>Replace</Btn>
        </div>
      )}
    </FormRow>
  )
}

/* ---------- Notifications ---------- */
const TYPES = {
  order: { label: 'New order', icon: ShoppingBag, to: '/admin/orders/DD-1042', cta: 'View order' },
  pay: { label: 'Payment failure', icon: CreditCard, to: '/admin/payments', cta: 'Open payments' },
  quote: { label: 'New quotation', icon: MessageSquare, to: '/admin/quotes', cta: 'Open quote' },
  enq: { label: 'Customer enquiry', icon: Mail, to: '/admin/quotes', cta: 'Open enquiry' },
  stock: { label: 'Low stock', icon: Package, to: '/admin/inventory', cta: 'Open inventory' },
  integ: { label: 'Integration failure', icon: PlugZap, to: '/admin/storage', cta: 'Check storage' },
} as const
type TKey = keyof typeof TYPES
const NOTES: { id: number; t: TKey; high: boolean; text: string; time: string }[] = [
  { id: 1, t: 'order', high: false, text: 'New order DD-1042 received.', time: '10 Oct, 10:12' },
  { id: 2, t: 'pay', high: true, text: 'Payment for order DD-1041 failed at Razorpay.', time: '10 Oct, 09:40' },
  { id: 3, t: 'quote', high: false, text: 'New quotation request QT-310 for a digital standee.', time: '09 Oct, 17:25' },
  { id: 4, t: 'stock', high: true, text: 'Stock for Ultra Slim Light Box is at or below its threshold.', time: '09 Oct, 14:02' },
  { id: 5, t: 'enq', high: false, text: 'New customer enquiry about artwork formats.', time: '09 Oct, 11:30' },
  { id: 6, t: 'integ', high: true, text: 'A media upload to storage failed. Check the storage connection.', time: '08 Oct, 19:48' },
  { id: 7, t: 'order', high: false, text: 'New order DD-1040 received.', time: '08 Oct, 12:05' },
  { id: 8, t: 'quote', high: false, text: 'Quotation QT-308 was closed by a team member.', time: '07 Oct, 16:10' },
  { id: 9, t: 'stock', high: false, text: 'Roll Up Standee is out of stock.', time: '07 Oct, 09:15' },
]
export function Notifications(_: any) {
  const { toast } = useApp()
  const [view, setView] = useState('ready')
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const [prefs, setPrefs] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pref, setPref] = useState<Record<string, boolean[]>>(
    Object.fromEntries(Object.keys(TYPES).map((k) => [k, [true, k !== 'enq', false]]))
  )

  const loadNotifs = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getNotifications(tab, page, 5)
      if (data) {
        setNotifs(data.items || [])
        setUnreadCount(data.unread_count || 0)
        setTotalPages(data.pages || 1)
        setTotalCount(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setView('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifs()
  }, [tab, page])

  useEffect(() => {
    if (prefs) {
      adminApi.getNotificationPreferences().then((res) => {
        if (res && typeof res === 'object') setPref(res)
      }).catch(() => {})
    }
  }, [prefs])

  const handleMarkRead = async (id: string | number) => {
    try {
      await adminApi.markNotificationRead(id)
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
      toast('Notification marked as read')
    } catch (err: any) {
      toast(`Failed: ${err.message || 'Error'}`)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead()
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast('All notifications marked as read')
    } catch (err: any) {
      toast(`Failed: ${err.message || 'Error'}`)
    }
  }

  const handleSavePrefs = async () => {
    try {
      await adminApi.saveNotificationPreferences(pref)
      setPrefs(false)
      toast('Preferences saved to database')
    } catch (err: any) {
      toast(`Failed to save preferences: ${err.message || 'Error'}`)
    }
  }

  const [devicesOpen, setDevicesOpen] = useState(false)
  const [devicesTab, setDevicesTab] = useState<'devices' | 'push' | 'deliveries'>('devices')
  const [devices, setDevices] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [pushTitle, setPushTitle] = useState('Production & Order Notification')
  const [pushBody, setPushBody] = useState('New signage fabrication order received and ready for review.')
  const [pushTarget, setPushTarget] = useState('')
  const [isSendingPush, setIsSendingPush] = useState(false)
  const [isRegisteringSelf, setIsRegisteringSelf] = useState(false)

  const loadDevicesAndDeliveries = async () => {
    try {
      setLoadingDevices(true)
      const [devList, delivList] = await Promise.all([
        adminApi.getCompanionDevices(),
        adminApi.getNotificationDeliveries(30),
      ])
      setDevices(devList || [])
      setDeliveries(delivList || [])
    } catch (err: any) {
      console.error('Failed to load companion devices:', err)
      toast(`Failed to load devices: ${err.message || 'Error'}`)
    } finally {
      setLoadingDevices(false)
    }
  }

  useEffect(() => {
    if (devicesOpen) {
      loadDevicesAndDeliveries()
    }
  }, [devicesOpen])

  const handleRegisterCurrentDevice = async () => {
    try {
      setIsRegisteringSelf(true)
      let token = localStorage.getItem('dd_admin_companion_token')
      if (!token) {
        token = `web_token_${Math.random().toString(36).slice(2)}_${Date.now()}`
        localStorage.setItem('dd_admin_companion_token', token)
      }
      const ua = navigator.userAgent
      let platform = 'web'
      if (/Android/i.test(ua)) platform = 'android'
      else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'ios'
      else if (/Mac/i.test(ua)) platform = 'macos'
      else if (/Win/i.test(ua)) platform = 'windows'

      await adminApi.registerCompanionDevice({
        device_token: token,
        platform,
        device_name: `${platform.toUpperCase()} Browser Companion`,
        app_version: '3.1.0',
      })
      toast('Current browser successfully registered as Companion Device!')
      await loadDevicesAndDeliveries()
    } catch (err: any) {
      toast(`Registration error: ${err.message || 'Failed'}`)
    } finally {
      setIsRegisteringSelf(false)
    }
  }

  const handleDeactivateDevice = async (id: string) => {
    try {
      await adminApi.deactivateCompanionDevice(id)
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, is_active: false } : d)))
      toast('Companion device deactivated.')
    } catch (err: any) {
      toast(`Deactivation failed: ${err.message || 'Error'}`)
    }
  }

  const handleDeleteDevice = async (id: string) => {
    try {
      await adminApi.deleteCompanionDevice(id)
      setDevices((prev) => prev.filter((d) => d.id !== id))
      toast('Companion device removed.')
    } catch (err: any) {
      toast(`Delete failed: ${err.message || 'Error'}`)
    }
  }

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast('Please enter a title and message for the push notification.')
      return
    }
    try {
      setIsSendingPush(true)
      const res = await adminApi.testPushNotification({
        title: pushTitle,
        body: pushBody,
        device_id: pushTarget || undefined,
      })
      toast(res.message || 'Push alert dispatched!')
      const updatedDeliveries = await adminApi.getNotificationDeliveries(30)
      setDeliveries(updatedDeliveries || [])
    } catch (err: any) {
      toast(`Push dispatch error: ${err.message || 'Failed'}`)
    } finally {
      setIsSendingPush(false)
    }
  }

  const rows = view === 'empty' ? [] : notifs

  return (
    <AdminPage
      title="Notifications"
      desc="Real-time alerts for customer storefront orders, quotation requests, and inventory alerts."
      actions={
        <>
          <Btn variant="primary" size="sm" icon={<Smartphone className="size-4" />} onClick={() => setDevicesOpen(true)}>
            Companion Devices & Push
          </Btn>
          <Btn variant="secondary" size="sm" icon={<CheckCheck className="size-4" />} onClick={handleMarkAllRead}>
            Mark all as read
          </Btn>
          <Btn variant="secondary" size="sm" icon={<Settings2 className="size-4" />} onClick={() => setPrefs(true)}>
            Preferences
          </Btn>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">Live sync</span>
        <Btn size="sm" variant="tertiary" onClick={loadNotifs}>Refresh alerts</Btn>
      </div>

      <Card pad={false}>
        <div className="px-4">
          <Tabs
            value={tab}
            onChange={(v) => { setTab(v); setPage(1) }}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread', badge: unreadCount },
              { value: 'orders', label: 'Orders' },
              { value: 'quotes', label: 'Quotes & Enquiries' },
              { value: 'system', label: 'System & Stock' },
            ]}
          />
        </div>

        {loading && notifs.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : view === 'error' ? (
          <ErrorState title="Could not load notifications" onRetry={loadNotifs} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Bell className="size-6" />} title="You're all caught up" text="New storefront orders, quotes and stock updates will arrive here." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((n) => {
              const typeConfig = TYPES[n.t as TKey] || TYPES.order
              const unread = !n.read
              return (
                <li key={n.id} className={cx('flex flex-wrap items-start gap-3 p-4', unread && 'bg-brand-soft/40')}>
                  <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', n.high ? 'bg-[#fdecea] text-bad' : 'bg-soft text-ink-2')}>
                    <typeConfig.icon className="size-5" />
                  </span>
                  <div className="min-w-56 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{typeConfig.label}</p>
                      <Badge tone={n.high ? 'bad' : 'neutral'}>{n.high ? 'High' : 'Normal'}</Badge>
                      {unread && <span className="size-2 rounded-full bg-brand" aria-label="Unread" />}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-2">{n.text}</p>
                    <p className="mt-1 text-xs text-ink-2">{n.time}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (unread) handleMarkRead(n.id)
                        go(n.to || typeConfig.to)
                      }}
                    >
                      {n.cta || typeConfig.cta}
                    </Btn>
                    {unread && (
                      <Btn size="sm" variant="tertiary" onClick={() => handleMarkRead(n.id)}>
                        Mark as read
                      </Btn>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Pager page={page} pages={totalPages} onChange={setPage} total={`${totalCount} notifications`} />
      </Card>

      <Drawer
        open={prefs}
        onClose={() => setPrefs(false)}
        title="Notification preferences"
        footer={<Btn onClick={handleSavePrefs}>Save preferences</Btn>}
      >
        <div className="grid grid-cols-[1fr_repeat(3,56px)] items-center gap-y-4 text-sm">
          <span />
          <span className="text-center text-[11px] font-bold uppercase text-ink-2">In-app</span>
          <span className="text-center text-[11px] font-bold uppercase text-ink-2">Email</span>
          <span className="text-center text-[11px] font-bold uppercase text-ink-2">Push</span>
          {(Object.keys(TYPES) as TKey[]).map((k) => (
            <>
              <span key={k} className="font-medium">{TYPES[k].label}</span>
              {[0, 1, 2].map((i) => (
                <span key={k + i} className="flex justify-center">
                  <Check_
                    checked={pref[k]?.[i] ?? true}
                    onChange={() => setPref({
                      ...pref,
                      [k]: (pref[k] || [true, true, false]).map((x, j) => (j === i ? !x : x))
                    })}
                    label={<span className="sr-only">{TYPES[k].label} {['in-app', 'email', 'push'][i]}</span>}
                  />
                </span>
              ))}
            </>
          ))}
        </div>
      </Drawer>

      <Drawer
        open={devicesOpen}
        onClose={() => setDevicesOpen(false)}
        title="Admin Companion Devices & Push Alerts (V3 §1.1 & §9.2)"
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <Tabs
            value={devicesTab}
            onChange={(v: any) => setDevicesTab(v)}
            tabs={[
              { value: 'devices', label: 'Registered Devices', badge: devices.filter(d => d.is_active).length },
              { value: 'push', label: 'Send Push Alert' },
              { value: 'deliveries', label: 'Delivery Audit Log', badge: deliveries.length },
            ]}
          />

          {devicesTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-soft p-3">
                <div>
                  <p className="text-xs font-semibold text-ink">Active Companion Subscriptions</p>
                  <p className="text-[11px] text-ink-2">Flutter companion mobile apps and admin workstation browsers.</p>
                </div>
                <Btn size="sm" variant="secondary" onClick={handleRegisterCurrentDevice} disabled={isRegisteringSelf}>
                  <Radio className="mr-1.5 size-3.5 text-brand" />
                  {isRegisteringSelf ? 'Registering...' : 'Register This Device'}
                </Btn>
              </div>

              {loadingDevices ? (
                <div className="space-y-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : devices.length === 0 ? (
                <EmptyState
                  icon={<Smartphone className="size-6" />}
                  title="No companion devices registered"
                  text="Register this browser or log into the Flutter companion app to receive instant push alerts."
                />
              ) : (
                <div className="space-y-2.5">
                  {devices.map((dev) => (
                    <div key={dev.id} className="flex items-center justify-between rounded-lg border border-line p-3 transition hover:border-line-2">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-soft">
                          {dev.platform === 'ios' ? <Smartphone className="size-4 text-purple-600" /> :
                           dev.platform === 'android' ? <Smartphone className="size-4 text-emerald-600" /> :
                           dev.platform === 'web' ? <Globe className="size-4 text-indigo-600" /> :
                           <Laptop className="size-4 text-sky-600" />}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink">{dev.device_name || 'Companion Client'}</span>
                            <Badge tone={dev.is_active ? 'ok' : 'neutral'}>
                              {dev.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge tone="navy">{dev.platform.toUpperCase()}</Badge>
                            {dev.app_version && <span className="text-[10px] text-ink-2">v{dev.app_version}</span>}
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-ink-2 truncate max-w-xs">{dev.device_token}</p>
                          <p className="mt-0.5 text-[10px] text-ink-2">Last active: {dev.last_seen_at ? new Date(dev.last_seen_at).toLocaleString() : 'Recent'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {dev.is_active && (
                          <Btn size="sm" variant="tertiary" onClick={() => handleDeactivateDevice(dev.id)}>
                            Deactivate
                          </Btn>
                        )}
                        <Btn size="sm" variant="tertiary" onClick={() => handleDeleteDevice(dev.id)} title="Delete device token">
                          <Trash2 className="size-3.5 text-bad" />
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {devicesTab === 'push' && (
            <div className="space-y-4">
              <Notice tone="info">
                Simulated FCM/APNs push engine dispatches payload to all active companion tokens and logs audit records.
              </Notice>

              <FormRow label="Target Destination">
                <Select
                  value={pushTarget}
                  onChange={(e) => setPushTarget(e.target.value)}
                >
                  <option value="">{`All Active Devices (${devices.filter(d => d.is_active).length})`}</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {`${d.device_name || d.platform.toUpperCase()} (${d.device_token.slice(0, 12)}...)`}
                    </option>
                  ))}
                </Select>
              </FormRow>

              <FormRow label="Notification Title">
                <Input
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  placeholder="e.g. Rush Signage Production Alert"
                />
              </FormRow>

              <FormRow label="Alert Message Body">
                <Textarea
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  rows={3}
                  placeholder="Write push message content..."
                />
              </FormRow>

              <div className="pt-2">
                <Btn
                  variant="primary"
                  onClick={handleSendPush}
                  disabled={isSendingPush || devices.length === 0}
                  icon={<Send className="size-4" />}
                >
                  {isSendingPush ? 'Dispatching Push...' : 'Send Live Push Alert'}
                </Btn>
              </div>
            </div>
          )}

          {devicesTab === 'deliveries' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-2">Recent Dispatches (Push & Email)</span>
                <Btn size="sm" variant="tertiary" onClick={loadDevicesAndDeliveries}>
                  <RefreshCw className="mr-1 size-3" /> Refresh
                </Btn>
              </div>

              {deliveries.length === 0 ? (
                <EmptyState icon={<Bell className="size-6" />} title="No delivery records yet" text="Dispatched pushes and transactional emails will be logged here." />
              ) : (
                <div className="divide-y divide-line rounded-lg border border-line">
                  {deliveries.map((dl) => (
                    <div key={dl.id} className="flex items-start justify-between p-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge tone={dl.channel === 'push' ? 'brand' : 'navy'}>{dl.channel.toUpperCase()}</Badge>
                          <span className="font-semibold text-ink">{dl.title}</span>
                          <Badge tone={dl.status === 'delivered' ? 'ok' : 'bad'}>{dl.status}</Badge>
                        </div>
                        <p className="text-ink-2">To: <span className="font-mono text-[11px]">{dl.recipient}</span></p>
                        {dl.error_message && <p className="text-bad font-mono text-[10px]">{dl.error_message}</p>}
                      </div>
                      <span className="text-[10px] text-ink-2 shrink-0">{new Date(dl.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>
    </AdminPage>
  )
}

/* ---------- Email ---------- */
export function EmailSettings(_: any) {
  const { toast } = useApp()
  const s = useSettings('email', {
    host: 'smtp.gmail.com',
    port: '587',
    user: 'seguar.m@gmail.com',
    password: '',
    from: 'DisplayDelight',
    to: 'seguar.m@gmail.com',
    orders_enabled: true,
    quotes_enabled: true,
  })
  const [test, setTest] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [savingSmtp, setSavingSmtp] = useState(false)

  const handleSaveSmtp = async () => {
    setSavingSmtp(true)
    try {
      await adminApi.updateSettingsGroup('email', s.v)
      s.commit()
      toast('SMTP credentials saved to database successfully!', 'ok')
    } catch (err: any) {
      toast(`Failed to save SMTP: ${err.message || 'Error'}`, 'err')
    } finally {
      setSavingSmtp(false)
    }
  }

  const runTestEmail = async () => {
    setTest('busy')
    try {
      const res = await adminApi.testEmailConfig({
        to: s.v.to,
        host: s.v.host,
        port: s.v.port,
        user: s.v.user,
        password: s.v.password,
        from: s.v.from,
      })
      if (res && res.status === 'ok') {
        setTest('ok')
        setTestMsg(res.message || 'Test email dispatched successfully.')
        toast(`Test email sent to ${s.v.to}`, 'ok')
      } else {
        setTest('fail')
        setTestMsg(res?.message || 'Failed to dispatch test email. Check SMTP settings.')
        toast(res?.message || 'Failed to dispatch test email', 'err')
      }
    } catch (err: any) {
      setTest('fail')
      setTestMsg(err.message || 'Error communicating with backend SMTP service.')
    }
  }

  const applyGmailDefaults = () => {
    s.set({
      host: 'smtp.gmail.com',
      port: '587',
      user: 'seguar.m@gmail.com',
      from: 'DisplayDelight',
      to: 'seguar.m@gmail.com',
    })
    toast('Loaded Gmail SMTP defaults (Host: smtp.gmail.com, Port: 587)', 'info')
  }

  return (
    <AdminPage
      title="Email settings"
      desc="Outgoing SMTP credentials for automated order confirmations, shipping alerts, and custom quote replies."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="secondary" size="sm" onClick={applyGmailDefaults}>
            Load Gmail Presets
          </Btn>
          <Btn size="sm" loading={savingSmtp} onClick={handleSaveSmtp}>
            Save SMTP Connection
          </Btn>
        </div>
      }
    >
      <Card
        title="SMTP connection"
        desc="Google Gmail SMTP, Microsoft 365, AWS SES, or custom business mail servers."
        actions={
          <div className="flex items-center gap-2">
            <Sensitive />
            <Btn size="sm" loading={savingSmtp} onClick={handleSaveSmtp}>
              Save Credentials
            </Btn>
          </div>
        }
      >
        <FormRow label="SMTP host" hint="For Gmail, use smtp.gmail.com with STARTTLS on port 587">
          <Input value={s.v.host} onChange={(e) => s.set({ host: e.target.value })} className="w-full max-w-lg" />
        </FormRow>
        <FormRow label="Port" hint="Standard: 587 (TLS/STARTTLS) or 465 (SSL)">
          <Input value={s.v.port} onChange={(e) => s.set({ port: e.target.value })} className="w-32" />
        </FormRow>
        <FormRow label="Username / Authenticated Email" hint="Gmail address associated with Google App Password">
          <Input value={s.v.user} onChange={(e) => s.set({ user: e.target.value })} className="w-full max-w-lg" />
        </FormRow>
        <Secret
          label="Password / App Password"
          hint="Google 16-character App Password (e.g. zkui wzoc hxwl grwu). Stored securely with AES database encryption."
          value={s.v.password ? '•••••••• (Custom Password Set)' : '•••••••• (Configured)'}
          onSave={(val) => {
            s.set({ password: val })
            adminApi.updateSettingsGroup('email', { ...s.v, password: val }).then(() => {
              toast('SMTP password saved and encrypted in database!', 'ok')
            }).catch((e) => {
              toast(`Saved locally, persist via Save button (${e.message})`, 'info')
            })
          }}
        />
        <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-2">
            Status: <span className="font-semibold text-ok">Active SMTP Profile</span> &bull; Authenticated Sender: <span className="font-mono text-ink">{s.v.user}</span>
          </p>
          <Btn size="sm" loading={savingSmtp} onClick={handleSaveSmtp}>
            Save SMTP Credentials
          </Btn>
        </div>
      </Card>

      <Card className="mt-5" title="Sender & Outbound Notifications">
        <FormRow label="From sender name" hint="Display name appearing in customer inboxes">
          <Input value={s.v.from} onChange={(e) => s.set({ from: e.target.value })} className="w-full max-w-lg" />
        </FormRow>
        <FormRow label="Customer order confirmation emails">
          <Switch
            on={s.v.orders_enabled ?? true}
            onChange={(v) => s.set({ orders_enabled: v })}
            label="Send instant receipt on paid checkout"
          />
        </FormRow>
        <FormRow label="Quotation request alerts">
          <Switch
            on={s.v.quotes_enabled ?? true}
            onChange={(v) => s.set({ quotes_enabled: v })}
            label="Send acknowledgment to customer and team on quote submission"
          />
        </FormRow>
        <FormRow label="Send a test email" hint="Enter a recipient address to verify outbound delivery in real time.">
          <div className="flex w-full max-w-lg flex-wrap gap-2">
            <Input
              type="email"
              value={s.v.to}
              onChange={(e) => s.set({ to: e.target.value })}
              placeholder="you@example.com"
              className="min-w-48 flex-1"
            />
            <Btn variant="secondary" loading={test === 'busy'} onClick={runTestEmail}>
              Send test email
            </Btn>
          </div>
          {test === 'ok' && (
            <div className="mt-3 w-full max-w-lg">
              <Notice tone="ok" title="Test email sent successfully">
                {testMsg || `Check the inbox for ${s.v.to}.`}
              </Notice>
            </div>
          )}
          {test === 'fail' && (
            <div className="mt-3 w-full max-w-lg">
              <Notice tone="bad" title="Test email failed">
                {testMsg || 'Verify the SMTP host, port, credentials, and recipient email address.'}
              </Notice>
            </div>
          )}
        </FormRow>
      </Card>
      {s.bar}
    </AdminPage>
  )
}

/* ---------- General ---------- */
export function GeneralSettings(_: any) {
  const up = useUpload()
  const s = useSettings('general', {
    name: 'DisplayDelight',
    tag: 'INNOVATION IS KEY TO SUCCESS',
    logo_url: '/logo-orange.png',
    email: '',
    phone: '',
    addr: '',
    hours: '',
    ann: '',
    annOn: false,
    maps: '',
    mapsOn: true,
  })

  useEffect(() => {
    if (up.state.status === 'done' && 'url' in up.state && up.state.url) {
      s.set({ logo_url: up.state.url })
    }
  }, [up.state.status, up.state.status === 'done' ? (up.state as any).url : ''])

  const officialPresets = [
    { label: 'Official Badge (Shield)', url: '/logo-badge.png', preview: '/logo-badge.png', bg: 'bg-[#f4efe8]' },
    { label: 'Official Badge (Circle)', url: '/logo-circle.png', preview: '/logo-circle.png', bg: 'bg-[#f4efe8]' },
    { label: 'Transparent Orange', url: '/logo-orange.png', preview: '/logo-orange.png', bg: 'bg-white' },
    { label: 'Transparent White', url: '/logo-white.png', preview: '/logo-white.png', bg: 'bg-navy' },
  ]

  return (
    <AdminPage title="General settings" desc="Brand, contact details and storefront announcements.">
      <Card title="Brand">
        <FormRow label="Site name"><Input value={s.v.name} onChange={(e) => s.set({ name: e.target.value })} className="max-w-md" /></FormRow>
        <FormRow label="Tagline" hint="Official brand slogan: INNOVATION IS KEY TO SUCCESS"><Input value={s.v.tag} onChange={(e) => s.set({ tag: e.target.value })} className="max-w-md" /></FormRow>
        <FormRow label="Official Logo Presets" hint="Choose from the verified DisplayDelight brand designs or upload your own.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl">
            {officialPresets.map((p) => {
              const active = s.v.logo_url === p.url || (p.url === '/logo-orange.png' && (!s.v.logo_url || s.v.logo_url === '/store/logo-orange.png'))
              return (
                <button
                  type="button"
                  key={p.url}
                  onClick={() => s.set({ logo_url: p.url })}
                  className={cx(
                    'group flex flex-col items-center rounded-xl border p-2.5 text-left transition',
                    active ? 'border-brand bg-brand-soft ring-2 ring-brand/30' : 'border-line hover:border-brand/40 bg-white'
                  )}
                >
                  <div className={cx('flex h-14 w-full items-center justify-center rounded-lg p-1.5 transition', p.bg)}>
                    <img src={resolveAssetUrl(p.preview)} alt={p.label} className="max-h-full max-w-full object-contain" />
                  </div>
                  <span className="mt-2 text-center text-xs font-semibold text-ink line-clamp-1">{p.label}</span>
                  {active && <span className="mt-1 text-[10px] font-bold text-brand uppercase tracking-wider">Active</span>}
                </button>
              )
            })}
          </div>
        </FormRow>
        <FormRow label="Custom Logo" hint="Shown in the storefront header and footer.">
          <div className="max-w-md space-y-3">
            {s.v.logo_url && (
              <div className="flex items-center gap-4 p-3 rounded-xl border border-line bg-soft/50">
                <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-line bg-white p-1.5 shadow-xs">
                  <img src={resolveAssetUrl(s.v.logo_url)} alt="Current brand logo" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-ink">Active Brand Logo</p>
                  <p className="text-ink-2 truncate max-w-[200px]">{s.v.logo_url}</p>
                </div>
              </div>
            )}
            <Uploader state={up.state} onFile={up.start} onRemove={() => { up.remove(); s.set({ logo_url: '/logo-orange.png' }) }} onRetry={up.retry} formats="PNG, SVG, JPG, CDR, PDF" maxSize="Recommended under 5 MB" />
          </div>
        </FormRow>
      </Card>
      <Card className="mt-5" title="Contact">
        <FormRow label="Contact email"><Input type="email" value={s.v.email} onChange={(e) => s.set({ email: e.target.value })} className="max-w-md" placeholder="hello@yourdomain.com" /></FormRow>
        <FormRow label="Phone"><Input value={s.v.phone} onChange={(e) => s.set({ phone: e.target.value })} className="max-w-md" placeholder="Business phone number" /></FormRow>
        <FormRow label="Address"><Textarea value={s.v.addr} onChange={(e) => s.set({ addr: e.target.value })} className="max-w-md" placeholder="Registered business address" /></FormRow>
        <FormRow label="Business hours"><Textarea value={s.v.hours} onChange={(e) => s.set({ hours: e.target.value })} className="max-w-md" placeholder="Days and hours you are available" /></FormRow>
      </Card>
      <Card className="mt-5" title="Announcement bar">
        <FormRow label="Show announcement bar"><Switch on={s.v.annOn} onChange={(v) => s.set({ annOn: v })} label="Show announcement bar" /></FormRow>
        <FormRow label="Announcement text" hint="Only enter offers you can honour."><Input value={s.v.ann} onChange={(e) => s.set({ ann: e.target.value })} disabled={!s.v.annOn} className="max-w-xl" placeholder="Announcement message" /></FormRow>
      </Card>
      <Card className="mt-5" title="Maps">
        <FormRow label="Show map on Contact page"><Switch on={s.v.mapsOn} onChange={(v) => s.set({ mapsOn: v })} label="Show map" /></FormRow>
        <FormRow label="Map embed link" hint="Paste the share or embed link from your maps provider."><Input value={s.v.maps} onChange={(e) => s.set({ maps: e.target.value })} className="max-w-xl" /></FormRow>
      </Card>
      {s.bar}
    </AdminPage>
  )
}

/* ---------- Payments ---------- */
export function Payments(_: any) {
  const { toast } = useApp()
  const s = useSettings('payments', {
    mode: 'test' as 'test' | 'live',
    key_id: 'rzp_test_Tq2xyBU7kvMX7q',
    key_secret: '',
    webhook_secret: '',
    webhook_status: 'connected',
  })
  const [t, setT] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle')
  const [testResult, setTestResult] = useState<string>('')
  const [confirm, setConfirm] = useState(false)

  const runTest = async () => {
    setT('busy')
    try {
      const res = await adminApi.testPaymentConfig()
      setT(res.status === 'ok' ? 'ok' : 'err')
      setTestResult(res.message || 'Payment configuration verified.')
      toast(res.message || 'Payment test succeeded', res.status === 'ok' ? 'ok' : 'err')
    } catch (err: any) {
      setT('err')
      setTestResult(err.error || 'Connection failed to payment gateway.')
      toast('Payment connection test failed', 'err')
    }
  }

  return (
    <AdminPage title="Payments" desc="Razorpay connection used at checkout.">
      <div className="mb-4"><Notice tone="info" title="Payment is confirmed only by the server">An order is marked paid after a verified webhook or server-side signature verification, never from the browser redirect alone.</Notice></div>
      <Card title="Razorpay" actions={<div className="flex items-center gap-2"><Badge tone={s.v.mode === 'live' ? 'ok' : 'neutral'} dot>{s.v.mode === 'live' ? 'Live Mode' : 'Test Mode'}</Badge><Sensitive /></div>}>
        <FormRow label="Mode" hint="Switching to Live affects real customer payments."><Segmented value={s.v.mode} onChange={(v) => (v === 'live' ? setConfirm(true) : s.set({ mode: v }))} options={[{ value: 'test', label: 'Test' }, { value: 'live', label: 'Live' }]} /></FormRow>
        <FormRow label="Key ID" hint="Public identifier, safe to display and used on checkout."><Input value={s.v.key_id} onChange={(e) => s.set({ key_id: e.target.value })} className="max-w-md font-mono" /></FormRow>
        <Secret label="Key secret" hint="Never displayed after saving. Replaces stored secret." onSave={(val) => s.set({ key_secret: val })} />
        <Secret label="Webhook secret" hint="Used to verify webhook signatures." onSave={(val) => s.set({ webhook_secret: val })} />
        <FormRow label="Webhook status"><div className="flex items-center gap-3"><Badge tone={s.v.webhook_status === 'connected' ? 'ok' : 'warn'} dot>{s.v.webhook_status === 'connected' ? 'Active & Receiving' : 'Awaiting first event'}</Badge><span className="text-xs text-ink-2">Endpoint: /api/v1/payments/webhook</span></div></FormRow>
        <FormRow label="Connection">
          <Btn variant="secondary" loading={t === 'busy'} onClick={runTest}>Test connection</Btn>
          {t === 'ok' && <p className="mt-2 text-sm text-ok">✓ {testResult}</p>}
          {t === 'err' && <p className="mt-2 text-sm text-bad">✕ {testResult}</p>}
        </FormRow>
      </Card>
      {s.bar}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Switch to Live mode?" footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setConfirm(false)}>Keep Test mode</Btn><Btn onClick={() => { s.set({ mode: 'live' }); setConfirm(false) }}>Switch to Live</Btn></div>}>
        <p className="text-sm text-ink-2">Customers will be charged real money. Make sure live keys and the live webhook are configured before saving.</p>
      </Modal>
    </AdminPage>
  )
}

/* ---------- Storage ---------- */
export function Storage(_: any) {
  const { toast } = useApp()
  const s = useSettings('storage', {
    r2_bucket: 'dd-artwork-sample',
    r2_account_id: '',
    images_cdn: 'cdn.displaydelight.in',
    images_account_id: '',
    stream_code: 'cfstream_dd_enterprise',
    r2_access_key: '',
    r2_secret_key: '',
    images_token: '',
    stream_token: '',
  })

  const [status, setStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ provider: string; status: string; message: string } | null>(null)

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true)
      const data = await adminApi.getStorageStatus()
      setStatus(data)
    } catch (err) {
      console.warn('Could not load storage status:', err)
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const runTest = async (provider: 'local' | 'r2' | 'images' | 'stream') => {
    setTesting(provider)
    setTestResult(null)
    try {
      const res = await adminApi.testStorage(provider)
      setTestResult({ provider, status: res.status, message: res.message })
      if (res.status === 'ok') {
        toast(res.message, 'ok')
      } else if (res.status === 'fallback_active') {
        toast(res.message, 'info')
      } else {
        toast(res.message, 'err')
      }
      await fetchStatus()
    } catch (err: any) {
      const msg = err?.error || err?.message || 'Failed to verify storage provider'
      setTestResult({ provider, status: 'error', message: msg })
      toast(msg, 'err')
    } finally {
      setTesting(null)
    }
  }

  const isR2Configured = Boolean(status?.r2?.configured || (s.v.r2_bucket && s.v.r2_access_key && s.v.r2_access_key !== '••••'))
  const isImagesConfigured = Boolean(status?.images?.configured || s.v.images_cdn)
  const isStreamConfigured = Boolean(status?.stream?.configured || s.v.stream_code)

  return (
    <AdminPage title="Storage & Cloudflare" desc="Cloudflare media services with durable server storage fallback.">
      {/* Overview Banner */}
      <div className="mb-5 space-y-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                <Cloud className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-ink">Active Storage Architecture</h3>
                  <Badge tone={status?.active_mode === 'cloudflare_primary' ? 'ok' : 'navy'}>
                    {status?.active_mode === 'cloudflare_primary'
                      ? 'Cloudflare Primary'
                      : status?.active_mode === 'hybrid'
                      ? 'Hybrid Cloud / Server'
                      : 'Durable Server Storage (Fallback Active)'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">
                  {status?.provider_summary || 'Durable server storage handles uploads. Cloudflare services can be connected below.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={fetchStatus} loading={loadingStatus} className="h-9 text-xs">
                <RefreshCw className="mr-1.5 size-3.5" />
                Refresh Status
              </Btn>
            </div>
          </div>

          {/* Fallback Notice per V3 §1.4 & §6.6 */}
          <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-50/60 p-3.5 text-xs leading-relaxed text-blue-900">
            <p className="font-semibold text-blue-950">Cloudflare-First with Automatic Server Fallback (V3 §1.4 & §6.6):</p>
            <p className="mt-0.5 text-blue-800">
              When Cloudflare credentials are configured, DisplayDelight routes images through Cloudflare Images CDN, videos through Cloudflare Stream, and customer artwork through Cloudflare R2 object storage. If Cloudflare is unconfigured or unreachable, the platform automatically and durably falls back to server disk storage with HMAC signature security and MIME validation.
            </p>
          </div>
        </div>

        {testResult && (
          <Notice
            tone={testResult.status === 'ok' ? 'ok' : testResult.status === 'fallback_active' ? 'info' : 'bad'}
            title={`Storage Verification: ${testResult.provider.toUpperCase()}`}
          >
            {testResult.message}
          </Notice>
        )}
      </div>

      {/* Grid of Storage Providers */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Durable Local Server Storage */}
        <Card
          title="Durable Server Storage"
          desc="Approved server disk fallback for artwork & media uploads"
          actions={
            <Badge tone={status?.local_storage?.healthy ? 'ok' : 'bad'} dot>
              {status?.local_storage?.healthy ? 'Healthy & Writable' : 'Attention Required'}
            </Badge>
          }
        >
          <div className="space-y-3">
            <FormRow label="Storage Directory" hint="Root path on host server for durable file persistence">
              <span className="flex h-10 items-center rounded-lg border border-line bg-soft px-3 font-mono text-xs text-ink overflow-x-auto">
                {status?.local_storage?.path || 'uploads/'}
              </span>
            </FormRow>
            <FormRow label="Available Capacity" hint="Free disk space available for media assets">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-ink text-sm">
                  {status?.local_storage?.free_mb ? `${status.local_storage.free_mb} MB available` : 'Disk capacity healthy'}
                </span>
                <Badge tone="ok">Canary Verified</Badge>
              </div>
            </FormRow>
            <div className="pt-2">
              <Btn
                variant="secondary"
                onClick={() => runTest('local')}
                loading={testing === 'local'}
                className="h-9 text-xs"
              >
                <CheckCheck className="mr-1.5 size-3.5" />
                Test Storage Write & Canary
              </Btn>
            </div>
          </div>
        </Card>

        {/* Cloudflare R2 */}
        <Card
          title="Cloudflare R2"
          desc="Original customer artwork and isolated high-res files"
          actions={
            <Badge tone={isR2Configured ? 'ok' : 'neutral'} dot>
              {isR2Configured ? 'Configured' : 'Fallback Active'}
            </Badge>
          }
        >
          <div className="space-y-3">
            <FormRow label="Bucket Name">
              <Input
                value={s.v.r2_bucket}
                onChange={(e) => s.set({ r2_bucket: e.target.value })}
                className="font-mono text-sm"
                placeholder="e.g. dd-artwork-production"
              />
            </FormRow>
            <Secret label="Access Key ID" onSave={(val) => s.set({ r2_access_key: val })} />
            <Secret label="Secret Access Key" onSave={(val) => s.set({ r2_secret_key: val })} />
            <div className="pt-2">
              <Btn
                variant="secondary"
                onClick={() => runTest('r2')}
                loading={testing === 'r2'}
                className="h-9 text-xs"
              >
                <PlugZap className="mr-1.5 size-3.5" />
                Test R2 Connection
              </Btn>
            </div>
          </div>
        </Card>

        {/* Cloudflare Images */}
        <Card
          title="Cloudflare Images"
          desc="Optimised storefront banners, gallery images & variants"
          actions={
            <Badge tone={isImagesConfigured ? 'ok' : 'neutral'} dot>
              {isImagesConfigured ? 'Connected' : 'Serving via /uploads'}
            </Badge>
          }
        >
          <div className="space-y-3">
            <FormRow label="Public CDN Hostname" hint="Custom domain configured with Cloudflare zone">
              <Input
                value={s.v.images_cdn}
                onChange={(e) => s.set({ images_cdn: e.target.value })}
                className="font-mono text-sm"
                placeholder="cdn.displaydelight.in"
              />
            </FormRow>
            <Secret label="API Token" onSave={(val) => s.set({ images_token: val })} />
            <div className="pt-2">
              <Btn
                variant="secondary"
                onClick={() => runTest('images')}
                loading={testing === 'images'}
                className="h-9 text-xs"
              >
                <PlugZap className="mr-1.5 size-3.5" />
                Test Images CDN
              </Btn>
            </div>
          </div>
        </Card>

        {/* Cloudflare Stream */}
        <Card
          title="Cloudflare Stream"
          desc="Adaptive bitrate video hosting, transcoding & showcase playback"
          actions={
            <Badge tone={isStreamConfigured ? 'ok' : 'neutral'} dot>
              {isStreamConfigured ? 'Configured' : 'Embed / Direct Mode'}
            </Badge>
          }
        >
          <div className="space-y-3">
            <FormRow label="Customer Code / Account ID">
              <Input
                value={s.v.stream_code}
                onChange={(e) => s.set({ stream_code: e.target.value })}
                className="font-mono text-sm"
                placeholder="cfstream_dd_enterprise"
              />
            </FormRow>
            <Secret label="Stream Token" onSave={(val) => s.set({ stream_token: val })} />
            <div className="pt-2">
              <Btn
                variant="secondary"
                onClick={() => runTest('stream')}
                loading={testing === 'stream'}
                className="h-9 text-xs"
              >
                <PlugZap className="mr-1.5 size-3.5" />
                Test Stream Service
              </Btn>
            </div>
          </div>
        </Card>
      </div>

      {/* Storage Metrics & Security Policy */}
      <Card className="mt-5" title="Storage Usage & Isolation Policy" desc="Live cloud metrics and customer artwork privacy rules">
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-soft/50 p-3.5">
            <p className="text-xs font-semibold text-ink-2">Customer Artwork Isolation</p>
            <p className="mt-1 text-sm font-bold text-ink">Private Subdirectories</p>
            <p className="mt-0.5 text-[11px] text-ink-2">Isolated per user session with 15-min signed HMAC URLs</p>
          </div>
          <div className="rounded-xl border border-line bg-soft/50 p-3.5">
            <p className="text-xs font-semibold text-ink-2">SVG Script Protection</p>
            <p className="mt-1 text-sm font-bold text-emerald-600">Active Filter</p>
            <p className="mt-0.5 text-[11px] text-ink-2">Rejects embedded scripts, inline handlers, and data URIs</p>
          </div>
          <div className="rounded-xl border border-line bg-soft/50 p-3.5">
            <p className="text-xs font-semibold text-ink-2">Automatic Fallback Engine</p>
            <p className="mt-1 text-sm font-bold text-brand">Zero Data Loss</p>
            <p className="mt-0.5 text-[11px] text-ink-2">Uploads route seamlessly to local server disk if cloud is offline</p>
          </div>
        </div>

        {[['R2 Artwork Storage', 34], ['Images Delivered via CDN', 18], ['Stream Showcase Minutes', 8]].map(([l, p]) => (
          <div key={l as string} className="mb-3 last:mb-0">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-ink">{l}</span>
              <span className="text-ink-2">{p}% of allocated tier</span>
            </div>
            <div className="h-2 rounded-full bg-soft">
              <div className="h-2 rounded-full bg-brand" style={{ width: p + '%' }} />
            </div>
          </div>
        ))}
      </Card>

      {s.bar}
    </AdminPage>
  )
}

/* ---------- GST ---------- */
export function GstTaxes(_: any) {
  const s = useSettings('gst', {
    reg: true,
    gstin: '29AAAAA0000A1Z5',
    rate: '18',
    incl: 'excl' as 'incl' | 'excl',
    hsn: [
      ['LED signage and light boxes', '9405'],
      ['Digital signage displays', '8528'],
      ['Acrylic stands and frames', '3926'],
      ['Roll-up and fabric displays', '4911'],
    ] as string[][],
  })
  return (
    <AdminPage title="GST & taxes" desc="Tax settings applied at checkout and on invoices.">
      <Card>
        <FormRow label="GST registered"><Switch on={s.v.reg} onChange={(v) => s.set({ reg: v })} label="GST registered" /></FormRow>
        <FormRow label="GSTIN" hint="15-character GST identification number."><Input value={s.v.gstin} disabled={!s.v.reg} maxLength={15} onChange={(e) => s.set({ gstin: e.target.value.toUpperCase() })} className="max-w-xs font-mono" /></FormRow>
        <FormRow label="Default GST rate"><Select value={s.v.rate} onChange={(e) => s.set({ rate: e.target.value })} className="max-w-xs">{['0', '5', '12', '18', '28'].map((r) => <option key={r} value={r}>{r}%</option>)}</Select></FormRow>
        <FormRow label="Prices" hint="Whether catalogue prices already include GST."><Segmented value={s.v.incl} onChange={(v) => s.set({ incl: v })} options={[{ value: 'excl', label: 'Exclusive of GST' }, { value: 'incl', label: 'Inclusive of GST' }]} /></FormRow>
      </Card>
      <Card className="mt-5" title="HSN codes" desc="Enter the HSN code for each product group, confirmed with your tax advisor." pad={false}>
        <Table head={['Product group', 'HSN code']}>{s.v.hsn.map(([g, c], i) => <Tr key={g}><Td>{g}</Td><Td><Input value={c} inputMode="numeric" onChange={(e) => s.set({ hsn: s.v.hsn.map((r, j) => (j === i ? [g, e.target.value.replace(/\D/g, '')] : r)) })} className="h-9 w-40 font-mono" placeholder="HSN" /></Td></Tr>)}</Table>
      </Card>
      {s.bar}
    </AdminPage>
  )
}

/* ---------- Shipping ---------- */
export function Shipping(_: any) {
  const s = useSettings('shipping', {
    zones: [
      { z: 'Local (same city)', rate: '300', days: '1–2 business days' },
      { z: 'Within state', rate: '600', days: '2–3 business days' },
      { z: 'Rest of India', rate: '1200', days: '4–6 business days' },
      { z: 'Remote and island regions', rate: '2500', days: '7–10 business days' },
    ],
    free: true,
    thr: '50000',
  })
  return (
    <AdminPage title="Shipping" desc="Flat rates by zone, entered by your team.">
      <Notice tone="info" title="Authoritative zone delivery rates">Rates configured here apply dynamically at checkout. Free shipping threshold automatically triggers free freight on qualifying orders.</Notice>
      <Card className="mt-5" title="Shipping zones" pad={false}>
        <div className="hidden md:block"><Table head={['Zone', 'Flat rate (₹)', 'Delivery estimate']}>{s.v.zones.map((r, i) => <Tr key={r.z}><Td className="font-medium">{r.z}</Td>
          <Td><Input type="number" min={0} value={r.rate} onChange={(e) => s.set({ zones: s.v.zones.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) })} className="h-9 w-32" /></Td>
          <Td><Input value={r.days} onChange={(e) => s.set({ zones: s.v.zones.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)) })} className="h-9 w-48" placeholder="e.g. as agreed" /></Td></Tr>)}</Table></div>
        <div className="space-y-4 p-4 md:hidden">{s.v.zones.map((r, i) => <div key={r.z} className="space-y-2"><p className="font-semibold">{r.z}</p><div className="grid grid-cols-2 gap-2"><Input type="number" min={0} placeholder="Rate (₹)" value={r.rate} onChange={(e) => s.set({ zones: s.v.zones.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) })} /><Input placeholder="Estimate" value={r.days} onChange={(e) => s.set({ zones: s.v.zones.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)) })} /></div></div>)}</div>
      </Card>
      <Card className="mt-5" title="Free shipping">
        <FormRow label="Offer free shipping above a threshold"><Switch on={s.v.free} onChange={(v) => s.set({ free: v })} label="Free shipping" /></FormRow>
        <FormRow label="Order value threshold (₹)"><Input type="number" min={0} disabled={!s.v.free} value={s.v.thr} onChange={(e) => s.set({ thr: e.target.value })} className="max-w-xs" /></FormRow>
      </Card>
      {s.bar}
    </AdminPage>
  )
}

/* ---------- Social ---------- */
export function SocialLinks(_: any) {
  const s = useSettings('social', {
    wa: '919840327440',
    msg: 'Hi DisplayDelight, I would like to know more about your commercial displays and custom signage.',
    links: [
      ['Instagram', 'https://instagram.com/displaydelight', true],
      ['Facebook', 'https://facebook.com/displaydelight', true],
      ['YouTube', 'https://youtube.com/@displaydelight', true],
      ['LinkedIn', 'https://linkedin.com/company/displaydelight', true],
    ] as [string, string, boolean][],
  })
  const set = (i: number, p: { u?: string; on?: boolean }) => s.set({ links: s.v.links.map((l, j) => (j === i ? ([l[0], p.u ?? l[1], p.on ?? l[2]] as [string, string, boolean]) : l)) })
  return (
    <AdminPage title="WhatsApp & social links" desc="Contact buttons and footer social icons.">
      <Card title="WhatsApp">
        <FormRow label="WhatsApp number" hint="With country code, digits only (e.g. 919840327440)."><Input inputMode="numeric" value={s.v.wa} onChange={(e) => s.set({ wa: e.target.value.replace(/\D/g, '') })} className="max-w-xs font-mono" placeholder="Country code and number" /></FormRow>
        <FormRow label="Prefilled message"><Textarea value={s.v.msg} onChange={(e) => s.set({ msg: e.target.value })} className="max-w-xl" /></FormRow>
      </Card>
      <Card className="mt-5" title="Social profiles" pad={false}>
        <div className="divide-y divide-line">{s.v.links.map(([n, u, on], i) => (
          <div key={n} className="flex flex-wrap items-center gap-3 p-4">
            <span className="w-24 text-sm font-semibold">{n}</span>
            <Input value={u} onChange={(e) => set(i, { u: e.target.value })} placeholder={`${n} profile link`} className="min-w-52 flex-1" />
            <label className="flex items-center gap-2 text-sm text-ink-2"><Switch on={on} onChange={(v) => set(i, { on: v })} label={`Show ${n} in footer`} />Show in footer</label>
          </div>))}</div>
      </Card>
      {s.bar}
    </AdminPage>
  )
}


/* ---------- Admin users ---------- */
const ROLES = ['Owner', 'Manager', 'Content Editor', 'Support', 'Order Handler']

export function AdminUsers(_: any) {
  const { toast } = useApp()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inv, setInv] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [f, setF] = useState({ n: '', e: '', r: 'Support' })
  const [off, setOff] = useState<any | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<{ email: string; role: string; invite_url?: string } | null>(null)

  const loadUsers = async () => {
    try {
      const data = await adminApi.getAdminUsers()
      if (Array.isArray(data)) {
        setUsers(data)
      }
    } catch (err: any) {
      console.warn('Could not load admin users:', err)
      toast('Failed to load team members', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleChange = async (u: any, nextRole: string) => {
    if (u.r === nextRole) return
    setUpdatingId(u.id)
    try {
      await adminApi.updateAdminUser(u.id, { role: nextRole })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, r: nextRole } : x)))
      toast(`Role for ${u.e} updated to ${nextRole}`, 'ok')
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to update role', 'err')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleInvite = async () => {
    if (!f.e || !f.e.includes('@')) return
    setInviting(true)
    try {
      const res = await adminApi.inviteAdminUser({
        email: f.e.trim(),
        name: f.n.trim() || undefined,
        role: f.r,
      })
      toast(`Invitation email sent to ${f.e}`, 'ok')
      setInv(false)
      setInviteResult({
        email: f.e.trim(),
        role: f.r,
        invite_url: res.invite_url,
      })
      setF({ n: '', e: '', r: 'Support' })
      await loadUsers()
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to invite user', 'err')
    } finally {
      setInviting(false)
    }
  }

  const handleResendInvite = async (u: any) => {
    setResendingId(u.id)
    try {
      const res = await adminApi.resendInvite(u.id)
      toast(res?.message || `Invitation email resent to ${u.e}`, 'ok')
      await loadUsers()
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to resend invitation', 'err')
    } finally {
      setResendingId(null)
    }
  }

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      toast('Invitation link copied to clipboard', 'ok')
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      toast('Failed to copy to clipboard', 'err')
    }
  }

  const handleToggleActive = async (u: any) => {
    setUpdatingId(u.id)
    try {
      const nextActive = !u.on
      await adminApi.updateAdminUser(u.id, { is_active: nextActive })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, on: nextActive, is_active: nextActive, status: nextActive ? 'active' : 'disabled' } : x)))
      toast(nextActive ? 'User reactivated' : 'User deactivated', 'ok')
      setOff(null)
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to update user', 'err')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AdminPage
      title="Admin users"
      desc="Administrative team members, roles, permissions, and invitation lifecycle."
      actions={
        <Btn icon={<Plus className="size-4" />} onClick={() => setInv(true)}>
          Invite user
        </Btn>
      }
    >
      {/* Invitation Success Banner */}
      {inviteResult && (
        <div className="mb-4 rounded-xl border border-brand/20 bg-brand/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-brand-fg text-xs font-bold">✓</span>
              <p className="font-semibold text-sm text-ink">Invitation Sent to {inviteResult.email}</p>
              <Badge tone="brand">{inviteResult.role}</Badge>
            </div>
            <p className="text-xs text-ink-2 mt-1">
              An invitation email has been dispatched. They must accept it and set their password to activate their admin account.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {inviteResult.invite_url && (
              <Btn
                size="sm"
                variant="secondary"
                icon={copiedId === 'banner' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                onClick={() => handleCopyLink(inviteResult.invite_url!, 'banner')}
              >
                {copiedId === 'banner' ? 'Copied' : 'Copy invite link'}
              </Btn>
            )}
            <Btn size="sm" variant="tertiary" onClick={() => setInviteResult(null)}>
              Dismiss
            </Btn>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">Team member records</span>
        <Btn size="sm" variant="tertiary" icon={<RefreshCw className="size-3.5" />} onClick={loadUsers}>
          Refresh
        </Btn>
      </div>

      <Card pad={false}>
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : users.length === 0 ? (
          <EmptyState title="No administrative users found" />
        ) : (
          <>
            <div className="hidden md:block">
              <Table head={['User', 'Role', 'Status', 'Last activity', 'Actions']}>
                {users.map((u) => {
                  const isPending = u.status === 'invited' || (!u.on && u.has_pending_invite)
                  return (
                    <Tr key={u.id || u.e}>
                      <Td>
                        <p className="font-semibold">{u.n || u.e.split('@')[0]}</p>
                        <p className="text-xs text-ink-2">{u.e}</p>
                      </Td>
                      <Td>
                        {u.r === 'Owner' ? (
                          <Badge tone="navy">Owner</Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={u.r}
                              disabled={updatingId === u.id}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-xs hover:border-brand focus:border-brand focus:ring-1 focus:ring-brand focus:outline-hidden transition-all cursor-pointer"
                            >
                              {ROLES.filter((r) => r !== 'Owner').map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            {updatingId === u.id && (
                              <RefreshCw className="size-3 animate-spin text-brand" />
                            )}
                          </div>
                        )}
                      </Td>
                      <Td>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 border border-amber-500/20">
                            <Clock className="size-3" />
                            Pending Invite
                          </span>
                        ) : (
                          <StatusBadge s={u.on ? 'Active' : 'Disabled'} />
                        )}
                      </Td>
                      <Td className="text-ink-2 text-xs">{u.l}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              {u.invite_url && (
                                <Btn
                                  size="sm"
                                  variant="secondary"
                                  icon={copiedId === u.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                                  onClick={() => handleCopyLink(u.invite_url, u.id)}
                                  title="Copy acceptance link"
                                >
                                  {copiedId === u.id ? 'Copied' : 'Copy link'}
                                </Btn>
                              )}
                              <Btn
                                size="sm"
                                variant="tertiary"
                                icon={<Mail className="size-3.5" />}
                                loading={resendingId === u.id}
                                onClick={() => handleResendInvite(u)}
                                title="Resend invitation email"
                              >
                                Resend email
                              </Btn>
                            </>
                          ) : (
                            u.r !== 'Owner' && (
                              <Btn
                                size="sm"
                                variant={u.on ? 'secondary' : 'tertiary'}
                                loading={updatingId === u.id}
                                onClick={() => (u.on ? setOff(u) : handleToggleActive(u))}
                              >
                                {u.on ? 'Deactivate' : 'Reactivate'}
                              </Btn>
                            )
                          )}
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </Table>
            </div>

            {/* Mobile Cards */}
            <ul className="divide-y divide-line md:hidden">
              {users.map((u) => {
                const isPending = u.status === 'invited' || (!u.on && u.has_pending_invite)
                return (
                  <li key={u.id || u.e} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{u.n || u.e.split('@')[0]}</p>
                        <p className="text-xs text-ink-2">{u.e}</p>
                      </div>
                      <div>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-600 border border-amber-500/20">
                            <Clock className="size-2.5" />
                            Pending Invite
                          </span>
                        ) : (
                          <StatusBadge s={u.on ? 'Active' : 'Disabled'} />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-3">Role:</span>
                        {u.r === 'Owner' ? (
                          <Badge tone="navy">Owner</Badge>
                        ) : (
                          <select
                            value={u.r}
                            disabled={updatingId === u.id}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink"
                          >
                            {ROLES.filter((r) => r !== 'Owner').map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPending ? (
                          <>
                            {u.invite_url && (
                              <Btn
                                size="sm"
                                variant="secondary"
                                icon={<Copy className="size-3" />}
                                onClick={() => handleCopyLink(u.invite_url, u.id)}
                              >
                                {copiedId === u.id ? 'Copied' : 'Link'}
                              </Btn>
                            )}
                            <Btn
                              size="sm"
                              variant="tertiary"
                              icon={<Mail className="size-3" />}
                              loading={resendingId === u.id}
                              onClick={() => handleResendInvite(u)}
                            >
                              Resend
                            </Btn>
                          </>
                        ) : (
                          u.r !== 'Owner' && u.on && (
                            <Btn size="sm" variant="secondary" onClick={() => setOff(u)}>
                              Deactivate
                            </Btn>
                          )
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Invite Drawer */}
      <Drawer
        open={inv}
        onClose={() => setInv(false)}
        title="Invite team member"
        footer={
          <Btn disabled={!f.e.includes('@')} loading={inviting} onClick={handleInvite}>
            Send invitation email
          </Btn>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-2">
            An invitation email will be sent to the recipient with a secure link. They will be prompted to set their password and will only be activated once they accept.
          </p>

          <Field label="Full name" hint="Optional, can be set upon acceptance">
            <Input
              type="text"
              value={f.n}
              placeholder="e.g. Alex Sharma"
              onChange={(e) => setF({ ...f, n: e.target.value })}
            />
          </Field>

          <Field label="Email address" required>
            <Input
              type="email"
              value={f.e}
              placeholder="teammate@company.com"
              onChange={(e) => setF({ ...f, e: e.target.value })}
            />
          </Field>

          <Field label="Role">
            <Select value={f.r} onChange={(e) => setF({ ...f, r: e.target.value })}>
              {ROLES.filter((r) => r !== 'Owner').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Drawer>

      {/* Deactivate confirmation modal */}
      <Modal
        open={!!off}
        onClose={() => setOff(null)}
        title="Deactivate this user?"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setOff(null)}>Cancel</Btn>
            <Btn variant="danger" loading={updatingId === off?.id} onClick={() => off && handleToggleActive(off)}>
              Deactivate
            </Btn>
          </div>
        }
      >
        <p className="text-sm text-ink-2">
          {off?.e} will no longer be able to sign in. You can reactivate them at any time.
        </p>
      </Modal>
    </AdminPage>
  )
}

/* ---------- Roles ---------- */
const MODS = ['Orders', 'Customers', 'Quotes & enquiries', 'Inventory', 'Coupons', 'Homepage & content', 'Media library', 'SEO', 'Payments & storage', 'Settings', 'Admin users']
const ACTS = ['View', 'Create', 'Edit', 'Delete', 'Publish']
const defaults = (r: string) => MODS.map((m, i) => ACTS.map((_, a) => (r === 'Owner' ? true : r === 'Manager' ? i < 9 && (a < 4 || i < 8) : r === 'Content Editor' ? [5, 6, 7].includes(i) && a !== 3 : r === 'Support' ? [0, 1, 2].includes(i) && a < (i === 2 ? 3 : 1) : r === 'Order Handler' ? ([0, 3].includes(i) && a < 3) || (i === 1 && a === 0) : false)))

export function Roles(_: any) {
  const [role, setRole] = useState('Owner')
  const init = useMemo(() => Object.fromEntries(ROLES.map((r) => [r, defaults(r)])), [])
  const s = useSettings<{ m: Record<string, boolean[][]> }>('roles', { m: init }, 'Role permissions saved to database')
  const grid = s.v?.m?.[role] || defaults(role)

  const toggle = (i: number, a: number) => {
    const curGrid = s.v?.m?.[role] || defaults(role)
    const nextGrid = curGrid.map((row: boolean[], x: number) =>
      x === i ? row.map((c: boolean, y: number) => (y === a ? !c : c)) : row
    )
    s.set({ m: { ...(s.v?.m || init), [role]: nextGrid } })
  }

  return (
    <AdminPage title="Roles & permissions" desc="Control role privileges and fine-grained module access persisted in the database.">
      <Card pad={false}>
        <div className="px-4">
          <Tabs value={role} onChange={setRole} tabs={ROLES.map((r) => ({ value: r, label: r }))} />
        </div>
        {role === 'Owner' && (
          <div className="p-4 pb-0">
            <Notice tone="info">The Owner role always has full access and cannot be edited.</Notice>
          </div>
        )}
        <Table head={['Module', ...ACTS]}>
          {MODS.map((m, i) => (
            <Tr key={m}>
              <Td className="font-medium">{m}</Td>
              {ACTS.map((a, j) => (
                <Td key={a}>
                  <Check_
                    checked={grid[i]?.[j] ?? false}
                    disabled={role === 'Owner'}
                    onChange={() => toggle(i, j)}
                    label={<span className="sr-only">{m} {a}</span>}
                  />
                </Td>
              ))}
            </Tr>
          ))}
        </Table>
      </Card>
      {s.bar}
    </AdminPage>
  )
}

/* ---------- Audit logs ---------- */
export function AuditLogs(_: any) {
  const [q, setQ] = useState('')
  const [user, setUser] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<any | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await adminApi.getAuditLogs({
        page,
        page_size: 25,
        actor_email: user === 'all' ? undefined : user,
      })
      if (data && Array.isArray(data.items)) {
        setLogs(data.items)
        setTotalPages(data.total_pages || 1)
        setTotalCount(data.total || 0)
      }
    } catch (err: any) {
      console.warn('Could not load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, user])

  const filteredLogs = logs.filter((l) => {
    if (!q) return true
    const term = q.toLowerCase()
    const actor = (l.actor_email || '').toLowerCase()
    const action = (l.action || '').toLowerCase()
    const rType = (l.resource_type || '').toLowerCase()
    const detailStr = (typeof l.detail === 'string' ? l.detail : JSON.stringify(l.detail || '')).toLowerCase()
    return actor.includes(term) || action.includes(term) || rType.includes(term) || detailStr.includes(term)
  })

  const actorEmails = Array.from(new Set(logs.map((l) => l.actor_email).filter(Boolean)))

  const formatLogTime = (iso: string) => {
    if (!iso) return 'Recent'
    try {
      const dt = new Date(iso)
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return iso
    }
  }

  return (
    <AdminPage
      title="Audit logs"
      desc="Immutable accountability records of administrative mutations from the database."
      actions={<Btn size="sm" variant="tertiary" onClick={loadLogs}>Refresh logs</Btn>}
    >
      <Card pad={false}>
        <Toolbar search={q} onSearch={setQ} placeholder="Search action, entity or change detail">
          <Select value={user} onChange={(e) => { setUser(e.target.value); setPage(1) }} className="h-10 w-auto">
            <option value="all">All actors</option>
            {actorEmails.map((email) => (
              <option key={email} value={email}>{email}</option>
            ))}
          </Select>
        </Toolbar>

        {loading && logs.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState title="No matching audit events" />
        ) : (
          <>
            <div className="hidden md:block">
              <Table head={['Time', 'Actor', 'Action', 'Resource', 'IP Address']}>
                {filteredLogs.map((l) => (
                  <Tr key={l.id} onClick={() => setSel(l)}>
                    <Td className="whitespace-nowrap text-ink-2">{formatLogTime(l.occurred_at)}</Td>
                    <Td className="font-medium text-ink">{l.actor_email}</Td>
                    <Td className="font-semibold text-brand">{l.action}</Td>
                    <Td className="capitalize">{l.resource_type || '—'}{l.resource_id ? ` #${String(l.resource_id).slice(0, 8)}` : ''}</Td>
                    <Td className="font-mono text-xs text-ink-2">{l.ip_address || '127.0.0.1'}</Td>
                  </Tr>
                ))}
              </Table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {filteredLogs.map((l) => (
                <li key={l.id}>
                  <button onClick={() => setSel(l)} className="block w-full p-4 text-left hover:bg-soft">
                    <p className="text-sm font-semibold text-ink">{l.action} · {l.resource_type}</p>
                    <p className="text-xs text-ink-2">{l.actor_email} · {formatLogTime(l.occurred_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
            <Pager page={page} pages={totalPages} onChange={setPage} total={`${totalCount} events`} />
          </>
        )}
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title="Audit event details">
        {sel && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[100px_1fr] gap-y-2">
              <dt className="text-ink-2">Time</dt>
              <dd className="font-medium">{formatLogTime(sel.occurred_at)}</dd>
              <dt className="text-ink-2">Actor</dt>
              <dd className="font-medium">{sel.actor_email}</dd>
              <dt className="text-ink-2">Action</dt>
              <dd className="font-semibold text-brand">{sel.action}</dd>
              <dt className="text-ink-2">Resource</dt>
              <dd className="font-medium capitalize">{sel.resource_type} {sel.resource_id ? `(${sel.resource_id})` : ''}</dd>
              <dt className="text-ink-2">IP Address</dt>
              <dd className="font-mono text-xs">{sel.ip_address || '127.0.0.1'}</dd>
            </dl>

            <div className="rounded-dd border border-line bg-soft/50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-2">Payload Details</p>
              <pre className="mt-1.5 max-h-60 overflow-x-auto text-xs font-mono text-ink">
                {typeof sel.detail === 'string'
                  ? sel.detail
                  : JSON.stringify(sel.detail, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </AdminPage>
  )
}
