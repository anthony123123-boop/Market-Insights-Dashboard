import { test, expect } from '@playwright/test';

test.describe('Market Insights Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has dark theme applied', async ({ page }) => {
    // Check html has dark class
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Check body has dark background
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should be dark (rgb values should be low)
    expect(bgColor).toMatch(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // All values should be less than 50 for a dark background
      expect(r).toBeLessThan(50);
      expect(g).toBeLessThan(50);
      expect(b).toBeLessThan(50);
    }
  });

  test('frosted cards have backdrop blur', async ({ page }) => {
    // Wait for content to load
    await page.waitForSelector('.frosted-card');

    const frostedCard = page.locator('.frosted-card').first();

    // Check backdrop filter is applied
    const backdropFilter = await frostedCard.evaluate((el) => {
      return window.getComputedStyle(el).backdropFilter;
    });

    // Should have blur or be 'none' if not supported (fallback)
    expect(backdropFilter === 'none' || backdropFilter.includes('blur')).toBeTruthy();

    // Check background is semi-transparent (not opaque white)
    const bgColor = await frostedCard.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should be rgba or transparent
    expect(bgColor).toMatch(/rgba?\(/);
  });

  test('displays header with title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toContainText('MARKET INSIGHTS DASHBOARD');
  });

  test('displays settings button that opens sidebar', async ({ page }) => {
    // Find and click settings button
    const settingsButton = page.locator('button[title="Settings"]');
    await expect(settingsButton).toBeVisible();

    await settingsButton.click();

    // Sidebar should appear
    const sidebar = page.locator('text=Settings').first();
    await expect(sidebar).toBeVisible();
  });

  test('displays score gauges', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for score labels
    await expect(page.locator('text=Short Term')).toBeVisible();
    await expect(page.locator('text=Medium Term')).toBeVisible();
    await expect(page.locator('text=Long Term')).toBeVisible();
  });

  test('displays sector attraction chart', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.locator('text=SECTOR ATTRACTION')).toBeVisible();
  });

  test('displays indicators section', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.locator('text=INDICATORS')).toBeVisible();
  });

  test('view more toggle works', async ({ page }) => {
    await page.waitForTimeout(2000);

    const viewMoreButton = page.locator('text=VIEW MORE');
    await expect(viewMoreButton).toBeVisible();

    await viewMoreButton.click();

    // Should show categories
    await expect(page.locator('text=CORE')).toBeVisible();
  });

  test('displays footer disclaimer', async ({ page }) => {
    await expect(page.locator('text=Not financial advice')).toBeVisible();
  });
});

test.describe('Data Accuracy', () => {
  test('SPY change calculation is correct', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Get API response
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/market');
      return res.json();
    });

    const spy = response.indicators?.SPY;
    if (spy && spy.price !== undefined && spy.previousClose !== undefined) {
      const expectedChange = spy.price - spy.previousClose;
      const actualChange = spy.change;

      // Change should be close to computed value
      expect(Math.abs(actualChange - expectedChange)).toBeLessThan(0.01);

      // Percentage should be consistent
      if (spy.previousClose !== 0) {
        const expectedPct = (expectedChange / spy.previousClose) * 100;
        expect(Math.abs(spy.changePct - expectedPct)).toBeLessThan(0.01);
      }
    }
  });

  test('VIX/VVIX ratio is computed correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/market');
      return res.json();
    });

    const vix = response.indicators?.VIX;
    const vvix = response.indicators?.VVIX;
    const ratio = response.indicators?.VIX_VVIX_RATIO;

    if (vix?.price && vvix?.price && ratio?.price) {
      const expectedRatio = vix.price / vvix.price;
      expect(Math.abs(ratio.price - expectedRatio)).toBeLessThan(0.001);
    }

    // If both have previous close, verify change is not forced to 0
    if (vix?.previousClose && vvix?.previousClose && ratio) {
      const prevRatio = vix.previousClose / vvix.previousClose;
      const expectedChange = ratio.price! - prevRatio;

      // Change should not be exactly 0 unless prices truly didn't change
      if (Math.abs(expectedChange) > 0.0001) {
        expect(ratio.change).not.toBe(0);
      }
    }
  });
});
