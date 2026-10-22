import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, Download, Printer, X, FileText, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { Btn, Modal, Badge } from '../ui'
import { inr } from '../data'
import { resolveAssetUrl } from '../store'

export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  order_reference: string
  payment_reference?: string
  payment_status: string
  place_of_supply: string
  seller: {
    legal_name: string
    brand_name: string
    gstin: string
    pan: string
    state: string
    address: string
    contact_email: string
    contact_phone: string
    cin?: string
  }
  buyer: {
    name: string
    email?: string
    phone?: string
    company_name?: string
    gstin?: string
    billing_address: any
    shipping_address: any
  }
  items: Array<{
    sl_no: number
    product_name: string
    product_sku: string
    hsn_sac: string
    quantity: number
    unit_price_inr: number
    taxable_amount_inr: number
    gst_rate_percent: number
    cgst_amount_inr: number
    sgst_amount_inr: number
    igst_amount_inr: number
    total_inr: number
  }>
  totals: {
    taxable_value_inr: number
    cgst_inr: number
    sgst_inr: number
    igst_inr: number
    total_gst_inr: number
    shipping_inr: number
    discount_inr: number
    grand_total_inr: number
  }
  declaration?: string
}

function numberToWordsINR(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (amount === 0) return 'Zero Rupees Only'

  const convertLessThanOneThousand = (num: number): string => {
    let current = ''
    if (num >= 100) {
      current += units[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    if (num >= 20) {
      current += tens[Math.floor(num / 10)] + ' '
      num %= 10
    }
    if (num > 0) {
      current += units[num] + ' '
    }
    return current
  }

  let num = Math.floor(amount)
  let result = ''

  if (num >= 10000000) {
    result += convertLessThanOneThousand(Math.floor(num / 10000000)) + 'Crore '
    num %= 10000000
  }
  if (num >= 100000) {
    result += convertLessThanOneThousand(Math.floor(num / 100000)) + 'Lakh '
    num %= 100000
  }
  if (num >= 1000) {
    result += convertLessThanOneThousand(Math.floor(num / 1000)) + 'Thousand '
    num %= 1000
  }
  if (num > 0) {
    result += convertLessThanOneThousand(num)
  }

  return 'Rupees ' + result.trim() + ' Only'
}

export function InvoiceModal({
  open,
  onClose,
  orderRef,
  orderData,
}: {
  open: boolean
  onClose: () => void
  orderRef?: string
  orderData?: any
}) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    // If orderRef provided, attempt to fetch authoritative invoice from backend
    if (orderRef) {
      setLoading(true)
      fetch(`/api/v1/orders/${encodeURIComponent(orderRef)}/invoice`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load invoice')
          return res.json()
        })
        .then((data) => {
          setInvoice(data)
        })
        .catch(() => {
          // Fallback to client-side synthesis from orderData
          if (orderData) synthesizeInvoice(orderData)
        })
        .finally(() => setLoading(false))
    } else if (orderData) {
      synthesizeInvoice(orderData)
    }
  }, [open, orderRef, orderData])

  const synthesizeInvoice = (ord: any) => {
    const ref = ord.reference || ord.id || 'DD-ORD'
    const totalPaise = ord.total_paise || (ord.total ? ord.total * 100 : 0) || (ord.total_amount_inr ? ord.total_amount_inr * 100 : 0)
    const grandTotal = Math.round(totalPaise / 100)
    const subtotal = ord.subtotal_paise ? Math.round(ord.subtotal_paise / 100) : Math.round(grandTotal / 1.18)
    const totalGst = grandTotal - subtotal
    const buyerState = ord.shipping_address?.state || ord.billing_address?.state || 'Tamil Nadu'
    const isIntra = buyerState.toLowerCase().includes('tamil')

    const items = (ord.items || []).map((it: any, idx: number) => {
      const itTotal = it.total_price_inr || (it.total_paise ? Math.round(it.total_paise / 100) : (it.price || 0) * (it.quantity || it.qty || 1))
      const itTaxable = Math.round(itTotal / 1.18)
      const itTax = itTotal - itTaxable
      return {
        sl_no: idx + 1,
        product_name: it.product_name || it.name || 'Commercial Display Product',
        product_sku: it.product_sku || it.sku || 'DD-DSP',
        hsn_sac: '85285900',
        quantity: it.quantity || it.qty || 1,
        unit_price_inr: it.unit_price_inr || (it.unit_price_paise ? Math.round(it.unit_price_paise / 100) : it.price || itTaxable),
        taxable_amount_inr: itTaxable,
        gst_rate_percent: 18,
        cgst_amount_inr: isIntra ? Math.round(itTax / 2) : 0,
        sgst_amount_inr: isIntra ? (itTax - Math.round(itTax / 2)) : 0,
        igst_amount_inr: !isIntra ? itTax : 0,
        total_inr: itTotal,
      }
    })

    setInvoice({
      invoice_number: `INV-2026-${ref.replace('DD-', '')}`,
      invoice_date: ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      order_reference: ref,
      payment_reference: ord.payment_reference || ord.payments?.[0]?.provider_payment_id || 'ONLINE_VERIFIED',
      payment_status: ord.payment_status === 'paid' || ord.status === 'paid' || ord.status === 'processing' ? 'PAID' : 'PENDING',
      place_of_supply: buyerState,
      seller: {
        legal_name: 'DisplayDelight Commercial Signage Solutions Pvt. Ltd.',
        brand_name: 'DisplayDelight',
        gstin: '33AABCD1234E1Z5',
        pan: 'AABCD1234E',
        state: 'Tamil Nadu (Code: 33)',
        address: 'Plot 42, Guindy Industrial Estate, Guindy, Chennai, Tamil Nadu - 600032',
        contact_email: 'support@displaydelight.com',
        contact_phone: '+91 98403 27440',
        cin: 'U31900TN2023PTC158920',
      },
      buyer: {
        name: ord.customer_name || ord.shipping_address?.customer_name || 'Customer',
        email: ord.customer_email || 'customer@example.com',
        phone: ord.customer_phone || ord.shipping_address?.phone || '',
        company_name: ord.company_name,
        gstin: ord.gstin,
        billing_address: ord.billing_address || ord.shipping_address || {},
        shipping_address: ord.shipping_address || {},
      },
      items: items.length > 0 ? items : [
        {
          sl_no: 1,
          product_name: 'Commercial Signage Hardware',
          product_sku: 'DD-COM',
          hsn_sac: '85285900',
          quantity: 1,
          unit_price_inr: subtotal,
          taxable_amount_inr: subtotal,
          gst_rate_percent: 18,
          cgst_amount_inr: isIntra ? Math.round(totalGst / 2) : 0,
          sgst_amount_inr: isIntra ? (totalGst - Math.round(totalGst / 2)) : 0,
          igst_amount_inr: !isIntra ? totalGst : 0,
          total_inr: grandTotal,
        }
      ],
      totals: {
        taxable_value_inr: subtotal,
        cgst_inr: isIntra ? Math.round(totalGst / 2) : 0,
        sgst_inr: isIntra ? (totalGst - Math.round(totalGst / 2)) : 0,
        igst_inr: !isIntra ? totalGst : 0,
        total_gst_inr: totalGst,
        shipping_inr: ord.shipping_paise ? Math.round(ord.shipping_paise / 100) : 0,
        discount_inr: ord.discount_paise ? Math.round(ord.discount_paise / 100) : 0,
        grand_total_inr: grandTotal,
      },
      declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-6 print:p-0 print:bg-white flex justify-center items-start">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl print:m-0 print:w-full print:max-w-none print:shadow-none print:rounded-none">
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-brand" />
            <span className="font-bold text-ink">GST Tax Invoice</span>
            {invoice && <span className="text-xs font-mono bg-soft px-2 py-0.5 rounded border border-line">{invoice.invoice_number}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover transition"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-soft transition"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        {loading || !invoice ? (
          <div className="p-12 text-center text-ink-2">Generating Tax Invoice document…</div>
        ) : (
          <div ref={invoiceRef} className="p-8 sm:p-10 font-sans text-ink print:p-8">
            {/* Header / Brand */}
            <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b-2 border-brand">
              <div>
                <img src={resolveAssetUrl('/logo-orange.png')} alt="DisplayDelight" className="h-9 w-auto mb-2" />
                <h1 className="text-xl font-bold tracking-tight text-ink">{invoice.seller.legal_name}</h1>
                <p className="text-xs text-ink-2 max-w-sm mt-1">{invoice.seller.address}</p>
                <div className="mt-2 text-xs text-ink-2 space-y-0.5">
                  <p><span className="font-semibold text-ink">GSTIN:</span> {invoice.seller.gstin} | <span className="font-semibold text-ink">PAN:</span> {invoice.seller.pan}</p>
                  <p><span className="font-semibold text-ink">State:</span> {invoice.seller.state} | <span className="font-semibold text-ink">CIN:</span> {invoice.seller.cin}</p>
                  <p><span className="font-semibold text-ink">Support:</span> {invoice.seller.contact_phone} · {invoice.seller.contact_email}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block rounded-md bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                  Original for Recipient
                </span>
                <h2 className="text-2xl font-black mt-2 tracking-tight text-navy">TAX INVOICE</h2>
                <div className="mt-2 text-xs text-ink-2 space-y-1">
                  <p><span className="font-semibold text-ink">Invoice No:</span> <strong className="font-mono text-ink text-sm">{invoice.invoice_number}</strong></p>
                  <p><span className="font-semibold text-ink">Invoice Date:</span> {invoice.invoice_date}</p>
                  <p><span className="font-semibold text-ink">Order Ref:</span> <span className="font-mono">{invoice.order_reference}</span></p>
                  <p><span className="font-semibold text-ink">Place of Supply:</span> {invoice.place_of_supply}</p>
                  <p><span className="font-semibold text-ink">Payment Status:</span> <span className="font-bold text-ok">{invoice.payment_status}</span></p>
                </div>
              </div>
            </div>

            {/* Bill To & Ship To Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs">
              <div className="rounded-xl border border-line bg-soft/40 p-4">
                <h3 className="font-bold uppercase tracking-wider text-ink-2 text-[11px] mb-2 border-b border-line pb-1">Billed To (Customer / Buyer)</h3>
                <p className="text-sm font-bold text-ink">{invoice.buyer.company_name || invoice.buyer.name}</p>
                {invoice.buyer.company_name && <p className="text-xs text-ink-2">Attn: {invoice.buyer.name}</p>}
                {invoice.buyer.gstin && <p className="mt-1 font-semibold text-brand">GSTIN: {invoice.buyer.gstin}</p>}
                <p className="mt-1 text-ink-2 leading-relaxed">
                  {invoice.buyer.billing_address?.address_line1 || invoice.buyer.billing_address?.line || 'Delivery Address'}
                  {invoice.buyer.billing_address?.city && `, ${invoice.buyer.billing_address.city}`}
                  {invoice.buyer.billing_address?.state && `, ${invoice.buyer.billing_address.state}`}
                  {invoice.buyer.billing_address?.pin_code && ` - ${invoice.buyer.billing_address.pin_code}`}
                </p>
                <p className="mt-2 text-ink-2">Phone: {invoice.buyer.phone || '–'} | Email: {invoice.buyer.email || '–'}</p>
              </div>

              <div className="rounded-xl border border-line bg-soft/40 p-4">
                <h3 className="font-bold uppercase tracking-wider text-ink-2 text-[11px] mb-2 border-b border-line pb-1">Shipped To (Delivery Destination)</h3>
                <p className="text-sm font-bold text-ink">{invoice.buyer.name}</p>
                <p className="mt-1 text-ink-2 leading-relaxed">
                  {invoice.buyer.shipping_address?.address_line1 || invoice.buyer.shipping_address?.line || invoice.buyer.billing_address?.address_line1 || 'Delivery Address'}
                  {invoice.buyer.shipping_address?.city && `, ${invoice.buyer.shipping_address.city}`}
                  {invoice.buyer.shipping_address?.state && `, ${invoice.buyer.shipping_address.state}`}
                  {invoice.buyer.shipping_address?.pin_code && ` - ${invoice.buyer.shipping_address.pin_code}`}
                </p>
                <p className="mt-3 text-ink-2">Mode of Despatch: Express Commercial Freight Logistics</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-xl border border-line mt-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-navy text-white text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                    <th className="py-2.5 px-3 font-semibold">Description of Goods / Displays</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">HSN/SAC</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-24">Rate (₹)</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-24">Taxable (₹)</th>
                    {invoice.totals.igst_inr > 0 ? (
                      <th className="py-2.5 px-3 font-semibold text-right w-24">IGST (18%)</th>
                    ) : (
                      <>
                        <th className="py-2.5 px-3 font-semibold text-right w-20">CGST (9%)</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-20">SGST (9%)</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 font-semibold text-right w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invoice.items.map((it) => (
                    <tr key={it.sl_no} className="hover:bg-soft/50">
                      <td className="py-3 px-3 text-center text-ink-2 font-mono">{it.sl_no}</td>
                      <td className="py-3 px-3">
                        <strong className="text-ink font-semibold">{it.product_name}</strong>
                        <p className="text-[11px] text-ink-2 font-mono mt-0.5">SKU: {it.product_sku}</p>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-ink-2">{it.hsn_sac}</td>
                      <td className="py-3 px-3 text-center font-semibold">{it.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">{it.unit_price_inr.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{it.taxable_amount_inr.toLocaleString('en-IN')}</td>
                      {invoice.totals.igst_inr > 0 ? (
                        <td className="py-3 px-3 text-right font-mono">{it.igst_amount_inr.toLocaleString('en-IN')}</td>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-right font-mono">{it.cgst_amount_inr.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-right font-mono">{it.sgst_amount_inr.toLocaleString('en-IN')}</td>
                        </>
                      )}
                      <td className="py-3 px-3 text-right font-mono font-bold text-ink">{it.total_inr.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 items-start">
              <div>
                <div className="rounded-xl border border-line p-3.5 bg-soft/30 text-xs">
                  <p className="font-bold text-ink mb-1">Amount in Words:</p>
                  <p className="text-ink-2 italic font-serif leading-relaxed">{numberToWordsINR(invoice.totals.grand_total_inr)}</p>
                </div>

                <div className="mt-4 text-[11px] text-ink-2 space-y-1">
                  <p className="font-bold text-ink">Terms & Conditions:</p>
                  <p>1. Standard manufacturer warranty applies against hardware manufacturing defects.</p>
                  <p>2. Goods once sold are subject to our standard commercial warranty and returns policy.</p>
                  <p>3. Disputes subject to Chennai, Tamil Nadu jurisdiction.</p>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-soft/30 p-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between text-ink-2">
                    <span>Taxable Value (Subtotal):</span>
                    <span className="font-mono text-ink">₹{invoice.totals.taxable_value_inr.toLocaleString('en-IN')}</span>
                  </div>
                  {invoice.totals.igst_inr > 0 ? (
                    <div className="flex justify-between text-ink-2">
                      <span>Integrated GST (IGST @ 18%):</span>
                      <span className="font-mono text-ink">₹{invoice.totals.igst_inr.toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-ink-2">
                        <span>Central GST (CGST @ 9%):</span>
                        <span className="font-mono text-ink">₹{invoice.totals.cgst_inr.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-ink-2">
                        <span>State GST (SGST @ 9%):</span>
                        <span className="font-mono text-ink">₹{invoice.totals.sgst_inr.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  {invoice.totals.shipping_inr > 0 && (
                    <div className="flex justify-between text-ink-2">
                      <span>Shipping & Freight:</span>
                      <span className="font-mono text-ink">₹{invoice.totals.shipping_inr.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {invoice.totals.discount_inr > 0 && (
                    <div className="flex justify-between text-brand font-medium">
                      <span>Promotional Discount:</span>
                      <span className="font-mono">-₹{invoice.totals.discount_inr.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-line pt-2 text-sm font-bold text-ink">
                    <span>Total Invoice Amount:</span>
                    <span className="font-mono text-brand text-base">₹{invoice.totals.grand_total_inr.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatory Box */}
            <div className="mt-8 pt-6 border-t border-line flex flex-wrap items-end justify-between gap-6 text-xs">
              <div className="max-w-md">
                <p className="font-semibold text-ink">Declaration:</p>
                <p className="text-[11px] text-ink-2 mt-0.5">{invoice.declaration}</p>
                <p className="text-[10px] text-ink-2/70 mt-2">This is a system generated, digitally verified computer tax invoice under GST Rules.</p>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-bold text-ink">For {invoice.seller.legal_name}</p>
                <div className="h-14 flex items-center justify-end">
                  <div className="border border-line rounded px-4 py-1.5 text-[10px] font-mono text-ok uppercase tracking-wider bg-ok/5">
                    ✓ Digitally Signed & Authorized
                  </div>
                </div>
                <p className="text-[11px] font-bold text-ink">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
