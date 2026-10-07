# Hamro School Management System (हाम्रो विद्यालय व्यवस्थापन प्रणाली - SMS)

> **A modern, offline-capable, bilingual (Nepali & English) School Management System custom-engineered for Nepal's educational ecosystem (CDC, CEHRD & IEMIS compliant).**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Backend-Fastify%205-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20PGlite-336791.svg)](https://github.com/electric-sql/pglite)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8.svg)](https://tailwindcss.com/)

---

## 📖 Overview (परिचय)

**Hamro School Management System (SMS)** is an enterprise-grade, comprehensive web application built specifically for community and institutional schools across Nepal. It natively supports **Bikram Sambat (BS) academic calendars**, **CEHRD 9-digit IEMIS integration**, **CDC Curriculum Assessment Guidelines (अक्षरांकन निर्देशिका २०७८ / २०८१)**, **continuous assessment (CAS 1–3)**, and multi-tier role-based access control for administrators, principals, and subject teachers.

The application is structured as a TypeScript monorepo with high performance, instant local startup, offline-first embedded database support (via PGlite), and production readiness for cloud deployment.

---

## 🌟 Key Features (प्रमुख विशेषताहरू)

### 1. नेपाल पाठ्यक्रम विकास केन्द्र (CDC) अनुसार परीक्षा तथा मूल्याङ्कन (Examination & Grading)
* **अक्षरांकन पद्धति निर्देशिका २०७८ / २०८१**: Full 8-tier letter grading scale: `A+ (4.0)`, `A (3.6)`, `B+ (3.2)`, `B (2.8)`, `C+ (2.4)`, `C (2.0)`, `D (1.6)`, and `NG (<35% / 0.0)`.
* **कक्षा १–३ निरन्तर मूल्याङ्कन (CAS 1–3)**: एकीकृत पाठ्यक्रम (Integrated Curriculum) अनुसार ४-तहको सिकाइ उपलब्धि स्तर (स्तर ४: धेरै राम्रो, स्तर ३: राम्रो, स्तर २: सामान्य, स्तर १: कमजोर) र थिमगत शिक्षक टिप्पणी।
* **कक्षा ४–१२ आन्तरिक तथा बाह्य मूल्याङ्कन**: ७५% सैद्धान्तिक + २५% आन्तरिक (सहभागिता: ४, परियोजना/प्रयोगात्मक: १६, आचरण: २, त्रैमासिक परीक्षा: ३ अंक)।
* **शिक्षक विषय बाँडफाँड सुरक्षा (Subject Allotment Lock)**: शिक्षकले आफूलाई तोकिएको कक्षा र विषयको मात्र प्राप्ताङ्क प्रविष्टि गर्न सक्ने।
* **एकल प्रविष्टि लक (Single Submission Lock)**: शिक्षकले अंक बुझाएपछि स्वतः लक (`SUBMITTED`) हुने, र केवल व्यवस्थापक/प्रधानाध्यापकले मात्र पुनः सम्पादन खुला (`Unlock to DRAFT`) गर्न सक्ने।
* **परीक्षा आवेदन तथा प्रवेशपत्र (Admit Cards & Applications)**: विद्यार्थीको आवेदन स्वीकृति/अस्वीकृति, क्रमबद्ध सिम्बोल नम्बर उत्पादन (Symbol Number Generator), र A4 पानामा २ प्रति प्रिन्ट हुने फोटोसहितको आधिकारिक प्रवेशपत्र।
* **मूल्याङ्कन लेजर तथा ग्रेडसिट (Tabulation Ledger & Grade Sheets)**: पूर्ण कक्षा लेजर तथा प्रिन्ट गर्न योग्य विद्यार्थी रिपोर्ट कार्ड।

