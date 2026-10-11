const { test, expect } = require('@playwright/test');
const content = require('../site-content.json');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('heading', { name: 'Ethan Baker', exact: true })).toBeVisible();
});

test('project-first navigation and resume work', async ({ page, request }) => {
  const sections = await page.locator('[data-site-content] > section').evaluateAll(nodes => nodes.map(node => node.id));
  expect(sections.indexOf('projects')).toBeLessThan(sections.indexOf('about'));
  await page.getByRole('link', { name: 'View my projects', exact: true }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeInViewport();
  const resume = page.locator('.hero-actions').getByRole('link', { name: 'Resume (PDF)', exact: true });
  const response = await request.get(await resume.getAttribute('href'));
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/pdf');
});

test('home and project pages fit the viewport in both themes', async ({ page }) => {
  for (const path of ['/', ...content.projects.filter(p => p.publish && !p.href).map(p => `/projects/${p.id}/`)]) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.project-card-contribution').first()).toBeVisible();
    for (const theme of ['dark', 'light']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) {
        await page.getByRole('button', { name: content.site.controls.themeLabel }).click();
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
  }
});

test('game case study links back to playable demos', async ({ page }) => {
  await page.getByRole('link', { name: 'Five party games', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/game-night\/$/);
  await expect(page.getByRole('heading', { name: 'Checking scores and full games' })).toBeVisible();
  await page.getByRole('link', { name: 'Play the games', exact: true }).click();
  await expect(page).toHaveURL(/\/#games$/);
  await expect(page.getByRole('heading', { name: 'Games I built', exact: true })).toBeInViewport();
});

for (const game of content.site.games.items.filter(game => game.publish && game.playUrl)) {
  test(`${game.name} loads and closes with focus restored`, async ({ page }) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
      // Flappy probes for its game-night server, then deliberately falls back to solo mode.
      const soloProbe = game.id === 'flappy-flock' && new URL(response.url()).pathname === '/api/info' && response.status() === 404;
      if (response.status() >= 400 && !soloProbe) failures.push(`${response.status()} ${response.url()}`);
    });
    const opener = page.getByRole('button', { name: `Play ${game.playName || game.name}`, exact: true });
    const loaded = page.waitForResponse(response => response.url().endsWith('/' + game.playUrl));
    await opener.click();
    expect((await loaded).ok()).toBeTruthy();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('iframe')).toHaveAttribute('title', game.playName || game.name);
    await expect(page.frameLocator('.cabinet-frame').locator('body')).not.toBeEmpty();
    if (game.id === 'flappy-flock') {
      await expect(page.frameLocator('.cabinet-frame').getByRole('heading', { name: 'Solo flight', exact: true })).toBeVisible();
    }
    await dialog.getByRole('button', { name: 'Close game', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.cabinet-frame')).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(failures).toEqual([]);
  });
}

test('reduced-motion visitors can navigate and use the timeline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('link', { name: 'Drive the timeline', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The track', exact: true })).toBeInViewport();
  const filter = page.getByRole('button', { name: 'Engineering', exact: true });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
});
