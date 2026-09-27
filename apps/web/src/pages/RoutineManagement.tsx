import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Clock,
  Calendar,
  User,
  Plus,
  Trash2,
  Printer,
  AlertTriangle,
  X,
  BookOpen,
  CheckCircle2,
  Building,
} from 'lucide-react';

export const RoutineManagement: React.FC = () => {
  const { token } = useAuth();
  const { language } = useLanguage();
  const isNp = language === 'np';

  const [viewMode, setViewMode] = useState<'CLASS' | 'TEACHER'>('CLASS');

  // Academic metadata
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Timetable entries
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal for editing a slot
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>({
    dayOfWeek: 'SUNDAY',
    periodNumber: 1,
    subjectId: '',
    teacherId: '',
    startTime: '10:00',
    endTime: '10:45',
    roomNumber: '',
  });
  const [conflictError, setConflictError] = useState<string>('');
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  const daysOfWeek = [
    { code: 'SUNDAY', nameEn: 'Sunday', nameNp: 'आइतबार' },
    { code: 'MONDAY', nameEn: 'Monday', nameNp: 'सोमबार' },
    { code: 'TUESDAY', nameEn: 'Tuesday', nameNp: 'मंगलबार' },
    { code: 'WEDNESDAY', nameEn: 'Wednesday', nameNp: 'बुधबार' },
    { code: 'THURSDAY', nameEn: 'Thursday', nameNp: 'बिहीबार' },
    { code: 'FRIDAY', nameEn: 'Friday', nameNp: 'शुक्रबार' },
  ];

  const periods = [
    { num: 1, time: '10:00 - 10:45' },
    { num: 2, time: '10:45 - 11:30' },
    { num: 3, time: '11:30 - 12:15' },
    { num: 4, time: '12:15 - 01:00' },
    { num: 5, time: '01:30 - 02:15' },
    { num: 6, time: '02:15 - 03:00' },
    { num: 7, time: '03:00 - 03:45' },
    { num: 8, time: '03:45 - 04:15' },
  ];

  // 1. Fetch Classes, Sections, Staff
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clsRes, staffRes] = await Promise.all([
          fetch('http://localhost:4000/api/academic/classes', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:4000/api/staff?category=TEACHING', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (clsRes.ok) {
          const clsData = await clsRes.json();
          const clsList = clsData.classes || [];
          setClasses(clsList);
          if (clsList.length > 0) {
            const defClass = clsList.find((c: any) => c.code === '10') || clsList[0];
            setSelectedClassId(defClass.id);
            if (defClass.sections?.length > 0) {
              setSelectedSectionId(defClass.sections[0].id);
            }
          }
        }

        if (staffRes.ok) {
          const stData = await staffRes.json();
          const teachers = stData.staff || [];
          setStaffList(teachers);
          if (teachers.length > 0) {
            setSelectedTeacherId(teachers[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load classes or staff:', err);
      }
    };
    fetchData();
  }, [token]);

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const sections = currentClass?.sections || [];
  const subjects = currentClass?.subjects || [];

  // 2. Fetch Timetable Entries
  const fetchTimetables = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewMode === 'CLASS') {
        if (selectedClassId) params.append('classId', selectedClassId);
        if (selectedSectionId) params.append('sectionId', selectedSectionId);
      } else {
        if (selectedTeacherId) params.append('teacherId', selectedTeacherId);
      }

      const res = await fetch(`http://localhost:4000/api/routine?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (err) {
      console.error('Failed to load routine:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, [selectedClassId, selectedSectionId, selectedTeacherId, viewMode]);

  // Click slot to edit
  const handleOpenSlot = (day: string, periodNum: number, existing?: any) => {
    setConflictError('');
    const pInfo = periods.find((p) => p.num === periodNum);
    const times = pInfo?.time.split(' - ') || ['10:00', '10:45'];

    setEditingSlot({
      id: existing?.id,
      dayOfWeek: day,
      periodNumber: periodNum,
      subjectId: existing?.subjectId || (subjects[0]?.id || ''),
      teacherId: existing?.teacherId || (staffList[0]?.id || ''),
      startTime: existing?.startTime || times[0].trim(),
      endTime: existing?.endTime || times[1].trim(),
      roomNumber: existing?.roomNumber || currentClass?.code ? `Room ${currentClass.code}` : '',
    });
    setShowSlotModal(true);
  };

  // Save period with Teacher Conflict Guard
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSlot(true);
    setConflictError('');
    try {
      const res = await fetch('http://localhost:4000/api/routine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editingSlot,
          classId: selectedClassId,
          sectionId: selectedSectionId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowSlotModal(false);
        fetchTimetables();
      } else if (res.status === 409) {
        // Teacher conflict guard triggered!
        setConflictError(data.message);
      } else {
        setConflictError(data.message || 'Failed to save routine slot');
      }
    } catch (err: any) {
      setConflictError(err.message);
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/routine/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowSlotModal(false);
        fetchTimetables();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {isNp ? 'साप्ताहिक कक्षा समय-तालिका / रुटिन' : 'Class Routine & Weekly Timetable'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isNp
                  ? '१ देखि ८ पिरियडको रुटिन, दोहोरो नपर्ने शिक्षक Conflict रोकथाम, र शिक्षकको व्यक्तिगत कार्यतालिका'
                  : 'Periods 1 to 8 schedule, automated teacher conflict detection guard, and personal routines'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>{isNp ? 'रुटिन प्रिन्ट (Print)' : 'Print Routine'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 gap-2">
          <button
            onClick={() => setViewMode('CLASS')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              viewMode === 'CLASS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{isNp ? 'कक्षा अनुसारको रुटिन (Class Timetable)' : 'Class Timetable'}</span>
          </button>
          <button
            onClick={() => setViewMode('TEACHER')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              viewMode === 'TEACHER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{isNp ? 'शिक्षक अनुसारको कार्यतालिका (Teacher Routine)' : "Teacher's Personal Routine"}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        {viewMode === 'CLASS' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                {isNp ? 'कक्षा (Class)' : 'Class'}
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  const cls = classes.find((c) => c.id === e.target.value);
                  if (cls?.sections?.length > 0) {
                    setSelectedSectionId(cls.sections[0].id);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn} ({c.nameNp})
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
              >
                {sections.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.nameEn} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
              {isNp ? 'शिक्षक चयन गर्नुहोस् (Select Teacher)' : 'Select Teacher'}
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
            >
              {staffList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullNameEn} ({t.staffCode}) • {t.majorSubject || 'General'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Routine Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">Loading timetable routine...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3 w-28 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                    Day / Period
                  </th>
                  {periods.map((p) => (
                    <th key={p.num} className="px-2 py-2.5 text-center min-w-[130px] border-r border-slate-200 dark:border-slate-700">
                      <div>Period {p.num}</div>
                      <div className="text-[10px] font-normal text-slate-500">{p.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {daysOfWeek.map((day) => (
                  <tr key={day.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-3 py-4 text-center font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                      {isNp ? day.nameNp : day.nameEn}
                    </td>

                    {periods.map((p) => {
                      const entry = entries.find(
                        (e) => e.dayOfWeek === day.code && e.periodNumber === p.num
                      );

                      return (
                        <td
                          key={p.num}
                          onClick={() => viewMode === 'CLASS' && handleOpenSlot(day.code, p.num, entry)}
                          className={`px-2 py-2 border-r border-slate-100 dark:border-slate-800 align-top cursor-pointer transition ${
                            entry
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/50'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          {entry ? (
                            <div className="space-y-1 p-1 rounded">
                              <div className="font-bold text-indigo-700 dark:text-indigo-300 text-xs truncate">
                                {entry.subjectNameEn}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate flex items-center space-x-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{entry.teacherNameEn}</span>
                              </div>
                              {viewMode === 'TEACHER' && (
                                <div className="text-[10px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5 rounded">
                                  {entry.classNameEn} - Sec {entry.sectionCode}
                                </div>
                              )}
                              {entry.roomNumber && (
                                <div className="text-[10px] text-slate-400">
                                  {entry.roomNumber}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-14 flex items-center justify-center text-slate-300 dark:text-slate-700 hover:text-indigo-500">
                              <Plus className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isNp ? 'पिरियड तालिका व्यवस्थापन' : 'Assign Routine Period'}
                </h3>
                <span className="text-xs text-slate-500">
                  {editingSlot.dayOfWeek} • Period {editingSlot.periodNumber} ({currentClass?.nameEn} - Section {sections.find((s: any) => s.id === selectedSectionId)?.code})
                </span>
              </div>
              <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Alert Banner */}
            {conflictError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Conflict Guard Triggered</span>
                </div>
                <p>{conflictError}</p>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  विषय (Subject) *
                </label>
                <select
                  required
                  value={editingSlot.subjectId}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subjectId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameEn} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  शिक्षक (Teacher) *
                </label>
                <select
                  required
                  value={editingSlot.teacherId}
                  onChange={(e) => setEditingSlot({ ...editingSlot, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                >
                  <option value="">Select Teacher</option>
                  {staffList.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.fullNameEn} ({st.staffCode}) • {st.majorSubject || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingSlot.startTime}
                    onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingSlot.endTime}
                    onChange={(e) => setEditingSlot({ ...editingSlot, endTime: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 102"
                  value={editingSlot.roomNumber || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                {editingSlot.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Slot</span>
                  </button>
                ) : <div />}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSlotModal(false)}
                    className="px-3 py-1.5 border rounded-lg text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSlot}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                  >
                    {isSavingSlot ? 'Checking...' : 'Save Period'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
