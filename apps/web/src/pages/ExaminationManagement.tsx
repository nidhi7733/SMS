import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import {
  GraduationCap,
  Award,
  BookOpen,
  FileSpreadsheet,
  Printer,
  PlusCircle,
  Save,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Users,
  Eye,
  X,
  School,
  FileText,
  Check,
  CheckSquare,
  Square,
  Hash,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface ExamItem {
  id: string;
  schoolId: string;
  academicYearId: string;
  nameEn: string;
  nameNp: string;
  examType: string;
  startDateBs?: string;
  endDateBs?: string;
  isResultPublished: boolean;
  isMarksLocked: boolean;
  description?: string;
  createdAt: string;
}

interface StudentMarksRow {
  studentId: string;
  studentCode: string;
  studentNameEn: string;
  studentNameNp: string;
  rollNumber?: number;
  theoryMarks: number | string;
  practicalMarks: number | string;
  casParticipation?: number | string;
  casProjectPractical?: number | string;
  casDiscipline?: number | string;
  casTerminalExam?: number | string;
  isAbsent: boolean;
  remarks?: string;
  // Computed
  totalMarks?: number;
  percentage?: number;
  thGrade?: string;
  prGrade?: string;
  grade?: string;
  gradePoint?: number;
}

interface StudentCasRatingRow {
  studentId: string;
  studentCode: string;
  studentNameEn: string;
  studentNameNp: string;
  rollNumber?: number;
  levelRating: number; // 1, 2, 3, 4
  achievementRemarks: string;
  themeName?: string;
}

interface TeacherAllotmentResponse {
  isAdmin: boolean;
  isAllAllowed: boolean;
  staffId: string | null;
  teacherName: string;
  allotments: Array<{ classId: string; sectionId: string | null; subjectId: string }>;
}

export const ExaminationManagement: React.FC = () => {
  const { t, formatNumber, language } = useLanguage();
  const isNp = language === 'np';
  const { school } = useSchool();

  const [activeTab, setActiveTab] = useState<'EXAMS' | 'ENTRY' | 'LEDGER' | 'REPORT' | 'ADMIT_CARD'>('EXAMS');

  // Metadata
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Selection states
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Class Level Detection
  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const isClass1To3 = useMemo(() => {
    if (!selectedClassObj) return false;
    return ['ECD', '1', '2', '3'].includes(selectedClassObj.code);
  }, [selectedClassObj]);

  // Marks Entry State (Class 4-12)
  const [marksRows, setMarksRows] = useState<StudentMarksRow[]>([]);
  // CAS Ratings State (Class 1-3)
  const [cas1To3Rows, setCas1To3Rows] = useState<StudentCasRatingRow[]>([]);

  const [isExamLocked, setIsExamLocked] = useState(false);
  const [activeSubjectMeta, setActiveSubjectMeta] = useState<any>(null);

  // Teacher Subject Allotment & Single Submission Lock States
  const [myAllotments, setMyAllotments] = useState<TeacherAllotmentResponse>({
    isAdmin: true,
    isAllAllowed: true,
    staffId: null,
    teacherName: '',
    allotments: [],
  });
  const [entryStatus, setEntryStatus] = useState<'DRAFT' | 'SUBMITTED' | 'NOT_ENTERED'>('NOT_ENTERED');
  const [isLockedForUser, setIsLockedForUser] = useState(false);
  const [canUnlock, setCanUnlock] = useState(false);
  const [isAllotted, setIsAllotted] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Tab 5: Applications & Admit Cards states
  const [applications, setApplications] = useState<any[]>([]);
  const [appSummary, setAppSummary] = useState({
    totalCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    printedCount: 0,
  });
  const [appClassId, setAppClassId] = useState<string>('ALL');
  const [appSectionId, setAppSectionId] = useState<string>('ALL');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('ALL');
  const [appSearch, setAppSearch] = useState<string>('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingSymbols, setIsGeneratingSymbols] = useState(false);
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState(false);
  const [symbolPrefix, setSymbolPrefix] = useState('2083-10-');
  const [symbolStart, setSymbolStart] = useState(1);
  const [symbolPad, setSymbolPad] = useState(3);
  const [isPrintingAdmitCard, setIsPrintingAdmitCard] = useState(false);

  // Ledger State
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Grade Sheet State
  const [gradesheetData, setGradesheetData] = useState<any>(null);
  const [reportStudents, setReportStudents] = useState<any[]>([]);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Exam Modal
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    nameEn: '',
    nameNp: '',
    examType: 'TERMINAL_1',
    academicYearId: '',
    startDateBs: '2083-03-20',
    endDateBs: '2083-03-29',
    description: '',
  });

  const token = localStorage.getItem('sms_token') || '';

  // 1. Initial Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [resExams, resClasses, resSections, resSubjects, resYears, resAllotments] = await Promise.all([
        fetch('/api/exams', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/classes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/sections', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/subjects', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/academic/years', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/exams/my-allotments', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const examsData = await resExams.json();
      const classesData = await resClasses.json();
      const sectionsData = await resSections.json();
      const subjectsData = await resSubjects.json();
      const yearsData = await resYears.json();

      let allotData: TeacherAllotmentResponse = {
        isAllAllowed: true,
        allotments: [],
        isAdmin: true,
        staffId: null,
        teacherName: '',
      };
      if (resAllotments.ok) {
        allotData = await resAllotments.json();
        setMyAllotments(allotData);
      }

      const examList = examsData.exams || [];
      setExams(examList);
      if (examList.length > 0) {
        setSelectedExamId(examList[0].id);
      }

      const classList = classesData.classes || [];
      setClasses(classList);

      // Determine initial class based on role/allotments
      if (!allotData.isAllAllowed && allotData.allotments.length > 0) {
        const firstAllot = allotData.allotments[0];
        setSelectedClassId(firstAllot.classId);
        setSelectedSubjectId(firstAllot.subjectId);
        if (firstAllot.sectionId) setSelectedSectionId(firstAllot.sectionId);
      } else {
        const c10 = classList.find((c: any) => c.code === '10') || classList[0];
        if (c10) setSelectedClassId(c10.id);
      }

      setSections(sectionsData.sections || []);
      setSubjects(subjectsData.subjects || []);
      const yrs = yearsData.years || [];
      setAcademicYears(yrs);
      if (yrs.length > 0) {
        setNewExamForm((prev) => ({ ...prev, academicYearId: yrs[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Error initializing examination portal');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter classes for Marks Entry based on Teacher Allotments
  const entryClasses = useMemo(() => {
    if (myAllotments.isAllAllowed) return classes;
    const allowedClassIds = new Set(myAllotments.allotments.map((a) => a.classId));
    return classes.filter((c) => allowedClassIds.has(c.id));
  }, [classes, myAllotments]);

  // Ensure selectedClassId is valid for teacher when in ENTRY tab
  useEffect(() => {
    if (activeTab === 'ENTRY' && !myAllotments.isAllAllowed && entryClasses.length > 0) {
      if (!entryClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(entryClasses[0].id);
      }
    }
  }, [activeTab, myAllotments, entryClasses, selectedClassId]);

  // Filter sections by selected class
  const filteredSections = useMemo(() => {
    if (!selectedClassId) return [];
    return sections.filter((s) => s.classId === selectedClassId);
  }, [sections, selectedClassId]);

  // Set default section when class changes
  useEffect(() => {
    if (filteredSections.length > 0 && !filteredSections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(filteredSections[0].id);
    }
  }, [filteredSections]);

  // Filter subjects for Marks Entry based on Teacher Allotments
  const entrySubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const classSubs = subjects.filter((sub) => sub.classId === selectedClassId);
    if (myAllotments.isAllAllowed) return classSubs;
    const allowedSubIds = new Set(
      myAllotments.allotments
        .filter((a) => a.classId === selectedClassId)
        .map((a) => a.subjectId)
    );
    return classSubs.filter((sub) => allowedSubIds.has(sub.id));
  }, [subjects, selectedClassId, myAllotments]);

  // Set default subject when entry subjects change
  useEffect(() => {
    if (entrySubjects.length > 0 && !entrySubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(entrySubjects[0].id);
    }
  }, [entrySubjects]);

  // CDC Letter Grading 2078 helper for live UI calculation
  const calculateLetter = (
    thVal: number,
    prVal: number,
    thF: number,
    prF: number,
    thPass: number,
    prPass: number,
    isAbs: boolean
  ) => {
    if (isAbs) {
      return { thGrade: 'ABS', prGrade: prF > 0 ? 'ABS' : '—', grade: 'NG', point: 0.0 };
    }

    const thPct = thF > 0 ? (thVal / thF) * 100 : 100;
    const prPct = prF > 0 ? (prVal / prF) * 100 : 100;

    const calcSingleGrade = (pct: number) => {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+';
      if (pct >= 60) return 'B';
      if (pct >= 50) return 'C+';
      if (pct >= 40) return 'C';
      if (pct >= 35) return 'D';
      return 'NG';
    };

    const thGrade = thVal >= thPass ? calcSingleGrade(thPct) : 'NG';
    const prGrade = prF > 0 ? (prVal >= prPass ? calcSingleGrade(prPct) : 'NG') : '—';

    // CDC 2078: Must secure at least 35% in theory and 40% in practical!
    if (thVal < thPass || (prF > 0 && prVal < prPass)) {
      return { thGrade, prGrade, grade: 'NG', point: 0.0 };
    }

    const total = thVal + prVal;
    const full = thF + prF;
    const overallPct = full > 0 ? (total / full) * 100 : 0;

    if (overallPct >= 90) return { thGrade, prGrade, grade: 'A+', point: 4.0 };
    if (overallPct >= 80) return { thGrade, prGrade, grade: 'A', point: 3.6 };
    if (overallPct >= 70) return { thGrade, prGrade, grade: 'B+', point: 3.2 };
    if (overallPct >= 60) return { thGrade, prGrade, grade: 'B', point: 2.8 };
    if (overallPct >= 50) return { thGrade, prGrade, grade: 'C+', point: 2.4 };
    if (overallPct >= 40) return { thGrade, prGrade, grade: 'C', point: 2.0 };
    if (overallPct >= 35) return { thGrade, prGrade, grade: 'D', point: 1.6 };
    return { thGrade, prGrade, grade: 'NG', point: 0.0 };
  };

  // 2. Fetch Marks for Marks Entry Tab
  const fetchMarksForEntry = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      setActiveSubjectMeta(sub);

      const params = new URLSearchParams({
        classId: selectedClassId,
        subjectId: selectedSubjectId,
      });
      if (selectedSectionId) params.append('sectionId', selectedSectionId);

      if (isClass1To3) {
        // Fetch Class 1-3 CAS Theme Ratings
        const res = await fetch(`/api/exams/${selectedExamId}/cas-1-3?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load CAS ratings');
        setIsExamLocked(data.isLocked || false);
        setEntryStatus(data.entryStatus || 'DRAFT');
        setIsLockedForUser(Boolean(data.isLockedForUser));
        setCanUnlock(Boolean(data.canUnlock));
        setIsAllotted(data.isAllotted !== undefined ? data.isAllotted : true);
        setCas1To3Rows(data.entries || []);
      } else {
        // Fetch Class 4-12 Marks with CAS sub-components
        const res = await fetch(`/api/exams/${selectedExamId}/marks?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load marks');

        setIsExamLocked(data.isLocked || false);
        setEntryStatus(data.entryStatus || 'DRAFT');
        setIsLockedForUser(Boolean(data.isLockedForUser));
        setCanUnlock(Boolean(data.canUnlock));
        setIsAllotted(data.isAllotted !== undefined ? data.isAllotted : true);

        const thF = sub?.theoryFullMarks || 75;
        const prF = sub?.practicalFullMarks || 25;
        const thP = sub?.theoryPassMarks || Math.round(thF * 0.35);
        const prP = sub?.practicalPassMarks || Math.round(prF * 0.4);

        const rows: StudentMarksRow[] = (data.students || []).map((s: any) => {
          const thNum = s.theoryMarks !== null && s.theoryMarks !== undefined ? Number(s.theoryMarks) : '';
          const prNum = s.practicalMarks !== null && s.practicalMarks !== undefined ? Number(s.practicalMarks) : '';
          const casPart = s.casParticipation !== null && s.casParticipation !== undefined ? Number(s.casParticipation) : '';
          const casProj = s.casProjectPractical !== null && s.casProjectPractical !== undefined ? Number(s.casProjectPractical) : '';
          const casDisc = s.casDiscipline !== null && s.casDiscipline !== undefined ? Number(s.casDiscipline) : '';
          const casTerm = s.casTerminalExam !== null && s.casTerminalExam !== undefined ? Number(s.casTerminalExam) : '';
          const isAbs = s.isAbsent || false;

          const thVal = typeof thNum === 'number' ? thNum : 0;
          const prVal = typeof prNum === 'number' ? prNum : 0;
          const total = isAbs ? 0 : thVal + prVal;
          const pct = thF + prF > 0 ? (total / (thF + prF)) * 100 : 0;
          const { thGrade, prGrade, grade, point } = calculateLetter(thVal, prVal, thF, prF, thP, prP, isAbs);

          return {
            studentId: s.id,
            studentCode: s.studentId,
            studentNameEn: `${s.firstNameEn} ${s.lastNameEn || ''}`.trim(),
            studentNameNp: `${s.firstNameNp} ${s.lastNameNp || ''}`.trim(),
            rollNumber: s.currentRollNumber,
            theoryMarks: thNum,
            practicalMarks: prNum,
            casParticipation: casPart,
            casProjectPractical: casProj,
            casDiscipline: casDisc,
            casTerminalExam: casTerm,
            isAbsent: isAbs,
            remarks: s.remarks || '',
            totalMarks: total,
            percentage: Math.round(pct * 10) / 10,
            thGrade,
            prGrade,
            grade,
            gradePoint: point,
          };
        });

        setMarksRows(rows);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching evaluation data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ENTRY') {
      fetchMarksForEntry();
    }
  }, [activeTab, selectedExamId, selectedClassId, selectedSectionId, selectedSubjectId, isClass1To3]);

  // Handle Marks change in table for Class 4-12
  const handleMarkChange = (
    studentId: string,
    field:
      | 'theoryMarks'
      | 'practicalMarks'
      | 'casParticipation'
      | 'casProjectPractical'
      | 'casDiscipline'
      | 'casTerminalExam'
      | 'isAbsent'
      | 'remarks',
    val: any
  ) => {
    const thF = activeSubjectMeta?.theoryFullMarks || 75;
    const prF = activeSubjectMeta?.practicalFullMarks || 25;
    const thP = activeSubjectMeta?.theoryPassMarks || Math.round(thF * 0.35);
    const prP = activeSubjectMeta?.practicalPassMarks || Math.round(prF * 0.4);

    setMarksRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const updated = { ...r, [field]: val };

        const isAbs = updated.isAbsent;

        // Auto-sum CAS components if one of them is modified
        if (
          field === 'casParticipation' ||
          field === 'casProjectPractical' ||
          field === 'casDiscipline' ||
          field === 'casTerminalExam'
        ) {
          const p1 = Number(updated.casParticipation) || 0;
          const p2 = Number(updated.casProjectPractical) || 0;
          const p3 = Number(updated.casDiscipline) || 0;
          const p4 = Number(updated.casTerminalExam) || 0;
          const sum = p1 + p2 + p3 + p4;
          updated.practicalMarks = sum > 0 ? sum : '';
        }

        const thVal = isAbs ? 0 : typeof updated.theoryMarks === 'number' ? updated.theoryMarks : Number(updated.theoryMarks) || 0;
        const prVal = isAbs ? 0 : typeof updated.practicalMarks === 'number' ? updated.practicalMarks : Number(updated.practicalMarks) || 0;
        const total = isAbs ? 0 : thVal + prVal;
        const pct = thF + prF > 0 ? (total / (thF + prF)) * 100 : 0;
        const { thGrade, prGrade, grade, point } = calculateLetter(thVal, prVal, thF, prF, thP, prP, isAbs);

        return {
          ...updated,
          totalMarks: total,
          percentage: Math.round(pct * 10) / 10,
          thGrade,
          prGrade,
          grade,
          gradePoint: point,
        };
      })
    );
  };

  // Handle Class 1-3 CAS rating change
  const handleCas1To3Change = (
    studentId: string,
    field: 'levelRating' | 'achievementRemarks' | 'themeName',
    val: any
  ) => {
    setCas1To3Rows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        return { ...r, [field]: val };
      })
    );
  };

  // Quick Action: Set all students to Level 3 (राम्रो - Proficient)
  const handleSetAllLevel3 = () => {
    setCas1To3Rows((prev) =>
      prev.map((r) => ({
        ...r,
        levelRating: 3,
        achievementRemarks: 'अपेक्षित सिकाइ उपलब्धि हासिल गरेको',
      }))
    );
  };

  // Save All Marks / Ratings
  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedSubjectId) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isClass1To3) {
        const payload = {
          subjectId: selectedSubjectId,
          ratings: cas1To3Rows.map((r) => ({
            studentId: r.studentId,
            levelRating: Number(r.levelRating) || 3,
            achievementRemarks: r.achievementRemarks,
            themeName: r.themeName,
          })),
        };

        const res = await fetch(`/api/exams/${selectedExamId}/cas-1-3`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save CAS ratings');
        setSuccessMessage('कक्षा १-३ को मूल्याङ्कन सफलतापूर्वक सुरक्षित गरी बुझाइयो (SUBMITTED)!');
        setEntryStatus('SUBMITTED');
        if (!myAllotments.isAllAllowed) {
          setIsLockedForUser(true);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const payload = {
          subjectId: selectedSubjectId,
          marks: marksRows.map((r) => ({
            studentId: r.studentId,
            theoryMarks: r.isAbsent ? null : r.theoryMarks === '' ? null : Number(r.theoryMarks),
            practicalMarks: r.isAbsent ? null : r.practicalMarks === '' ? null : Number(r.practicalMarks),
            casParticipation: r.isAbsent ? null : r.casParticipation === '' ? null : Number(r.casParticipation),
            casProjectPractical: r.isAbsent ? null : r.casProjectPractical === '' ? null : Number(r.casProjectPractical),
            casDiscipline: r.isAbsent ? null : r.casDiscipline === '' ? null : Number(r.casDiscipline),
            casTerminalExam: r.isAbsent ? null : r.casTerminalExam === '' ? null : Number(r.casTerminalExam),
            isAbsent: r.isAbsent,
            remarks: r.remarks,
          })),
        };

        const res = await fetch(`/api/exams/${selectedExamId}/marks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save marks');
        setSuccessMessage('अंकहरू तथा CAS उप-शीर्षकहरू सफलतापूर्वक सुरक्षित गरी बुझाइयो (SUBMITTED)!');
        setEntryStatus('SUBMITTED');
        if (!myAllotments.isAllAllowed) {
          setIsLockedForUser(true);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save evaluation data');
    } finally {
      setIsSaving(false);
    }
  };

  // Admin Unlock Marks for Teacher Editing
  const handleUnlockMarks = async () => {
    if (!selectedExamId || !selectedSubjectId) return;
    setIsUnlocking(true);
    try {
      const res = await fetch(`/api/exams/${selectedExamId}/marks/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectId: selectedSubjectId, classId: selectedClassId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to unlock marks');
      setSuccessMessage('प्राप्ताङ्क पुनः सम्पादनका लागि शिक्षकलाई सफलतापूर्वक अनलक गरियो (Reset to DRAFT)।');
      setEntryStatus('DRAFT');
      setIsLockedForUser(false);
      setCanUnlock(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchMarksForEntry();
    } catch (err: any) {
      setError(err.message || 'Error unlocking marks');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Fetch Applications List for Tab 5
  const fetchApplications = async () => {
    if (!selectedExamId) return;
    setIsAppLoading(true);
    try {
      const params = new URLSearchParams();
      if (appClassId && appClassId !== 'ALL') params.append('classId', appClassId);
      if (appSectionId && appSectionId !== 'ALL') params.append('sectionId', appSectionId);
      if (appStatusFilter && appStatusFilter !== 'ALL') params.append('status', appStatusFilter);
      if (appSearch) params.append('search', appSearch);

      const res = await fetch(`/api/exams/${selectedExamId}/applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load applications');
      setApplications(data.applications || []);
      if (data.summary) {
        setAppSummary(data.summary);
      }
      setSelectedAppIds([]);
    } catch (err: any) {
      setError(err.message || 'Error loading exam applications');
    } finally {
      setIsAppLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ADMIT_CARD' && selectedExamId) {
      fetchApplications();
    }
  }, [activeTab, selectedExamId, appClassId, appSectionId, appStatusFilter]);

  // Bulk / Single Application Status Change
  const handleUpdateAppStatus = async (appIds: string[], status: 'APPROVED' | 'PENDING' | 'REJECTED') => {
    if (!selectedExamId || appIds.length === 0) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/exams/${selectedExamId}/applications/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationIds: appIds, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update application status');
      setSuccessMessage(data.message || `आवेदन स्थिति ${status} मा परिवर्तन गरियो।`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchApplications();
    } catch (err: any) {
      setError(err.message || 'Error updating application status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Generate Sequential Symbol Numbers
  const handleGenerateSymbols = async () => {
    if (!selectedExamId) return;
    setIsGeneratingSymbols(true);
    try {
      const res = await fetch(`/api/exams/${selectedExamId}/applications/generate-symbols`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: appClassId !== 'ALL' ? appClassId : undefined,
          prefix: symbolPrefix,
          startFrom: Number(symbolStart) || 1,
          padLength: Number(symbolPad) || 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate symbol numbers');
      setSuccessMessage(data.message || 'सिम्बोल नम्बरहरू सफलतापूर्वक जारी गरियो।');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsSymbolModalOpen(false);
      fetchApplications();
    } catch (err: any) {
      setError(err.message || 'Error generating symbols');
    } finally {
      setIsGeneratingSymbols(false);
    }
  };

  // Print Admit Cards (Single or Batch)
  const handlePrintAdmitCards = async (filter?: { studentId?: string; classId?: string; sectionId?: string }) => {
    if (!selectedExamId) return;
    setIsPrintingAdmitCard(true);
    try {
      const params = new URLSearchParams();
      if (filter?.studentId) {
        params.append('studentId', filter.studentId);
      } else {
        if (appClassId && appClassId !== 'ALL') params.append('classId', appClassId);
        if (appSectionId && appSectionId !== 'ALL') params.append('sectionId', appSectionId);
      }

      const res = await fetch(`/api/exams/${selectedExamId}/admit-cards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch admit cards');

      const examinees = data.examinees || [];
      if (examinees.length === 0) {
        setError('प्रवेशपत्र छाप्न कुनै स्वीकृत (Approved) परीक्षार्थी भेटिएन।');
        return;
      }

      // Record print count in background
      fetch(`/api/exams/${selectedExamId}/admit-cards/record-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentIds: examinees.map((e: any) => e.studentId) }),
      }).catch(console.error);

      // Render print window (2 cards per A4 page)
      renderAdmitCardsPrintWindow(data.school, data.exam, examinees);

      // Refresh applications after printing to update counters
      setTimeout(() => fetchApplications(), 1500);
    } catch (err: any) {
      setError(err.message || 'Error printing admit cards');
    } finally {
      setIsPrintingAdmitCard(false);
    }
  };

  // Dedicated 2-Cards per A4 Page Admit Card Print Engine
  const renderAdmitCardsPrintWindow = (schoolData: any, examData: any, examineesList: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('कृपया पप-अप (Pop-up) अनुमति दिनुहोस् प्रवेशपत्र मुद्रण गर्नका लागि।');
      return;
    }

    const schoolNameNp = schoolData?.nameNp || school?.nameNp || schoolData?.nameEn || school?.nameEn || 'विद्यालय';
    const schoolNameEn = schoolData?.nameEn || school?.nameEn || schoolData?.nameNp || school?.nameNp || 'School';
    const addressNp = schoolData?.addressNp || school?.addressNp || schoolData?.addressEn || school?.addressEn || '';
    const phone = schoolData?.phone || school?.phone || '';
    const iemisCode = schoolData?.iemisCode || school?.iemisCode || '';
    const logoUrl = schoolData?.logoUrl || school?.logoUrl;
    const examTitle = examData?.nameNp || examData?.nameEn || 'परीक्षा २०८३';

    // Pair examinees into groups of 2 for each A4 sheet
    const pages: any[][] = [];
    for (let i = 0; i < examineesList.length; i += 2) {
      pages.push(examineesList.slice(i, i + 2));
    }

    let pagesHtml = '';

    pages.forEach((pair) => {
      pagesHtml += `<div class="a4-page">`;

      pair.forEach((ex, cardIdx) => {
        const photoHtml = ex.photoUrl
          ? `<img src="${ex.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Student" />`
          : `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; color: #94a3b8; font-size: 10px; font-weight: bold; text-align: center; line-height: 1.2;">
              तस्बिर<br/><span style="font-size: 8.5px; font-family: monospace;">(PP Photo)</span>
             </div>`;

        const subjectsRows = (ex.subjects || []).map((sub: any, sIdx: number) => `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
            <td style="padding: 2.5px 4px; text-align: center; font-family: monospace;">${sIdx + 1}</td>
            <td style="padding: 2.5px 4px; font-family: monospace; font-weight: bold; color: #1e3a8a;">${sub.code}</td>
            <td style="padding: 2.5px 4px; font-weight: 600;">${sub.nameNp || sub.nameEn}</td>
            <td style="padding: 2.5px 4px; text-align: center;">${sub.creditHours || 4}</td>
            <td style="padding: 2.5px 4px; text-align: center; font-family: monospace;">${sub.examDateBs || examData.startDateBs || '—'}</td>
            <td style="padding: 2.5px 4px; text-align: center; font-size: 9px;">${sub.examTime || '10:00 - 1:00'}</td>
            <td style="padding: 2.5px 4px; text-align: center; color: #cbd5e1;">..................</td>
          </tr>
        `).join('');

        const instructionsHtml = (ex.instructionsNp || [
          '१. प्रवेशपत्र बिना परीक्षा हलमा प्रवेश गर्न पाइने छैन।',
          '२. परीक्षा सुरु हुनुभन्दा १५ मिनेट अगावै परीक्षा हलमा प्रवेश गरिसक्नुपर्नेछ।',
          '३. मोबाइल फोन तथा अनाधिकृत इलेक्ट्रोनिक सामग्री निषेध गरिएको छ।',
          '४. उत्तरपुस्तिकामा आफ्नो नाम, सिम्बोल नं र कक्षा प्रष्ट लेख्नुपर्दछ।'
        ]).map((ins: string) => `<li style="margin-bottom: 1.5px;">${ins}</li>`).join('');

        pagesHtml += `
          <div class="admit-card">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 4px;">
              <!-- School Logo -->
              <div style="width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${logoUrl ? `<img src="${logoUrl}" style="max-width: 60px; max-height: 60px; object-fit: contain;" />` : `
                  <div style="width: 52px; height: 52px; border: 2px solid #1e3a8a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #1e3a8a; text-align: center;">
                    विद्यालय<br/>छाप
                  </div>
                `}
              </div>

              <!-- School Info -->
              <div style="flex: 1; text-align: center; padding: 0 8px;">
                <div style="font-size: 8.5px; font-weight: bold; color: #475569; letter-spacing: 0.5px; text-transform: uppercase;">
                  नेपाल सरकार • शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय • पाठ्यक्रम विकास केन्द्र (CDC)
                </div>
                <h2 style="margin: 1px 0; font-size: 17px; font-weight: 900; color: #0f172a; font-family: 'Times New Roman', serif; line-height: 1.1;">
                  ${schoolNameNp}
                </h2>
                <h3 style="margin: 0; font-size: 11.5px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${schoolNameEn}
                </h3>
                <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">
                  ${addressNp} ${phone ? `| फोन: ${phone}` : ''} | IEMIS: <b>${iemisCode}</b>
                </div>
              </div>

              <!-- Student Photo Box -->
              <div style="width: 65px; height: 75px; border: 1.5px solid #0f172a; border-radius: 4px; overflow: hidden; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                ${photoHtml}
              </div>
            </div>

            <!-- Admit Card Title Bar -->
            <div style="background: #0f172a; color: #ffffff; text-align: center; padding: 2.5px 6px; margin: 3px 0 5px 0; border-radius: 3px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 8.5px; font-weight: bold; letter-spacing: 1px;">EXAMINATION ADMIT CARD</span>
              <span style="font-size: 11.5px; font-weight: 900; letter-spacing: 0.5px;">
                प्रवेश-पत्र : ${examTitle}
              </span>
              <span style="font-size: 8.5px; font-family: monospace;">शैक्षिक सत्र: <b>${examData.startDateBs ? examData.startDateBs.slice(0, 4) : '२०८३'}</b></span>
            </div>

            <!-- Student Bio Details Grid -->
            <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 4px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px;">
              <tr>
                <td style="padding: 2.5px 6px; width: 14%; color: #475569;">सिम्बोल नं:</td>
                <td style="padding: 2.5px 6px; width: 36%;">
                  <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #1e3a8a; background: #e0f2fe; padding: 1px 5px; border-radius: 3px; border: 1px solid #7dd3fc;">
                    ${ex.symbolNumber}
                  </span>
                </td>
                <td style="padding: 2.5px 6px; width: 14%; color: #475569;">रोल नं:</td>
                <td style="padding: 2.5px 6px; width: 36%; font-weight: bold; font-family: monospace; font-size: 12px;">
                  ${ex.rollNumber}
                </td>
              </tr>
              <tr>
                <td style="padding: 2.5px 6px; color: #475569;">विद्यार्थीको नाम:</td>
                <td style="padding: 2.5px 6px; font-weight: bold; color: #0f172a;">
                  ${ex.fullNameNp} <span style="font-size: 9.5px; font-weight: normal; color: #475569;">(${ex.fullNameEn})</span>
                </td>
                <td style="padding: 2.5px 6px; color: #475569;">कक्षा / खण्ड:</td>
                <td style="padding: 2.5px 6px; font-weight: bold; color: #0f172a;">
                  ${ex.classNameNp} (${ex.sectionNameNp || ex.sectionCode})
                </td>
              </tr>
              <tr>
                <td style="padding: 2.5px 6px; color: #475569;">जन्म मिति (DOB):</td>
                <td style="padding: 2.5px 6px; font-family: monospace;">
                  ${ex.dobBs || '—'} BS
                </td>
                <td style="padding: 2.5px 6px; color: #475569;">अभिभावक:</td>
                <td style="padding: 2.5px 6px; font-weight: 500;">
                  ${ex.guardianName || '—'} ${ex.phone ? `(${ex.phone})` : ''}
                </td>
              </tr>
            </table>

            <!-- Subjects Examination Schedule Table -->
            <div style="flex: 1; overflow: hidden; margin-bottom: 4px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; border: 1px solid #cbd5e1;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; font-size: 9px; color: #334155; font-weight: bold;">
                    <th style="padding: 2px 4px; width: 22px; text-align: center;">क्र.सं.</th>
                    <th style="padding: 2px 4px; width: 62px;">कोड</th>
                    <th style="padding: 2px 4px;">परीक्षाका विषयहरू (CDC Subjects)</th>
                    <th style="padding: 2px 4px; width: 35px; text-align: center;">क्रेडिट</th>
                    <th style="padding: 2px 4px; width: 70px; text-align: center;">मिति</th>
                    <th style="padding: 2px 4px; width: 65px; text-align: center;">समय</th>
                    <th style="padding: 2px 4px; width: 70px; text-align: center;">निरीक्षक दस्तखत</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectsRows}
                </tbody>
              </table>
            </div>

            <!-- Instructions & Rules -->
            <div style="border: 1px dashed #94a3b8; background: #fffbeb; border-radius: 4px; padding: 2.5px 6px; font-size: 8px; color: #78350f; line-height: 1.25; margin-bottom: 5px;">
              <div style="font-weight: bold; text-decoration: underline; margin-bottom: 1px;">परीक्षार्थीका लागि अनिवार्य निर्देशनहरू:</div>
              <ul style="margin: 0; padding-left: 14px;">
                ${instructionsHtml}
              </ul>
            </div>

            <!-- Signatures Footer -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 2px 10px 0px 10px; font-size: 9.5px; color: #1e293b;">
              <div style="text-align: center;">
                <div style="border-top: 1px solid #475569; width: 95px; padding-top: 2px; font-weight: bold;">कक्षा शिक्षक</div>
                <div style="font-size: 8px; color: #64748b;">Class Teacher</div>
              </div>
              <div style="text-align: center;">
                <div style="width: 65px; height: 32px; border: 1px dashed #94a3b8; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 7.5px; color: #94a3b8; margin: 0 auto 2px auto;">
                  विद्यालय छाप
                </div>
                <div style="font-size: 8px; color: #64748b;">School Seal</div>
              </div>
              <div style="text-align: center;">
                <div style="border-top: 1px solid #475569; width: 125px; padding-top: 2px; font-weight: bold;">परीक्षा नियन्त्रक / प्र.अ.</div>
                <div style="font-size: 8px; color: #64748b;">Controller / Principal</div>
              </div>
            </div>
          </div>
        `;

        if (cardIdx === 0 && pair.length > 1) {
          pagesHtml += `
            <div class="cut-line">
              <span>✂ - - - - - - - - यहाँबाट काट्नुहोस् (Cut Along Dashed Line) - - - - - - - - ✂</span>
            </div>
          `;
        }
      });

      pagesHtml += `</div>`;
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ne">
      <head>
        <meta charset="UTF-8" />
        <title>प्रवेशपत्र मुद्रण - ${examTitle}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background: #e2e8f0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
          .a4-page {
            width: 210mm;
            min-height: 287mm;
            margin: 10px auto;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 4mm 5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            box-sizing: border-box;
          }
          .admit-card {
            border: 2px solid #1e3a8a;
            border-radius: 6px;
            padding: 5px 8px;
            height: 135mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            position: relative;
          }
          .cut-line {
            text-align: center;
            font-size: 9px;
            color: #64748b;
            margin: 1.5mm 0;
            border-top: 1.5px dashed #94a3b8;
            position: relative;
          }
          .cut-line span {
            background: #ffffff;
            padding: 0 10px;
            position: relative;
            top: -6px;
          }
          @media print {
            body {
              background: none;
              padding: 0;
            }
            .a4-page {
              margin: 0 !important;
              padding: 4mm 5mm !important;
              box-shadow: none !important;
              width: 100% !important;
              height: 100% !important;
              page-break-after: always !important;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="position: sticky; top: 0; z-index: 100; background: #0f172a; color: white; padding: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          <div style="font-weight: bold; font-size: 14px;">
            📄 प्रवेशपत्र पूर्वावलोकन (Admit Cards Preview) • कुल ${examineesList.length} परीक्षार्थी (${pages.length} पाना A4)
          </div>
          <button onclick="window.print()" style="padding: 8px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;">
            🖨️ अहिले छाप्नुहोस् (Print Now)
          </button>
        </div>
        ${pagesHtml}
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 3. Fetch Tabulation Ledger
  const fetchLedger = async () => {
    if (!selectedExamId || !selectedClassId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ classId: selectedClassId });
      if (selectedSectionId) params.append('sectionId', selectedSectionId);

      const res = await fetch(`/api/exams/${selectedExamId}/ledger?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate ledger');
      setLedgerData(data);
    } catch (err: any) {
      setError(err.message || 'Error generating tabulation ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LEDGER') {
      fetchLedger();
    }
  }, [activeTab, selectedExamId, selectedClassId, selectedSectionId]);

  // 4. Fetch Grade Sheet
  const fetchGradesheet = async (studentId: string) => {
    if (!selectedExamId || !studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exams/${selectedExamId}/gradesheet/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load grade sheet');
      setGradesheetData(data);
    } catch (err: any) {
      setError(err.message || 'Error loading grade sheet');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch students list for Report Card selection
  useEffect(() => {
    const fetchStudentsForReport = async () => {
      if (!selectedClassId) return;
      try {
        const params = new URLSearchParams({ classId: selectedClassId });
        if (selectedSectionId && selectedSectionId !== 'ALL') {
          params.append('sectionId', selectedSectionId);
        }
        const res = await fetch(`/api/students?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.students) {
          setReportStudents(data.students);
          if (data.students.length > 0) {
            if (!selectedStudentId || !data.students.some((s: any) => s.id === selectedStudentId)) {
              setSelectedStudentId(data.students[0].id);
            }
          } else {
            setSelectedStudentId('');
            setGradesheetData(null);
          }
        }
      } catch (err) {
        console.error('Error fetching students for report:', err);
      }
    };

    fetchStudentsForReport();
  }, [selectedClassId, selectedSectionId, token]);

  useEffect(() => {
    if (activeTab === 'REPORT' && selectedStudentId) {
      fetchGradesheet(selectedStudentId);
    }
  }, [activeTab, selectedExamId, selectedStudentId]);

  // Lock/Unlock Exam
  const handleToggleLockExam = async (examId: string, currentLock: boolean) => {
    try {
      const res = await fetch(`/api/exams/${examId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isLocked: !currentLock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle lock');
      setExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, isMarksLocked: data.exam.isMarksLocked } : e))
      );
      if (selectedExamId === examId) {
        setIsExamLocked(data.exam.isMarksLocked);
      }
      setSuccessMessage(data.exam.isMarksLocked ? 'Exam marks locked successfully.' : 'Exam marks unlocked for editing.');
    } catch (err: any) {
      setError(err.message || 'Lock toggle error');
    }
  };

  // Create New Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamForm.nameEn || !newExamForm.academicYearId) {
      setError('Exam Name and Academic Year are required');
      return;
    }

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newExamForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create exam');

      setExams((prev) => [data.exam, ...prev]);
      setSelectedExamId(data.exam.id);
      setIsAddExamModalOpen(false);
      setSuccessMessage('New examination created successfully!');
    } catch (err: any) {
      setError(err.message || 'Error creating exam');
    }
  };

  // Active selected exam helper
  const currentExam = useMemo(() => {
    return exams.find((e) => e.id === selectedExamId);
  }, [exams, selectedExamId]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-4 sm:p-6 text-white shadow-xl border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-400/30">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>पाठ्यक्रम विकास केन्द्र (CDC) अक्षरांकन निर्देशिका २०७८ अनुरूप</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              {language === 'np'
                ? 'परीक्षा तथा मूल्याङ्कन प्रणाली (CDC Letter Grading)'
                : 'Examination & Evaluation System'}
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
              {language === 'np'
                ? 'त्रैमासिक तथा वार्षिक परीक्षा व्यवस्थापन, विषयगत प्राप्तांक प्रविष्टि, मूल्याङ्कन लेजर र अक्षरांकन सहितको आधिकारिक ग्रेडसिट (Report Card)।'
                : 'Terminal & board exams management, subject theory/practical marks entry, automated 35% pass rule, class tabulation ledger, and official grade sheets.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setIsAddExamModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2 border border-blue-400/40"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{language === 'np' ? 'नयाँ परीक्षा थप्नुहोस्' : 'Create Exam'}</span>
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-indigo-800/60">
          <button
            onClick={() => setActiveTab('EXAMS')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-2 ${
              activeTab === 'EXAMS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-indigo-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>परीक्षा सूची (Exams)</span>
          </button>

          <button
            onClick={() => setActiveTab('ENTRY')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-2 ${
              activeTab === 'ENTRY'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-indigo-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>प्राप्तांक प्रविष्टि (Marks Entry)</span>
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-2 ${
              activeTab === 'LEDGER'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-indigo-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>मूल्याङ्कन लेजर (Tabulation Ledger)</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORT')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-2 ${
              activeTab === 'REPORT'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-indigo-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>ग्रेडसिट / रिपोर्ट कार्ड (Grade Sheet)</span>
          </button>

          <button
            onClick={() => setActiveTab('ADMIT_CARD')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center space-x-2 ${
              activeTab === 'ADMIT_CARD'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-indigo-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>प्रवेशपत्र तथा आवेदन (Admit Cards & Applications)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= TAB 1: EXAMS LIST ================= */}
      {activeTab === 'EXAMS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {exam.examType}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        exam.isMarksLocked
                          ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {exam.isMarksLocked ? 'प्राप्तांक लक' : 'प्रविष्टि खुला'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {isNp ? (exam.nameNp || exam.nameEn) : (exam.nameEn || exam.nameNp)}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {isNp ? exam.nameEn : exam.nameNp}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    <div>
                      📅 मिति: <span className="font-mono">{formatNumber(exam.startDateBs || '2083-03-20')}</span> देखि{' '}
                      <span className="font-mono">{formatNumber(exam.endDateBs || '2083-03-29')}</span> सम्म
                    </div>
                    {exam.description && <div className="text-slate-500 italic mt-1">{exam.description}</div>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setActiveTab('ENTRY');
                    }}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>अंक प्रविष्टि</span>
                  </button>

                  <button
                    onClick={() => handleToggleLockExam(exam.id, exam.isMarksLocked)}
                    className={`p-2 rounded-lg text-xs font-bold transition border ${
                      exam.isMarksLocked
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    }`}
                    title={exam.isMarksLocked ? 'अंक प्रविष्टि अनलक गर्नुहोस्' : 'अंक प्रविष्टि लक गर्नुहोस्'}
                  >
                    {exam.isMarksLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: MARKS ENTRY ================= */}
      {activeTab === 'ENTRY' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
            {/* Exam */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">परीक्षा (Exam):</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {isNp ? (e.nameNp || e.nameEn) : (e.nameEn || e.nameNp)}
                  </option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">कक्षा (Class):</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                {entryClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">खण्ड (Section):</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isNp ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">विषय (Subject):</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                {entrySubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {isNp ? (sub.nameNp || sub.nameEn) : (sub.nameEn || sub.nameNp)} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions: Save Button & Admin Unlock */}
            <div className="ml-auto pt-4 md:pt-0 flex items-center space-x-2">
              {canUnlock && (
                <button
                  onClick={handleUnlockMarks}
                  disabled={isUnlocking}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                  title="शिक्षकलाई पुनः सम्पादन गर्न अनुमति दिनुहोस्"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isUnlocking ? 'अनलक गरिँदैछ...' : 'पुनः सम्पादन खुला गर्नुहोस् (Unlock)'}</span>
                </button>
              )}

              <button
                onClick={handleSaveMarks}
                disabled={isSaving || isExamLocked || isLockedForUser}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'सुरक्षित हुँदैछ...'
                    : isLockedForUser
                    ? 'अंक बुझाइसकिएको छ (Locked)'
                    : 'प्राप्तांक सुरक्षित गर्नुहोस्'}
                </span>
              </button>
            </div>
          </div>

          {/* Teacher Subject Allotment Notice (if no subjects allotted to teacher) */}
          {!myAllotments.isAllAllowed && entryClasses.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">कुनै विषय बाँडफाँड (Subject Allotment) गरिएको छैन।</span>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  तपाईंलाई समयतालिका (Routine) वा विषय व्यवस्थापनमा कुनै कक्षा/विषय तोकिएको छैन। कृपया विद्यालय प्रशासन वा प्रधानाध्यापकसँग सम्पर्क गर्नुहोस्।
                </p>
              </div>
            </div>
          )}

          {!isAllotted && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">यो विषय तपाईंलाई बाँडफाँड गरिएको छैन।</span>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  शिक्षकले केवल आफूलाई तोकिएको कक्षा र विषयको मात्र प्राप्ताङ्क प्रविष्टि गर्न पाउनुहुनेछ।
                </p>
              </div>
            </div>
          )}

          {/* Submission Lock Banner */}
          {entryStatus === 'SUBMITTED' && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLockedForUser
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {isLockedForUser ? (
                  <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-sm">
                    {isLockedForUser
                      ? 'प्राप्ताङ्क प्रविष्टि भई बुझाइसकिएको छ (SUBMITTED & LOCKED)।'
                      : 'यो विषयको प्राप्ताङ्क शिक्षकद्वारा बुझाइसकिएको छ (SUBMITTED)।'}
                  </span>
                  <p className="text-xs mt-0.5 opacity-90">
                    {isLockedForUser
                      ? 'शिक्षकले एकपटक बुझाएपछि फेरि सम्पादन गर्न मिल्दैन। कुनै प्राप्ताङ्क सच्याउनु परेमा विद्यालय प्रशासन वा प्रधानाध्यापकसँग सम्पर्क गरी अनलक गराउनुहोस्।'
                      : 'व्यवस्थापक अधिकार (Admin Mode) अनुसार तपाईं सिधै सम्पादन गर्न सक्नुहुन्छ वा शिक्षकलाई सम्पादन दिन अनलक गर्न सक्नुहुन्छ।'}
                  </p>
                </div>
              </div>

              {canUnlock && (
                <button
                  onClick={handleUnlockMarks}
                  disabled={isUnlocking}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow transition flex items-center space-x-1.5 shrink-0 self-start sm:self-center"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isUnlocking ? 'अनलक गरिँदैछ...' : 'शिक्षकका लागि अनलक गर्नुहोस्'}</span>
                </button>
              )}
            </div>
          )}

          {/* Subject Weightage Banner (Adaptive) */}
          {isClass1To3 ? (
            <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/40 to-slate-900/40 border border-emerald-500/40 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-100 shadow-sm">
              <div className="flex items-center space-x-3">
                <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
                  कक्षा १–३ CAS
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    एकीकृत पाठ्यक्रम निरन्तर विद्यार्थी मूल्याङ्कन (CAS)
                  </h4>
                  <p className="text-emerald-300/80 text-[11px] mt-0.5">
                    थिम तथा सिकाइ उपलब्धि स्तर: ४ (धेरै राम्रो: ९०% माथि), ३ (राम्रो: ७०-८९%), २ (सामान्य: ४०-६९%), १ (कमजोर: ४०% मुनि)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSetAllLevel3}
                  disabled={isExamLocked || isLockedForUser}
                  className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg transition border border-emerald-400/50 shadow-sm disabled:opacity-50"
                  title="सबै विद्यार्थीलाई अपेक्षित उपलब्धि 'स्तर ३ (राम्रो)' मा सेट गर्नुहोस्"
                >
                  ⚡ सबैलाई स्तर ३ (राम्रो) मा सेट गर्नुहोस्
                </button>
              </div>
            </div>
          ) : activeSubjectMeta ? (
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {isNp ? (activeSubjectMeta.nameNp || activeSubjectMeta.nameEn) : (activeSubjectMeta.nameEn || activeSubjectMeta.nameNp)} ({activeSubjectMeta.code})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                    क्रेडिट घण्टा: <b>{activeSubjectMeta.creditHours || 4}</b>
                  </span>
                </div>
                <div className="flex items-center space-x-4 font-mono font-bold">
                  <span>
                    सैद्धान्तिक: {activeSubjectMeta.theoryFullMarks || 75} (उत्तीर्णांक: {activeSubjectMeta.theoryPassMarks || 27})
                  </span>
                  <span>
                    प्रयोगात्मक: {activeSubjectMeta.practicalFullMarks || 25} (उत्तीर्णांक: {activeSubjectMeta.practicalPassMarks || 10})
                  </span>
                  <span className="text-indigo-700 dark:text-indigo-300">
                    कुल पूर्णांक: {(activeSubjectMeta.theoryFullMarks || 75) + (activeSubjectMeta.practicalFullMarks || 25)}
                  </span>
                </div>
              </div>

              {/* Standard CAS Breakdown notice */}
              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  📋 CDC आन्तरिक मूल्याङ्कन (CAS) मानक भार:
                </span>
                <div className="flex flex-wrap items-center gap-3 font-mono">
                  <span>१. सहभागिता: <b>४</b></span>
                  <span>•</span>
                  <span>२. प्रयोगात्मक/परियोजना: <b>१६</b></span>
                  <span>•</span>
                  <span>३. आचरण/अनुशासन: <b>२</b></span>
                  <span>•</span>
                  <span>४. त्रैमासिक परीक्षा: <b>३</b></span>
                  <span>=</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">कुल आन्तरिक: २५ अंक</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 font-semibold">लोड हुँदैछ...</div>
            ) : isClass1To3 ? (
              /* ================= CLASS 1-3 CAS TABLE ================= */
              cas1To3Rows.length === 0 ? (
                <div className="p-12 text-center text-slate-500">यस कक्षा र खण्डमा कुनै विद्यार्थी भेटिएन।</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4 w-16">रोल नं</th>
                        <th className="py-3 px-4 w-60">विद्यार्थीको नाम</th>
                        <th className="py-3 px-4 text-center">सिकाइ उपलब्धि स्तर (Achievement Level: १ देखि ४)</th>
                        <th className="py-3 px-4 w-72">शिक्षकको टिप्पणी / पृष्ठपोषण (Remarks)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cas1To3Rows.map((row) => (
                        <tr
                          key={row.studentId}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatNumber(row.rollNumber || '-')}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {row.studentNameNp || row.studentNameEn}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{row.studentCode}</div>
                          </td>

                          {/* Level 1-4 Interactive Segmented Control */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center space-x-2">
                              {[
                                { level: 4, label: 'स्तर ४', sub: 'धेरै राम्रो', bgActive: 'bg-emerald-600 text-white shadow-md border-emerald-600', bgIdle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:border-emerald-300' },
                                { level: 3, label: 'स्तर ३', sub: 'राम्रो', bgActive: 'bg-blue-600 text-white shadow-md border-blue-600', bgIdle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 hover:border-blue-300' },
                                { level: 2, label: 'स्तर २', sub: 'सामान्य', bgActive: 'bg-amber-500 text-white shadow-md border-amber-500', bgIdle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 hover:border-amber-300' },
                                { level: 1, label: 'स्तर १', sub: 'कमजोर', bgActive: 'bg-rose-600 text-white shadow-md border-rose-600', bgIdle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 hover:border-rose-300' },
                              ].map((btn) => (
                                <button
                                  key={btn.level}
                                  type="button"
                                  disabled={isExamLocked || isLockedForUser}
                                  onClick={() => handleCas1To3Change(row.studentId, 'levelRating', btn.level)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center border disabled:opacity-50 ${
                                    row.levelRating === btn.level ? btn.bgActive : btn.bgIdle
                                  }`}
                                >
                                  <span>{btn.label}</span>
                                  <span className="text-[10px] font-normal opacity-90">{btn.sub}</span>
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Remarks with quick options */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <input
                                type="text"
                                disabled={isExamLocked || isLockedForUser}
                                value={row.achievementRemarks || ''}
                                onChange={(e) => handleCas1To3Change(row.studentId, 'achievementRemarks', e.target.value)}
                                placeholder="सिकाइ उपलब्धि सम्बन्धी टिप्पणी..."
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium disabled:opacity-60"
                              />
                              <div className="flex flex-wrap gap-1">
                                {[
                                  'अपेक्षित सिकाइ उपलब्धि हासिल गरेको',
                                  'सक्रिय सहभागिता तथा राम्रो सिर्जनशीलता',
                                  'पठन तथा लेखनमा थप अभ्यास आवश्यक',
                                ].map((phrase) => (
                                  <button
                                    key={phrase}
                                    type="button"
                                    disabled={isExamLocked || isLockedForUser}
                                    onClick={() => handleCas1To3Change(row.studentId, 'achievementRemarks', phrase)}
                                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50 disabled:pointer-events-none"
                                  >
                                    + {phrase.slice(0, 18)}...
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* ================= CLASS 4-12 MARKS + CAS SUB-COMPONENTS TABLE ================= */
              marksRows.length === 0 ? (
                <div className="p-12 text-center text-slate-500">यस कक्षा र खण्डमा कुनै विद्यार्थी भेटिएन।</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">रोल</th>
                        <th className="py-3 px-3 w-48">विद्यार्थीको नाम</th>
                        <th className="py-3 px-2 text-center w-24">
                          <div>सैद्धान्तिक</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Max {activeSubjectMeta?.theoryFullMarks || 75} (Pass {activeSubjectMeta?.theoryPassMarks || 27})
                          </div>
                        </th>
                        <th className="py-3 px-2 text-center w-20 bg-blue-50/50 dark:bg-blue-950/20">
                          <div>सहभागिता</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Max 4</div>
                        </th>
                        <th className="py-3 px-2 text-center w-20 bg-blue-50/50 dark:bg-blue-950/20">
                          <div>परियोजना/प्रयो.</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Max 16</div>
                        </th>
                        <th className="py-3 px-2 text-center w-20 bg-blue-50/50 dark:bg-blue-950/20">
                          <div>अनुशासन</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Max 2</div>
                        </th>
                        <th className="py-3 px-2 text-center w-20 bg-blue-50/50 dark:bg-blue-950/20">
                          <div>त्रैमासिक</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Max 3</div>
                        </th>
                        <th className="py-3 px-2 text-center w-24 bg-blue-100/50 dark:bg-blue-900/30">
                          <div className="font-bold text-blue-900 dark:text-blue-200">कुल आन्तरिक</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                            Max {activeSubjectMeta?.practicalFullMarks || 25} (Pass {activeSubjectMeta?.practicalPassMarks || 10})
                          </div>
                        </th>
                        <th className="py-3 px-2 text-center w-16">अनुपस्थित</th>
                        <th className="py-3 px-2 text-center w-20">कुल प्राप्ताङ्क</th>
                        <th className="py-3 px-2 text-center w-16">Th Gr</th>
                        <th className="py-3 px-2 text-center w-16">Pr Gr</th>
                        <th className="py-3 px-2 text-center w-20 font-bold">अन्तिम ग्रेड</th>
                        <th className="py-3 px-2 text-center w-14">GP</th>
                        <th className="py-3 px-3">कैफियत</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {marksRows.map((row) => (
                        <tr
                          key={row.studentId}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatNumber(row.rollNumber || '-')}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {row.studentNameNp || row.studentNameEn}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{row.studentCode}</div>
                          </td>

                          {/* Theory Marks */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={activeSubjectMeta?.theoryFullMarks || 75}
                              disabled={row.isAbsent || isExamLocked || isLockedForUser}
                              value={row.theoryMarks}
                              onChange={(e) => handleMarkChange(row.studentId, 'theoryMarks', e.target.value)}
                              placeholder="0"
                              className={`w-16 px-2 py-1 rounded-lg border text-center font-bold text-xs transition disabled:opacity-60 ${
                                Number(row.theoryMarks) < (activeSubjectMeta?.theoryPassMarks || 27) && row.theoryMarks !== ''
                                  ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              }`}
                            />
                          </td>

                          {/* CAS Sub-component 1: Participation */}
                          <td className="py-2.5 px-2 text-center bg-blue-50/30 dark:bg-blue-950/10">
                            <input
                              type="number"
                              min="0"
                              max="4"
                              disabled={row.isAbsent || isExamLocked || isLockedForUser}
                              value={row.casParticipation ?? ''}
                              onChange={(e) => handleMarkChange(row.studentId, 'casParticipation', e.target.value)}
                              placeholder="0"
                              className="w-14 px-1.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-center font-mono text-xs disabled:opacity-60"
                            />
                          </td>

                          {/* CAS Sub-component 2: Practical/Project */}
                          <td className="py-2.5 px-2 text-center bg-blue-50/30 dark:bg-blue-950/10">
                            <input
                              type="number"
                              min="0"
                              max="16"
                              disabled={row.isAbsent || isExamLocked || isLockedForUser}
                              value={row.casProjectPractical ?? ''}
                              onChange={(e) => handleMarkChange(row.studentId, 'casProjectPractical', e.target.value)}
                              placeholder="0"
                              className="w-14 px-1.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-center font-mono text-xs disabled:opacity-60"
                            />
                          </td>

                          {/* CAS Sub-component 3: Discipline */}
                          <td className="py-2.5 px-2 text-center bg-blue-50/30 dark:bg-blue-950/10">
                            <input
                              type="number"
                              min="0"
                              max="2"
                              disabled={row.isAbsent || isExamLocked || isLockedForUser}
                              value={row.casDiscipline ?? ''}
                              onChange={(e) => handleMarkChange(row.studentId, 'casDiscipline', e.target.value)}
                              placeholder="0"
                              className="w-14 px-1.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-center font-mono text-xs disabled:opacity-60"
                            />
                          </td>

                          {/* CAS Sub-component 4: Terminal */}
                          <td className="py-2.5 px-2 text-center bg-blue-50/30 dark:bg-blue-950/10">
                            <input
                              type="number"
                              min="0"
                              max="3"
                              disabled={row.isAbsent || isExamLocked || isLockedForUser}
                              value={row.casTerminalExam ?? ''}
                              onChange={(e) => handleMarkChange(row.studentId, 'casTerminalExam', e.target.value)}
                              placeholder="0"
                              className="w-14 px-1.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-center font-mono text-xs disabled:opacity-60"
                            />
                          </td>

                          {/* Auto-summed Practical Marks */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold bg-blue-100/30 dark:bg-blue-900/20">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                Number(row.practicalMarks) < (activeSubjectMeta?.practicalPassMarks || 10) && row.practicalMarks !== ''
                                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                                  : 'text-blue-900 dark:text-blue-200'
                              }`}
                            >
                              {row.practicalMarks !== '' ? formatNumber(row.practicalMarks) : '-'}
                            </span>
                          </td>

                          {/* Absent Checkbox */}
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.isAbsent}
                              disabled={isExamLocked || isLockedForUser}
                              onChange={(e) => handleMarkChange(row.studentId, 'isAbsent', e.target.checked)}
                              className="w-4 h-4 text-rose-600 rounded border-slate-300 disabled:opacity-50"
                            />
                          </td>

                          {/* Total Marks */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {row.isAbsent ? (
                              <span className="text-rose-500 text-[10px] font-bold">ABSENT</span>
                            ) : (
                              formatNumber(row.totalMarks ?? '-')
                            )}
                          </td>

                          {/* Theory Grade */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                row.thGrade === 'NG'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {row.thGrade || '-'}
                            </span>
                          </td>

                          {/* Practical Grade */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                row.prGrade === 'NG'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {row.prGrade || '-'}
                            </span>
                          </td>

                          {/* Final Grade with CDC 2078 Color Coding */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                row.grade === 'NG'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                  : row.grade === 'A+' || row.grade === 'A'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                  : row.grade === 'B+' || row.grade === 'B'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {row.grade || '-'}
                            </span>
                          </td>

                          {/* Grade Point */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-xs">
                            {row.gradePoint !== undefined ? row.gradePoint.toFixed(1) : '-'}
                          </td>

                          {/* Remarks */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              disabled={isExamLocked || isLockedForUser}
                              value={row.remarks || ''}
                              onChange={(e) => handleMarkChange(row.studentId, 'remarks', e.target.value)}
                              placeholder="कैफियत..."
                              className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs disabled:opacity-60"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: TABULATION LEDGER ================= */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">परीक्षा:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {isNp ? (e.nameNp || e.nameEn) : (e.nameEn || e.nameNp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">कक्षा:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">खण्ड:</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {isNp ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition flex items-center space-x-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>लेजर प्रिन्ट (Print Ledger)</span>
            </button>
          </div>

          {/* Ledger Table */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-semibold">लेजर तयार हुँदैछ...</div>
          ) : !ledgerData ? (
            <div className="p-12 text-center text-slate-500">लेजर लोड गर्न कक्षा र परीक्षा छनोट गर्नुहोस्।</div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              {ledgerData.isIntegratedCas ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-semibold">कुल विद्यार्थी (Total Students)</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      {formatNumber(ledgerData.statistics?.totalStudents || (ledgerData.ledger || []).length)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">पाठ्यक्रम ढाँचा</div>
                    <div className="text-sm font-black text-blue-800 dark:text-blue-200 mt-1">
                      एकीकृत पाठ्यक्रम (कक्षा १-३)
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-emerald-600 font-semibold">मूल्याङ्कन पद्धति</div>
                    <div className="text-sm font-black text-emerald-600 mt-1">
                      १००% निरन्तर मूल्याङ्कन (CAS)
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-purple-600 font-semibold">सिकाइ स्तर वर्गीकरण</div>
                    <div className="text-sm font-black text-purple-700 dark:text-purple-300 mt-1">
                      ४ स्तर (स्तर १ देखि ४ सम्म)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-semibold">कुल विद्यार्थी</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      {formatNumber(ledgerData.statistics?.totalStudents || 0)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-emerald-600 font-semibold">उत्तीर्ण (Passed)</div>
                    <div className="text-xl font-black text-emerald-600 mt-1">
                      {formatNumber(ledgerData.statistics?.passedCount || 0)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-rose-600 font-semibold">अनुत्तीर्ण (NG)</div>
                    <div className="text-xl font-black text-rose-600 mt-1">
                      {formatNumber(ledgerData.statistics?.ngCount || 0)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-blue-600 font-semibold">कक्षा औसत GPA</div>
                    <div className="text-xl font-black text-blue-600 mt-1">
                      {formatNumber(ledgerData.statistics?.averageGpa || 0)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-indigo-600 font-semibold">सर्वोच्च GPA</div>
                    <div className="text-xl font-black text-indigo-600 mt-1">
                      {formatNumber(ledgerData.statistics?.highestGpa || 0)}
                    </div>
                  </div>
                </div>
              )}

              {/* Matrix Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  {ledgerData.isIntegratedCas ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-3 w-12 text-center">रोल</th>
                          <th className="py-3 px-3 w-56">विद्यार्थीको नाम</th>
                          {(ledgerData.subjects || []).map((sub: any) => (
                            <th key={sub.id} className="py-3 px-3 text-center">
                              <div>{isNp ? (sub.nameNp || sub.nameEn || sub.code) : (sub.nameEn || sub.nameNp || sub.code)}</div>
                              <div className="text-[10px] text-slate-500 font-normal">क्रेडिट: {sub.creditHours || 4}</div>
                            </th>
                          ))}
                          <th className="py-3 px-4 text-center">समग्र सिकाइ स्थिति</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(ledgerData.ledger || ledgerData.rows || []).map((row: any) => (
                          <tr
                            key={row.studentId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 font-medium"
                          >
                            <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 text-center">
                              {formatNumber(row.rollNumber || '-')}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {row.studentNameNp || row.fullNameNp}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {row.studentNameEn || row.fullNameEn}
                              </div>
                            </td>
                            {(ledgerData.subjects || []).map((sub: any) => {
                              const sMark = row.marks?.[sub.id];
                              const lvl = sMark?.levelRating ?? 3;
                              return (
                                <td key={sub.id} className="py-3 px-3 text-center">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                                      lvl === 4
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                        : lvl === 3
                                        ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                        : lvl === 2
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                    }`}
                                    title={sMark?.remarks || ''}
                                  >
                                    {lvl === 4 ? 'स्तर ४ (धेरै राम्रो)' : lvl === 3 ? 'स्तर ३ (राम्रो)' : lvl === 2 ? 'स्तर २ (सामान्य)' : 'स्तर १ (कमजोर)'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                ✓ सिकाइ उपलब्धि हासिल
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-3">रोल</th>
                          <th className="py-3 px-3">विद्यार्थीको नाम</th>
                          {(ledgerData.subjects || []).map((sub: any) => (
                            <th key={sub.id} className="py-3 px-2 text-center">
                              <div>{isNp ? (sub.nameNp || sub.nameEn || sub.code) : (sub.nameEn || sub.nameNp || sub.code)}</div>
                              <div className="text-[10px] text-slate-500 font-normal">CR: {sub.creditHours}</div>
                            </th>
                          ))}
                          <th className="py-3 px-3 text-center">कुल प्राप्तांक</th>
                          <th className="py-3 px-3 text-center">प्रतिशत</th>
                          <th className="py-3 px-3 text-center">GPA</th>
                          <th className="py-3 px-3 text-center">नतिजा</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(ledgerData.ledger || []).map((row: any) => (
                          <tr
                            key={row.studentId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 font-medium"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatNumber(row.rollNumber || '-')}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{row.studentNameNp}</div>
                              <div className="text-[10px] text-slate-500">{row.studentNameEn}</div>
                            </td>

                            {/* Subject Columns */}
                            {(ledgerData.subjects || []).map((sub: any) => {
                              const sMark = row.marks[sub.id];
                              return (
                                <td key={sub.id} className="py-2.5 px-2 text-center">
                                  {sMark ? (
                                    <div>
                                      <span
                                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                          sMark.grade === 'NG'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                            : 'text-slate-800 dark:text-slate-200'
                                        }`}
                                      >
                                        {formatNumber(sMark.total)} ({sMark.grade})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Grand Total */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatNumber(row.totalMarks)}
                            </td>

                            {/* Percentage */}
                            <td className="py-2.5 px-3 text-center font-mono">
                              {formatNumber(row.percentage)}%
                            </td>

                            {/* GPA */}
                            <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                              {row.resultStatus === 'NG' ? 'NG' : formatNumber(row.gpa)}
                            </td>

                            {/* Result Badge */}
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  row.resultStatus === 'PASSED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {row.resultStatus === 'PASSED' ? 'उत्तीर्ण' : 'NG (गैर-ग्रेड)'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: GRADE SHEET / REPORT CARD ================= */}
      {activeTab === 'REPORT' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">परीक्षा:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {isNp ? (e.nameNp || e.nameEn) : (e.nameEn || e.nameNp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">कक्षा:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">खण्ड:</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {isNp ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">विद्यार्थी (Student):</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[220px]"
                >
                  <option value="">विद्यार्थी छनोट गर्नुहोस्</option>
                  {reportStudents.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Roll: {r.currentRollNumber || '-'} - {r.firstNameNp} {r.lastNameNp || ''} ({r.firstNameEn} {r.lastNameEn || ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {gradesheetData && (
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition flex items-center space-x-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>{gradesheetData.isIntegratedCas ? 'प्रगति विवरण प्रिन्ट (Print CAS Report)' : 'ग्रेडसिट प्रिन्ट (Print Report Card)'}</span>
              </button>
            )}
          </div>

          {/* Printable Official Sheet View */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-semibold">विवरण लोड हुँदैछ...</div>
          ) : !gradesheetData ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              माथिको ड्रपडाउनबाट विद्यार्थी छनोट गर्नुहोस्।
            </div>
          ) : gradesheetData.isIntegratedCas ? (
            /* ================= CLASS 1-3 INTEGRATED CAS REPORT CARD ================= */
            <div className="bg-white text-slate-950 p-8 lg:p-12 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto font-sans">
              <div className="border-2 border-slate-800 p-6 lg:p-8 rounded-lg relative">
                {/* School Header */}
                <div className="text-center space-y-1 pb-4 border-b-2 border-slate-800">
                  <div className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                    नेपाल सरकार • शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                    {gradesheetData.school?.nameNp || school?.nameNp || gradesheetData.school?.nameEn || school?.nameEn || 'विद्यालय'}
                  </h2>
                  <h3 className="text-base font-bold text-slate-800 tracking-wide">
                    {gradesheetData.school?.nameEn || school?.nameEn || gradesheetData.school?.nameNp || school?.nameNp || ''}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {gradesheetData.school?.addressNp || school?.addressNp || ''}
                    {(gradesheetData.school?.iemisCode || school?.iemisCode) ? ` | IEMIS: ${gradesheetData.school?.iemisCode || school?.iemisCode}` : ''}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block px-4 py-1.5 bg-blue-900 text-white text-sm font-black tracking-wider uppercase rounded shadow-sm">
                      निरन्तर विद्यार्थी मूल्याङ्कन तथा प्रगति विवरण (CAS PROGRESS REPORT)
                    </span>
                  </div>
                  <div className="text-xs font-bold text-blue-900 mt-1">
                    आधारभूत तह (कक्षा १-३) एकीकृत पाठ्यक्रम मूल्याङ्कन • {gradesheetData.exam?.nameNp || gradesheetData.exam?.nameEn}
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-300">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs font-medium flex-1">
                    <div>
                      <span className="text-slate-500">विद्यार्थीको नाम: </span>
                      <span className="font-bold text-sm">
                        {gradesheetData.student?.firstNameNp} {gradesheetData.student?.lastNameNp}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Name: </span>
                      <span className="font-bold">
                        {gradesheetData.student?.firstNameEn} {gradesheetData.student?.lastNameEn}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">रोल नं (Roll): </span>
                      <span className="font-mono font-bold">{gradesheetData.student?.rollNumber || gradesheetData.student?.currentRollNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">कक्षा / खण्ड: </span>
                      <span className="font-bold">
                        {isNp ? (gradesheetData.class?.nameNp || gradesheetData.class?.nameEn) : (gradesheetData.class?.nameEn || gradesheetData.class?.nameNp)} {gradesheetData.section ? `(${isNp ? (gradesheetData.section.nameNp || gradesheetData.section.nameEn) : (gradesheetData.section.nameEn || gradesheetData.section.nameNp)})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">जन्म मिति (DOB): </span>
                      <span className="font-mono font-bold">{gradesheetData.student?.dobBs || '—'} BS</span>
                    </div>
                    <div>
                      <span className="text-slate-500">विद्यार्थी नं (ID): </span>
                      <span className="font-mono font-bold">{gradesheetData.student?.studentId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">कुल विद्यालय दिन: </span>
                      <span className="font-mono font-bold">{gradesheetData.attendance?.totalWorkingDays || 65} दिन</span>
                    </div>
                    <div>
                      <span className="text-slate-500">उपस्थित दिन: </span>
                      <span className="font-mono font-bold">{gradesheetData.attendance?.presentDays || 60} दिन</span>
                    </div>
                    <div>
                      <span className="text-slate-500">हाजिरी प्रतिशत: </span>
                      <span className="font-mono font-bold text-emerald-700">{gradesheetData.attendance?.attendanceRate || 92}%</span>
                    </div>
                  </div>

                  {/* Student Photo Box */}
                  <div className="w-24 h-28 border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 rounded p-1 flex flex-col items-center justify-center shrink-0 text-center shadow-xs">
                    {gradesheetData.student?.photoUrl ? (
                      <img
                        src={gradesheetData.student.photoUrl}
                        alt="Student"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium leading-tight">
                        तस्बिर<br />
                        <span className="text-[9px] font-mono">(Photo)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Class 1-3 Continuous Assessment Subjects Table */}
                <div className="my-5 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-400">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                      <tr>
                        <th className="border border-slate-400 py-2.5 px-2 text-center w-12">क्र.सं.</th>
                        <th className="border border-slate-400 py-2.5 px-3">विषय / कार्यक्षेत्र (Subjects)</th>
                        <th className="border border-slate-400 py-2.5 px-2 text-center w-16">क्रेडिट घण्टा</th>
                        <th className="border border-slate-400 py-2.5 px-3 text-center w-28">सिकाइ स्तर</th>
                        <th className="border border-slate-400 py-2.5 px-3 text-center w-36">स्तरको व्याख्या</th>
                        <th className="border border-slate-400 py-2.5 px-3">सिकाइ उपलब्धि तथा पृष्ठपोषण (Teacher's Remarks)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gradesheetData.subjects || gradesheetData.subjectRecords || []).map((sub: any, idx: number) => {
                        const lvl = sub.levelRating || 3;
                        return (
                          <tr key={sub.code || idx} className="border-b border-slate-300">
                            <td className="border border-slate-300 py-2.5 px-2 text-center font-mono">{idx + 1}</td>
                            <td className="border border-slate-300 py-2.5 px-3">
                              <div className="font-bold text-slate-900">{isNp ? (sub.nameNp || sub.subjectNameNp || sub.nameEn || sub.subjectNameEn) : (sub.nameEn || sub.subjectNameEn || sub.nameNp || sub.subjectNameNp)}</div>
                              <div className="text-[10px] text-slate-500">{isNp ? (sub.nameEn || sub.subjectNameEn) : (sub.nameNp || sub.subjectNameNp)} ({sub.code})</div>
                            </td>
                            <td className="border border-slate-300 py-2.5 px-2 text-center font-mono font-bold">
                              {sub.creditHours || 4}
                            </td>
                            <td className="border border-slate-300 py-2.5 px-3 text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${
                                  lvl === 4
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : lvl === 3
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : lvl === 2
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {lvl === 4 ? 'स्तर ४' : lvl === 3 ? 'स्तर ३' : lvl === 2 ? 'स्तर २' : 'स्तर १'}
                              </span>
                            </td>
                            <td className="border border-slate-300 py-2.5 px-3 text-center font-semibold text-slate-700">
                              {lvl === 4 ? 'धेरै राम्रो (Advanced)' : lvl === 3 ? 'राम्रो (Proficient)' : lvl === 2 ? 'सामान्य (Basic)' : 'कमजोर (Needs Support)'}
                            </td>
                            <td className="border border-slate-300 py-2.5 px-3 text-slate-800 italic">
                              {sub.achievementRemarks || 'अपेक्षित सिकाइ उपलब्धि हासिल गरेको'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Overall Assessment Summary */}
                <div className="bg-slate-50 border border-slate-300 p-4 rounded-lg flex flex-wrap items-center justify-between my-4 text-xs font-semibold gap-2">
                  <div>
                    <span className="text-slate-600">कुल क्रेडिट घण्टा: </span>
                    <span className="font-bold font-mono text-sm">{gradesheetData.totalCreditHours || 20}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">समग्र मूल्याङ्कन नतिजा: </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {gradesheetData.resultRemarks || 'अपेक्षित सिकाइ उपलब्धि हासिल'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">अन्तिम स्थिति: </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 font-black rounded">
                      माथिल्लो कक्षामा पदोन्नति (Promoted)
                    </span>
                  </div>
                </div>

                {/* CDC 4-Level Evaluation Matrix Rubric */}
                <div className="pt-3 border-t border-slate-300 text-[10px] text-slate-700">
                  <div className="font-bold text-slate-900 mb-1.5">
                    पाठ्यक्रम विकास केन्द्र (CDC) एकीकृत पाठ्यक्रम मूल्याङ्कन मापदण्ड (४-स्तर रुब्रिक्स):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="bg-emerald-50 border border-emerald-200 p-2 rounded">
                      <div className="font-bold text-emerald-800">स्तर ४: धेरै राम्रो (Advanced)</div>
                      <div className="text-slate-600 mt-0.5">तोकिएको सिकाइ उपलब्धि ९०% वा सोभन्दा बढी हासिल गरेको।</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                      <div className="font-bold text-blue-800">स्तर ३: राम्रो (Proficient)</div>
                      <div className="text-slate-600 mt-0.5">तोकिएको सिकाइ उपलब्धि ७०% देखि ८९% सम्म हासिल गरेको (अपेक्षित उपलब्धि)।</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded">
                      <div className="font-bold text-amber-800">स्तर २: सामान्य (Basic)</div>
                      <div className="text-slate-600 mt-0.5">तोकिएको सिकाइ उपलब्धि ४०% देखि ६९% सम्म हासिल गरेको।</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 p-2 rounded">
                      <div className="font-bold text-rose-800">स्तर १: कमजोर (Needs Support)</div>
                      <div className="text-slate-600 mt-0.5">तोकिएको सिकाइ उपलब्धि ४०% भन्दा कम हासिल गरेको (थप सहयोग आवश्यक)।</div>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-12 mt-8 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-700 w-32 mx-auto pt-1 font-bold">कक्षा शिक्षक</div>
                    <div className="text-[10px] text-slate-500">Class Teacher</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-700 w-32 mx-auto pt-1 font-bold">परीक्षा संयोजक</div>
                    <div className="text-[10px] text-slate-500">Exam Coordinator</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-700 w-32 mx-auto pt-1 font-bold">प्रधानाध्यापक</div>
                    <div className="text-[10px] text-slate-500">Headmaster / Principal</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= CLASS 4-12 LETTER GRADING 2078 GRADE SHEET ================= */
            <div className="bg-white text-slate-950 p-8 lg:p-12 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto font-sans">
              {/* Grade Sheet Border Box */}
              <div className="border-2 border-slate-800 p-6 lg:p-8 rounded-lg relative">
                {/* School Header */}
                <div className="text-center space-y-1 pb-4 border-b-2 border-slate-800">
                  <div className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                    नेपाल सरकार • शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                    {gradesheetData.school?.nameNp || school?.nameNp || gradesheetData.school?.nameEn || school?.nameEn || 'विद्यालय'}
                  </h2>
                  <h3 className="text-base font-bold text-slate-800 tracking-wide">
                    {gradesheetData.school?.nameEn || school?.nameEn || gradesheetData.school?.nameNp || school?.nameNp || ''}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {gradesheetData.school?.addressNp || school?.addressNp || ''}
                    {(gradesheetData.school?.iemisCode || school?.iemisCode) ? ` | IEMIS: ${gradesheetData.school?.iemisCode || school?.iemisCode}` : ''}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block px-4 py-1 bg-slate-900 text-white text-sm font-black tracking-widest uppercase rounded">
                      GRADE-SHEET (ग्रेड-सिट)
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    {isNp ? (gradesheetData.exam?.nameNp || gradesheetData.exam?.nameEn) : (gradesheetData.exam?.nameEn || gradesheetData.exam?.nameNp)}
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-300">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs font-medium flex-1">
                    <div>
                      <span className="text-slate-500">विद्यार्थीको नाम: </span>
                      <span className="font-bold text-sm">
                        {gradesheetData.student?.firstNameNp} {gradesheetData.student?.lastNameNp}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Name: </span>
                      <span className="font-bold">
                        {gradesheetData.student?.firstNameEn} {gradesheetData.student?.lastNameEn}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">रोल नं (Roll): </span>
                      <span className="font-mono font-bold">{gradesheetData.student?.currentRollNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">कक्षा / खण्ड: </span>
                      <span className="font-bold">
                        {isNp ? (gradesheetData.class?.nameNp || gradesheetData.class?.nameEn) : (gradesheetData.class?.nameEn || gradesheetData.class?.nameNp)} {gradesheetData.section ? `(${isNp ? (gradesheetData.section.nameNp || gradesheetData.section.nameEn) : (gradesheetData.section.nameEn || gradesheetData.section.nameNp)})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">जन्म मिति (DOB): </span>
                      <span className="font-mono font-bold">{gradesheetData.student?.dobBs} BS</span>
                    </div>
                    <div>
                      <span className="text-slate-500">विद्यार्थी नं (ID): </span>
                      <span className="font-mono font-bold">{gradesheetData.student?.studentId}</span>
                    </div>
                  </div>

                  {/* Student Photo Box */}
                  <div className="w-24 h-28 border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 rounded p-1 flex flex-col items-center justify-center shrink-0 text-center shadow-xs">
                    {gradesheetData.student?.photoUrl ? (
                      <img
                        src={gradesheetData.student.photoUrl}
                        alt="Student"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium leading-tight">
                        तस्बिर<br />
                        <span className="text-[9px] font-mono">(Photo)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CDC Letter Grading Subject Table */}
                <div className="my-5 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-400">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                      <tr>
                        <th className="border border-slate-400 py-2 px-2 text-center w-16">कोड</th>
                        <th className="border border-slate-400 py-2 px-3">विषयहरू (Subjects)</th>
                        <th className="border border-slate-400 py-2 px-2 text-center w-14">क्रेडिट</th>
                        <th className="border border-slate-400 py-2 px-2 text-center w-16">सैद्धान्तिक</th>
                        <th className="border border-slate-400 py-2 px-2 text-center w-16">प्रयोगात्मक</th>
                        <th className="border border-slate-400 py-2 px-2 text-center w-16">अन्तिम ग्रेड</th>
                        <th className="border border-slate-400 py-2 px-2 text-center w-14">GP</th>
                        <th className="border border-slate-400 py-2 px-2 text-center w-16">Weighted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gradesheetData.subjectRecords || []).map((sub: any) => (
                        <tr key={sub.subjectId} className="border-b border-slate-300">
                          <td className="border border-slate-300 py-2 px-2 text-center font-mono">
                            {sub.subjectCode}
                          </td>
                          <td className="border border-slate-300 py-2 px-3">
                            <div className="font-bold">{sub.subjectNameNp}</div>
                            <div className="text-[10px] text-slate-500">{sub.subjectNameEn}</div>
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold">
                            {sub.creditHours}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                            {sub.theoryGrade}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center font-bold">
                            {sub.practicalGrade}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center font-bold text-sm">
                            <span className={sub.finalGrade === 'NG' ? 'text-rose-600' : 'text-slate-900'}>
                              {sub.finalGrade}
                            </span>
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center font-mono">
                            {sub.gradePoint.toFixed(1)}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold">
                            {(sub.creditHours * sub.gradePoint).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Final GPA & Summary Box */}
                <div className="bg-slate-50 border border-slate-300 p-4 rounded-lg flex items-center justify-between my-4 text-xs font-semibold">
                  <div>
                    <span className="text-slate-600">कुल क्रेडिट घण्टा (Total Credit Hours): </span>
                    <span className="font-bold font-mono text-sm">{gradesheetData.totalCreditHours}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">अन्तिम नतिजा: </span>
                    <span
                      className={`px-2 py-0.5 rounded font-black ${
                        gradesheetData.resultStatus === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {gradesheetData.resultStatus === 'PASSED' ? 'PASSED (उत्तीर्ण)' : 'NG (गैर-ग्रेड / अनुत्तीर्ण)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600">Grade Point Average (GPA): </span>
                    <span className="text-lg font-black text-blue-700 font-mono">
                      {gradesheetData.resultStatus === 'NG' ? 'NG' : gradesheetData.gpa}
                    </span>
                  </div>
                </div>

                {/* CDC Grading Scale Reference Table */}
                <div className="pt-3 border-t border-slate-300 text-[10px] text-slate-600">
                  <div className="font-bold text-slate-800 mb-1">
                    अक्षरांकन पद्धति निर्देशिका २०७८ अनुसार ग्रेडिङ तालिका (CDC Grading Scale):
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-center font-mono">
                    <div className="bg-slate-100 p-1 rounded">A+ (90-100%) 4.0</div>
                    <div className="bg-slate-100 p-1 rounded">A (80-89%) 3.6</div>
                    <div className="bg-slate-100 p-1 rounded">B+ (70-79%) 3.2</div>
                    <div className="bg-slate-100 p-1 rounded">B (60-69%) 2.8</div>
                    <div className="bg-slate-100 p-1 rounded">C+ (50-59%) 2.4</div>
                    <div className="bg-slate-100 p-1 rounded">C (40-49%) 2.0</div>
                    <div className="bg-slate-100 p-1 rounded">D (35-39%) 1.6</div>
                    <div className="bg-rose-50 text-rose-700 p-1 rounded font-bold">NG (&lt;35%) 0.0</div>
                  </div>
                </div>

                {/* Signatures Footer */}
                <div className="grid grid-cols-3 gap-6 pt-12 mt-8 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-700 w-32 mx-auto pt-1 font-bold">कक्षा शिक्षक</div>
                    <div className="text-[10px] text-slate-500">Class Teacher</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-700 w-32 mx-auto pt-1 font-bold">परीक्षा संयोजक</div>
                    <div className="text-[10px] text-slate-500">Exam Coordinator</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-700 w-32 mx-auto pt-1 font-bold">प्रधानाध्यापक</div>
                    <div className="text-[10px] text-slate-500">Headmaster / Principal</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: ADMIT CARD & APPLICATION MANAGEMENT ================= */}
      {activeTab === 'ADMIT_CARD' && (
        <div className="space-y-4">
          {/* Top KPI Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कुल परीक्षार्थी</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatNumber(appSummary.totalCount)}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">स्वीकृत आवेदन</div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatNumber(appSummary.approvedCount)}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">विचाराधीन (Pending)</div>
                <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                  {formatNumber(appSummary.pendingCount)}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <X className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">अस्वीकृत</div>
                <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
                  {formatNumber(appSummary.rejectedCount)}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 col-span-2 sm:col-span-1">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">प्रवेशपत्र मुद्रित</div>
                <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-0.5">
                  {formatNumber(appSummary.printedCount)}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar & Action Controls */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Exam */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">परीक्षा (Exam):</label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {isNp ? (e.nameNp || e.nameEn) : (e.nameEn || e.nameNp)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">कक्षा (Class):</label>
                  <select
                    value={appClassId}
                    onChange={(e) => setAppClassId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="ALL">{isNp ? '-- सम्पूर्ण कक्षाहरू (All) --' : '-- All Classes --'}</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">खण्ड (Section):</label>
                  <select
                    value={appSectionId}
                    onChange={(e) => setAppSectionId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="ALL">{isNp ? '-- सम्पूर्ण खण्डहरू (All) --' : '-- All Sections --'}</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {isNp ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">आवेदन स्थिति (Status):</label>
                  <select
                    value={appStatusFilter}
                    onChange={(e) => setAppStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="ALL">सबै स्थिति (All)</option>
                    <option value="APPROVED">स्वीकृत मात्र (Approved)</option>
                    <option value="PENDING">विचाराधीन मात्र (Pending)</option>
                    <option value="REJECTED">अस्वीकृत मात्र (Rejected)</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">खोजी (Search):</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="नाम, कोड, सिम्बोल नं..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchApplications()}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm w-48"
                    />
                  </div>
                </div>

                <div className="self-end pb-0.5">
                  <button
                    onClick={fetchApplications}
                    disabled={isAppLoading}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="ताजा गर्नुहोस् (Refresh)"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAppLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsSymbolModalOpen(true)}
                  className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs border border-indigo-200 dark:border-indigo-800 transition flex items-center space-x-1.5 shadow-sm"
                  title="स्वतः क्रमबद्ध सिम्बोल नम्बर उत्पादन गर्नुहोस्"
                >
                  <Hash className="w-4 h-4" />
                  <span>सिम्बोल नं जारी गर्नुहोस्</span>
                </button>

                <button
                  onClick={() => handlePrintAdmitCards()}
                  disabled={isPrintingAdmitCard}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow-md disabled:opacity-50"
                  title="स्वीकृत विद्यार्थीहरूको प्रवेशपत्र एकमुष्ठ छाप्नुहोस् (A4: २ प्रति प्रतिपृष्ठ)"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isPrintingAdmitCard ? 'प्रिन्ट तयार हुँदैछ...' : 'प्रवेशपत्र छाप्नुहोस् (A4 Print)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Bulk Actions Bar if items selected */}
            {selectedAppIds.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>{formatNumber(selectedAppIds.length)} जना परीक्षार्थी छानिएका छन्:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUpdateAppStatus(selectedAppIds, 'APPROVED')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center space-x-1 shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>स्वीकृत गर्नुहोस्</span>
                  </button>
                  <button
                    onClick={() => handleUpdateAppStatus(selectedAppIds, 'REJECTED')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition flex items-center space-x-1 shadow-sm disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>अस्वीकृत गर्नुहोस्</span>
                  </button>
                  <button
                    onClick={() => handleUpdateAppStatus(selectedAppIds, 'PENDING')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    पेन्डिङमा राख्नुहोस्
                  </button>
                  <button
                    onClick={() => setSelectedAppIds([])}
                    className="text-xs text-slate-500 hover:text-slate-700 ml-2"
                  >
                    रद्द गर्नुहोस्
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Applications Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {isAppLoading ? (
              <div className="p-16 text-center text-slate-500 font-semibold flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span>आवेदन विवरण लोड हुँदैछ...</span>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-base text-slate-700 dark:text-slate-300">
                  कुनै परीक्षा आवेदन भेटिएन।
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  माथि कक्षा वा परीक्षा परिवर्तन गर्नुहोस् वा विद्यार्थी भर्ना सक्रिय रहेको निश्चित गर्नुहोस्।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            applications.length > 0 &&
                            applications.every((a: any) => selectedAppIds.includes(a.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAppIds(applications.map((a: any) => a.id));
                            } else {
                              setSelectedAppIds([]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300"
                        />
                      </th>
                      <th className="py-3 px-3 w-32 font-bold">सिम्बोल नं (Symbol No)</th>
                      <th className="py-3 px-3 w-16 text-center">रोल नं</th>
                      <th className="py-3 px-4">परीक्षार्थीको नाम (Student Name)</th>
                      <th className="py-3 px-3 w-32">कक्षा / खण्ड</th>
                      <th className="py-3 px-3 text-center w-28">आवेदन स्थिति</th>
                      <th className="py-3 px-3 text-center w-28">प्रवेशपत्र मुद्रण</th>
                      <th className="py-3 px-4 text-right w-44">कार्य (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {applications.map((app: any) => {
                      const isSelected = selectedAppIds.includes(app.id);
                      return (
                        <tr
                          key={app.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAppIds((prev) => [...prev, app.id]);
                                } else {
                                  setSelectedAppIds((prev) => prev.filter((id) => id !== app.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            {app.symbolNumber || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatNumber(app.rollNumber || '-')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {app.photoUrl ? (
                                <img
                                  src={app.photoUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs border border-slate-200 dark:border-slate-700">
                                  {app.fullNameEn?.charAt(0) || 'S'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {app.fullNameNp || app.fullNameEn}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {app.studentCode || app.admissionNo} • {app.gender}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {app.classNameNp || app.classNameEn}
                            </span>
                            <span className="text-slate-500 ml-1 font-mono">
                              ({app.sectionCode || 'A'})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                app.applicationStatus === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                  : app.applicationStatus === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {app.applicationStatus === 'APPROVED'
                                ? 'स्वीकृत (Approved)'
                                : app.applicationStatus === 'REJECTED'
                                ? 'अस्वीकृत'
                                : 'विचाराधीन'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {app.admitCardPrintCount > 0 ? (
                              <span className="text-purple-700 dark:text-purple-300 font-semibold font-mono text-[11px]">
                                {formatNumber(app.admitCardPrintCount)} पटक
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">मुद्रण बाँकी</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {app.applicationStatus === 'APPROVED' ? (
                                <>
                                  <button
                                    onClick={() => handlePrintAdmitCards({ studentId: app.studentId })}
                                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                                    title="यस विद्यार्थीको प्रवेशपत्र छाप्नुहोस्"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>प्रवेशपत्र</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAppStatus([app.id], 'REJECTED')}
                                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    title="अस्वीकृत गर्नुहोस्"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleUpdateAppStatus([app.id], 'APPROVED')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                                    title="आवेदन स्वीकृत गर्नुहोस्"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>स्वीकृत</span>
                                  </button>
                                  {app.applicationStatus !== 'REJECTED' && (
                                    <button
                                      onClick={() => handleUpdateAppStatus([app.id], 'REJECTED')}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      title="अस्वीकृत गर्नुहोस्"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: GENERATE SYMBOL NUMBERS ================= */}
      {isSymbolModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Hash className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">सिम्बोल नम्बर स्वतः उत्पादन (Generate Symbols)</h3>
              </div>
              <button
                onClick={() => setIsSymbolModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateSymbols();
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-200">
                <b>क्षेत्र (Scope): </b>
                {appClassId === 'ALL'
                  ? (isNp ? 'सम्पूर्ण कक्षाहरूका सक्रिय परीक्षार्थीहरू' : 'All active students from all classes')
                  : (isNp
                      ? `छानिएको कक्षा (${classes.find((c) => c.id === appClassId)?.nameNp || classes.find((c) => c.id === appClassId)?.nameEn || 'कक्षा'})`
                      : `Selected Class (${classes.find((c) => c.id === appClassId)?.nameEn || classes.find((c) => c.id === appClassId)?.nameNp || 'Class'})`)}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  उपसर्ग (Prefix) *
                </label>
                <input
                  type="text"
                  value={symbolPrefix}
                  onChange={(e) => setSymbolPrefix(e.target.value)}
                  placeholder="e.g. 2083-10-"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-slate-500">वर्ष वा कक्षा कोड (उदा: 2083-10- वा 2083-)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    सुरुवाती अंक (Start Number) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={symbolStart}
                    onChange={(e) => setSymbolStart(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    अंक लम्बाइ (Zero Padding) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={symbolPad}
                    onChange={(e) => setSymbolPad(Number(e.target.value) || 3)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">ढाँचा नमुना (Format Preview):</span>
                <div className="flex items-center space-x-2 font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                  <span>{`${symbolPrefix}${String(symbolStart).padStart(symbolPad, '0')}`}</span>
                  <span className="text-slate-400">,</span>
                  <span>{`${symbolPrefix}${String(symbolStart + 1).padStart(symbolPad, '0')}`}</span>
                  <span className="text-slate-400">,</span>
                  <span>{`${symbolPrefix}${String(symbolStart + 2).padStart(symbolPad, '0')}`}...</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSymbolModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingSymbols}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isGeneratingSymbols ? 'जारी गरिँदैछ...' : 'सिम्बोल नम्बर जारी गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW EXAM ================= */}
      {isAddExamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg">नयाँ परीक्षा सिर्जना (Create Exam)</h3>
              </div>
              <button
                onClick={() => setIsAddExamModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  परीक्षाको नाम (नेपालीमा) *
                </label>
                <input
                  type="text"
                  placeholder="उदा: दोस्रो त्रैमासिक परीक्षा २०८३"
                  value={newExamForm.nameNp}
                  onChange={(e) => setNewExamForm({ ...newExamForm, nameNp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Exam Name (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Second Terminal Examination 2083"
                  value={newExamForm.nameEn}
                  onChange={(e) => setNewExamForm({ ...newExamForm, nameEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    प्रकार (Type)
                  </label>
                  <select
                    value={newExamForm.examType}
                    onChange={(e) => setNewExamForm({ ...newExamForm, examType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value="TERMINAL_1">प्रथम त्रैमासिक (1st Term)</option>
                    <option value="TERMINAL_2">दोस्रो त्रैमासिक (2nd Term)</option>
                    <option value="TERMINAL_3">तेस्रो त्रैमासिक (3rd Term)</option>
                    <option value="FINAL">वार्षिक परीक्षा (Final)</option>
                    <option value="PRE_BOARD">प्रि-बोर्ड / Send-up (SEE/NEB)</option>
                    <option value="UNIT_TEST">एकाइ परीक्षा (Unit Test)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    शैक्षिक सत्र
                  </label>
                  <select
                    value={newExamForm.academicYearId}
                    onChange={(e) => setNewExamForm({ ...newExamForm, academicYearId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                    required
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.yearBs} BS
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    सुरु मिति (Start Date BS)
                  </label>
                  <input
                    type="text"
                    value={newExamForm.startDateBs}
                    onChange={(e) => setNewExamForm({ ...newExamForm, startDateBs: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    अन्तिम मिति (End Date BS)
                  </label>
                  <input
                    type="text"
                    value={newExamForm.endDateBs}
                    onChange={(e) => setNewExamForm({ ...newExamForm, endDateBs: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  विवरण (Description)
                </label>
                <textarea
                  rows={2}
                  value={newExamForm.description}
                  onChange={(e) => setNewExamForm({ ...newExamForm, description: e.target.value })}
                  placeholder="परीक्षा सम्बन्धी संक्षिप्त जानकारी..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddExamModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-sm font-semibold"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm"
                >
                  परीक्षा सिर्जना गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
