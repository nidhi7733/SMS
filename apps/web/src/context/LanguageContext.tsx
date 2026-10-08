import React, { createContext, useContext, useState, useEffect } from 'react';
import { toDevanagariDigits } from '@sms/shared';

export type Language = 'en' | 'np';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  formatNumber: (val: number | string) => string;
}

const translations: Record<string, { en: string; np: string }> = {
  // Brand & General
  'app.title': { en: 'School Management System', np: 'विद्यालय व्यवस्थापन प्रणाली' },
  'app.nepal_gov': { en: 'Government of Nepal | CEHRD Aligned', np: 'नेपाल सरकार | CEHRD अनुरूप' },
  'app.academic_year': { en: 'Academic Year', np: 'शैक्षिक सत्र' },
  'app.fiscal_year': { en: 'Fiscal Year', np: 'आर्थिक वर्ष' },
  
  // Navigation
  'nav.dashboard': { en: 'Dashboard', np: 'गृहपृष्ठ' },
  'nav.school_settings': { en: 'School Settings', np: 'विद्यालय सेटिङ' },
  'nav.users_roles': { en: 'Users & Roles', np: 'प्रयोगकर्ता र भूमिका' },
  'nav.academic': { en: 'Academic Structure', np: 'शैक्षिक संरचना' },
  'nav.admissions': { en: 'Students & Admissions', np: 'विद्यार्थी तथा भर्ना' },
  'nav.staff': { en: 'Teachers & Staff', np: 'शिक्षक तथा कर्मचारी' },
  'nav.attendance': { en: 'Attendance & Register', np: 'हाजिरी तथा खाता' },
  'nav.calendar': { en: 'School Calendar', np: 'शैक्षिक क्यालेन्डर' },
  'nav.timetable': { en: 'Weekly Routine', np: 'कक्षा समय-तालिका' },
  'nav.fees': { en: 'Fee Collection', np: 'शुल्क संकलन' },
  'nav.accounting': { en: 'Double-Entry Accounting', np: 'दोहोरो लेखा प्रणाली' },
  'nav.inventory': { en: 'Inventory & Assets', np: 'जिन्सी तथा सम्पत्ति' },
  'nav.accounts': { en: 'Double-Entry Accounts', np: 'दोहोरो लेखा प्रणाली' },

  'nav.library': { en: 'Library Management', np: 'पुस्तकालय' },
  'nav.exams': { en: 'Examinations (CDC)', np: 'परीक्षा (CDC/NEB)' },
  'nav.certificates': { en: 'Certificates (SLC/SEE)', np: 'प्रमाणपत्र (SLC/चारित्रिक)' },
  'nav.documents': { en: 'Documents & QR', np: 'कागजात र क्युआर' },
  'nav.logout': { en: 'Log Out', np: 'लग आउट' },

  // Login
  'login.title': { en: 'Sign in to School Portal', np: 'विद्यालय पोर्टलमा प्रवेश गर्नुहोस्' },
  'login.subtitle': { en: 'Bilingual Nepali Government School Management System', np: 'नेपाली सरकारी विद्यालय व्यवस्थापन प्रणाली' },
  'login.username': { en: 'Username', np: 'प्रयोगकर्ता नाम' },
  'login.password': { en: 'Password', np: 'गोप्य पासवर्ड' },
  'login.btn': { en: 'Sign In', np: 'लगइन गर्नुहोस्' },
  'login.quick_demo': { en: 'Quick Demo Access', np: 'छिटो परीक्षण खाताहरू' },

  // Dashboard
  'dash.welcome': { en: 'Welcome back', np: 'स्वागत छ' },
  'dash.school_code': { en: 'School Code', np: 'विद्यालय कोड' },
  'dash.iemis_code': { en: 'IEMIS Code', np: 'IEMIS कोड' },
  'dash.system_status': { en: 'System Status', np: 'प्रणाली स्थिति' },
  'dash.active': { en: 'Online / Local Synced', np: 'सक्रिय / स्थानीय सिंक' },
  'dash.total_users': { en: 'Configured Users', np: 'दर्ता प्रयोगकर्ताहरू' },
  'dash.total_roles': { en: 'Active Roles', np: 'सक्रिय भूमिकाहरू' },
  'dash.shifts': { en: 'Operating Shifts', np: 'सञ्चालित सिफ्टहरू' },
  'dash.shifts_val': { en: 'Morning & Day', np: 'बिहानी र दिवा' },
  'dash.stage_banner_title': { en: 'Stage 1 Architecture Active', np: 'पहिलो चरणको पूर्वाधार सक्रिय' },
  'dash.stage_banner_desc': { en: 'Multi-tenant database, Role-Based Access Control (RBAC), and Audit Trail initialized locally.', np: 'बहु-विद्यालय डेटाबेस, भूमिका-आधारित पहुँच नियन्त्रण (RBAC), र अडिट लग सफलतापूर्वक सञ्चालनमा छ।' },

  // School Settings
  'school.info': { en: 'Institutional Information', np: 'विद्यालय सम्बन्धी विवरण' },
  'school.name_en': { en: 'School Name (English)', np: 'विद्यालयको नाम (अंग्रेजी)' },
  'school.name_np': { en: 'School Name (Nepali)', np: 'विद्यालयको नाम (नेपाली)' },
  'school.motto_en': { en: 'Motto (English)', np: 'आदर्श वाक्य (अंग्रेजी)' },
  'school.motto_np': { en: 'Motto (Nepali)', np: 'आदर्श वाक्य (नेपाली)' },
  'school.address': { en: 'Address & Municipal Structure', np: 'ठेगाना तथा स्थानीय तह' },
  'school.province': { en: 'Province', np: 'प्रदेश' },
  'school.district': { en: 'District', np: 'जिल्ला' },
  'school.local_level': { en: 'Municipality / Rural Municipality', np: 'नगरपालिका / गाउँपालिका' },
  'school.ward': { en: 'Ward Number', np: 'वडा नम्बर' },
  'school.phone': { en: 'Official Phone', np: 'सम्पर्क फोन' },
  'school.email': { en: 'Official Email', np: 'ईमेल ठेगाना' },
  'school.save': { en: 'Save Changes', np: 'परिवर्तन सुरक्षित गर्नुहोस्' },
  'school.saved_success': { en: 'School profile updated successfully', np: 'विद्यालयको विवरण सफलतापूर्वक अद्यावधिक भयो' },

  // Users & Roles
  'users.title': { en: 'System Users', np: 'प्रणालीका प्रयोगकर्ताहरू' },
  'users.subtitle': { en: 'Manage staff credentials and role assignments', np: 'कर्मचारी खाता तथा भूमिका बाँडफाँड व्यवस्थापन' },
  'users.add_user': { en: 'Create New User', np: 'नयाँ प्रयोगकर्ता थप्नुहोस्' },
  'users.full_name': { en: 'Full Name', np: 'पूरा नाम' },
  'users.role': { en: 'Assigned Role', np: 'तोकिएको भूमिका' },
  'users.status': { en: 'Status', np: 'स्थिति' },
  'users.actions': { en: 'Actions', np: 'कार्यहरू' },
  'users.edit_user': { en: 'Edit User', np: 'प्रयोगकर्ता सम्पादन' },
  'users.delete_user': { en: 'Delete User', np: 'प्रयोगकर्ता मेटाउनुहोस्' },
  'users.admin_only': { en: 'System Administrator Control Only', np: 'सिस्टम प्रशासकको मात्र अधिकार' },
  'users.confirm_delete': { en: 'Are you sure you want to permanently delete this user?', np: 'के तपाईं यो प्रयोगकर्तालाई स्थायी रूपमा मेटाउन निश्चित हुनुहुन्छ?' },
  'users.cannot_delete_self': { en: 'Cannot delete your own account', np: 'आफ्नै खाता मेटाउन मिल्दैन' },
  'users.roles_matrix': { en: 'Role & Permission Matrix', np: 'भूमिका र अनुमतिहरूको तालिका' },
  'users.all_permissions': { en: 'Permissions', np: 'अनुमतिहरू' },
  'roles.save_permissions': { en: 'Save Role Permissions', np: 'भूमिकाका अनुमतिहरू सुरक्षित गर्नुहोस्' },
  'roles.select_all': { en: 'Select All', np: 'सबै चयन' },
  'roles.deselect_all': { en: 'Deselect All', np: 'सबै हटाउनुहोस्' },
  'roles.edit_mode': { en: 'Edit Permissions', np: 'अनुमति परिमार्जन गर्नुहोस्' },
  'roles.saved_success': { en: 'Role permissions saved successfully', np: 'भूमिकाका अनुमतिहरू सफलतापूर्वक सुरक्षित भयो' },

  // Stage 2: Academic Structure
  'academic.title': { en: 'Academic Structure & Curriculum', np: 'शैक्षिक संरचना तथा पाठ्यक्रम' },
  'academic.subtitle': { en: 'Classes ECD–12, Sections, Higher Secondary Streams, and CDC Subjects', np: 'प्रारम्भिक बाल विकास देखि कक्षा १२, खण्ड, संकाय र पाठ्यक्रम व्यवस्थापन' },
  'academic.classes': { en: 'Classes & Sections', np: 'कक्षा र खण्डहरू' },
  'academic.streams': { en: 'Higher Secondary Streams', np: 'कक्षा ११–१२ का संकायहरू' },
  'academic.subjects': { en: 'Subjects Catalog (CDC)', np: 'पाठ्यक्रम तथा विषयहरू' },
  'academic.houses': { en: 'Houses & Activities', np: 'सदन तथा अतिरिक्त क्रियाकलाप' },
  'academic.years': { en: 'Academic Sessions (BS/AD)', np: 'शैक्षिक सत्र (वि.सं./ई.सं.)' },
  'academic.add_section': { en: 'Add Section', np: 'नयाँ खण्ड थप्नुहोस्' },
  'academic.add_subject': { en: 'Add Subject', np: 'नयाँ विषय थप्नुहोस्' },
  'academic.shift': { en: 'Shift', np: 'सिफ्ट' },
  'academic.capacity': { en: 'Capacity', np: 'क्षमता' },
  'academic.class_teacher': { en: 'Class Teacher', np: 'कक्षा शिक्षक' },
  'academic.credit_hours': { en: 'Credit Hours', np: 'क्रेडिट घण्टा' },
  'academic.theory_marks': { en: 'Theory Marks', np: 'सैद्धान्तिक पूर्णांक' },
  'academic.practical_marks': { en: 'Practical Marks', np: 'प्रयोगात्मक पूर्णांक' },
  'academic.theory_pass': { en: 'Theory Pass Marks', np: 'सैद्धान्तिक उत्तीर्णांक' },
  'academic.practical_pass': { en: 'Practical Pass Marks', np: 'प्रयोगात्मक उत्तीर्णांक' },
  'academic.edit_section': { en: 'Edit Section', np: 'खण्ड सम्पादन' },
  'academic.delete_section': { en: 'Delete Section', np: 'खण्ड मेटाउनुहोस्' },
  'academic.edit_subject': { en: 'Edit Subject', np: 'विषय सम्पादन' },
  'academic.delete_subject': { en: 'Delete Subject', np: 'विषय मेटाउनुहोस्' },

  // Stage 2: Student Directory & Admissions
  'students.title': { en: 'Student Directory & Admissions', np: 'विद्यार्थी अभिलेख तथा भर्ना' },
  'students.subtitle': { en: 'Student Profiles, Health Records, Multi-Guardian Contacts, and Promotions', np: 'विद्यार्थी प्रोफाइल, स्वास्थ्य विवरण, अभिभावक सम्पर्क र कक्षा स्तरोन्नति' },
  'students.admit_student': { en: 'Admit New Student', np: 'नयाँ विद्यार्थी भर्ना' },
  'students.bulk_promote': { en: 'Bulk Promotion', np: 'कक्षा स्तरोन्नति (प्रमोसन)' },
  'students.student_id': { en: 'Student ID', np: 'विद्यार्थी आईडी' },
  'students.iemis_id': { en: 'IEMIS Code', np: 'IEMIS कोड' },
  'students.name': { en: 'Student Name', np: 'विद्यार्थीको नाम' },
  'students.class_section': { en: 'Class / Section', np: 'कक्षा / खण्ड' },
  'students.roll_no': { en: 'Roll No', np: 'रोल नं' },
  'students.dob': { en: 'Date of Birth', np: 'जन्म मिति' },
  'students.gender': { en: 'Gender', np: 'लिङ्ग' },
  'students.blood_group': { en: 'Blood Group', np: 'रक्त समूह' },
  'students.guardian': { en: 'Guardian', np: 'अभिभावक' },
  'students.guardian_phone': { en: 'Guardian Phone', np: 'अभिभावक फोन' },
  'students.inclusion': { en: 'Inclusion Category', np: 'समावेशी समूह' },
  'students.health_title': { en: 'Medical & Health Information', np: 'स्वास्थ्य तथा चिकित्सा विवरण' },
  'students.allergies': { en: 'Known Allergies', np: 'एलर्जी / औषधि संवेदनशीलता' },
  'students.chronic_conditions': { en: 'Chronic Conditions', np: 'दीर्घकालीन स्वास्थ्य समस्या' },
  'students.regular_meds': { en: 'Regular Medications', np: 'नियमित सेवन गर्ने औषधि' },
  'students.emergency_hospital': { en: 'Preferred Hospital / Health Post', np: 'आकस्मिक स्वास्थ्य संस्था / अस्पताल' },
  'students.immunization': { en: 'Immunization Status', np: 'खोपको स्थिति' },
  'students.medical_notes': { en: 'Medical & Dietary Notes', np: 'विशेष स्वास्थ्य / खानपान कैफियत' },
  'students.view_profile': { en: 'View Dossier', np: 'पूर्ण विवरण' },
  'students.save_student': { en: 'Enroll Student', np: 'विद्यार्थी दर्ता गर्नुहोस्' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('sms_lang') as Language) || 'np'; // Default to Nepali
  });

  useEffect(() => {
    localStorage.setItem('sms_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const item = translations[key];
    if (!item) return key;
    return item[language] || item.en || key;
  };

  const formatNumber = (val: number | string): string => {
    if (language === 'np') {
      return toDevanagariDigits(val);
    }
    return String(val);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
