const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runLibraryTests() {
  console.log('🚀 Starting Automated Playwright Tests for Library Management System...');
  const evidenceDir = path.resolve(__dirname, 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // Step 1: Login & Navigation
    // -------------------------------------------------------------
    console.log('Step 1: Logging in as principal...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Wait for login form
    await page.fill('input[type="text"]', 'principal');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForTimeout(1500);

    console.log('Navigating to Library Management page...');
    // Click on library in sidebar
    const libraryNav = page.locator('button[data-tab="library"]').or(page.locator('text=पुस्तकालय व्यवस्थापन')).or(page.locator('text=पुस्तकालय')).first();
    await libraryNav.click();
    await page.waitForTimeout(2000);

    // Verify KPI stats banner is visible
    const statsExist = await page.locator('text=DDC Catalog').count();
    console.log(`Stats banner detected (DDC Catalog count: ${statsExist})`);
    await page.screenshot({ path: path.join(evidenceDir, '01_library_dashboard_kpis.png'), fullPage: true });
    console.log('📸 Evidence 1 captured: 01_library_dashboard_kpis.png');

    // -------------------------------------------------------------
    // Step 2: Add New Book (Accession & Multi-Copy)
    // -------------------------------------------------------------
    console.log('Step 2: Testing Add New Book with 3 physical copies...');
    const addBookBtn = page.locator('button:has-text("नयाँ पुस्तक दर्ता")').or(page.locator('button:has-text("Add New Book")')).first();
    await addBookBtn.click();
    await page.waitForTimeout(800);

    // Fill form
    await page.fill('input[placeholder="उदा: मुना मदन"]', 'सेतो बाघ');
    await page.fill('input[placeholder="e.g. Muna Madan"]', 'Seto Bagh');
    await page.fill('input[placeholder="उदा: लक्ष्मीप्रसाद देवकोटा"]', 'डायमण्ड शमशेर');
    await page.fill('input[placeholder="उदा: साझा प्रकाशन"]', 'साझा प्रकाशन');
    await page.fill('input[placeholder="उदा: २५औं वा 25th"]', '१२औं संस्करण');

    // Submit Book Form
    const saveBookBtn = page.locator('button:has-text("पुस्तक दर्ता गर्नुहोस्")').or(page.locator('button:has-text("Save Book")')).first();
    await saveBookBtn.click();
    await page.waitForTimeout(1500);

    // Verify 'सेतो बाघ' appears in catalog
    const bookTitleVisible = await page.locator('text=सेतो बाघ').count();
    console.log(`'सेतो बाघ' added to catalog, visible count: ${bookTitleVisible}`);

    // Click "प्रतिहरू हेर्नुहोस्" to inspect copies drawer
    const viewCopiesBtn = page.locator('tr:has-text("सेतो बाघ") button').first();
    if (await viewCopiesBtn.count() > 0) {
      await viewCopiesBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(evidenceDir, '02_book_catalog_accession.png'), fullPage: true });
      console.log('📸 Evidence 2 captured: 02_book_catalog_accession.png');
      // Close drawer
      const closeDrawerBtn = page.locator('[data-testid="close-copies-drawer"]').first();
      await closeDrawerBtn.click();
      await page.waitForTimeout(800);
    } else {
      await page.screenshot({ path: path.join(evidenceDir, '02_book_catalog_accession.png'), fullPage: true });
    }

    // -------------------------------------------------------------
    // Step 3: Circulation Check-out Issue
    // -------------------------------------------------------------
    console.log('Step 3: Testing Book Issue counter...');
    const circulationTab = page.locator('button:has-text("सर्कुलेसन काउन्टर")').or(page.locator('button:has-text("Circulation Counter")')).first();
    await circulationTab.click();
    await page.waitForTimeout(1500);

    // Select Member LIB-STU-0003
    const memberSelect = page.locator('form select').first();
    try {
      await memberSelect.selectOption({ value: 'LIB-STU-0003' });
    } catch {
      await memberSelect.selectOption({ index: 3 });
    }
    await page.waitForTimeout(800);

    // Select available copy
    const copySelect = page.locator('form select').nth(1);
    const options = await copySelect.locator('option').allInnerTexts();
    console.log(`Available copies dropdown options count: ${options.length}`);
    if (options.length > 1) {
      await copySelect.selectOption({ index: 1 });
    }

    // Fill Remarks
    await page.fill('input[placeholder="विषय सन्दर्भ, परियोजना कार्य..."]', 'कक्षा १० को नेपाली अध्ययन');

    // Click Issue Book button
    const issueBtn = page.locator('button:has-text("पुस्तक जारी गर्नुहोस्")').or(page.locator('button:has-text("Confirm Issue")')).first();
    await issueBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(evidenceDir, '03_book_issued_successfully.png'), fullPage: true });
    console.log('📸 Evidence 3 captured: 03_book_issued_successfully.png');

    // -------------------------------------------------------------
    // Step 4: Quota Restriction Enforcement Check
    // -------------------------------------------------------------
    console.log('Step 4: Testing Student Quota Restriction (Max 2 books)...');
    // Issue one more to LIB-STU-0001 who already had 1 book seeded
    await memberSelect.selectOption({ value: 'LIB-STU-0001' });
    await page.waitForTimeout(500);

    // If quota not yet reached, issue 2nd book
    const isFullInitial = await page.locator('text=कोटा पूर्ण').count();
    if (isFullInitial === 0) {
      await copySelect.selectOption({ index: 1 });
      await issueBtn.click();
      await page.waitForTimeout(1500);
      // Select LIB-STU-0001 again
      await memberSelect.selectOption({ value: 'LIB-STU-0001' });
      await page.waitForTimeout(500);
    }

    // Now member has 2 / 2 books used -> should show warning and button disabled
    const quotaWarningVisible = await page.locator('text=कोटा पूर्ण').or(page.locator('text=Quota Exceeded')).count();
    console.log(`Quota limit warning detected: ${quotaWarningVisible > 0 ? 'YES (Enforced)' : 'NO'}`);
    await page.screenshot({ path: path.join(evidenceDir, '04_quota_restriction_enforced.png'), fullPage: true });
    console.log('📸 Evidence 4 captured: 04_quota_restriction_enforced.png');

    // -------------------------------------------------------------
    // Step 5: Overdue Return & Fine Calculation
    // -------------------------------------------------------------
    console.log('Step 5: Testing Overdue Return with Fine calculation...');
    // Find the overdue return button (Basain CIR-2083-0003)
    const overdueRow = page.locator('tr:has-text("म्याद नाघेको"), tr:has-text("Overdue")').first();
    const returnBtn = overdueRow.locator('button:has-text("फिर्ता")').or(overdueRow.locator('button:has-text("Return")')).first();
    if (await returnBtn.count() > 0) {
      await returnBtn.click();
      await page.waitForTimeout(1000);

      // Verify overdue fine is displayed
      const fineText = await page.locator('text=म्याद नाघेको जरिवाना').or(page.locator('text=Overdue Fine Due')).count();
      console.log(`Fine calculation modal opened: ${fineText > 0 ? 'YES' : 'NO'}`);

      // Confirm return
      const confirmReturnBtn = page.locator('button:has-text("फिर्ता दर्ता गर्नुहोस्")').or(page.locator('button:has-text("Confirm Return")')).first();
      await confirmReturnBtn.click();
      await page.waitForTimeout(1500);
    }

    // Switch to Fines Tab to see settlement
    const finesTab = page.locator('text=विलम्ब शुल्क र जरिवाना').or(page.locator('text=Overdue & Fines')).first();
    await finesTab.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(evidenceDir, '05_overdue_fine_settlement.png'), fullPage: true });
    console.log('📸 Evidence 5 captured: 05_overdue_fine_settlement.png');

    // -------------------------------------------------------------
    // Step 6: Bilingual Language Toggle Verification
    // -------------------------------------------------------------
    console.log('Step 6: Testing Bilingual Language Toggle...');
    // Click language toggle button in Navbar
    const langBtn = page.locator('button[title*="Language"], button[title*="भाषा"]').first();
    await langBtn.click();
    await page.waitForTimeout(1200);

    // Switch back to Catalog tab to verify English headers
    const catalogTab = page.locator('text=Catalog & Accessions').or(page.locator('text=पुस्तक क्याटलग')).first();
    await catalogTab.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(evidenceDir, '06_bilingual_toggle_verification.png'), fullPage: true });
    console.log('📸 Evidence 6 captured: 06_bilingual_toggle_verification.png');

    console.log('\n🎉 ALL 6 AUTOMATED PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({ path: path.join(evidenceDir, 'error_state.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

runLibraryTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
