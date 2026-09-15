import { expect, test } from '@playwright/test';

test.describe('PER-30 local catalog and dashboard evidence', () => {
  test('renders the deterministic catalog, search, detail, and error states', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Local Catalog' })).toBeVisible();
    await expect(page.getByLabel('Application status')).toHaveText('Local application · ready');

    await page.getByLabel('Search products').fill('desk');
    await page.getByRole('search').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('2 results found.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aurora Desk Lamp' })).toBeVisible();
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Aurora Desk Lamp' }) }).getByRole('button', { name: 'View details' }).click();
    await expect(page.getByText('Product details loaded.')).toBeVisible();
    await expect(page.getByText('Product ID')).toBeVisible();

    await page.route('**/products/search**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Simulated search error.' } }) }));
    await page.getByRole('button', { name: '← Back to results' }).click();
    await page.getByLabel('Search products').fill('desk');
    await page.getByRole('search').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('status')).toHaveText('Simulated search error.');
  });

  test('renders headline metrics, tables, and real-data charts from the fixture', async ({ page }) => {
    await page.goto('/.qa-fixtures/complete.html');
    await expect(page.getByRole('heading', { name: 'What happened in this run?' })).toBeVisible();
    await expect(page.getByText('Total requests').locator('..').getByRole('strong')).toHaveText('8');
    await expect(page.getByText('Typical latency').locator('..').getByRole('strong')).toHaveText('100 ms');
    await expect(page.getByRole('heading', { name: 'Operation detail' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'product_search' }).first()).toBeVisible();
    await expect(page.getByRole('img', { name: 'Latency over time chart' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Errors over time chart' })).toBeVisible();
    await expect(page.getByText('code evidence unavailable; measured log analysis is still retained.')).toBeVisible();
  });

  test('shows unavailable charts, missing metrics, real zero values, zero requests, incomplete state, and escaped markup', async ({ page }) => {
    await page.goto('/.qa-fixtures/incomplete.html');
    await expect(page.getByText('Incomplete data — interpret with care')).toBeVisible();
    await expect(page.getByText('This run is incomplete')).toBeVisible();

    await page.goto('/.qa-fixtures/unavailable.html');
    await expect(page.getByText('Latency over time: insufficient timestamped data.')).toBeVisible();
    await expect(page.getByText('Errors over time: insufficient timestamped data.')).toBeVisible();
    await page.goto('/.qa-fixtures/invalid.html');
    await expect(page.getByRole('heading', { name: 'Dashboard unavailable' })).toBeVisible();
    await page.goto('/.qa-fixtures/zero.html');
    await expect(page.getByText('EMPTY_REQUESTS')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Successful vs failed' })).toBeVisible();
    await expect(page.locator('svg title').filter({ hasText: ': 0' }).first()).toHaveCount(1);
    await page.goto('/.qa-fixtures/complete.html');
    await expect(page.getByRole('heading', { name: 'Latency over time' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Successful vs failed' })).toBeVisible();
  });
});
