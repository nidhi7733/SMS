const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Fill login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // Navigate to Learning Management
  const navLearning = page.locator('aside nav button', { hasText: /सिकाइ|Learning/i }).first();
  await navLearning.click();
  await page.waitForTimeout(1000);

  // Take screenshot in current state (Nepali)
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/lang_test_np.png' });

  // Locate language button
  const langBtn = page.locator('header button', { hasText: /English|नेपाली/i }).first();
  const textBefore = (await langBtn.innerText()).trim();
  console.log('Language button text before click:', textBefore);

  await langBtn.click();
  await page.waitForTimeout(1000);

  const textAfter = (await langBtn.innerText()).trim();
  console.log('Language button text after click:', textAfter);

  // Take screenshot after toggle (English)
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/lang_test_en.png' });

  // Check what localStorage has
  const storageLang = await page.evaluate(() => localStorage.getItem('sms_lang'));
  console.log('localStorage sms_lang:', storageLang);

  // Toggle again
  await langBtn.click();
  await page.waitForTimeout(1000);
  const textAfterSecond = (await langBtn.innerText()).trim();
  console.log('Language button text after 2nd click:', textAfterSecond);
  const storageLang2 = await page.evaluate(() => localStorage.getItem('sms_lang'));
  console.log('localStorage sms_lang after 2nd click:', storageLang2);

  await browser.close();
  console.log('Done testing!');
})();
