import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/standings');
  await expect(page.getByTestId('standings-row').first()).toBeVisible();
});

const firstName = (page) => page.getByTestId('standings-row').first().locator('.standings__name a, .standings__name').first();

test('shows drivers then constructors', async ({ page }) => {
  await expect(page.getByTestId('standings-row')).toHaveCount(24);
  await page.getByRole('button', { name: 'Constructors' }).click();
  await expect(page.getByTestId('standings-row')).toHaveCount(11);
  await expect(page.getByTestId('standings-row').first()).toContainText('Mercedes');
});

test('round picker rewinds the championship', async ({ page }) => {
  const latestLeader = await firstName(page).innerText();
  await page.getByRole('button', { name: 'Round 1: Australian Grand Prix' }).click();
  await expect(page.getByText('After round 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Australian Grand Prix' })).toBeVisible();
  // Round 1 has fewer points on the board than round 19.
  const pts = Number(await page.getByTestId('standings-row').first().locator('.standings__pts').innerText());
  expect(pts).toBeLessThanOrEqual(25 + 8);
  expect(latestLeader).toBeTruthy();
});

test('keyboard arrows step a whole round at a time', async ({ page }) => {
  await page.getByRole('button', { name: /^Round 19:/ }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: /^Round 1:/ })).toBeFocused();
  await expect(page.getByText('After round 1', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('After round 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Round 2:/ })).toHaveAttribute('aria-pressed', 'true');
});

test('dragging along the track snaps to rounds', async ({ page }) => {
  const track = page.getByRole('group', { name: 'Choose a round' });
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width - 5, box.y + 20);
  await page.mouse.down();
  // Drag to the 3rd of 19 columns.
  await page.mouse.move(box.x + (box.width / 19) * 2.5, box.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('After round 3', { exact: true })).toBeVisible();
});

test('replay plays race by race, with a speed control', async ({ page }) => {
  await page.getByRole('button', { name: '2×' }).click();
  await expect(page.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Replay season/ }).click();
  await expect(page.getByRole('button', { name: /Pause/ })).toBeVisible();
  await expect(page.getByText('After round 4', { exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.getByRole('button', { name: /Replay season/ })).toBeVisible();
});

test('following a driver persists and powers the bookmarked filter', async ({ page }) => {
  await page.getByRole('button', { name: 'Follow Lando Norris' }).click();
  await expect(page.getByRole('button', { name: 'Unfollow Lando Norris' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByLabel('Bookmarked only').check();
  await expect(page.getByTestId('standings-row')).toHaveCount(1);
  await expect(page.getByTestId('standings-row')).toContainText('Lando Norris');
  // Constructors list has its own bookmarks: none yet.
  await page.getByRole('button', { name: 'Constructors' }).click();
  await expect(page.getByText(/aren't following any teams/)).toBeVisible();
});

test('the thumb and fill line up with the selected round dot', async ({ page }) => {
  for (const round of [1, 7, 13, 19]) {
    await page.getByRole('button', { name: new RegExp(`^Round ${round}:`) }).click();
    await page.waitForTimeout(1000); // let the snap animation finish
    const m = await page.evaluate((i) => {
      const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      const dot = c(document.querySelectorAll('.round-track__dot')[i]);
      const thumb = c(document.querySelector('.round-track__thumb'));
      const fill = document.querySelector('.round-track__fill').getBoundingClientRect();
      return { dx: thumb.x - dot.x, dy: thumb.y - dot.y, fill: fill.right - dot.x };
    }, round - 1);
    expect(Math.abs(m.dx), `round ${round} x`).toBeLessThan(0.5);
    expect(Math.abs(m.dy), `round ${round} y`).toBeLessThan(0.5);
    expect(Math.abs(m.fill), `round ${round} fill`).toBeLessThan(0.5);
  }
});

test('opens on the latest round', async ({ page }) => {
  await expect(page.getByText('After round 19', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Round 19:/ })).toHaveAttribute('aria-pressed', 'true');
});

test('champion trophy appears from the clinching round onwards', async ({ page }) => {
  const trophy = page.getByRole('img', { name: /Drivers' World Champion, clinched at the Mexico City Grand Prix/ });
  await expect(trophy).toHaveCount(1);
  await expect(page.getByTestId('standings-row').first()).toContainText('Antonelli');
  await expect(page.getByTestId('standings-row').first().getByRole('img', { name: /World Champion/ })).toBeVisible();
  await page.getByRole('button', { name: /^Round 18:/ }).click();
  await expect(page.getByText('After round 18', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /World Champion/ })).toHaveCount(0);
  // No constructors' champion yet.
  await page.getByRole('button', { name: /^Round 19:/ }).click();
  await page.getByRole('button', { name: 'Constructors' }).click();
  await expect(page.getByRole('img', { name: /World Champion/ })).toHaveCount(0);
});

test('the race name links to its track page, rising and turning red on hover', async ({ page, isMobile }) => {
  const link = page.locator('.round-slider__race-link');
  await expect(link).toHaveText('Mexico City Grand Prix');
  if (!isMobile) {
    await link.hover();
    await expect.poll(() => link.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(225, 6, 0)');
    await expect.poll(() => link.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
  }
  // Picking another round changes where it goes.
  await page.getByRole('button', { name: /^Round 6:/ }).click();
  await expect(link).toHaveText('Monaco Grand Prix');
  await link.click();
  await expect(page).toHaveURL(/\/tracks\/6$/);
});
