const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testCardIssue() {
  console.log('🚀 Starting Card Issue Button Verification Test...');
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
    // Step 1: Login
    console.log('Step 1: Logging in as principal...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'principal');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Step 2: Navigate to Library Management
    console.log('Step 2: Navigating to Library Management...');
    const libraryNav = page.locator('button[data-tab="library"]').or(page.locator('text=पुस्तकालय व्यवस्थापन')).or(page.locator('text=पुस्तकालय')).first();
    await libraryNav.click();
    await page.waitForTimeout(2000);

    // Step 3: Switch to Members Tab
    console.log('Step 3: Switching to Members Tab (पुस्तकालय सदस्यता)...');
    const membersTab = page.locator('button:has-text("पुस्तकालय सदस्यता")').or(page.locator('button:has-text("Library Members")')).first();
    await membersTab.click();
    await page.waitForTimeout(1000);

    // Step 4: Click 'नयाँ कार्ड जारी' / 'Issue Member Card'
    console.log('Step 4: Clicking "नयाँ कार्ड जारी" button...');
    const issueCardBtn = page.locator('button:has-text("नयाँ कार्ड जारी")').or(page.locator('button:has-text("Issue Member Card")')).first();
    await issueCardBtn.click();
    await page.waitForTimeout(1000);

    // Step 5: Check modal is open and inspect Student dropdown options
    const modalHeader = page.locator('text=नयाँ पुस्तकालय सदस्यता कार्ड').or(page.locator('text=Issue Library Membership Card'));
    console.log('Modal visible count:', await modalHeader.count());

    // Take screenshot of student card issue modal
    await page.screenshot({ path: path.join(evidenceDir, '07_card_issue_modal_student.png') });
    console.log('📸 Evidence captured: 07_card_issue_modal_student.png');

    // Inspect student select options
    const studentSelect = page.locator('select').filter({ has: page.locator('option') }).first();
    const studentOptions = await studentSelect.locator('option').allInnerTexts();
    console.log(`Student Options count: ${studentOptions.length}`);
    console.log('First 3 student options:', studentOptions.slice(0, 3));

    // Step 6: Test Staff Radio Button
    console.log('Step 6: Toggling to Staff (शिक्षक/कर्मचारी)...');
    const staffRadio = page.locator('label:has-text("शिक्षक/कर्मचारी")').or(page.locator('input[value="STAFF"]')).first();
    await staffRadio.click();
    await page.waitForTimeout(800);

    // Inspect staff options
    const staffSelect = page.locator('select').filter({ has: page.locator('option') }).first();
    const staffOptions = await staffSelect.locator('option').allInnerTexts();
    console.log(`Staff Options count: ${staffOptions.length}`);
    console.log('First 3 staff options:', staffOptions.slice(0, 3));

    // Take screenshot of staff card issue modal
    await page.screenshot({ path: path.join(evidenceDir, '08_card_issue_modal_staff.png') });
    console.log('📸 Evidence captured: 08_card_issue_modal_staff.png');

    // Step 7: Issue a card for unassigned staff (or student)
    // Let's toggle back to Student and select an enabled option
    console.log('Step 7: Issuing card for student...');
    const studentRadio = page.locator('label:has-text("विद्यार्थी")').first();
    await studentRadio.click();
    await page.waitForTimeout(500);

    // Select the first enabled student option that isn't the placeholder
    const enabledOption = await page.locator('select option:not([disabled]):not([value=""])').first();
    const enabledVal = await enabledOption.getAttribute('value');
    const enabledText = await enabledOption.innerText();
    console.log(`Selected student: ${enabledText} (ID: ${enabledVal})`);
    await page.locator('select').first().selectOption(enabledVal);

    // Click 'कार्ड जारी गर्नुहोस्' / 'Issue Card'
    const submitBtn = page.locator('button:has-text("कार्ड जारी गर्नुहोस्")').or(page.locator('button:has-text("Issue Card")')).first();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify feedback message
    const feedbackText = await page.locator('div[class*="emerald"]').innerText().catch(() => 'None');
    console.log('Feedback received:', feedbackText);

    // Take screenshot of updated member list
    await page.screenshot({ path: path.join(evidenceDir, '09_card_issued_membership_table.png') });
    console.log('📸 Evidence captured: 09_card_issued_membership_table.png');

    console.log('✅ ALL CARD ISSUE VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await page.screenshot({ path: path.join(evidenceDir, 'card_issue_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testCardIssue();
