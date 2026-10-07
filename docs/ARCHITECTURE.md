# System Architecture & Database Specification (प्रणाली संरचना तथा डाटाबेस डिजाइन)

> **Hamro School Management System (SMS) - Technical Architecture Document**  
> *Compliant with Nepal Curriculum Development Centre (CDC), CEHRD IEMIS, and Local Educational Regulations.*

---

## 1. High-Level Architectural Overview

Hamro SMS is built as a modular TypeScript monorepo with strict separation of concerns across presentation, business logic, data persistence, and shared domain models:

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|               React 19 SPA (Vite, Tailwind CSS, Lucide, PWA, Responsive)          |
|  +--------------------+  +-----------------------+  +--------------------------+  |
|  |    AuthContext     |  |    LanguageContext    |  |       SchoolContext      |  |
|  |  (JWT & RBAC User) |  |   (Nepali <-> English)|  | (Active School & Config) |  |
|  +--------------------+  +-----------------------+  +--------------------------+  |
+-----------------------------------------------------------------------------------+
                                          │ HTTP / REST API (Bearer JWT)
                                          ▼
+-----------------------------------------------------------------------------------+
|                                  API GATEWAY                                      |
|                     Fastify 5 Node.js Server (Port 4000)                          |
|  +-----------------+  +-------------------+  +-----------------+  +------------+  |
|  |  Helmet (Secure)|  |  CORS Whitelisting|  |  Rate Limiting  |  | JWT Guard  |  |
|  +-----------------+  +-------------------+  +-----------------+  +------------+  |
+-----------------------------------------------------------------------------------+
                                          │
    ┌────────────────┬────────────────────┼───────────────────┬───────────────┐
    ▼                ▼                    ▼                   ▼               ▼
Academic Routes  Student Routes      Staff Routes       Exam Routes      Certificate Routes
(/api/academic)  (/api/students)     (/api/staff)       (/api/exams)     (/api/certificates)
    └────────────────┴────────────────────┼───────────────────┴───────────────┘
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
|                              PERSISTENCE ADAPTER                                  |
|                             Drizzle ORM Layer                                     |
|                                                                                   |
|     Production Mode (PostgreSQL)            Local/Desktop Offline Mode (PGlite)   |
|     DATABASE_URL=postgresql://...           Embedded SQL at ./data/sms_pg         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Monorepo Organization

The project uses **npm workspaces** with three core components:

### 2.1. `@sms/shared` (`packages/shared`)
The single source of truth for domain models, constants, and data definitions:
- **`types/`**: Shared interfaces for Students, Staff, Attendance, Exams, Routine, Academic Structure, and Roles.
- **`constants/bs-calendar.ts`**: Bikram Sambat months, festival holidays, and BS-AD conversion constants.
- **`constants/roles.ts`**: System role hierarchy (`SUPER_ADMIN`, `SYSTEM_ADMIN`, `PRINCIPAL`, `EXAM_HEAD`, `ACCOUNTANT`, `TEACHER`, `STUDENT`, `GUARDIAN`) and granular permissions matrix.

### 2.2. `@sms/api` (`apps/api`)
The Fastify HTTP application delivering high-throughput JSON endpoints:
- Built with Fastify 5 for low latency and minimal overhead.
- Dual-mode database driver:
  - If `DATABASE_URL` is set, connects to external PostgreSQL using `pg` Pool.
  - If `DATABASE_URL` is empty, spins up an embedded persistent PostgreSQL engine via `@electric-sql/pglite` stored at `./data/sms_pg`.
- Automatic schema verification and seed execution on startup (`runMigrationsAndSeed`).

### 2.3. `@sms/web` (`apps/web`)
A single-page web application built with React 19 and Vite:
- **Tailwind CSS**: Modern, utility-first design with dark mode and high-contrast printing styles.
- **Bilingual Engine (`LanguageContext`)**: Instant switching between Nepali (Devanagari numerals, localized labels) and English.
- **Mobile Responsive Navigation**: Drawer sidebar with backdrop and hamburger button on small screens.
- **Print Optimization**: Dedicated CSS print styles for Admit Cards (A4 2-up format), Grade Sheets, and Tabulation Ledgers.

---

## 3. Database Schema Specification (३२ तालिकाहरूको पूर्ण विवरण)

