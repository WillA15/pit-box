import { test, expect } from '@playwright/test';
import { mainNav } from './nav.js';
import { latest, next, NOW, season } from './season-data.js';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('the start lights fill towards race day, once per visit', async ({ page }) => {
  await page.goto(`/?now=${NOW}`);
  await expect(page.locator('.hero__pod i.on').first()).toBeVisible({ timeout: 2000 });
  await expect(page.getByText(/\d \/ 5 · Lights fill|Race day · all lights on/)).toBeVisible({ timeout: 4000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box');
  await page.waitForTimeout(2300); // let the step-up sequence finish
  const lit = await page.locator('.hero__pod i.on').count();
  expect(lit).toBeGreaterThan(0);
  // Second visit in the same session shows the same count at once, with no step-up.
  await page.reload();
  await expect(page.locator('.hero__pod i.on')).toHaveCount(lit, { timeout: 500 });
});

test('reduced motion shows the lights without the sequence', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/api/**', (route) => route.abort());
  await page.goto(`/?now=${NOW}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pit Box', { timeout: 500 });
  await expect(page.locator('.hero__pod i.on').first()).toBeVisible({ timeout: 500 });
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
  await (await mainNav(page)).getByRole('link', { name: 'Schedule' }).click();
  await expect(page.locator('.tab--active')).toHaveText('Schedule');
});

test('phone menu opens, closes on Escape and after navigating', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toBeHidden();
  await toggle.click();
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await toggle.click();
  await nav.getByRole('link', { name: 'Tracks' }).click();
  await expect(page).toHaveURL(/\/tracks$/);
  await expect(nav).toBeHidden();
});
