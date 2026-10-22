import { useState, useEffect } from 'react'
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Monitor,
  Laptop,
  Copy,
  RotateCcw,
  Eye,
  Edit3,
  FileCode,
  Tag,
  ShieldCheck,
  Package,
  Truck,
  Sparkles,
  Users,
  Save,
  Check,
  ExternalLink,
} from 'lucide-react'
import { AdminPage, Card } from './kit'
import { Btn, Field, Input, Badge } from '../ui'
import { useApp } from '../store'
import { adminApi } from '../api'

export interface EmailTemplateItem {
  id: string
  category: 'customer' | 'admin'
  title: string
  badge: string
  subject: string
  description: string
  heading?: string
  body?: string
  cta_text?: string
  cta_url?: string
  custom_html?: string
  variables: string[]
  sample_context?: Record<string, string>
  preview_html?: string
  preview_subject?: string
  preview_text?: string
  is_customized?: boolean
  updated_at?: string
}

const FALLBACK_TEMPLATES: EmailTemplateItem[] = [
  {
    id: 'order_confirmation',
    category: 'customer',
    title: 'Order Confirmation',
    badge: 'Customer Transaction',
    subject: 'Order Confirmed: #{order_number} | DisplayDelight Commercial Displays',
    description: 'Sent automatically to the customer as soon as an order is placed and confirmed in the database.',
    heading: 'Thank you for your order, {customer_name}!',
    body: 'We have received your order #{order_number} placed on {order_date}. Our hardware engineering and fabrication team is now preparing your signage displays. You can track your order status in real time using your reference code.',
    cta_text: 'Track Order Live',
    cta_url: 'https://mohanwebstudio.online/store/#/track?ref={order_number}',
    variables: ['customer_name', 'order_number', 'order_date', 'total_rupees', 'items_summary', 'shipping_address', 'tracking_link'],
    sample_context: {
      customer_name: 'Valued Customer',
      order_number: 'DD-20261020-S68I9',
      order_date: '20 Oct 2026',
      total_rupees: '2,89,100',
      items_summary: 'Fine-Pitch Indoor LED Video Wall P1.8 × 1',
      shipping_address: 'No. 42 Commercial Complex, MG Road, Bangalore, Karnataka - 560001',
      tracking_link: 'https://mohanwebstudio.online/store/#/track?ref=DD-20261020-S68I9',
    },
  },
  {
    id: 'payment_confirmed',
    category: 'customer',
    title: 'Payment Verified & Receipt',
    badge: 'Financial Receipt',
    subject: 'Payment Verified — Order #{order_number} | DisplayDelight',
    description: 'Sent to customer when Razorpay payment is captured and verified by digital signature.',
    heading: 'Payment Verified: ₹{total_rupees}',
    body: 'Your payment for order #{order_number} has been verified and confirmed by Razorpay. An official GST Tax Invoice has been generated for your business records.',
    cta_text: 'Download Tax Invoice',
    cta_url: 'https://mohanwebstudio.online/store/#/account/orders',
    variables: ['customer_name', 'order_number', 'total_rupees', 'payment_id', 'gstin', 'payment_date'],
    sample_context: {
      customer_name: 'Valued Customer',
      order_number: 'DD-20261020-S68I9',
      total_rupees: '2,89,100',
      payment_id: 'pay_Tq58Trxo1YSOGM',
      gstin: '29AAAAA0000A1Z5',
      payment_date: '20 Oct 2026, 02:30 PM IST',
    },
  },
  {
    id: 'order_shipped',
    category: 'customer',
    title: 'Shipment & Dispatch',
    badge: 'Logistics Dispatch',
    subject: 'Dispatched: Your Order #{order_number} is on the way | DisplayDelight',
    description: 'Sent to customer when order status changes to Dispatched or In Transit.',
    heading: 'Your Display Hardware is on the way!',
    body: 'Great news! Order #{order_number} has completed quality testing and has been dispatched via our secure logistics network.\n\nCourier Partner: {courier_partner}\nTracking Number: {tracking_number}\nExpected Delivery: {expected_delivery}\nDelivery Destination: {shipping_address}',
    cta_text: 'Track Courier Delivery',
    cta_url: 'https://mohanwebstudio.online/store/#/track?ref={order_number}',
    variables: ['customer_name', 'order_number', 'courier_partner', 'tracking_number', 'expected_delivery', 'shipping_address'],
    sample_context: {
      customer_name: 'Valued Customer',
      order_number: 'DD-20261020-S68I9',
      courier_partner: 'Blue Dart Express Logistics',
      tracking_number: 'BLD-884920491',
      expected_delivery: '22 Oct 2026',
      shipping_address: 'No. 42 Commercial Complex, MG Road, Bangalore, Karnataka - 560001',
    },
  },
  {
    id: 'order_delivered',
    category: 'customer',
    title: 'Order Delivered',
    badge: 'Delivery Complete',
    subject: 'Delivered: Your Order #{order_number} has arrived | DisplayDelight',
    description: 'Sent to customer when order status is marked as Delivered.',
    heading: 'Your Order #{order_number} has been delivered!',
    body: 'We are pleased to inform you that order #{order_number} has been successfully delivered on {delivery_date} to:\n{shipping_address}\n\nThank you for choosing DisplayDelight for your commercial display solutions. If you need any assistance with installation, mounting, or warranty registration, our technical team is ready to assist.',
    cta_text: 'View Order & Invoices',
    cta_url: 'https://mohanwebstudio.online/store/#/account/orders',
    variables: ['customer_name', 'order_number', 'delivery_date', 'shipping_address', 'tracking_link'],
    sample_context: {
      customer_name: 'Valued Customer',
      order_number: 'DD-20261020-S68I9',
      delivery_date: '20 Oct 2026',
      shipping_address: 'No. 42 Commercial Complex, MG Road, Bangalore, Karnataka - 560001',
      tracking_link: 'https://mohanwebstudio.online/store/#/track?ref=DD-20261020-S68I9',
    },
  },
  {
    id: 'order_status_change',
    category: 'customer',
    title: 'Order Status Update',
    badge: 'Order Tracking',
    subject: 'Order #{order_number} Status Update: {status_label} | DisplayDelight',
    description: 'Sent to customer for operational status updates (e.g. Processing, In Production, Cancelled).',
    heading: 'Order #{order_number} Status: {status_label}',
    body: 'Hello {customer_name},\n\nYour order #{order_number} status has been updated to: {status_label}.\n\nUpdate Note: {note}\n\nYou can track the progress of your order in real time on our customer tracking portal.',
    cta_text: 'Track Order Live',
    cta_url: 'https://mohanwebstudio.online/store/#/track?ref={order_number}',
    variables: ['customer_name', 'order_number', 'status_label', 'note', 'tracking_link'],
    sample_context: {
      customer_name: 'Valued Customer',
      order_number: 'DD-20261020-S68I9',
      status_label: 'In Production',
      note: 'Hardware assembly and LED module calibration in progress.',
      tracking_link: 'https://mohanwebstudio.online/store/#/track?ref=DD-20261020-S68I9',
    },
  },
  {
    id: 'quote_received',
    category: 'customer',
    title: 'Quotation Request Acknowledgment',
    badge: 'B2B Quotation',
    subject: 'Quote Request Received: #{quote_number} | DisplayDelight Commercial Solutions',
    description: 'Sent to customer when they submit a custom display or sign quote request.',
    heading: "We've received your quotation request!",
    body: 'Thank you for reaching out regarding custom commercial displays and business signage. Our technical sales engineering team has received your specifications (#{quote_number}) and is preparing a formal proposal.',
    cta_text: 'View Quote Details',
    cta_url: 'https://mohanwebstudio.online/store/#/quote',
    variables: ['customer_name', 'quote_number', 'product_name', 'specifications', 'contact_phone'],
    sample_context: {
      customer_name: 'Sangamithra M',
      quote_number: 'QT-310',
      product_name: 'Custom Architectural Curved LED Installation',
      specifications: 'Curved radius 4.5m, P2.5 High Refresh rate, Outdoor weather-rated IP65',
      contact_phone: '+91 98403 27440',
    },
  },
  {
    id: 'quote_replied',
    category: 'customer',
    title: 'Quotation Proposal Ready',
    badge: 'B2B Quotation',
    subject: 'Your DisplayDelight Quotation Proposal is Ready (#{quote_number})',
    description: 'Sent to customer when admin publishes a formal quote proposal with pricing.',
    heading: 'Your Quotation Proposal is Ready',
    body: 'We have prepared a customized proposal for #{quote_number}. Estimated investment: ₹{estimated_total}. Review the technical specifications, delivery timeline, and warranty breakdown online.',
    cta_text: 'Review & Approve Quote',
    cta_url: 'https://mohanwebstudio.online/store/#/quote',
    variables: ['customer_name', 'quote_number', 'estimated_total', 'product_name', 'validity_days'],
    sample_context: {
      customer_name: 'Sangamithra M',
      quote_number: 'QT-310',
      estimated_total: '4,50,000',
      product_name: 'Custom Architectural Curved LED Installation',
      validity_days: '15 days',
    },
  },
  {
    id: 'admin_order_alert',
    category: 'admin',
    title: 'Admin: New Paid Order Alert',
    badge: 'Store Admin Alert',
    subject: '[NEW ORDER] #{order_number} — ₹{total_rupees} from {customer_name}',
    description: 'Instant alert sent to the store management team when a customer completes checkout.',
    heading: 'New Order Placed: #{order_number}',
    body: 'A new order has been paid and confirmed on DisplayDelight. Customer: {customer_name} ({customer_email}, {customer_phone}). Total: ₹{total_rupees}.',
    cta_text: 'Open in Admin Dashboard',
    cta_url: 'https://mohanwebstudio.online/store/#/admin/orders',
    variables: ['order_number', 'customer_name', 'customer_email', 'customer_phone', 'total_rupees', 'items_summary'],
    sample_context: {
      order_number: 'DD-20261020-S68I9',
      customer_name: 'Valued Customer',
      customer_email: 'seguar.m@gmail.com',
      customer_phone: '9840327440',
      total_rupees: '2,89,100',
      items_summary: 'Fine-Pitch Indoor LED Video Wall P1.8 × 1',
    },
  },
  {
    id: 'admin_quote_alert',
    category: 'admin',
    title: 'Admin: New Quotation Enquiry',
    badge: 'Store Admin Alert',
    subject: '[NEW QUOTE] Request #{quote_number} from {customer_name}',
    description: 'Alert sent to sales engineers when a prospective client submits a quote inquiry.',
    heading: 'New Custom Display Request: #{quote_number}',
    body: 'A customer requested a custom quote for {product_name}. Contact: {customer_name} | {customer_phone} | {customer_email}. Review specifications in the admin quotes console.',
    cta_text: 'Review Quote in Admin',
    cta_url: 'https://mohanwebstudio.online/store/#/admin/quotes',
    variables: ['quote_number', 'customer_name', 'customer_email', 'customer_phone', 'product_name', 'specifications'],
    sample_context: {
      quote_number: 'QT-310',
      customer_name: 'Sangamithra M',
      customer_email: 'seguar.m@gmail.com',
      customer_phone: '+91 98403 27440',
      product_name: 'Custom Architectural Curved LED Installation',
      specifications: 'Curved radius 4.5m, P2.5 High Refresh rate',
    },
  },
]

