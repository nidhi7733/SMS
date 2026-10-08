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

  // Fee Management Migrations
  await db.execute(sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS fee_qr_code_url TEXT;`);
  await db.execute(sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS fee_merchant_name TEXT;`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fee_heads (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      fee_type TEXT NOT NULL DEFAULT 'MONTHLY',
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fee_structures (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      stream_id TEXT REFERENCES streams(id) ON DELETE SET NULL,
      fee_head_id TEXT NOT NULL REFERENCES fee_heads(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_class_head_year_uq ON fee_structures(academic_year_id, class_id, fee_head_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_fee_discounts (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      fee_head_id TEXT REFERENCES fee_heads(id) ON DELETE CASCADE,
      discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE',
      discount_value REAL NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT 'MERIT',
      document_url TEXT,
      document_name TEXT,
      uploaded_at TIMESTAMP WITH TIME ZONE,
      approved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_fee_bills (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      bill_number TEXT NOT NULL UNIQUE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      month_bs INTEGER NOT NULL,
      year_bs INTEGER NOT NULL DEFAULT 2083,
      title_en TEXT NOT NULL,
      title_np TEXT NOT NULL,
      sub_total REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      previous_due REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      due_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      due_date_bs TEXT,
      generated_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS student_fee_bills_student_month_year_uq ON student_fee_bills(student_id, academic_year_id, month_bs);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_fee_bill_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL REFERENCES student_fee_bills(id) ON DELETE CASCADE,
      fee_head_id TEXT NOT NULL REFERENCES fee_heads(id) ON DELETE CASCADE,
      head_name_en TEXT NOT NULL,
      head_name_np TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fee_payments (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      receipt_number TEXT NOT NULL UNIQUE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      bill_id TEXT REFERENCES student_fee_bills(id) ON DELETE SET NULL,
      amount_paid REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'CASH',
      transaction_ref TEXT,
      qr_bank_provider TEXT,
      payment_date_bs TEXT NOT NULL,
      payment_date_ad TEXT NOT NULL,
      remarks TEXT,
      received_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      printed_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Accounting & Inventory Migrations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS account_groups (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      nature TEXT NOT NULL,
      parent_group_id TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      group_id TEXT NOT NULL REFERENCES account_groups(id) ON DELETE CASCADE,
      opening_balance_dr REAL NOT NULL DEFAULT 0,
      opening_balance_cr REAL NOT NULL DEFAULT 0,
      current_balance_dr REAL NOT NULL DEFAULT 0,
      current_balance_cr REAL NOT NULL DEFAULT 0,
      is_system_account BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS journal_vouchers (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      voucher_number TEXT NOT NULL UNIQUE,
      voucher_type TEXT NOT NULL DEFAULT 'JV',
      voucher_date_bs TEXT NOT NULL,
      voucher_date_ad TEXT NOT NULL,
      fiscal_year_bs TEXT NOT NULL DEFAULT '2082/083',
      narration TEXT NOT NULL,
      total_debit REAL NOT NULL DEFAULT 0,
      total_credit REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'POSTED',
      attachment_url TEXT,
      reference_module TEXT,
      reference_id TEXT,
      created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS journal_voucher_items (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL REFERENCES journal_vouchers(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
      particulars TEXT,
      debit_amount REAL NOT NULL DEFAULT 0,
      credit_amount REAL NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_categories (
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
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE,
      item_code TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'CONSUMABLE',
      unit TEXT NOT NULL DEFAULT 'PCS',
      reorder_level REAL NOT NULL DEFAULT 5,
      current_stock REAL NOT NULL DEFAULT 0,
      last_purchase_price REAL DEFAULT 0,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_purchases (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      grn_number TEXT NOT NULL UNIQUE,
      vendor_name TEXT NOT NULL,
      vendor_pan TEXT,
      bill_number TEXT NOT NULL,
      purchase_date_bs TEXT NOT NULL,
      purchase_date_ad TEXT NOT NULL,
      sub_total REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL DEFAULT 'CASH',
      credit_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      voucher_id TEXT REFERENCES journal_vouchers(id) ON DELETE SET NULL,
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'RECEIVED',
      received_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      remarks TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_issues (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      issue_number TEXT NOT NULL UNIQUE,
      issue_date_bs TEXT NOT NULL,
      issue_date_ad TEXT NOT NULL,
      issued_to_staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
      issued_to_name TEXT NOT NULL,
      department TEXT,
      purpose TEXT NOT NULL,
      voucher_id TEXT REFERENCES journal_vouchers(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      approved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_issue_items (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL REFERENCES inventory_issues(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      remarks TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fixed_assets (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      asset_tag TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_np TEXT NOT NULL,
      item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
      purchase_date_bs TEXT NOT NULL,
      purchase_date_ad TEXT NOT NULL,
      original_cost REAL NOT NULL,
      salvage_value REAL NOT NULL DEFAULT 0,
      useful_life_years REAL NOT NULL DEFAULT 5,
      depreciation_method TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
      depreciation_rate REAL NOT NULL DEFAULT 20,
      accumulated_depreciation REAL NOT NULL DEFAULT 0,
      current_book_value REAL NOT NULL,
      location TEXT NOT NULL,
      custodian_staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
      condition_status TEXT NOT NULL DEFAULT 'GOOD',
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Library Management Migrations
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS library_categories (
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
    CREATE TABLE IF NOT EXISTS library_books (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      isbn TEXT,
      title_en TEXT NOT NULL,
      title_np TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT,
      edition TEXT,
      publication_year TEXT,
      language TEXT NOT NULL DEFAULT 'NEPALI',
      category_id TEXT NOT NULL REFERENCES library_categories(id) ON DELETE CASCADE,
      rack_location TEXT NOT NULL DEFAULT 'Rack 1, Shelf A',
      price REAL NOT NULL DEFAULT 0,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      cover_image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS library_book_copies (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      accession_number TEXT NOT NULL UNIQUE,
      barcode TEXT,
      condition TEXT NOT NULL DEFAULT 'GOOD',
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      added_date_bs TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS library_members (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      member_type TEXT NOT NULL DEFAULT 'STUDENT',
      student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
      staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
      card_number TEXT NOT NULL UNIQUE,
      max_allowed_books INTEGER NOT NULL DEFAULT 2,
      max_issue_days INTEGER NOT NULL DEFAULT 14,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS library_circulations (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      circulation_number TEXT NOT NULL UNIQUE,
      copy_id TEXT NOT NULL REFERENCES library_book_copies(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
      issue_date_bs TEXT NOT NULL,
      issue_date_ad TEXT NOT NULL,
      due_date_bs TEXT NOT NULL,
      return_date_bs TEXT,
      return_date_ad TEXT,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      fine_amount REAL NOT NULL DEFAULT 0,
      fine_paid BOOLEAN NOT NULL DEFAULT false,
      remarks TEXT,
      issued_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      returned_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS library_fines (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      circulation_id TEXT NOT NULL REFERENCES library_circulations(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
      overdue_days INTEGER NOT NULL DEFAULT 0,
      rate_per_day REAL NOT NULL DEFAULT 2,
      fine_amount REAL NOT NULL DEFAULT 0,
      waived_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      receipt_number TEXT,
      payment_date_bs TEXT,
      collected_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // 32. Seed Default Fee Heads & Fee Structures
  const existingHeads = await db.query.feeHeads.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  let feeHeadTuitionId: string = '';
  let feeHeadExamId: string = '';
  let feeHeadLabId: string = '';

  if (existingHeads.length === 0) {
    console.log('[Seed] Seeding default Fee Heads...');
    const defaultHeads = [
      { code: 'TUITION', nameEn: 'Monthly Tuition Fee', nameNp: 'मासिक पढाइ शुल्क', feeType: 'MONTHLY', displayOrder: 1, description: 'Standard monthly instruction and academic fee' },
      { code: 'ADMISSION', nameEn: 'Annual Admission Fee', nameNp: 'वार्षिक भर्ना/नवीकरण शुल्क', feeType: 'ANNUAL', displayOrder: 2, description: 'Annual session registration and admission fee' },
      { code: 'EXAM', nameEn: 'Terminal Examination Fee', nameNp: 'त्रैमासिक परीक्षा शुल्क', feeType: 'TERM', displayOrder: 3, description: 'Examination papers, answer sheets, and result processing' },
      { code: 'COMPUTER', nameEn: 'Computer & Lab Fee', nameNp: 'कम्प्युटर तथा प्रयोगशाला शुल्क', feeType: 'MONTHLY', displayOrder: 4, description: 'Practical lab and digital classroom usage' },
      { code: 'BUS', nameEn: 'Transportation / Bus Fee', nameNp: 'यातायात तथा बस सेवा शुल्क', feeType: 'MONTHLY', displayOrder: 5, description: 'School bus pick-up and drop-off facility' },
      { code: 'ECA', nameEn: 'Sports & ECA Fee', nameNp: 'खेलकुद तथा अतिरिक्त क्रियाकलाप', feeType: 'ANNUAL', displayOrder: 6, description: 'Annual sports meet and inter-house events' },
      { code: 'MISC', nameEn: 'ID Card & Library Fee', nameNp: 'परिचयपत्र तथा पुस्तकालय शुल्क', feeType: 'ONE_TIME', displayOrder: 7, description: 'Student identity card and library registration' },
    ];

    for (const h of defaultHeads) {
      const headId = crypto.randomUUID();
      if (h.code === 'TUITION') feeHeadTuitionId = headId;
      if (h.code === 'EXAM') feeHeadExamId = headId;
      if (h.code === 'COMPUTER') feeHeadLabId = headId;
      await db.insert(schema.feeHeads).values({
        id: headId,
        schoolId,
        ...h,
      });
    }
  } else {
    feeHeadTuitionId = existingHeads.find((h: any) => h.code === 'TUITION')?.id || existingHeads[0].id;
    feeHeadExamId = existingHeads.find((h: any) => h.code === 'EXAM')?.id || existingHeads[0].id;
    feeHeadLabId = existingHeads.find((h: any) => h.code === 'COMPUTER')?.id || existingHeads[0].id;
  }

  // Set default QR code and merchant info on school if not set
  await db.update(schema.schools).set({
    feeMerchantName: 'श्री ज्ञानोदय नमूना माध्यमिक विद्यालय',
    feeQrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=fonepay://merchant?pan=9800000000&name=Shree+Gyanodaya+School',
  }).where(eq(schema.schools.id, schoolId));

  // Seed Fee Structures for classes if none exist
  const existingStructures = await db.query.feeStructures.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const currentYear = await db.query.academicYears.findFirst({
    where: (table: any, { and, eq }: any) => and(eq(table.schoolId, schoolId), eq(table.isCurrent, true)),
  });

  const allClasses = await db.query.classes.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  if (existingStructures.length === 0 && currentYear && allClasses.length > 0 && feeHeadTuitionId) {
    console.log('[Seed] Seeding sample Fee Structures for classes...');
    for (const cls of allClasses) {
      const classNum = parseInt(cls.code.replace(/\D/g, ''), 10) || 1;
      const tuitionAmt = classNum >= 9 ? 1600 : classNum >= 6 ? 1200 : 800;
      const examAmt = classNum >= 6 ? 500 : 350;

      await db.insert(schema.feeStructures).values({
        id: crypto.randomUUID(),
        schoolId,
        academicYearId: currentYear.id,
        classId: cls.id,
        feeHeadId: feeHeadTuitionId,
        amount: tuitionAmt,
      });

      if (feeHeadExamId) {
        await db.insert(schema.feeStructures).values({
          id: crypto.randomUUID(),
          schoolId,
          academicYearId: currentYear.id,
          classId: cls.id,
          feeHeadId: feeHeadExamId,
          amount: examAmt,
        });
      }

      if (feeHeadLabId && classNum >= 4) {
        await db.insert(schema.feeStructures).values({
          id: crypto.randomUUID(),
          schoolId,
          academicYearId: currentYear.id,
          classId: cls.id,
          feeHeadId: feeHeadLabId,
          amount: 250,
        });
      }
    }
  }

  // Seed a sample discount with supporting document for demonstration
  const sampleStudent = await db.query.students.findFirst({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const existingDiscounts = await db.query.studentFeeDiscounts.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  if (existingDiscounts.length === 0 && sampleStudent && currentYear) {
    console.log('[Seed] Seeding sample Student Fee Discount with document...');
    await db.insert(schema.studentFeeDiscounts).values({
      id: crypto.randomUUID(),
      schoolId,
      studentId: sampleStudent.id,
      academicYearId: currentYear.id,
      feeHeadId: feeHeadTuitionId || null,
      discountType: 'PERCENTAGE',
      discountValue: 50,
      reason: 'MERIT',
      documentUrl: 'data:text/plain;base64,U2FtcGxlIE1lcml0IFNjaG9sYXJzaGlwIFJlY29tbWVuZGF0aW9uIExldHRlcg==',
      documentName: 'merit_scholarship_recommendation_2083.pdf',
      uploadedAt: new Date(),
    });
  }

  // -------------------------------------------------------------
  // Seed Account Groups & Chart of Accounts (COA)
  // -------------------------------------------------------------
  const existingGroups = await db.query.accountGroups.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const groupMap: Record<string, string> = {};

  if (existingGroups.length === 0) {
    console.log('[Seed] Seeding default Account Groups...');
    const defaultGroups = [
      { code: '1000', nameEn: 'Current Assets', nameNp: 'चालु सम्पत्ति', nature: 'ASSET', displayOrder: 1 },
      { code: '1200', nameEn: 'Fixed Assets', nameNp: 'स्थिर सम्पत्ति', nature: 'ASSET', displayOrder: 2 },
      { code: '1300', nameEn: 'Inventory Assets', nameNp: 'जिन्सी मौज्दात सम्पत्ति', nature: 'ASSET', displayOrder: 3 },
      { code: '2000', nameEn: 'Current Liabilities', nameNp: 'चालु दायित्व', nature: 'LIABILITY', displayOrder: 4 },
      { code: '3000', nameEn: 'Equity & Funds', nameNp: 'पुँजी तथा कोष', nature: 'EQUITY', displayOrder: 5 },
      { code: '4000', nameEn: 'Direct Educational Revenue', nameNp: 'प्रत्यक्ष शैक्षिक आम्दानी', nature: 'REVENUE', displayOrder: 6 },
      { code: '4100', nameEn: 'Grants & Other Income', nameNp: 'अनुदान तथा अन्य आम्दानी', nature: 'REVENUE', displayOrder: 7 },
      { code: '5000', nameEn: 'Operational & Academic Expenses', nameNp: 'प्रशासनिक तथा शैक्षिक खर्च', nature: 'EXPENSE', displayOrder: 8 },
      { code: '5100', nameEn: 'Depreciation & Maintenance', nameNp: 'मर्मत तथा ह्रासकट्टी खर्च', nature: 'EXPENSE', displayOrder: 9 },
    ];

    for (const g of defaultGroups) {
      const gid = crypto.randomUUID();
      await db.insert(schema.accountGroups).values({
        id: gid,
        schoolId,
        code: g.code,
        nameEn: g.nameEn,
        nameNp: g.nameNp,
        nature: g.nature,
        displayOrder: g.displayOrder,
      });
      groupMap[g.code] = gid;
    }
  } else {
    for (const g of existingGroups) {
      groupMap[g.code] = g.id;
    }
  }

  const existingCoa = await db.query.chartOfAccounts.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const coaMap: Record<string, string> = {};

  if (existingCoa.length === 0 && groupMap['1000']) {
    console.log('[Seed] Seeding standard Chart of Accounts (COA)...');
    const defaultAccounts = [
      { code: '1001', nameEn: 'Cash in Hand (Counter)', nameNp: 'नगद मौज्दात (काउन्टर)', groupCode: '1000', isSystemAccount: true, openingDr: 25000, currentDr: 25000 },
      { code: '1002', nameEn: 'Rastriya Banijya Bank (A/C: 1040012345)', nameNp: 'राष्ट्रिय वाणिज्य बैंक (खाता: १०४००१२३४५)', groupCode: '1000', isSystemAccount: true, openingDr: 540000, currentDr: 540000 },
      { code: '1003', nameEn: 'Global IME Bank (A/C: 0250098765)', nameNp: 'ग्लोबल आइएमई बैंक (खाता: ०२५००९८७६५)', groupCode: '1000', isSystemAccount: false, openingDr: 180000, currentDr: 180000 },
      { code: '1010', nameEn: 'Student Fee Receivables', nameNp: 'विद्यार्थी बक्यौता शुल्क हिसाब', groupCode: '1000', isSystemAccount: true, openingDr: 45000, currentDr: 45000 },
      { code: '1201', nameEn: 'Furniture & Fixtures', nameNp: 'फर्निचर तथा फिक्चर्स', groupCode: '1200', isSystemAccount: false, openingDr: 350000, currentDr: 350000 },
      { code: '1202', nameEn: 'Computer & IT Equipment', nameNp: 'कम्प्युटर तथा आइटी उपकरण', groupCode: '1200', isSystemAccount: false, openingDr: 480000, currentDr: 480000 },
      { code: '1203', nameEn: 'Science Lab Equipment', nameNp: 'विज्ञान प्रयोगशाला उपकरण', groupCode: '1200', isSystemAccount: false, openingDr: 150000, currentDr: 150000 },
      { code: '1301', nameEn: 'Stationery Stock Account', nameNp: 'स्टेसनरी मौज्दात हिसाब', groupCode: '1300', isSystemAccount: true, openingDr: 45000, currentDr: 45000 },
      { code: '1302', nameEn: 'Sports & General Inventory', nameNp: 'खेलकुद तथा अन्य जिन्सी मौज्दात', groupCode: '1300', isSystemAccount: false, openingDr: 25000, currentDr: 25000 },
      { code: '2001', nameEn: 'Accounts Payable (Vendors/Suppliers)', nameNp: 'साहु हिसाब (आपूर्तिकर्ता भुक्तानी)', groupCode: '2000', isSystemAccount: true, openingCr: 35000, currentCr: 35000 },
      { code: '2002', nameEn: 'Salary Payable', nameNp: 'पारिश्रमिक भुक्तानी दायित्व', groupCode: '2000', isSystemAccount: false, openingCr: 0, currentCr: 0 },
      { code: '3001', nameEn: 'School Capital / General Reserve', nameNp: 'विद्यालय विकास कोष तथा पुँजी', groupCode: '3000', isSystemAccount: true, openingCr: 1800000, currentCr: 1800000 },
      { code: '4001', nameEn: 'Monthly Tuition Fee Income', nameNp: 'मासिक पढाइ शुल्क आम्दानी', groupCode: '4000', isSystemAccount: true, openingCr: 0, currentCr: 0 },
      { code: '4002', nameEn: 'Admission & Annual Fee Income', nameNp: 'भर्ना तथा वार्षिक शुल्क आम्दानी', groupCode: '4000', isSystemAccount: false, openingCr: 0, currentCr: 0 },
      { code: '4003', nameEn: 'Examination Fee Income', nameNp: 'परीक्षा शुल्क आम्दानी', groupCode: '4000', isSystemAccount: false, openingCr: 0, currentCr: 0 },
      { code: '4101', nameEn: 'Government Grants & Aid', nameNp: 'सरकारी अनुदान तथा राहत', groupCode: '4100', isSystemAccount: false, openingCr: 0, currentCr: 0 },
      { code: '5001', nameEn: 'Staff Salary & Allowance Expense', nameNp: 'शिक्षक तथा कर्मचारी पारिश्रमिक खर्च', groupCode: '5000', isSystemAccount: false, openingDr: 0, currentDr: 0 },
      { code: '5002', nameEn: 'Office Stationery & Printing Expense', nameNp: 'कार्यालय स्टेसनरी तथा छपाइ खर्च', groupCode: '5000', isSystemAccount: false, openingDr: 0, currentDr: 0 },
      { code: '5003', nameEn: 'Electricity, Water & Utilities', nameNp: 'विद्युत, खानेपानी तथा महसुल खर्च', groupCode: '5000', isSystemAccount: false, openingDr: 0, currentDr: 0 },
      { code: '5101', nameEn: 'Fixed Asset Depreciation Expense', nameNp: 'स्थिर सम्पत्ति ह्रासकट्टी खर्च', groupCode: '5100', isSystemAccount: false, openingDr: 0, currentDr: 0 },
      { code: '5102', nameEn: 'Building & IT Maintenance Expense', nameNp: 'भवन तथा कम्प्युटर मर्मत खर्च', groupCode: '5100', isSystemAccount: false, openingDr: 0, currentDr: 0 },
    ];

    for (const a of defaultAccounts) {
      const gid = groupMap[a.groupCode];
      if (gid) {
        const accId = crypto.randomUUID();
        await db.insert(schema.chartOfAccounts).values({
          id: accId,
          schoolId,
          code: a.code,
          nameEn: a.nameEn,
          nameNp: a.nameNp,
          groupId: gid,
          openingBalanceDr: a.openingDr || 0,
          openingBalanceCr: a.openingCr || 0,
          currentBalanceDr: a.currentDr || 0,
          currentBalanceCr: a.currentCr || 0,
          isSystemAccount: a.isSystemAccount,
          isActive: true,
        });
        coaMap[a.code] = accId;
      }
    }
  } else {
    for (const a of existingCoa) {
      coaMap[a.code] = a.id;
    }
  }

  // -------------------------------------------------------------
  // Seed Inventory Categories, Items & Fixed Assets
  // -------------------------------------------------------------
  const existingCategories = await db.query.inventoryCategories.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const categoryMap: Record<string, string> = {};

  if (existingCategories.length === 0) {
    console.log('[Seed] Seeding Inventory Categories...');
    const defaultCategories = [
      { code: 'STN', nameEn: 'Stationery & Paper', nameNp: 'स्टेसनरी तथा कागज पत्र', description: 'चक, डस्टर, मार्कर, फोटोकपी पेपर, खाता' },
      { code: 'LAB', nameEn: 'Science & Lab Supplies', nameNp: 'विज्ञान तथा प्रयोगशाला सामग्री', description: 'केमिकल, टेस्टट्युब, माइक्रोस्कोप' },
      { code: 'IT', nameEn: 'IT & Electronic Equipment', nameNp: 'कम्प्युटर तथा विद्युत सामग्री', description: 'कम्प्युटर, प्रिन्टर, प्रोजेक्टर, केबल' },
      { code: 'FUR', nameEn: 'Furniture & Fixtures', nameNp: 'फर्निचर तथा फिक्चर्स', description: 'डेस्क, बेन्च, दराज, कुर्सी, टेबल' },
      { code: 'SPT', nameEn: 'Sports & Games Equipment', nameNp: 'खेलकुद सामग्री', description: 'भलिबल, फुटबल, ब्याडमिन्टन, चेस' },
    ];

    for (const c of defaultCategories) {
      const cid = crypto.randomUUID();
      await db.insert(schema.inventoryCategories).values({
        id: cid,
        schoolId,
        code: c.code,
        nameEn: c.nameEn,
        nameNp: c.nameNp,
        description: c.description,
      });
      categoryMap[c.code] = cid;
    }
  } else {
    for (const c of existingCategories) {
      categoryMap[c.code] = c.id;
    }
  }

  const existingItems = await db.query.inventoryItems.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const itemMap: Record<string, string> = {};

  if (existingItems.length === 0 && categoryMap['STN']) {
    console.log('[Seed] Seeding Inventory Items...');
    const defaultItems = [
      { itemCode: 'ITM-STN-001', nameEn: 'Whiteboard Marker (Doms/Camlin)', nameNp: 'ह्वाइटबोर्ड मार्कर (कालो/नीलो)', catCode: 'STN', itemType: 'CONSUMABLE', unit: 'PCS', reorderLevel: 10, currentStock: 65, lastPurchasePrice: 60 },
      { itemCode: 'ITM-STN-002', nameEn: 'A4 Photocopy Paper 75GSM (Century/JK)', nameNp: 'A4 फोटोकपी पेपर रिम (७५ जीएसएम)', catCode: 'STN', itemType: 'CONSUMABLE', unit: 'PKT', reorderLevel: 5, currentStock: 24, lastPurchasePrice: 420 },
      { itemCode: 'ITM-STN-003', nameEn: 'Student Attendance Register', nameNp: 'विद्यार्थी हाजिरी खाता (५० पाने)', catCode: 'STN', itemType: 'CONSUMABLE', unit: 'PCS', reorderLevel: 8, currentStock: 30, lastPurchasePrice: 150 },
      { itemCode: 'ITM-IT-001', nameEn: 'Desktop PC (Core i5 12th Gen, 16GB)', nameNp: 'डेस्कटप कम्प्युटर सेट (आइ५, १६ जिबी)', catCode: 'IT', itemType: 'NON_CONSUMABLE', unit: 'SET', reorderLevel: 2, currentStock: 25, lastPurchasePrice: 48000 },
      { itemCode: 'ITM-IT-002', nameEn: 'HP LaserJet Pro MFP Printer M126a', nameNp: 'एचपी लेजरजेट प्रिन्टर', catCode: 'IT', itemType: 'NON_CONSUMABLE', unit: 'SET', reorderLevel: 1, currentStock: 3, lastPurchasePrice: 28500 },
      { itemCode: 'ITM-FUR-001', nameEn: 'Dual Metal Desk & Bench (High School)', nameNp: '२-सिटे विद्यार्थी डेस्क तथा बेन्च सेट', catCode: 'FUR', itemType: 'NON_CONSUMABLE', unit: 'SET', reorderLevel: 5, currentStock: 80, lastPurchasePrice: 4200 },
      { itemCode: 'ITM-SPT-001', nameEn: 'Cosco Volleyball Super Volley', nameNp: 'कस्को भलिबल (सुपर भली)', catCode: 'SPT', itemType: 'NON_CONSUMABLE', unit: 'PCS', reorderLevel: 3, currentStock: 6, lastPurchasePrice: 1650 },
    ];

    for (const item of defaultItems) {
      const cid = categoryMap[item.catCode];
      if (cid) {
        const itemId = crypto.randomUUID();
        await db.insert(schema.inventoryItems).values({
          id: itemId,
          schoolId,
          categoryId: cid,
          itemCode: item.itemCode,
          nameEn: item.nameEn,
          nameNp: item.nameNp,
          itemType: item.itemType,
          unit: item.unit,
          reorderLevel: item.reorderLevel,
          currentStock: item.currentStock,
          lastPurchasePrice: item.lastPurchasePrice,
          isActive: true,
        });
        itemMap[item.itemCode] = itemId;
      }
    }
  } else {
    for (const item of existingItems) {
      itemMap[item.itemCode] = item.id;
    }
  }

  // Seed Fixed Assets Register
  const existingAssets = await db.query.fixedAssets.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  if (existingAssets.length === 0) {
    console.log('[Seed] Seeding Fixed Assets Register...');
    const defaultAssets = [
      {
        assetTag: 'AST-IT-001',
        nameEn: 'HP ProDesk Lab Computer #01',
        nameNp: 'एचपी कम्प्युटर - कम्प्युटर ल्याब १',
        itemCode: 'ITM-IT-001',
        purchaseDateBs: '2081-04-10',
        purchaseDateAd: '2024-07-26',
        originalCost: 48000,
        depreciationMethod: 'STRAIGHT_LINE',
        depreciationRate: 20,
        accumulatedDepreciation: 9600,
        currentBookValue: 38400,
        location: 'कम्प्युटर ल्याब १ (Room 201)',
        conditionStatus: 'GOOD',
      },
      {
        assetTag: 'AST-IT-002',
        nameEn: 'HP ProDesk Lab Computer #02',
        nameNp: 'एचपी कम्प्युटर - कम्प्युटर ल्याब २',
        itemCode: 'ITM-IT-001',
        purchaseDateBs: '2081-04-10',
        purchaseDateAd: '2024-07-26',
        originalCost: 48000,
        depreciationMethod: 'STRAIGHT_LINE',
        depreciationRate: 20,
        accumulatedDepreciation: 9600,
        currentBookValue: 38400,
        location: 'कम्प्युटर ल्याब १ (Room 201)',
        conditionStatus: 'GOOD',
      },
      {
        assetTag: 'AST-IT-003',
        nameEn: 'HP LaserJet Printer (Admin)',
        nameNp: 'एचपी लेजरजेट प्रिन्टर - प्रशासन',
        itemCode: 'ITM-IT-002',
        purchaseDateBs: '2082-01-15',
        purchaseDateAd: '2025-04-28',
        originalCost: 28500,
        depreciationMethod: 'STRAIGHT_LINE',
        depreciationRate: 20,
        accumulatedDepreciation: 2850,
        currentBookValue: 25650,
        location: 'प्रशासन शाखा (Admin Room)',
        conditionStatus: 'GOOD',
      },
      {
        assetTag: 'AST-FUR-001',
        nameEn: 'Executive Principal Desk with 3 Drawers',
        nameNp: 'प्रधानाध्यापक मुख्य कार्यकक्ष टेबल',
        itemCode: 'ITM-FUR-001',
        purchaseDateBs: '2080-05-12',
        purchaseDateAd: '2023-08-28',
        originalCost: 25000,
        depreciationMethod: 'STRAIGHT_LINE',
        depreciationRate: 10,
        accumulatedDepreciation: 5000,
        currentBookValue: 20000,
        location: 'प्रधानाध्यापक कार्यकक्ष',
        conditionStatus: 'GOOD',
      },
    ];

    for (const a of defaultAssets) {
      const itemId = itemMap[a.itemCode] || null;
      await db.insert(schema.fixedAssets).values({
        id: crypto.randomUUID(),
        schoolId,
        assetTag: a.assetTag,
        nameEn: a.nameEn,
        nameNp: a.nameNp,
        itemId,
        purchaseDateBs: a.purchaseDateBs,
        purchaseDateAd: a.purchaseDateAd,
        originalCost: a.originalCost,
        salvageValue: 0,
        usefulLifeYears: 5,
        depreciationMethod: a.depreciationMethod,
        depreciationRate: a.depreciationRate,
        accumulatedDepreciation: a.accumulatedDepreciation,
        currentBookValue: a.currentBookValue,
        location: a.location,
        conditionStatus: a.conditionStatus,
      });
    }
  }

  // Seed a sample balanced Journal Voucher (JV-2083-0001)
  const existingVouchers = await db.query.journalVouchers.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  if (existingVouchers.length === 0 && coaMap['1001'] && coaMap['3001']) {
    console.log('[Seed] Seeding sample balanced Journal Voucher (JV-2083-0001)...');
    const sampleVoucherId = crypto.randomUUID();
    await db.insert(schema.journalVouchers).values({
      id: sampleVoucherId,
      schoolId,
      voucherNumber: 'JV-2083-0001',
      voucherType: 'JV',
      voucherDateBs: '2083-01-01',
      voucherDateAd: '2026-04-14',
      fiscalYearBs: '2082/083',
      narration: 'आर्थिक वर्ष २०८२/०८३ को सुरुवाती नगद मौज्दात प्रविष्टि (Opening Cash Balance Entry)',
      totalDebit: 25000,
      totalCredit: 25000,
      status: 'POSTED',
      referenceModule: 'MANUAL',
    });

    // Debit Cash in Hand
    await db.insert(schema.journalVoucherItems).values({
      id: crypto.randomUUID(),
      voucherId: sampleVoucherId,
      accountId: coaMap['1001'],
      particulars: 'To Opening Cash in Hand at Counter',
      debitAmount: 25000,
      creditAmount: 0,
      displayOrder: 1,
    });

    // Credit Capital / Reserve
    await db.insert(schema.journalVoucherItems).values({
      id: crypto.randomUUID(),
      voucherId: sampleVoucherId,
      accountId: coaMap['3001'],
      particulars: 'By General Capital / Reserve Fund',
      debitAmount: 0,
      creditAmount: 25000,
      displayOrder: 2,
    });
  }

  // -------------------------------------------------------------
  // Seed Library Management Data
  // -------------------------------------------------------------
  console.log('[Seed] Seeding Library Management System...');
  const categoryDefs = [
    { code: '010', nameEn: 'Curriculum & Textbooks', nameNp: 'पाठ्यक्रम तथा पाठ्यपुस्तक', description: 'CDC Textbooks and Grade References' },
    { code: '020', nameEn: 'Reference & Dictionaries', nameNp: 'सन्दर्भ तथा शब्दकोश', description: 'Encyclopedias, Lexicons, and Dictionaries' },
    { code: '100', nameEn: 'Philosophy & Psychology', nameNp: 'दर्शनशास्त्र तथा मनोविज्ञान', description: 'Moral Science, Philosophy, and Mental Wellbeing' },
    { code: '300', nameEn: 'Social Sciences & Law', nameNp: 'सामाजिक शास्त्र तथा कानुन', description: 'Civics, Economics, Sociology, and Law' },
    { code: '500', nameEn: 'Science & Mathematics', nameNp: 'विज्ञान तथा गणित', description: 'Physics, Chemistry, Biology, and Mathematics' },
    { code: '600', nameEn: 'Technology & Applied Sciences', nameNp: 'प्रविधि तथा व्यवहारिक विज्ञान', description: 'Computer Science, Engineering, and Practical Tech' },
    { code: '800', nameEn: 'Literature & Fiction', nameNp: 'साहित्य तथा कथा/उपन्यास', description: 'Nepali and World Classics, Novels, and Poetry' },
    { code: '920', nameEn: 'History & Biographies', nameNp: 'इतिहास तथा जीवनी', description: 'National and International History and Biographies' },
  ];

  const catMap: Record<string, string> = {};
  for (const c of categoryDefs) {
    let cat = await db.query.libraryCategories.findFirst({
      where: (table: any, { eq, and }: any) => and(eq(table.schoolId, schoolId), eq(table.code, c.code)),
    });
    if (!cat) {
      const catId = crypto.randomUUID();
      await db.insert(schema.libraryCategories).values({
        id: catId,
        schoolId,
        code: c.code,
        nameEn: c.nameEn,
        nameNp: c.nameNp,
        description: c.description,
      });
      catMap[c.code] = catId;
    } else {
      catMap[c.code] = cat.id;
    }
  }

  // Seed Members (Student and Staff)
  const existingMembers = await db.query.libraryMembers.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  const memberMap: Record<string, string> = {};
  if (existingMembers.length === 0) {
    console.log('[Seed] Seeding Library Members...');
    const allStudents = await db.query.students.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      limit: 5,
    });
    for (let i = 0; i < allStudents.length; i++) {
      const s = allStudents[i];
      const cardNum = `LIB-STU-${String(i + 1).padStart(4, '0')}`;
      const memId = crypto.randomUUID();
      await db.insert(schema.libraryMembers).values({
        id: memId,
        schoolId,
        memberType: 'STUDENT',
        studentId: s.id,
        cardNumber: cardNum,
        maxAllowedBooks: 2,
        maxIssueDays: 14,
        status: 'ACTIVE',
      });
      memberMap[cardNum] = memId;
    }

    const allStaff = await db.query.staff.findMany({
      where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
      limit: 3,
    });
    for (let i = 0; i < allStaff.length; i++) {
      const st = allStaff[i];
      const cardNum = `LIB-STF-${String(i + 1).padStart(4, '0')}`;
      const memId = crypto.randomUUID();
      await db.insert(schema.libraryMembers).values({
        id: memId,
        schoolId,
        memberType: 'STAFF',
        staffId: st.id,
        cardNumber: cardNum,
        maxAllowedBooks: 5,
        maxIssueDays: 30,
        status: 'ACTIVE',
      });
      memberMap[cardNum] = memId;
    }
  } else {
    for (const m of existingMembers) {
      memberMap[m.cardNumber] = m.id;
    }
  }

  // Seed Books & Copies
  const existingBooks = await db.query.libraryBooks.findMany({
    where: (table: any, { eq }: any) => eq(table.schoolId, schoolId),
  });

  if (existingBooks.length === 0) {
    console.log('[Seed] Seeding Library Books and Copies...');
    const booksData = [
      {
        titleEn: 'Muna Madan',
        titleNp: 'मुना मदन',
        author: 'Laxmi Prasad Devkota',
        publisher: 'Sajha Prakashan',
        edition: '25th',
        publicationYear: '2080',
        language: 'NEPALI',
        catCode: '800',
        rackLocation: 'Rack 1, Shelf A',
        price: 150,
        copiesCount: 5,
        accStart: 1,
      },
      {
        titleEn: 'Basain',
        titleNp: 'बसाइँ',
        author: 'Lil Bahadur Chhetri',
        publisher: 'Sajha Prakashan',
        edition: '18th',
        publicationYear: '2079',
        language: 'NEPALI',
        catCode: '800',
        rackLocation: 'Rack 1, Shelf B',
        price: 180,
        copiesCount: 4,
        accStart: 6,
      },
      {
        titleEn: 'Shirishko Phool',
        titleNp: 'शिरीषको फूल',
        author: 'Parijat',
        publisher: 'Sajha Prakashan',
        edition: '12th',
        publicationYear: '2081',
        language: 'NEPALI',
        catCode: '800',
        rackLocation: 'Rack 1, Shelf C',
        price: 220,
        copiesCount: 3,
        accStart: 10,
      },
      {
        titleEn: 'Nepali Brihat Shabdakosh',
        titleNp: 'नेपाली बृहत् शब्दकोश',
        author: 'Nepal Academy',
        publisher: 'Nepal Pragya Pratishthan',
        edition: '10th',
        publicationYear: '2079',
        language: 'NEPALI',
        catCode: '020',
        rackLocation: 'Rack 2, Shelf A',
        price: 1200,
        copiesCount: 2,
        accStart: 13,
      },
      {
        titleEn: 'Science & Technology Grade 10',
        titleNp: 'विज्ञान तथा प्रविधि कक्षा १०',
        author: 'CDC Nepal',
        publisher: 'Janak Shiksha Samagri Kendra',
        edition: 'New Curriculum',
        publicationYear: '2081',
        language: 'NEPALI',
        catCode: '010',
        rackLocation: 'Rack 3, Shelf A',
        price: 250,
        copiesCount: 6,
        accStart: 15,
      },
      {
        titleEn: 'Compulsory Mathematics Grade 10',
        titleNp: 'अनिवार्य गणित कक्षा १०',
        author: 'CDC Nepal',
        publisher: 'Janak Shiksha Samagri Kendra',
        edition: 'New Curriculum',
        publicationYear: '2081',
        language: 'NEPALI',
        catCode: '010',
        rackLocation: 'Rack 3, Shelf B',
        price: 280,
        copiesCount: 6,
        accStart: 21,
      },
      {
        titleEn: 'Principles of Computer Science',
        titleNp: 'कम्प्युटर विज्ञानका सिद्धान्तहरू',
        author: 'Herbert Schildt',
        publisher: 'McGraw Hill',
        edition: '8th',
        publicationYear: '2080',
        language: 'ENGLISH',
        catCode: '600',
        rackLocation: 'Rack 4, Shelf A',
        price: 650,
        copiesCount: 3,
        accStart: 27,
      },
    ];

    const copyMap: Record<string, string> = {};

    for (const b of booksData) {
      const bookId = crypto.randomUUID();
      await db.insert(schema.libraryBooks).values({
        id: bookId,
        schoolId,
        titleEn: b.titleEn,
        titleNp: b.titleNp,
        author: b.author,
        publisher: b.publisher,
        edition: b.edition,
        publicationYear: b.publicationYear,
        language: b.language,
        categoryId: catMap[b.catCode],
        rackLocation: b.rackLocation,
        price: b.price,
        totalCopies: b.copiesCount,
        availableCopies: b.copiesCount,
      });

      for (let i = 0; i < b.copiesCount; i++) {
        const copyNum = b.accStart + i;
        const accNum = `ACC-2083-${String(copyNum).padStart(4, '0')}`;
        const copyId = crypto.randomUUID();
        await db.insert(schema.libraryBookCopies).values({
          id: copyId,
          bookId,
          accessionNumber: accNum,
          barcode: accNum,
          condition: 'GOOD',
          status: 'AVAILABLE',
          addedDateBs: '2083-01-01',
        });
        copyMap[accNum] = copyId;
      }
    }

    // Seed sample circulations if members exist
    if (memberMap['LIB-STU-0001'] && copyMap['ACC-2083-0001']) {
      console.log('[Seed] Seeding sample Active & Overdue Circulations...');
      // 1. Regular active issue
      const cir1Id = crypto.randomUUID();
      await db.insert(schema.libraryCirculations).values({
        id: cir1Id,
        schoolId,
        circulationNumber: 'CIR-2083-0001',
        copyId: copyMap['ACC-2083-0001'],
        memberId: memberMap['LIB-STU-0001'],
        issueDateBs: '2083-01-05',
        issueDateAd: '2026-04-18',
        dueDateBs: '2083-01-19',
        status: 'ISSUED',
        fineAmount: 0,
        finePaid: false,
        remarks: 'Semester Reference',
      });
      await db.execute(sql`UPDATE library_book_copies SET status = 'ISSUED' WHERE accession_number = 'ACC-2083-0001';`);
      await db.execute(sql`UPDATE library_books SET available_copies = available_copies - 1 WHERE title_en = 'Muna Madan';`);

      // 2. Staff issue
      if (memberMap['LIB-STF-0001'] && copyMap['ACC-2083-0027']) {
        const cir2Id = crypto.randomUUID();
        await db.insert(schema.libraryCirculations).values({
          id: cir2Id,
          schoolId,
          circulationNumber: 'CIR-2083-0002',
          copyId: copyMap['ACC-2083-0027'],
          memberId: memberMap['LIB-STF-0001'],
          issueDateBs: '2083-01-02',
          issueDateAd: '2026-04-15',
          dueDateBs: '2083-02-02',
          status: 'ISSUED',
          fineAmount: 0,
          finePaid: false,
          remarks: 'Teacher lesson planning',
        });
        await db.execute(sql`UPDATE library_book_copies SET status = 'ISSUED' WHERE accession_number = 'ACC-2083-0027';`);
        await db.execute(sql`UPDATE library_books SET available_copies = available_copies - 1 WHERE title_en = 'Principles of Computer Science';`);
      }

      // 3. Overdue Issue with fine
      if (memberMap['LIB-STU-0002'] && copyMap['ACC-2083-0006']) {
        const cir3Id = crypto.randomUUID();
        await db.insert(schema.libraryCirculations).values({
          id: cir3Id,
          schoolId,
          circulationNumber: 'CIR-2083-0003',
          copyId: copyMap['ACC-2083-0006'],
          memberId: memberMap['LIB-STU-0002'],
          issueDateBs: '2082-12-10',
          issueDateAd: '2026-03-24',
          dueDateBs: '2082-12-24',
          status: 'OVERDUE',
          fineAmount: 28,
          finePaid: false,
          remarks: 'Overdue 14 days, NPR 2/day',
        });
        await db.execute(sql`UPDATE library_book_copies SET status = 'ISSUED' WHERE accession_number = 'ACC-2083-0006';`);
        await db.execute(sql`UPDATE library_books SET available_copies = available_copies - 1 WHERE title_en = 'Basain';`);

        await db.insert(schema.libraryFines).values({
          id: crypto.randomUUID(),
          schoolId,
          circulationId: cir3Id,
          memberId: memberMap['LIB-STU-0002'],
          overdueDays: 14,
          ratePerDay: 2,
          fineAmount: 28,
          waivedAmount: 0,
          paidAmount: 0,
          paymentStatus: 'UNPAID',
        });
      }
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
