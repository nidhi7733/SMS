import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { toBik } from 'bikram-sambat';
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Printer,
  RefreshCw,
  Search,
  BookOpen,
  Building,
  UserPlus,
  X,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface AvailableTeacher {
  id: string;
  staffCode: string;
  fullNameEn: string;
  fullNameNp: string;
  designation: string;
  phone: string;
}

interface SubstitutePeriod {
  id: string;
  timetableId?: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  classNameEn: string;
  classNameNp: string;
  sectionCode: string;
  sectionNameNp: string;
  subjectNameEn: string;
  subjectNameNp: string;
  originalTeacher: {
    id: string;
    staffCode: string;
    fullNameEn: string;
    fullNameNp: string;
    attendanceStatus: 'ABSENT' | 'ON_LEAVE' | 'OFFICIAL_DUTY';
    attendanceRemarks?: string;
  };
  isAssigned: boolean;
  assignmentId?: string;
  substituteTeacher?: {
    id: string;
    staffCode: string;
    fullNameEn: string;
    fullNameNp: string;
  };
  remarks?: string;
  availableTeachers: AvailableTeacher[];
}

interface SubstituteOverview {
  dateBs: string;
  dayOfWeek: string;
  vacantCount: number;
  assignedCount: number;
  totalAffected: number;
  periods: SubstitutePeriod[];
}

