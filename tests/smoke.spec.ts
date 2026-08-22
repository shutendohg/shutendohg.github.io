import { test, expect, type Page } from '@playwright/test';

/**
 * Fails the test if the page logged an error or failed to load a resource.
 * A dependency upgrade that breaks hydration usually shows up here first.
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

test('home page renders its sections', async ({ page }) => {
  const problems = failOnPageErrors(page);

  await page.goto('/');

  await expect(page).toHaveTitle(/Horohira/);
  await expect(page.getByRole('img', { name: 'Horohira' })).toBeVisible();
  await expect(page.getByText('About')).toBeVisible();
  await expect(page.getByText('Contact')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Astro' })).toBeVisible();

  expect(problems).toEqual([]);
});

test('the local Inter font is applied', async ({ page }) => {
  await page.goto('/');

  // The font pipeline resolves `--font-inter` to a real family name. If the
  // fonts config regresses, the variable resolves to nothing and the body
  // falls back to sans-serif alone.
  const fontFamily = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(fontFamily).toContain('Inter');
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

  expect(problems).toEqual([]);
});

test('the post index lists posts with a reading time', async ({ page }) => {
  const problems = failOnPageErrors(page);

  await page.goto('/writing');

  const posts = page.locator('a[href^="/writing/"]');
  expect(await posts.count()).toBeGreaterThan(0);
  // Produced by the remark plugin wired into `markdown.processor`.
  await expect(page.getByText(/\d+ min read/).first()).toBeVisible();

  expect(problems).toEqual([]);
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

  expect(problems).toEqual([]);
});
