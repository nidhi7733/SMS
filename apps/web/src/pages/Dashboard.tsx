import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { toBik } from 'bikram-sambat';
import {
  Users,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Database,
  ArrowUpRight,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  GraduationCap,
  CalendarCheck2,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  BookOpen,
  ChevronRight,
  Briefcase,
  FileText,
  UserX,
  Phone,
  Clock,
  Bell,
  UserPlus,
  X,
  ArrowRightLeft,
} from 'lucide-react';

interface DashboardProps {
  onNavigate?: (tab: string, subTab?: string, classId?: string) => void;
}

interface NotableStaffMember {
  id: string;
  staffCode: string;
  fullNameEn: string;
  fullNameNp: string;
  category: 'TEACHING' | 'NON_TEACHING';
  designation: string;
  phone: string;
  status: string;
  remarks: string | null;
}

interface AttendanceSummary {
  dateBs: string;
  teachers: {
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    officialDuty: number;
    unmarked: number;
    attendanceRate: number;
  };
  staff: {
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    officialDuty: number;
    unmarked: number;
    attendanceRate: number;
  };
  totalStaff?: {
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    officialDuty: number;
    unmarked: number;
    attendanceRate: number;
  };
  studentsOverall: {
    total: number;
    present: number;
    absent: number;
    onLeave?: number;
    attendanceRate: number;
  };
  notableStaff?: {
    absent: NotableStaffMember[];
    onLeave: NotableStaffMember[];
    officialDuty: NotableStaffMember[];
    total: number;
  };
  classWise: Array<{
    classId: string;
    code: string;
    nameEn: string;
    nameNp: string;
    totalStudents: number;
    present: number;
    absent: number;
    leave: number;
    unmarked: number;
    isMarkedToday: boolean;
    attendanceRate: number;
    sections: Array<{
      sectionId: string;
      code: string;
      nameEn: string;
      nameNp: string;
      classTeacherId: string | null;
      classTeacherName: string | null;
      totalStudents: number;
      present: number;
      absent: number;
      leave: number;
      unmarked: number;
      isMarkedToday: boolean;
      attendanceRate: number;
    }>;
  }>;
  myClassTeacherAssignment: {
    isClassTeacher: boolean;
    classId: string;
    classNameEn: string;
    classNameNp: string;
    classCode: string;
    sectionId: string;
    sectionCode: string;
    sectionNameEn: string;
    sectionNameNp: string;
    totalStudents: number;
    present: number;
    absent: number;
    leave: number;
    unmarked: number;
    isMarkedToday: boolean;
    attendanceRate: number;
  } | null;
}

interface SubstitutePeriod {
  id: string;
  timetableId: string;
  classId: string;
  classNameEn: string;
  classNameNp: string;
  sectionId: string;
  sectionCode: string;
  sectionNameNp: string;
  subjectId: string;
  subjectNameEn: string;
  subjectNameNp: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  originalTeacher: {
    id: string;
    staffCode: string;
    fullNameEn: string;
    fullNameNp: string;
    phone: string;
    attendanceStatus: string;
    remarks: string | null;
  } | null;
  isAssigned: boolean;
  assignment: {
    id: string;
    status: string;
    remarks: string | null;
    substituteTeacher: {
      id: string;
      staffCode: string;
      fullNameEn: string;
      fullNameNp: string;
      designation: string;
      phone: string;
    } | null;
  } | null;
  availableTeachers: Array<{
    id: string;
    staffCode: string;
    fullNameEn: string;
    fullNameNp: string;
    designation: string;
    phone: string;
  }>;
}

interface SubstituteOverview {
  dateBs: string;
  dayOfWeek: string;
  vacantCount: number;
  assignedCount: number;
  totalAffected: number;
  periods: SubstitutePeriod[];
}

interface MySubstituteAssignment {
  id: string;
  dateBs: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  remarks: string | null;
  status: string;
  classNameEn: string;
  classNameNp: string;
  sectionCode: string;
  sectionNameNp: string;
  subjectNameEn: string;
  subjectNameNp: string;
  originalTeacherNameEn: string;
  originalTeacherNameNp: string;
}

const nepaliDaysMap: Record<string, string> = {
  SUNDAY: 'आइतबार',
  MONDAY: 'सोमबार',
  TUESDAY: 'मंगलबार',
  WEDNESDAY: 'बुधबार',
  THURSDAY: 'बिहीबार',
  FRIDAY: 'शुक्रबार',
  SATURDAY: 'शनिबार',
};

const englishDaysMap: Record<string, string> = {
  SUNDAY: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
};

