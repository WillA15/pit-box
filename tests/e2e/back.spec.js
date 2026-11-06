import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

const back = (page) => page.getByRole('button', { name: /^Back to / });

test('no back button on the first page you open', async ({ page }) => {
  await page.goto('/standings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Standings');
  await expect(back(page)).toHaveCount(0);
});

test('standings → track page → back to standings', async ({ page }) => {
  await page.goto('/standings');
  await page.locator('.round-slider__race-link').click();
  await expect(page).toHaveURL(/\/tracks\/19$/);
  await expect(back(page)).toHaveText('← Back to Standings');
  await back(page).click();
  await expect(page).toHaveURL(/\/standings$/);
  await expect(back(page)).toHaveCount(0);
});

test('names the previous race or driver, and walks back through several pages', async ({ page }) => {
  await page.goto('/schedule');
  await page.getByTestId('schedule-row').filter({ hasText: 'Mexico City' }).getByRole('link').click();
  await expect(back(page)).toHaveText('← Back to Schedule');
  await page.getByTestId('race-row').first().locator('.rt-strategy').click();
  await expect(page).toHaveURL(/\/drivers\/max_verstappen$/);
  await expect(back(page)).toHaveText('← Back to Mexico City Grand Prix');
  await back(page).click();
  await expect(page).toHaveURL(/\/tracks\/19$/);
  await expect(back(page)).toHaveText('← Back to Schedule');
});

test('switching the Sprint tab does not count as a new page', async ({ page }) => {
  await page.goto('/tracks');
  await page.getByTestId('track-card').filter({ hasText: 'Singapore' }).click();
  await page.getByRole('tab', { name: 'Sprint' }).click();
  await expect(page).toHaveURL(/tab=sprint/);
  await back(page).click();
  await expect(page).toHaveURL(/\/tracks$/);
});

test('the browser back button and ours stay in step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Standings' }).click();
  await expect(back(page)).toHaveText('← Back to Home');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Tracks' }).click();
  await expect(back(page)).toHaveText('← Back to Standings');
  await page.goBack();
  await expect(page).toHaveURL(/\/standings$/);
  await expect(back(page)).toHaveText('← Back to Home');
});

// Wait for the new page to draw and reach the top, then keep checking for a while,
// so a late browser scroll "restore" would still be caught.
// Scroll down and wait until the scroll has finished moving (a person reads before pressing Back).
const scrollDown = async (page, px) => {
  await page.mouse.wheel(0, px);
  let last = -1;
  await expect.poll(async () => {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    const still = y === last && y > 300;
    last = y;
    return still;
  }, { intervals: [150] }).toBe(true);
};

const settledScroll = async (page) => {
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(0);
  const seen = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(150);
    seen.push(await page.evaluate(() => Math.round(window.scrollY)));
  }
  return Math.max(...seen);
};

test('going back always lands at the top of the previous page', async ({ page }) => {
  // Standings → track → back.
  await page.goto('/standings');
  await expect(page.getByTestId('standings-row').first()).toBeVisible();
  await scrollDown(page, 1500);
  await page.locator('.round-slider__race-link').evaluate((a) => a.click());
  await expect(page).toHaveURL(/\/tracks\/19$/);
  expect(await settledScroll(page)).toBe(0); // new page starts at the top too
  await scrollDown(page, 2000);
  await back(page).click();
  await expect(page).toHaveURL(/\/standings$/);
  expect(await settledScroll(page)).toBe(0);

  // Track → driver profile (clicked from far down the results) → back.
  await page.goto('/tracks/19');
  await page.getByTestId('race-row').nth(15).scrollIntoViewIfNeeded();
  await page.getByTestId('race-row').nth(15).locator('.rt-strategy').click();
  await expect(page).toHaveURL(/\/drivers\//);
  await scrollDown(page, 1500);
  await back(page).click();
  await expect(page).toHaveURL(/\/tracks\/19$/);
  expect(await settledScroll(page)).toBe(0);

  // The browser's own back button behaves the same way.
  await page.goForward();
  await scrollDown(page, 1500);
  await page.goBack();
  await expect(page).toHaveURL(/\/tracks\/19$/);
  expect(await settledScroll(page)).toBe(0);
});