The database schema is fully defined in [`apps/api/src/db/schema.ts`](file:///d:/Software/SMS/apps/api/src/db/schema.ts) with 32 normalized tables:

### 3.1. School & Academic Structure
| Table Name | Description | Key Columns |
|---|---|---|
| `schools` | Multi-tenant school profiles | `id`, `code`, `nameEn`, `nameNp`, `iemisCode`, `shifts`, `province`, `district`, `localLevel` |
| `academic_years` | BS Academic Years | `id`, `schoolId`, `yearBs` (e.g. 2083), `startDateBs`, `endDateBs`, `isCurrent` |
| `classes` | Grade levels (ECD to 12) | `id`, `code` ('ECD', '1'..'12'), `nameEn`, `nameNp`, `stage`, `displayOrder` |
| `streams` | Class 11–12 streams | `id`, `code` (SCIENCE, MANAGEMENT, etc.), `nameEn`, `nameNp` |
| `sections` | Class divisions (A, B, C) | `id`, `classId`, `code`, `nameEn`, `nameNp`, `shift`, `capacity`, `classTeacherId` |
| `subjects` | CDC Subject definitions | `id`, `classId`, `code`, `nameEn`, `nameNp`, `creditHours`, `theoryFullMarks`, `practicalFullMarks`, `teacherId` |
| `houses` | School houses (सदन) | `id`, `nameEn`, `nameNp`, `colorHex`, `masterTeacherName`, `captainStudentName` |
| `house_activities` | ECA competitions & points | `id`, `title`, `category` (SPORTS, LITERARY, etc.), `firstHouseId`, `firstPoints`, `secondPoints` |

### 3.2. User Management & Security (RBAC)
| Table Name | Description | Key Columns |
|---|---|---|
| `users` | System login accounts | `id`, `username`, `passwordHash` (bcrypt), `fullNameEn`, `fullNameNp`, `status`, `isSuperAdmin` |
| `roles` | Role definitions | `id`, `name` (PRINCIPAL, TEACHER, etc.), `displayNameEn`, `displayNameNp`, `isSystemRole` |
| `permissions` | Granular permission keys | `id`, `code` (e.g. `EXAMS_MARKS_ENTRY`, `STUDENTS_EDIT`), `module` |
| `role_permissions` | Role-Permission mapping | `roleId`, `permissionId` (Composite Primary Key) |
| `user_roles` | User-Role mapping | `userId`, `roleId` (Composite Primary Key) |
| `audit_logs` | Audit trail | `id`, `userId`, `action`, `entity`, `entityId`, `oldValues`, `newValues`, `ipAddress` |
| `sync_outbox` | Cloud sync queue | `id`, `entityType`, `entityId`, `operation`, `payload`, `syncStatus` |

### 3.3. Student Information & Admissions
| Table Name | Description | Key Columns |
|---|---|---|
| `students` | Master student directory | `id`, `studentId` (e.g. 2083-0001), `iemisCode`, `fullNameEn`, `fullNameNp`, `dobBs`, `dobAd`, `gender`, `ethnicityInclusion`, `disabilityStatus`, `currentClassId`, `currentRollNumber` |
| `student_health_records` | Medical & health records | `id`, `studentId`, `bloodGroup`, `allergies`, `chronicConditions`, `emergencyContactPhone` |
| `guardians` | Parents & local guardians | `id`, `studentId`, `relationship` (FATHER, MOTHER, GUARDIAN), `fullNameEn`, `phone`, `isPrimaryContact` |
| `student_enrollments` | Session history & promotion | `id`, `studentId`, `academicYearId`, `classId`, `sectionId`, `rollNumber`, `status` (ENROLLED, PROMOTED) |
| `student_admissions` | Entrance applications queue | `id`, `applicationNumber`, `targetClassId`, `applicantNameEn`, `guardianPhone`, `applicationStatus` |

### 3.4. Staff & Human Resources
| Table Name | Description | Key Columns |
|---|---|---|
| `staff` | Staff & Teacher files | `id`, `staffCode`, `category` (TEACHING, NON_TEACHING), `fullNameEn`, `fullNameNp`, `phone`, `appointmentType`, `designation`, `teachingLicenseNo`, `userId` |
| `staff_attendance` | Staff daily attendance | `id`, `staffId`, `attendanceDateBs`, `status` (PRESENT, ABSENT, ON_LEAVE, LATE), `inTime`, `outTime` |
| `staff_leaves` | Staff leave requests | `id`, `staffId`, `leaveType`, `startDateBs`, `endDateBs`, `totalDays`, `status` (PENDING, APPROVED) |

### 3.5. Routines & Attendance
| Table Name | Description | Key Columns |
|---|---|---|
| `timetables` | Weekly period routines | `id`, `classId`, `sectionId`, `subjectId`, `teacherId`, `dayOfWeek`, `periodNumber` (1–8), `startTime`, `endTime` |
| `substitute_assignments` | Daily substitute teachers | `id`, `dateBs`, `timetableId`, `classId`, `subjectId`, `originalTeacherId`, `substituteTeacherId`, `status` |
| `student_attendance` | Student daily attendance | `id`, `studentId`, `classId`, `sectionId`, `attendanceDateBs`, `status` (PRESENT, ABSENT, LATE, SICK_LEAVE) |
| `school_calendar_events` | BS School Calendar | `id`, `titleNp`, `titleEn`, `eventType` (PUBLIC_HOLIDAY, EXAM_DAY, etc.), `startDateBs`, `endDateBs` |

### 3.6. Examination, Marks & Certificates
| Table Name | Description | Key Columns |
|---|---|---|
| `exams` | Scheduled examinations | `id`, `academicYearId`, `nameNp`, `nameEn`, `examType`, `startDateBs`, `endDateBs`, `isMarksLocked` |
| `exam_marks` | Class 4–12 Marks & CAS | `id`, `examId`, `studentId`, `subjectId`, `theoryMarks`, `practicalMarks`, `casParticipation` (4), `casProjectPractical` (16), `casDiscipline` (2), `casTerminalExam` (3), `isAbsent`, `entryStatus` |
| `class_1_to_3_cas_ratings` | Class 1–3 Continuous Ratings | `id`, `examId`, `studentId`, `subjectId`, `themeName`, `levelRating` (1 to 4), `achievementRemarks`, `entryStatus` |
| `exam_applications` | Exam admit cards & status | `id`, `examId`, `studentId`, `classId`, `symbolNumber`, `applicationStatus` (APPROVED, PENDING, REJECTED), `admitCardPrintCount` |
| `student_certificates` | SLC, Character & Transfer | `id`, `studentId`, `certificateType` (SLC, CHARACTER, TRANSFER), `certificateNo`, `symbolNumber`, `gpa`, `divisionOrGrade`, `printCount` |

---

## 4. Nepal Educational Guidelines (CDC & CEHRD Compliance)

### 4.1. Letter Grading System 2078 (अक्षरांकन निर्देशिका २०७८)
The system calculates subject grades and final GPAs according to Nepal CDC guidelines:

| Percentage Range | Grade | Grade Point (GP) | Description (उपलब्धि स्तर) |
|---|:---:|:---:|---|
| 90% and above | **A+** | 4.0 | Outstanding (विशिष्ट) |
| 80% to below 90% | **A** | 3.6 | Excellent (उत्कृष्ट) |
| 70% to below 80% | **B+** | 3.2 | Very Good (धेरै राम्रो) |
| 60% to below 70% | **B** | 2.8 | Good (राम्रो) |
| 50% to below 60% | **C+** | 2.4 | Satisfactory (सन्तोषजनक) |
| 40% to below 50% | **C** | 2.0 | Acceptable (स्वीकार्य) |
| 35% to below 40% | **D** | 1.6 | Basic (आधारभूत) |
| Below 35% | **NG** | 0.0 | Non-Graded (अवर्गीकृत / अनुत्तीर्ण) |

> **Important Rule**: Under CDC 2078 guidelines, if a student achieves below 35% in either Theory (less than 26.25 out of 75, rounded to 27) or Practical (less than 10 out of 25), the subject grade is marked **NG** and the final result is **NG**, requiring the student to participate in the Grade Increment Exam.

### 4.2. Class 1–3 Continuous Assessment System (CAS 1–3)
For primary grades 1 through 3, numerical marks are replaced by an integrated 4-level developmental scale:
- **Level 4 (स्तर ४ - धेरै राम्रो)**: Superior achievement of learning competencies (>90%).
- **Level 3 (स्तर ३ - राम्रो)**: Proficient achievement of expected learning competencies (70%–89%).
- **Level 2 (स्तर २ - सामान्य)**: Developing competency; requires additional exercises (40%–69%).
- **Level 1 (स्तर १ - कमजोर)**: Beginning competency; requires remedial support (<40%).

### 4.3. Class 4–12 CDC Internal Assessment Breakdown (CAS 25 Marks)
The internal assessment components are strictly segmented into 4 official categories:
1. **सहभागिता (Participation & Attendance)**: 4 marks
2. **परियोजना तथा प्रयोगात्मक कार्य (Project Work & Practical)**: 16 marks
3. **आचरण तथा अनुशासन (Discipline & Behavior)**: 2 marks
4. **त्रैमासिक परीक्षा (Terminal Assessment)**: 3 marks
**Total Internal (कुल आन्तरिक)**: 25 marks (Pass Marks: 10).

---

## 5. Security & Authorization Architecture

### 5.1. Teacher Subject Allotment Restriction
- When an authenticated user is identified as a `TEACHER`, the backend API resolves all assigned classes and subjects from both:
  1. Active timetable routine periods (`timetables` table).
  2. Direct subject teacher assignments (`subjects.teacherId` table).
- Any attempt to access or modify marks for unassigned subjects returns an immediate `403 Forbidden` error.

### 5.2. Single Submission Lock & Admin Unlock Workflow
```
[ Teacher Marks Entry ] ──(Save)──> [ State: SUBMITTED ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
                [ Teacher View ]                       [ Admin View ]
          Inputs locked & disabled                 Full edit permissions
             Cannot edit again                   Can click "Unlock" button
                                                              │
                                                              ▼
                                                   [ State: DRAFT ]
                                                   (Teacher can edit again)
```
- Upon saving, marks records are committed with `entryStatus = 'SUBMITTED'`.
- Teachers cannot overwrite submitted marks.
- Only users with `SYSTEM_ADMIN` or `PRINCIPAL` privileges can execute the `POST /api/exams/:id/marks/unlock` endpoint to reset `entryStatus` to `'DRAFT'`.
