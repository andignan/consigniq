import { MODAL_BACKDROP, MODAL_CONTAINER } from '@/lib/style-constants'

describe('Modal component contract', () => {
  describe('MODAL_BACKDROP', () => {
    it('includes fixed positioning for full overlay', () => {
      expect(MODAL_BACKDROP).toContain('fixed inset-0')
    })

    it('uses z-50 to stay above content', () => {
      expect(MODAL_BACKDROP).toContain('z-50')
    })

    it('centers content with flex', () => {
      expect(MODAL_BACKDROP).toContain('flex items-center justify-center')
    })

    it('has semi-transparent black background', () => {
      expect(MODAL_BACKDROP).toContain('bg-black/40')
    })
  })

  describe('MODAL_CONTAINER', () => {
    it('uses rounded-2xl for consistent modal shape', () => {
      expect(MODAL_CONTAINER).toContain('rounded-2xl')
    })

    it('has shadow-xl for elevation', () => {
      expect(MODAL_CONTAINER).toContain('shadow-xl')
    })

    it('constrains width with max-w-md', () => {
      expect(MODAL_CONTAINER).toContain('max-w-md')
    })

    it('has horizontal margin for mobile', () => {
      expect(MODAL_CONTAINER).toContain('mx-4')
    })

    it('has padding for content spacing', () => {
      expect(MODAL_CONTAINER).toContain('p-6')
    })

    it('max-w can be replaced for custom widths', () => {
      const custom = MODAL_CONTAINER.replace('max-w-md', 'max-w-lg')
      expect(custom).toContain('max-w-lg')
      expect(custom).not.toContain('max-w-md')
    })
  })
})
