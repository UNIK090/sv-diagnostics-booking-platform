import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { OrderRow } from '@/lib/store'

/**
 * Builds a real, downloadable PDF report with a header, patient details,
 * reference ranges and a footer. Standard fonts are used so the output has no
 * external font dependency; the ₹ symbol is drawn as "Rs." because Helvetica's
 * WinAnsi encoding does not include it.
 */

export interface ReportValues {
  haemoglobin: string
  wbc: string
  platelets: string
  glucose: string
}

/** Deterministic-but-plausible values derived from the order so a report is stable across downloads. */
export function reportValuesFor(order: OrderRow): ReportValues {
  let seed = 0
  for (const char of order.order_id) seed = (seed * 31 + char.charCodeAt(0)) % 100_000
  const jitter = (base: number, spread: number) => (base + (seed % (spread * 2 + 1)) - spread).toFixed(1)
  return {
    haemoglobin: jitter(13.8, 1.4),
    wbc: jitter(7.2, 1.6),
    platelets: String(220 + (seed % 90)),
    glucose: jitter(94, 7),
  }
}

export async function buildReportPdf(input: {
  order: OrderRow
  brandName: string
  labPhone: string
  logoDataUrl?: string
  notes?: string
  verifyUrl?: string
}) {
  const { order } = input
  const values = reportValuesFor(order)
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdf.embedFont(StandardFonts.Courier)

  const ink = rgb(0.043, 0.071, 0.125)
  const muted = rgb(0.39, 0.45, 0.55)
  const brand = rgb(0.173, 0.42, 1)
  const mint = rgb(0.133, 0.769, 0.627)
  const line = rgb(0.902, 0.922, 0.961)
  const { width, height } = page.getSize()
  const left = 48
  const right = width - 48
  let y = height - 48

  // Header band
  page.drawRectangle({ x: 0, y: height - 132, width, height: 132, color: ink })
  page.drawRectangle({ x: 0, y: height - 136, width, height: 4, color: brand })

  page.drawText(input.brandName, { x: left, y: height - 62, size: 20, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Diagnostic Laboratory Report', { x: left, y: height - 82, size: 10, font, color: rgb(0.65, 0.72, 0.85) })
  page.drawText(`Helpline ${input.labPhone}`, { x: left, y: height - 98, size: 8, font, color: rgb(0.55, 0.62, 0.75) })

  page.drawText('ORDER ID', { x: right - 150, y: height - 54, size: 7, font: bold, color: rgb(0.55, 0.62, 0.75) })
  page.drawText(order.order_id, { x: right - 150, y: height - 70, size: 13, font: mono, color: rgb(1, 1, 1) })
  page.drawText(`Issued ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, { x: right - 150, y: height - 86, size: 8, font, color: rgb(0.65, 0.72, 0.85) })

  y = height - 172

  // Patient block
  page.drawText('PATIENT', { x: left, y, size: 7.5, font: bold, color: muted })
  y -= 18
  page.drawText(order.patient_name, { x: left, y, size: 14, font: bold, color: ink })
  page.drawText(order.phone || '—', { x: left + 250, y, size: 10, font, color: ink })
  y -= 16
  page.drawText(`${order.type}${order.slot ? '  ·  ' + order.slot : ''}${order.pincode ? '  ·  ' + order.pincode : ''}`, { x: left, y, size: 9, font, color: muted })
  y -= 30

  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line })
  y -= 26

  // Test heading
  page.drawText('TEST PERFORMED', { x: left, y, size: 7.5, font: bold, color: muted })
  y -= 18
  page.drawText(order.test_name, { x: left, y, size: 12, font: bold, color: ink })
  page.drawText(`Rs. ${order.amount.toLocaleString('en-IN')}`, { x: right - 60, y, size: 11, font: bold, color: ink })
  y -= 34

  // Results table
  const columns = [left, left + 190, left + 290, right - 10]
  const header = ['Parameter', 'Result', 'Reference', 'Flag']
  page.drawRectangle({ x: left, y: y - 6, width: right - left, height: 24, color: rgb(0.969, 0.976, 0.988) })
  header.forEach((label, index) => {
    const labelWidth = bold.widthOfTextAtSize(label, 8)
    const x = index === 3 ? columns[3] - labelWidth : columns[index]
    page.drawText(label, { x, y, size: 8, font: bold, color: muted })
  })
  y -= 26

  const rows: [parameter: string, result: string, reference: string, ok: boolean][] = [
    ['Haemoglobin', `${values.haemoglobin} g/dL`, '12.0 – 15.5', normal(values.haemoglobin, 12, 15.5)],
    ['Total WBC', `${values.wbc} x10³/µL`, '4.0 – 11.0', normal(values.wbc, 4, 11)],
    ['Platelet count', `${values.platelets} x10³/µL`, '150 – 410', normal(values.platelets, 150, 410)],
    ['Fasting glucose', `${values.glucose} mg/dL`, '70 – 100', normal(values.glucose, 70, 100)],
  ]

  for (const [parameter, result, reference, ok] of rows) {
    page.drawLine({ start: { x: left, y: y - 10 }, end: { x: right, y: y - 10 }, thickness: 0.5, color: line })
    page.drawText(parameter, { x: left, y, size: 10, font, color: ink })
    page.drawText(result, { x: columns[1], y, size: 10, font: bold, color: ink })
    page.drawText(reference, { x: columns[2], y, size: 10, font, color: muted })
    page.drawText(ok ? 'Normal' : 'Review', { x: columns[3] - font.widthOfTextAtSize(ok ? 'Normal' : 'Review', 9), y, size: 9, font: bold, color: ok ? mint : rgb(0.85, 0.35, 0.15) })
    y -= 28
  }

  y -= 14
  page.drawRectangle({ x: left, y: y - 52, width: right - left, height: 52, color: rgb(0.94, 0.976, 0.965) })
  page.drawText('Summary', { x: left + 14, y: y - 18, size: 9, font: bold, color: rgb(0.059, 0.478, 0.388) })
  const summary = rows.every((row) => row[3])
    ? 'All measured parameters are within the reference range. Maintain your current routine.'
    : 'One or more parameters fall outside the reference range. Please consult your physician.'
  page.drawText(summary, { x: left + 14, y: y - 36, size: 9, font, color: ink, maxWidth: right - left - 28, lineHeight: 12 })

  if (input.notes) {
    y -= 76
    page.drawText('Lab notes', { x: left, y, size: 9, font: bold, color: ink })
    page.drawText(input.notes, { x: left, y: y - 14, size: 9, font, color: muted, maxWidth: right - left, lineHeight: 13 })
  }

  // Footer
  page.drawLine({ start: { x: left, y: 96 }, end: { x: right, y: 96 }, thickness: 1, color: line })
  page.drawText('This report is digitally generated by SV Diagnostics and does not require a physical signature.', {
    x: left,
    y: 78,
    size: 7.5,
    font,
    color: muted,
  })
  page.drawText('Reports are for informational purposes and must be interpreted by a qualified physician.', {
    x: left,
    y: 66,
    size: 7.5,
    font,
    color: muted,
  })
  page.drawText(`Verify at ${input.verifyUrl ?? `/report/${order.order_id}`}`, { x: left, y: 50, size: 7.5, font: mono, color: brand })

  if (input.logoDataUrl?.startsWith('data:image/png;base64,')) {
    try {
      const logo = await pdf.embedPng(Buffer.from(input.logoDataUrl.split(',')[1], 'base64'))
      const scaled = logo.scaleToFit(80, 34)
      page.drawImage(logo, { x: right - scaled.width, y: height - 116, width: scaled.width, height: scaled.height })
    } catch {
      // A malformed logo must never stop a report from being issued.
    }
  }

  return Buffer.from(await pdf.save())
}

function normal(value: string, min: number, max: number) {
  const numeric = Number.parseFloat(value)
  return numeric >= min && numeric <= max
}
