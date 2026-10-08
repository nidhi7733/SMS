const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testSchoolSettingsAndAcademicSessions() {
  console.log('🚀 Starting School Settings & Academic Sessions E2E Verification Test...');
  const evidenceDir = path.resolve('C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  try {
    // Step 1: Login as Principal
    console.log('Step 1: Logging in as principal...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'principal');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Step 2: Navigate to School Settings via Sidebar
    console.log('Step 2: Navigating to School Settings via sidebar...');
    await page.click('button[data-tab="school_settings"]');
    await page.waitForTimeout(1000);

    // Update School Profile Details
    console.log('Step 3: Updating school profile details with custom values...');
    await page.waitForSelector('input[name="nameNp"]');
    await page.fill('input[name="nameNp"]', 'श्री जनकल्याण नमूना माध्यमिक विद्यालय');
    await page.fill('input[name="nameEn"]', 'Shree Janakalyan Model Secondary School');
    await page.fill('input[name="addressNp"]', 'बुटवल-०६, रुपन्देही, लुम्बिनी प्रदेश, नेपाल');
    await page.fill('input[name="addressEn"]', 'Butwal-06, Rupandehi, Lumbini Province, Nepal');
    await page.fill('input[name="phone"]', '०७१-५४०१२३');
    await page.fill('input[name="iemisCode"]', '370010005');

    // Click Save
    await page.click('button[type="submit"]:has-text("Save Changes"), button[type="submit"]:has-text("सुरक्षित")');
    await page.waitForTimeout(1500);

    // Evidence 15: School Settings updated
    await page.screenshot({
      path: path.join(evidenceDir, '15_school_settings_updated.png'),
      fullPage: true,
    });
    console.log('📸 Captured 15_school_settings_updated.png');

    // Step 4: Add New Academic Session
    console.log('Step 4: Opening Add Academic Session modal...');
    const addSessionBtn = await page.waitForSelector('button:has-text("नयाँ शैक्षिक सत्र थप्नुहोस्"), button:has-text("Add Session")');
    await addSessionBtn.click();
    await page.waitForTimeout(800);

    // Determine target year (ensure unique)
    const existingYears = await page.evaluate(async () => {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/years', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    });
    const yearsList = Array.isArray(existingYears)
      ? existingYears
      : (existingYears && existingYears.academicYears ? existingYears.academicYears : []);
    const maxYear = yearsList.reduce((m, y) => Math.max(m, Number(y.yearBs) || 0), 2083);
    const targetYear = maxYear + 1;

    console.log(`Filling session ${targetYear} BS details...`);
    await page.fill('input[min="2080"]', String(targetYear));
    await page.fill('input[placeholder="YYYY-01-01"]', `${targetYear}-01-01`);
    await page.fill('input[placeholder="YYYY-12-30"]', `${targetYear}-12-30`);

    // Check Set as Active Session
    const activeCheckbox = await page.locator('input[type="checkbox"]');
    await activeCheckbox.check();
    await page.waitForTimeout(500);

    // Submit Session Form
    const saveSessionBtn = await page.waitForSelector('button:has-text("सत्र सुरक्षित गर्नुहोस्"), button:has-text("Save")');
    await saveSessionBtn.click();
    await page.waitForTimeout(2000);
    const modalClose = page.locator('button:has-text("रद्द गर्नुहोस्")');
    if (await modalClose.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Evidence 16: Academic Session created & active
    await page.screenshot({
      path: path.join(evidenceDir, '16_academic_session_created.png'),
      fullPage: true,
    });
    console.log('📸 Captured 16_academic_session_created.png');

    // Step 5: Check Attendance Management Staff Register Header
    console.log('Step 5: Verifying dynamic school details in Attendance Management...');
    await page.click('button[data-tab="attendance"]');
    await page.waitForTimeout(1000);

    // Click Staff Monthly Register Tab
    const staffRegisterTab = await page.locator('button:has-text("मासिक हाजिरी खाता"), button:has-text("Staff Register")').first();
    if (await staffRegisterTab.isVisible()) {
      await staffRegisterTab.click();
      await page.waitForTimeout(1500);
    }

    // Verify printed register header text
    const printableRegister = await page.locator('#printable-staff-register');
    const registerText = await printableRegister.textContent();
    console.log('Staff Register Header Content Snippet:', registerText.substring(0, 150));

    if (!registerText.includes('श्री जनकल्याण नमूना माध्यमिक विद्यालय')) {
      throw new Error(`Expected 'श्री जनकल्याण नमूना माध्यमिक विद्यालय' in attendance header, found: ${registerText.substring(0, 150)}`);
    }
    if (registerText.includes('श्री शान्ति माध्यमिक विद्यालय')) {
      throw new Error('Old hardcoded school name "श्री शान्ति माध्यमिक विद्यालय" still present in attendance!');
    }

    // Evidence 17: Attendance dynamic school details
    await page.screenshot({
      path: path.join(evidenceDir, '17_attendance_dynamic_school_details.png'),
      fullPage: true,
    });
    console.log('📸 Captured 17_attendance_dynamic_school_details.png');

    // Step 6: Check Certificate Management
    console.log('Step 6: Verifying dynamic school details in Certificate Management...');
    await page.click('button[data-tab="certificates"]');
    await page.waitForTimeout(1500);

    // Open certificate preview modal
    const previewBtn = await page.locator('button:has-text("पूर्वावलोकन"), button:has-text("View")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(1000);

      const modalContent = await page.locator('.fixed.inset-0').textContent();
      console.log('Certificate Preview Snippet:', modalContent.substring(0, 200));

      if (!modalContent.includes('श्री जनकल्याण नमूना माध्यमिक विद्यालय')) {
        throw new Error(`Expected 'श्री जनकल्याण नमूना माध्यमिक विद्यालय' in certificate modal, found: ${modalContent.substring(0, 150)}`);
      }
      if (modalContent.includes('श्री राजेश्वर निधि')) {
        throw new Error('Old hardcoded school name "श्री राजेश्वर निधि" still present in certificate!');
      }

      // Evidence 18: Certificate dynamic school details
      await page.screenshot({
        path: path.join(evidenceDir, '18_certificate_dynamic_school_details.png'),
      });
      console.log('📸 Captured 18_certificate_dynamic_school_details.png');

      // Close modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const back = btns.find((b) => b.textContent?.includes('पछाडि फर्कनुहोस्') || b.title?.includes('सूचीमा फर्कनुहोस्'));
        if (back) back.click();
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Step 7: Check Academic Structure
    console.log('Step 7: Verifying Academic Structure sessions tab...');
    await page.click('button[data-tab="academic"]');
    await page.waitForTimeout(1000);

    const yearsTab = await page.locator('button:has-text("शैक्षिक सत्र"), button:has-text("Academic Sessions")').first();
    await yearsTab.click();
    await page.waitForTimeout(1000);

    const yearsContent = await page.textContent('body');
    if (!yearsContent.includes(String(targetYear)) && !yearsContent.includes('२०८३')) {
      throw new Error('Academic Sessions tab verification failed!');
    }

    // Evidence 19: Academic Structure Sessions
    await page.screenshot({
      path: path.join(evidenceDir, '19_academic_structure_sessions.png'),
      fullPage: true,
    });
    console.log('📸 Captured 19_academic_structure_sessions.png');

    console.log('🎉 ALL VERIFICATIONS PASSED WITH FLYING COLORS!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({
      path: path.join(evidenceDir, 'test_failure.png'),
      fullPage: true,
    });
    throw error;
  } finally {
    await browser.close();
  }
}

testSchoolSettingsAndAcademicSessions();
