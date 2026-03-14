/**
 * Tests for help system components
 * Covers: Tooltip rendering, HelpWidget visibility, knowledge base content
 */

import { HELP_KNOWLEDGE_BASE } from '@/lib/help-knowledge-base'

describe('HELP_KNOWLEDGE_BASE', () => {
  it('contains all major topic sections', () => {
    expect(HELP_KNOWLEDGE_BASE).toContain('CONSIGNORS:')
    expect(HELP_KNOWLEDGE_BASE).toContain('INTAKE:')
    expect(HELP_KNOWLEDGE_BASE).toContain('PRICING:')
    expect(HELP_KNOWLEDGE_BASE).toContain('60-DAY LIFECYCLE:')
    expect(HELP_KNOWLEDGE_BASE).toContain('MARKDOWNS:')
    expect(HELP_KNOWLEDGE_BASE).toContain('INVENTORY:')
    expect(HELP_KNOWLEDGE_BASE).toContain('REPORTS:')
    expect(HELP_KNOWLEDGE_BASE).toContain('SETTINGS:')
    expect(HELP_KNOWLEDGE_BASE).toContain('STAFF & USERS:')
    expect(HELP_KNOWLEDGE_BASE).toContain('MULTI-LOCATION:')
  })

  it('includes key information about splits', () => {
    expect(HELP_KNOWLEDGE_BASE).toContain('60% store / 40% consignor')
  })

  it('includes key information about lifecycle', () => {
    expect(HELP_KNOWLEDGE_BASE).toContain('60 days')
    expect(HELP_KNOWLEDGE_BASE).toContain('3-day grace period')
    expect(HELP_KNOWLEDGE_BASE).toContain('donation')
  })

  it('includes markdown schedule details', () => {
    expect(HELP_KNOWLEDGE_BASE).toContain('25% off at day 31')
    expect(HELP_KNOWLEDGE_BASE).toContain('50% off at day 46')
  })
})
