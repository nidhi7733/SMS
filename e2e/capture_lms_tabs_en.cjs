const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // Navigate to Learning Management
  const navLearning = page.locator('aside nav button', { hasText: /सिकाइ|Learning/i }).first();
  await navLearning.click();
  await page.waitForTimeout(1000);

  // Switch to English
  const langBtn = page.locator('header button', { hasText: /English|नेपाली/i }).first();
  const textBefore = (await langBtn.innerText()).trim();
  if (textBefore.includes('English')) {
    await langBtn.click();
    await page.waitForTimeout(500);
  }

  // Tab 1 (Assignments) in English
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/tab1_en.png' });

  // Click Add Assignment Modal
  await page.click('button:has-text("+ Assign Homework")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/modal_add_assignment_en.png' });
  await page.click('.fixed.inset-0 button:has(svg.lucide-x)');
  await page.waitForTimeout(500);

  // Tab 2 (Evaluations) in English
  await page.click('button:has-text("Evaluation & Grading")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/tab2_en.png' });

  // Tab 3 (Materials) in English
  await page.click('button:has-text("Study Materials & Notes")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/tab3_en.png' });

  // Tab 4 (Progress) in English
  await page.click('button:has-text("Learning Analytics & Remedial")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence/tab4_en.png' });

  await browser.close();
  console.log('Screenshots captured');
})();
