# API Documentation (ब्याकइन्ड इन्डपोइन्ट विस्तृत विवरण)

> **Hamro School Management System (SMS) - RESTful API Specification**  
> *Base URL: `http://localhost:4000/api` (Development) | `https://api.your-domain.edu.np/api` (Production)*

---

## 1. Authentication & Security Headers

All protected endpoints require a valid JSON Web Token (JWT) supplied in the `Authorization` request header:

```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

### Common HTTP Status Codes
* `200 OK`: Request succeeded.
* `201 Created`: Resource successfully created.
* `400 Bad Request`: Validation failure or missing required fields.
* `401 Unauthorized`: Missing or expired JWT token.
* `403 Forbidden`: User lacks necessary permissions or subject allotment.
* `404 Not Found`: Resource does not exist.
* `429 Too Many Requests`: Rate limit exceeded.
* `500 Internal Server Error`: Server failure.

---

## 2. Module Endpoints Catalog

### 2.1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates username & password; returns `{ token, user, school }` |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user profile, roles, and school context |
| `POST` | `/api/auth/change-password` | Authenticated | Updates current user password (`currentPassword`, `newPassword`) |

---

### 2.2. School Settings (`/api/school`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/school` | Authenticated | Returns school profile, IEMIS code, address, logo, shifts, and active BS year |
| `PUT` | `/api/school` | Admin / Principal | Updates school configuration and institutional metadata |

---

### 2.3. User & Role Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | Returns list of all user accounts and their assigned roles |
| `POST` | `/api/users` | Admin | Creates a new user account with initial role and credentials |
| `PUT` | `/api/users/:id` | Admin | Updates user name, status, or assigned roles |
| `DELETE` | `/api/users/:id` | Admin | Deactivates or removes a user account |

---

### 2.4. Academic Structure (`/api/academic`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/academic/years` | Authenticated | Lists all academic sessions (BS/AD) |
| `POST` | `/api/academic/years` | Admin | Creates a new BS academic year |
| `GET` | `/api/academic/classes` | Authenticated | Lists grade levels (ECD to 12) with ordering |
| `POST` | `/api/academic/classes` | Admin | Creates a new class |
| `GET` | `/api/academic/sections` | Authenticated | Lists sections (filter by `classId`) |
| `POST` | `/api/academic/sections` | Admin | Creates a class section with capacity and class teacher |
| `GET` | `/api/academic/subjects` | Authenticated | Lists CDC subjects (filter by `classId`) |
| `POST` | `/api/academic/subjects` | Admin | Defines a subject with credit hours, full marks & teacher assignment |

---

### 2.5. Students Directory & Admissions (`/api/students`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/students` | Authenticated | Returns active students list (Supports query params: `classId`, `sectionId`, `search`) |
| `POST` | `/api/students` | Admin / Staff | Enrolls a new student with bio, guardians, health, and address |
| `GET` | `/api/students/:id` | Authenticated | Returns full student dossier including enrollments and health record |
| `PUT` | `/api/students/:id` | Admin / Staff | Updates student record |
| `POST` | `/api/students/import-excel` | Admin | Bulk imports students from official CEHRD IEMIS Excel files |
| `GET` | `/api/students/export-excel` | Authenticated | Exports student roster in IEMIS-compliant format |

---

### 2.6. Staff & Human Resources (`/api/staff`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/staff` | Authenticated | Lists teaching and non-teaching personnel with appointment type & designation |
| `POST` | `/api/staff` | Admin | Registers a new staff member |
| `GET` | `/api/staff/:id` | Authenticated | Retrieves staff profile and linked user account |
| `PUT` | `/api/staff/:id` | Admin | Updates staff details |

---

### 2.7. Attendance Management (`/api/attendance`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/attendance/daily` | Authenticated | Fetches student attendance matrix for given `classId`, `sectionId`, and `dateBs` |
| `POST` | `/api/attendance/daily` | Teacher / Admin | Saves student attendance records (`PRESENT`, `ABSENT`, `LATE`, `SICK_LEAVE`) |
| `GET` | `/api/attendance/report` | Authenticated | Calculates monthly student attendance statistics and rates |

---

### 2.8. Staff Attendance & Leaves (`/api/staff-attendance`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/staff-attendance/daily` | Admin / Principal | Returns staff attendance records for given BS date |
| `POST` | `/api/staff-attendance/daily` | Admin / Principal | Submits staff attendance (clock-in, clock-out, status) |
| `GET` | `/api/staff-attendance/leaves` | Authenticated | Lists staff leave requests |
| `POST` | `/api/staff-attendance/leaves` | Authenticated | Submits a new leave application |
| `POST` | `/api/staff-attendance/leaves/:id/review`| Admin / Principal | Approves or rejects a staff leave request |

---

### 2.9. School Calendar (`/api/calendar`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/calendar/events` | Authenticated | Returns academic calendar events, holidays, and examination schedules |
| `POST` | `/api/calendar/events` | Admin | Adds a new event or holiday with BS/AD dates |
| `DELETE`| `/api/calendar/events/:id` | Admin | Deletes a calendar event |

---

### 2.10. Routines & Timetables (`/api/routine`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/routine/class/:classId` | Authenticated | Returns 6-day period schedule (Sunday to Friday) for a class |
| `GET` | `/api/routine/teacher/:teacherId`| Authenticated | Returns personal period schedule for a teacher |
| `POST` | `/api/routine` | Admin / Coordinator| Saves or updates a timetable period slot |

---

### 2.11. Teacher Substitution (`/api/substitute`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/substitute/daily` | Authenticated | Lists substitute teacher allocations for given BS date |
| `POST` | `/api/substitute/assign` | Admin / Principal | Assigns a substitute teacher for an absent teacher's period slot |
| `DELETE`| `/api/substitute/:id` | Admin / Principal | Cancels a substitution assignment |

