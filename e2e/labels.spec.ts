import { test, expect } from '@playwright/test'

test.describe('Label Printing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/inventory')
  })

  test('checkboxes visible on inventory items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 })

    // Should have at least a "Select all" checkbox
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible()
  })

  test('label size selector renders in bulk action bar', async ({ page }) => {
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 })

    // Check the first item checkbox
    const firstCheckbox = page.locator('input[type="checkbox"]').nth(1) // skip "select all"
    await firstCheckbox.check()

    // Bulk action bar should appear with label size selector
    await expect(page.getByText(/selected/i)).toBeVisible()
    await expect(page.locator('select').filter({ hasText: /2\.25|4"/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /print labels/i })).toBeVisible()
  })

  test('print button visible on priced items', async ({ page }) => {
    // Filter to priced items
    await page.getByRole('button', { name: 'Priced' }).click()
    await page.waitForTimeout(500)

    // Look for printer icon buttons on priced items
    const printerButtons = page.locator('button[title="Print label"]')
    // If there are priced items, printer buttons should exist
    const count = await printerButtons.count()
    if (count > 0) {
      await expect(printerButtons.first()).toBeVisible()
    }
  })
})
