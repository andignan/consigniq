import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'bad@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    // Should show an error message (not redirect)
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 })
  })

  test('valid login redirects to /dashboard', async ({ page }) => {
    await page.goto('/auth/login')
    // Uses test credentials — must be seeded in the database
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL ?? 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD ?? 'testpassword123')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })
})
