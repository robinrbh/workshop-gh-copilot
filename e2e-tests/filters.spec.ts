import { test, expect, type Page } from '@playwright/test';

/** Locator for the game cards currently visible on the page. */
const cards = (page: Page) => page.locator('[data-testid="game-card"]:visible');

test.describe('Game filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows all games and a result count by default', async ({ page }) => {
    await expect(cards(page)).toHaveCount(21);
    await expect(page.getByTestId('filter-result-count')).toHaveText('Showing 21 of 21 games');
  });

  test('filters by a single category', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await expect(cards(page)).toHaveCount(4);
    await expect(cards(page).getByTestId('game-category')).toHaveText(Array(4).fill('Strategy'));
    await expect(page).toHaveURL(/\?category=\d+$/);
  });

  test('filters by multiple categories', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    await expect(cards(page)).toHaveCount(8);
  });

  test('filters by publisher', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Publisher' }).selectOption({ label: 'GitHub Games' });
    await expect(cards(page)).toHaveCount(5);
    await expect(cards(page).getByTestId('game-publisher')).toHaveText(Array(5).fill('GitHub Games'));
  });

  test('combines category and publisher filters', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Action' }).check();
    await page.getByRole('combobox', { name: 'Publisher' }).selectOption({ label: 'CodeForge Studios' });
    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByTestId('filter-result-count')).toHaveText('Showing 2 of 21 games');
  });

  test('clears all filters', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await page.getByRole('combobox', { name: 'Publisher' }).selectOption({ label: 'Ops Interactive' });
    await expect(cards(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByTestId('filter-no-matches')).toBeHidden();
    await expect(cards(page)).toHaveCount(21);
    await expect(page).toHaveURL('/');
  });

  test('can be operated with the keyboard', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: 'Strategy' });
    await checkbox.focus();
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    await expect(cards(page)).toHaveCount(4);
  });

  test('restores filters from the URL', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Puzzle' })).toBeChecked();
    await expect(cards(page)).toHaveCount(4);
  });
});
