import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('lists every round and highlights the next race', async ({ page }) => {
  await page.goto('/schedule?now=2026-11-04T12:00:00Z');
  await expect(page.getByTestId('schedule-row')).toHaveCount(23);
  await expect(page.getByRole('heading', { name: /Brazilian Grand Prix/ })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
});

test('filters narrow the list', async ({ page }) => {
  await page.goto('/schedule?now=2026-11-04T12:00:00Z');
  await page.getByRole('button', { name: 'Sprint weekends' }).click();
  await expect(page.getByTestId('schedule-row')).toHaveCount(6);
  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(page.getByTestId('schedule-row')).toHaveCount(19);
  await page.getByRole('button', { name: 'Upcoming' }).click();
  await expect(page.getByTestId('schedule-row')).toHaveCount(4);
});

test('completed rows show a podium and link to the track page', async ({ page }) => {
  await page.goto('/schedule');
  const first = page.getByTestId('schedule-row').first();
  await expect(first.getByLabel(/Podium:/)).toBeVisible();
  await first.getByRole('link').click();
  await expect(page).toHaveURL(/\/tracks\/1$/);
});

test('calendar export downloads a valid .ics file', async ({ page }) => {
  await page.goto('/schedule?now=2026-11-04T12:00:00Z');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Add remaining races/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('f1-2026-pit-box.ics');
  const text = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text).toContain('Brazilian Grand Prix: Race');
});
