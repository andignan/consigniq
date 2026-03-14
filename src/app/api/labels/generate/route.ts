// app/api/labels/generate/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type LabelSize = '2x1' | '4x2'

const LABEL_SIZES: Record<LabelSize, { width: number; height: number }> = {
  '2x1': { width: 2.25 * 72, height: 1.25 * 72 }, // points (72 per inch)
  '4x2': { width: 4 * 72, height: 2 * 72 },
}

function formatConsignorName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || ''
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function truncateText(text: string, font: ReturnType<Awaited<ReturnType<typeof PDFDocument.create>>['embedFont']>, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      currentLine = test
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
    if (lines.length >= 2) break
  }
  if (currentLine && lines.length < 2) lines.push(currentLine)
  if (lines.length === 2 && font.widthOfTextAtSize(lines[1], fontSize) > maxWidth) {
    lines[1] = lines[1].substring(0, Math.max(0, lines[1].length - 3)) + '...'
  }

  return lines
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await request.json()
  const { item_ids, size } = body as { item_ids?: string[]; size?: string }

  if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
    return NextResponse.json({ error: 'item_ids array is required and must not be empty' }, { status: 400 })
  }

  const labelSize = (size === '4x2' ? '4x2' : '2x1') as LabelSize
  const dimensions = LABEL_SIZES[labelSize]

  // Fetch items with consignor and location data, scoped by account_id
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, name, category, condition, price, effective_price, current_markdown_pct, consignor_id, location_id, account_id, consignors(name), locations(name)')
    .in('id', item_ids)
    .eq('account_id', profile.account_id)

  if (itemsError) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items found for the given IDs in your account' }, { status: 404 })
  }

  // Generate PDF
  const pdfDoc = await PDFDocument.create()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const isSmall = labelSize === '2x1'
  const padding = isSmall ? 8 : 14
  const nameFontSize = isSmall ? 8 : 12
  const detailFontSize = isSmall ? 6 : 9
  const priceFontSize = isSmall ? 10 : 16
  const smallFontSize = isSmall ? 5 : 7
  const brandFontSize = isSmall ? 4 : 6

  for (const item of items) {
    const page = pdfDoc.addPage([dimensions.width, dimensions.height])
    const { height } = page.getSize()
    const contentWidth = dimensions.width - padding * 2
    let y = height - padding

    // Item name (up to 2 lines)
    const nameLines = truncateText(item.name, fontBold, contentWidth, nameFontSize)
    for (const line of nameLines) {
      y -= nameFontSize
      page.drawText(line, { x: padding, y, size: nameFontSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
      y -= 1
    }
    y -= (isSmall ? 3 : 5)

    // Category & condition
    const conditionLabel = item.condition === 'like_new' ? 'Like New'
      : item.condition === 'very_good' ? 'Very Good'
      : item.condition.charAt(0).toUpperCase() + item.condition.slice(1)
    const detailText = `${item.category} · ${conditionLabel}`
    y -= detailFontSize
    page.drawText(detailText, { x: padding, y, size: detailFontSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })
    y -= (isSmall ? 4 : 7)

    // Price
    const hasMarkdown = (item.current_markdown_pct ?? 0) > 0
    const displayPrice = item.effective_price ?? item.price
    if (displayPrice != null) {
      y -= priceFontSize
      if (hasMarkdown && item.price != null) {
        // Show original price struck through
        const origText = `$${item.price.toFixed(2)}`
        const origWidth = fontRegular.widthOfTextAtSize(origText, detailFontSize)
        page.drawText(origText, { x: padding, y: y + (priceFontSize - detailFontSize), size: detailFontSize, font: fontRegular, color: rgb(0.6, 0.6, 0.6) })
        // Strikethrough line
        page.drawLine({
          start: { x: padding, y: y + (priceFontSize - detailFontSize) + detailFontSize * 0.35 },
          end: { x: padding + origWidth, y: y + (priceFontSize - detailFontSize) + detailFontSize * 0.35 },
          thickness: 0.5,
          color: rgb(0.6, 0.6, 0.6),
        })
        // Effective price next to it
        const newPriceText = `$${displayPrice.toFixed(2)}`
        page.drawText(newPriceText, { x: padding + origWidth + 4, y, size: priceFontSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
      } else {
        page.drawText(`$${displayPrice.toFixed(2)}`, { x: padding, y, size: priceFontSize, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
      }
      y -= (isSmall ? 3 : 5)
    }

    // Consignor name (first name + last initial)
    const consignorRaw = item.consignors as unknown as { name: string } | null
    if (consignorRaw?.name) {
      y -= detailFontSize
      page.drawText(formatConsignorName(consignorRaw.name), { x: padding, y, size: detailFontSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })
      y -= 1
    }

    // Location name
    const locationRaw = item.locations as unknown as { name: string } | null
    if (locationRaw?.name) {
      y -= detailFontSize
      page.drawText(locationRaw.name, { x: padding, y, size: detailFontSize, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })
    }

    // Bottom row: item ID (last 6 chars) + ConsignIQ branding
    const itemIdShort = item.id.slice(-6).toUpperCase()
    page.drawText(itemIdShort, { x: padding, y: padding, size: smallFontSize, font: fontRegular, color: rgb(0.6, 0.6, 0.6) })

    const brandText = 'ConsignIQ'
    const brandWidth = fontRegular.widthOfTextAtSize(brandText, brandFontSize)
    page.drawText(brandText, { x: dimensions.width - padding - brandWidth, y: padding, size: brandFontSize, font: fontRegular, color: rgb(0.7, 0.7, 0.7) })
  }

  const pdfBytes = await pdfDoc.save()

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="labels-${item_ids.length}.pdf"`,
    },
  })
}
