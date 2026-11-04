import { test, expect } from '@playwright/test';

// Block the live API so tests run on the bundled snapshot: fast and deterministic.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('landing page loads season data from the snapshot fallback', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box');
  await expect(page.getByText(/Saved snapshot/)).toBeVisible();
  await expect(page.getByText(/rounds complete/)).toBeVisible();
});

test('every main tab is reachable from the nav', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, heading] of [
    ['Standings', 'Standings'],
    ['Schedule', 'Schedule'],
    ['Tracks', 'Tracks'],
    ['Driver Spotlight', 'Driver Spotlight'],
    ['My Pit Wall', 'My Pit Wall'],
  ]) {
    await nav.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(heading);
  }
});

test('unknown routes show the not-found page', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Off track');
});
