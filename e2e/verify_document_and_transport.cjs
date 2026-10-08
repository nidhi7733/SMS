const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence';
const ARTIFACT_DIR = 'C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe';

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function saveScreenshot(filename) {
  return [
    path.join(EVIDENCE_DIR, filename),
    path.join(ARTIFACT_DIR, filename),
  ];
}

(async () => {
  console.log('--- Starting Document & Transport Management E2E Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  // 1. Login as Principal
  console.log('1. Logging in as Principal...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="text"]', 'principal');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);

  // 2. Navigate to Document Management
  console.log('2. Navigating to Document Management...');
  const navDoc = page.locator('aside nav button', { hasText: /कागजात|Document/i }).first();
  await navDoc.click();
  await page.waitForTimeout(1000);

  // Verify Document Management Heading & KPIs
  console.log('Verifying Document Management page...');
  await page.waitForSelector('text=कागजात तथा दर्ता/चलानी व्यवस्थापन');

  // Verify Inward Table
  console.log('Checking Inward documents...');
  await page.waitForSelector('text=शिक्षा विकास तथा समन्वय इकाई');

  // Open New Inward Entry modal
  console.log('Testing New Inward Entry modal...');
  const addInwardBtn = page.locator('[data-testid="btn-add-inward"]');
  console.log('addInwardBtn isVisible:', await addInwardBtn.isVisible());
  await addInwardBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'debug_inward_modal.png') });
  console.log('Saved debug_inward_modal.png');

  // Fill and save new Inward Entry
  const senderInput = page.locator('[data-testid="inward-sender-input"]');
  console.log('senderInput count:', await senderInput.count());
  await senderInput.fill('बागमती प्रदेश शिक्षा विकास निर्देशनालय');
  await page.fill('[data-testid="inward-subject-input"]', 'राष्ट्रपति शैक्षिक सुधार कार्यक्रम अन्तर्गत कम्प्युटर ल्याब अनुदान');
  const submitInwardBtn = page.locator('[data-testid="inward-submit-btn"]');
  await submitInwardBtn.click();
  await page.waitForTimeout(1000);

  // Check Outward Register tab
  console.log('Testing Outward Register tab...');
  const outwardTab = page.locator('[data-testid="tab-outward"]');
  await outwardTab.click();
  await page.waitForTimeout(800);

  // Check Official Recommendations / Templates & Issued Letters tab
  console.log('Testing Official Recommendations & Templates tab...');
  const templatesTab = page.locator('[data-testid="tab-templates"]');
  await templatesTab.click();
  await page.waitForTimeout(800);

  // Click Issue Official Letter
  const issueLetterBtn = page.locator('button', { hasText: /सिफारिस पत्र जारी|Issue Official Letter/i }).first();
  await issueLetterBtn.click();
  await page.waitForTimeout(500);

  // Select template & student
  const templateSelect = page.locator('select', { hasText: /-- ढाँचा छनोट/i }).first();
  const tplOptions = await templateSelect.locator('option').all();
  if (tplOptions.length > 1) {
    const val = await tplOptions[1].getAttribute('value');
    if (val) await templateSelect.selectOption(val);
  }

  const studentSelect = page.locator('select', { hasText: /-- विद्यार्थी छनोट/i }).first();
  const studOptions = await studentSelect.locator('option').all();
  if (studOptions.length > 1) {
    const sVal = await studOptions[1].getAttribute('value');
    if (sVal) await studentSelect.selectOption(sVal);
  }

  // Generate letter
  const generateBtn = page.locator('button[type="submit"]', { hasText: /पत्र जारी|Generate & Issue/i }).first();
  await generateBtn.click();
  await page.waitForTimeout(1200);

  // Close letter preview modal
  const closePreviewBtn = page.locator('button:has(svg.lucide-x)').last();
  if (await closePreviewBtn.isVisible()) {
    await closePreviewBtn.click();
    await page.waitForTimeout(500);
  }

  // Switch to Digital Archive tab
  console.log('Testing Digital Archive tab...');
  const archiveTab = page.locator('[data-testid="tab-archives"]');
  await archiveTab.click();
  await page.waitForTimeout(800);

  // Capture Document Management Screenshot
  const [docEv, docArt] = saveScreenshot('37_document_management_verified.png');
  await page.screenshot({ path: docEv });
  fs.copyFileSync(docEv, docArt);
  console.log('Captured: 37_document_management_verified.png');

  // 3. Navigate to Transport Management
  console.log('3. Navigating to Transport Management...');
  const navTransport = page.locator('aside nav button', { hasText: /यातायात|Transport/i }).first();
  await navTransport.click();
  await page.waitForTimeout(1000);

  // Verify Transport Management Heading & KPIs
  await page.waitForSelector('text=विद्यालय यातायात तथा बस सेवा व्यवस्थापन');
  console.log('Verifying Fleet Vehicles...');
  await page.waitForSelector('text=बा २ ख ३४५६');

  // Switch to Routes & Stops tab
  console.log('Testing Routes & Stops tab...');
  const routesTab = page.locator('button', { hasText: /रुट तथा बस स्टप|Routes & Stops/i }).first();
  await routesTab.click();
  await page.waitForTimeout(800);
  await page.waitForSelector('text=रुट १: लगनखेल');
  await page.waitForSelector('text=जावलाखेल चोक');

  // Switch to Student Allocations tab
  console.log('Testing Student Allocations tab...');
  const allocTab = page.locator('button', { hasText: /विद्यार्थी सिट बाँडफाँड|Student Allocations/i }).first();
  await allocTab.click();
  await page.waitForTimeout(800);

  // Switch to Maintenance & Fuel tab
  console.log('Testing Maintenance & Fuel tab...');
  const maintTab = page.locator('button', { hasText: /मर्मत तथा इन्धन लगबुक|Maintenance & Fuel/i }).first();
  await maintTab.click();
  await page.waitForTimeout(800);

  // Switch back to Vehicles tab for comprehensive screenshot
  const vehiclesTab = page.locator('button', { hasText: /सवारी साधन|Vehicles & Fleet/i }).first();
  await vehiclesTab.click();
  await page.waitForTimeout(800);

  // Capture Transport Management Screenshot
  const [trEv, trArt] = saveScreenshot('38_transport_management_verified.png');
  await page.screenshot({ path: trEv });
  fs.copyFileSync(trEv, trArt);
  console.log('Captured: 38_transport_management_verified.png');

  // 4. Test English Language Switch
  console.log('4. Testing Language Switch to English...');
  const englishPill = page.locator('header [role="group"] button', { hasText: 'English' }).first();
  await englishPill.click();
  await page.waitForTimeout(800);

  // Verify English text in Transport module
  await page.waitForSelector('text=School Transport & Fleet Management');
  await page.waitForSelector('text=Vehicles & Fleet');

  const [langEv, langArt] = saveScreenshot('39_document_and_transport_english_toggle.png');
  await page.screenshot({ path: langEv });
  fs.copyFileSync(langEv, langArt);
  console.log('Captured: 39_document_and_transport_english_toggle.png');

  // 5. Test Role-Based Gating: Administrative Staff
  console.log('5. Testing Administrative Staff access...');
  // Logout
  const logoutBtn = page.locator('button:has(svg.lucide-log-out)').first();
  await logoutBtn.click();
  await page.waitForTimeout(1000);

  // Login as Administrative Staff
  await page.fill('input[type="text"]', 'admin_staff');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);

  // Verify sidebar has both Document and Transport for Administrative Staff
  const staffDocNav = page.locator('aside nav button', { hasText: /Document|कागजात/i }).first();
  const staffTrNav = page.locator('aside nav button', { hasText: /Transport|यातायात/i }).first();
  const hasDoc = await staffDocNav.isVisible();
  const hasTr = await staffTrNav.isVisible();
  console.log(`Administrative Staff visibility: Documents=${hasDoc}, Transport=${hasTr}`);
  if (!hasDoc || !hasTr) {
    throw new Error(`Expected Documents and Transport to be visible for Administrative Staff. Got Documents=${hasDoc}, Transport=${hasTr}`);
  }

  const [roleEv, roleArt] = saveScreenshot('40_role_access_verified.png');
  await page.screenshot({ path: roleEv });
  fs.copyFileSync(roleEv, roleArt);
  console.log('Captured: 40_role_access_verified.png');

  await browser.close();
  console.log('--- ALL E2E VERIFICATIONS COMPLETED SUCCESSFULLY ---');
})();
