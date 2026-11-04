import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('tracks index shows every round with a map and links through', async ({ page }) => {
  await page.goto('/tracks');
  await expect(page.getByTestId('track-card')).toHaveCount(23);
  await expect(page.getByRole('img', { name: /outline/ }).first()).toBeVisible();
  await page.getByTestId('track-card').filter({ hasText: 'Mexico City Grand Prix' }).click();
  await expect(page).toHaveURL(/\/tracks\/19$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mexico City Grand Prix');
});

test('completed race shows facts, quick stats and a strategy row per driver', async ({ page }) => {
  await page.goto('/tracks/19');
  await expect(page.getByRole('img', { name: /map/ })).toBeVisible();
  await expect(page.getByText('Circuit length')).toBeVisible();
  const stats = page.getByLabel('Grand Prix quick stats');
  await expect(stats).toContainText('Winner');
  await expect(stats).toContainText('Max Verstappen');
  await expect(stats).toContainText(/1 red flag/);
  await expect(page.getByTestId('race-row')).toHaveCount(22);
  // Tyre strip exposes its stints to screen readers.
  await expect(page.getByRole('img', { name: /^Max Verstappen: medium laps 1–/ })).toBeVisible();
  // No sprint at Mexico City.
  await expect(page.getByRole('tab', { name: 'Sprint' })).toHaveCount(0);
});

test('table sorts by stops (headers on desktop, dropdown on phones)', async ({ page, isMobile }) => {
  await page.goto('/tracks/19');
  const rows = page.getByTestId('race-row');
  await expect(rows).toHaveCount(22);
  const sortBy = async (label, key, dir = 'asc') => {
    if (isMobile) await page.getByLabel('Sort by').selectOption(`${key}:${dir}`);
    else await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  };
  await sortBy('Stops', 'stops');
  const first = Number((await rows.first().locator('.rt-stops').innerText()).replace(/\D/g, ''));
  const last = Number((await rows.nth(15).locator('.rt-stops').innerText()).replace(/\D/g, ''));
  expect(first).toBeLessThanOrEqual(last);
  await sortBy('Pos', 'pos');
  await expect(rows.first()).toContainText('P1');
});

test('winner gets a trophy, fastest lap gets a purple clock, only one lap time is listed', async ({ page }) => {
  await page.goto('/tracks/19');
  const rows = page.getByTestId('race-row');
  await expect(rows.first().getByRole('img', { name: 'Race winner' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Race winner' })).toHaveCount(1);
  await expect(page.getByRole('img', { name: /Fastest lap of the race/ })).toHaveCount(1);
  await expect(page.locator('.rt-fastestLap.is-fastest')).toHaveCount(1);
  await expect(page.locator('.rt-fastestLap.is-empty')).toHaveCount(21);
  await expect(page.getByText('Best stop')).toHaveCount(0);
  await expect(page.getByText('Best pit lane')).toHaveCount(0);
});

test('when the winner sets the fastest lap the clock sits right after the trophy', async ({ page }) => {
  // Find any completed round whose winner also set the official fastest lap.
  const season = await (await page.request.get('/data/season.json')).json();
  const race = season.races.find((r) => r.results.find((x) => x.pos === 1)?.fastestLap?.rank === 1);
  test.skip(!race, 'no race this season where the winner set the fastest lap');
  await page.goto(`/tracks/${race.round}`);
  const icons = page.getByTestId('race-row').first().locator('.rt-driver__name [role=img]');
  await expect(icons).toHaveCount(2);
  await expect(icons.nth(0)).toHaveAttribute('aria-label', 'Race winner');
  await expect(icons.nth(1)).toHaveAttribute('aria-label', /Fastest lap/);
});

test('sprint weekends get a Sprint tab with a grid and results', async ({ page }) => {
  await page.goto('/tracks/17');
  const sprintTab = page.getByRole('tab', { name: 'Sprint' });
  await expect(sprintTab).toBeVisible();
  await sprintTab.click();
  await expect(page).toHaveURL(/tab=sprint/);
  await expect(page.getByText('Sprint grid')).toBeVisible();
  await expect(page.getByLabel('Sprint quick stats')).toContainText('Sprint pole');
  await expect(page.getByTestId('race-row').first()).toContainText('P1');
  // Keyboard: arrow keys move between tabs.
  await page.getByRole('tab', { name: 'Sprint' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Grand Prix' })).toHaveAttribute('aria-selected', 'true');
});

test('Grand Prix tab shows the starting grid in grid order', async ({ page }) => {
  await page.goto('/tracks/19');
  const grid = page.getByRole('figure').filter({ hasText: 'Starting grid' });
  await expect(grid).toBeVisible();
  const boxes = grid.locator('.start-grid__box');
  await expect(boxes.first()).toContainText('1');
  // Every driver who took a grid slot is shown (pit-lane starters are listed separately).
  const season = await (await page.request.get('/data/season.json')).json();
  const results = season.races.find((r) => r.round === 19).results;
  await expect(boxes).toHaveCount(results.filter((r) => r.grid > 0).length);
});

test('upcoming race shows a countdown instead of results', async ({ page }) => {
  await page.goto('/tracks/20?now=2026-11-04T12:00:00Z');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Brazilian Grand Prix');
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText(/appear here after the race/)).toBeVisible();
  await expect(page.getByTestId('race-row')).toHaveCount(0);
});

test('unknown round shows a friendly message', async ({ page }) => {
  await page.goto('/tracks/99');
  await expect(page.getByText(/no round 99/)).toBeVisible();
});

test('followed drivers are highlighted in the results', async ({ page }) => {
  await page.goto('/tracks/19');
  await page.getByRole('button', { name: 'Follow Max Verstappen' }).click();
  await expect(page.getByTestId('race-row').filter({ hasText: 'Max Verstappen' })).toHaveClass(/is-followed/);
});

test('track maps and thumbnails draw the pit lane in its own colour', async ({ page }) => {
  await page.goto('/tracks/8');
  const map = page.locator('.track__map');
  await expect(map.locator('.track-map__pit')).toHaveCount(1);
  await expect(map.locator('.track-map__legend').getByText('Pit lane')).toBeVisible();
  const [pitColour, lineColour] = await Promise.all([
    map.locator('.track-map__pit').evaluate((el) => getComputedStyle(el).stroke),
    map.locator('.track-map__line').evaluate((el) => getComputedStyle(el).stroke),
  ]);
  expect(pitColour).not.toBe(lineColour);
  await page.goto('/tracks');
  await expect(page.getByTestId('track-card')).toHaveCount(23);
  // Thumbnails fill in once circuits.json arrives.
  await expect.poll(() => page.locator('.track-card .track-map__pit').count()).toBe(23);
});
