import { test, expect } from '@playwright/test'

test.describe('Help Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('help widget button is visible on /dashboard pages', async ({ page }) => {
    // The floating ? button should be visible
    const helpButton = page.locator('button').filter({ hasText: '?' }).last()
    await expect(helpButton).toBeVisible()
  })

  test('help widget opens when clicked', async ({ page }) => {
    // Click the floating ? button
    const helpButton = page.locator('button').filter({ hasText: '?' }).last()
    await helpButton.click()

    // Panel should open with search box and quick links
    await expect(page.getByPlaceholder(/ask|search|question/i)).toBeVisible()
    await expect(page.getByText('Getting Started')).toBeVisible()
  })

  test('help widget does not appear on /admin pages', async ({ page }) => {
    // Navigate to admin (if superadmin) — check that widget is absent
    await page.goto('/admin')

    // If redirected to dashboard (non-superadmin), skip this test
    const url = page.url()
    if (url.includes('/admin')) {
      // On admin page — help widget should not be present
      const helpButtons = page.locator('button').filter({ hasText: '?' })
      // The floating help button specifically has a fixed position
      const floatingHelp = page.locator('.fixed button').filter({ hasText: '?' })
      await expect(floatingHelp).toHaveCount(0)
    }
  })
})
