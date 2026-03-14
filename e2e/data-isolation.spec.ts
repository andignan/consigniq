import { test, expect } from '@playwright/test'

test.describe('Data Isolation & Access Control', () => {
  test('/admin redirects non-superadmin users to /dashboard', async ({ page }) => {
    // Login as regular user first
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL ?? 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD ?? 'testpassword123')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Try to access /admin
    await page.goto('/admin')
    // Should redirect back to /dashboard (non-superadmin)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 })
  })

  test('unauthenticated user cannot access /admin', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
  })
})
