import * as XLSX from 'xlsx';

export interface IemisStudentRow {
  rowNum: number;
  iemisCode: string; // CEHRD 16-digit Student ID (e.g. 1707200017903736)
  schoolIemisCode?: string; // School code (e.g. 170720001)
  schoolName?: string; // e.g. Rajeshwar Nidhi Secondary School
  fullName: string;
  firstNameEn: string;
  middleNameEn?: string;
  lastNameEn: string;
  firstNameNp?: string;
  middleNameNp?: string;
  lastNameNp?: string;
  gender: string;
  fatherNameEn: string;
  motherNameEn: string;
  guardianName?: string;
  guardianContactNumber?: string;
  fatherPhone?: string; // alias for guardianContactNumber
  currentClass: string;
  section: string;
  classCode?: string; // alias for currentClass
  sectionCode?: string; // alias for section
  rollNumber?: number;
  year?: number;
  permanentAddress?: string;
  temporaryAddress?: string;
  dobBs: string;
  dobAd?: string;
  isTransferred?: string;
  motherTongue?: string;
  disabilityType?: string;
  age?: number;

  // Parsed address structures
  permLocalLevel?: string;
  permWardNumber?: number;
  permDistrict?: string;
  permProvince?: string;

  // Validation flags
  isValid: boolean;
  isDuplicate: boolean;
  errorReason?: string;
}

export interface ParseResult {
  rows: IemisStudentRow[];
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

/**
 * Splits a full name string into First, Middle, and Last Name components.
 */
export const splitFullName = (name: string) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: parts[0] };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

/**
 * Parses Nepal address string (e.g. "Nagarain-2, Dhanusha") into municipality, ward, and district.
 */
export const parseAddress = (addrStr: string) => {
  if (!addrStr || typeof addrStr !== 'string') {
    return {
      localLevel: 'Tokha Municipality',
      wardNumber: 4,
      district: 'Kathmandu',
      province: 'Bagmati Province',
    };
  }

  const parts = addrStr.split(',').map((s) => s.trim());
  const localPart = parts[0] || 'Nagarain-2';
  const districtPart = parts[1] || 'Dhanusha';

  let localLevel = localPart;
  let wardNumber = 1;

  const match = localPart.match(/^([a-zA-Z\s]+)-?(\d+)?$/);
  if (match) {
    localLevel = match[1].trim();
    if (match[2]) {
      wardNumber = parseInt(match[2], 10);
    }
  }

  let province = 'Madhesh Province';
  const dLower = districtPart.toLowerCase();
  if (
    dLower.includes('dhanusha') ||
    dLower.includes('mahottari') ||
    dLower.includes('sarlahi') ||
    dLower.includes('siraha') ||
    dLower.includes('saptari') ||
    dLower.includes('rautahat') ||
    dLower.includes('bara') ||
    dLower.includes('parsa')
  ) {
    province = 'Madhesh Province';
  } else if (
    dLower.includes('kathmandu') ||
    dLower.includes('lalitpur') ||
    dLower.includes('bhaktapur') ||
    dLower.includes('kavre')
  ) {
    province = 'Bagmati Province';
  }

  return { localLevel, wardNumber, district: districtPart, province };
};

/**
 * Generates and downloads the official CEHRD IEMIS compliant Excel template.
 * Matches exact 20 columns of CEHRD Excel export (Students_2083_10.xlsx).
 */
