import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

test('picker lists the grid in championship order and opens a profile', async ({ page }) => {
  await page.goto('/drivers');
  const cards = page.getByTestId('driver-card');
  await expect(cards.first()).toContainText('ANTONELLI', { ignoreCase: true });
  expect(await cards.count()).toBeGreaterThanOrEqual(22);
  await cards.filter({ hasText: /Verstappen/i }).first().click();
  await expect(page).toHaveURL(/\/drivers\/max_verstappen$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Verstappen');
});

test('following from a picker card does not open the profile', async ({ page }) => {
  await page.goto('/drivers');
  await page.getByRole('button', { name: 'Follow Lando Norris' }).click();
  await expect(page).toHaveURL(/\/drivers$/);
  await expect(page.getByRole('button', { name: 'Unfollow Lando Norris' })).toBeVisible();
});

test('profile shows season stats that match the standings', async ({ page }) => {
  const season = await (await page.request.get('/data/season.json')).json();
  const s = season.driverStandings.find((x) => x.driverId === 'antonelli');
  await page.goto('/drivers/antonelli');
  const tiles = page.locator('.driver__stats');
  await expect(tiles).toContainText(`P${s.pos}`);
  await expect(tiles).toContainText(`${s.points} points`);
  await expect(tiles.locator('.stat-tile').filter({ hasText: 'Wins' })).toContainText(String(s.wins));
  await expect(page.getByRole('img', { name: /World Champion/ })).toBeVisible();
});

test('teammate head-to-head, results chart and career totals render', async ({ page }) => {
  await page.goto('/drivers/antonelli');
  const h2h = page.getByTestId('h2h').first();
  await expect(h2h).toContainText('Russell');
  await expect(h2h.getByLabel(/^Qualifying:/)).toBeVisible();
  await expect(page.getByRole('img', { name: /^Finishing positions:/ })).toBeVisible();
  await expect(page.locator('.career-strip')).toContainText('Titles');
  // Clicking a result in the chart opens that race.
  await page.getByRole('link', { name: /^Round 19 Mexico City Grand Prix/ }).click();
  await expect(page).toHaveURL(/\/tracks\/19$/);
});

test('three news stories link out to their sources', async ({ page }) => {
  await page.goto('/drivers/antonelli');
  const cards = page.getByTestId('news-card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeLessThanOrEqual(3);
  for (const link of await cards.getByRole('link').all()) {
    await expect(link).toHaveAttribute('href', /^https?:\/\//);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
});

test('switcher changes driver and unknown ids are handled', async ({ page }) => {
  await page.goto('/drivers/antonelli');
  await page.getByLabel('Switch driver').selectOption('russell');
  await expect(page).toHaveURL(/\/drivers\/russell$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Russell');
  await page.goto('/drivers/nobody');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Driver not found');
});

test('profile follow buttons say Follow, then Following, for driver and team', async ({ page }) => {
  await page.goto('/drivers/norris');
  const driver = page.getByRole('button', { name: 'Follow Lando Norris' });
  const team = page.getByRole('button', { name: 'Follow McLaren' });
  await expect(driver).toContainText('☆');
  await driver.click();
  await expect(page.getByRole('button', { name: 'Following Lando Norris' })).toContainText('★');
  await team.click();
  await expect(page.getByRole('button', { name: 'Following McLaren' })).toContainText('★');
  // Survives a reload, and tapping again unfollows.
  await page.reload();
  await page.getByRole('button', { name: 'Following Lando Norris' }).click();
  await expect(page.getByRole('button', { name: 'Follow Lando Norris' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Following McLaren' })).toBeVisible();
});

test('every driver profile has both follow buttons', async ({ page }) => {
  const season = await (await page.request.get('/data/season.json')).json();
  await page.goto('/drivers');
  for (const id of Object.keys(season.drivers).slice(0, 24)) {
    const d = season.drivers[id];
    if (!season.races.some((r) => r.results.some((x) => x.driverId === id))) continue;
    await page.goto(`/drivers/${id}`);
    await expect(page.locator('.driver__follow .follow-chip')).toHaveCount(2);
    await expect(page.getByRole('button', { name: `Follow ${d.givenName} ${d.familyName}` })).toBeVisible();
  }
});