function buildHtml(
  heading: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string,
  badge = 'Official Communication'
) {
  const paragraphs = body
    .split('\n\n')
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #374151;">${p.trim()}</p>`
    )
    .join('')

  const cta =
    ctaText && ctaUrl
      ? `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
        <tr>
          <td align="left">
            <a href="${ctaUrl}" target="_blank" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-size: 14px; font-weight: 700; display: inline-block;">
              ${ctaText} &rarr;
            </a>
          </td>
        </tr>
      </table>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .p-mob { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 8px; background-color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #0284c7;">
              <table width="100%">
                <tr>
                  <td>
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Display<span style="color: #38bdf8;">Delight</span></h1>
                    <p style="color: #94a3b8; margin: 2px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Commercial Signage &amp; Displays</p>
                  </td>
                  <td align="right">
                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 14px; text-transform: uppercase;">${badge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="p-mob" style="padding: 32px 30px;">
              <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 20px; font-weight: 800; line-height: 1.35;">${heading}</h2>
              ${paragraphs}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0 0 4px; font-weight: 600;">DisplayDelight &bull; Innovation is Key to Success</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">Chennai / Bangalore Showroom Distribution Hub &bull; +91 98403 27440</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function EmailTemplatesManager() {
  const { toast } = useApp()
  const [templates, setTemplates] = useState<EmailTemplateItem[]>(FALLBACK_TEMPLATES)
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer')
  const [selectedId, setSelectedId] = useState<string>(FALLBACK_TEMPLATES[0].id)
  const [viewMode, setViewMode] = useState<'desktop' | 'laptop' | 'mobile' | 'code'>('laptop')
  const [mobileTab, setMobileTab] = useState<'preview' | 'editor' | 'templates'>('preview')
  const [testEmail, setTestEmail] = useState('seguar.m@gmail.com')
  const [sendingTest, setSendingTest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Editable Form State for Active Template
  const [editSubject, setEditSubject] = useState('')
  const [editHeading, setEditHeading] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editCtaText, setEditCtaText] = useState('')
  const [editCtaUrl, setEditCtaUrl] = useState('')
  const [useCustomHtml, setUseCustomHtml] = useState(false)
  const [editCustomHtml, setEditCustomHtml] = useState('')

  // Load templates from Backend API on mount
  const loadTemplates = async () => {
    try {
      const data = await adminApi.getEmailTemplates()
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data)
      }
    } catch {
      // Fallback templates remain available
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const activeTemplate = templates.find((t) => t.id === selectedId) || templates[0] || FALLBACK_TEMPLATES[0]

  // Sync form inputs when active template changes
  useEffect(() => {
    if (activeTemplate) {
      setEditSubject(activeTemplate.subject || '')
      setEditHeading(activeTemplate.heading || '')
      setEditBody(activeTemplate.body || '')
      setEditCtaText(activeTemplate.cta_text || '')
      setEditCtaUrl(activeTemplate.cta_url || '')
      setUseCustomHtml(Boolean(activeTemplate.custom_html))
      setEditCustomHtml(activeTemplate.custom_html || '')
    }
  }, [selectedId, activeTemplate?.updated_at])

  // Substitute sample variables in string
  const substituteContext = (text: string) => {
    if (!text) return ''
    let res = text
    const ctx = activeTemplate.sample_context || {}
    for (const [k, v] of Object.entries(ctx)) {
      res = res.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
      res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
    return res
  }

  // Live Rendered HTML for preview
  const liveSubject = substituteContext(editSubject)
  const liveHeading = substituteContext(editHeading)
  const liveBody = substituteContext(editBody)
  const liveCtaText = substituteContext(editCtaText)
  const liveCtaUrl = substituteContext(editCtaUrl)

  const renderedHtml =
    useCustomHtml && editCustomHtml.trim()
      ? substituteContext(editCustomHtml)
      : buildHtml(liveHeading || liveSubject, liveBody, liveCtaText, liveCtaUrl, activeTemplate.badge)

  const filteredTemplates = templates.filter((t) => t.category === activeTab)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        subject: editSubject,
        heading: editHeading,
        body: editBody,
        cta_text: editCtaText,
        cta_url: editCtaUrl,
        custom_html: useCustomHtml ? editCustomHtml : null,
      }
      const res = await adminApi.updateEmailTemplate(activeTemplate.id, payload)
      if (res && res.template) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === activeTemplate.id ? { ...t, ...res.template, is_customized: true } : t))
        )
      }
      toast(`Template "${activeTemplate.title}" saved successfully!`, 'ok')
    } catch (err: any) {
      toast(`Failed to save template: ${err.message || 'Error'}`, 'err')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm(`Reset template "${activeTemplate.title}" to system defaults?`)) return
    setResetting(true)
    try {
      const res = await adminApi.resetEmailTemplate(activeTemplate.id)
      if (res && res.template) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === activeTemplate.id ? { ...res.template, is_customized: false } : t))
        )
        setEditSubject(res.template.subject || '')
        setEditHeading(res.template.heading || '')
        setEditBody(res.template.body || '')
        setEditCtaText(res.template.cta_text || '')
        setEditCtaUrl(res.template.cta_url || '')
        setUseCustomHtml(false)
        setEditCustomHtml('')
      }
      toast(`Template "${activeTemplate.title}" reset to factory defaults.`, 'info')
    } catch (err: any) {
      toast(`Failed to reset template: ${err.message || 'Error'}`, 'err')
    } finally {
      setResetting(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail.trim() || !testEmail.includes('@')) {
      toast('Please enter a valid recipient email address', 'err')
      return
    }
    setSendingTest(true)
    try {
      const res = await adminApi.testSendEmailTemplate(activeTemplate.id, {
        to: testEmail.trim(),
        subject: editSubject,
        heading: editHeading,
        body: editBody,
        cta_text: editCtaText,
        cta_url: editCtaUrl,
        custom_html: useCustomHtml ? editCustomHtml : undefined,
      })
      if (res && res.status === 'ok') {
        toast(`Real test email dispatched to ${testEmail}!`, 'ok')
      } else {
        toast(res?.message || 'Check SMTP configuration', 'err')
      }
    } catch (err: any) {
      toast(err?.error || err?.message || 'Failed to dispatch test email', 'err')
    } finally {
      setSendingTest(false)
    }
  }

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedHtml)
    toast('Responsive HTML email markup copied to clipboard!', 'ok')
  }

  const insertVariable = (varName: string) => {
    const token = `{${varName}}`
    setEditBody((prev) => (prev ? `${prev} ${token}` : token))
    toast(`Added ${token} to message body`, 'info')
  }

  return (
    <AdminPage
      title="Email Templates"
      desc="Automated transactional HTML emails for customers and administrative notification alerts."
      crumbs={[{ label: 'Settings', to: '/admin/email' }, { label: 'Email Templates' }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="secondary" size="sm" icon={<Copy className="size-3.5" />} onClick={handleCopyHtml}>
            Copy HTML
          </Btn>
          <Btn variant="secondary" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={handleReset} loading={resetting}>
            Reset Default
          </Btn>
          <Btn size="sm" icon={<Save className="size-3.5" />} onClick={handleSave} loading={saving}>
            Save Template
          </Btn>
        </div>
      }
    >
      {/* Mobile Screen Switcher Bar (only visible on mobile/small tablets) */}
      <div className="flex rounded-xl border border-line bg-soft p-1 mb-4 xl:hidden">
        <button
          onClick={() => setMobileTab('templates')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
            mobileTab === 'templates' ? 'bg-white text-brand shadow-xs' : 'text-ink-2'
          }`}
        >
          1. Templates ({templates.length})
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
            mobileTab === 'editor' ? 'bg-white text-brand shadow-xs' : 'text-ink-2'
          }`}
        >
          2. Edit Template
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
            mobileTab === 'preview' ? 'bg-white text-brand shadow-xs' : 'text-ink-2'
          }`}
        >
          3. Live Preview
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr] 2xl:grid-cols-[340px_1fr]">
        {/* Left Sidebar: Template Selection (Shown on desktop or when 'templates' active on mobile) */}
        <div className={`space-y-4 ${mobileTab !== 'templates' ? 'hidden xl:block' : 'block'}`}>
          {/* Category Tabs */}
          <div className="flex rounded-xl border border-line bg-soft p-1">
            <button
              onClick={() => {
                setActiveTab('customer')
                const first = templates.find((t) => t.category === 'customer')
                if (first) setSelectedId(first.id)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'customer' ? 'bg-white text-brand shadow-xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              Customer ({templates.filter((t) => t.category === 'customer').length})
            </button>
            <button
              onClick={() => {
                setActiveTab('admin')
                const first = templates.find((t) => t.category === 'admin')
                if (first) setSelectedId(first.id)
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'admin' ? 'bg-white text-brand shadow-xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              Admin Alerts ({templates.filter((t) => t.category === 'admin').length})
            </button>
          </div>

          {/* Template List Cards */}
          <div className="space-y-2">
            {filteredTemplates.map((t) => {
              const isSelected = selectedId === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id)
                    setMobileTab('editor')
                  }}
                  className={`w-full text-left rounded-xl p-3.5 border transition ${
                    isSelected
                      ? 'border-brand bg-brand-soft/40 shadow-xs'
                      : 'border-line bg-white hover:border-line-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">{t.badge}</span>
                    <div className="flex items-center gap-1.5">
                      {t.is_customized && (
                        <span className="text-[10px] font-bold text-ok bg-ok-soft px-1.5 py-0.5 rounded">Edited</span>
                      )}
                      {isSelected && <span className="size-2 rounded-full bg-brand" />}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-ink leading-snug">{t.title}</p>
                  <p className="text-xs text-ink-2 line-clamp-1 mt-1">{t.description}</p>
                </button>
              )
            })}
          </div>

          {/* Real Test Email Dispatcher */}
          <Card title="Send Live Test Email">
            <p className="text-xs text-ink-2 mb-3">
              Sends a real test email through your connected SMTP mail server using current customized template text.
            </p>
            <Field label="Recipient Email">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="text-xs"
              />
            </Field>
            <Btn
              variant="secondary"
              size="sm"
              full
              className="mt-3"
              icon={<Send className="size-3.5" />}
              onClick={handleSendTest}
              loading={sendingTest}
            >
              Dispatch Current Template
            </Btn>
          </Card>
        </div>

        {/* Right Main Column: Editor & Preview */}
        <div className="space-y-6">
          {/* Template Header & Responsive Viewport Switcher */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand uppercase tracking-wider">{activeTemplate.badge}</span>
                  {activeTemplate.is_customized && (
                    <span className="text-[10px] font-bold text-ok bg-ok-soft px-2 py-0.5 rounded-full">
                      Customized by Admin
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-ink mt-0.5">{activeTemplate.title}</h2>
                <p className="text-xs text-ink-2 mt-0.5">{activeTemplate.description}</p>
              </div>

              {/* Responsive Device Viewport Switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-line bg-soft p-1">
                <button
                  onClick={() => setViewMode('mobile')}
                  title="Mobile View (375px)"
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === 'mobile' ? 'bg-white shadow-xs text-brand' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Smartphone className="size-3.5" /> <span className="hidden sm:inline">Mobile (375px)</span>
                </button>
                <button
                  onClick={() => setViewMode('laptop')}
                  title="14-inch Laptop / Tablet View (700px)"
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === 'laptop' ? 'bg-white shadow-xs text-brand' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Laptop className="size-3.5" /> <span className="hidden sm:inline">14" Laptop</span>
                </button>
                <button
                  onClick={() => setViewMode('desktop')}
                  title="Desktop Full Width"
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === 'desktop' ? 'bg-white shadow-xs text-brand' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Monitor className="size-3.5" /> <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  title="Source HTML Code"
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    viewMode === 'code' ? 'bg-white shadow-xs text-brand' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <FileCode className="size-3.5" /> <span className="hidden sm:inline">HTML Code</span>
                </button>
              </div>
            </div>

            {/* Template Editing Panel (Shown on desktop or when 'editor' active on mobile) */}
            <div className={`mt-5 space-y-4 ${mobileTab === 'preview' ? 'hidden xl:block' : 'block'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="size-4 text-brand" /> Template Customization Fields
                </h3>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-ink-2 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomHtml}
                      onChange={(e) => setUseCustomHtml(e.target.checked)}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    Advanced: Custom Raw HTML Mode
                  </label>
                </div>
              </div>

              {!useCustomHtml ? (
                <>
                  {/* Subject Line Input */}
                  <div>
                    <label className="text-xs font-bold text-ink-2 uppercase tracking-wider block mb-1">
                      Email Subject Line Pattern
                    </label>
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="e.g. Order Confirmed: #{order_number}"
                      className="w-full text-sm font-mono"
                    />
                  </div>

                  {/* Main Heading */}
                  <div>
                    <label className="text-xs font-bold text-ink-2 uppercase tracking-wider block mb-1">
                      Hero Greeting / Main Heading
                    </label>
                    <Input
                      value={editHeading}
                      onChange={(e) => setEditHeading(e.target.value)}
                      placeholder="e.g. Thank you for your order, {customer_name}!"
                      className="w-full text-sm"
                    />
                  </div>

                  {/* Body Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-ink-2 uppercase tracking-wider">
                        Email Message Body (Markdown / Plain Text paragraphs)
                      </label>
                      <span className="text-[11px] text-ink-2">Separate paragraphs with a blank line</span>
                    </div>
                    <textarea
                      rows={4}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none leading-relaxed"
                      placeholder="Enter the notification message body..."
                    />
                  </div>

                  {/* Call to Action Button Row */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-ink-2 uppercase tracking-wider block mb-1">
                        CTA Button Label
                      </label>
                      <Input
                        value={editCtaText}
                        onChange={(e) => setEditCtaText(e.target.value)}
                        placeholder="e.g. Track Order Live"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-ink-2 uppercase tracking-wider block mb-1">
                        CTA Destination URL
                      </label>
                      <Input
                        value={editCtaUrl}
                        onChange={(e) => setEditCtaUrl(e.target.value)}
                        placeholder="e.g. https://displaydelight.com/track?ref={order_number}"
                        className="text-sm font-mono"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Raw HTML Editor Mode */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-ink-2 uppercase tracking-wider">
                      Custom HTML Template Markup
                    </label>
                    <span className="text-[11px] text-ink-2 font-mono">Accepts variables like &#123;customer_name&#125;</span>
                  </div>
                  <textarea
                    rows={12}
                    value={editCustomHtml}
                    onChange={(e) => setEditCustomHtml(e.target.value)}
                    className="w-full rounded-lg border border-line bg-navy p-3 text-xs font-mono text-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none leading-relaxed"
                    placeholder="<!DOCTYPE html><html><body>...</body></html>"
                  />
                </div>
              )}

              {/* Dynamic Variable Chips */}
              <div className="pt-2">
                <label className="text-xs font-bold text-ink-2 uppercase tracking-wider block mb-1.5">
                  Insert Dynamic Template Variables (Click to append into message body)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeTemplate.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="rounded-md bg-soft px-2.5 py-1 text-xs font-mono text-ink-2 border border-line hover:border-brand hover:text-brand hover:bg-brand-soft/50 transition cursor-pointer"
                    >
                      +{`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
                <p className="text-xs text-ink-2">
                  Preview below automatically updates in real-time as you type.
                </p>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={handleReset} loading={resetting}>
                    Reset Default
                  </Btn>
                  <Btn size="sm" icon={<Save className="size-3.5" />} onClick={handleSave} loading={saving}>
                    Save Template Changes
                  </Btn>
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive Responsive Email Canvas Preview */}
          <div className={`space-y-3 ${mobileTab === 'editor' ? 'hidden xl:block' : 'block'}`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="size-3.5 text-brand" />
                Live Preview &bull; Responsive Simulation ({viewMode === 'mobile' ? '375px Phone' : viewMode === 'laptop' ? '700px 14" Laptop' : viewMode === 'desktop' ? 'Full Desktop' : 'Source Code'})
              </span>
              <span className="text-xs text-ink-2 hidden sm:inline">Subject: <span className="font-semibold text-ink">{liveSubject}</span></span>
            </div>

            <div className="rounded-2xl border border-line bg-soft/70 p-3 sm:p-6 overflow-hidden flex justify-center">
              {viewMode === 'code' ? (
                <pre className="w-full max-h-[620px] overflow-auto rounded-xl bg-navy p-5 font-mono text-xs text-white leading-relaxed">
                  {renderedHtml}
                </pre>
              ) : (
                <div
                  className={`transition-all duration-300 rounded-xl overflow-hidden shadow-card border border-line bg-white ${
                    viewMode === 'mobile'
                      ? 'w-[375px] max-w-full'
                      : viewMode === 'laptop'
                      ? 'w-[700px] max-w-full'
                      : 'w-full max-w-[800px]'
                  }`}
                >
                  {/* Email Client Header Bar */}
                  <div className="bg-[#f8fafc] px-4 py-2.5 border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
                    <div className="truncate max-w-[340px]">
                      <span className="font-semibold text-ink">Subject:</span> {liveSubject}
                    </div>
                    <div className="text-[11px] font-mono text-ink-2">From: DisplayDelight &lt;seguar.m@gmail.com&gt;</div>
                  </div>

                  {/* Responsive Iframe */}
                  <iframe
                    title="Live Responsive Email Preview"
                    srcDoc={renderedHtml}
                    className="w-full h-[620px] border-none bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