export const downloadIemisTemplate = () => {
  const headers = [
    'S.N',
    'IEMIS Code',
    'Current School',
    'Student Id',
    'FullName',
    'Gender',
    'Father Name',
    'Mother Name',
    'CurrentClass',
    'Section',
    'Year',
    'Permanent Address',
    'Temporary Address',
    'DOB',
    'Is Transferred',
    'Mother Tongue',
    'Disability Type',
    'Age',
    'Guardian Name',
    'Guardian Contact Number',
  ];

  const sampleRows = [
    [
      1,
      '170720001',
      'Rajeshwar Nidhi Secondary School',
      '1707200017903736',
      'Aadarsh Kumar Gupta',
      'Male',
      'Sanjay Prasad Gupta',
      'Bharti Gupta',
      '10',
      'C',
      2083,
      'Nagarain-2, Dhanusha',
      'Nagarain-2, Dhanusha',
      '2067-03-03',
      'No',
      'Maithali',
      'No Disability',
      16,
      'Bharti Gupta',
      '9827810816',
    ],
    [
      2,
      '170720001',
      'Rajeshwar Nidhi Secondary School',
      '1707200017903729',
      'Aadarsh Kumar Yadav',
      'Male',
      'Badree Yadav',
      'Chanda Devi',
      '10',
      'B',
      2083,
      'Nagarain-1, Dhanusha',
      'Nagarain-1, Dhanusha',
      '2067-05-03',
      'No',
      'Maithali',
      'No Disability',
      16,
      'Badree Yadav',
      '9826890437',
    ],
    [
      3,
      '170720001',
      'Rajeshwar Nidhi Secondary School',
      '1705800027600427',
      'Aanchal Kumari',
      'Female',
      'Shyam Mandal Dhanuk',
      'Pawan Devi',
      '10',
      'A',
      2083,
      'Nagarain-6, Dhanusha',
      'Nagarain-6, Dhanusha',
      '2068-01-08',
      'No',
      'Maithali',
      'No Disability',
      15,
      'Shyam Mandal Dhanuk',
      '9826898727',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // S.N
    { wch: 14 }, // School IEMIS Code
    { wch: 34 }, // Current School
    { wch: 20 }, // Student Id (16-digit IEMIS Code)
    { wch: 24 }, // FullName
    { wch: 10 }, // Gender
    { wch: 22 }, // Father Name
    { wch: 20 }, // Mother Name
    { wch: 14 }, // CurrentClass
    { wch: 10 }, // Section
    { wch: 8 },  // Year
    { wch: 24 }, // Permanent Address
    { wch: 24 }, // Temporary Address
    { wch: 14 }, // DOB (BS)
    { wch: 14 }, // Is Transferred
    { wch: 14 }, // Mother Tongue
    { wch: 16 }, // Disability Type
    { wch: 6 },  // Age
    { wch: 22 }, // Guardian Name
    { wch: 24 }, // Guardian Contact Number
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student_List_2083_10');

  // Instructions Tab
  const instructions = [
    ['CEHRD IEMIS Student Import Instructions (नेपाल सरकार शिक्षा तथा मानव स्रोत विकास केन्द्र ढाँचा)'],
    [''],
    ['स्तम्भ (Column Name)', 'आवश्यकता (Status)', 'विवरण तथा उदाहरण (Description & Example)'],
    ['Student Id', 'अति महत्त्वपूर्ण (Unique)', 'विद्यार्थीको १६-अङ्कको आधिकारिक सरकारी IEMIS कोड (उदा: 1707200017903736)। यो दोहोरिन दिइने छैन।'],
    ['FullName', 'अनिवार्य (Required)', 'विद्यार्थीको पूरा नाम अंग्रेजीमा (उदा: Aadarsh Kumar Gupta)'],
    ['CurrentClass', 'अनिवार्य (Required)', 'कक्षा कोड (उदा: ECD, 1, 2, ..., 9, 10, 11, 12)'],
    ['Section', 'अनिवार्य (Required)', 'सेक्सन (उदा: A, B, C)'],
    ['Father Name', 'सिफारिस (Recommended)', 'बुबाको नाम (उदा: Sanjay Prasad Gupta)'],
    ['Mother Name', 'सिफारिस (Recommended)', 'आमाको नाम (उदा: Bharti Gupta)'],
    ['Guardian Contact Number', 'सिफारिस (Recommended)', 'अभिभावकको सम्पर्क मोबाइल नम्बर (उदा: 9827810816)'],
    ['Permanent Address', 'सिफारिस (Recommended)', 'ठेगाना [स्थानीय तह]-[वडा], [जिल्ला] ढाँचामा (उदा: Nagarain-2, Dhanusha)'],
    ['DOB', 'अनिवार्य (Required)', 'वि.सं. जन्ममिति YYYY-MM-DD ढाँचामा (उदा: 2067-03-03)'],
    ['Gender', 'अनिवार्य (Required)', 'Male / Female / Other'],
    [''],
    ['नोट: CEHRD को आधिकारिक पोर्टलबाट डाउनलोड गरिएको Students Excel फाइललाई सिधै कुनै फेरबदल नगरी यहाँ अपलोड गर्न सकिन्छ।'],
  ];

  const wsNotes = XLSX.utils.aoa_to_sheet(instructions);
  wsNotes['!cols'] = [{ wch: 28 }, { wch: 25 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

  XLSX.writeFile(wb, 'CEHRD_IEMIS_Student_Template_2083.xlsx');
};

/**
 * Parses an uploaded Excel file matching CEHRD IEMIS structure (Students_2083_10.xlsx)
 * and checks for duplicates against the database and within the file.
 */
export const parseIemisExcel = async (
  file: File,
  existingStudents: any[]
): Promise<ParseResult> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Map existing IEMIS IDs from database for duplicate checking
  const existingDbIemisMap = new Map<string, any>();
  for (const st of existingStudents) {
    if (st.iemisCode) {
      existingDbIemisMap.set(String(st.iemisCode).trim().toLowerCase(), st);
    }
  }

  const seenInFileIemis = new Set<string>();
  const parsedRows: IemisStudentRow[] = [];

  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < rawJson.length; i++) {
    const raw = rawJson[i];
    const rowNum = i + 2; // Accounting for 1-based index and header row

    const getVal = (keys: string[]): string => {
      for (const k of keys) {
        if (raw[k] !== undefined && String(raw[k]).trim() !== '') {
          return String(raw[k]).trim();
        }
      }
      return '';
    };

    // CEHRD "Student Id" is the unique 16-digit IEMIS Code!
    const studentIdRaw = getVal(['Student Id', 'StudentId', 'studentId', 'Student ID']);
    const iemisCode = studentIdRaw || getVal(['IEMIS Code', 'iemisCode', 'IEMIS ID', 'विद्यार्थी कोड']);
    const schoolIemisCode = getVal(['IEMIS Code', 'School IEMIS Code', 'schoolIemisCode']);
    const schoolName = getVal(['Current School', 'School Name', 'CurrentSchool']);

    const fullName = getVal(['FullName', 'Full Name', 'fullName', 'Student Name', 'Name']);
    const { firstName: firstNameEn, middleName: middleNameEn, lastName: lastNameEn } = splitFullName(fullName);

    const genderRaw = getVal(['Gender', 'gender', 'लिङ्ग']).toUpperCase();
    const gender = genderRaw.includes('F') ? 'FEMALE' : genderRaw.includes('O') ? 'OTHER' : 'MALE';

    const fatherNameEn = getVal(['Father Name', 'FatherName', 'fatherName', 'Father', 'बुबाको नाम']);
    const motherNameEn = getVal(['Mother Name', 'MotherName', 'motherName', 'Mother', 'आमाको नाम']);
    const guardianName = getVal(['Guardian Name', 'GuardianName', 'guardianName', 'अभिभावकको नाम']) || fatherNameEn || motherNameEn;
    const guardianContactNumber = getVal([
      'Guardian Contact Number',
      'Guardian Contact',
      'guardianContactNumber',
      'Contact Number',
      'Phone',
      'Mobile',
      'सम्पर्क नम्बर',
    ]);

    const currentClass = getVal(['CurrentClass', 'Current Class', 'Class', 'classCode', 'कक्षा', 'Grade']) || '10';
    const section = getVal(['Section', 'section', 'खण्ड', 'Sec']) || 'A';
    const yearRaw = getVal(['Year', 'year', 'वर्ष', 'Academic Year']);
    const year = yearRaw ? parseInt(yearRaw, 10) : 2083;

    const permanentAddress = getVal(['Permanent Address', 'PermanentAddress', 'permanentAddress', 'स्थायी ठेगाना']);
    const temporaryAddress = getVal(['Temporary Address', 'TemporaryAddress', 'temporaryAddress', 'अस्थायी ठेगाना']);
    const { localLevel, wardNumber, district, province } = parseAddress(permanentAddress);

    const dobBs = getVal(['DOB', 'dobBs', 'DOB BS', 'जन्म मिति वि.सं.']) || '2067-01-01';
    const isTransferred = getVal(['Is Transferred', 'IsTransferred', 'isTransferred']) || 'No';
    const motherTongue = getVal(['Mother Tongue', 'MotherTongue', 'motherTongue', 'मातृभाषा']) || 'Maithali';
    const disabilityType = getVal(['Disability Type', 'DisabilityType', 'disabilityType', 'अपाङ्गता']) || 'No Disability';
    const ageRaw = getVal(['Age', 'age', 'उमेर']);
    const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

    // Validation
    let isValid = true;
    let isDuplicate = false;
    let errorReason = '';

    // 1. Check duplicate in database
    if (iemisCode && existingDbIemisMap.has(iemisCode.toLowerCase())) {
      const existing = existingDbIemisMap.get(iemisCode.toLowerCase());
      isValid = false;
      isDuplicate = true;
      errorReason = `Duplicate Student IEMIS ID "${iemisCode}" is already registered (Student: ${existing.firstNameEn} ${existing.lastNameEn}, Class ${existing.classCode || ''}).`;
      duplicateCount++;
    }
    // 2. Check duplicate within the file
    else if (iemisCode && seenInFileIemis.has(iemisCode.toLowerCase())) {
      isValid = false;
      isDuplicate = true;
      errorReason = `Duplicate Student IEMIS ID "${iemisCode}" appears more than once in this file.`;
      duplicateCount++;
    }
    // 3. Name check
    else if (!fullName && !firstNameEn) {
      isValid = false;
      errorReason = 'Missing student Full Name.';
      invalidCount++;
    }
    // 4. Class check
    else if (!currentClass) {
      isValid = false;
      errorReason = 'Missing Class.';
      invalidCount++;
    } else {
      validCount++;
    }

    if (iemisCode) {
      seenInFileIemis.add(iemisCode.toLowerCase());
    }

    parsedRows.push({
      rowNum,
      iemisCode,
      schoolIemisCode,
      schoolName,
      fullName: fullName || `${firstNameEn} ${lastNameEn}`.trim(),
      firstNameEn,
      middleNameEn,
      lastNameEn,
      gender,
      fatherNameEn,
      motherNameEn,
      guardianName,
      guardianContactNumber,
      fatherPhone: guardianContactNumber,
      currentClass,
      section,
      classCode: currentClass,
      sectionCode: section,
      year,
      permanentAddress,
      temporaryAddress,
      permLocalLevel: localLevel,
      permWardNumber: wardNumber,
      permDistrict: district,
      permProvince: province,
      dobBs,
      isTransferred,
      motherTongue,
      disabilityType,
      age,
      isValid,
      isDuplicate,
      errorReason,
    });
  }

  return {
    rows: parsedRows,
    totalRows: rawJson.length,
    validCount,
    duplicateCount,
    invalidCount,
  };
};
