import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { toBik, toGreg, daysInMonth } from 'bikram-sambat';
import {
  CalendarCheck2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Save,
  Check,
  Calendar,
  Filter,
  Search,
  BookOpen,
  ArrowRight,
  School,
  Sparkles,
  Info,
} from 'lucide-react';

interface AttendanceManagementProps {
  initialTab?: 'DAILY' | 'MONTHLY_REGISTER' | 'STAFF_ATTENDANCE' | 'STAFF_MONTHLY_REGISTER';
  initialClassId?: string;
  onTabChange?: (tab: 'DAILY' | 'MONTHLY_REGISTER' | 'STAFF_ATTENDANCE' | 'STAFF_MONTHLY_REGISTER') => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  initialTab,
  initialClassId,
  onTabChange,
}) => {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const { school } = useSchool();
  const isNp = language === 'np';

  // Tabs
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY_REGISTER' | 'STAFF_ATTENDANCE' | 'STAFF_MONTHLY_REGISTER'>(
    initialTab || 'DAILY'
  );

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);

  const handleTabSwitch = (tab: 'DAILY' | 'MONTHLY_REGISTER' | 'STAFF_ATTENDANCE' | 'STAFF_MONTHLY_REGISTER') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Academic metadata
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');

  // Daily Student Attendance state
  const [selectedDateBs, setSelectedDateBs] = useState<string>('2083-05-31');
  const [dailyStudents, setDailyStudents] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any>({ total: 0, present: 0, absent: 0, late: 0, leave: 0, halfDay: 0 });
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [dailySuccessMsg, setDailySuccessMsg] = useState('');

  // Monthly Register state
  const [selectedMonthBs, setSelectedMonthBs] = useState<string>('5');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  // Staff Daily Attendance state (Dropdowns: Year, Month, Day)
  const [staffYearBs, setStaffYearBs] = useState<string>('2083');
  const [staffMonthBs, setStaffMonthBs] = useState<string>('5');
  const [staffDayBs, setStaffDayBs] = useState<string>('31');
  const [staffDateBs, setStaffDateBs] = useState<string>('2083-05-31');
  const [staffAttendanceList, setStaffAttendanceList] = useState<any[]>([]);
  const [staffCounts, setStaffCounts] = useState<any>({ total: 0, present: 0, absent: 0, onLeave: 0 });
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffSuccessMsg, setStaffSuccessMsg] = useState('');

  // Staff Monthly Register state
  const [staffMonthlyYearBs, setStaffMonthlyYearBs] = useState<string>('2083');
  const [staffMonthlyMonthBs, setStaffMonthlyMonthBs] = useState<string>('5');
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [staffMonthlyData, setStaffMonthlyData] = useState<any>(null);
  const [isStaffMonthlyLoading, setIsStaffMonthlyLoading] = useState(false);

  const nepaliMonths = [
    { num: '1', nameEn: 'Baisakh', nameNp: 'बैशाख' },
    { num: '2', nameEn: 'Jestha', nameNp: 'जेठ' },
    { num: '3', nameEn: 'Ashadh', nameNp: 'असार' },
    { num: '4', nameEn: 'Shrawan', nameNp: 'साउन' },
    { num: '5', nameEn: 'Bhadra', nameNp: 'भाद्र' },
    { num: '6', nameEn: 'Ashwin', nameNp: 'असोज' },
    { num: '7', nameEn: 'Kartik', nameNp: 'कार्तिक' },
    { num: '8', nameEn: 'Mangsir', nameNp: 'मंसिर' },
    { num: '9', nameEn: 'Poush', nameNp: 'पुष' },
    { num: '10', nameEn: 'Magh', nameNp: 'माघ' },
    { num: '11', nameEn: 'Falgun', nameNp: 'फागुन' },
    { num: '12', nameEn: 'Chaitra', nameNp: 'चैत' },
  ];

  // Initialize Today BS Date automatically on mount
  useEffect(() => {
    try {
      const todayBik = toBik(new Date());
      if (todayBik && todayBik.year) {
        const y = String(todayBik.year);
        const m = String(todayBik.month);
        const d = String(todayBik.day);
        setStaffYearBs(y);
        setStaffMonthBs(m);
        setStaffDayBs(d);
        const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        setStaffDateBs(formatted);
        setSelectedDateBs(formatted);
        setSelectedMonthBs(m);
        setStaffMonthlyYearBs(y);
        setStaffMonthlyMonthBs(m);
      }
    } catch (e) {
      console.error('Failed to get today BS date:', e);
    }
  }, []);

  const handleStaffYearChange = (newYear: string) => {
    setStaffYearBs(newYear);
    const maxDays = daysInMonth(Number(newYear) || 2083, Number(staffMonthBs) || 1);
    const validDay = Number(staffDayBs) > maxDays ? String(maxDays) : staffDayBs;
    setStaffDayBs(validDay);
    setStaffDateBs(`${newYear}-${String(staffMonthBs).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`);
  };

  const handleStaffMonthChange = (newMonth: string) => {
    setStaffMonthBs(newMonth);
    const maxDays = daysInMonth(Number(staffYearBs) || 2083, Number(newMonth) || 1);
    const validDay = Number(staffDayBs) > maxDays ? String(maxDays) : staffDayBs;
    setStaffDayBs(validDay);
    setStaffDateBs(`${staffYearBs}-${String(newMonth).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`);
  };

  const handleStaffDayChange = (newDay: string) => {
    setStaffDayBs(newDay);
    setStaffDateBs(`${staffYearBs}-${String(staffMonthBs).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`);
  };

  const handleSetStaffToday = () => {
    try {
      const todayBik = toBik(new Date());
      if (todayBik && todayBik.year) {
        const y = String(todayBik.year);
        const m = String(todayBik.month);
        const d = String(todayBik.day);
        setStaffYearBs(y);
        setStaffMonthBs(m);
        setStaffDayBs(d);
        setStaffDateBs(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Fetch Classes & Sections
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/academic/classes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const clsList = data.classes || [];
          setClasses(clsList);
          if (clsList.length > 0) {
            const targetClass = initialClassId
              ? clsList.find((c: any) => c.id === initialClassId)
              : null;
            const defClass = targetClass || clsList.find((c: any) => c.code === '10') || clsList[0];
            setSelectedClassId(defClass.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };
    fetchClasses();
  }, [token]);

  // Selected class's sections
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const sections = currentClass?.sections || [];

  // 2. Fetch Daily Student Attendance
  const fetchDailyAttendance = async () => {
    if (!selectedClassId || !selectedDateBs) return;
    setIsDailyLoading(true);
    setDailySuccessMsg('');
    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        dateBs: selectedDateBs,
      });
      if (selectedSectionId && selectedSectionId !== 'ALL') {
        params.append('sectionId', selectedSectionId);
      }

      const res = await fetch(`/api/attendance/daily?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDailyStudents(data.students || []);
        if (data.summary) setDailySummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load daily attendance:', err);
    } finally {
      setIsDailyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DAILY') {
      fetchDailyAttendance();
    }
  }, [selectedClassId, selectedSectionId, selectedDateBs, activeTab]);

  // 3. Mark All Present (1-Click feature)
  const handleMarkAllPresent = () => {
    const updated = dailyStudents.map((s) => ({
      ...s,
      status: 'PRESENT',
    }));
    setDailyStudents(updated);
    setDailySummary({
      ...dailySummary,
      present: updated.length,
      absent: 0,
      late: 0,
      leave: 0,
      halfDay: 0,
    });
  };

  // Toggle single student status
  const handleSetStudentStatus = (studentId: string, status: string) => {
    const updated = dailyStudents.map((s) => {
      if (s.studentId === studentId) {
        return { ...s, status };
      }
      return s;
    });
    setDailyStudents(updated);

    // Update summary counts
    setDailySummary({
      total: updated.length,
      present: updated.filter((s) => s.status === 'PRESENT').length,
      absent: updated.filter((s) => s.status === 'ABSENT').length,
      late: updated.filter((s) => s.status === 'LATE').length,
      leave: updated.filter((s) => s.status === 'SICK_LEAVE' || s.status === 'EXCUSED_LEAVE').length,
      halfDay: updated.filter((s) => s.status === 'HALF_DAY').length,
    });
  };

  // Save Daily Attendance
  const handleSaveDailyAttendance = async () => {
    setIsSavingDaily(true);
    setDailySuccessMsg('');
    try {
      const records = dailyStudents.map((s) => ({
        studentId: s.studentId,
        status: s.status,
        remarks: s.remarks,
      }));

      const res = await fetch('/api/attendance/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClassId,
          sectionId: selectedSectionId !== 'ALL' ? selectedSectionId : undefined,
          attendanceDateBs: selectedDateBs,
          records,
        }),
      });

      if (res.ok) {
        setDailySuccessMsg(
          isNp
            ? `कक्षाको हाजिरी सफलतापूर्वक सुरक्षित गरियो (${records.length} जना विद्यार्थीहरू)`
            : `Successfully recorded daily attendance for ${records.length} students`
        );
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save attendance');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingDaily(false);
    }
  };

  // 4. Fetch Monthly Register (Haziri Khata)
  const fetchMonthlyRegister = async () => {
    if (!selectedClassId) return;
    setIsMonthlyLoading(true);
    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        yearBs: '2083',
        monthBs: selectedMonthBs,
      });
      if (selectedSectionId && selectedSectionId !== 'ALL') {
        params.append('sectionId', selectedSectionId);
      }

      const res = await fetch(`/api/attendance/monthly-register?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMonthlyData(data);
      }
    } catch (err) {
      console.error('Failed to load monthly register:', err);
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MONTHLY_REGISTER') {
      fetchMonthlyRegister();
    }
  }, [selectedClassId, selectedSectionId, selectedMonthBs, activeTab]);

  // 5. Fetch Staff Daily Attendance
  const fetchStaffAttendance = async () => {
    setIsStaffLoading(true);
    setStaffSuccessMsg('');
    try {
      const res = await fetch(`/api/staff-attendance/daily?dateBs=${staffDateBs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaffAttendanceList(data.staff || []);
        if (data.counts) setStaffCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load staff attendance:', err);
    } finally {
      setIsStaffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'STAFF_ATTENDANCE') {
      fetchStaffAttendance();
    }
  }, [staffDateBs, activeTab]);

  const handleSaveStaffAttendance = async () => {
    setIsSavingStaff(true);
    setStaffSuccessMsg('');
    try {
      const records = staffAttendanceList.map((s) => ({
        staffId: s.staffId,
        status: s.status,
        inTime: s.inTime,
        outTime: s.outTime,
        remarks: s.remarks,
      }));

      const res = await fetch('/api/staff-attendance/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attendanceDateBs: staffDateBs,
          records,
        }),
      });

      if (res.ok) {
        setStaffSuccessMsg(
          isNp
            ? `शिक्षक तथा कर्मचारी हाजिरी सुरक्षित गरियो (${records.length} जना)`
            : `Staff attendance saved for ${records.length} members`
        );
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingStaff(false);
    }
  };

  // 6. Fetch Staff Monthly Register
  const fetchStaffMonthlyRegister = async () => {
    setIsStaffMonthlyLoading(true);
    try {
      const res = await fetch(
        `/api/staff-attendance/monthly-register?yearBs=${staffMonthlyYearBs}&monthBs=${staffMonthlyMonthBs}&category=${staffCategoryFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setStaffMonthlyData(data);
      }
    } catch (err) {
      console.error('Failed to load staff monthly register:', err);
    } finally {
      setIsStaffMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'STAFF_MONTHLY_REGISTER') {
      fetchStaffMonthlyRegister();
    }
  }, [staffMonthlyYearBs, staffMonthlyMonthBs, staffCategoryFilter, activeTab]);

  return (
    <div className="space-y-6">
      {/* Print-specific style */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 8pt !important;
          }
          th, td {
            border: 1px solid #666 !important;
            padding: 3px 4px !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {isNp ? 'हाजिरी व्यवस्थापन तथा मासिक हाजिरी खाता' : 'Attendance & Monthly Register'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isNp
                  ? 'विद्यार्थी तथा शिक्षक/कर्मचारीको १-क्लिक दैनिक हाजिरी र नेपाल सरकारको १ देखि ३२ दिनको मासिक हाजिरी खाता'
                  : 'Daily 1-click batch attendance & Nepal government 1-32 day monthly attendance register for students & staff'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>{isNp ? 'हाजिरी खाता प्रिन्ट (Print)' : 'Print Register'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 mt-6 gap-2">
          <button
            onClick={() => handleTabSwitch('DAILY')}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'DAILY'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{isNp ? 'विद्यार्थी दैनिक हाजिरी' : 'Student Daily Attendance'}</span>
          </button>

          <button
            onClick={() => handleTabSwitch('MONTHLY_REGISTER')}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'MONTHLY_REGISTER'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isNp ? 'विद्यार्थी मासिक खाता (Haziri Khata)' : 'Student Monthly Register'}</span>
          </button>

          <button
            onClick={() => handleTabSwitch('STAFF_ATTENDANCE')}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'STAFF_ATTENDANCE'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isNp ? 'शिक्षक/कर्मचारी दैनिक हाजिरी' : 'Staff Daily Attendance'}</span>
          </button>

          <button
            onClick={() => handleTabSwitch('STAFF_MONTHLY_REGISTER')}
            className={`pb-3 px-3.5 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'STAFF_MONTHLY_REGISTER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{isNp ? 'शिक्षक/कर्मचारी मासिक हाजिरी खाता' : 'Staff Monthly Register'}</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black uppercase rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
              {isNp ? 'प्रिन्ट' : 'Print'}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: Daily Student Attendance */}
      {activeTab === 'DAILY' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  {isNp ? 'कक्षा (Class)' : 'Class'}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('ALL');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  {isNp ? 'सेक्सन (Section)' : 'Section'}
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  <option value="ALL">{isNp ? 'सबै सेक्सन (All Sections)' : 'All Sections'}</option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {isNp ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  {isNp ? 'नेपाली मिति (Date BS)' : 'Date (BS)'}
                </label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={selectedDateBs}
                  onChange={(e) => setSelectedDateBs(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-mono dark:text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="flex-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{isNp ? 'सबै उपस्थित (Mark All P)' : 'Mark All Present'}</span>
                </button>
                <button
                  onClick={handleSaveDailyAttendance}
                  disabled={isSavingDaily}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center space-x-1 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingDaily ? 'Saving...' : isNp ? 'Save' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* Quick Summary Counts */}
            <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block">Total</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{dailySummary.total}</span>
              </div>
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                <span className="block font-semibold">Present (P)</span>
                <span className="font-bold text-sm">{dailySummary.present}</span>
              </div>
              <div className="p-2 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                <span className="block font-semibold">Absent (A)</span>
                <span className="font-bold text-sm">{dailySummary.absent}</span>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <span className="block font-semibold">Late (L)</span>
                <span className="font-bold text-sm">{dailySummary.late}</span>
              </div>
              <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                <span className="block font-semibold">Leave (S/E)</span>
                <span className="font-bold text-sm">{dailySummary.leave}</span>
              </div>
            </div>

            {dailySuccessMsg && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{dailySuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Student Daily Attendance List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {isDailyLoading ? (
              <div className="py-12 text-center text-slate-500">Loading student attendance sheet...</div>
            ) : dailyStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {isNp ? 'यस कक्षामा कुनै विद्यार्थी भेटिएन।' : 'No students found in this class/section.'}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Roll</th>
                    <th className="px-4 py-3">{isNp ? 'विद्यार्थीको नाम' : 'Student Name'}</th>
                    <th className="px-4 py-3 text-center">{isNp ? 'स्थिति चयन (Status)' : 'Status'}</th>
                    <th className="px-4 py-3">{isNp ? 'कैफियत (Remarks)' : 'Remarks'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dailyStudents.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-center font-bold font-mono text-slate-700 dark:text-slate-300">
                        {st.rollNumber || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {st.photoUrl ? (
                            <img
                              src={st.photoUrl}
                              alt={st.fullNameEn}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                              {st.fullNameEn?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{st.fullNameEn}</div>
                            <div className="text-xs text-slate-500">{st.fullNameNp} • {st.studentCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-1.5">
                          {[
                            { code: 'PRESENT', label: 'P', bg: 'bg-emerald-600 text-white', defaultBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50' },
                            { code: 'ABSENT', label: 'A', bg: 'bg-rose-600 text-white', defaultBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50' },
                            { code: 'LATE', label: 'L', bg: 'bg-amber-500 text-white', defaultBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50' },
                            { code: 'SICK_LEAVE', label: 'S', bg: 'bg-blue-600 text-white', defaultBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50' },
                            { code: 'EXCUSED_LEAVE', label: 'E', bg: 'bg-purple-600 text-white', defaultBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-50' },
                          ].map((btn) => {
                            const isSelected = st.status === btn.code;
                            return (
                              <button
                                key={btn.code}
                                type="button"
                                onClick={() => handleSetStudentStatus(st.studentId, btn.code)}
                                className={`w-8 h-8 rounded-lg font-bold text-xs transition ${
                                  isSelected ? `${btn.bg} shadow-sm scale-105` : btn.defaultBg
                                }`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="कैफियत..."
                          value={st.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDailyStudents((prev) =>
                              prev.map((item) => (item.studentId === st.studentId ? { ...item, remarks: val } : item))
                            );
                          }}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-emerald-500 dark:text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Monthly Haziri Khata (Days 1 to 32 Grid) */}
      {activeTab === 'MONTHLY_REGISTER' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  {isNp ? 'महिना (BS Month)' : 'Month (BS)'}
                </label>
                <select
                  value={selectedMonthBs}
                  onChange={(e) => setSelectedMonthBs(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  {nepaliMonths.map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.nameNp} ({m.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  {isNp ? 'कक्षा (Class)' : 'Class'}
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('ALL');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isNp ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  {isNp ? 'सेक्सन (Section)' : 'Section'}
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white"
                >
                  <option value="ALL">{isNp ? 'सबै सेक्सन (All Sections)' : 'All Sections'}</option>
                  {sections.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {isNp ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Haziri Khata Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {isMonthlyLoading ? (
              <div className="py-16 text-center text-slate-500">Loading Haziri Khata matrix...</div>
            ) : !monthlyData || monthlyData.students?.length === 0 ? (
              <div className="py-16 text-center text-slate-500">No attendance data found for this month.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-2 py-3 w-10 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">Roll</th>
                      <th className="px-3 py-3 w-44 sticky left-10 bg-slate-100 dark:bg-slate-800 z-10">
                        {isNp ? 'विद्यार्थीको नाम' : 'Student Name'}
                      </th>
                      {Array.from({ length: 32 }, (_, i) => i + 1).map((day) => (
                        <th key={day} className="px-1.5 py-3 text-center w-7 border-l border-slate-200 dark:border-slate-700 font-mono">
                          {day}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-center border-l border-slate-300 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/30">
                        P
                      </th>
                      <th className="px-2 py-3 text-center border-l border-slate-200 dark:border-slate-700 bg-rose-50 dark:bg-rose-950/30">
                        A
                      </th>
                      <th className="px-2 py-3 text-center border-l border-slate-200 dark:border-slate-700">
                        %
                      </th>
                      <th className="px-3 py-3 text-center border-l border-slate-200 dark:border-slate-700">
                        CDC 75% Rule
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyData.students.map((st: any) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="px-2 py-2 text-center font-mono font-bold sticky left-0 bg-white dark:bg-slate-900">
                          {st.rollNumber || '-'}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white sticky left-10 bg-white dark:bg-slate-900 truncate max-w-[170px]">
                          {st.fullNameEn}
                        </td>
                        {Array.from({ length: 32 }, (_, i) => i + 1).map((day) => {
                          const status = st.attendanceByDay[day];
                          let badge = null;
                          if (status === 'PRESENT') {
                            badge = <span className="text-emerald-700 font-bold">P</span>;
                          } else if (status === 'ABSENT') {
                            badge = <span className="text-rose-600 font-bold bg-rose-100 dark:bg-rose-900/60 px-1 rounded">A</span>;
                          } else if (status === 'LATE') {
                            badge = <span className="text-amber-600 font-bold">L</span>;
                          } else if (status === 'SICK_LEAVE' || status === 'EXCUSED_LEAVE') {
                            badge = <span className="text-blue-600 font-bold">S</span>;
                          }

                          return (
                            <td key={day} className="px-1 py-1 text-center border-l border-slate-100 dark:border-slate-800 text-[11px]">
                              {badge || <span className="text-slate-200 dark:text-slate-800">-</span>}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-bold text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 border-l border-slate-200 dark:border-slate-700">
                          {st.presentDays}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 border-l border-slate-200 dark:border-slate-700">
                          {st.absentDays}
                        </td>
                        <td className="px-2 py-2 text-center font-bold border-l border-slate-200 dark:border-slate-700">
                          {st.attendancePercentage}%
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200 dark:border-slate-700">
                          {st.belowThreshold ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Below 75% (अयोग्य)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                              <Check className="w-3 h-3" />
                              <span>Eligible</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Staff Attendance (Daily) */}
      {activeTab === 'STAFF_ATTENDANCE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Year, Month, Day Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5 mr-1">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{isNp ? 'मिति चयन:' : 'Date Selection:'}</span>
                </span>

                {/* Year Selection Dropdown */}
                <div className="flex items-center space-x-1">
                  <label className="text-xs text-slate-500 font-medium">{isNp ? 'साल:' : 'Year:'}</label>
                  <select
                    value={staffYearBs}
                    onChange={(e) => handleStaffYearChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {['2080', '2081', '2082', '2083', '2084', '2085'].map((y) => (
                      <option key={y} value={y}>
                        {y} {isNp ? 'साल' : 'BS'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Selection Dropdown */}
                <div className="flex items-center space-x-1">
                  <label className="text-xs text-slate-500 font-medium">{isNp ? 'महिना:' : 'Month:'}</label>
                  <select
                    value={staffMonthBs}
                    onChange={(e) => handleStaffMonthChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {nepaliMonths.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.num}. {isNp ? m.nameNp : m.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day Selection Dropdown */}
                <div className="flex items-center space-x-1">
                  <label className="text-xs text-slate-500 font-medium">{isNp ? 'गते:' : 'Day:'}</label>
                  <select
                    value={staffDayBs}
                    onChange={(e) => handleStaffDayChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  >
                    {Array.from(
                      { length: daysInMonth(Number(staffYearBs) || 2083, Number(staffMonthBs) || 1) },
                      (_, i) => i + 1
                    ).map((d) => (
                      <option key={d} value={String(d)}>
                        {d} {isNp ? 'गते' : 'Day'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Today Quick Button */}
                <button
                  onClick={handleSetStaffToday}
                  type="button"
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isNp ? 'आज (Today)' : 'Today'}</span>
                </button>

                {/* Formatted Date Pill */}
                <div className="hidden xl:inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold">
                  {staffDateBs}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTabSwitch('STAFF_MONTHLY_REGISTER')}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>{isNp ? 'मासिक खाता हेर्नुहोस्' : 'View Monthly Register'}</span>
                </button>

                <button
                  onClick={handleSaveStaffAttendance}
                  disabled={isSavingStaff}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingStaff ? 'Saving...' : isNp ? 'हाजिरी सुरक्षित गर्नुहोस्' : 'Save Attendance'}</span>
                </button>
              </div>
            </div>

            {staffSuccessMsg && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{staffSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {isStaffLoading ? (
              <div className="py-12 text-center text-slate-500">{isNp ? 'हाजिरी विवरण लोड हुँदैछ...' : 'Loading staff attendance...'}</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">{isNp ? 'नाम' : 'Staff Name'}</th>
                    <th className="px-4 py-3">{isNp ? 'पद' : 'Designation'}</th>
                    <th className="px-4 py-3 text-center">{isNp ? 'उपस्थिति स्थिति' : 'Attendance Status'}</th>
                    <th className="px-4 py-3">{isNp ? 'आगमन / प्रस्थान समय' : 'In / Out Time'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {staffAttendanceList.map((item) => (
                    <tr key={item.staffId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-blue-600">{item.staffCode}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {item.fullNameEn}
                        <div className="text-xs text-slate-500 font-normal">{item.fullNameNp}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        <div>{item.designation}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{item.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center space-x-1">
                          {[
                            { code: 'PRESENT', label: isNp ? 'उपस्थित (P)' : 'P', active: 'bg-emerald-600 text-white' },
                            { code: 'ABSENT', label: isNp ? 'अनुपस्थित (A)' : 'A', active: 'bg-rose-600 text-white' },
                            { code: 'ON_LEAVE', label: isNp ? 'बिदा (L)' : 'L', active: 'bg-blue-600 text-white' },
                            { code: 'OFFICIAL_DUTY', label: isNp ? 'काज (OD)' : 'OD', active: 'bg-purple-600 text-white' },
                          ].map((st) => (
                            <button
                              key={st.code}
                              onClick={() => {
                                setStaffAttendanceList((prev) =>
                                  prev.map((s) => (s.staffId === item.staffId ? { ...s, status: st.code } : s))
                                );
                              }}
                              className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                                item.status === st.code
                                  ? st.active
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2 text-xs">
                          <input
                            type="time"
                            value={item.inTime || '10:00'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStaffAttendanceList((prev) =>
                                prev.map((s) => (s.staffId === item.staffId ? { ...s, inTime: val } : s))
                              );
                            }}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={item.outTime || '16:00'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStaffAttendanceList((prev) =>
                                prev.map((s) => (s.staffId === item.staffId ? { ...s, outTime: val } : s))
                              );
                            }}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Staff Monthly Register (Haziri Khata) - View & Print for Principal */}
      {activeTab === 'STAFF_MONTHLY_REGISTER' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Year Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {isNp ? 'साल (Year)' : 'Year'}
                  </label>
                  <select
                    value={staffMonthlyYearBs}
                    onChange={(e) => setStaffMonthlyYearBs(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white"
                  >
                    {['2080', '2081', '2082', '2083', '2084', '2085'].map((y) => (
                      <option key={y} value={y}>
                        {y} {isNp ? 'साल' : 'BS'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {isNp ? 'महिना (Month)' : 'Month'}
                  </label>
                  <select
                    value={staffMonthlyMonthBs}
                    onChange={(e) => setStaffMonthlyMonthBs(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white"
                  >
                    {nepaliMonths.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.num}. {isNp ? m.nameNp : m.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {isNp ? 'श्रेणी (Category)' : 'Category'}
                  </label>
                  <select
                    value={staffCategoryFilter}
                    onChange={(e) => setStaffCategoryFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white"
                  >
                    <option value="ALL">{isNp ? 'सबै कर्मचारी (All 39)' : 'All Staff (39)'}</option>
                    <option value="TEACHING">{isNp ? 'शिक्षक मात्र (Teachers 35)' : 'Teachers Only (35)'}</option>
                    <option value="NON_TEACHING">{isNp ? 'प्रशासन/सहयोगी मात्र (Staff 4)' : 'Support Staff Only (4)'}</option>
                  </select>
                </div>

                {/* Search Box */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {isNp ? 'खोज्नुहोस् (Search)' : 'Search'}
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={isNp ? 'नाम वा कोड...' : 'Search staff...'}
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white w-40 sm:w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Print Action Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isNp ? 'हाजिरी खाता प्रिन्ट गर्नुहोस्' : 'Print Monthly Register'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Summary Cards */}
          {staffMonthlyData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{isNp ? 'कुल कर्मचारी' : 'Total Staff'}</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{staffMonthlyData.summary.totalStaff}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{isNp ? 'शिक्षक संख्या' : 'Teachers'}</div>
                <div className="text-lg font-black text-blue-600">{staffMonthlyData.summary.teachingCount}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{isNp ? 'सहयोगी कर्मचारी' : 'Support Staff'}</div>
                <div className="text-lg font-black text-purple-600">{staffMonthlyData.summary.nonTeachingCount}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{isNp ? 'रेकर्ड गरिएको कार्यदिन' : 'Working Days'}</div>
                <div className="text-lg font-black text-emerald-600">{staffMonthlyData.summary.totalRecordedDays} दिन</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{isNp ? 'औसत हाजिरी दर' : 'Attendance Rate'}</div>
                <div className="text-lg font-black text-emerald-600">{staffMonthlyData.summary.overallAttendancePercentage}%</div>
              </div>
            </div>
          )}

          {/* Printable Register Container */}
          <div id="printable-staff-register" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-4 sm:p-5">
            {/* Official Print Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-300 pb-3 mb-4 text-center">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wide">
                {isNp ? (school?.nameNp || school?.nameEn || 'विद्यालय') : (school?.nameEn || school?.nameNp || 'School')}
              </h2>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {isNp ? (school?.addressNp || school?.addressEn || '') : (school?.addressEn || school?.addressNp || '')}
                {school?.phone ? ` | ${isNp ? 'सम्पर्क:' : 'Phone:'} ${school.phone}` : ''}
                {school?.iemisCode ? ` | IEMIS ${isNp ? 'कोड:' : 'Code:'} ${school.iemisCode}` : ''}
              </div>
              <div className="text-sm font-black text-indigo-700 dark:text-indigo-400 mt-1 uppercase tracking-wider">
                शिक्षक तथा कर्मचारी मासिक हाजिरी खाता (Teachers & Staff Monthly Attendance Register)
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 mt-2 px-2 font-semibold">
                <div>
                  <strong>शैक्षिक वर्ष:</strong> {staffMonthlyYearBs} वि.सं.
                </div>
                <div>
                  <strong>महिना:</strong>{' '}
                  {nepaliMonths.find((m) => m.num === staffMonthlyMonthBs)?.nameNp} ({nepaliMonths.find((m) => m.num === staffMonthlyMonthBs)?.nameEn}) {staffMonthlyYearBs}
                </div>
                <div>
                  <strong>प्रिन्ट मिति:</strong> {staffDateBs}
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            {isStaffMonthlyLoading ? (
              <div className="py-16 text-center text-slate-500">{isNp ? 'मासिक खाता लोड हुँदैछ...' : 'Loading staff monthly register...'}</div>
            ) : !staffMonthlyData || staffMonthlyData.staff?.length === 0 ? (
              <div className="py-16 text-center text-slate-500">{isNp ? 'यस महिनाको कुनै विवरण फेला परेन।' : 'No attendance data found for this month.'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-300 dark:border-slate-700">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700">
                    <tr>
                      <th className="px-2 py-2 w-8 text-center border-r border-slate-300 dark:border-slate-700">क्र.सं.</th>
                      <th className="px-2 py-2 w-20 border-r border-slate-300 dark:border-slate-700">संकेत नं.</th>
                      <th className="px-3 py-2 w-48 border-r border-slate-300 dark:border-slate-700">
                        {isNp ? 'शिक्षक / कर्मचारीको नाम' : 'Staff Name'}
                      </th>
                      <th className="px-2 py-2 w-24 border-r border-slate-300 dark:border-slate-700">
                        {isNp ? 'पद' : 'Designation'}
                      </th>
                      {/* Day Columns 1 to Month Days (e.g. 31/32) */}
                      {Array.from(
                        { length: daysInMonth(Number(staffMonthlyYearBs) || 2083, Number(staffMonthlyMonthBs) || 1) },
                        (_, i) => i + 1
                      ).map((day) => {
                        let isWeekend = false;
                        try {
                          const g = toGreg(Number(staffMonthlyYearBs), Number(staffMonthlyMonthBs), day);
                          const wd = new Date(g.year, g.month - 1, g.day).getDay();
                          isWeekend = wd === 0 || wd === 6; // Sunday = 0, Saturday = 6
                        } catch {}
                        return (
                          <th
                            key={day}
                            className={`px-1 py-1.5 text-center w-6 border-r border-slate-200 dark:border-slate-700 font-mono ${
                              isWeekend
                                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold'
                                : ''
                            }`}
                          >
                            {day}
                          </th>
                        );
                      })}
                      {/* Summary Columns */}
                      <th className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-800 font-bold">
                        {isNp ? 'जम्मा' : 'Tot'}
                      </th>
                      <th className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold">
                        P
                      </th>
                      <th className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold">
                        A
                      </th>
                      <th className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold">
                        L
                      </th>
                      <th className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold">
                        OD
                      </th>
                      <th className="px-2.5 py-2 text-center bg-indigo-100 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(staffMonthlyData.staff || [])
                      .filter((s: any) => {
                        if (!staffSearchQuery.trim()) return true;
                        const q = staffSearchQuery.toLowerCase();
                        return (
                          s.fullNameEn?.toLowerCase().includes(q) ||
                          s.fullNameNp?.toLowerCase().includes(q) ||
                          s.staffCode?.toLowerCase().includes(q) ||
                          s.designation?.toLowerCase().includes(q)
                        );
                      })
                      .map((st: any, index: number) => {
                        const totalMonthDays = daysInMonth(
                          Number(staffMonthlyYearBs) || 2083,
                          Number(staffMonthlyMonthBs) || 1
                        );
                        return (
                          <tr key={st.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="px-2 py-1.5 text-center font-mono font-semibold border-r border-slate-200 dark:border-slate-700">
                              {index + 1}
                            </td>
                            <td className="px-2 py-1.5 font-mono font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">
                              {st.staffCode}
                            </td>
                            <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                              <div>{st.fullNameEn}</div>
                              <div className="text-[10px] text-slate-500 font-normal">{st.fullNameNp}</div>
                            </td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {st.designation}
                            </td>

                            {/* 1 to Month Days */}
                            {Array.from({ length: totalMonthDays }, (_, i) => i + 1).map((day) => {
                              const dayRecord = st.attendanceByDay?.[day];
                              let isWeekend = false;
                              try {
                                const g = toGreg(Number(staffMonthlyYearBs), Number(staffMonthlyMonthBs), day);
                                const wd = new Date(g.year, g.month - 1, g.day).getDay();
                                isWeekend = wd === 0 || wd === 6;
                              } catch {}

                              let cellContent = <span className="text-slate-300 dark:text-slate-700 font-mono">-</span>;
                              if (dayRecord) {
                                if (dayRecord.status === 'PRESENT') {
                                  cellContent = <span className="text-emerald-700 font-bold">P</span>;
                                } else if (dayRecord.status === 'ABSENT') {
                                  cellContent = <span className="text-rose-600 font-bold bg-rose-100 dark:bg-rose-900/60 px-0.5 rounded">A</span>;
                                } else if (dayRecord.status === 'ON_LEAVE') {
                                  cellContent = <span className="text-blue-600 font-bold bg-blue-100 dark:bg-blue-900/60 px-0.5 rounded">L</span>;
                                } else if (dayRecord.status === 'OFFICIAL_DUTY') {
                                  cellContent = <span className="text-purple-600 font-bold bg-purple-100 dark:bg-purple-900/60 px-0.5 rounded">OD</span>;
                                } else if (dayRecord.status === 'LATE') {
                                  cellContent = <span className="text-amber-600 font-bold">LT</span>;
                                }
                              } else if (isWeekend) {
                                cellContent = <span className="text-rose-400 dark:text-rose-500 text-[9px] font-bold">बिदा</span>;
                              }

                              return (
                                <td
                                  key={day}
                                  title={dayRecord ? `Day ${day}: ${dayRecord.status} (${dayRecord.inTime || '10:00'}-${dayRecord.outTime || '16:00'})` : `Day ${day}`}
                                  className={`px-1 py-1 text-center border-r border-slate-200 dark:border-slate-700 ${
                                    isWeekend ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                                  }`}
                                >
                                  {cellContent}
                                </td>
                              );
                            })}

                            {/* Summary Columns */}
                            <td className="px-2 py-1.5 text-center font-bold border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                              {st.totalDays}
                            </td>
                            <td className="px-2 py-1.5 text-center font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/20">
                              {st.presentDays}
                            </td>
                            <td className="px-2 py-1.5 text-center font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-700 bg-rose-50/40 dark:bg-rose-950/20">
                              {st.absentDays}
                            </td>
                            <td className="px-2 py-1.5 text-center font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/20">
                              {st.leaveDays}
                            </td>
                            <td className="px-2 py-1.5 text-center font-bold text-purple-600 dark:text-purple-400 border-r border-slate-200 dark:border-slate-700 bg-purple-50/40 dark:bg-purple-950/20">
                              {st.officialDutyDays}
                            </td>
                            <td className="px-2.5 py-1.5 text-center font-black bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200">
                              {st.attendancePercentage}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Print Signatures Block (Official Nepal Government 3-Officer Format) */}
            <div className="mt-8 pt-6 border-t-2 border-slate-300 dark:border-slate-700 grid grid-cols-3 gap-8 text-center text-xs">
              <div className="space-y-8">
                <div className="h-10"></div>
                <div className="border-t border-slate-800 dark:border-slate-400 pt-1">
                  <div className="font-bold text-slate-900 dark:text-white">{isNp ? 'तयार गर्ने (लेखापाल / प्रशासन)' : 'Prepared By (Accountant/Admin)'}</div>
                  <div className="text-[10px] text-slate-500">दस्तखत र मिति</div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="h-10"></div>
                <div className="border-t border-slate-800 dark:border-slate-400 pt-1">
                  <div className="font-bold text-slate-900 dark:text-white">{isNp ? 'जाँच गर्ने (सहायक प्र.अ.)' : 'Verified By (Vice Principal)'}</div>
                  <div className="text-[10px] text-slate-500">दस्तखत र मिति</div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="h-10"></div>
                <div className="border-t border-slate-800 dark:border-slate-400 pt-1">
                  <div className="font-bold text-slate-900 dark:text-white">{isNp ? 'प्रधानाध्यापक (Headmaster / Principal)' : 'Principal / Headmaster'}</div>
                  <div className="text-[10px] text-slate-500">दस्तखत, छाप र मिति</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
