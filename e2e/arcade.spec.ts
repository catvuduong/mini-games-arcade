import { test, expect, type Locator, type Page } from '@playwright/test';

/** Drags across the 2048 board with the mouse, the same pointer path a swipe takes on touch screens. */
async function swipe(page: Page, board: Locator, dx: number, dy: number) {
  const box = await board.boundingBox();
  if (!box) throw new Error('2048 board is not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}

test.describe('home screen', () => {
  test('shows the three games with personal bests and a theme toggle', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mini Games Arcade');
    await expect(page.getByTestId('game-card-memory')).toContainText('9 moves');
    await expect(page.getByTestId('game-card-2048')).toContainText('4,820');
    await expect(page.getByTestId('game-card-minesweeper')).toContainText('0:17');
    await expect(page.getByTestId('game-card-minesweeper')).toContainText('3:34');
  });

  test('opens each game from its card', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('game-card-memory').click();
    await expect(page).toHaveURL(/\/memory$/);
    await expect(page.getByTestId('board')).toBeVisible();

    await page.goto('/');
    await page.getByTestId('game-card-2048').click();
    await expect(page).toHaveURL(/\/2048$/);
    await expect(page.getByTestId('board')).toBeVisible();

    await page.goto('/');
    await page.getByTestId('game-card-minesweeper').click();
    await expect(page).toHaveURL(/\/minesweeper$/);
    await expect(page.getByTestId('board')).toBeVisible();
  });

  test('theme toggle switches to light and the choice survives a reload', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('fits a phone screen without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('game-card-memory')).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});

test.describe('memory match', () => {
  test('flipping cards counts moves and starts the timer', async ({ page }) => {
    await page.goto('/memory?seed=1');

    const cards = page.getByTestId('board').getByTestId('memory-card');
    await expect(cards).toHaveCount(16);
    await expect(page.getByTestId('moves')).toHaveText('0');

    await cards.nth(0).click();
    await cards.nth(1).click();
    await expect(page.getByTestId('moves')).toHaveText('1');
    await expect(page.getByTestId('timer')).toHaveText(/0:0[1-9]/, { timeout: 5000 });
  });

  test('clearing the board shows the win banner, confetti and a new best', async ({ page }) => {
    await page.goto('/memory?seed=1');

    const cards = page.getByTestId('memory-card');
    const symbols = await cards.locator('.memory-front').allTextContents();
    const groups = new Map<string, number[]>();
    symbols.forEach((symbol, index) => {
      groups.set(symbol, [...(groups.get(symbol) ?? []), index]);
    });
    for (const [a, b] of groups.values()) {
      await cards.nth(a).click();
      await cards.nth(b).click();
    }

    await expect(page.getByTestId('moves')).toHaveText('8');
    await expect(page.getByRole('status')).toContainText('Board cleared in');
    await expect(page.getByTestId('confetti')).toBeVisible();

    await page.goto('/');
    await expect(page.getByTestId('game-card-memory')).toContainText('8 moves');
  });

  test('switching to 6x6 deals 36 cards', async ({ page }) => {
    await page.goto('/memory?seed=1');
    await page.getByRole('button', { name: '6×6' }).click();

    await expect(page.getByTestId('board').getByTestId('memory-card')).toHaveCount(36);
    await expect(page.getByTestId('moves')).toHaveText('0');
  });
});

test.describe('2048', () => {
  test('arrow keys slide and merge tiles, and undo takes back the last move', async ({ page }) => {
    await page.goto('/2048?seed=1');

    await expect(page.getByTestId('board')).toBeVisible();
    await expect(page.getByTestId('score')).toHaveText('0');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('score')).toHaveText('4');
    await expect(page.getByTestId('best')).toHaveText('4');

    await page.getByTestId('undo').click();
    await expect(page.getByTestId('score')).toHaveText('0');
  });

  test('swiping moves the tiles the same way as the arrow keys', async ({ page }) => {
    await page.goto('/2048?seed=1');
    const board = page.getByTestId('board');

    await swipe(page, board, -120, 0);
    await swipe(page, board, 0, -120);
    await swipe(page, board, 120, 0);
    await expect(page.getByTestId('score')).toHaveText('4');
  });
});

test.describe('minesweeper', () => {
  test('first click opens a region, and flags update the mine counter and timer', async ({ page }) => {
    await page.goto('/minesweeper?seed=1');

    const cells = page.getByTestId('board').getByTestId('cell');
    await expect(cells).toHaveCount(81);
    await expect(page.getByTestId('mine-counter')).toHaveText('10');

    await cells.nth(40).click();
    await expect(cells.nth(40)).toHaveClass(/is-open/);
    await expect(page.getByTestId('timer')).toHaveText(/0:0[1-9]/, { timeout: 5000 });

    const hidden = page.locator('[data-testid="cell"]:not(.is-open)').first();
    await hidden.click({ button: 'right' });
    await expect(page.getByTestId('mine-counter')).toHaveText('9');
    await expect(hidden).toHaveClass(/is-flagged/);

    await hidden.press('f');
    await expect(page.getByTestId('mine-counter')).toHaveText('10');
    await expect(hidden).not.toHaveClass(/is-flagged/);
  });

  test('switching difficulty changes the grid size and mine count', async ({ page }) => {
    await page.goto('/minesweeper?seed=1');

    await page.getByRole('button', { name: 'Expert' }).click();
    await expect(page.getByTestId('board').getByTestId('cell')).toHaveCount(480);
    await expect(page.getByTestId('mine-counter')).toHaveText('99');
  });
});
