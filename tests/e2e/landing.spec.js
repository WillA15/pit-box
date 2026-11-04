import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('start lights run, then the headline appears', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero__pod i.on').first()).toBeVisible({ timeout: 2000 });
  await expect(page.getByText('Lights out and away we go')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box');
  // Second visit in the same session skips straight to the headline.
  await page.reload();
  await expect(page.getByText('Lights out and away we go')).toBeVisible({ timeout: 500 });
});

test('reduced motion skips the light sequence', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByText('Lights out and away we go')).toBeVisible({ timeout: 500 });
  await ctx.close();
});

test('gap meters show the decided drivers title and the open constructors fight', async ({ page }) => {
  await page.goto('/');
  const drivers = page.getByRole('region', { name: "Drivers' title" });
  await expect(drivers).toContainText('Decided at Mexico City Grand Prix');
  await expect(drivers.getByTestId('gap-row').first()).toContainText('Antonelli');
  const teams = page.getByRole('region', { name: "Constructors' title" });
  await expect(teams).toContainText(/pts left/);
  await expect(teams.getByRole('img', { name: /^Ferrari: .* can reach/ })).toBeVisible();
});

test('next race, podium and quick links (no top-three lists)', async ({ page }) => {
  await page.goto('/?now=2026-11-04T12:00:00Z');
  await expect(page.getByRole('heading', { name: /Brazilian Grand Prix/ })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  const podium = page.getByRole('region', { name: 'Latest podium' });
  await expect(podium.getByRole('link', { name: 'Verstappen' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Top drivers' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Top constructors' })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Explore Pit Box' }).getByRole('link', { name: /Tracks/ }).click();
  await expect(page).toHaveURL(/\/tracks$/);
});

test('following someone sets off the star burst and the nav underline follows the tab', async ({ page }) => {
  await page.goto('/standings');
  await page.getByRole('button', { name: 'Follow Lando Norris' }).click();
  await expect(page.locator('.follow-star__burst').first()).toBeAttached();
  await expect(page.locator('.tab--active .tab__bar')).toHaveCount(1);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Schedule' }).click();
  await expect(page.locator('.tab--active')).toHaveText('Schedule');
});
