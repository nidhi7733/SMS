import { pgTable, text, timestamp, boolean, integer, jsonb, primaryKey, real, uniqueIndex } from 'drizzle-orm/pg-core';

// 1. Schools (Tenant)
export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameNp: text('name_np').notNull(),
  logoUrl: text('logo_url'),
  mottoEn: text('motto_en'),
  mottoNp: text('motto_np'),
  iemisCode: text('iemis_code'),
  establishedBsYear: integer('established_bs_year'),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  website: text('website'),
  addressEn: text('address_en').notNull(),
  addressNp: text('address_np').notNull(),
  province: text('province').notNull(),
  district: text('district').notNull(),
  localLevel: text('local_level').notNull(),
  wardNumber: integer('ward_number').notNull(),
  shifts: jsonb('shifts').notNull().$type<string[]>(),
  minClass: text('min_class').notNull().default('ECD'),
  maxClass: text('max_class').notNull().default('12'),
  activeAcademicYearBs: integer('active_academic_year_bs').notNull().default(2083),
  fiscalYearBs: text('fiscal_year_bs').notNull().default('2082/083'),
  isOfflineCapable: boolean('is_offline_capable').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Academic Years
export const academicYears = pgTable('academic_years', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  yearBs: integer('year_bs').notNull(),
  startDateAd: text('start_date_ad').notNull(),
  endDateAd: text('end_date_ad').notNull(),
  startDateBs: text('start_date_bs').notNull(),
  endDateBs: text('end_date_bs').notNull(),
  isCurrent: boolean('is_current').notNull().default(false),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. Roles
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "PRINCIPAL"
  displayNameEn: text('display_name_en').notNull(),
  displayNameNp: text('display_name_np').notNull(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 4. Permissions
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. "STUDENTS_VIEW"
  module: text('module').notNull(),
  descriptionEn: text('description_en').notNull(),
  descriptionNp: text('description_np').notNull(),
});

// 5. Role Permissions Junction
export const rolePermissions = pgTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
]);

// 6. Users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email'),
  phone: text('phone'),
  fullNameEn: text('full_name_en').notNull(),
  fullNameNp: text('full_name_np').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE, SUSPENDED
  isSuperAdmin: boolean('is_superadmin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 7. User Roles Junction
export const userRoles = pgTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

// 8. Audit Logs (Permanent & Audited)
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 9. Sync Outbox (For local school server <-> cloud replication)
export const syncOutbox = pgTable('sync_outbox', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(), // INSERT, UPDATE, CANCEL, REVERSE
  payload: jsonb('payload').notNull(),
  version: integer('version').notNull().default(1),
  syncStatus: text('sync_status').notNull().default('PENDING'), // PENDING, SYNCED, CONFLICT
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
});

// 10. Classes (Grade levels ECD through 12)
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // e.g. "ECD", "1", "10", "12"
  nameEn: text('name_en').notNull(), // e.g. "Grade 10"
  nameNp: text('name_np').notNull(), // e.g. "कक्षा १०"
  displayOrder: integer('display_order').notNull(),
  stage: text('stage').notNull().default('PRIMARY'), // PRE_PRIMARY, PRIMARY, LOWER_SECONDARY, SECONDARY, HIGHER_SECONDARY
  hasStreams: boolean('has_streams').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 11. Streams (Specializations for Class 11-12)