const periodNamesNp: Record<number, string> = {
  1: 'पहिलो घण्टी',
  2: 'दोस्रो घण्टी',
  3: 'तेस्रो घण्टी',
  4: 'चौथो घण्टी',
  5: 'पाँचौं घण्टी',
  6: 'छैटौं घण्टी',
  7: 'सातौं घण्टी',
  8: 'आठौं घण्टी',
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { language, t, formatNumber } = useLanguage();
  const { school } = useSchool();
  const isNp = language === 'np';

  const [counts, setCounts] = useState({
    userCount: 4,
    roleCount: 6,
    permissionCount: 22,
  });

  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [classFilterMode, setClassFilterMode] = useState<'ALL' | 'WITH_STUDENTS' | 'PENDING'>('ALL');

  const fetchAttendanceSummary = async () => {
    setIsAttendanceLoading(true);
    try {
      const token = localStorage.getItem('sms_token');
      const todayBik = toBik(new Date());
      const dateStr = todayBik
        ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
        : '2083-05-31';

      const res = await fetch(`/api/attendance/dashboard-summary?dateBs=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard attendance summary:', err);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const [substituteOverview, setSubstituteOverview] = useState<SubstituteOverview | null>(null);
  const [isSubstituteLoading, setIsSubstituteLoading] = useState(false);
  const [mySubstituteAssignments, setMySubstituteAssignments] = useState<MySubstituteAssignment[]>([]);
  const [assignModalSlot, setAssignModalSlot] = useState<SubstitutePeriod | null>(null);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState<string>('');
  const [assignRemarks, setAssignRemarks] = useState<string>('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState<string>('');
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  const fetchSubstituteData = async () => {
    setIsSubstituteLoading(true);
    try {
      const token = localStorage.getItem('sms_token');
      const todayBik = toBik(new Date());
      const dateStr = todayBik
        ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
        : '2083-05-31';

      const [subRes, mySubRes] = await Promise.all([
        fetch(`/api/substitute/today?dateBs=${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/substitute/my-today?dateBs=${dateStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubstituteOverview(subData);
      }
      if (mySubRes.ok) {
        const myData = await mySubRes.json();
        setMySubstituteAssignments(myData.assignments || []);
      }
    } catch (err) {
      console.error('Failed to fetch substitute overview:', err);
    } finally {
      setIsSubstituteLoading(false);
    }
  };

  const handleAssignSubstitute = async () => {
    if (!assignModalSlot || !selectedSubTeacherId) {
      setAssignError(isNp ? 'कृपया सट्टा शिक्षक छनोट गर्नुहोस्' : 'Please select a substitute teacher');
      return;
    }
    setIsSubmittingAssign(true);
    setAssignError('');
    try {
      const token = localStorage.getItem('sms_token');
      const todayBik = toBik(new Date());
      const dateStr = todayBik
        ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
        : '2083-05-31';

      const res = await fetch('/api/substitute/assign', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateBs: dateStr,
          timetableId: assignModalSlot.timetableId,
          classId: assignModalSlot.classId,
          sectionId: assignModalSlot.sectionId,
          subjectId: assignModalSlot.subjectId,
          originalTeacherId: assignModalSlot.originalTeacher?.id,
          substituteTeacherId: selectedSubTeacherId,
          periodNumber: assignModalSlot.periodNumber,
          startTime: assignModalSlot.startTime,
          endTime: assignModalSlot.endTime,
          remarks: assignRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.message || (isNp ? 'सट्टा तोक्न असफल भयो' : 'Failed to assign substitute'));
      } else {
        setAssignModalSlot(null);
        setSelectedSubTeacherId('');
        setAssignRemarks('');
        await fetchSubstituteData();
      }
    } catch (err: any) {
      setAssignError(err.message || (isNp ? 'त्रुटि देखा पर्यो' : 'An error occurred'));
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleCancelSubstitute = async (assignmentId: string) => {
    if (
      !window.confirm(
        isNp
          ? 'के तपाईं यो सट्टा कक्षा रद्द गर्न निश्चित हुनुहुन्छ?'
          : 'Are you sure you want to cancel this substitution?'
      )
    ) {
      return;
    }
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/substitute/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchSubstituteData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('sms_token');
        const [usersRes, rolesRes] = await Promise.all([
          fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/users/roles', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (usersRes.ok && rolesRes.ok) {
          const uData = await usersRes.json();
          const rData = await rolesRes.json();
          setCounts({
            userCount: uData.users.length,
            roleCount: rData.roles.length,
            permissionCount: 22,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCounts();
    fetchAttendanceSummary();
    fetchSubstituteData();
  }, []);

  const schoolCode = school?.code || (school as any)?.code || 'SHREE-SHANTI-01';
  const iemisCode = school?.iemisCode || (school as any)?.iemis_code || '—';
  const academicYearBs = school?.activeAcademicYearBs || (school as any)?.active_academic_year_bs || 2083;
  const fiscalYearBs = school?.fiscalYearBs || (school as any)?.fiscal_year_bs || '2082/083';

  const isPrincipalOrAdmin =
    user?.roles?.some((r) => ['PRINCIPAL', 'SYSTEM_ADMIN', 'ADMIN', 'SUPERADMIN'].includes(r.name)) ||
    user?.isSuperAdmin;

  const myAssignment = attendanceSummary?.myClassTeacherAssignment;

  // Filtered classes for student class-wise attendance table
  const allClassWise = attendanceSummary?.classWise || [];
  const filteredClasses = allClassWise.filter((cls) => {
    const matchesSearch =
      cls.nameEn.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
      cls.nameNp.includes(classSearchTerm) ||
      cls.code.toLowerCase().includes(classSearchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (classFilterMode === 'WITH_STUDENTS') {
      return cls.totalStudents > 0;
    }
    if (classFilterMode === 'PENDING') {
      return cls.totalStudents > 0 && !cls.isMarkedToday;
    }
    return true;
  });

  const countClassesWithStudents = allClassWise.filter((c) => c.totalStudents > 0).length;
  const countPendingClasses = allClassWise.filter((c) => c.totalStudents > 0 && !c.isMarkedToday).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xs border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 mb-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('dash.stage_banner_title')}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('dash.welcome')},{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {isNp ? user?.fullNameNp : user?.fullNameEn}
              </span>!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
              {t('dash.stage_banner_desc')}
            </p>
          </div>

          <div className="flex items-center space-x-3.5 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('app.academic_year')}</div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {formatNumber(academicYearBs)} BS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Class Teacher Assigned Class Attendance Card (Visible if user is assigned as Class Teacher) */}
      {myAssignment && myAssignment.isClassTeacher && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-700/60 transition transform">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
                <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
                <span>{isNp ? 'कक्षा शिक्षक विशेष ड्यासबोर्ड' : 'Class Teacher Assigned Portal'}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-white flex flex-wrap items-center gap-2.5">
                <span>
                  {isNp ? myAssignment.classNameNp : myAssignment.classNameEn}
                  {' - '}
                  {isNp ? myAssignment.sectionNameNp || `खण्ड ${myAssignment.sectionCode}` : `Section ${myAssignment.sectionCode}`}
                </span>
                {myAssignment.isMarkedToday ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isNp ? 'आजको हाजिरी भरिएको' : 'Attendance Done'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isNp ? 'आजको हाजिरी लिन बाँकी' : 'Attendance Pending'}</span>
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-blue-200/85 max-w-2xl font-medium">
                {isNp
                  ? `तपाईं यस कक्षाको जिम्मेवार कक्षा शिक्षक हुनुहुन्छ। आजको मिति (${formatNumber(attendanceSummary?.dateBs || '2083-05-31')} BS) मा आफ्ना विद्यार्थीहरूको उपस्थिति विवरण यसै ड्यासबोर्डबाट सिधै व्यवस्थापन गर्नुहोस्।`
                  : `You are assigned as the Class Teacher for this section. Manage today's attendance directly from your dashboard.`}
              </p>
            </div>

            {/* Metrics Pills: Total, Present (P), Absent (A), Leave (L) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="bg-slate-900/80 border border-indigo-700/60 rounded-xl px-3.5 py-2.5 text-center min-w-[75px] shadow-xs">
                <div className="text-[11px] text-blue-200 font-semibold">{isNp ? 'कुल' : 'Total'}</div>
                <div className="text-lg font-black text-white">{formatNumber(myAssignment.totalStudents)}</div>
              </div>

              <div className="bg-emerald-950/80 border border-emerald-600/60 rounded-xl px-3.5 py-2.5 text-center min-w-[75px] shadow-xs">
                <div className="text-[11px] text-emerald-300 font-semibold">{isNp ? 'उपस्थित (P)' : 'Present (P)'}</div>
                <div className="text-xl font-black text-emerald-400">{formatNumber(myAssignment.present)}</div>
              </div>

              <div className="bg-rose-950/80 border border-rose-600/60 rounded-xl px-3.5 py-2.5 text-center min-w-[75px] shadow-xs">
                <div className="text-[11px] text-rose-300 font-semibold">{isNp ? 'अनुपस्थित (A)' : 'Absent (A)'}</div>
                <div className="text-xl font-black text-rose-400">{formatNumber(myAssignment.absent)}</div>
              </div>

              <div className="bg-amber-950/80 border border-amber-600/60 rounded-xl px-3.5 py-2.5 text-center min-w-[75px] shadow-xs">
                <div className="text-[11px] text-amber-300 font-semibold">{isNp ? 'बिदा (L)' : 'Leave (L)'}</div>
                <div className="text-xl font-black text-amber-400">{formatNumber(myAssignment.leave)}</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onNavigate?.('attendance', 'DAILY', myAssignment.classId)}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-950/50 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isNp ? 'हाजिरी भर्नुहोस्' : 'Mark Attendance'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Principal / Admin Substitute Alert Banner */}
      {substituteOverview && substituteOverview.vacantCount > 0 && (
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 text-white rounded-2xl p-5 shadow-lg border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-white/10 text-rose-200 border border-white/20 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isNp ? 'सट्टा शिक्षक तोक्न बाँकी खाली पिरियडहरू' : 'Vacant Periods Require Substitute Teachers'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-bounce">
                  {formatNumber(substituteOverview.vacantCount)} {isNp ? 'पिरियड खाली' : 'Vacant'}
                </span>
              </div>
              <p className="text-xs text-rose-100/85 mt-0.5">
                {isNp
                  ? `आज अनुपस्थित/बिदा/काजमा रहेका शिक्षकहरूका कारण ${formatNumber(substituteOverview.vacantCount)} वटा कक्षा खाली छन्। कृपया तत्काल सट्टा शिक्षक खटाउनुहोस्।`
                  : `${substituteOverview.vacantCount} class periods are vacant today due to absent/leave/OD staff. Please assign substitutes.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('substitute')}
            className="px-4 py-2.5 bg-white text-rose-900 hover:bg-rose-50 rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-rose-600" />
            <span>{isNp ? 'सट्टा शिक्षक तोक्नुहोस्' : 'Assign Substitutes Now'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 text-rose-600" />
          </button>
        </div>
      )}

      {/* Substitute Duty Alert for Logged-In Teacher */}
      {mySubstituteAssignments.length > 0 && (
        <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-purple-500/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/30 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/30 animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>{isNp ? 'आजको सट्टा कक्षा जिम्मेवारी' : 'Today’s Substitute Class Duty'}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
                    {formatNumber(mySubstituteAssignments.length)} कक्षा
                  </span>
                </h3>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  {isNp
                    ? 'अनुपस्थित/काजमा रहनुभएका शिक्षकहरूको सट्टामा तपाईंलाई आज निम्न कक्षा लिन जिम्मेवारी दिइएको छ:'
                    : 'You have been assigned to cover the following class(es) today:'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {mySubstituteAssignments.map((a) => (
              <div
                key={a.id}
                className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3.5 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-purple-600/50 border border-purple-400/40">
                    {isNp ? a.classNameNp : a.classNameEn} ({isNp ? a.sectionNameNp : a.sectionCode})
                  </span>
                  <span className="text-[11px] font-bold text-amber-300 font-mono">
                    {isNp ? periodNamesNp[a.periodNumber] || `${a.periodNumber} घण्टी` : `Period ${a.periodNumber}`}
                  </span>
                </div>

                <div className="text-xs font-semibold text-purple-100">
                  {isNp ? 'विषय' : 'Subject'}:{' '}
                  <span className="font-bold text-white">{isNp ? a.subjectNameNp : a.subjectNameEn}</span>
                </div>

                <div className="text-[11px] text-purple-200/80">
                  {isNp ? 'नियमित शिक्षक' : 'Regular Teacher'}:{' '}
                  <span className="font-semibold text-purple-100">
                    {isNp ? a.originalTeacherNameNp : a.originalTeacherNameEn}
                  </span>
                </div>

                {a.startTime && a.endTime && (
                  <div className="flex items-center text-[11px] text-purple-300/80 font-mono">
                    <Clock className="w-3 h-3 mr-1 text-purple-400" />
                    <span>
                      {a.startTime} - {a.endTime}
                    </span>
                  </div>
                )}

                {a.remarks && (
                  <div className="text-[11px] bg-purple-950/60 border border-purple-800/50 rounded px-2 py-1 text-purple-200 italic">
                    {isNp ? 'कैफियत' : 'Remarks'}: {a.remarks}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Today's Attendance Overview for Principal / Admin / All Staff */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isNp ? 'आजको उपस्थिति अवस्था' : "Today's Attendance Overview"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {formatNumber(attendanceSummary?.dateBs || '2083-05-31')} BS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {isNp
                  ? 'शिक्षक, कर्मचारी र विद्यार्थीहरूको उपस्थित (P), अनुपस्थित (A), बिदा (L) तथा काज (OD) को विवरण'
                  : 'Daily attendance breakdown: Present (P), Absent (A), Leave (L), and Official Duty (OD)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAttendanceSummary}
              disabled={isAttendanceLoading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title={isNp ? 'ताजा गर्नुहोस्' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAttendanceLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isNp ? 'ताजा गर्नुहोस्' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 3 Top Summary KPI Cards (Present, Absent, Leave, and OD Highlighted) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Teachers Attendance (P, A, L, OD) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isNp ? 'शिक्षक उपस्थिति' : 'Teachers Attendance'}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {isNp
                      ? `कुल ${formatNumber(attendanceSummary?.teachers?.total || 35)} जना शिक्षक`
                      : `Total ${attendanceSummary?.teachers?.total || 35} Teachers`}
                  </div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                {formatNumber(attendanceSummary?.teachers?.attendanceRate || 0)}%
              </span>
            </div>

            {/* 4 Stat Boxes: Present (P), Absent (A), Leave (L), Official Duty (OD) */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {isNp ? 'उपस्थित' : 'P'}
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatNumber(attendanceSummary?.teachers?.present ?? 0)}
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                  {isNp ? 'अनुपस्थित' : 'A'}
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatNumber(attendanceSummary?.teachers?.absent ?? 0)}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {isNp ? 'बिदा (L)' : 'Leave (L)'}
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatNumber(attendanceSummary?.teachers?.onLeave ?? 0)}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  {isNp ? 'काज (OD)' : 'OD'}
                </div>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  {formatNumber(attendanceSummary?.teachers?.officialDuty ?? 0)}
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigate?.('attendance', 'STAFF_ATTENDANCE')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold inline-flex items-center text-xs group"
              >
                <span>{isNp ? 'शिक्षक हाजिरी हेर्नुहोस्' : 'View Teacher Attendance'}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 transition transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Support / Administrative Staff Attendance (P, A, L, OD) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isNp ? 'कर्मचारी उपस्थिति' : 'Staff Attendance'}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {isNp
                      ? `कुल ${formatNumber(attendanceSummary?.staff?.total || 4)} जना प्रशासनिक कर्मचारी`
                      : `Total ${attendanceSummary?.staff?.total || 4} Staff`}
                  </div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 font-mono bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900">
                {formatNumber(attendanceSummary?.staff?.attendanceRate || 0)}%
              </span>
            </div>

            {/* 4 Stat Boxes: Present (P), Absent (A), Leave (L), Official Duty (OD) */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {isNp ? 'उपस्थित' : 'P'}
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatNumber(attendanceSummary?.staff?.present ?? 0)}
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                  {isNp ? 'अनुपस्थित' : 'A'}
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatNumber(attendanceSummary?.staff?.absent ?? 0)}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {isNp ? 'बिदा (L)' : 'Leave (L)'}
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatNumber(attendanceSummary?.staff?.onLeave ?? 0)}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  {isNp ? 'काज (OD)' : 'OD'}
                </div>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  {formatNumber(attendanceSummary?.staff?.officialDuty ?? 0)}
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigate?.('attendance', 'STAFF_ATTENDANCE')}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-bold inline-flex items-center text-xs group"
              >
                <span>{isNp ? 'कर्मचारी हाजिरी हेर्नुहोस्' : 'View Staff Attendance'}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 transition transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Students Overall Attendance (P, A, L) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isNp ? 'विद्यार्थी समग्र उपस्थिति' : 'Students Overall'}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {isNp
                      ? `कुल ${formatNumber(attendanceSummary?.studentsOverall?.total || 0)} जना विद्यार्थी`
                      : `Total ${attendanceSummary?.studentsOverall?.total || 0} Students`}
                  </div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                {formatNumber(attendanceSummary?.studentsOverall?.attendanceRate || 0)}%
              </span>
            </div>

            {/* 3 Stat Boxes: Present (P), Absent (A), Leave (L) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {isNp ? 'उपस्थित (P)' : 'Present (P)'}
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatNumber(attendanceSummary?.studentsOverall?.present ?? 0)}
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                  {isNp ? 'अनुपस्थित (A)' : 'Absent (A)'}
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatNumber(attendanceSummary?.studentsOverall?.absent ?? 0)}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-2 text-center">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {isNp ? 'बिदा (L)' : 'Leave (L)'}
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatNumber(attendanceSummary?.studentsOverall?.onLeave ?? 0)}
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <button
                onClick={() => onNavigate?.('attendance', 'DAILY')}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold inline-flex items-center text-xs group"
              >
                <span>{isNp ? 'दैनिक विद्यार्थी हाजिरी खाता' : 'Open Student Attendance'}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 transition transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Absent, Leave & Official Duty Staff Names (अनुपस्थित, बिदा र काजमा रहेका शिक्षक तथा कर्मचारीहरू) */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3.5">
            <div>
              <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {isNp
                    ? 'आज अनुपस्थित, बिदा तथा काजमा रहेका शिक्षक र कर्मचारीहरू'
                    : 'Teachers & Staff on Absent, Leave & Official Duty Today'}
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isNp
                  ? 'आजको मितिमा नियमित कार्य/कक्षामा अनुपस्थित, स्वीकृत बिदा वा आधिकारिक काजमा खटिएका कर्मचारीहरूको नामावली'
                  : 'Live personnel list of those who are absent, on approved leave, or deputed on official duty'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>
                  {isNp ? 'अनुपस्थित' : 'Absent'}: {formatNumber(attendanceSummary?.notableStaff?.absent?.length || 0)}
                </span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>
                  {isNp ? 'बिदा' : 'Leave'}: {formatNumber(attendanceSummary?.notableStaff?.onLeave?.length || 0)}
                </span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>
                  {isNp ? 'काज (OD)' : 'OD'}: {formatNumber(attendanceSummary?.notableStaff?.officialDuty?.length || 0)}
                </span>
              </span>
            </div>
          </div>

          {/* If everyone is present */}
          {!attendanceSummary?.notableStaff || attendanceSummary.notableStaff.total === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 text-center space-y-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                {isNp
                  ? 'शानदार! आज सबै शिक्षक तथा कर्मचारीहरू पूर्ण रूपमा उपस्थित हुनुहुन्छ।'
                  : 'All teachers and staff are present today!'}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                {isNp
                  ? 'आज कोही पनि गयल, बिदा वा काजमा नरहेको रेकर्ड छ।'
                  : 'No recorded absences, leaves, or official duties today.'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Absent (गयल) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-2.5">
                  <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <UserX className="w-4 h-4 text-rose-500" />
                    <span>{isNp ? 'अनुपस्थित (गयल)' : 'Absent'}</span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-mono">
                    {formatNumber(attendanceSummary?.notableStaff?.absent?.length || 0)} जना
                  </span>
                </div>

                {!attendanceSummary?.notableStaff?.absent || attendanceSummary.notableStaff.absent.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    {isNp ? 'आज कोही पनि अनुपस्थित हुनुहुन्न' : 'No staff absent today'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {attendanceSummary.notableStaff.absent.map((staff) => (
                      <div
                        key={staff.id}
                        className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-lg p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {isNp ? staff.fullNameNp : staff.fullNameEn}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {staff.staffCode}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              staff.category === 'TEACHING'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {staff.category === 'TEACHING'
                              ? isNp
                                ? 'शिक्षक'
                                : 'Teacher'
                              : isNp
                              ? 'कर्मचारी'
                              : 'Staff'}
                          </span>
                        </div>

                        {staff.phone && (
                          <div className="flex items-center text-[11px] text-slate-600 dark:text-slate-400">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            <a href={`tel:${staff.phone}`} className="hover:underline font-mono">
                              {staff.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: On Leave (बिदा) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-200 dark:border-amber-900/60 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-2.5">
                  <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>{isNp ? 'बिदामा रहेका (L)' : 'On Leave (L)'}</span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-mono">
                    {formatNumber(attendanceSummary?.notableStaff?.onLeave?.length || 0)} जना
                  </span>
                </div>

                {!attendanceSummary?.notableStaff?.onLeave || attendanceSummary.notableStaff.onLeave.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    {isNp ? 'आज कोही पनि बिदामा हुनुहुन्न' : 'No staff on leave today'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {attendanceSummary.notableStaff.onLeave.map((staff) => (
                      <div
                        key={staff.id}
                        className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-lg p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {isNp ? staff.fullNameNp : staff.fullNameEn}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {staff.staffCode}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              staff.category === 'TEACHING'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {staff.category === 'TEACHING'
                              ? isNp
                                ? 'शिक्षक'
                                : 'Teacher'
                              : isNp
                              ? 'कर्मचारी'
                              : 'Staff'}
                          </span>
                        </div>

                        {staff.phone && (
                          <div className="flex items-center text-[11px] text-slate-600 dark:text-slate-400">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            <a href={`tel:${staff.phone}`} className="hover:underline font-mono">
                              {staff.phone}
                            </a>
                          </div>
                        )}

                        {staff.remarks && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 px-2 py-1 rounded">
                            {staff.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 3: Official Duty (काज / OD) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-purple-200 dark:border-purple-900/60 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 pb-2.5">
                  <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-400 font-bold text-xs">
                    <Briefcase className="w-4 h-4 text-purple-500" />
                    <span>{isNp ? 'काजमा खटिएका (OD)' : 'Official Duty (OD)'}</span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-mono">
                    {formatNumber(attendanceSummary?.notableStaff?.officialDuty?.length || 0)} जना
                  </span>
                </div>

                {!attendanceSummary?.notableStaff?.officialDuty ||
                attendanceSummary.notableStaff.officialDuty.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    {isNp ? 'आज कोही पनि काजमा हुनुहुन्न' : 'No staff on official duty today'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {attendanceSummary.notableStaff.officialDuty.map((staff) => (
                      <div
                        key={staff.id}
                        className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-lg p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {isNp ? staff.fullNameNp : staff.fullNameEn}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {staff.staffCode}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              staff.category === 'TEACHING'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {staff.category === 'TEACHING'
                              ? isNp
                                ? 'शिक्षक'
                                : 'Teacher'
                              : isNp
                              ? 'कर्मचारी'
                              : 'Staff'}
                          </span>
                        </div>

                        {staff.phone && (
                          <div className="flex items-center text-[11px] text-slate-600 dark:text-slate-400">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            <a href={`tel:${staff.phone}`} className="hover:underline font-mono">
                              {staff.phone}
                            </a>
                          </div>
                        )}

                        <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-950/60 px-2 py-1 rounded font-medium">
                          {staff.remarks
                            ? `${isNp ? 'काज विवरण' : 'Duty'}: ${staff.remarks}`
                            : isNp
                            ? 'आधिकारिक काज'
                            : 'Official Duty'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Today's Substitute Class Management (आजको सट्टा कक्षा व्यवस्थापन) */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3.5">
            <div>
              <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {isNp ? 'आजको सट्टा कक्षा व्यवस्थापन' : 'Today’s Substitute Class Management'}
                </span>
                {substituteOverview?.dayOfWeek && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {isNp
                      ? nepaliDaysMap[substituteOverview.dayOfWeek] || substituteOverview.dayOfWeek
                      : englishDaysMap[substituteOverview.dayOfWeek] || substituteOverview.dayOfWeek}
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isNp
                  ? 'अनुपस्थित, बिदा वा काजमा रहेका शिक्षकहरूका खाली पिरियडहरूमा सट्टा शिक्षक तोक्ने र अनुगमन गर्ने प्रणाली'
                  : 'Assign and monitor substitute teachers for vacant periods due to absent, leave or on-duty staff'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  {isNp ? 'खाली पिरियड' : 'Vacant'}: {formatNumber(substituteOverview?.vacantCount ?? 0)}
                </span>
              </span>

              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {isNp ? 'सट्टा तोकिएको' : 'Assigned'}: {formatNumber(substituteOverview?.assignedCount ?? 0)}
                </span>
              </span>

              <button
                type="button"
                onClick={() => onNavigate?.('substitute')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isNp ? 'सट्टा व्यवस्थापन पोर्टल' : 'Open Portal'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setShowPrintSlip(true)}
                disabled={!substituteOverview || substituteOverview.periods.length === 0}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>{isNp ? 'सट्टा तालिका पुर्जी प्रिन्ट' : 'Print Slip'}</span>
              </button>

              <button
                type="button"
                onClick={fetchSubstituteData}
                disabled={isSubstituteLoading}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"
                title={isNp ? 'ताजा गर्नुहोस्' : 'Refresh'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubstituteLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Periods Content */}
          {!substituteOverview || substituteOverview.periods.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                {isNp
                  ? 'आज कुनै पनि कक्षाको पिरियड खाली छैन वा सबै शिक्षकहरू नियमित अध्यापनमा हुनुहुन्छ।'
                  : 'No vacant periods today. All scheduled classes are running normally.'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isNp
                  ? 'अनुपस्थित वा काजमा रहेका शिक्षकहरूको आजको बारमा कुनै कक्षा परेको देखिएन।'
                  : 'Teachers on leave/OD do not have classes scheduled on this day of week.'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {substituteOverview.periods.map((p) => {
                const periodTitle = periodNamesNp[p.periodNumber] || `${p.periodNumber} घण्टी`;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl p-4 border transition shadow-2xs space-y-3 ${
                      p.isAssigned
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    }`}
                  >
                    {/* Header: Class + Period */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {isNp ? p.classNameNp : p.classNameEn} ({isNp ? p.sectionNameNp : p.sectionCode})
                        </span>
                        <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                          {isNp ? periodTitle : `Period ${p.periodNumber}`}{' '}
                          {p.startTime && p.endTime && `• ${p.startTime} - ${p.endTime}`}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          p.isAssigned
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse'
                        }`}
                      >
                        {p.isAssigned
                          ? isNp ? '✓ सट्टा तोकिएको' : 'Assigned'
                          : isNp ? '⚠️ खाली पिरियड' : 'Vacant'}
                      </span>
                    </div>

                    {/* Subject */}
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {isNp ? 'विषय' : 'Subject'}:
                      </span>{' '}
                      <span className="font-bold text-slate-900 dark:text-white">
                        {isNp ? p.subjectNameNp : p.subjectNameEn}
                      </span>
                    </div>

                    {/* Original Teacher */}
                    {p.originalTeacher && (
                      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {isNp ? 'नियमित शिक्षक' : 'Teacher'}:
                          </span>
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              p.originalTeacher.attendanceStatus === 'OFFICIAL_DUTY'
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                : p.originalTeacher.attendanceStatus === 'ON_LEAVE'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {p.originalTeacher.attendanceStatus === 'OFFICIAL_DUTY'
                              ? isNp ? 'काजमा' : 'On Duty'
                              : p.originalTeacher.attendanceStatus === 'ON_LEAVE'
                              ? isNp ? 'बिदामा' : 'On Leave'
                              : isNp ? 'अनुपस्थित' : 'Absent'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {isNp ? p.originalTeacher.fullNameNp : p.originalTeacher.fullNameEn}
                          <span className="font-normal font-mono text-[10px] text-slate-400 ml-1">
                            ({p.originalTeacher.staffCode})
                          </span>
                        </div>
                        {p.originalTeacher.remarks && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                            {p.originalTeacher.remarks}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assigned or Action */}
                    {p.isAssigned && p.assignment?.substituteTeacher ? (
                      <div className="bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg p-2.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isNp ? 'सट्टा शिक्षक' : 'Substitute'}:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelSubstitute(p.assignment!.id)}
                            className="text-[10px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold hover:underline"
                          >
                            {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                          </button>
                        </div>
                        <div className="font-black text-slate-900 dark:text-white">
                          {isNp
                            ? p.assignment.substituteTeacher.fullNameNp
                            : p.assignment.substituteTeacher.fullNameEn}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span className="font-mono">{p.assignment.substituteTeacher.staffCode}</span>
                          {p.assignment.substituteTeacher.phone && (
                            <span className="font-mono">{p.assignment.substituteTeacher.phone}</span>
                          )}
                        </div>
                        {p.assignment.remarks && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 italic pt-0.5">
                            {p.assignment.remarks}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>{isNp ? 'खाली शिक्षक सिफारिस' : 'Free Teachers'}:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {formatNumber(p.availableTeachers.length)} जना उपलब्ध
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignModalSlot(p);
                            setSelectedSubTeacherId('');
                            setAssignRemarks('');
                            setAssignError('');
                          }}
                          className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isNp ? '+ सट्टा शिक्षक तोक्नुहोस्' : 'Assign Substitute'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Class-wise Student Attendance Table (कक्षा अनुसार विद्यार्थी उपस्थिति) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{isNp ? 'कक्षा अनुसार विद्यार्थी उपस्थिति' : 'Class-wise Student Attendance'}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({isNp ? 'उपस्थित, अनुपस्थित र बिदा विवरण' : 'Present, Absent & Leave Details'})
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isNp
                  ? 'हरेक कक्षा तथा खण्डको तोकिएको कक्षा शिक्षक, कुल विद्यार्थी, उपस्थित (P), अनुपस्थित (A) र बिदा (L)'
                  : 'Assigned class teachers, total students, and today attendance numbers for all grades'}
              </p>
            </div>

            {/* Filter Buttons and Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isNp ? 'कक्षा खोज्नुहोस्...' : 'Search class...'}
                  value={classSearchTerm}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setClassFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    classFilterMode === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isNp ? 'सबै' : 'All'} ({formatNumber(allClassWise.length)})
                </button>
                <button
                  onClick={() => setClassFilterMode('WITH_STUDENTS')}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    classFilterMode === 'WITH_STUDENTS'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isNp ? 'विद्यार्थी भएका' : 'With Students'} ({formatNumber(countClassesWithStudents)})
                </button>
                <button
                  onClick={() => setClassFilterMode('PENDING')}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    classFilterMode === 'PENDING'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isNp ? 'हाजिरी बाँकी' : 'Pending'} ({formatNumber(countPendingClasses)})
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">{isNp ? 'कक्षा / तह' : 'Class / Grade'}</th>
                  <th className="py-3 px-4">{isNp ? 'खण्ड तथा कक्षा शिक्षक' : 'Section & Class Teacher'}</th>
                  <th className="py-3 px-3 text-center">{isNp ? 'कुल' : 'Total'}</th>
                  <th className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-400">
                    {isNp ? 'उपस्थित (P)' : 'Present (P)'}
                  </th>
                  <th className="py-3 px-3 text-center text-rose-700 dark:text-rose-400">
                    {isNp ? 'अनुपस्थित (A)' : 'Absent (A)'}
                  </th>
                  <th className="py-3 px-3 text-center text-amber-700 dark:text-amber-400">
                    {isNp ? 'बिदा (L)' : 'Leave (L)'}
                  </th>
                  <th className="py-3 px-3 text-center">{isNp ? 'स्थिति' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'कार्य' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                      {isNp ? 'कुनै कक्षा फेला परेन' : 'No classes found'}
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((cls) => {
                    const hasStudents = cls.totalStudents > 0;
                    return (
                      <tr
                        key={cls.classId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Class Name & Code */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold font-mono flex items-center justify-center text-xs border border-blue-200 dark:border-blue-900 shrink-0">
                              {cls.code}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {isNp ? cls.nameNp : cls.nameEn}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                {cls.code !== 'ECD' ? `Grade ${cls.code}` : 'Early Childhood'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Section & Class Teacher Display */}
                        <td className="py-3 px-4">
                          {cls.sections && cls.sections.length > 0 ? (
                            <div className="space-y-1.5">
                              {cls.sections.map((sec) => (
                                <div
                                  key={sec.sectionId}
                                  className="flex flex-wrap items-center gap-1.5 text-[11px]"
                                >
                                  <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    {isNp ? sec.nameNp || `खण्ड ${sec.code}` : `Sec ${sec.code}`}
                                  </span>

                                  {sec.classTeacherName ? (
                                    <span className="inline-flex items-center text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 font-medium">
                                      <GraduationCap className="w-3 h-3 mr-1 text-indigo-500" />
                                      {sec.classTeacherName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">
                                      ({isNp ? 'कक्षा शिक्षक तोकिएको छैन' : 'No teacher assigned'})
                                    </span>
                                  )}

                                  {cls.sections.length > 1 && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      ({formatNumber(sec.present)}P / {formatNumber(sec.absent)}A / {formatNumber(sec.leave)}L)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                              {isNp ? 'कुनै खण्ड छैन' : 'No sections'}
                            </span>
                          )}
                        </td>

                        {/* Total Students */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-black font-mono ${
                              hasStudents ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                            }`}
                          >
                            {formatNumber(cls.totalStudents)}
                          </span>
                        </td>

                        {/* Present Count (High-visibility Emerald) */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[34px] px-2 py-1 rounded-md text-xs font-black font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            {formatNumber(cls.present)}
                          </span>
                        </td>

                        {/* Absent Count (High-visibility Rose) */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[34px] px-2 py-1 rounded-md text-xs font-black font-mono bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            {formatNumber(cls.absent)}
                          </span>
                        </td>

                        {/* Leave Count (High-visibility Amber) */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[34px] px-2 py-1 rounded-md text-xs font-black font-mono ${
                              cls.leave > 0
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {formatNumber(cls.leave)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {!hasStudents ? (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {isNp ? 'विद्यार्थी छैन' : 'No Students'}
                            </span>
                          ) : cls.isMarkedToday ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{isNp ? 'भरिएको' : 'Marked'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>{isNp ? 'बाँकी' : 'Pending'}</span>
                            </span>
                          )}
                        </td>

                        {/* Action Link */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onNavigate?.('attendance', 'DAILY', cls.classId)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 transition"
                          >
                            <span>{isNp ? 'हाजिरी हेर्नुहोस्' : 'View'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Principal Administrative Action: Staff Monthly Attendance View & Print */}
      {isPrincipalOrAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-900/90 text-indigo-200 text-xs font-bold border border-indigo-700/80">
                <Users className="w-3.5 h-3.5 text-indigo-300" />
                <span>{isNp ? 'प्रधानाध्यापक प्रशासनिक ड्यासबोर्ड' : 'Principal Administrative Portal'}</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{isNp ? 'शिक्षक तथा कर्मचारी मासिक हाजिरी खाता' : 'Staff Monthly Attendance Register'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isNp ? '१ देखि ३२ दिन' : '1-32 Days'}
                </span>
              </h3>
              <p className="text-sm text-indigo-200/80 max-w-2xl font-medium">
                {isNp
                  ? 'नेपाल सरकारको ढाँचा अनुसार सबै ३९ जना शिक्षक तथा कर्मचारीको १ देखि ३२ दिनको मासिक हाजिरी विवरण हेर्नुहोस्, परीक्षण गर्नुहोस् र आधिकारिक हाजिरी खाता प्रिन्ट गर्नुहोस्।'
                  : 'View government-standard 1-32 day monthly register for all 39 teachers and staff, and print official attendance sheets directly.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="bg-indigo-950/80 border border-indigo-800/70 rounded-xl px-4 py-2.5 text-center shadow-xs">
                <div className="text-[11px] text-indigo-300 font-semibold">{isNp ? 'कुल कर्मचारी' : 'Total Staff'}</div>
                <div className="text-lg font-black text-white">{formatNumber(39)} जना</div>
              </div>
              <div className="bg-indigo-950/80 border border-indigo-800/70 rounded-xl px-4 py-2.5 text-center shadow-xs">
                <div className="text-[11px] text-indigo-300 font-semibold">{isNp ? 'शिक्षक' : 'Teachers'}</div>
                <div className="text-lg font-black text-emerald-400">{formatNumber(35)} जना</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onNavigate?.('attendance', 'STAFF_MONTHLY_REGISTER')}
                  className="inline-flex items-center space-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/50 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isNp ? 'मासिक हाजिरी हेर्नुहोस् र प्रिन्ट गर्नुहोस्' : 'View & Print Monthly Register'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('dash.iemis_code')}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{iemisCode}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{schoolCode}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('dash.total_users')}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(counts.userCount)}</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Active Staff Accounts</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('dash.total_roles')}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(counts.roleCount)}</div>
            <div className="text-xs text-purple-700 dark:text-purple-400 font-semibold">
              {formatNumber(counts.permissionCount)} System Permissions
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('dash.system_status')}</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {t('dash.active')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">PostgreSQL Transactional DB</div>
          </div>
        </div>
      </div>

      {/* Stage 1 Foundation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Foundation Card 1 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Foundation Architecture (Nepal Context)</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
              Verified
            </span>
          </div>

          <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
            <li className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-900 dark:text-white">Bilingual Localization</strong>: Seamless toggle
                between Nepali (Devanagari) and English.
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-900 dark:text-white">Academic & Fiscal Year Separation</strong>: Active
                BS Academic Year ({formatNumber(academicYearBs)}) and Nepal Fiscal Year ({fiscalYearBs}).
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-900 dark:text-white">Granular RBAC</strong>: Record-level isolation;
                technical admin cannot see confidential student/staff records without authorization.
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-900 dark:text-white">Sync Outbox Ready</strong>: Durable outbox table for
                local school server to cloud replication.
              </span>
            </li>
          </ul>
        </div>

        {/* Foundation Card 2 */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Active Session Security & Audit Log</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800">
              Audited
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2 font-mono text-slate-800 dark:text-slate-200">
            <div>
              <strong className="text-slate-900 dark:text-white">User ID:</strong> {user?.id}
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Username:</strong> {user?.username}
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Roles:</strong> {user?.roles.map((r) => r.name).join(', ')}
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Superadmin Privilege:</strong>{' '}
              {user?.isSuperAdmin ? 'True' : 'False'}
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">Total Granted Permissions:</strong>{' '}
              {user?.permissions.length}
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
            <span>Security: Argon2/bcrypt + HTTP-only JWT</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center">
              Permanent Audit Trail <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </div>
        </div>
      </div>

      {/* Quick Assign Substitute Modal */}
      {assignModalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>{isNp ? 'सट्टा शिक्षक नियुक्ति' : 'Assign Substitute Teacher'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignModalSlot(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Period Details Box */}
            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>
                  {isNp ? assignModalSlot.classNameNp : assignModalSlot.classNameEn} (
                  {isNp ? assignModalSlot.sectionNameNp : assignModalSlot.sectionCode})
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  {isNp
                    ? periodNamesNp[assignModalSlot.periodNumber] || `${assignModalSlot.periodNumber} घण्टी`
                    : `Period ${assignModalSlot.periodNumber}`}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                {isNp ? 'विषय' : 'Subject'}:{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {isNp ? assignModalSlot.subjectNameNp : assignModalSlot.subjectNameEn}
                </span>{' '}
                {assignModalSlot.startTime && `(${assignModalSlot.startTime} - ${assignModalSlot.endTime})`}
              </div>
              {assignModalSlot.originalTeacher && (
                <div className="text-slate-500 dark:text-slate-400">
                  {isNp ? 'नियमित शिक्षक' : 'Regular'}:{' '}
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {isNp ? assignModalSlot.originalTeacher.fullNameNp : assignModalSlot.originalTeacher.fullNameEn}
                  </span>{' '}
                  ({assignModalSlot.originalTeacher.attendanceStatus})
                </div>
              )}
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'सट्टा शिक्षक छनोट गर्नुहोस् *' : 'Select Substitute Teacher *'}
                </label>
                <select
                  value={selectedSubTeacherId}
                  onChange={(e) => setSelectedSubTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {isNp
                      ? `-- खाली रहेका ${assignModalSlot.availableTeachers.length} शिक्षकहरू मध्ये छान्नुहोस् --`
                      : `-- Select from ${assignModalSlot.availableTeachers.length} free teachers --`}
                  </option>
                  {assignModalSlot.availableTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {isNp ? teacher.fullNameNp : teacher.fullNameEn} ({teacher.staffCode}) - {teacher.designation}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  {isNp
                    ? '✓ यी शिक्षकहरू आज उपस्थित हुनुहुन्छ र यस घण्टीमा कुनै कक्षा जुध्दैन (Zero Conflict Guaranteed)।'
                    : '✓ These teachers are present and have zero schedule conflicts in this period.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'कैफियत / निर्देशन (वैकल्पिक)' : 'Remarks / Instruction (Optional)'}
                </label>
                <input
                  type="text"
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder={isNp ? 'उदा. अभ्यास गराउने, अनुशासन हेर्ने...' : 'e.g. Conduct exercise, supervise...'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {assignError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {assignError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAssignModalSlot(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {isNp ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAssignSubstitute}
                disabled={isSubmittingAssign || !selectedSubTeacherId}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isSubmittingAssign
                  ? isNp ? 'सुरक्षित गर्दै...' : 'Saving...'
                  : isNp ? 'सट्टा सुरक्षित गर्नुहोस्' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Substitution Slip Modal */}
      {showPrintSlip && substituteOverview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 print:hidden">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>{isNp ? 'दैनिक सट्टा कक्षा तालिका पुर्जी' : 'Daily Substitution Routine Sheet'}</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isNp ? 'प्रिन्ट गर्नुहोस्' : 'Print'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintSlip(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-4 bg-white text-slate-900 rounded-xl border border-slate-300 space-y-4">
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-800 pb-3 space-y-0.5">
                <h2 className="text-lg font-black tracking-wide">
                  {isNp
                    ? school?.nameNp || 'श्री शान्ति माध्यमिक विद्यालय'
                    : school?.nameEn || 'Shree Shanti Secondary School'}
                </h2>
                <div className="text-xs text-slate-600">
                  {isNp
                    ? (school as any)?.addressNp || school?.addressEn || 'दमक, झापा, कोशी प्रदेश'
                    : school?.addressEn || 'Damak, Jhapa, Koshi Province'}{' '}
                  • IEMIS: {iemisCode}
                </div>
                <div className="text-sm font-black pt-1 underline">
                  {isNp ? 'दैनिक सट्टा कक्षा व्यवस्थापन पुर्जी' : 'DAILY TEACHER SUBSTITUTION ROUTINE SHEET'}
                </div>
                <div className="flex justify-between items-center text-xs pt-1 font-semibold text-slate-700">
                  <span>मिति: {formatNumber(substituteOverview.dateBs)} BS</span>
                  <span>बार: {nepaliDaysMap[substituteOverview.dayOfWeek] || substituteOverview.dayOfWeek}</span>
                  <span>कुल सट्टा पिरियड: {formatNumber(substituteOverview.periods.length)}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                    <th className="border border-slate-400 p-1.5 text-center w-10">क्र.सं.</th>
                    <th className="border border-slate-400 p-1.5 text-left">कक्षा / खण्ड</th>
                    <th className="border border-slate-400 p-1.5 text-center">घण्टी (समय)</th>
                    <th className="border border-slate-400 p-1.5 text-left">विषय</th>
                    <th className="border border-slate-400 p-1.5 text-left">नियमित शिक्षक (कारण)</th>
                    <th className="border border-slate-400 p-1.5 text-left">तोकिएको सट्टा शिक्षक</th>
                    <th className="border border-slate-400 p-1.5 text-center w-24">हस्ताक्षर / कैफियत</th>
                  </tr>
                </thead>
                <tbody>
                  {substituteOverview.periods.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-300">
                      <td className="border border-slate-400 p-1.5 text-center font-bold font-mono">{idx + 1}</td>
                      <td className="border border-slate-400 p-1.5 font-bold">
                        {p.classNameNp} ({p.sectionNameNp})
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center">
                        <div className="font-bold">{periodNamesNp[p.periodNumber] || `${p.periodNumber} घण्टी`}</div>
                        {p.startTime && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {p.startTime} - {p.endTime}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-400 p-1.5 font-bold">{p.subjectNameNp}</td>
                      <td className="border border-slate-400 p-1.5">
                        <div className="font-bold">{p.originalTeacher?.fullNameNp || '—'}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.originalTeacher?.attendanceStatus === 'OFFICIAL_DUTY'
                            ? `काज (${p.originalTeacher?.remarks || 'OD'})`
                            : p.originalTeacher?.attendanceStatus === 'ON_LEAVE'
                            ? 'बिदा'
                            : 'अनुपस्थित'}
                        </div>
                      </td>
                      <td className="border border-slate-400 p-1.5 font-bold text-slate-950">
                        {p.assignment?.substituteTeacher ? (
                          <div>
                            <div>{p.assignment.substituteTeacher.fullNameNp}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ({p.assignment.substituteTeacher.staffCode})
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold">⚠️ तोक्न बाँकी</span>
                        )}
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center text-[10px] text-slate-600">
                        {p.assignment?.remarks || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-12 text-xs font-bold text-slate-800">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-800 pb-1"></div>
                  <div className="mt-1">तयार गर्ने (प्रशासन/तालिका प्रमुख)</div>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-800 pb-1"></div>
                  <div className="mt-1">प्रधानाध्यापक (दस्तखत/छाप)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
