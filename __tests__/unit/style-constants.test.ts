import {
  TIER_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  CARD_CLASSES,
  CARD_CLASSES_LG,
  MODAL_BACKDROP,
  MODAL_CONTAINER,
  INPUT_CLASSES,
  PAGE_CONTAINER,
  SECTION_HEADER,
} from '@/lib/style-constants'

describe('style-constants', () => {
  describe('TIER_BADGE_CLASSES', () => {
    it('has all four tier keys', () => {
      expect(Object.keys(TIER_BADGE_CLASSES).sort()).toEqual(['pro', 'solo', 'standard', 'starter'])
    })

    it('each value is a non-empty string with bg- and text- classes', () => {
      for (const [key, val] of Object.entries(TIER_BADGE_CLASSES)) {
        expect(val).toBeTruthy()
        expect(val).toContain('bg-')
        expect(val).toContain('text-')
      }
    })
  })

  describe('STATUS_BADGE_CLASSES', () => {
    it('has expected status keys', () => {
      expect(Object.keys(STATUS_BADGE_CLASSES).sort()).toEqual(['active', 'cancelled', 'deleted', 'suspended'])
    })

    it('each value is a non-empty string with bg- and text- classes', () => {
      for (const [key, val] of Object.entries(STATUS_BADGE_CLASSES)) {
        expect(val).toBeTruthy()
        expect(val).toContain('bg-')
        expect(val).toContain('text-')
      }
    })
  })

  describe('layout class strings', () => {
    it('CARD_CLASSES is non-empty and contains expected patterns', () => {
      expect(CARD_CLASSES).toContain('rounded')
      expect(CARD_CLASSES).toContain('border')
      expect(CARD_CLASSES).toContain('shadow')
    })

    it('CARD_CLASSES_LG uses 2xl rounding', () => {
      expect(CARD_CLASSES_LG).toContain('rounded-2xl')
    })

    it('MODAL_BACKDROP includes fixed positioning and z-index', () => {
      expect(MODAL_BACKDROP).toContain('fixed inset-0')
      expect(MODAL_BACKDROP).toContain('z-50')
      expect(MODAL_BACKDROP).toContain('bg-black/40')
    })

    it('MODAL_CONTAINER includes rounded and max-width', () => {
      expect(MODAL_CONTAINER).toContain('rounded-2xl')
      expect(MODAL_CONTAINER).toContain('max-w-md')
    })

    it('INPUT_CLASSES includes focus ring', () => {
      expect(INPUT_CLASSES).toContain('focus:ring-2')
      expect(INPUT_CLASSES).toContain('border')
    })

    it('PAGE_CONTAINER includes responsive max-width', () => {
      expect(PAGE_CONTAINER).toContain('lg:max-w-5xl')
      expect(PAGE_CONTAINER).toContain('px-4')
    })

    it('SECTION_HEADER includes uppercase and tracking', () => {
      expect(SECTION_HEADER).toContain('uppercase')
      expect(SECTION_HEADER).toContain('tracking-wider')
    })
  })
})