export const streams = pgTable('streams', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // SCIENCE, MANAGEMENT, EDUCATION, HUMANITIES, COMPUTER_ENGINEERING
  nameEn: text('name_en').notNull(),
  nameNp: text('name_np').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 12. Sections (Class sections e.g. A, B, C)
export const sections = pgTable('sections', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  streamId: text('stream_id').references(() => streams.id, { onDelete: 'set null' }),
  nameEn: text('name_en').notNull(), // e.g. "Section A"
  nameNp: text('name_np').notNull(), // e.g. "खण्ड क"
  code: text('code').notNull(), // e.g. "A"
  shift: text('shift').notNull().default('DAY'), // MORNING, DAY, EVENING
  capacity: integer('capacity').notNull().default(45),
  classTeacherId: text('class_teacher_id').references(() => users.id, { onDelete: 'set null' }),
  roomNumber: text('room_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 13. Houses (Extracurricular groupings)
export const houses = pgTable('houses', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  nameEn: text('name_en').notNull(), // Red House
  nameNp: text('name_np').notNull(), // रातो सदन
  colorHex: text('color_hex').notNull(),
  masterTeacherName: text('master_teacher_name'),
  captainStudentName: text('captain_student_name'),
  viceCaptainStudentName: text('vice_captain_student_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 14. Subjects (CDC Curricula & Credit Allocations)
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  streamId: text('stream_id').references(() => streams.id, { onDelete: 'set null' }),
  sectionId: text('section_id').references(() => sections.id, { onDelete: 'set null' }),
  code: text('code').notNull(), // e.g. "NEP.001"
  nameEn: text('name_en').notNull(), // e.g. "Compulsory Nepali"
  nameNp: text('name_np').notNull(), // e.g. "अनिवार्य नेपाली"
  isOptional: boolean('is_optional').notNull().default(false),
  optionalGroup: text('optional_group'), // 'OPT_1', 'OPT_2', 'TECHNICAL', or null
  creditHours: integer('credit_hours').notNull().default(4),
  theoryFullMarks: integer('theory_full_marks').notNull().default(75),
  practicalFullMarks: integer('practical_full_marks').notNull().default(25),
  theoryPassMarks: integer('theory_pass_marks').notNull().default(27),
  practicalPassMarks: integer('practical_pass_marks').notNull().default(10),
  teacherId: text('teacher_id').references(() => staff.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 15. Students (Core student identity & academic record)
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull(), // Format: [BSYear]-[Sequence] e.g. 2083-0001
  iemisCode: text('iemis_code'), // Official CEHRD IEMIS ID
  firstNameEn: text('first_name_en').notNull(),
  middleNameEn: text('middle_name_en'),
  lastNameEn: text('last_name_en').notNull(),
  firstNameNp: text('first_name_np').notNull(),
  middleNameNp: text('middle_name_np'),
  lastNameNp: text('last_name_np').notNull(),
  dobBs: text('dob_bs').notNull(), // e.g. "2070-05-12"
  dobAd: text('dob_ad').notNull(), // e.g. "2013-08-28"
  gender: text('gender').notNull(), // MALE, FEMALE, OTHER
  bloodGroup: text('blood_group'), // A+, A-, B+, B-, AB+, AB-, O+, O-
  motherTongue: text('mother_tongue').default('Nepali'),
  nationality: text('nationality').notNull().default('Nepali'),
  ethnicityInclusion: text('ethnicity_inclusion').notNull().default('BRAHMIN_CHHETRI'), // DALIT, JANAJATI, BRAHMIN_CHHETRI, MADHESI, MUSLIM, THARU, BACKWARD, OTHER
  disabilityStatus: text('disability_status').notNull().default('NONE'), // NONE, PHYSICAL, VISUAL, HEARING, SPEECH, INTELLECTUAL, MULTIPLE
  scholarshipEligible: boolean('scholarship_eligible').notNull().default(false),
  photoUrl: text('photo_url'),
  houseId: text('house_id').references(() => houses.id, { onDelete: 'set null' }),
  
  // Permanent Address (Nepal structured)
  permProvince: text('perm_province').notNull(),
  permDistrict: text('perm_district').notNull(),
  permLocalLevel: text('perm_local_level').notNull(),
  permWardNumber: integer('perm_ward_number').notNull(),
  permTole: text('perm_tole'),

  // Current Address
  currProvince: text('curr_province').notNull(),
  currDistrict: text('curr_district').notNull(),
  currLocalLevel: text('curr_local_level').notNull(),
  currWardNumber: integer('curr_ward_number').notNull(),
  currTole: text('curr_tole'),

  // Academic Placement
  admissionYearBs: integer('admission_year_bs').notNull().default(2083),
  admissionDateBs: text('admission_date_bs').notNull(),
  admissionDateAd: text('admission_date_ad').notNull(),
  currentClassId: text('current_class_id').notNull().references(() => classes.id),
  currentSectionId: text('current_section_id').references(() => sections.id),
  currentRollNumber: integer('current_roll_number'),
  optionalSubject1Id: text('optional_subject1_id').references(() => subjects.id, { onDelete: 'set null' }),
  optionalSubject2Id: text('optional_subject2_id').references(() => subjects.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, PROMOTED, RETAINED, TRANSFERRED, WITHDRAWN, GRADUATED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 16. Student Health Records (Medical and Health Information)
export const studentHealthRecords = pgTable('student_health_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  bloodGroup: text('blood_group').notNull().default('UNKNOWN'),
  allergies: text('allergies'), // Drug, food, environmental
  chronicConditions: text('chronic_conditions'), // Asthma, Diabetes, Epilepsy, etc.
  regularMedications: text('regular_medications'),
  physicalAccommodations: text('physical_accommodations'), // Corrective lenses, hearing aids, mobility
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  preferredHospital: text('preferred_hospital'), // Local health post, PHC, hospital
  immunizationStatus: text('immunization_status').notNull().default('COMPLETE'), // COMPLETE, PARTIAL, NOT_SPECIFIED
  medicalNotes: text('medical_notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 17. Guardians (Multi-Guardian Contact Table)
export const guardians = pgTable('guardians', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  relationship: text('relationship').notNull(), // FATHER, MOTHER, LOCAL_GUARDIAN
  fullNameEn: text('full_name_en').notNull(),
  fullNameNp: text('full_name_np').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  occupation: text('occupation'),
  isPrimaryContact: boolean('is_primary_contact').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 18. Student Enrollments (Academic Session History & Promotion Tracking)
export const studentEnrollments = pgTable('student_enrollments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  sectionId: text('section_id').references(() => sections.id, { onDelete: 'set null' }),
  rollNumber: integer('roll_number'),
  optionalSubject1Id: text('optional_subject1_id').references(() => subjects.id, { onDelete: 'set null' }),
  optionalSubject2Id: text('optional_subject2_id').references(() => subjects.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('ENROLLED'), // ENROLLED, PROMOTED, RETAINED, TRANSFERRED, WITHDRAWN, GRADUATED
  promotionDate: timestamp('promotion_date', { withTimezone: true }),
  promotionRemarks: text('promotion_remarks'),
  principalOverride: boolean('principal_override').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 19. Student Admissions (Applications Queue)
export const studentAdmissions = pgTable('student_admissions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  applicationNumber: text('application_number').notNull().unique(), // APP-2083-0001
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  targetClassId: text('target_class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  targetStreamId: text('target_stream_id').references(() => streams.id, { onDelete: 'set null' }),
  applicantNameEn: text('applicant_name_en').notNull(),
  applicantNameNp: text('applicant_name_np').notNull(),
  dobBs: text('dob_bs').notNull(),
  gender: text('gender').notNull(),
  guardianName: text('guardian_name').notNull(),
  guardianPhone: text('guardian_phone').notNull(),
  quotaCategory: text('quota_category').notNull().default('GENERAL'), // GENERAL, FEMALE, DALIT, JANAJATI, DISABILITY, POVERTY, STAFF_CHILD
  entranceScore: integer('entrance_score'),
  meritRank: integer('merit_rank'),
  applicationStatus: text('application_status').notNull().default('SUBMITTED'), // SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, ENROLLED
  reviewerRemarks: text('reviewer_remarks'),
  createdStudentId: text('created_student_id').references(() => students.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 20. Staff & Teachers (Directory & Human Resources)
export const staff = pgTable('staff', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffCode: text('staff_code').notNull(), // e.g. T-2083-001 or S-2083-001
  category: text('category').notNull().default('TEACHING'), // TEACHING, NON_TEACHING
  fullNameEn: text('full_name_en').notNull(),
  fullNameNp: text('full_name_np').notNull(),
  dobBs: text('dob_bs').notNull(),
  dobAd: text('dob_ad'),
  gender: text('gender').notNull().default('MALE'),
  bloodGroup: text('blood_group'),
  phone: text('phone').notNull(),
  email: text('email'),
  citizenshipNo: text('citizenship_no'),
  nationalIdNo: text('national_id_no'),
  panNumber: text('pan_number'),
  appointmentType: text('appointment_type').notNull().default('PERMANENT'), // PERMANENT, RELIEF, MUNICIPAL, CONTRACT, PRIVATE, ECD_FACILITATOR, OFFICE_SUPPORT
  designation: text('designation').notNull().default('TEACHER'), // PRINCIPAL, SECONDARY_TEACHER, LOWER_SECONDARY_TEACHER, PRIMARY_TEACHER, ECD_TEACHER, ACCOUNTANT, ADMIN_STAFF, LAB_ASSISTANT, OFFICE_ASSISTANT
  teachingLicenseNo: text('teaching_license_no'),
  qualification: text('qualification').notNull().default('BACHELOR'), // SLC_SEE, PLUS_TWO, BACHELOR, MASTER, MPHIL_PHD
  majorSubject: text('major_subject'),
  training: text('training'),
  bankName: text('bank_name'),
  bankAccountNo: text('bank_account_no'),
  permanentAddress: text('permanent_address'),
  currentAddress: text('current_address'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, ON_LEAVE, TRANSFERRED, RETIRED, RESIGNED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 21. Student Attendance (Daily Records)
export const studentAttendance = pgTable('student_attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  sectionId: text('section_id').references(() => sections.id, { onDelete: 'set null' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  attendanceDateBs: text('attendance_date_bs').notNull(), // e.g. "2083-01-15"
  attendanceDateAd: text('attendance_date_ad').notNull(), // e.g. "2026-04-28"
  status: text('status').notNull().default('PRESENT'), // PRESENT, ABSENT, LATE, SICK_LEAVE, EXCUSED_LEAVE, HALF_DAY
  remarks: text('remarks'),
  recordedById: text('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 22. Staff Attendance (Daily Records)
export const staffAttendance = pgTable('staff_attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  attendanceDateBs: text('attendance_date_bs').notNull(),
  attendanceDateAd: text('attendance_date_ad').notNull(),
  status: text('status').notNull().default('PRESENT'), // PRESENT, ABSENT, ON_LEAVE, LATE, OFFICIAL_DUTY
  inTime: text('in_time'),
  outTime: text('out_time'),
  remarks: text('remarks'),
  recordedById: text('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 23. Staff Leaves (Applications & Approvals)
export const staffLeaves = pgTable('staff_leaves', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  leaveType: text('leave_type').notNull(), // CASUAL, FESTIVE, SICK, MATERNITY, PATERNITY, MOURNING, SPECIAL
  startDateBs: text('start_date_bs').notNull(),
  endDateBs: text('end_date_bs').notNull(),
  totalDays: integer('total_days').notNull().default(1),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED, CANCELLED
  approvedById: text('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewRemarks: text('review_remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 24. School Calendar Events (Bikram Sambat Academic Calendar)
export const schoolCalendarEvents = pgTable('school_calendar_events', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  titleEn: text('title_en').notNull(),
  titleNp: text('title_np').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull(), // PUBLIC_HOLIDAY, SCHOOL_HOLIDAY, EXAM_DAY, EVENT_SPORTS, EVENT_CULTURAL, MEETING, TRAINING
  startDateBs: text('start_date_bs').notNull(),
  endDateBs: text('end_date_bs').notNull(),
  startDateAd: text('start_date_ad').notNull(),
  endDateAd: text('end_date_ad').notNull(),
  isTeachingDay: boolean('is_teaching_day').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 25. Timetables (Weekly Class & Teacher Routines)
export const timetables = pgTable('timetables', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').references(() => staff.id, { onDelete: 'set null' }),
  dayOfWeek: text('day_of_week').notNull(), // SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY
  periodNumber: integer('period_number').notNull(), // 1 to 8
  startTime: text('start_time').notNull(), // e.g. "10:15"
  endTime: text('end_time').notNull(), // e.g. "11:00"
  roomNumber: text('room_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 26. Substitute Class Assignments (सट्टा कक्षा व्यवस्थापन)
export const substituteAssignments = pgTable('substitute_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  dateBs: text('date_bs').notNull(), // e.g. "2083-05-31"
  timetableId: text('timetable_id').references(() => timetables.id, { onDelete: 'set null' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  originalTeacherId: text('original_teacher_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  substituteTeacherId: text('substitute_teacher_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  periodNumber: integer('period_number').notNull(),
  startTime: text('start_time'),
  endTime: text('end_time'),
  status: text('status').notNull().default('ASSIGNED'), // ASSIGNED, COMPLETED, CANCELLED
  remarks: text('remarks'),
  assignedById: text('assigned_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 27. Examinations (त्रैमासिक तथा आवधिक परीक्षाहरू)
export const exams = pgTable('exams', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  nameEn: text('name_en').notNull(), // e.g. "First Terminal Examination 2083"
  nameNp: text('name_np').notNull(), // e.g. "प्रथम त्रैमासिक परीक्षा २०८३"
  examType: text('exam_type').notNull(), // FIRST_TERM, SECOND_TERM, FINAL_TERM, UNIT_TEST, PRE_BOARD
  startDateBs: text('start_date_bs').notNull(),
  endDateBs: text('end_date_bs').notNull(),
  isResultPublished: boolean('is_result_published').notNull().default(false),
  isMarksLocked: boolean('is_marks_locked').notNull().default(false),
  workflowStatus: text('workflow_status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, VERIFIED, PUBLISHED
  gradingPolicyCode: text('grading_policy_code').notNull().default('CDC_LG_2078_A4_2081'),
  submittedById: text('submitted_by_id').references(() => users.id, { onDelete: 'set null' }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  verifiedById: text('verified_by_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  publishedById: text('published_by_id').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 28. Examination Marks Entry (सैद्धान्तिक तथा प्रयोगात्मक प्राप्ताङ्क)
export const examMarks = pgTable('exam_marks', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  theoryMarks: real('theory_marks'), // सैद्धान्तिक अंक
  practicalMarks: real('practical_marks'), // प्रयोगात्मक अंक (कुल आन्तरिक)
  casParticipation: real('cas_participation'), // सहभागिता (Max 4 / 3)
  casProjectPractical: real('cas_project_practical'), // परियोजना तथा प्रयोगात्मक (Max 16 / 36)
  casDiscipline: real('cas_discipline'), // आचरण तथा अनुशासन (Max 2)
  casTerminalExam: real('cas_terminal_exam'), // त्रैमासिक परीक्षा (Max 3 / 6)
  isAbsent: boolean('is_absent').notNull().default(false),
  entryStatus: text('entry_status').notNull().default('DRAFT'), // DRAFT, SUBMITTED, VERIFIED
  remarks: text('remarks'),
  recordedById: text('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('exam_marks_exam_student_subject_uq').on(table.examId, table.studentId, table.subjectId),
]);

// 29. Class 1-3 Continuous Assessment System (एकीकृत पाठ्यक्रम CAS - थिम तथा स्तर १-४ मूल्याङ्कन)
export const class1To3CasRatings = pgTable('class_1_to_3_cas_ratings', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  themeName: text('theme_name'),
  levelRating: integer('level_rating').notNull(), // 1: कमजोर, 2: सामान्य, 3: राम्रो, 4: धेरै राम्रो
  achievementRemarks: text('achievement_remarks'),
  entryStatus: text('entry_status').notNull().default('DRAFT'), // DRAFT, SUBMITTED
  recordedById: text('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('class_1_to_3_cas_exam_student_subject_uq').on(table.examId, table.studentId, table.subjectId),
]);

// 30. Student Certificates (Class 10 & 12 School Leaving Certificate - SLC, Character & Transfer Certificates)
export const studentCertificates = pgTable('student_certificates', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  certificateType: text('certificate_type').notNull(), // SLC, CHARACTER, TRANSFER, TESTIMONIAL
  certificateNo: text('certificate_no').notNull().unique(), // e.g. "SLC-2083-0001", "CC-2083-0001"
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  streamId: text('stream_id').references(() => streams.id, { onDelete: 'set null' }),
  passedAcademicYearBs: integer('passed_academic_year_bs').notNull(), // e.g. 2083
  symbolNumber: text('symbol_number'), // SEE / NEB Board Symbol Number
  registrationNumber: text('registration_number'), // Board Registration Number
  gpa: text('gpa'), // Final GPA achieved (e.g. "3.65")
  divisionOrGrade: text('division_or_grade'), // e.g. "A+"
  characterRemarks: text('character_remarks').notNull().default('उत्तम (Excellent)'), // उत्तम, धेरै असल, असल
  issueDateBs: text('issue_date_bs').notNull(), // e.g. "2083-04-15"
  isDuplicate: boolean('is_duplicate').notNull().default(false),
  duplicateCount: integer('duplicate_count').notNull().default(0),
  printCount: integer('print_count').notNull().default(0),
  firstPrintedAt: timestamp('first_printed_at', { withTimezone: true }),
  lastPrintedAt: timestamp('last_printed_at', { withTimezone: true }),
  reasonForLeaving: text('reason_for_leaving').notNull().default('माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण'),
  conductNotes: text('conduct_notes'),
  remarks: text('remarks'),
  issuedById: text('issued_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 31. House Activities & Competitions (सदन तथा अतिरिक्त क्रियाकलाप / ECA)
export const houseActivities = pgTable('house_activities', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  titleNp: text('title_np'),
  category: text('category').notNull().default('SPORTS'), // SPORTS, LITERARY, CULTURAL, ACADEMIC, DISCIPLINE, OTHER
  eventDateBs: text('event_date_bs').notNull(),
  description: text('description'),
  firstHouseId: text('first_house_id').references(() => houses.id, { onDelete: 'set null' }),
  firstPoints: integer('first_points').notNull().default(100),
  secondHouseId: text('second_house_id').references(() => houses.id, { onDelete: 'set null' }),
  secondPoints: integer('second_points').notNull().default(60),
  thirdHouseId: text('third_house_id').references(() => houses.id, { onDelete: 'set null' }),
  thirdPoints: integer('third_points').notNull().default(40),
  participatingHouses: text('participating_houses'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 32. Examination Applications & Admit Cards (परीक्षा आवेदन फाराम तथा प्रवेशपत्र)
export const examApplications = pgTable('exam_applications', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  sectionId: text('section_id').references(() => sections.id, { onDelete: 'set null' }),
  rollNumber: integer('roll_number'),
  symbolNumber: text('symbol_number'), // e.g. "2083-1001"
  applicationStatus: text('application_status').notNull().default('APPROVED'), // PENDING, APPROVED, REJECTED
  approvedById: text('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  admitCardPrintCount: integer('admit_card_print_count').notNull().default(0),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('exam_applications_exam_student_uq').on(table.examId, table.studentId),
]);

