import { test, expect } from '@playwright/test';
import { latest, completedCount, upcomingCount, completedSprints, upcomingSprints, next, NOW } from './season-data.js';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

const preview = (n) => Math.min(n, 3);

test('All shows Upcoming then Completed, three races each, and highlights the next race', async ({ page }) => {
  await page.goto(`/schedule?now=${NOW}`);
  const headings = page.getByRole('heading', { level: 2, name: /^(Upcoming|Completed)$/ });
  await expect(headings).toHaveText(['Upcoming', 'Completed']);
  const upcoming = page.getByRole('list', { name: 'Upcoming races' });
  const completed = page.getByRole('list', { name: 'Completed races' });
  await expect(upcoming.getByTestId('schedule-row')).toHaveCount(preview(upcomingCount));
  await expect(completed.getByTestId('schedule-row')).toHaveCount(preview(completedCount));
  // Nearest race first in Upcoming, most recent first in Completed.
  await expect(upcoming.getByTestId('schedule-row').first()).toContainText(next.name);
  await expect(completed.getByTestId('schedule-row').first()).toContainText(latest.name);
  await expect(page.getByRole('heading', { name: new RegExp(next.name) })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
});

test('View More reveals the rest of a section and View Less hides it again', async ({ page }) => {
  await page.goto(`/schedule?now=${NOW}`);
  const completed = page.getByRole('region', { name: 'Completed' });
  const more = completed.getByRole('button', { name: 'View More' });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(completed.getByTestId('schedule-row')).toHaveCount(completedCount);
  await completed.getByRole('button', { name: 'View Less' }).click();
  await expect(completed.getByTestId('schedule-row')).toHaveCount(3);
  const upcoming = page.getByRole('region', { name: 'Upcoming' });
  await expect(upcoming.getByRole('button', { name: /View/ })).toHaveCount(upcomingCount > 3 ? 1 : 0);
});

test('filters narrow the list', async ({ page }) => {
  await page.goto(`/schedule?now=${NOW}`);
  await page.getByRole('button', { name: 'Sprint weekends' }).click();
  await expect(page.getByTestId('schedule-row')).toHaveCount(completedSprints.length + upcomingSprints.length);
  await expect(page.getByTestId('schedule-row').first()).toContainText((upcomingSprints.at(-1) ?? completedSprints.at(-1)).name);
  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(page.getByTestId('schedule-row')).toHaveCount(completedCount);
  await expect(page.getByTestId('schedule-row').first()).toContainText(latest.name);
  await page.getByRole('button', { name: 'Upcoming' }).click();
  await expect(page.getByTestId('schedule-row')).toHaveCount(upcomingCount);
});

test('completed rows show a podium and link to the track page', async ({ page }) => {
  await page.goto(`/schedule?now=${NOW}`);
  const first = page.getByRole('list', { name: 'Completed races' }).getByTestId('schedule-row').first();
  await expect(first.getByLabel(/Podium:/)).toBeVisible();
  await first.getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/tracks/${latest.round}$`));
});

test('calendar export downloads a valid .ics file', async ({ page }) => {
  await page.goto(`/schedule?now=${NOW}`);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Add remaining races/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('f1-2026-pit-box.ics');
  const text = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text).toContain(`${next.name}: Race`);
});