### 2. विद्यार्थी अभिलेख तथा IEMIS समायोजन (Student Information System)
* **CEHRD IEMIS अनुकूलता**: ९-अङ्कको IEMIS कोड, विद्यार्थी व्यक्तिगत कोड, र आधिकारिक Excel ढाँचामा Bulk Import/Export।
* **पूर्ण व्यक्तिगत विवरण**: नेपाली र अंग्रेजी दुवै भाषामा नाम, जन्ममिति (वि.सं. तथा ई.सं.), रक्तसमूह, समावेशी समूह (दलित, जनजाति, मधेशी, मुस्लिम, थारू, आदि), अपाङ्गता विवरण, छात्रवृत्ति स्थिति।
* **सदन तथा अतिरिक्त क्रियाकलाप (House & ECA System)**: चार सदन (रातो, नीलो, हरियो, पहेंलो), सदन क्याप्टेन, खेलकुद तथा सह-क्रियाकलाप अङ्क र लिडरबोर्ड।
* **स्वास्थ्य तथा अभिभावक अभिलेख**: स्वास्थ्य जाँच, एलर्जी, आकस्मिक सम्पर्क, र बहु-अभिभावक विवरण।

### 3. प्रमाणपत्र व्यवस्थापन (Official Certificates)
* **चारित्रिक प्रमाणपत्र (Character Certificate)**
* **स्थानान्तरण प्रमाणपत्र (Transfer / Leaving Certificate)**
* **विद्यालय तह पूरा गरेको प्रमाणपत्र (School Leaving Certificate - Class 10 SEE / 12 NEB)**
* सुरक्षा सिरियल नम्बर, डुप्लिकेट प्रतिलिपि ट्र्याकिङ, र मुद्रण काउन्टर (Print Count log)।

### 4. शिक्षक तथा कर्मचारी व्यवस्थापन (Staff & HR Management)
* शिक्षक तथा कर्मचारी अभिलेख, अध्यापन अनुमतिपत्र (Teaching License No), प्यान नं, नागरिकता विवरण।
* नियुक्ति प्रकार (स्थायी, राहत, स्थानीय तह, करार, निजी स्रोत, बालविकास सहजकर्ता)।
* दैनिक कर्मचारी हाजिरी तथा बिदा व्यवस्थापन (आकस्मिक, पर्व, प्रसूति, किरिया, बिरामी बिदा)।

### 5. दैनिक समयतालिका तथा सट्टा कक्षा (Routines & Teacher Substitution)
* ६-दिने शैक्षिक हप्ता (आइतबार–शुक्रबार), दैनिक ८ घण्टीको तालिका।
* शिक्षक बिदामा रहँदा दैनिक **सट्टा शिक्षक (Substitute Class Allocation)** तोक्ने विशेष मोड्युल।

### 6. शुल्क तथा लेखा व्यवस्थापन (Fee & Billing Management)
* **२-प्रति आधिकारिक रसिद (2-Up Split Receipt Engine)**: एकै A4/A5 पानामा विद्यालय प्रति (School Copy) र विद्यार्थी प्रति (Student Copy) कैंची चिन्हसहित मुद्रण।
* **डिजिटल क्युआर पेमेन्ट इन्जिन (Digital QR Code Payment)**: Fonepay/NepalPay/eSewa क्युआर कोड स्क्यान गरी भुक्तानी, मर्चन्ट विवरण, र ट्रान्जेक्सन आईडी (UTR) प्रविष्टि तथा रसिदमा QR-Verified ब्याज।
* **छात्रवृत्ति तथा प्रमाणिक कागजात अपलोड (Supporting Verification Documents)**: जेहेन्दार/विपन्न/सहोदर छुटका लागि वडा सिफारिस वा लब्धांक पत्र अपलोड र इन्लाइन भ्यूअर।
* **स्वचालित मासिक बिल उत्पादन तथा बक्यौता रोलओभर**: विगतको नतिरेको बक्यौता रकम स्वतः नयाँ बिलमा थपिने र छुट स्वतः घट्ने प्रणाली।
* **बक्यौता तथा संकलन प्रतिवेदन**: दैनिक नगद र क्युआर संकलन सारांश तथा बक्यौता बाँकी विद्यार्थीहरूको सूची (Defaulters List)।

### 7. द्विभाषी तथा मोबाइल मैत्री डिजाइन (Bilingual & Mobile Responsive)
* **१००% नेपाली र अंग्रेजी भाषा स्विच**: एक क्लिकमा सम्पूर्ण इन्टरफेस रूपान्तरण।
* **मोबाइल रेस्पोन्सिभ**: स्मार्टफोन र ट्याब्लेटमा सहज नेभिगेसनका लागि स्लाइड-ओभर ड्रअर र ह्यामबर्गर टगल।
* **डार्क र लाइट मोड (Theme Toggle)**।

---

## 🏗️ Project Architecture (प्रणाली संरचना)

