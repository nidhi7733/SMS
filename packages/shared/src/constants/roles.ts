export const SYSTEM_PERMISSIONS = [
  // School & Admin Settings
  { code: 'SCHOOL_SETTINGS_VIEW', module: 'Settings', descriptionEn: 'View school profile and settings', descriptionNp: 'विद्यालयको विवरण र सेटिङ हेर्ने' },
  { code: 'SCHOOL_SETTINGS_MANAGE', module: 'Settings', descriptionEn: 'Manage school settings and sessions', descriptionNp: 'विद्यालय सेटिङ र शैक्षिक सत्र व्यवस्थापन' },
  
  // User & Role Management
  { code: 'USERS_VIEW', module: 'Users', descriptionEn: 'View user list and profiles', descriptionNp: 'प्रयोगकर्ताको सूची र प्रोफाइल हेर्ने' },
  { code: 'USERS_MANAGE', module: 'Users', descriptionEn: 'Create, edit, and deactivate users', descriptionNp: 'प्रयोगकर्ता सिर्जना, सम्पादन र निष्क्रिय गर्ने' },
  { code: 'ROLES_MANAGE', module: 'Users', descriptionEn: 'Configure roles and role permissions', descriptionNp: 'भूमिका र अनुमतिहरू व्यवस्थापन गर्ने' },

  // Academic Structure & Admission
  { code: 'ACADEMIC_STRUCTURE_VIEW', module: 'Academic', descriptionEn: 'View classes, sections, and streams', descriptionNp: 'कक्षा, सेक्सन र संकाय हेर्ने' },
  { code: 'ACADEMIC_STRUCTURE_MANAGE', module: 'Academic', descriptionEn: 'Manage classes, sections, and streams', descriptionNp: 'कक्षा, सेक्सन र संकाय व्यवस्थापन' },
  { code: 'STUDENTS_VIEW', module: 'Students', descriptionEn: 'View student records and profiles', descriptionNp: 'विद्यार्थीको अभिलेख र प्रोफाइल हेर्ने' },
  { code: 'STUDENTS_ADMIT', module: 'Students', descriptionEn: 'Process admissions and enrollments', descriptionNp: 'भर्ना प्रक्रिया सञ्चालन गर्ने' },
  { code: 'STUDENTS_EDIT', module: 'Students', descriptionEn: 'Update student profiles and documents', descriptionNp: 'विद्यार्थी विवरण र कागजात अद्यावधिक गर्ने' },
  { code: 'STUDENTS_PROMOTE', module: 'Students', descriptionEn: 'Perform bulk student promotion', descriptionNp: 'विद्यार्थी कक्षोन्नति सञ्चालन गर्ने' },

  // Staff & Teacher Management
  { code: 'STAFF_VIEW', module: 'Staff', descriptionEn: 'View staff and teacher profiles', descriptionNp: 'शिक्षक र कर्मचारीको विवरण हेर्ने' },
  { code: 'STAFF_MANAGE', module: 'Staff', descriptionEn: 'Manage staff profiles, appointments, and bulk import', descriptionNp: 'कर्मचारी विवरण, दरबन्दी र बल्क आयात व्यवस्थापन' },

  // Attendance
  { code: 'ATTENDANCE_VIEW', module: 'Attendance', descriptionEn: 'View student and staff attendance', descriptionNp: 'विद्यार्थी र कर्मचारीको हाजिरी हेर्ने' },
  { code: 'ATTENDANCE_RECORD', module: 'Attendance', descriptionEn: 'Record daily student attendance', descriptionNp: 'दैनिक विद्यार्थी हाजिरी भर्ने' },
  { code: 'ATTENDANCE_APPROVE_CORRECTION', module: 'Attendance', descriptionEn: 'Approve attendance corrections', descriptionNp: 'हाजिरी संशोधन स्वीकृत गर्ने' },

  // Calendar & Events
  { code: 'CALENDAR_VIEW', module: 'Calendar', descriptionEn: 'View Bikram Sambat school calendar and holidays', descriptionNp: 'शैक्षिक क्यालेन्डर र बिदाहरू हेर्ने' },
  { code: 'CALENDAR_MANAGE', module: 'Calendar', descriptionEn: 'Manage calendar events and public holidays', descriptionNp: 'क्यालेन्डर कार्यक्रम र सार्वजनिक बिदा व्यवस्थापन' },

  // Weekly Routine & Timetable
  { code: 'TIMETABLE_VIEW', module: 'Timetable', descriptionEn: 'View class and teacher routines', descriptionNp: 'कक्षा र शिक्षकको कार्यतालिका हेर्ने' },
  { code: 'TIMETABLE_MANAGE', module: 'Timetable', descriptionEn: 'Create and update timetables', descriptionNp: 'कार्यतालिका निर्माण र परिमार्जन गर्ने' },

  // Fees & Receipts
  { code: 'FEES_STRUCTURE_MANAGE', module: 'Fees', descriptionEn: 'Configure fee categories and rates', descriptionNp: 'शुल्क शीर्षक र दरहरू व्यवस्थापन गर्ने' },
  { code: 'FEES_COLLECT', module: 'Fees', descriptionEn: 'Collect fees and issue bilingual receipts', descriptionNp: 'शुल्क संकलन र बिल/रसिद जारी गर्ने' },
  { code: 'FEES_APPROVE_WAIVER', module: 'Fees', descriptionEn: 'Approve fee waivers and discounts', descriptionNp: 'शुल्क छुट तथा मिनाहा स्वीकृत गर्ने' },
  { code: 'FEES_CANCEL_RECEIPT', module: 'Fees', descriptionEn: 'Approve cancellation of fee receipts', descriptionNp: 'रसिद रद्द स्वीकृत गर्ने' },

  // Accounting & Vouchers
  { code: 'ACCOUNTS_VIEW', module: 'Accounting', descriptionEn: 'View vouchers, ledgers, and reports', descriptionNp: 'भाउचर, खाता र वित्तीय प्रतिवेदन हेर्ने' },
  { code: 'ACCOUNTS_POST_VOUCHER', module: 'Accounting', descriptionEn: 'Create and post accounting vouchers', descriptionNp: 'लेखा भाउचर प्रविष्टि गर्ने' },
  { code: 'ACCOUNTS_APPROVE_PERIOD_REOPEN', module: 'Accounting', descriptionEn: 'Approve accounting period reopening', descriptionNp: 'लेखा अवधि पुनः खोल्न स्वीकृति दिने' },

  // Library
  { code: 'LIBRARY_VIEW', module: 'Library', descriptionEn: 'Search catalog and view loan status', descriptionNp: 'पुस्तकालय सूची र पुस्तक विवरण हेर्ने' },
  { code: 'LIBRARY_CIRCULATION', module: 'Library', descriptionEn: 'Issue and return books, record fines', descriptionNp: 'पुस्तक जारी, फिर्ता र जरिवाना प्रविष्टि' },

  // LMS & Exams
  { code: 'LMS_CONTENT_MANAGE', module: 'LMS', descriptionEn: 'Upload lessons, notes, and homework', descriptionNp: 'पाठ, नोट र गृहकार्य व्यवस्थापन गर्ने' },
  { code: 'EXAMS_ENTER_MARKS', module: 'Examinations', descriptionEn: 'Enter student marks for assigned subjects', descriptionNp: 'तोकिएका विषयहरूको प्राप्तांक प्रविष्टि गर्ने' },
  { code: 'EXAMS_VERIFY_RESULTS', module: 'Examinations', descriptionEn: 'Verify class tabulations as coordinator', descriptionNp: 'परीक्षा नतिजा रुजु गर्ने' },
  { code: 'EXAMS_APPROVE_PUBLISH', module: 'Examinations', descriptionEn: 'Publish examination results and report cards', descriptionNp: 'परीक्षा नतिजा प्रकाशन स्वीकृत गर्ने' },

  // Documents & Certificates
  { code: 'DOCUMENTS_ISSUE', module: 'Documents', descriptionEn: 'Generate ID cards and certificates with QR', descriptionNp: 'परिचयपत्र तथा क्युआर कोडसहित प्रमाणपत्र जारी' },

  // Audit Logs
  { code: 'AUDIT_LOGS_VIEW', module: 'Audit', descriptionEn: 'Inspect permanent system audit logs', descriptionNp: 'प्रणालीको अडिट लग निरीक्षण गर्ने' },
] as const;
