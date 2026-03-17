/**
 * Tests for Logo component variant prop
 * Verifies dark/light variants render correct text colors
 */

describe('Logo component variant prop', () => {
  it('exports default function with variant parameter', () => {
    // The Logo component accepts variant="dark" | "light"
    // On dark backgrounds (sidebar, admin), variant="dark" sets Consign text to white
    // On light backgrounds, variant="light" (default) uses text-current
    const Logo = require('@/components/Logo').default
    expect(typeof Logo).toBe('function')
  })

  it('default variant is light', () => {
    // Verify the default parameter value
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/Logo.tsx'),
      'utf8'
    )
    expect(source).toContain("variant = 'light'")
  })

  it('dark variant sets Consign text to white via inline style', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/Logo.tsx'),
      'utf8'
    )
    // variant="dark" should set color to #ffffff
    expect(source).toContain("'#ffffff'")
    expect(source).toContain("variant === 'dark'")
  })

  it('IQ text always uses inline teal color regardless of variant', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/Logo.tsx'),
      'utf8'
    )
    // IQ span always has style={{ color: '#0A9E78' }}
    expect(source).toContain("color: '#0A9E78'")
  })

  it('accepts size prop with sm, md, lg options', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/Logo.tsx'),
      'utf8'
    )
    expect(source).toContain("size?: 'sm' | 'md' | 'lg'")
    expect(source).toContain('sm: { markH: 22')
    expect(source).toContain('md: { markH: 26')
    expect(source).toContain('lg: { markH: 40')
  })

  it('admin sidebar uses variant="dark"', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/app/admin/AdminSidebar.tsx'),
      'utf8'
    )
    expect(source).toContain('variant="dark"')
    expect(source).not.toContain('<Logo size="sm" />')
  })

  it('dashboard sidebar uses variant="dark"', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/layout/Sidebar.tsx'),
      'utf8'
    )
    expect(source).toContain('variant="dark"')
    expect(source).not.toContain('<Logo size="sm" />')
  })
})

describe('Welcome message consistency', () => {
  it('dashboard page shows welcome for single-location view', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/app/dashboard/page.tsx'),
      'utf8'
    )
    // Both All Locations and single location should have welcome
    const welcomeMatches = source.match(/Welcome back, \$\{firstName\}/g)
    expect(welcomeMatches).not.toBeNull()
    expect(welcomeMatches!.length).toBeGreaterThanOrEqual(2)
  })

  it('solo dashboard shows welcome message', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/components/SoloDashboard.tsx'),
      'utf8'
    )
    expect(source).toContain('Welcome back')
    expect(source).toContain("split(' ')[0]")
  })

  it('firstName is derived from full_name first word', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'src/app/dashboard/page.tsx'),
      'utf8'
    )
    // firstName comes from splitting full_name
    expect(source).toContain("split(' ')[0]")
  })
})