This repository is organized as an npm workspace monorepo:

```
SMS/
├── apps/
│   ├── api/                     # Backend Fastify API Service (Port 4000)
│   │   ├── src/
│   │   │   ├── db/              # Drizzle ORM Schema, Migrations & Database Adapter
│   │   │   │   ├── index.ts     # PostgreSQL / PGlite connection loader
│   │   │   │   ├── schema.ts    # 38 Normalized Database Tables
│   │   │   │   └── seed.ts      # Initial admin credentials & demo school data
│   │   │   ├── routes/          # Fastify Modular Route Handlers
│   │   │   │   ├── academic.ts  # Classes, Sections, Subjects, Academic Years
│   │   │   │   ├── attendance.ts# Student daily attendance tracking
│   │   │   │   ├── auth.ts      # JWT login, refresh & password update
│   │   │   │   ├── calendar.ts  # Bikram Sambat academic calendar events
│   │   │   │   ├── certificates.ts # SLC, Character & Transfer certificates
│   │   │   │   ├── exams.ts     # Marks, CAS 1-3, Admit cards, Ledger, Report cards
│   │   │   │   ├── routine.ts   # Period timetables & teacher allocations
│   │   │   │   ├── school.ts    # School profile & institutional settings
│   │   │   │   ├── staff.ts     # Staff directory & personal files
│   │   │   │   ├── staffAttendance.ts # Staff daily biometric/manual attendance
│   │   │   │   ├── students.ts  # Student directory, admissions & IEMIS excel import
│   │   │   │   ├── substitute.ts# Daily teacher substitute manager
│   │   │   │   └── users.ts     # System user accounts & role assignments
│   │   │   └── server.ts        # Fastify HTTP server entry point with Helmet & CORS
│   │   └── package.json
│   │
│   └── web/                     # Frontend Single Page Application (Port 5173)
│       ├── src/
│       │   ├── components/      # UI components (Navbar, Sidebar, Modals)
│       │   ├── context/         # AuthContext, LanguageContext, SchoolContext, ThemeContext
│       │   ├── pages/           # Feature views (Students, Exams, Staff, Routine, etc.)
│       │   ├── utils/           # Bikram Sambat date parser, IEMIS Excel tools
│       │   ├── App.tsx          # Main routing & application layout
│       │   └── main.tsx
│       └── package.json
│
├── packages/
│   └── shared/                  # Shared TypeScript types, constants & calendar logic
│       └── src/
│           ├── constants/       # Bikram Sambat calendar data & system permissions
│           └── types/           # Cross-package TypeScript interfaces
│
├── data/                        # Local embedded database directory (sms_pg)
├── docs/                        # Detailed architectural and API documentation
├── run-sms.bat                  # One-click Windows development launcher
├── stop-sms.bat                 # One-click Windows server stopper
├── .env.example                 # Environment configuration template
└── package.json                 # Monorepo root configuration
```

---

## 🚀 Quick Start Guide (सुरुवात गर्ने तरिका)

