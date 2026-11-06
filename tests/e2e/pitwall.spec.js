import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
});

const follow = (page, drivers = [], teams = []) =>
  // Only seed once, so changes made during the test survive later navigations.
  page.addInitScript(([d, t]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('pitbox.bookmarks.v1', JSON.stringify({ drivers: d, teams: t }));
      sessionStorage.setItem('seeded', '1');
    }
  }, [drivers, teams]);

test('empty pit wall invites you to follow, and quick-pick builds it', async ({ page }) => {
  await page.goto('/pit-wall');
  await expect(page.getByRole('heading', { name: 'Build your pit wall' })).toBeVisible();
  await page.getByRole('button', { name: 'Verstappen', exact: true }).click();
  await expect(page.getByTestId('pw-driver')).toHaveCount(1);
  await expect(page.getByTestId('pw-driver')).toContainText('Max Verstappen');
  // Add more without leaving the page.
  await page.getByRole('button', { name: '+ Add more' }).click();
  await page.locator('.pw-pick').getByRole('button', { name: 'Ferrari', exact: true }).click();
  await expect(page.getByTestId('pw-team')).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('pw-driver')).toHaveCount(1);
  await expect(page.getByTestId('pw-team')).toHaveCount(1);
});

test('driver and team cards show standings, latest race and form', async ({ page }) => {
  await follow(page, ['antonelli', 'hamilton'], ['mercedes']);
  const season = await (await page.request.get('/data/season.json')).json();
  const ant = season.driverStandings.find((s) => s.driverId === 'antonelli');
  await page.goto('/pit-wall');
  const card = page.getByTestId('pw-driver').filter({ hasText: 'Antonelli' });
  await expect(card).toContainText(`P${ant.pos}`);
  await expect(card).toContainText(String(ant.points));
  await expect(card.getByLabel('Last five results').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('pw-team')).toContainText('Mercedes');
  await expect(page.getByText('Points race')).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
});

test('your news lists stories about what you follow, linking out', async ({ page }) => {
  await follow(page, ['antonelli'], []);
  await page.goto('/pit-wall');
  const items = page.getByTestId('pw-news');
  await expect(items.first()).toBeVisible();
  await expect(items.first()).toContainText('Antonelli');
  await expect(items.first().getByRole('link')).toHaveAttribute('target', '_blank');
});

test('unfollowing and clearing all', async ({ page }) => {
  await follow(page, ['antonelli', 'russell'], ['ferrari']);
  await page.goto('/pit-wall');
  await page.getByRole('button', { name: 'Unfollow Andrea Kimi Antonelli' }).click();
  await expect(page.getByTestId('pw-driver')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('button', { name: 'Tap again to clear all' }).click();
  await expect(page.getByRole('heading', { name: 'Build your pit wall' })).toBeVisible();
});

test('landing page previews the pit wall', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Build my pit wall' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('pitbox.bookmarks.v1', JSON.stringify({ drivers: ['norris'], teams: ['mclaren'] })));
  await page.reload();
  const preview = page.getByTestId('pit-wall-preview');
  await expect(preview).toContainText('Norris');
  await expect(preview).toContainText('McLaren');
});

test('follows are highlighted on other pages, and teams can be followed from a profile', async ({ page }) => {
  await follow(page, ['max_verstappen'], []);
  await page.goto('/tracks/19');
  await expect(page.getByTestId('race-row').filter({ hasText: 'Max Verstappen' }).getByRole('img', { name: 'You follow this driver' })).toBeVisible();
  await expect(page.locator('.start-grid__box.is-followed--driver')).toHaveCount(1);
  // Followed drivers in the grid are marked by gold text only, with no outline.
  await expect(page.locator('.start-grid__box.is-followed--driver')).toHaveCSS('box-shadow', 'none');
  await page.goto('/drivers/leclerc');
  await page.getByRole('button', { name: /Follow Ferrari/ }).click();
  await page.goto('/tracks/19');
  await expect(page.getByTestId('race-row').filter({ hasText: 'Charles Leclerc' }).getByRole('img', { name: 'You follow this team' })).toBeVisible();
  await page.goto('/schedule');
  await expect(page.locator('.podium-chip.is-followed').first()).toBeVisible();
});
