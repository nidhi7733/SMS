const { chromium } = require('playwright');
const path = require('path');

const EVIDENCE_DIR = 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence';

(async () => {
  console.log('--- Starting Bilingual & Language Switcher Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  // 1. Login
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // 2. Navigate to Learning Management
  const navLearning = page.locator('aside nav button', { hasText: /सिकाइ|Learning/i }).first();
  await navLearning.click();
  await page.waitForTimeout(1000);

  // Reset to Nepali if needed
  const nepaliPill = page.locator('header [role="group"] button', { hasText: 'नेपाली' }).first();
  const englishPill = page.locator('header [role="group"] button', { hasText: 'English' }).first();

  await nepaliPill.click();
  await page.waitForTimeout(800);

  // Screenshot in Nepali
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '25_lang_nepali_active.png') });
  console.log('Captured: 25_lang_nepali_active.png');

  // 3. Switch to English by clicking English pill
  console.log('Clicking English segmented pill...');
  await englishPill.click();
  await page.waitForTimeout(800);

  // Tab 1 (Assignments) in English
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '26_lang_english_tab1.png') });
  console.log('Captured: 26_lang_english_tab1.png');

  // Tab 2 (Evaluation & Grading) in English
  const tab2Btn = page.locator('button', { hasText: 'Evaluation & Grading' }).first();
  await tab2Btn.click();
  await page.waitForTimeout(500);

  // Select the first assignment from dropdown to view student submissions in English
  const assignSelect = page.locator('select', { hasText: /-- Choose Assignment --/i }).first();
  const options = await assignSelect.locator('option').all();
  if (options.length > 1) {
    const val = await options[1].getAttribute('value');
    if (val) {
      await assignSelect.selectOption(val);
      await page.waitForTimeout(600);
    }
  }
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '27_lang_english_tab2.png') });
  console.log('Captured: 27_lang_english_tab2.png');

  // Tab 3 (Study Materials) in English
  const tab3Btn = page.locator('button', { hasText: 'Study Materials & Notes' }).first();
  await tab3Btn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '28_lang_english_tab3.png') });
  console.log('Captured: 28_lang_english_tab3.png');

  // Tab 4 (Student Analytics) in English
  const tab4Btn = page.locator('button', { hasText: 'Learning Analytics & Remedial' }).first();
  await tab4Btn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '29_lang_english_tab4.png') });
  console.log('Captured: 29_lang_english_tab4.png');

  // 4. Switch back to Nepali
  console.log('Clicking Nepali segmented pill to switch back...');
  await nepaliPill.click();
  await page.waitForTimeout(800);

  // Return to Tab 1 in Nepali
  const tab1BtnNp = page.locator('button', { hasText: /दैनिक गृहकार्य/i }).first();
  await tab1BtnNp.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, '30_lang_switched_back_nepali.png') });
  console.log('Captured: 30_lang_switched_back_nepali.png');

  await browser.close();
  console.log('--- Verification Complete! All 6 screenshots captured successfully ---');
})();
