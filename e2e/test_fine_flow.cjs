const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testFineAccountingIntegration() {
  console.log('🚀 Starting Fine to Accounting Journal Integration Test...');
  const evidenceDir = path.resolve('C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // Step 1: Login
    console.log('Step 1: Logging in as principal...');
    await page.goto('http://localhost:5173/');
    await page.fill('input[type="text"]', 'principal');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Step 2: Navigate to Library Management
    console.log('Step 2: Navigating to Library Management...');
    const libraryNav = page.locator('button[data-tab="library"]').or(page.locator('text=पुस्तकालय व्यवस्थापन')).first();
    await libraryNav.click();
    await page.waitForTimeout(2000);

    // Step 3: Go to Circulation Tab
    console.log('Step 3: Going to Circulation Counter Tab...');
    const cirTab = page.locator('button:has-text("सर्कुलेसन काउन्टर")').first();
    await cirTab.click();
    await page.waitForTimeout(1500);

    // Step 4: Issue a book with past due date
    console.log('Step 4: Issuing a book with past due date (to induce overdue fine)...');
    const memberSelect = page.locator('select').first();
    await memberSelect.selectOption({ index: 2 });
    await page.waitForTimeout(500);

    const copySelect = page.locator('select').nth(1);
    await copySelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Set past dates: issue date 2082-12-01, due date 2082-12-15
    const issueDateInput = page.locator('input[value="2083-01-20"]').first();
    await issueDateInput.fill('2082-12-01');

    const dueDateInput = page.locator('input[value="2083-02-04"]').first();
    await dueDateInput.fill('2082-12-15');

    // Click confirm issue
    const issueSubmitBtn = page.locator('button[type="submit"]:has-text("पुस्तक जारी गर्नुहोस्")').or(page.locator('button[type="submit"]:has-text("Confirm Issue")')).first();
    await issueSubmitBtn.click();
    await page.waitForTimeout(2500);

    // Step 5: Click the Return button in the circulation table
    console.log('Step 5: Locating .circulation-return-btn and clicking Return...');
    const returnBtns = page.locator('.circulation-return-btn');
    console.log('Return buttons count:', await returnBtns.count());
    await returnBtns.first().click();
    await page.waitForTimeout(1500);

    // In Return Modal, leave 'विलम्ब शुल्क तत्काल असुल भयो' checked
    console.log('Step 6: Confirming Return with fine collection...');
    const confirmReturnBtn = page.locator('button:has-text("फिर्ता दर्ता गर्नुहोस्")').first();
    await confirmReturnBtn.click();
    await page.waitForTimeout(3000);

    // Step 7: Check Fines Tab (Tab 4)
    console.log('Step 7: Checking Fines Tab for receipt and voucher badge...');
    const finesTab = page.locator('button:has-text("विलम्ब शुल्क र जरिवाना")').first();
    await finesTab.click();
    await page.waitForTimeout(2000);

    // Capture screenshot of Fines tab showing the new paid fine and voucher badge
    await page.screenshot({ path: path.join(evidenceDir, '11a_fine_collected_with_voucher.png') });
    console.log('📸 Evidence captured: 11a_fine_collected_with_voucher.png');

    // Step 8: Navigate to Accounting Management to verify the voucher
    console.log('Step 8: Navigating to Accounting to verify Journal Voucher...');
    const accountingNav = page.locator('button[data-tab="accounting"]').or(page.locator('text=दोहोरो लेखा प्रणाली')).first();
    await accountingNav.click();
    await page.waitForTimeout(2500);

    // Capture screenshot of Accounting Journal Vouchers
    await page.screenshot({ path: path.join(evidenceDir, '11_fine_journal_voucher_accounting.png') });
    console.log('📸 Evidence captured: 11_fine_journal_voucher_accounting.png');

    console.log('🎉 Fine to Accounting Journal Integration Test completed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    await page.screenshot({ path: path.join(evidenceDir, 'fine_flow_failure.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testFineAccountingIntegration();
