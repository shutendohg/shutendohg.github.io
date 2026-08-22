import { test, expect, type Page } from '@playwright/test';

/**
 * Collects page-level errors. A dependency upgrade that breaks hydration
 * usually shows up here first.
 *
 * Call `expectNoProblems` rather than asserting on the array directly: these
 * events arrive asynchronously, so a synchronous check can run before the very
 * failure it is meant to catch has been delivered.
 */
function failOnPageErrors(page: Page) {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  page.on('requestfailed', (request) =>
    problems.push(`request failed: ${request.url()}`),
  );
  return problems;
}

async function expectNoProblems(page: Page, problems: string[]) {
  // Let late console errors and failed requests land before judging.
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
}

test('home page renders its sections', async ({ page }) => {
  const problems = failOnPageErrors(page);

  await page.goto('/');

  await expect(page).toHaveTitle(/Horohira/);
  await expect(page.getByRole('img', { name: 'Horohira' })).toBeVisible();
  await expect(page.getByText('About')).toBeVisible();
  await expect(page.getByText('Contact')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Astro' })).toBeVisible();

  await expectNoProblems(page, problems);
});

test('the local Inter faces are registered and applied', async ({ page }) => {
  await page.goto('/');

  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      body: getComputedStyle(document.body).fontFamily,
      // Astro rewrites each family to a hashed name and also registers
      // generated fallback faces ("<family> fallback: Arial"); keep only the
      // real ones.
      faces: [...document.fonts]
        .filter((face) => !face.family.includes('fallback'))
        .map((face) => ({ family: face.family, weight: face.weight })),
    };
  });

  // global.css only falls back to `--font-inter` where variable fonts are
  // unsupported, so Chromium resolves the body to the variable family.
  expect(fonts.body).toContain('InterVariable');
  expect(fonts.faces.some((face) => face.family.startsWith('InterVariable'))).toBe(
    true,
  );

  // Every static weight declared in astro.config.mjs. Asserting these
  // separately is what catches the static faces being dropped while the
  // variable one still resolves.
  const staticWeights = fonts.faces
    .filter(
      (face) =>
        face.family.startsWith('Inter-') && !face.family.startsWith('InterVariable'),
    )
    .map((face) => face.weight)
    .sort();
  expect(staticWeights).toEqual(['400', '500', '600', '700', '800']);
});

test('the theme toggle hydrates and switches the theme', async ({ page }) => {
  const problems = failOnPageErrors(page);

  await page.goto('/');

  // The React island renders nothing until it has hydrated and resolved the
  // initial theme, so the button being present is itself the hydration check.
  const toggle = page.getByRole('button', { name: /Switch to (dark|light) theme/ });
  await expect(toggle).toBeVisible();

  const wasDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );

  await toggle.click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark')),
    )
    .toBe(!wasDark);

  await expectNoProblems(page, problems);
});

test('the post index lists posts with a reading time', async ({ page }) => {
  const problems = failOnPageErrors(page);

  await page.goto('/writing');

  const posts = page.locator('a[href^="/writing/"]');
  expect(await posts.count()).toBeGreaterThan(0);
  // Produced by the remark plugin wired into `markdown.processor`.
  await expect(page.getByText(/\d+ min read/).first()).toBeVisible();

  await expectNoProblems(page, problems);
});

test('a post renders its markdown and highlights code', async ({ page }) => {
  const problems = failOnPageErrors(page);

  await page.goto('/writing');
  await page.locator('a[href^="/writing/"]').first().click();

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Shiki inlines colours on the code block; losing syntax highlighting means
  // the markdown pipeline silently stopped applying the configured theme.
  const code = page.locator('pre.astro-code').first();
  await expect(code).toBeVisible();
  await expect(code.locator('span[style*="color"]').first()).toBeVisible();

  await expectNoProblems(page, problems);
});
