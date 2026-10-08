const { chromium } = require('playwright');
const path = require('path');

async function captureCertEvidence() {
  const evidenceDir = path.resolve('C:/Users/pnidh/.gemini/antigravity/brain/71ae202a-28d3-41d3-a61f-77f1d5c6f1fe/evidence');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  try {
    console.log('Logging in...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'principal');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Get auth token and a student
    const token = await page.evaluate(() => localStorage.getItem('sms_token'));
    const studentsRes = await page.evaluate(async (t) => {
      const res = await fetch('/api/students', { headers: { Authorization: `Bearer ${t}` } });
      return res.json();
    }, token);

    console.log('studentsRes keys:', Object.keys(studentsRes));
    const studentsList = studentsRes.students || studentsRes;
    const firstStudent = Array.isArray(studentsList) ? studentsList[0] : null;
    console.log('firstStudent:', firstStudent?.firstNameEn, firstStudent?.id);

    if (firstStudent) {
      // Call generate certificate API
      const genRes = await page.evaluate(async ({ t, st }) => {
        const res = await fetch('/api/certificates/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({
            studentId: st.id,
            classId: st.currentClassId,
            certificateType: 'SLC',
            passedAcademicYearBs: 2083,
            symbolNumber: '02819420A',
            registrationNumber: '78-01-27001-001',
            gpa: '3.65',
            divisionOrGrade: 'A+',
            reasonForLeaving: 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण',
          }),
        });
        return res.json();
      }, { t: token, st: firstStudent });

      console.log('Certificate generated:', genRes.message);
    }

    // Navigate to Certificates tab
    console.log('Navigating to Certificates...');
    await page.click('button[data-tab="certificates"]');
    await page.waitForTimeout(1500);

    // Click Preview button
    const previewBtn = await page.locator('button:has-text("पूर्वावलोकन")').first();
    await previewBtn.click();
    await page.waitForTimeout(1000);

    const modalText = await page.locator('.fixed.inset-0').textContent();
    console.log('Cert Modal Text snippet:', modalText.substring(0, 300));

    if (!modalText.includes('श्री जनकल्याण नमूना माध्यमिक विद्यालय')) {
      throw new Error(`Expected 'श्री जनकल्याण नमूना माध्यमिक विद्यालय' in certificate modal, got: ${modalText.substring(0, 150)}`);
    }

    await page.screenshot({
      path: path.join(evidenceDir, '18_certificate_dynamic_school_details.png'),
    });
    console.log('📸 Successfully captured 18_certificate_dynamic_school_details.png');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

captureCertEvidence();