interface HistoryRecord {
  id: string;
  dateBs: string;
  periodNumber: number;
  startTime?: string;
  endTime?: string;
  remarks?: string;
  status: string;
  createdAt: string;
  classNameEn: string;
  classNameNp: string;
  sectionCode: string;
  sectionNameNp: string;
  subjectNameEn: string;
  subjectNameNp: string;
  originalTeacherNameEn: string;
  originalTeacherNameNp: string;
  substituteTeacherNameEn: string;
  substituteTeacherNameNp: string;
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

export const SubstituteManagement: React.FC = () => {
  const { language, formatNumber } = useLanguage();
  const { school } = useSchool();
  const isNp = language === 'np';
  const token = localStorage.getItem('sms_token') || '';

  // Get current Nepali date
  const todayBik = toBik(new Date());
  const initialDateBs = todayBik
    ? `${todayBik.year}-${String(todayBik.month).padStart(2, '0')}-${String(todayBik.day).padStart(2, '0')}`
    : '2083-05-31';

  const [activeTab, setActiveTab] = useState<'TODAY' | 'HISTORY'>('TODAY');
  const [selectedDateBs, setSelectedDateBs] = useState<string>(initialDateBs);

  // Today / Selected date data
  const [overview, setOverview] = useState<SubstituteOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History data
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Assign Modal
  const [assignSlot, setAssignSlot] = useState<SubstitutePeriod | null>(null);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState<string>('');
  const [assignRemarks, setAssignRemarks] = useState<string>('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState<string>('');

  // Print Slip Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // 1. Fetch Today/Selected Date Overview
  const fetchOverview = async (dateBs = selectedDateBs) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/substitute/today?dateBs=${dateBs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load substitute overview');
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Error loading substitute data');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch History Records
  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/substitute/history?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.records) {
        setHistoryRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to load substitute history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(selectedDateBs);
  }, [selectedDateBs]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle Assign Substitute
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSlot || !selectedSubTeacherId) {
      setAssignError(isNp ? 'कृपया सट्टा शिक्षक छनोट गर्नुहोस्' : 'Please select a substitute teacher');
      return;
    }
    setIsSubmittingAssign(true);
    setAssignError('');
    try {
      const res = await fetch('/api/substitute/assign', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateBs: selectedDateBs,
          timetableId: assignSlot.timetableId,
          classId: assignSlot.classId,
          sectionId: assignSlot.sectionId,
          subjectId: assignSlot.subjectId,
          originalTeacherId: assignSlot.originalTeacher.id,
          substituteTeacherId: selectedSubTeacherId,
          periodNumber: assignSlot.periodNumber,
          startTime: assignSlot.startTime,
          endTime: assignSlot.endTime,
          remarks: assignRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.message || (isNp ? 'सट्टा शिक्षक तोक्न असफल भयो' : 'Failed to assign'));
      } else {
        setAssignSlot(null);
        setSelectedSubTeacherId('');
        setAssignRemarks('');
        setSuccessMsg(isNp ? 'सट्टा शिक्षक सफलतापूर्वक तोकियो!' : 'Substitute teacher assigned successfully!');
        setTimeout(() => setSuccessMsg(null), 3500);
        await fetchOverview(selectedDateBs);
      }
    } catch (err: any) {
      setAssignError(err.message || 'Error occurred');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Handle Cancel Substitution
  const handleCancelSubstitute = async (assignmentId: string) => {
    if (
      !window.confirm(
        isNp
          ? 'के तपाईं यो सट्टा कक्षा जिम्मेवारी रद्द गर्न निश्चित हुनुहुन्छ?'
          : 'Are you sure you want to cancel this substitute assignment?'
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/substitute/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccessMsg(isNp ? 'सट्टा जिम्मेवारी रद्द गरियो' : 'Substitution cancelled');
        setTimeout(() => setSuccessMsg(null), 3000);
        await fetchOverview(selectedDateBs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter history records
  const filteredHistory = historyRecords.filter((h) => {
    const term = historySearch.toLowerCase().trim();
    if (!term) return true;
    return (
      h.classNameNp.toLowerCase().includes(term) ||
      h.classNameEn.toLowerCase().includes(term) ||
      h.subjectNameNp.toLowerCase().includes(term) ||
      h.subjectNameEn.toLowerCase().includes(term) ||
      h.originalTeacherNameNp.toLowerCase().includes(term) ||
      h.originalTeacherNameEn.toLowerCase().includes(term) ||
      h.substituteTeacherNameNp.toLowerCase().includes(term) ||
      h.substituteTeacherNameEn.toLowerCase().includes(term) ||
      h.dateBs.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-600/20">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {isNp ? 'सट्टा शिक्षक व्यवस्थापन' : 'Substitute Teacher Management'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                {isNp ? 'दैनिक अनुगमन' : 'Daily Coverage'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isNp
                ? 'अनुपस्थित, बिदा वा काजमा रहेका शिक्षकहरूका खाली पिरियडहरूमा सट्टा शिक्षक तोक्ने र अनुगमन गर्ने प्रणाली'
                : 'Smart substitution assignment and monitoring for absent, leave, or on-duty teaching staff'}
            </p>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-500">{isNp ? 'मिति:' : 'Date:'}</span>
            <input
              type="text"
              value={selectedDateBs}
              onChange={(e) => setSelectedDateBs(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-slate-100 w-24 outline-none"
            />
            {selectedDateBs !== initialDateBs && (
              <button
                type="button"
                onClick={() => setSelectedDateBs(initialDateBs)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                ({isNp ? 'आज' : 'Today'})
              </button>
            )}
          </div>

          <button
            onClick={() => fetchOverview(selectedDateBs)}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition"
            title={isNp ? 'ताजा गर्नुहोस्' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            disabled={!overview || overview.periods.length === 0}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{isNp ? 'सट्टा पुर्जी प्रिन्ट' : 'Print Duty Slip'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isNp ? 'कुल प्रभावित कक्षा' : 'Total Affected Classes'}</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatNumber(overview?.totalAffected ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {overview?.dayOfWeek
              ? isNp
                ? nepaliDaysMap[overview.dayOfWeek] || overview.dayOfWeek
                : englishDaysMap[overview.dayOfWeek] || overview.dayOfWeek
              : '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{isNp ? 'खाली पिरियड' : 'Vacant Periods'}</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatNumber(overview?.vacantCount ?? 0)}
          </div>
          <div className="text-[11px] text-rose-500/80 mt-0.5">{isNp ? 'सट्टा शिक्षक तोक्न बाँकी' : 'Awaiting substitute assignment'}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{isNp ? 'सट्टा तोकिएको' : 'Assigned'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatNumber(overview?.assignedCount ?? 0)}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">{isNp ? 'सफलतापूर्वक खटाइएको' : 'Successfully assigned'}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{isNp ? 'कार्य सम्पन्न दर' : 'Coverage Rate'}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {overview && overview.totalAffected > 0
              ? `${Math.round((overview.assignedCount / overview.totalAffected) * 100)}%`
              : '100%'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isNp ? 'कक्षा सञ्चालन सुनिश्चितता' : 'Class coverage completion'}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'TODAY'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isNp ? 'आजको सट्टा कक्षा व्यवस्थापन' : "Today's Substitution"}</span>
          {overview && overview.vacantCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
              {overview.vacantCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'HISTORY'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isNp ? 'सट्टा जिम्मेवारी अभिलेख (Logs & History)' : 'Substitution History'}</span>
        </button>
      </div>

      {/* TAB 1: TODAY'S SUBSTITUTION GRID */}
      {activeTab === 'TODAY' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-semibold">{isNp ? 'विवरण लोड हुँदैछ...' : 'Loading details...'}</div>
          ) : !overview || overview.periods.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isNp
                  ? 'शानदार! यस मितिमा कुनै पनि कक्षा खाली छैन वा सबै शिक्षकहरू नियमित अध्यापनमा हुनुहुन्छ।'
                  : 'No vacant periods on this date. All classes are running with regular teachers.'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isNp
                  ? 'अनुपस्थित, बिदा वा काजमा रहेका कुनै शिक्षकको पनि यस दिनमा कुनै पिरियड तालिका भेटिएन।'
                  : 'Absent or on-duty staff do not have scheduled classes on this day.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.periods.map((p) => {
                const periodTitle = periodNamesNp[p.periodNumber] || `${p.periodNumber} घण्टी`;
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-4 border transition-all shadow-sm space-y-3.5 ${
                      p.isAssigned
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b pb-2.5 border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {isNp ? p.classNameNp : p.classNameEn} ({isNp ? p.sectionNameNp : p.sectionCode})
                        </div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                          {isNp ? periodTitle : `Period ${p.periodNumber}`}{' '}
                          {p.startTime && p.endTime && `• ${p.startTime} - ${p.endTime}`}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          p.isAssigned
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                        }`}
                      >
                        {p.isAssigned ? (isNp ? '✓ सट्टा तोकिएको' : 'Covered') : isNp ? '⚠ खाली (Vacant)' : 'Vacant'}
                      </span>
                    </div>

                    {/* Subject & Regular Teacher */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">विषय:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {isNp ? p.subjectNameNp : p.subjectNameEn}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">नियमित शिक्षक:</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {isNp ? p.originalTeacher.fullNameNp : p.originalTeacher.fullNameEn}
                          </span>
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              p.originalTeacher.attendanceStatus === 'ABSENT'
                                ? 'bg-rose-100 text-rose-700'
                                : p.originalTeacher.attendanceStatus === 'ON_LEAVE'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {p.originalTeacher.attendanceStatus === 'ABSENT'
                              ? 'अनुपस्थित'
                              : p.originalTeacher.attendanceStatus === 'ON_LEAVE'
                              ? 'बिदा'
                              : 'काज (OD)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Substitute Status & Action */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      {p.isAssigned && p.substituteTeacher ? (
                        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                              सट्टा शिक्षक (Substitute):
                            </span>
                            <button
                              type="button"
                              onClick={() => p.assignmentId && handleCancelSubstitute(p.assignmentId)}
                              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
                            >
                              रद्द गर्नुहोस्
                            </button>
                          </div>
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {isNp ? p.substituteTeacher.fullNameNp : p.substituteTeacher.fullNameEn}
                          </div>
                          {p.remarks && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                              कैफियत: {p.remarks}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[11px] text-slate-500 font-medium">
                            यस घण्टीमा <b>{p.availableTeachers?.length || 0}</b> जना शिक्षक खाली हुनुहुन्छ
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignSlot(p);
                              setSelectedSubTeacherId(p.availableTeachers?.[0]?.id || '');
                              setAssignRemarks('');
                              setAssignError('');
                            }}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>सट्टा शिक्षक तोक्नुहोस् (Assign)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY LOGS */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="शिक्षक, कक्षा वा मिति खोज्नुहोस्..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              कुल रेकर्ड: {formatNumber(filteredHistory.length)}
            </div>
          </div>

          {isHistoryLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-semibold">अभिलेख लोड हुँदैछ...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">कुनै सट्टा अभिलेख फेला परेन।</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">मिति (BS)</th>
                    <th className="py-2.5 px-3">घण्टी</th>
                    <th className="py-2.5 px-3">कक्षा / खण्ड</th>
                    <th className="py-2.5 px-3">विषय</th>
                    <th className="py-2.5 px-3">नियमित शिक्षक</th>
                    <th className="py-2.5 px-3 text-blue-600 dark:text-blue-400">सट्टा शिक्षक</th>
                    <th className="py-2.5 px-3">कैफियत</th>
                    <th className="py-2.5 px-3 text-center">स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold">{h.dateBs}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                        {periodNamesNp[h.periodNumber] || `${h.periodNumber} घण्टी`}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold">{h.classNameNp}</span> ({h.sectionNameNp})
                      </td>
                      <td className="py-2.5 px-3 font-medium">{h.subjectNameNp}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{h.originalTeacherNameNp}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-blue-300">
                        {h.substituteTeacherNameNp}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{h.remarks || '—'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {h.status === 'ASSIGNED' ? 'तोकिएको' : h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSIGN MODAL */}
      {assignSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="font-bold text-base">सट्टा शिक्षक तोक्नुहोस् (Assign Substitute)</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignSlot(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-xs">
              {/* Slot Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">कक्षा तथा खण्ड:</span>
                  <span className="font-bold">
                    {isNp ? assignSlot.classNameNp : assignSlot.classNameEn} (
                    {isNp ? assignSlot.sectionNameNp : assignSlot.sectionCode})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">घण्टी तथा समय:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {periodNamesNp[assignSlot.periodNumber] || `${assignSlot.periodNumber} घण्टी`} (
                    {assignSlot.startTime} - {assignSlot.endTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">विषय:</span>
                  <span className="font-bold">
                    {isNp ? assignSlot.subjectNameNp : assignSlot.subjectNameEn}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">नियमित शिक्षक:</span>
                  <span className="font-bold text-rose-600">
                    {isNp ? assignSlot.originalTeacher.fullNameNp : assignSlot.originalTeacher.fullNameEn} (
                    {assignSlot.originalTeacher.attendanceStatus})
                  </span>
                </div>
              </div>

              {assignError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                  {assignError}
                </div>
              )}

              {/* Free Teacher Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  खाली शिक्षक छनोट गर्नुहोस् (Available Teachers) *
                </label>
                {assignSlot.availableTeachers.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-medium">
                    यस घण्टीमा कुनै पनि शिक्षक पूर्ण खाली हुनुहुन्न।
                  </div>
                ) : (
                  <select
                    value={selectedSubTeacherId}
                    onChange={(e) => setSelectedSubTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-blue-400 bg-blue-50/30 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="">-- शिक्षक छनोट गर्नुहोस् --</option>
                    {assignSlot.availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {isNp ? t.fullNameNp : t.fullNameEn} ({t.staffCode}) - {t.designation}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  कैफियत / निर्देशन (Remarks / Instructions)
                </label>
                <input
                  type="text"
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="उदा: पाठ्यपुस्तक अभ्यास गराउनुहुन, अनुशासन निगरानी..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAssignSlot(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign || assignSlot.availableTeachers.length === 0}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {isSubmittingAssign ? 'तोक्दै...' : 'सट्टा जिम्मेवारी सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT SLIP MODAL */}
      {showPrintModal && overview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 mb-4 print:hidden">
              <h3 className="font-black text-base text-slate-900">
                सट्टा कक्षा तालिका पुर्जी (Substitution Slip Preview)
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>प्रिन्ट गर्नुहोस्</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg border hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="border-2 border-slate-800 p-6 rounded-lg space-y-4 text-xs font-sans">
              <div className="text-center space-y-0.5 border-b-2 border-slate-800 pb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  नेपाल सरकार • शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {school?.nameNp || school?.nameEn || 'विद्यालय'}
                </h2>
                <p className="text-[11px] text-slate-600">
                  {school?.addressNp || school?.addressEn || ''} {school?.iemisCode ? `| IEMIS: ${school.iemisCode}` : ''}
                </p>
                <div className="pt-1">
                  <span className="inline-block px-3 py-0.5 bg-slate-900 text-white text-xs font-black tracking-wider uppercase rounded">
                    सट्टा कक्षा जिम्मेवारी पुर्जी (SUBSTITUTE TEACHER DUTY SLIP)
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700 pt-1">
                  मिति: {selectedDateBs} BS ({overview.dayOfWeek ? nepaliDaysMap[overview.dayOfWeek] || overview.dayOfWeek : ''})
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse border border-slate-400">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                  <tr>
                    <th className="border border-slate-400 py-2 px-2 text-center w-10">क्र.सं.</th>
                    <th className="border border-slate-400 py-2 px-2 text-center w-20">घण्टी / समय</th>
                    <th className="border border-slate-400 py-2 px-3">कक्षा र खण्ड</th>
                    <th className="border border-slate-400 py-2 px-3">विषय</th>
                    <th className="border border-slate-400 py-2 px-3">नियमित शिक्षक (कारण)</th>
                    <th className="border border-slate-400 py-2 px-3 font-bold text-blue-900">तोकिएका सट्टा शिक्षक</th>
                    <th className="border border-slate-400 py-2 px-3">कैफियत</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.periods.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold font-mono">
                        {periodNamesNp[p.periodNumber] || `${p.periodNumber} घण्टी`}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {p.startTime}-{p.endTime}
                        </div>
                      </td>
                      <td className="border border-slate-300 py-2 px-3 font-bold">
                        {p.classNameNp} ({p.sectionNameNp})
                      </td>
                      <td className="border border-slate-300 py-2 px-3">{p.subjectNameNp}</td>
                      <td className="border border-slate-300 py-2 px-3 text-slate-700">
                        {p.originalTeacher.fullNameNp} ({p.originalTeacher.attendanceStatus})
                      </td>
                      <td className="border border-slate-300 py-2 px-3 font-bold text-sm">
                        {p.isAssigned && p.substituteTeacher ? (
                          <span className="text-blue-900">{p.substituteTeacher.fullNameNp}</span>
                        ) : (
                          <span className="text-rose-600 italic">तोक्न बाँकी (खाली)</span>
                        )}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-slate-600 italic">
                        {p.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-10 mt-6 text-center text-xs">
                <div>
                  <div className="border-t border-slate-700 w-36 mx-auto pt-1 font-bold">तयार गर्ने कर्मचारी</div>
                  <div className="text-[10px] text-slate-500">Prepared By</div>
                </div>
                <div>
                  <div className="border-t border-slate-700 w-36 mx-auto pt-1 font-bold">प्रधानाध्यापकको हस्ताक्षर</div>
                  <div className="text-[10px] text-slate-500">Headmaster / Principal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstituteManagement;
