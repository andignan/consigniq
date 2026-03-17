// __tests__/unit/confirm-modal.test.ts
// Validates ConfirmModal component contract and confirm() removal

import * as fs from 'fs'
import * as path from 'path'

describe('ConfirmModal component', () => {
  const componentPath = path.join(process.cwd(), 'src/components/ui/ConfirmModal.tsx')
  const content = fs.readFileSync(componentPath, 'utf-8')

  it('exists as a file', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it('exports a default function component', () => {
    expect(content).toContain('export default function ConfirmModal')
  })

  it('accepts required props: open, onClose, onConfirm, title, message', () => {
    expect(content).toContain('open: boolean')
    expect(content).toContain('onClose: () => void')
    expect(content).toContain('onConfirm: () => void')
    expect(content).toContain('title: string')
    expect(content).toContain('message: string')
  })

  it('supports destructive variant with red button', () => {
    expect(content).toContain('destructive')
    expect(content).toContain('bg-red-600')
  })

  it('supports loading state', () => {
    expect(content).toContain('loading')
    expect(content).toContain('Processing')
  })

  it('uses MODAL_BACKDROP and MODAL_CONTAINER from style-constants', () => {
    expect(content).toContain('MODAL_BACKDROP')
    expect(content).toContain('MODAL_CONTAINER')
  })

  it('uses navy-800 for title', () => {
    expect(content).toContain('text-navy-800')
  })
})

describe('No browser confirm() in app code', () => {
  const appFiles = [
    'src/app/dashboard/inventory/page.tsx',
    'src/app/dashboard/settings/page.tsx',
    'src/app/admin/accounts/[id]/page.tsx',
  ]

  test.each(appFiles)('%s does not use confirm()', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    // Ensure no native confirm() calls remain
    expect(content).not.toMatch(/\bconfirm\(/)
  })

  test.each(appFiles)('%s imports ConfirmModal', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    expect(content).toContain("import ConfirmModal from '@/components/ui/ConfirmModal'")
  })
})

describe('Platform invite email account name', () => {
  const templatePath = path.join(process.cwd(), 'src/lib/email-templates.ts')
  const content = fs.readFileSync(templatePath, 'utf-8')

  it('shows ConsignIQ System for platform users (not ConsignIQ Platform)', () => {
    expect(content).toContain("'ConsignIQ System'")
    expect(content).not.toContain("'ConsignIQ (Platform)'")
  })
})