---

### 2.12. Examination, Evaluation & Admit Cards (`/api/exams`)

#### General Exams & Allotments
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/exams` | Authenticated | Lists all examinations for the school |
| `POST` | `/api/exams` | Admin | Creates a new examination (Term, Final, Unit test) |
| `POST` | `/api/exams/:id/lock` | Admin | Locks or unlocks marks entry for the entire exam |
| `GET` | `/api/exams/my-allotments` | Authenticated | **Teacher Allotment Discovery**: Returns `{ isAllAllowed, staffId, teacherName, allotments }` |

#### Marks Entry & Teacher Restrictions
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/exams/:id/marks` | Authenticated | Fetches Class 4–12 marks for `classId`, `sectionId`, and `subjectId`. Returns `entryStatus`, `isLockedForUser`, `canUnlock`, and `isAllotted` |
| `POST` | `/api/exams/:id/marks` | Assigned Teacher / Admin | **Marks Submission**: Saves theory marks and CAS 4-subcomponents. Enforces allotment check (403 if unassigned) and locks to `SUBMITTED` |
| `GET` | `/api/exams/:id/cas-1-3` | Authenticated | Fetches Class 1–3 CAS achievement ratings (Levels 1–4) and remarks |
| `POST` | `/api/exams/:id/cas-1-3` | Assigned Teacher / Admin | **CAS 1–3 Submission**: Saves level ratings. Enforces allotment check and locks to `SUBMITTED` |
| `POST` | `/api/exams/:id/marks/unlock`| Admin / Principal Only | **Admin Marks Unlock**: Resets `entryStatus` to `DRAFT` so the teacher can modify marks |

#### Applications, Symbol Numbers & Admit Cards
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/exams/:id/applications` | Authenticated | Lists examinee applications (auto-syncs active students). Supports filters (`classId`, `status`, `search`) and returns summary KPIs (`totalCount`, `approvedCount`, `pendingCount`, `rejectedCount`, `printedCount`) |
| `POST` | `/api/exams/:id/applications/status` | Admin / Exam Head | Bulk or single status update (`APPROVED`, `PENDING`, `REJECTED`) |
| `POST` | `/api/exams/:id/applications/generate-symbols` | Admin / Exam Head | Auto-generates sequential symbol numbers with custom prefix, start number, and padding |
| `GET` | `/api/exams/:id/admit-cards` | Authenticated | Returns printable admit card payload: School info, exam routine, student details, and passport photo |
| `POST` | `/api/exams/:id/admit-cards/record-print` | Authenticated | Logs print count increment for examinees |

#### Ledgers & Grade Sheets
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/exams/:id/ledger` | Authenticated | Generates complete Tabulation Ledger with grades, GPAs, and results |
| `GET` | `/api/exams/:id/gradesheet/:studentId` | Authenticated | Generates official student Grade Sheet / Report Card according to CDC 2078 standard |

---

### 2.13. Student Certificates (`/api/certificates`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/certificates` | Authenticated | Lists issued certificates (SLC, Character, Transfer) with serial numbers |
| `POST` | `/api/certificates` | Admin / Principal | Issues an official certificate with board symbol number, GPA, and conduct remarks |
| `POST` | `/api/certificates/:id/record-print` | Authenticated | Records print count and timestamp (duplicate tracking) |

---

### 2.14. Fee & Billing Management (`/api/fees`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/fees/heads` | Authenticated | Lists all active fee heads (Tuition, Admission, Exam, Computer Lab, Bus, ECA, Misc) |
| `POST` | `/api/fees/heads` | Admin / Accountant | Creates or updates a fee head with Devanagari/English names and recurrence |
| `DELETE` | `/api/fees/heads/:id` | Admin | Deletes a fee head if no class rate structures depend on it |
| `GET` | `/api/fees/structures` | Authenticated | Returns class-wise fee structures with filters (`academicYearId`, `classId`) |
| `POST` | `/api/fees/structures` | Admin / Accountant | Upserts single or batch fee structure rates per class and stream |
| `GET` | `/api/fees/discounts` | Authenticated | Lists student fee discounts with filters (`classId`, `studentId`, `academicYearId`) |
| `POST` | `/api/fees/discounts` | Admin / Accountant | Registers or updates fee discount/scholarship with **supporting proof document upload** (base64 URI/PDF/Image) |
| `DELETE` | `/api/fees/discounts/:id` | Admin | Deletes a fee discount record |
| `POST` | `/api/fees/generate-monthly-bills` | Admin / Accountant | Bulk generates monthly fee bills for a target BS month, computes discounts, and rolls over previous unpaid balances |
| `GET` | `/api/fees/students/:studentId/due` | Authenticated | Returns complete billing profile, all past/current bills, and outstanding dues balance |
| `POST` | `/api/fees/collect` | Accountant / Cashier | Records fee collection via **CASH**, **QR_CODE** (Fonepay/NepalPay/eSewa with UTR), **BANK_TRANSFER**, or **CHEQUE** and auto-settles bills |
| `GET` | `/api/fees/receipts/:id` | Authenticated | Returns complete printable **2-Up Official Receipt** payload (School Copy + Student Copy) and increments `printedCount` |
| `GET` | `/api/fees/qr-settings` | Authenticated | Fetches school merchant QR code URL and merchant display name |
| `POST` | `/api/fees/qr-settings` | Admin | Updates school merchant QR code image and merchant name |
| `GET` | `/api/fees/reports/daily` | Accountant / Admin | Daily collection report aggregating totals by payment mode (Cash vs QR vs Bank) |
| `GET` | `/api/fees/reports/dues` | Accountant / Admin | Class-wise dues matrix and Defaulters List with parent contact numbers |
