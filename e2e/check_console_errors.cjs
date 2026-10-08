const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  const navLearning = page.locator('aside nav button', { hasText: /सिकाइ|Learning/i }).first();
  await navLearning.click();
  await page.waitForTimeout(1000);

  const langBtn = page.locator('header button', { hasText: /English|नेपाली/i }).first();
  await langBtn.click();
  await page.waitForTimeout(1000);
  await langBtn.click();
  await page.waitForTimeout(1000);

  await browser.close();
})();