### Prerequisites (आवश्यक सफ्टवेयर)
* **Node.js**: `v18.x` वा `v20.x` वा माथि ([Download Node.js](https://nodejs.org/))
* **Git**: स्थापित भएको हुनुपर्नेछ

---

### Method A: One-Click Launcher (Windows प्रयोगकर्ताका लागि सबैभन्दा सजिलो)

1. रिपोजिटरी क्लोन गर्नुहोस्:
   ```cmd
   git clone https://github.com/nidhi7733/SMS.git
   cd SMS
   ```
2. निर्भरताहरू (Dependencies) इन्स्टल गर्नुहोस्:
   ```cmd
   npm install
   ```
3. सिधै `run-sms.bat` मा डबल क्लिक गर्नुहोस् वा टर्मिनलमा चलाउनुहोस्:
   ```cmd
   run-sms.bat
   ```
   *यसले स्वतः Backend API (Port 4000) र Frontend Web (Port 5173) सुरु गरी ब्राउजरमा प्रणाली खोल्नेछ।*

4. बन्द गर्नका लागि `stop-sms.bat` चलाउनुहोस्:
   ```cmd
   stop-sms.bat
   ```

---

### Method B: Manual Command Line (Developer Mode)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *(स्थानीय विकासका लागि `.env` मा कुनै परिवर्तन नगरी सिधै काम गर्न सकिन्छ। प्रणालीले शून्य कन्फिगरेसनमा `./data/sms_pg` मा Embedded PostgreSQL प्रयोग गर्दछ।)*

3. **Initialize Database & Seed Data:**
   ```bash
   npm run db:seed
   ```

4. **Start Both Servers Concurrently:**
   ```bash
   npm run dev
   ```
   - Frontend Application: [http://localhost:5173](http://localhost:5173)
   - Backend API Server: [http://localhost:4000](http://localhost:4000)
   - API Health Check: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 🔑 Default Login Credentials (पूर्वनिर्धारित लगइन विवरण)

डाटाबेस सिड भएपछि निम्न प्रयोगकर्ताहरूबाट परीक्षण गर्न सकिन्छ:

| Role (भूमिका) | Username | Password | Access Level (पहुँच) |
|---|---|---|---|
| **System Admin** | `admin` | `Password123!` | सम्पूर्ण प्रणालीमा असीमित पहुँच |
| **Principal (प्रधानाध्यापक)** | `principal` | `Password123!` | शैक्षिक, परीक्षा अनलक तथा कर्मचारी नियन्त्रण |
| **Class Teacher / Subject Teacher** | `teacher1` | `Password123!` | आफूलाई तोकिएका कक्षा र विषयको मात्र अंक प्रविष्टि |

---

## ⚙️ Environment Configuration (`.env`)

| Variable | Default Value | Description |
|---|---|---|
| `NODE_ENV` | `development` | चलिरहेको वातावरण (`development` वा `production`) |
| `PORT` | `4000` | ब्याकइन्ड एपीआई पोर्ट |
| `HOST` | `0.0.0.0` | ब्याकइन्ड होस्ट ठेगाना |
| `JWT_SECRET` | *(Random 32+ char key)* | प्रमाणीकरण टोकन इन्क्रिप्सन कुञ्जी (Production मा अनिवार्य फेर्नुहोस्) |
| `JWT_EXPIRES_IN` | `7d` | लगइन सेसन अवधि |
| `DATABASE_URL` | *(Blank for PGlite)* | Production PostgreSQL जडान स्ट्रिङ (खाली भए स्थानीय PGlite प्रयोग हुन्छ) |
| `CORS_ORIGIN` | `http://localhost:5173` | अनुमति प्राप्त डोमेनहरू (कम-सेपरेटेड वा `*`) |
| `RATE_LIMIT_MAX` | `200` | DDoS सुरक्षाका लागि प्रति मिनेट अधिकतम अनुरोध सीमा |
| `BODY_LIMIT_MB` | `15` | Excel र विद्यार्थी फोटो अपलोडका लागि अधिकतम फाइल सीमा |

---

## 📑 Detailed Documentation (थप विस्तृत कागजात)

- 🏛️ [प्रणाली संरचना तथा डाटाबेस डिजाइन (System Architecture)](docs/ARCHITECTURE.md)
- 🔌 [एपीआई इन्डपोइन्ट सूची तथा ढाँचा (API Documentation)](docs/API_DOCUMENTATION.md)
- 📘 [प्रयोगकर्ता निर्देशिका - नेपाली (User Manual in Nepali)](docs/USER_MANUAL_NP.md)

---

## 🛡️ Security & Production Readiness (सुरक्षा नीति)

1. **Helmet & Security Headers**: सुरक्षा हेडरहरू स्वतः लागू।
2. **Brute Force & Rate Limiting**: लगइन इन्डपोइन्टमा प्रति मिनेट कडा दर-सीमा।
3. **Password Hashing**: Bcrypt मार्फत सुरक्षित पासवर्ड ह्यासिङ।
4. **Audit Trail**: संवेदनशील कार्यहरू (`audit_logs` तालिकामा) स्थायी रूपमा सुरक्षित।
5. **Role-Based Guards**: ब्याकइन्डमा प्रत्येक अनुरोधमा टोकन र भूमिका प्रमाणीकरण।

---

## 🤝 Contribution & License

यो सफ्टवेयर नेपालको विद्यालय शिक्षाको गुणस्तर सुधार र डिजिटलाइजेसनका लागि निर्माण गरिएको हो।
- **License**: [ISC License](LICENSE)
- **Maintainer**: Nidhi & Team
