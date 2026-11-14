import { test, expect } from '@playwright/test';
import { latest, next, NOW, season } from './season-data.js';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('start lights run, then the headline appears', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero__pod i.on').first()).toBeVisible({ timeout: 2000 });
  await expect(page.getByText('Lights out and away we go')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box');
  // The status line stays for the rest of this page view.
  await page.waitForTimeout(1500);
  await expect(page.getByText('Lights out and away we go')).toBeVisible();
  // Second visit in the same session skips the gantry and status line, headline shows at once.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box', { timeout: 1000 });
  await expect(page.locator('.hero__lights')).toHaveCount(0);
  await expect(page.getByText('Lights out and away we go')).toHaveCount(0);
});

test('reduced motion skips the light sequence', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box', { timeout: 500 });
  await expect(page.locator('.hero__lights')).toHaveCount(0);
  await expect(page.getByText('Lights out and away we go')).toHaveCount(0);
  await ctx.close();
});

test('gap meters show the decided drivers and constructors titles', async ({ page }) => {
  await page.goto('/');
  const drivers = page.getByRole('region', { name: "Drivers' title" });
  await expect(drivers.locator('.gap-meter__status')).toHaveText(/^\s*Decided at .+ Grand Prix$/);
  await expect(drivers.getByTestId('gap-row').first()).toContainText('Antonelli');
  const teams = page.getByRole('region', { name: "Constructors' title" });
  // The constructors' title is decided in the saved snapshot, so there is no open "N pts left" fight
  // left on the landing page to assert; the decided state is what must show.
  await expect(teams.locator('.gap-meter__status')).toHaveText(/^\s*Decided at .+ Grand Prix$/);
  const leader = season.constructors[season.constructorStandings[0].constructorId].name;
  await expect(teams.getByTestId('gap-row').first()).toContainText(leader);
  await expect(teams.getByRole('img', { name: / leads on \d+ points$/ })).toBeVisible();
});

test('next race, podium and quick links (no top-three lists)', async ({ page }) => {
  await page.goto(`/?now=${NOW}`);
  await expect(page.getByRole('heading', { name: new RegExp(next.name) })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  const podium = page.getByRole('region', { name: 'Latest podium' });
  await expect(podium.getByRole('link', { name: season.drivers[latest.results[0].driverId].familyName })).toBeVisible();
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
