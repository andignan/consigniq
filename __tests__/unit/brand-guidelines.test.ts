// __tests__/unit/brand-guidelines.test.ts
// Validates brand color system consistency across code and docs

import * as fs from 'fs'
import * as path from 'path'

// ─── Email template color constant ─────────────────────────
describe('EMAIL_COLORS.textPrimary', () => {
  const emailTemplatesPath = path.join(process.cwd(), 'src/lib/email-templates.ts')
  const content = fs.readFileSync(emailTemplatesPath, 'utf-8')

  it('uses navy-800 hex (#0d1f3c) for textPrimary', () => {
    expect(content).toContain("textPrimary: '#0d1f3c'")
  })

  it('does not use old #1a1a1a value', () => {
    expect(content).not.toContain('#1a1a1a')
  })
})

// ─── Brand guidelines doc exists and matches PRD ────────────
describe('docs/brand-guidelines.md', () => {
  const guidelinesPath = path.join(process.cwd(), 'docs/brand-guidelines.md')
  const prdPath = path.join(process.cwd(), 'docs/prd/brand-identity.md')

  it('exists as a file', () => {
    expect(fs.existsSync(guidelinesPath)).toBe(true)
  })

  it('contains Typography Colors section', () => {
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    expect(content).toContain('## Typography Colors')
  })

  it('documents navy-800 as heading color', () => {
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    expect(content).toContain('`text-navy-800`')
    expect(content).toContain('`#0d1f3c`')
  })

  it('documents text-brand-500 as link color', () => {
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    expect(content).toContain('`text-brand-500`')
    expect(content).toContain('Standalone text links')
  })

  it('documents text-gray-900 for form inputs', () => {
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    expect(content).toContain('`text-gray-900`')
    expect(content).toContain('Input, textarea, select')
  })

  it('contains v1.2 color mapping entries', () => {
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    expect(content).toContain('v1.2 — headings, stat values, bold labels')
    expect(content).toContain('v1.2 — email heading color matches navy-800')
    expect(content).toContain('v1.2 — body text normalization')
    expect(content).toContain('v1.2 — standalone link color')
  })

  it('PRD source contains same Typography Colors section', () => {
    const prdContent = fs.readFileSync(prdPath, 'utf-8')
    expect(prdContent).toContain('## Typography Colors')
    expect(prdContent).toContain('`text-navy-800`')
  })
})

// ─── Heading color consistency across key files ─────────────
describe('Heading color consistency (text-navy-800)', () => {
  const headingFiles = [
    'src/components/ui/Modal.tsx',
    'src/components/SoloDashboard.tsx',
    'src/components/UpgradeCard.tsx',
    'src/components/TrialExpiredPage.tsx',
    'src/components/ConsignorCard.tsx',
    'src/components/HelpWidget.tsx',
    'src/components/IntakeQueue.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/pricing/page.tsx',
    'src/app/dashboard/payouts/page.tsx',
    'src/app/dashboard/consignors/page.tsx',
    'src/app/admin/page.tsx',
    'src/app/admin/users/page.tsx',
    'src/app/admin/accounts/page.tsx',
    'src/app/auth/login/page.tsx',
  ]

  test.each(headingFiles)('%s uses text-navy-800 for headings', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    expect(content).toContain('text-navy-800')
  })

  const noGray900HeadingFiles = [
    'src/components/ui/Modal.tsx',
    'src/components/UpgradeCard.tsx',
    'src/components/TrialExpiredPage.tsx',
    'src/components/AgreementButton.tsx',
    'src/components/ConsignorActions.tsx',
  ]

  test.each(noGray900HeadingFiles)('%s has no text-gray-900 on headings', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    // These components have no inputs, so text-gray-900 should not appear at all
    expect(content).not.toContain('text-gray-900')
  })
})

// ─── Auth pages use navy-800 for headings ───────────────────
describe('Auth page headings use text-navy-800', () => {
  const authFiles = [
    'src/app/auth/login/page.tsx',
    'src/app/auth/invite/page.tsx',
    'src/app/auth/setup-password/page.tsx',
  ]

  test.each(authFiles)('%s uses text-navy-800', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    expect(content).toContain('text-navy-800')
  })

  it('auth/invite has no text-stone-900 headings', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'src/app/auth/invite/page.tsx'), 'utf-8')
    expect(content).not.toContain('text-stone-900')
  })
})

// ─── Form inputs still use text-gray-900 ────────────────────
describe('Form inputs preserve text-gray-900', () => {
  const formFiles = [
    'src/app/dashboard/settings/page.tsx',
    'src/app/dashboard/inventory/page.tsx',
    'src/app/dashboard/pricing/page.tsx',
  ]

  test.each(formFiles)('%s still has text-gray-900 for inputs', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    // These files have form inputs that should keep text-gray-900
    expect(content).toContain('text-gray-900')
  })
})
