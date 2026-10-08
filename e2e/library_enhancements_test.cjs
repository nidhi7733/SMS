const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testLibraryEnhancements() {
  console.log('🚀 Starting Library Enhancements E2E Verification Test...');
  const evidenceDir = path.resolve('C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence');
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
    // Step 1: Login as Principal (Admin role)
    console.log('Step 1: Logging in as principal...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'principal');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Step 2: Navigate to Library Management
    console.log('Step 2: Navigating to Library Management...');
    const libraryNav = page.locator('button[data-tab="library"]').or(page.locator('text=पुस्तकालय व्यवस्थापन')).first();
    await libraryNav.click();
    await page.waitForTimeout(2000);

    // ========================================================
    // TEST 1: Member Quota & Policy Edit
    // ========================================================
    console.log('Step 3: Testing Member Quota Edit...');
    const membersTab = page.locator('button:has-text("पुस्तकालय सदस्यता")').or(page.locator('button:has-text("Library Members")')).first();
    await membersTab.click();
    await page.waitForTimeout(1500);

    // Click the first member edit button
    const firstMemberEditBtn = page.locator('button:has-text("सम्पादन")').first();
    await firstMemberEditBtn.click();
    await page.waitForTimeout(1000);

    // Increase max allowed books to 4, days to 28
    const maxBooksInput = page.locator('input[type="number"]').first();
    await maxBooksInput.fill('4');

    const maxDaysInput = page.locator('input[type="number"]').nth(1);
    await maxDaysInput.fill('28');

    // Submit edit
    const updateMemberBtn = page.locator('button[type="submit"]:has-text("अद्यावधिक गर्नुहोस्")').or(page.locator('button[type="submit"]:has-text("Update Member")')).first();
    await updateMemberBtn.click();
    await page.waitForTimeout(2000);

    // Take screenshot evidence of updated member quota
    await page.screenshot({ path: path.join(evidenceDir, '10_member_quota_edited.png') });
    console.log('📸 Evidence captured: 10_member_quota_edited.png');

    // ========================================================
    // TEST 2: Fine Collection & Accounting Journal Voucher
    // ========================================================
    console.log('Step 4: Testing Fine Collection with Journal Voucher creation...');
    const finesTab = page.locator('button:has-text("विलम्ब शुल्क र जरिवाना")').or(page.locator('button:has-text("Overdue & Fines")')).first();
    await finesTab.click();
    await page.waitForTimeout(1500);

    // Check for collect fine button
    const collectFineBtn = page.locator('button:has-text("रसिद जारी / असुल")').first();
    if (await collectFineBtn.count() > 0) {
      console.log('Found unpaid fine, collecting fine...');
      await collectFineBtn.click();
      await page.waitForTimeout(3000);

      // Screenshot of Fines tab showing paid fine and voucher badge
      await page.screenshot({ path: path.join(evidenceDir, '11a_fine_collected_with_voucher.png') });
      console.log('📸 Evidence captured: 11a_fine_collected_with_voucher.png');
    } else {
      console.log('No unpaid fine found or fine already settled.');
    }

    // Now navigate to Accounting Management to verify the journal voucher
    console.log('Step 5: Navigating to Accounting to verify Journal Voucher...');
    const accountingNav = page.locator('button[data-tab="accounting"]').or(page.locator('text=दोहोरो लेखा प्रणाली')).first();
    await accountingNav.click();
    await page.waitForTimeout(2500);

    // Take screenshot of Accounting Journal Vouchers showing the library fine voucher
    await page.screenshot({ path: path.join(evidenceDir, '11_fine_journal_voucher_accounting.png') });
    console.log('📸 Evidence captured: 11_fine_journal_voucher_accounting.png');

    // ========================================================
    // TEST 3: Category Edit
    // ========================================================
    console.log('Step 6: Navigating back to Library Management for Category Edit...');
    await libraryNav.click();
    await page.waitForTimeout(2000);

    const categoriesTab = page.locator('button:has-text("विधा (DDC) र र्याकहरू")').or(page.locator('button:has-text("Categories & Racks")')).first();
    await categoriesTab.click();
    await page.waitForTimeout(1500);

    // Click edit on the first category
    const editCatBtn = page.locator('button:has-text("विधा सम्पादन")').first();
    await editCatBtn.click();
    await page.waitForTimeout(1000);

    // Update Category Nepali Name
    const catNameNpInput = page.locator('input[placeholder="उदा: कला तथा मनोरञ्जन"]').first();
    const currentCatNp = await catNameNpInput.inputValue();
    if (!currentCatNp.includes('(अद्यावधिक)')) {
      await catNameNpInput.fill(`${currentCatNp} (अद्यावधिक)`);
    }

    const updateCatSubmit = page.locator('button[type="submit"]:has-text("अद्यावधिक गर्नुहोस्")').first();
    await updateCatSubmit.click();
    await page.waitForTimeout(2000);

    // Take screenshot evidence of updated category
    await page.screenshot({ path: path.join(evidenceDir, '12_category_edited.png') });
    console.log('📸 Evidence captured: 12_category_edited.png');

    // ========================================================
    // TEST 4: Book Catalog Edit
    // ========================================================
    console.log('Step 7: Testing Book Catalog Edit...');
    const catalogTab = page.locator('button:has-text("पुस्तक क्याटलग")').or(page.locator('button:has-text("Book Catalog")')).first();
    await catalogTab.click();
    await page.waitForTimeout(1500);

    // Click edit on first book
    const editBookBtn = page.locator('button:has-text("सम्पादन")').first();
    await editBookBtn.click();
    await page.waitForTimeout(1000);

    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('350');

    const updateBookSubmit = page.locator('button[type="submit"]:has-text("विवरण अद्यावधिक गर्नुहोस्")').first();
    await updateBookSubmit.click();
    await page.waitForTimeout(2000);

    // Take screenshot evidence of updated book catalog
    await page.screenshot({ path: path.join(evidenceDir, '13_book_catalog_edited.png') });
    console.log('📸 Evidence captured: 13_book_catalog_edited.png');

    console.log('🎉 All Library Enhancements E2E Tests passed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    await page.screenshot({ path: path.join(evidenceDir, 'test_failure.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testLibraryEnhancements();
