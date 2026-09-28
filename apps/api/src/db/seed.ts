import { getDb, schema } from './index.js';
import { SYSTEM_PERMISSIONS, UserRoleType } from '@sms/shared';
import bcrypt from 'bcryptjs';
import { sql, eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function runMigrationsAndSeed() {
  const db = await getDb();
  console.log('[Seed] Running migrations & schema setup...');

  // 1. Create tables if they do not exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      logo_url TEXT,
      motto_en TEXT,
      motto_np TEXT,
      iemis_code TEXT,
      established_bs_year INTEGER,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      website TEXT,
      address_en TEXT NOT NULL,
      address_np TEXT NOT NULL,
      province TEXT NOT NULL,
      district TEXT NOT NULL,
      local_level TEXT NOT NULL,
      ward_number INTEGER NOT NULL,
      shifts JSONB NOT NULL,
      min_class TEXT NOT NULL DEFAULT 'ECD',
      max_class TEXT NOT NULL DEFAULT '12',
      active_academic_year_bs INTEGER NOT NULL DEFAULT 2083,
      fiscal_year_bs TEXT NOT NULL DEFAULT '2082/083',
      is_offline_capable BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration for existing database
  await db.execute(sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      year_bs INTEGER NOT NULL,
      start_date_ad TEXT NOT NULL,
      end_date_ad TEXT NOT NULL,
      start_date_bs TEXT NOT NULL,
      end_date_bs TEXT NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT false,
      is_closed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      display_name_en TEXT NOT NULL,
      display_name_np TEXT NOT NULL,
      description TEXT,
      is_system_role BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_np TEXT NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      full_name_en TEXT NOT NULL,
      full_name_np TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      is_superadmin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_values JSONB,
      new_values JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      synced_at TIMESTAMP WITH TIME ZONE
    )
  `);

  // Stage 2 Tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      display_order INTEGER NOT NULL,
      stage TEXT NOT NULL DEFAULT 'PRIMARY',
      has_streams BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      code TEXT NOT NULL,
      shift TEXT NOT NULL DEFAULT 'DAY',
      capacity INTEGER NOT NULL DEFAULT 45,
      class_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      room_number TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS houses (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      is_optional BOOLEAN NOT NULL DEFAULT false,
      optional_group TEXT,
      credit_hours INTEGER NOT NULL DEFAULT 4,
      theory_full_marks INTEGER NOT NULL DEFAULT 75,
      practical_full_marks INTEGER NOT NULL DEFAULT 25,
      theory_pass_marks INTEGER NOT NULL DEFAULT 27,
      practical_pass_marks INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      iemis_code TEXT,
      first_name_en TEXT NOT NULL,
      middle_name_en TEXT,
      last_name_en TEXT NOT NULL,
      first_name_np TEXT NOT NULL,
      middle_name_np TEXT,
      last_name_np TEXT NOT NULL,
      dob_bs TEXT NOT NULL,
      dob_ad TEXT NOT NULL,
      gender TEXT NOT NULL,
      blood_group TEXT,
      mother_tongue TEXT DEFAULT 'Nepali',
      nationality TEXT NOT NULL DEFAULT 'Nepali',
      ethnicity_inclusion TEXT NOT NULL DEFAULT 'BRAHMIN_CHHETRI',
      disability_status TEXT NOT NULL DEFAULT 'NONE',
      scholarship_eligible BOOLEAN NOT NULL DEFAULT false,
      photo_url TEXT,
      house_id TEXT REFERENCES houses(id) ON DELETE SET NULL,
      perm_province TEXT NOT NULL,
      perm_district TEXT NOT NULL,
      perm_local_level TEXT NOT NULL,
      perm_ward_number INTEGER NOT NULL,
      perm_tole TEXT,
      curr_province TEXT NOT NULL,
      curr_district TEXT NOT NULL,
      curr_local_level TEXT NOT NULL,
      curr_ward_number INTEGER NOT NULL,
      curr_tole TEXT,
      admission_year_bs INTEGER NOT NULL DEFAULT 2083,
      admission_date_bs TEXT NOT NULL,
      admission_date_ad TEXT NOT NULL,
      current_class_id TEXT NOT NULL REFERENCES classes(id),
      current_section_id TEXT REFERENCES sections(id),
      current_roll_number INTEGER,
      optional_subject1_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      optional_subject2_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_health_records (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      blood_group TEXT NOT NULL DEFAULT 'UNKNOWN',
      allergies TEXT,
      chronic_conditions TEXT,
      regular_medications TEXT,
      physical_accommodations TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      preferred_hospital TEXT,
      immunization_status TEXT NOT NULL DEFAULT 'COMPLETE',
      medical_notes TEXT,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guardians (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      relationship TEXT NOT NULL,
      full_name_en TEXT NOT NULL,
      full_name_np TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      occupation TEXT,
      is_primary_contact BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_enrollments (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      roll_number INTEGER,
      optional_subject1_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      optional_subject2_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'ENROLLED',
      promotion_date TIMESTAMP WITH TIME ZONE,
      promotion_remarks TEXT,
      principal_override BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_admissions (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      application_number TEXT NOT NULL UNIQUE,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      target_class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      target_stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
      applicant_name_en TEXT NOT NULL,
      applicant_name_np TEXT NOT NULL,
      dob_bs TEXT NOT NULL,
      gender TEXT NOT NULL,
      guardian_name TEXT NOT NULL,
      guardian_phone TEXT NOT NULL,
      quota_category TEXT NOT NULL DEFAULT 'GENERAL',
      entrance_score INTEGER,
      merit_rank INTEGER,
      application_status TEXT NOT NULL DEFAULT 'SUBMITTED',
      reviewer_remarks TEXT,
      created_student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrations for existing databases
  await db.execute(sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES sections(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS optional_group TEXT;`);
  await db.execute(sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS optional_subject1_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS optional_subject2_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS optional_subject1_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS optional_subject2_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;`);

  // Stage 3 Tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_code TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'TEACHING',
      full_name_en TEXT NOT NULL,
      full_name_np TEXT NOT NULL,
      dob_bs TEXT NOT NULL,
      dob_ad TEXT,
      gender TEXT NOT NULL DEFAULT 'MALE',
      blood_group TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      citizenship_no TEXT,
      national_id_no TEXT,
      pan_number TEXT,
      appointment_type TEXT NOT NULL DEFAULT 'PERMANENT',
      designation TEXT NOT NULL DEFAULT 'TEACHER',
      teaching_license_no TEXT,
      qualification TEXT NOT NULL DEFAULT 'BACHELOR',
      major_subject TEXT,
      training TEXT,
      bank_name TEXT,
      bank_account_no TEXT,
      permanent_address TEXT,
      current_address TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      attendance_date_bs TEXT NOT NULL,
      attendance_date_ad TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PRESENT',
      remarks TEXT,
      recorded_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      attendance_date_bs TEXT NOT NULL,
      attendance_date_ad TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PRESENT',
      in_time TEXT,
      out_time TEXT,
      remarks TEXT,
      recorded_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS staff_leaves (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      leave_type TEXT NOT NULL,
      start_date_bs TEXT NOT NULL,
      end_date_bs TEXT NOT NULL,
      total_days INTEGER NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      approved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      review_remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS school_calendar_events (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      title_en TEXT NOT NULL,
      title_np TEXT NOT NULL,
      description TEXT,
      event_type TEXT NOT NULL,
      start_date_bs TEXT NOT NULL,
      end_date_bs TEXT NOT NULL,
      start_date_ad TEXT,
      end_date_ad TEXT,
      is_teaching_day BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS timetables (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
      day_of_week TEXT NOT NULL,
      period_number INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room_number TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS substitute_assignments (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      date_bs TEXT NOT NULL,
      timetable_id TEXT REFERENCES timetables(id) ON DELETE SET NULL,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      original_teacher_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      substitute_teacher_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      period_number INTEGER NOT NULL,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'ASSIGNED',
      remarks TEXT,
      assigned_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      start_date_bs TEXT NOT NULL,
      end_date_bs TEXT NOT NULL,
      is_result_published BOOLEAN NOT NULL DEFAULT false,
      is_marks_locked BOOLEAN NOT NULL DEFAULT false,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS exam_marks (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      theory_marks REAL,
      practical_marks REAL,
      is_absent BOOLEAN NOT NULL DEFAULT false,
      remarks TEXT,
      recorded_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration for CAS Sub-components
  await db.execute(sql`ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS cas_participation REAL;`);
  await db.execute(sql`ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS cas_project_practical REAL;`);
  await db.execute(sql`ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS cas_discipline REAL;`);
  await db.execute(sql`ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS cas_terminal_exam REAL;`);
  await db.execute(sql`ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS entry_status TEXT NOT NULL DEFAULT 'DRAFT';`);
  await db.execute(sql`ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'DRAFT';`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS grading_policy_code TEXT NOT NULL DEFAULT 'CDC_LG_2078_A4_2081';`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS submitted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS verified_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS published_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;`);
  await db.execute(sql`ALTER TABLE exams ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;`);

  // Table for Class 1-3 Integrated Curriculum CAS Ratings (Levels 1-4)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS class_1_to_3_cas_ratings (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      theme_name TEXT,
      level_rating INTEGER NOT NULL,
      achievement_remarks TEXT,
      recorded_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS exam_marks_exam_student_subject_uq ON exam_marks(exam_id, student_id, subject_id);`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS class_1_to_3_cas_exam_student_subject_uq ON class_1_to_3_cas_ratings(exam_id, student_id, subject_id);`);
  await db.execute(sql`ALTER TABLE class_1_to_3_cas_ratings ADD COLUMN IF NOT EXISTS entry_status TEXT NOT NULL DEFAULT 'DRAFT';`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_certificates (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      certificate_type TEXT NOT NULL,
      certificate_no TEXT NOT NULL UNIQUE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
      passed_academic_year_bs INTEGER NOT NULL,
      symbol_number TEXT,
      registration_number TEXT,
      gpa TEXT,
      division_or_grade TEXT,
      character_remarks TEXT NOT NULL DEFAULT 'उत्तम (Excellent)',
      issue_date_bs TEXT NOT NULL,
      is_duplicate BOOLEAN NOT NULL DEFAULT false,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      reason_for_leaving TEXT NOT NULL DEFAULT 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण',
      conduct_notes TEXT,
      remarks TEXT,
      issued_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`ALTER TABLE student_certificates ADD COLUMN IF NOT EXISTS print_count INTEGER NOT NULL DEFAULT 0;`);
  await db.execute(sql`ALTER TABLE student_certificates ADD COLUMN IF NOT EXISTS first_printed_at TIMESTAMP WITH TIME ZONE;`);
  await db.execute(sql`ALTER TABLE student_certificates ADD COLUMN IF NOT EXISTS last_printed_at TIMESTAMP WITH TIME ZONE;`);
  await db.execute(sql`UPDATE student_certificates SET is_duplicate = false, duplicate_count = 0 WHERE certificate_no = 'CC-2083-0001' AND is_duplicate = true;`);

  await db.execute(sql`ALTER TABLE houses ADD COLUMN IF NOT EXISTS master_teacher_name TEXT;`);
  await db.execute(sql`ALTER TABLE houses ADD COLUMN IF NOT EXISTS captain_student_name TEXT;`);
  await db.execute(sql`ALTER TABLE houses ADD COLUMN IF NOT EXISTS vice_captain_student_name TEXT;`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS house_activities (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      title_np TEXT,
      category TEXT NOT NULL DEFAULT 'SPORTS',
      event_date_bs TEXT NOT NULL,
      description TEXT,
      first_house_id TEXT REFERENCES houses(id) ON DELETE SET NULL,
      first_points INTEGER NOT NULL DEFAULT 100,
      second_house_id TEXT REFERENCES houses(id) ON DELETE SET NULL,
      second_points INTEGER NOT NULL DEFAULT 60,
      third_house_id TEXT REFERENCES houses(id) ON DELETE SET NULL,
      third_points INTEGER NOT NULL DEFAULT 40,
      participating_houses TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS teacher_id TEXT REFERENCES staff(id) ON DELETE SET NULL;`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS exam_applications (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      roll_number INTEGER,
      symbol_number TEXT,
      application_status TEXT NOT NULL DEFAULT 'APPROVED',
      approved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP WITH TIME ZONE,
      admit_card_print_count INTEGER NOT NULL DEFAULT 0,
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS exam_applications_exam_student_uq ON exam_applications(exam_id, student_id);`);

  console.log('[Seed] Inserting/Syncing system permissions...');
  for (const p of SYSTEM_PERMISSIONS) {
    const existing = await db.query.permissions.findFirst({
      where: (table: any, { eq }: any) => eq(table.code, p.code)
    });
    if (!existing) {
      await db.insert(schema.permissions).values({
        id: crypto.randomUUID(),
        code: p.code,
        module: p.module,
        descriptionEn: p.descriptionEn,
        descriptionNp: p.descriptionNp,
      });
    }
  }

  // 2. Default School
  const schoolCode = 'SHREE-SHANTI-01';
  let school = await db.query.schools.findFirst({
    where: (table: any, { eq }: any) => eq(table.code, schoolCode)
  });

  if (!school) {
    console.log('[Seed] Creating baseline school: Shree Shanti Secondary School...');
    const schoolId = crypto.randomUUID();
    await db.insert(schema.schools).values({
      id: schoolId,
      code: schoolCode,
      nameEn: 'Shree Shanti Secondary School',
      nameNp: 'श्री शान्ति माध्यमिक विद्यालय',
      mottoEn: 'Education for Truth and Enlightenment',
      mottoNp: 'सत्य र ज्ञानका लागि शिक्षा',
      iemisCode: '270010001',
      establishedBsYear: 2028,
      phone: '01-4351234',
      email: 'info@shreeshantischool.edu.np',
      website: 'https://shreeshantischool.edu.np',
      addressEn: 'Tokha-04, Kathmandu, Nepal',
      addressNp: 'टोखा-०४, काठमाडौं, नेपाल',
      province: 'Bagmati Province',
      district: 'Kathmandu',
      localLevel: 'Tokha Municipality',
      wardNumber: 4,
      shifts: ['MORNING', 'DAY'],
      minClass: 'ECD',
      maxClass: '12',
      activeAcademicYearBs: 2083,
      fiscalYearBs: '2082/083',
      isOfflineCapable: true,
    });
    school = await db.query.schools.findFirst({
      where: (table: any, { eq }: any) => eq(table.code, schoolCode)
    });
  }

  const schoolId = school.id;

  // 3. Academic Year 2083 BS
  const existingYear = await db.query.academicYears.findFirst({
    where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.yearBs, 2083))
  });
  if (!existingYear) {
    console.log('[Seed] Creating Academic Year 2083 BS...');
    await db.insert(schema.academicYears).values({
      id: crypto.randomUUID(),
      schoolId,
      yearBs: 2083,
      startDateBs: '2083-01-01',
      endDateBs: '2083-12-30',
      startDateAd: '2026-04-14',
      endDateAd: '2027-04-13',
      isCurrent: true,
      isClosed: false,
    });
  }

  // 4. Default Roles
  const allPermissions = await db.query.permissions.findMany();
  const permMap = new Map(allPermissions.map((p: any) => [p.code, p.id]));

  const defaultRoleConfigs = [
    {
      name: UserRoleType.PRINCIPAL,
      displayNameEn: 'Principal',
      displayNameNp: 'प्रधानाध्यापक',
      description: 'Full institutional authority, academic leadership, and financial oversight',
      permissions: allPermissions.map((p: any) => p.code),
    },
    {
      name: UserRoleType.ADMINISTRATIVE_STAFF,
      displayNameEn: 'Administrative Staff',
      displayNameNp: 'प्रशासनिक कर्मचारी',
      description: 'Day-to-day admissions, student profiles, and general operations',
      permissions: [
        'SCHOOL_SETTINGS_VIEW', 'USERS_VIEW', 'ACADEMIC_STRUCTURE_VIEW', 'STUDENTS_VIEW',
        'STUDENTS_ADMIT', 'STUDENTS_EDIT', 'ATTENDANCE_VIEW', 'TIMETABLE_VIEW',
        'DOCUMENTS_ISSUE',
      ],
    },
    {
      name: UserRoleType.ACCOUNTANT,
      displayNameEn: 'Accountant',
      displayNameNp: 'लेखापाल',
      description: 'Fee collection, double-entry vouchers, and financial accounting',
      permissions: [
        'FEES_STRUCTURE_MANAGE', 'FEES_COLLECT', 'ACCOUNTS_VIEW', 'ACCOUNTS_POST_VOUCHER',
        'STUDENTS_VIEW',
      ],
    },
    {
      name: UserRoleType.TEACHER,
      displayNameEn: 'Teacher',
      displayNameNp: 'शिक्षक',
      description: 'Class attendance, marks entry, and LMS subject content',
      permissions: [
        'ATTENDANCE_RECORD', 'ATTENDANCE_VIEW', 'LMS_CONTENT_MANAGE', 'EXAMS_ENTER_MARKS',
        'TIMETABLE_VIEW', 'STUDENTS_VIEW',
      ],
    },
    {
      name: UserRoleType.LIBRARIAN,
      displayNameEn: 'Librarian',
      displayNameNp: 'पुस्तकालय प्रमुख',
      description: 'Physical book cataloging, accession numbers, and circulation',
      permissions: ['LIBRARY_VIEW', 'LIBRARY_CIRCULATION', 'STUDENTS_VIEW'],
    },
    {
      name: UserRoleType.SYSTEM_ADMIN,
      displayNameEn: 'System Administrator',
      displayNameNp: 'सिस्टम प्रशासक',
      description: 'Technical configuration, user management, and audit inspection',
      permissions: [
        'SCHOOL_SETTINGS_VIEW', 'SCHOOL_SETTINGS_MANAGE', 'USERS_VIEW', 'USERS_MANAGE',
        'ROLES_MANAGE', 'AUDIT_LOGS_VIEW',
      ],
    },
    {
      name: UserRoleType.STUDENT,
      displayNameEn: 'Student',
      displayNameNp: 'विद्यार्थी',
      description: 'Student portal: view personal routine, attendance, exams and report card',
      permissions: ['STUDENTS_VIEW', 'TIMETABLE_VIEW', 'CALENDAR_VIEW', 'ATTENDANCE_VIEW'],
    },
    {
      name: UserRoleType.PARENT,
      displayNameEn: 'Parent / Guardian',
      displayNameNp: 'अभिभावक',
      description: 'Parent portal: view ward profile, attendance, progress card and notices',
      permissions: ['STUDENTS_VIEW', 'TIMETABLE_VIEW', 'CALENDAR_VIEW', 'ATTENDANCE_VIEW'],
    },
  ];

  console.log('[Seed] Setting up default roles and permissions...');
  for (const r of defaultRoleConfigs) {
    let role = await db.query.roles.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.name, r.name))
    });

    if (!role) {
      const roleId = crypto.randomUUID();
      await db.insert(schema.roles).values({
        id: roleId,
        schoolId,
        name: r.name,
        displayNameEn: r.displayNameEn,
        displayNameNp: r.displayNameNp,
        description: r.description,
        isSystemRole: true,
      });

      // Attach permissions
      for (const pCode of r.permissions) {
        const pId = permMap.get(pCode);
        if (pId) {
          await db.insert(schema.rolePermissions).values({
            roleId,
            permissionId: pId,
          });
        }
      }
    }
  }

  // 5. Seed Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const initialUsers = [
    {
      username: 'principal',
      fullNameEn: 'Dr. Ram Bahadur Shrestha',
      fullNameNp: 'डा. रामबहादुर श्रेष्ठ',
      email: 'principal@shreeshantischool.edu.np',
      phone: '9851000001',
      role: UserRoleType.PRINCIPAL,
      isSuperAdmin: true,
    },
    {
      username: 'admin',
      fullNameEn: 'Sita Sharma',
      fullNameNp: 'सीता शर्मा',
      email: 'admin@shreeshantischool.edu.np',
      phone: '9851000002',
      role: UserRoleType.SYSTEM_ADMIN,
      isSuperAdmin: false,
    },
    {
      username: 'accountant',
      fullNameEn: 'Hari Prasad Acharya',
      fullNameNp: 'हरिप्रसाद आचार्य',
      email: 'accountant@shreeshantischool.edu.np',
      phone: '9851000003',
      role: UserRoleType.ACCOUNTANT,
      isSuperAdmin: false,
    },
    {
      username: 'accountant2',
      fullNameEn: 'Sunita Thapa (Asst. Accountant)',
      fullNameNp: 'सुनिता थापा (सहायक लेखापाल)',
      email: 'sunita.thapa@shreeshantischool.edu.np',
      phone: '9851000008',
      role: UserRoleType.ACCOUNTANT,
      isSuperAdmin: false,
    },
    {
      username: 'teacher',
      fullNameEn: 'Binod Kumar Adhikari',
      fullNameNp: 'बिनोद कुमार अधिकारी',
      email: 'binod.adhikari@shreeshantischool.edu.np',
      phone: '9851000004',
      role: UserRoleType.TEACHER,
      isSuperAdmin: false,
    },
    {
      username: 'librarian',
      fullNameEn: 'Santosh Kumar Shrestha',
      fullNameNp: 'सन्तोष कुमार श्रेष्ठ',
      email: 'librarian@shreeshantischool.edu.np',
      phone: '9851000005',
      role: UserRoleType.LIBRARIAN,
      isSuperAdmin: false,
    },
    {
      username: 'student',
      fullNameEn: 'Aarav Sharma',
      fullNameNp: 'आरभ शर्मा',
      email: 'aarav.sharma@shreeshantischool.edu.np',
      phone: '9851000006',
      role: UserRoleType.STUDENT,
      isSuperAdmin: false,
    },
    {
      username: 'parent',
      fullNameEn: 'Bikram Sharma (Guardian)',
      fullNameNp: 'बिक्रम शर्मा (अभिभावक)',
      email: 'bikram.sharma@shreeshantischool.edu.np',
      phone: '9851000007',
      role: UserRoleType.PARENT,
      isSuperAdmin: false,
    },
  ];

  console.log('[Seed] Setting up initial staff users...');
  for (const u of initialUsers) {
    let user = await db.query.users.findFirst({
      where: (table: any, { eq }: any) => eq(table.username, u.username)
    });

    if (!user) {
      const userId = crypto.randomUUID();
      await db.insert(schema.users).values({
        id: userId,
        schoolId,
        username: u.username,
        passwordHash,
        email: u.email,
        phone: u.phone,
        fullNameEn: u.fullNameEn,
        fullNameNp: u.fullNameNp,
        status: 'ACTIVE',
        isSuperAdmin: u.isSuperAdmin,
      });

      const role = await db.query.roles.findFirst({
        where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.name, u.role))
      });

      if (role) {
        await db.insert(schema.userRoles).values({
          userId,
          roleId: role.id,
        });
      }
      console.log(`[Seed] Created user: ${u.username} (${u.role})`);
    }
  }

  console.log('[Seed] Setting up Stage 2: Academic Structure & Classes...');
  const existingClasses = await db.query.classes.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const defaultClasses = [
    { code: 'ECD', nameEn: 'Early Childhood Development (ECD)', nameNp: 'प्रारम्भिक बाल विकास (ECD)', order: 0, stage: 'PRE_PRIMARY', hasStreams: false },
    { code: '1', nameEn: 'Grade 1', nameNp: 'कक्षा १', order: 1, stage: 'PRIMARY', hasStreams: false },
    { code: '2', nameEn: 'Grade 2', nameNp: 'कक्षा २', order: 2, stage: 'PRIMARY', hasStreams: false },
    { code: '3', nameEn: 'Grade 3', nameNp: 'कक्षा ३', order: 3, stage: 'PRIMARY', hasStreams: false },
    { code: '4', nameEn: 'Grade 4', nameNp: 'कक्षा ४', order: 4, stage: 'PRIMARY', hasStreams: false },
    { code: '5', nameEn: 'Grade 5', nameNp: 'कक्षा ५', order: 5, stage: 'PRIMARY', hasStreams: false },
    { code: '6', nameEn: 'Grade 6', nameNp: 'कक्षा ६', order: 6, stage: 'LOWER_SECONDARY', hasStreams: false },
    { code: '7', nameEn: 'Grade 7', nameNp: 'कक्षा ७', order: 7, stage: 'LOWER_SECONDARY', hasStreams: false },
    { code: '8', nameEn: 'Grade 8', nameNp: 'कक्षा ८', order: 8, stage: 'LOWER_SECONDARY', hasStreams: false },
    { code: '9', nameEn: 'Grade 9', nameNp: 'कक्षा ९', order: 9, stage: 'SECONDARY', hasStreams: false },
    { code: '10', nameEn: 'Grade 10', nameNp: 'कक्षा १०', order: 10, stage: 'SECONDARY', hasStreams: false },
    { code: '11', nameEn: 'Grade 11', nameNp: 'कक्षा ११', order: 11, stage: 'HIGHER_SECONDARY', hasStreams: true },
    { code: '12', nameEn: 'Grade 12', nameNp: 'कक्षा १२', order: 12, stage: 'HIGHER_SECONDARY', hasStreams: true },
  ];

  const classMap = new Map<string, string>();
  for (const c of defaultClasses) {
    let cls = existingClasses.find((item: any) => item.code === c.code);
    if (!cls) {
      const clsId = crypto.randomUUID();
      await db.insert(schema.classes).values({
        id: clsId,
        schoolId,
        code: c.code,
        nameEn: c.nameEn,
        nameNp: c.nameNp,
        displayOrder: c.order,
        stage: c.stage,
        hasStreams: c.hasStreams,
      });
      classMap.set(c.code, clsId);
    } else {
      classMap.set(c.code, cls.id);
    }
  }

  // Streams for Higher Secondary
  const existingStreams = await db.query.streams.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });
  const defaultStreams = [
    { code: 'SCIENCE', nameEn: 'Science', nameNp: 'विज्ञान', desc: 'Physics, Chemistry, Biology, Mathematics' },
    { code: 'MANAGEMENT', nameEn: 'Management', nameNp: 'व्यवस्थापन', desc: 'Accountancy, Economics, Business Studies' },
    { code: 'EDUCATION', nameEn: 'Education', nameNp: 'शिक्षा', desc: 'Pedagogy, Curriculum, Teaching Methodology' },
    { code: 'HUMANITIES', nameEn: 'Humanities & Law', nameNp: 'मानविकी तथा कानुन', desc: 'Political Science, Sociology, Jurisprudence, Mass Communication' },
    { code: 'COMPUTER_ENGINEERING', nameEn: 'Technical - Computer Engineering', nameNp: 'प्राविधिक - कम्प्युटर इन्जिनियरिङ', desc: 'Programming, Hardware, Networking' },
  ];
  const streamMap = new Map<string, string>();
  for (const s of defaultStreams) {
    let str = existingStreams.find((item: any) => item.code === s.code);
    if (!str) {
      const strId = crypto.randomUUID();
      await db.insert(schema.streams).values({
        id: strId,
        schoolId,
        code: s.code,
        nameEn: s.nameEn,
        nameNp: s.nameNp,
        description: s.desc,
      });
      streamMap.set(s.code, strId);
    } else {
      streamMap.set(s.code, str.id);
    }
  }

  // Houses
  const existingHouses = await db.query.houses.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });
  const defaultHouses = [
    { nameEn: 'Red House (Sagarmatha)', nameNp: 'रातो सदन (सगरमाथा)', colorHex: '#ef4444', masterTeacherName: 'Bharat KC (भरत केसी)', captainStudentName: 'Aayush Karki', viceCaptainStudentName: 'Pooja Thapa' },
    { nameEn: 'Blue House (Machhapuchhre)', nameNp: 'नीलो सदन (माछापुच्छ्रे)', colorHex: '#3b82f6', masterTeacherName: 'Sunita Sharma (सुनिता शर्मा)', captainStudentName: 'Bikash Shrestha', viceCaptainStudentName: 'Kriti Adhikari' },
    { nameEn: 'Green House (Annapurna)', nameNp: 'हरियो सदन (अन्नपूर्ण)', colorHex: '#10b981', masterTeacherName: 'Deepak Joshi (दीपक जोशी)', captainStudentName: 'Chiranjivi Sharma', viceCaptainStudentName: 'Manita Rai' },
    { nameEn: 'Yellow House (Dhaulagiri)', nameNp: 'पहेँलो सदन (धौलागिरि)', colorHex: '#f59e0b', masterTeacherName: 'Rita Gautam (रीता गौतम)', captainStudentName: 'Dinesh Gurung', viceCaptainStudentName: 'Sima Tamang' },
  ];
  const houseList: any[] = [];
  for (const h of defaultHouses) {
    let house = existingHouses.find((item: any) => item.nameEn === h.nameEn);
    if (!house) {
      const houseId = crypto.randomUUID();
      await db.insert(schema.houses).values({
        id: houseId,
        schoolId,
        nameEn: h.nameEn,
        nameNp: h.nameNp,
        colorHex: h.colorHex,
        masterTeacherName: h.masterTeacherName,
        captainStudentName: h.captainStudentName,
        viceCaptainStudentName: h.viceCaptainStudentName,
      });
      houseList.push({ id: houseId, ...h });
    } else {
      if (!house.masterTeacherName) {
        await db.update(schema.houses).set({
          masterTeacherName: h.masterTeacherName,
          captainStudentName: h.captainStudentName,
          viceCaptainStudentName: h.viceCaptainStudentName,
        }).where(eq(schema.houses.id, house.id));
        house = { ...house, masterTeacherName: h.masterTeacherName, captainStudentName: h.captainStudentName, viceCaptainStudentName: h.viceCaptainStudentName };
      }
      houseList.push(house);
    }
  }

  // Sections
  const existingSections = await db.query.sections.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });
  const sectionMap = new Map<string, string>();
  for (const c of defaultClasses) {
    const classId = classMap.get(c.code)!;
    const hasMultiple = ['6', '7', '8', '9', '10', '11', '12'].includes(c.code);
    const secCodes = ['9', '10'].includes(c.code) ? ['A', 'B', 'C'] : (hasMultiple ? ['A', 'B'] : ['A']);

    for (const sc of secCodes) {
      const secKey = `${c.code}-${sc}`;
      let sec = existingSections.find((item: any) => item.classId === classId && item.code === sc);
      if (!sec) {
        const secId = crypto.randomUUID();
        await db.insert(schema.sections).values({
          id: secId,
          schoolId,
          classId,
          code: sc,
          nameEn: `Section ${sc}`,
          nameNp: `खण्ड ${sc === 'A' ? 'क' : sc === 'B' ? 'ख' : 'ग'}`,
          shift: 'DAY',
          capacity: 45,
          roomNumber: `Room-${c.code}${sc}`,
        });
        sectionMap.set(secKey, secId);
      } else {
        sectionMap.set(secKey, sec.id);
      }
    }
  }

  // Ensure Class 11 & 12 sections have streamId linked (Science & Management)
  const class11Id = classMap.get('11');
  const class12Id = classMap.get('12');
  const scienceStreamId = streamMap.get('SCIENCE');
  const managementStreamId = streamMap.get('MANAGEMENT');

  if (class11Id && scienceStreamId && managementStreamId) {
    const sec11A = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.classId, class11Id), eq(table.code, 'A'), eq(table.schoolId, schoolId)),
    });
    if (sec11A && !sec11A.streamId) {
      await db.update(schema.sections).set({
        streamId: scienceStreamId,
        nameEn: 'Science Section A',
        nameNp: 'विज्ञान खण्ड क',
      }).where(eq(schema.sections.id, sec11A.id));
    }

    const sec11B = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.classId, class11Id), eq(table.code, 'B'), eq(table.schoolId, schoolId)),
    });
    if (sec11B && !sec11B.streamId) {
      await db.update(schema.sections).set({
        streamId: scienceStreamId,
        nameEn: 'Science Section B',
        nameNp: 'विज्ञान खण्ड ख',
      }).where(eq(schema.sections.id, sec11B.id));
    }

    const sec11Mgt = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.classId, class11Id), eq(table.streamId, managementStreamId), eq(table.schoolId, schoolId)),
    });
    if (!sec11Mgt) {
      await db.insert(schema.sections).values({
        id: crypto.randomUUID(),
        schoolId,
        classId: class11Id,
        streamId: managementStreamId,
        code: 'A',
        nameEn: 'Management Section A',
        nameNp: 'व्यवस्थापन खण्ड क',
        shift: 'DAY',
        capacity: 45,
        roomNumber: 'Room-11MgtA',
      });
    }
  }

  if (class12Id && scienceStreamId && managementStreamId) {
    const sec12A = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.classId, class12Id), eq(table.code, 'A'), eq(table.schoolId, schoolId)),
    });
    if (sec12A && !sec12A.streamId) {
      await db.update(schema.sections).set({
        streamId: scienceStreamId,
        nameEn: 'Science Section A',
        nameNp: 'विज्ञान खण्ड क',
      }).where(eq(schema.sections.id, sec12A.id));
    }

    const sec12Mgt = await db.query.sections.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.classId, class12Id), eq(table.streamId, managementStreamId), eq(table.schoolId, schoolId)),
    });
    if (!sec12Mgt) {
      await db.insert(schema.sections).values({
        id: crypto.randomUUID(),
        schoolId,
        classId: class12Id,
        streamId: managementStreamId,
        code: 'A',
        nameEn: 'Management Section A',
        nameNp: 'व्यवस्थापन खण्ड क',
        shift: 'DAY',
        capacity: 45,
        roomNumber: 'Room-12MgtA',
      });
    }
  }

  // CDC Standard Subjects (Complete ECD to Class 12 Curriculum)
  console.log('[Seed] Syncing CDC Core Subjects & Electives...');
  const ecdId = classMap.get('ECD');
  const c1Id = classMap.get('1');
  const c2Id = classMap.get('2');
  const c3Id = classMap.get('3');
  const c4Id = classMap.get('4');
  const c5Id = classMap.get('5');
  const c6Id = classMap.get('6');
  const c7Id = classMap.get('7');
  const c8Id = classMap.get('8');
  const c9Id = classMap.get('9')!;
  const c10Id = classMap.get('10')!;
  const class9Id = c9Id;
  const class10Id = c10Id;
  const c11Id = classMap.get('11');
  const c12Id = classMap.get('12');

  const sec9CId = sectionMap.get('9-C') || null;
  const sec10CId = sectionMap.get('10-C') || null;

  const sciStreamId = streamMap.get('SCIENCE') || null;
  const mgtStreamId = streamMap.get('MANAGEMENT') || null;
  const eduStreamId = streamMap.get('EDUCATION') || null;
  const humStreamId = streamMap.get('HUMANITIES') || null;
  const techStreamId = streamMap.get('COMPUTER_ENGINEERING') || null;

  const curriculumSubjects: any[] = [];

  // ECD
  if (ecdId) {
    curriculumSubjects.push(
      { classId: ecdId, streamId: null, sectionId: null, optionalGroup: null, code: 'ECD.001', nameEn: 'Physical & Motor Skills Development', nameNp: 'शारीरिक तथा गतिशीलता सीप विकास', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 },
      { classId: ecdId, streamId: null, sectionId: null, optionalGroup: null, code: 'ECD.002', nameEn: 'Social & Emotional Development', nameNp: 'सामाजिक, सांस्कृतिक र संवेगात्मक विकास', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 },
      { classId: ecdId, streamId: null, sectionId: null, optionalGroup: null, code: 'ECD.003', nameEn: 'Language & Communication Skills', nameNp: 'सञ्चार तथा भाषिक सीप विकास', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 },
      { classId: ecdId, streamId: null, sectionId: null, optionalGroup: null, code: 'ECD.004', nameEn: 'Cognitive Skills Development', nameNp: 'संज्ञानात्मक सीप विकास', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 },
      { classId: ecdId, streamId: null, sectionId: null, optionalGroup: null, code: 'ECD.005', nameEn: 'Creative & Expressive Arts', nameNp: 'रचनात्मक तथा सिर्जनात्मक कला', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 }
    );
  }

  // Classes 1, 2, 3 (Integrated 100% CAS)
  for (const [grade, cid] of [['1', c1Id], ['2', c2Id], ['3', c3Id]] as const) {
    if (cid) {
      curriculumSubjects.push(
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `NEP.${grade}01`, nameEn: 'Hamro Nepali', nameNp: 'हाम्रो नेपाली', isOpt: false, cr: 5, thF: 0, prF: 100, thP: 0, prP: 40 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `ENG.${grade}01`, nameEn: 'My English', nameNp: 'अंग्रेजी', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `MTH.${grade}01`, nameEn: 'Mathematics', nameNp: 'गणित', isOpt: false, cr: 4, thF: 0, prF: 100, thP: 0, prP: 40 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SER.${grade}01`, nameEn: 'Our Surroundings (Hamro Serophero)', nameNp: 'हाम्रो सेरोफेरो', isOpt: false, cr: 8, thF: 0, prF: 100, thP: 0, prP: 40 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `LOC.${grade}01`, nameEn: 'Local Curriculum / Mother Tongue', nameNp: 'स्थानीय विषय / मातृभाषा', isOpt: false, cr: 5, thF: 0, prF: 100, thP: 0, prP: 40 }
      );
    }
  }

  // Classes 4, 5
  for (const [grade, cid] of [['4', c4Id], ['5', c5Id]] as const) {
    if (cid) {
      curriculumSubjects.push(
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `NEP.${grade}01`, nameEn: 'Nepali', nameNp: 'नेपाली', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `ENG.${grade}01`, nameEn: 'English', nameNp: 'अंग्रेजी', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `MTH.${grade}01`, nameEn: 'Mathematics', nameNp: 'गणित', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SCI.${grade}01`, nameEn: 'Science & Technology', nameNp: 'विज्ञान तथा प्रविधि', isOpt: false, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SOC.${grade}01`, nameEn: 'Social Studies & Human Values', nameNp: 'सामाजिक अध्ययन तथा मानव मूल्य शिक्षा', isOpt: false, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `HPE.${grade}01`, nameEn: 'Health, Physical & Creative Arts', nameNp: 'स्वास्थ्य, शारीरिक तथा सिर्जनात्मक कला', isOpt: false, cr: 3, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `LOC.${grade}01`, nameEn: 'Local Curriculum / Mother Tongue', nameNp: 'स्थानीय विषय / मातृभाषा', isOpt: false, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 }
      );
    }
  }

  // Classes 6, 7
  for (const [grade, cid] of [['6', c6Id], ['7', c7Id]] as const) {
    if (cid) {
      curriculumSubjects.push(
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `NEP.${grade}01`, nameEn: 'Nepali', nameNp: 'नेपाली', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `ENG.${grade}01`, nameEn: 'English', nameNp: 'अंग्रेजी', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `MTH.${grade}01`, nameEn: 'Mathematics', nameNp: 'गणित', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SCI.${grade}01`, nameEn: 'Science & Technology', nameNp: 'विज्ञान तथा प्रविधि', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SOC.${grade}01`, nameEn: 'Social Studies & Human Values', nameNp: 'सामाजिक अध्ययन तथा मानव मूल्य शिक्षा', isOpt: false, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `HPE.${grade}01`, nameEn: 'Health & Physical Education', nameNp: 'स्वास्थ्य तथा शारीरिक शिक्षा', isOpt: false, cr: 3, thF: 50, prF: 50, thP: 18, prP: 20 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `LOC.${grade}01`, nameEn: 'Local Subject / Career & Vocational', nameNp: 'स्थानीय विषय / पेशा, व्यवसाय र प्रविधि शिक्षा', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 }
      );
    }
  }

  // Class 8 (BLE Standard)
  if (c8Id) {
    curriculumSubjects.push(
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'NEP.801', nameEn: 'Nepali', nameNp: 'नेपाली', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'ENG.801', nameEn: 'English', nameNp: 'अंग्रेजी', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'MTH.801', nameEn: 'Mathematics', nameNp: 'गणित', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'SCI.801', nameEn: 'Science & Technology', nameNp: 'विज्ञान तथा प्रविधि', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'SOC.801', nameEn: 'Social Studies & Human Values', nameNp: 'सामाजिक अध्ययन तथा मानव मूल्य शिक्षा', isOpt: false, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'HPE.801', nameEn: 'Health & Physical Education', nameNp: 'स्वास्थ्य तथा शारीरिक शिक्षा', isOpt: false, cr: 3, thF: 50, prF: 50, thP: 18, prP: 20 },
      { classId: c8Id, streamId: null, sectionId: null, optionalGroup: null, code: 'LOC.801', nameEn: 'Local Subject / Moral & Vocational', nameNp: 'स्थानीय विषय / नैतिक तथा व्यावसायिक शिक्षा', isOpt: false, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 }
    );
  }

  // Classes 9 & 10
  for (const grade of ['9', '10'] as const) {
    const cid = grade === '9' ? c9Id : c10Id;
    const secC = grade === '9' ? sec9CId : sec10CId;
    const codeSuffix = grade === '9' ? '901' : '101';

    // Compulsory
    curriculumSubjects.push(
      { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `NEP.${codeSuffix}`, nameEn: 'Compulsory Nepali', nameNp: 'अनिवार्य नेपाली', isOpt: false, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `ENG.${codeSuffix}`, nameEn: 'Compulsory English', nameNp: 'अनिवार्य अंग्रेजी', isOpt: false, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `MTH.${codeSuffix}`, nameEn: 'Compulsory Mathematics', nameNp: 'अनिवार्य गणित', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SCI.${codeSuffix}`, nameEn: 'Science & Technology', nameNp: 'विज्ञान तथा प्रविधि', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SOC.${codeSuffix}`, nameEn: 'Social Studies & Values', nameNp: 'सामाजिक अध्ययन तथा मानव मूल्य', isOpt: false, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 }
    );

    // Optional I
    curriculumSubjects.push(
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_1', code: `OPT.MTH.${codeSuffix}`, nameEn: 'Optional I: Mathematics', nameNp: 'ऐच्छिक प्रथम: गणित', isOpt: true, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_1', code: `OPT.ECO.${codeSuffix}`, nameEn: 'Optional I: Economics', nameNp: 'ऐच्छिक प्रथम: अर्थशास्त्र', isOpt: true, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_1', code: `OPT.GEO.${codeSuffix}`, nameEn: 'Optional I: Geography', nameNp: 'ऐच्छिक प्रथम: भूगोल', isOpt: true, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_1', code: `OPT.SAN.${codeSuffix}`, nameEn: 'Optional I: Sanskrit', nameNp: 'ऐच्छिक प्रथम: संस्कृत', isOpt: true, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 }
    );

    // Optional II
    curriculumSubjects.push(
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_2', code: `OPT.COM.${codeSuffix}`, nameEn: 'Optional II: Computer Science', nameNp: 'ऐच्छिक द्वितीय: कम्प्युटर विज्ञान', isOpt: true, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_2', code: `OPT.ACC.${codeSuffix}`, nameEn: 'Optional II: Accountancy', nameNp: 'ऐच्छिक द्वितीय: लेखा प्रणाली', isOpt: true, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_2', code: `OPT.AGR.${codeSuffix}`, nameEn: 'Optional II: Agriculture', nameNp: 'ऐच्छिक द्वितीय: कृषि तथा पशुपालन', isOpt: true, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_2', code: `OPT.EDU.${codeSuffix}`, nameEn: 'Optional II: Education', nameNp: 'ऐच्छिक द्वितीय: शिक्षा', isOpt: true, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
      { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_2', code: `OPT.HPE.${codeSuffix}`, nameEn: 'Optional II: Health & Physical', nameNp: 'ऐच्छिक द्वितीय: स्वास्थ्य तथा शारीरिक शिक्षा', isOpt: true, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 }
    );

    // Technical Stream
    curriculumSubjects.push(
      { classId: cid, streamId: null, sectionId: secC, optionalGroup: 'TECHNICAL', code: `TECH.${grade === '9' ? '901' : '1001'}`, nameEn: grade === '9' ? 'Computer Programming (C-Prog)' : 'Database Management Systems', nameNp: grade === '9' ? 'कम्प्युटर प्रोग्रामिङ' : 'डेटाबेस व्यवस्थापन प्रणाली', isOpt: true, cr: 4, thF: 50, prF: 50, thP: 18, prP: 20 },
      { classId: cid, streamId: null, sectionId: secC, optionalGroup: 'TECHNICAL', code: `TECH.${grade === '9' ? '902' : '1002'}`, nameEn: grade === '9' ? 'Engineering Drawing' : 'Object-Oriented Programming', nameNp: grade === '9' ? 'इन्जिनियरिङ ड्रइङ' : 'अब्जेक्ट ओरिएन्टेड प्रोग्रामिङ', isOpt: true, cr: 4, thF: grade === '9' ? 25 : 50, prF: grade === '9' ? 75 : 50, thP: grade === '9' ? 9 : 18, prP: grade === '9' ? 30 : 20 }
    );
  }

  // Classes 11 & 12
  for (const grade of ['11', '12'] as const) {
    const cid = grade === '11' ? c11Id : c12Id;
    if (cid) {
      const codeSuffix = grade === '11' ? '001' : '002';
      const numSuffix = grade === '11' ? '101' : '102';

      // Compulsory
      curriculumSubjects.push(
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `NEP.${codeSuffix}`, nameEn: 'Compulsory Nepali', nameNp: 'अनिवार्य नेपाली', isOpt: false, cr: 3, thF: 75, prF: 25, thP: 27, prP: 10 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `ENG.${codeSuffix}`, nameEn: 'Compulsory English', nameNp: 'अनिवार्य अंग्रेजी', isOpt: false, cr: 4, thF: 75, prF: 25, thP: 27, prP: 10 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: null, code: `SOC.${codeSuffix}`, nameEn: 'Social Studies & Life Skills', nameNp: 'सामाजिक अध्ययन तथा जीवनोपयोगी शिक्षा', isOpt: false, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
        { classId: cid, streamId: null, sectionId: null, optionalGroup: 'OPT_1', code: `MTH.${codeSuffix}`, nameEn: 'Mathematics (Compulsory/Elective)', nameNp: 'अनिवार्य/ऐच्छिक गणित', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 }
      );

      // Science Stream Electives
      if (sciStreamId) {
        curriculumSubjects.push(
          { classId: cid, streamId: sciStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `PHY.${numSuffix}`, nameEn: 'Physics', nameNp: 'भौतिकशास्त्र', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: sciStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `CHM.${numSuffix}`, nameEn: 'Chemistry', nameNp: 'रसायनशास्त्र', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: sciStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `BIO.${numSuffix}`, nameEn: 'Biology', nameNp: 'जीवविज्ञान', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: sciStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `COM.${numSuffix}`, nameEn: 'Computer Science', nameNp: 'कम्प्युटर विज्ञान', isOpt: true, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 }
        );
      }

      // Management Stream Electives
      if (mgtStreamId) {
        curriculumSubjects.push(
          { classId: cid, streamId: mgtStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `ACC.${numSuffix}`, nameEn: 'Principles of Accounting', nameNp: 'लेखाविधि', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: mgtStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `ECO.${numSuffix}`, nameEn: 'Economics', nameNp: 'अर्थशास्त्र', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: mgtStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `BST.${numSuffix}`, nameEn: 'Business Studies', nameNp: 'व्यावसायिक अध्ययन', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: mgtStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `BMT.${numSuffix}`, nameEn: 'Business Mathematics', nameNp: 'व्यावसायिक गणित', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: mgtStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `HTM.${numSuffix}`, nameEn: 'Hotel Management', nameNp: 'होटल व्यवस्थापन', isOpt: true, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
          { classId: cid, streamId: mgtStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `MKT.${numSuffix}`, nameEn: 'Marketing', nameNp: 'बजारीकरण', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 }
        );
      }

      // Education Stream Electives
      if (eduStreamId) {
        curriculumSubjects.push(
          { classId: cid, streamId: eduStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `PED.${numSuffix}`, nameEn: 'Foundations of Education', nameNp: 'शिक्षाशास्त्रको परिचय', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: eduStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `CUR.${numSuffix}`, nameEn: 'Curriculum & Evaluation', nameNp: 'पाठ्यक्रम तथा मूल्याङ्कन', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: eduStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `TMD.${numSuffix}`, nameEn: 'Teaching Methodologies', nameNp: 'शिक्षण विधि', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 }
        );
      }

      // Humanities & Law Stream Electives
      if (humStreamId) {
        curriculumSubjects.push(
          { classId: cid, streamId: humStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `POL.${numSuffix}`, nameEn: 'Political Science', nameNp: 'राजनीतिशास्त्र', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: humStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `SOC.${numSuffix === '101' ? '102' : '103'}`, nameEn: 'Sociology', nameNp: 'समाजशास्त्र', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: humStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `JUR.${numSuffix}`, nameEn: 'Jurisprudence & Legal Drafting', nameNp: 'कानुनको परिचय', isOpt: true, cr: 5, thF: 75, prF: 25, thP: 27, prP: 10 },
          { classId: cid, streamId: humStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `MCJ.${numSuffix}`, nameEn: 'Mass Communication & Journalism', nameNp: 'आमसञ्चार तथा पत्रकारिता', isOpt: true, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 }
        );
      }

      // Technical Stream
      if (techStreamId) {
        curriculumSubjects.push(
          { classId: cid, streamId: techStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `CE.${numSuffix}`, nameEn: 'Computer Architecture & Hardware', nameNp: 'कम्प्युटर आर्किटेक्चर तथा हार्डवेयर', isOpt: true, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 },
          { classId: cid, streamId: techStreamId, sectionId: null, optionalGroup: 'STREAM_ELECTIVE', code: `CE.${numSuffix === '101' ? '103' : '104'}`, nameEn: 'Web Technology & Software Dev', nameNp: 'वेब टेक्नोलोजी तथा सफ्टवेयर डेभलपमेन्ट', isOpt: true, cr: 5, thF: 50, prF: 50, thP: 18, prP: 20 }
        );
      }
    }
  }

  for (const sub of curriculumSubjects) {
    const existing = await db.query.subjects.findFirst({
      where: (table: any, { eq, and }: any) =>
        and(eq(table.schoolId, schoolId), eq(table.classId, sub.classId), eq(table.code, sub.code)),
    });
    if (!existing) {
      await db.insert(schema.subjects).values({
        id: crypto.randomUUID(),
        schoolId,
        classId: sub.classId,
        streamId: sub.streamId || null,
        sectionId: sub.sectionId,
        code: sub.code,
        nameEn: sub.nameEn,
        nameNp: sub.nameNp,
        isOptional: sub.isOpt,
        optionalGroup: sub.optionalGroup,
        creditHours: sub.cr,
        theoryFullMarks: sub.thF,
        practicalFullMarks: sub.prF,
        theoryPassMarks: sub.thP,
        practicalPassMarks: sub.prP,
      });
    } else {
      await db.update(schema.subjects)
        .set({
          streamId: sub.streamId !== undefined ? sub.streamId : existing.streamId,
          sectionId: sub.sectionId,
          optionalGroup: sub.optionalGroup,
          isOptional: sub.isOpt,
        })
        .where(eq(schema.subjects.id, existing.id));
    }
  }

  // Seed 15 Realistic Students with Health & Guardian Records (only if explicitly requested)
  const existingStudents = await db.query.students.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  if (existingStudents.length === 0 && process.env.SEED_SAMPLE_STUDENTS === 'true') {
    console.log('[Seed] Seeding 15 realistic student profiles with Health & Guardian records...');
    const academicYear2083 = await db.query.academicYears.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.yearBs, 2083)),
    });

    const sampleStudents = [
      {
        studentId: '2083-0001',
        iemisCode: '270010001-001',
        fEn: 'Aayush', lEn: 'Sharma', fNp: 'आयुष', lNp: 'शर्मा',
        dobBs: '2070-02-15', dobAd: '2013-05-28', gender: 'MALE', bloodGroup: 'B+',
        cCode: '10', sec: 'A', roll: 1, inc: 'BRAHMIN_CHHETRI',
        fNameEn: 'Ram Chandra Sharma', fNameNp: 'रामचन्द्र शर्मा', fPhone: '9841123456', fOcc: 'Government Service',
        allergies: 'None', chronic: 'None', hospital: 'Grande Hospital',
      },
      {
        studentId: '2083-0002',
        iemisCode: '270010001-002',
        fEn: 'Bipana', lEn: 'Shrestha', fNp: 'बिपना', lNp: 'श्रेष्ठ',
        dobBs: '2070-04-10', dobAd: '2013-07-26', gender: 'FEMALE', bloodGroup: 'A+',
        cCode: '10', sec: 'A', roll: 2, inc: 'JANAJATI',
        fNameEn: 'Bikram Shrestha', fNameNp: 'बिक्रम श्रेष्ठ', fPhone: '9841123457', fOcc: 'Business',
        allergies: 'Peanut allergy', chronic: 'Mild Asthma (inhaler)', hospital: 'Tokha Health Post',
      },
      {
        studentId: '2083-0003',
        iemisCode: '270010001-003',
        fEn: 'Rohan', lEn: 'Tamang', fNp: 'रोहन', lNp: 'तामाङ',
        dobBs: '2070-08-22', dobAd: '2013-12-07', gender: 'MALE', bloodGroup: 'O+',
        cCode: '10', sec: 'B', roll: 1, inc: 'JANAJATI',
        fNameEn: 'Som Bahadur Tamang', fNameNp: 'सोमबहादुर तामाङ', fPhone: '9841123458', fOcc: 'Agriculture',
        allergies: 'None', chronic: 'None', hospital: 'Tribhuvan Teaching Hospital',
      },
      {
        studentId: '2083-0004',
        iemisCode: '270010001-004',
        fEn: 'Suman', lEn: 'Chaudhary', fNp: 'सुमन', lNp: 'चौधरी',
        dobBs: '2071-01-14', dobAd: '2014-04-27', gender: 'MALE', bloodGroup: 'AB+',
        cCode: '9', sec: 'A', roll: 1, inc: 'THARU',
        fNameEn: 'Gopal Chaudhary', fNameNp: 'गोपाल चौधरी', fPhone: '9841123459', fOcc: 'Private Company',
        allergies: 'Penicillin allergy', chronic: 'None', hospital: 'Tokha Primary Health Post',
      },
      {
        studentId: '2083-0005',
        iemisCode: '270010001-005',
        fEn: 'Pooja', lEn: 'Pariyar', fNp: 'पूजा', lNp: 'परियार',
        dobBs: '2071-06-19', dobAd: '2014-10-05', gender: 'FEMALE', bloodGroup: 'O-',
        cCode: '9', sec: 'A', roll: 2, inc: 'DALIT',
        fNameEn: 'Karna Bahadur Pariyar', fNameNp: 'कर्णबहादुर परियार', fPhone: '9841123460', fOcc: 'Tailoring',
        allergies: 'None', chronic: 'None', hospital: 'Bir Hospital',
      },
      {
        studentId: '2083-0006',
        iemisCode: '270010001-006',
        fEn: 'Ankit', lEn: 'Thapa', fNp: 'अंकित', lNp: 'थापा',
        dobBs: '2072-03-12', dobAd: '2015-06-26', gender: 'MALE', bloodGroup: 'A-',
        cCode: '8', sec: 'A', roll: 1, inc: 'BRAHMIN_CHHETRI',
        fNameEn: 'Dhan Bahadur Thapa', fNameNp: 'धनबहादुर थापा', fPhone: '9841123461', fOcc: 'Ex-Army',
        allergies: 'None', chronic: 'None', hospital: 'Chhauni Military Hospital',
      },
      {
        studentId: '2083-0007',
        iemisCode: '270010001-007',
        fEn: 'Dikshya', lEn: 'Rai', fNp: 'दीक्षा', lNp: 'राई',
        dobBs: '2072-11-05', dobAd: '2016-02-17', gender: 'FEMALE', bloodGroup: 'B-',
        cCode: '8', sec: 'B', roll: 1, inc: 'JANAJATI',
        fNameEn: 'Man Kumar Rai', fNameNp: 'मानकुमार राई', fPhone: '9841123462', fOcc: 'Foreign Employment',
        allergies: 'Dust sensitivity', chronic: 'None', hospital: 'Teaching Hospital',
      },
      {
        studentId: '2083-0008',
        iemisCode: '270010001-008',
        fEn: 'Nabina', lEn: 'Dahal', fNp: 'नविना', lNp: 'दाहाल',
        dobBs: '2073-05-18', dobAd: '2016-09-03', gender: 'FEMALE', bloodGroup: 'O+',
        cCode: '7', sec: 'A', roll: 1, inc: 'BRAHMIN_CHHETRI',
        fNameEn: 'Bishnu Dahal', fNameNp: 'विष्णु दाहाल', fPhone: '9841123463', fOcc: 'Teaching',
        allergies: 'None', chronic: 'None', hospital: 'Tokha Health Post',
      },
      {
        studentId: '2083-0009',
        iemisCode: '270010001-009',
        fEn: 'Roshan', lEn: 'Magar', fNp: 'रोशन', lNp: 'मगर',
        dobBs: '2073-09-24', dobAd: '2017-01-08', gender: 'MALE', bloodGroup: 'B+',
        cCode: '7', sec: 'B', roll: 1, inc: 'JANAJATI',
        fNameEn: 'Tek Bahadur Magar', fNameNp: 'टेकबहादुर मगर', fPhone: '9841123464', fOcc: 'Transportation',
        allergies: 'None', chronic: 'None', hospital: 'Grande Hospital',
      },
      {
        studentId: '2083-0010',
        iemisCode: '270010001-010',
        fEn: 'Sunita', lEn: 'Mandal', fNp: 'सुनिता', lNp: 'मण्डल',
        dobBs: '2074-02-11', dobAd: '2017-05-25', gender: 'FEMALE', bloodGroup: 'A+',
        cCode: '6', sec: 'A', roll: 1, inc: 'MADHESI',
        fNameEn: 'Rajesh Mandal', fNameNp: 'राजेश मण्डल', fPhone: '9841123465', fOcc: 'Retail Shop',
        allergies: 'None', chronic: 'None', hospital: 'Kanti Children Hospital',
      },
      {
        studentId: '2083-0011',
        iemisCode: '270010001-011',
        fEn: 'Kishor', lEn: 'Bhandari', fNp: 'किशोर', lNp: 'भण्डारी',
        dobBs: '2075-04-09', dobAd: '2018-07-24', gender: 'MALE', bloodGroup: 'AB-',
        cCode: '5', sec: 'A', roll: 1, inc: 'BRAHMIN_CHHETRI',
        fNameEn: 'Hari Bhandari', fNameNp: 'हरि भण्डारी', fPhone: '9841123466', fOcc: 'Banking',
        allergies: 'None', chronic: 'None', hospital: 'Grande Hospital',
      },
      {
        studentId: '2083-0012',
        iemisCode: '270010001-012',
        fEn: 'Kripa', lEn: 'Gurung', fNp: 'कृपा', lNp: 'गुरुङ',
        dobBs: '2076-07-16', dobAd: '2019-11-02', gender: 'FEMALE', bloodGroup: 'O+',
        cCode: '4', sec: 'A', roll: 1, inc: 'JANAJATI',
        fNameEn: 'Suraj Gurung', fNameNp: 'सुरज गुरुङ', fPhone: '9841123467', fOcc: 'Hospitality',
        allergies: 'None', chronic: 'None', hospital: 'Teaching Hospital',
      },
      {
        studentId: '2083-0013',
        iemisCode: '270010001-013',
        fEn: 'Aarav', lEn: 'Giri', fNp: 'आरभ', lNp: 'गिरी',
        dobBs: '2077-10-21', dobAd: '2021-02-03', gender: 'MALE', bloodGroup: 'B+',
        cCode: '3', sec: 'A', roll: 1, inc: 'BRAHMIN_CHHETRI',
        fNameEn: 'Mukesh Giri', fNameNp: 'मुकेश गिरी', fPhone: '9841123468', fOcc: 'Driver',
        allergies: 'None', chronic: 'None', hospital: 'Tokha Health Post',
      },
      {
        studentId: '2083-0014',
        iemisCode: '270010001-014',
        fEn: 'Niruta', lEn: 'Nepali', fNp: 'निरुता', lNp: 'नेपाली',
        dobBs: '2078-06-14', dobAd: '2021-09-30', gender: 'FEMALE', bloodGroup: 'A+',
        cCode: '2', sec: 'A', roll: 1, inc: 'DALIT',
        fNameEn: 'Santosh Nepali', fNameNp: 'सन्तोष नेपाली', fPhone: '9841123469', fOcc: 'Daily Wage Labor',
        allergies: 'None', chronic: 'None', hospital: 'Bir Hospital',
      },
      {
        studentId: '2083-0015',
        iemisCode: '270010001-015',
        fEn: 'Pranish', lEn: 'Khadka', fNp: 'प्रनिश', lNp: 'खड्का',
        dobBs: '2079-11-28', dobAd: '2023-03-12', gender: 'MALE', bloodGroup: 'O+',
        cCode: 'ECD', sec: 'A', roll: 1, inc: 'BRAHMIN_CHHETRI',
        fNameEn: 'Dipendra Khadka', fNameNp: 'दिपेन्द्र खड्का', fPhone: '9841123470', fOcc: 'Government Service',
        allergies: 'None', chronic: 'None', hospital: 'Kanti Children Hospital',
      },
    ];

    for (let i = 0; i < sampleStudents.length; i++) {
      const s = sampleStudents[i];
      const studentUuid = crypto.randomUUID();
      const targetClassId = classMap.get(s.cCode)!;
      const targetSecId = sectionMap.get(`${s.cCode}-${s.sec}`);
      const assignedHouse = houseList[i % houseList.length];

      await db.insert(schema.students).values({
        id: studentUuid,
        schoolId,
        studentId: s.studentId,
        iemisCode: s.iemisCode,
        firstNameEn: s.fEn,
        lastNameEn: s.lEn,
        firstNameNp: s.fNp,
        lastNameNp: s.lNp,
        dobBs: s.dobBs,
        dobAd: s.dobAd,
        gender: s.gender,
        bloodGroup: s.bloodGroup,
        motherTongue: 'Nepali',
        nationality: 'Nepali',
        ethnicityInclusion: s.inc,
        disabilityStatus: 'NONE',
        scholarshipEligible: s.inc === 'DALIT' || s.inc === 'THARU',
        houseId: assignedHouse?.id,
        permProvince: 'Bagmati Province',
        permDistrict: 'Kathmandu',
        permLocalLevel: 'Tokha Municipality',
        permWardNumber: 4,
        permTole: 'Baneshwor Tole',
        currProvince: 'Bagmati Province',
        currDistrict: 'Kathmandu',
        currLocalLevel: 'Tokha Municipality',
        currWardNumber: 4,
        currTole: 'Chandeshwori',
        admissionYearBs: 2083,
        admissionDateBs: '2083-01-05',
        admissionDateAd: '2026-04-18',
        currentClassId: targetClassId,
        currentSectionId: targetSecId,
        currentRollNumber: s.roll,
        status: 'ACTIVE',
      });

      // Insert Health Record
      await db.insert(schema.studentHealthRecords).values({
        id: crypto.randomUUID(),
        schoolId,
        studentId: studentUuid,
        bloodGroup: s.bloodGroup,
        allergies: s.allergies,
        chronicConditions: s.chronic,
        regularMedications: s.chronic.includes('inhaler') ? 'Salbutamol Inhaler' : 'None',
        physicalAccommodations: 'None',
        emergencyContactName: s.fNameEn,
        emergencyContactPhone: s.fPhone,
        preferredHospital: s.hospital,
        immunizationStatus: 'COMPLETE',
        medicalNotes: 'Full childhood immunization verified by local health card',
      });

      // Insert Guardian
      await db.insert(schema.guardians).values({
        id: crypto.randomUUID(),
        schoolId,
        studentId: studentUuid,
        relationship: 'FATHER',
        fullNameEn: s.fNameEn,
        fullNameNp: s.fNameNp,
        phone: s.fPhone,
        occupation: s.fOcc,
        isPrimaryContact: true,
      });

      // Insert Active Enrollment Record
      if (academicYear2083) {
        await db.insert(schema.studentEnrollments).values({
          id: crypto.randomUUID(),
          schoolId,
          studentId: studentUuid,
          academicYearId: academicYear2083.id,
          classId: targetClassId,
          sectionId: targetSecId,
          rollNumber: s.roll,
          status: 'ENROLLED',
        });
      }
    }
  }

  // 13. Sync Timetable Routine for Demonstration (if few exist)
  const existingTimetableList = await db.query.timetables.findMany({
    where: (t: any, { eq }: any) => eq(t.schoolId, schoolId),
    limit: 10,
  });

  if (existingTimetableList.length < 5) {
    console.log('[Seed] Seeding sample weekly timetable routines...');
    const mathSub = await db.query.subjects.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.code, 'MTH.101')),
    });
    const sciSub = await db.query.subjects.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.code, 'SCI.101')),
    });
    const engSub = await db.query.subjects.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.code, 'ENG.101')),
    });
    const nepSub = await db.query.subjects.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.code, 'NEP.101')),
    });
    const sec10A = sectionMap.get('10-A');
    const teachersList = await db.query.staff.findMany({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.category, 'TEACHING')),
      limit: 6,
    });

    if (sec10A && teachersList.length >= 4 && mathSub && sciSub && engSub && nepSub) {
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      for (const day of days) {
        // Period 1: Nepali (Sabnam Kumari Yadav or Teacher 1)
        await db.insert(schema.timetables).values({
          id: crypto.randomUUID(),
          schoolId,
          classId: class10Id,
          sectionId: sec10A,
          subjectId: nepSub.id,
          teacherId: teachersList[1].id,
          dayOfWeek: day,
          periodNumber: 1,
          startTime: '10:00',
          endTime: '10:45',
          roomNumber: 'Room-10A',
        });

        // Period 2: Compulsory Math (Suresh Kumar Yadav - Teacher 0)
        await db.insert(schema.timetables).values({
          id: crypto.randomUUID(),
          schoolId,
          classId: class10Id,
          sectionId: sec10A,
          subjectId: mathSub.id,
          teacherId: teachersList[0].id,
          dayOfWeek: day,
          periodNumber: 2,
          startTime: '10:45',
          endTime: '11:30',
          roomNumber: 'Room-10A',
        });

        // Period 3: Science (Teacher 2)
        await db.insert(schema.timetables).values({
          id: crypto.randomUUID(),
          schoolId,
          classId: class10Id,
          sectionId: sec10A,
          subjectId: sciSub.id,
          teacherId: teachersList[2].id,
          dayOfWeek: day,
          periodNumber: 3,
          startTime: '11:30',
          endTime: '12:15',
          roomNumber: 'Room-10A',
        });

        // Period 4: English (Teacher 3)
        await db.insert(schema.timetables).values({
          id: crypto.randomUUID(),
          schoolId,
          classId: class10Id,
          sectionId: sec10A,
          subjectId: engSub.id,
          teacherId: teachersList[3].id,
          dayOfWeek: day,
          periodNumber: 4,
          startTime: '12:15',
          endTime: '01:00',
          roomNumber: 'Room-10A',
        });
      }
    }
  }

  // 14. Seed Examination & Evaluation Data (Terminal 1 2083)
  console.log('[Seed] Syncing Examination & Certificates module...');
  const academicYear2083 = await db.query.academicYears.findFirst({
    where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.yearBs, 2083)),
  });

  if (academicYear2083) {
    let firstTermExam = await db.query.exams.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.examType, 'TERMINAL_1')),
    });

    if (!firstTermExam) {
      const examId = crypto.randomUUID();
      await db.insert(schema.exams).values({
        id: examId,
        schoolId,
        academicYearId: academicYear2083.id,
        nameEn: 'First Terminal Examination 2083',
        nameNp: 'प्रथम त्रैमासिक परीक्षा २०८३',
        examType: 'TERMINAL_1',
        startDateBs: '2083-03-20',
        endDateBs: '2083-03-29',
        isResultPublished: true,
        isMarksLocked: false,
        description: 'First quarterly evaluation for academic session 2083.',
      });
      firstTermExam = { id: examId };
    }

    // Seed marks for Class 10 students
    const class10Id = classMap.get('10');
    if (class10Id && firstTermExam) {
      const class10Students = await db.query.students.findMany({
        where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.currentClassId, class10Id)),
        limit: 5,
      });

      const class10Subjects = await db.query.subjects.findMany({
        where: (t: any, { and, eq }: any) => and(eq(t.schoolId, schoolId), eq(t.classId, class10Id), eq(t.isOptional, false)),
      });

      if (class10Students.length > 0 && class10Subjects.length > 0) {
        for (const st of class10Students) {
          for (const sub of class10Subjects) {
            const existingMark = await db.query.examMarks.findFirst({
              where: (t: any, { and, eq }: any) =>
                and(eq(t.schoolId, schoolId), eq(t.examId, firstTermExam!.id), eq(t.studentId, st.id), eq(t.subjectId, sub.id)),
            });

            if (!existingMark) {
              const thFull = sub.theoryFullMarks || 75;
              const prFull = sub.practicalFullMarks || 25;
              // Realistic sample marks (high or medium based on roll)
              const scoreRatio = st.currentRollNumber === 1 ? 0.88 : (st.currentRollNumber === 2 ? 0.76 : 0.65);
              const thMarks = Math.round(thFull * scoreRatio);
              const prMarks = Math.round(prFull * 0.92);

              await db.insert(schema.examMarks).values({
                id: crypto.randomUUID(),
                schoolId,
                examId: firstTermExam.id,
                studentId: st.id,
                subjectId: sub.id,
                theoryMarks: thMarks,
                practicalMarks: prMarks,
                isAbsent: false,
                remarks: 'Satisfactory performance',
              });
            }
          }
        }
      }

      // Seed 1 Sample Issued SLC and 1 Character Certificate
      const existingCert = await db.query.studentCertificates.findFirst({
        where: (t: any, { eq }: any) => eq(t.schoolId, schoolId),
      });

      if (!existingCert && class10Students.length > 0) {
        const topStudent = class10Students[0];
        console.log('[Seed] Seeding sample School Leaving & Character Certificate for Class 10...');
        
        await db.insert(schema.studentCertificates).values({
          id: crypto.randomUUID(),
          schoolId,
          studentId: topStudent.id,
          certificateType: 'SLC',
          certificateNo: 'SLC-2083-0001',
          classId: class10Id,
          passedAcademicYearBs: 2082,
          symbolNumber: '02819420A',
          registrationNumber: '78-01-27001-001',
          gpa: '3.80',
          divisionOrGrade: 'A+',
          characterRemarks: 'उत्तम (Excellent)',
          issueDateBs: '2083-04-15',
          reasonForLeaving: 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण',
          conductNotes: 'चारित्रिक आचरण अति उत्तम, अनुशासित तथा लगनशील रहेको।',
          remarks: 'Passed SEE with distinction.',
        });

        await db.insert(schema.studentCertificates).values({
          id: crypto.randomUUID(),
          schoolId,
          studentId: topStudent.id,
          certificateType: 'CHARACTER',
          certificateNo: 'CC-2083-0001',
          classId: class10Id,
          passedAcademicYearBs: 2082,
          symbolNumber: '02819420A',
          registrationNumber: '78-01-27001-001',
          gpa: '3.80',
          divisionOrGrade: 'A+',
          characterRemarks: 'उत्तम (Excellent)',
          issueDateBs: '2083-04-15',
          reasonForLeaving: 'माध्यमिक शिक्षा परीक्षा (SEE) उत्तीर्ण',
          conductNotes: 'विद्यालयमा अध्ययनरत रहँदा अनुशासन र अध्ययनशीलतामा उदाहरणीय रहेको।',
          remarks: 'Exemplary conduct and active participation in school co-curricular activities.',
        });
      }
    }
  }

  // 31. Seed Sample House Activities & Ensure student house assignments
  const existingActivities = await db.query.houseActivities.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const allSchoolHouses = await db.query.houses.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const redHouse = allSchoolHouses.find((h: any) => h.nameEn.includes('Red')) || allSchoolHouses[0];
  const blueHouse = allSchoolHouses.find((h: any) => h.nameEn.includes('Blue')) || allSchoolHouses[1];
  const greenHouse = allSchoolHouses.find((h: any) => h.nameEn.includes('Green')) || allSchoolHouses[2];
  const yellowHouse = allSchoolHouses.find((h: any) => h.nameEn.includes('Yellow')) || allSchoolHouses[3];

  if (existingActivities.length === 0 && redHouse && blueHouse && greenHouse && yellowHouse) {
    const defaultActivities = [
      {
        title: 'Inter-House Football Championship',
        titleNp: 'अन्तर-सदन फुटबल प्रतियोगिता',
        category: 'SPORTS',
        eventDateBs: '2081-05-15',
        description: 'वार्षिक खेलकुद सप्ताह अन्तर्गत सम्पन्न अन्तर-सदन सिनियर फुटबल फाइनल प्रतियोगिता।',
        firstHouseId: redHouse.id,
        firstPoints: 100,
        secondHouseId: blueHouse.id,
        secondPoints: 60,
        thirdHouseId: greenHouse.id,
        thirdPoints: 40,
        participatingHouses: 'All Houses (सबै सदनहरू)',
      },
      {
        title: 'Inter-House General Knowledge Quiz',
        titleNp: 'अन्तर-सदन सामान्य ज्ञान तथा हाजिरीजवाफ प्रतियोगिता',
        category: 'ACADEMIC',
        eventDateBs: '2081-06-10',
        description: 'विज्ञान, प्रविधि, इतिहास, समसामयिक विषय र साहित्यमा आधारित हाजिरीजवाफ।',
        firstHouseId: blueHouse.id,
        firstPoints: 100,
        secondHouseId: yellowHouse.id,
        secondPoints: 60,
        thirdHouseId: redHouse.id,
        thirdPoints: 40,
        participatingHouses: 'All Houses (सबै सदनहरू)',
      },
      {
        title: 'Traditional Folk Dance & Cultural Festival',
        titleNp: 'सांस्कृतिक लोक नृत्य तथा कला उत्सव',
        category: 'CULTURAL',
        eventDateBs: '2081-07-22',
        description: 'नेपालका विभिन्न मौलिक कला, भेषभूषा र संस्कृतिको संरक्षणमा आधारित नृत्य प्रस्तुति।',
        firstHouseId: greenHouse.id,
        firstPoints: 100,
        secondHouseId: redHouse.id,
        secondPoints: 60,
        thirdHouseId: yellowHouse.id,
        thirdPoints: 40,
        participatingHouses: 'All Houses (सबै सदनहरू)',
      },
      {
        title: 'Clean Campus & Green Eco-Drive',
        titleNp: 'विद्यालय सरसफाइ तथा वातावरण संरक्षण अभियान',
        category: 'DISCIPLINE',
        eventDateBs: '2081-08-05',
        description: 'विद्यालय परिसरको सरसफाइ, बगैँचा व्यवस्थापन र अनुशासन मूल्याङ्कन।',
        firstHouseId: yellowHouse.id,
        firstPoints: 100,
        secondHouseId: greenHouse.id,
        secondPoints: 60,
        thirdHouseId: blueHouse.id,
        thirdPoints: 40,
        participatingHouses: 'All Houses (सबै सदनहरू)',
      },
    ];

    for (const act of defaultActivities) {
      await db.insert(schema.houseActivities).values({
        id: crypto.randomUUID(),
        schoolId,
        ...act,
      });
    }
  }

  // Ensure all students in this school are assigned to a house
  const unassignedStudents = await db.query.students.findMany({
    where: (table: any, { and, eq, isNull }: any) =>
      and(eq(table.schoolId, schoolId), isNull(table.houseId)),
  });

  if (unassignedStudents.length > 0 && allSchoolHouses.length > 0) {
    for (let i = 0; i < unassignedStudents.length; i++) {
      const h = allSchoolHouses[i % allSchoolHouses.length];
      await db
        .update(schema.students)
        .set({ houseId: h.id })
        .where(eq(schema.students.id, unassignedStudents[i].id));
    }
  }

  console.log('[Seed] Seeding completed successfully!');
}

// Execute if run directly
if (process.argv[1]?.endsWith('seed.ts')) {
  runMigrationsAndSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
