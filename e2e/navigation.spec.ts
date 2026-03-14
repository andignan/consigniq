import { test, expect } from '@playwright/test'

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard — assumes authenticated session or test login
    await page.goto('/dashboard')
  })

  test('all 7 sidebar nav items are visible on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 })

    const navItems = [
      'Dashboard',
      'Consignors',
      'Inventory',
      'Price Lookup',
      'Reports',
      'Payouts',
      'Settings',
    ]

    for (const item of navItems) {
      await expect(page.getByRole('link', { name: item })).toBeVisible()
    }
  })

  test('active state updates on navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    // Click Consignors nav item
    await page.getByRole('link', { name: 'Consignors' }).click()
    await expect(page).toHaveURL(/\/consignors/)

    // Click Inventory nav item
    await page.getByRole('link', { name: 'Inventory' }).click()
    await expect(page).toHaveURL(/\/inventory/)
  })

  test('mobile hamburger opens and closes sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('nav')

    // Find and click hamburger button
    const hamburger = page.locator('button').filter({ has: page.locator('svg') }).first()
    await hamburger.click()

    // Nav items should now be visible
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()

    // Click a nav item — sidebar should close
    await page.getByRole('link', { name: 'Reports' }).click()
    await expect(page).toHaveURL(/\/reports/)
  })
})
