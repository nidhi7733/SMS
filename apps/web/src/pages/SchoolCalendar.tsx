import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toBik, toGreg, daysInMonth } from 'bikram-sambat';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  X,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Tag,
  Globe,
  MapPin,
  Palette,
} from 'lucide-react';
import { CalendarEventCategory } from '@sms/shared';

export const EVENT_COLORS: Record<
  string,
  {
    labelEn: string;
    labelNp: string;
    pillBg: string;
    badgeBg: string;
    dotBg: string;
  }
> = {
  PUBLIC_HOLIDAY: {
    labelEn: 'Public Holiday',
    labelNp: 'सार्वजनिक बिदा',
    pillBg: 'bg-rose-500 text-white',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    dotBg: 'bg-rose-500',
  },
  SCHOOL_HOLIDAY: {
    labelEn: 'School Holiday',
    labelNp: 'स्थानीय / विद्यालय बिदा',
    pillBg: 'bg-red-600 text-white',
    badgeBg: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    dotBg: 'bg-red-600',
  },
  EXAM_DAY: {
    labelEn: 'Exam Day',
    labelNp: 'परीक्षा तालिका',
    pillBg: 'bg-blue-600 text-white',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    dotBg: 'bg-blue-600',
  },
  EVENT_SPORTS: {
    labelEn: 'Sports & Athletics',
    labelNp: 'खेलकुद तथा अतिरिक्त',
    pillBg: 'bg-emerald-600 text-white',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotBg: 'bg-emerald-600',
  },
  EVENT_CULTURAL: {
    labelEn: 'Cultural / Festival',
    labelNp: 'सांस्कृतिक तथा उत्सव',
    pillBg: 'bg-purple-600 text-white',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    dotBg: 'bg-purple-600',
  },
  MEETING: {
    labelEn: 'Meeting / Assembly',
    labelNp: 'बैठक तथा भेला',
    pillBg: 'bg-amber-600 text-white',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dotBg: 'bg-amber-600',
  },
  TRAINING: {
    labelEn: 'Teacher Training',
    labelNp: 'शिक्षक तालिम',
    pillBg: 'bg-teal-600 text-white',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    dotBg: 'bg-teal-600',
  },
};

export const SchoolCalendar: React.FC = () => {
  const { user, token, hasPermission } = useAuth();
  const { language } = useLanguage();
  const isNp = language === 'np';

  // Check if current user is Principal or Admin (Authorized to Edit/Delete/Add)
  const isPrincipalOrAdmin =
    user?.isSuperAdmin ||
    user?.roles?.some((r: any) => {
      const name = typeof r === 'string' ? r : r.name;
      return name === 'PRINCIPAL' || name === 'SYSTEM_ADMIN' || name === 'ADMIN' || name === 'SUPERADMIN';
    }) ||
    hasPermission('CALENDAR_MANAGE');

  // Compute Today's BS Date automatically on open
  const [todayBs, setTodayBs] = useState<{ year: number; month: number; day: number }>(() => {
    try {
      const bik = toBik(new Date());
      return { year: bik.year || 2083, month: bik.month || 5, day: bik.day || 1 };
    } catch {
      return { year: 2083, month: 5, day: 31 };
    }
  });

  const [selectedMonthBs, setSelectedMonthBs] = useState<number>(() => todayBs.month);
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<CalendarEventCategory[]>([]);
  const [stats, setStats] = useState<any>({
    totalEvents: 0,
    holidayCount: 0,
    examCount: 0,
    sportsEventsCount: 0,
    targetTeachingDays: 190,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Modals for Add & Edit (Principal only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [formData, setFormData] = useState({
    titleEn: '',
    titleNp: '',
    eventType: 'PUBLIC_HOLIDAY',
    startDateBs: '',
    endDateBs: '',
    isTeachingDay: false,
    description: '',
    showOnWebsite: false,
    eventTime: '',
    venueNp: '',
    venueEn: '',
  });

  // Category Manager Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CalendarEventCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    nameNp: '',
    nameEn: '',
    code: '',
    color: '#4f46e5',
    isHoliday: false,
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const nepaliMonths = [
    { num: 1, nameEn: 'Baisakh', nameNp: 'वैशाख' },
    { num: 2, nameEn: 'Jestha', nameNp: 'जेठ' },
    { num: 3, nameEn: 'Ashadh', nameNp: 'असार' },
    { num: 4, nameEn: 'Shrawan', nameNp: 'साउन' },
    { num: 5, nameEn: 'Bhadra', nameNp: 'भदौ' },
    { num: 6, nameEn: 'Ashwin', nameNp: 'असोज' },
    { num: 7, nameEn: 'Kartik', nameNp: 'कात्तिक' },
    { num: 8, nameEn: 'Mangsir', nameNp: 'मंसिर' },
    { num: 9, nameEn: 'Poush', nameNp: 'पुस' },
    { num: 10, nameEn: 'Magh', nameNp: 'माघ' },
    { num: 11, nameEn: 'Falgun', nameNp: 'फागुन' },
    { num: 12, nameEn: 'Chaitra', nameNp: 'चैत' },
  ];

  const currentMonthInfo = nepaliMonths.find((m) => m.num === selectedMonthBs) || nepaliMonths[0];

  // Calculate days in selected month and starting weekday offset
  const monthTotalDays = (() => {
    try {
      return daysInMonth(2083, selectedMonthBs) || 31;
    } catch {
      return 31;
    }
  })();

  const startWeekdayOffset = (() => {
    try {
      const g = toGreg(2083, selectedMonthBs, 1);
      const d = new Date(g.year, g.month - 1, g.day);
      return d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    } catch {
      return 0;
    }
  })();

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/calendar/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        fetch(`/api/calendar/events?yearBs=2083&monthBs=${selectedMonthBs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/calendar/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedMonthBs]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      nameNp: '',
      nameEn: '',
      code: '',
      color: '#4f46e5',
      isHoliday: false,
    });
    setCategoryError(null);
  };

  const handleOpenEditCategory = (cat: CalendarEventCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      nameNp: cat.nameNp,
      nameEn: cat.nameEn,
      code: cat.code,
      color: cat.color || '#4f46e5',
      isHoliday: Boolean(cat.isHoliday),
    });
    setCategoryError(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCategory(true);
    setCategoryError(null);
    try {
      const url = editingCategory
        ? `/api/calendar/categories/${editingCategory.id}`
        : '/api/calendar/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        handleOpenAddCategory();
        await fetchCategories();
      } else {
        const err = await res.json();
        setCategoryError(err.message || 'विधा सुरक्षित गर्न असफल भयो');
      }
    } catch (err: any) {
      setCategoryError(err.message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: CalendarEventCategory) => {
    if (!window.confirm(isNp ? `के तपाईँ "${cat.nameNp}" विधा हटाउन निश्चित हुनुहुन्छ?` : `Are you sure you want to delete category "${cat.nameEn}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/calendar/categories/${cat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchCategories();
        if (editingCategory?.id === cat.id) {
          handleOpenAddCategory();
        }
      } else {
        const err = await res.json();
        alert(err.message || 'विधा हटाउन सकिएन');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCatInfo = (code: string) => {
    const found = categories.find((c) => c.code === code);
    if (found) {
      return {
        labelNp: found.nameNp,
        labelEn: found.nameEn,
        color: found.color || '#3b82f6',
        isHoliday: found.isHoliday,
        isSystem: found.isSystem,
      };
    }
    const fallback = EVENT_COLORS[code];
    if (fallback) {
      return {
        labelNp: fallback.labelNp,
        labelEn: fallback.labelEn,
        color: code.includes('PUBLIC') ? '#f43f5e' : code.includes('SCHOOL') ? '#dc2626' : '#2563eb',
        isHoliday: code.includes('HOLIDAY'),
        isSystem: true,
      };
    }
    return {
      labelNp: code,
      labelEn: code,
      color: '#64748b',
      isHoliday: false,
      isSystem: false,
    };
  };

  const handleOpenAdd = (defaultDay?: number) => {
    if (!isPrincipalOrAdmin) return;
    const dayPadded = defaultDay
      ? String(defaultDay).padStart(2, '0')
      : String(todayBs.day).padStart(2, '0');
    const monthPadded = String(selectedMonthBs).padStart(2, '0');
    const defaultDateStr = `2083-${monthPadded}-${dayPadded}`;
    const defaultCat = categories[0]?.code || 'PUBLIC_HOLIDAY';
    const cat = categories.find((c) => c.code === defaultCat);

    setFormData({
      titleEn: '',
      titleNp: '',
      eventType: defaultCat,
      startDateBs: defaultDateStr,
      endDateBs: defaultDateStr,
      isTeachingDay: cat ? !cat.isHoliday : false,
      description: '',
      showOnWebsite: false,
      eventTime: '',
      venueNp: '',
      venueEn: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (ev: any) => {
    if (!isPrincipalOrAdmin) return;
    setSelectedEvent(ev);
    setFormData({
      titleEn: ev.titleEn,
      titleNp: ev.titleNp || ev.titleEn,
      eventType: ev.eventType,
      startDateBs: ev.startDateBs,
      endDateBs: ev.endDateBs || ev.startDateBs,
      isTeachingDay: ev.isTeachingDay,
      description: ev.description || '',
      showOnWebsite: Boolean(ev.showOnWebsite),
      eventTime: ev.eventTime || '',
      venueNp: ev.venueNp || '',
      venueEn: ev.venueEn || '',
    });
    setShowEditModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchEvents();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create event');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchEvents();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update event');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!isPrincipalOrAdmin) return;
    if (!window.confirm(isNp ? 'के तपाईँ यो कार्यक्रम/बिदा हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this event?')) {
      return;
    }
    try {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchEvents();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete event');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGoToToday = () => {
    setSelectedMonthBs(todayBs.month);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isNp ? '२०८३ सालको नेपाली शैक्षिक क्यालेन्डर' : 'Bikram Sambat 2083 School Calendar'}
                </h1>
                {/* Principal Badge or View Only Badge */}
                {isPrincipalOrAdmin ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isNp ? 'प्रधानाध्यापक सम्पादन अधिकार' : 'Principal Management'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <span>{isNp ? 'पढ्न मात्र मिल्ने (View Only)' : 'Read-Only View'}</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isNp
                  ? 'शनिबार र आइतबार दुवै दिन साप्ताहिक बिदा (रातो), परीक्षा, चाडपर्व तथा कुल पढाइ हुने दिन गणना'
                  : 'Saturday & Sunday weekend holidays (Red), color-coded events, and 190 teaching days tracking'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleGoToToday}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                {isNp
                  ? `आज: ${todayBs.year}-${todayBs.month < 10 ? '0' : ''}${todayBs.month}-${todayBs.day < 10 ? '0' : ''}${todayBs.day}`
                  : `Today: ${todayBs.year}-${todayBs.month}-${todayBs.day}`}
              </span>
            </button>

            {isPrincipalOrAdmin && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleOpenAddCategory();
                    setShowCategoryModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold transition shadow-xs"
                >
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{isNp ? 'विधा व्यवस्थापन' : 'Categories'}</span>
                </button>

                <button
                  onClick={() => handleOpenAdd()}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isNp ? 'बिदा / कार्यक्रम थप्नुहोस्' : 'Add Event / Holiday'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Teaching Days & Holidays Stats */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase">
              {isNp ? 'घोषित बिदा (Holidays)' : 'Declared Holidays'}
            </span>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">
              {stats.holidayCount} {isNp ? 'दिन' : 'days'}
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">
              {isNp ? 'परीक्षा दिन (Exam Days)' : 'Exam Days'}
            </span>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">
              {stats.examCount} {isNp ? 'दिन' : 'days'}
            </div>
          </div>

          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-900/40">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">
              {isNp ? 'खेलकुद/कार्यक्रम' : 'Sports & Events'}
            </span>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">
              {stats.sportsEventsCount || 0} {isNp ? 'दिन' : 'days'}
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
              {isNp ? 'पठनपाठन मापदण्ड' : 'Min. Teaching Days'}
            </span>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {stats.targetTeachingDays} {isNp ? 'दिन' : 'days'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Color Legend Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{isNp ? 'क्यालेन्डर रंग संकेत (Color Legend):' : 'Color Legend:'}</span>
          </div>
          {isPrincipalOrAdmin && (
            <button
              onClick={() => {
                handleOpenAddCategory();
                setShowCategoryModal(true);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 transition"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{isNp ? 'विधा थप वा सम्पादन गर्नुहोस्' : 'Manage Categories'}</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Sunday & Saturday Weekend Badge */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>{isNp ? 'शनिबार र आइतबार (साप्ताहिक बिदा)' : 'Saturday & Sunday (Weekend Holiday)'}</span>
          </div>

          {(categories.length > 0 ? categories : Object.entries(EVENT_COLORS).map(([code, cfg]) => ({ code, nameNp: cfg.labelNp, nameEn: cfg.labelEn, color: code.includes('PUBLIC') ? '#f43f5e' : code.includes('SCHOOL') ? '#dc2626' : '#2563eb' }))).map((cat: any) => (
            <div
              key={cat.id || cat.code}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#3b82f6' }}></span>
              <span>{isNp ? cat.nameNp : cat.nameEn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month Navigation Strip */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none">
        {nepaliMonths.map((m) => {
          const isCurrentActive = selectedMonthBs === m.num;
          const isTodayMonth = todayBs.month === m.num;
          return (
            <button
              key={m.num}
              onClick={() => setSelectedMonthBs(m.num)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition relative flex items-center space-x-1.5 ${
                isCurrentActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{isNp ? `${m.nameNp} (${m.nameEn})` : m.nameEn}</span>
              {isTodayMonth && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  isCurrentActive ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {isNp ? 'आज' : 'Today'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Grid & Events List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sun className="w-5 h-5 text-amber-500" />
              <span>
                {isNp
                  ? `${currentMonthInfo.nameNp} २०८३ (${currentMonthInfo.nameEn} 2083 BS)`
                  : `${currentMonthInfo.nameEn} 2083 BS`}
              </span>
            </h2>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
              <span>{monthTotalDays} {isNp ? 'दिन' : 'Days'}</span>
            </div>
          </div>

          {/* Weekday Headers: Sunday (आइत) & Saturday (शनि) IN RED */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
            {/* SUNDAY - RED */}
            <div className="py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30">
              {isNp ? 'आइत (Sun) ★' : 'Sun ★'}
            </div>
            {/* Monday to Friday */}
            <div className="py-1.5 text-slate-600 dark:text-slate-400">{isNp ? 'सोम (Mon)' : 'Mon'}</div>
            <div className="py-1.5 text-slate-600 dark:text-slate-400">{isNp ? 'मंगल (Tue)' : 'Tue'}</div>
            <div className="py-1.5 text-slate-600 dark:text-slate-400">{isNp ? 'बुध (Wed)' : 'Wed'}</div>
            <div className="py-1.5 text-slate-600 dark:text-slate-400">{isNp ? 'बिही (Thu)' : 'Thu'}</div>
            <div className="py-1.5 text-slate-600 dark:text-slate-400">{isNp ? 'शुक्र (Fri)' : 'Fri'}</div>
            {/* SATURDAY - RED */}
            <div className="py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30">
              {isNp ? 'शनि (Sat) ★' : 'Sat ★'}
            </div>
          </div>

          {/* Days Grid with true day of week offset */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank padding cells before 1st of month */}
            {Array.from({ length: startWeekdayOffset }).map((_, idx) => (
              <div key={`blank-${idx}`} className="min-h-[85px] p-2 rounded-xl bg-slate-50/30 dark:bg-slate-800/10 border border-dashed border-slate-200/40 dark:border-slate-800/40" />
            ))}

            {/* Days 1 to monthTotalDays */}
            {Array.from({ length: monthTotalDays }, (_, i) => i + 1).map((day) => {
              const weekdayIndex = (startWeekdayOffset + day - 1) % 7;
              const isSunday = weekdayIndex === 0;
              const isSaturday = weekdayIndex === 6;
              const isWeekendHoliday = isSunday || isSaturday;

              const isToday =
                todayBs.year === 2083 &&
                todayBs.month === selectedMonthBs &&
                todayBs.day === day;

              const monthPadded = String(selectedMonthBs).padStart(2, '0');
              const dayPadded = String(day).padStart(2, '0');
              const dayDateStr = `2083-${monthPadded}-${dayPadded}`;

              // Events matching this date
              const dayEvents = events.filter((e) => {
                const s = e.startDateBs;
                const end = e.endDateBs || e.startDateBs;
                return dayDateStr >= s && dayDateStr <= end;
              });

              return (
                <div
                  key={day}
                  onClick={() => isPrincipalOrAdmin && handleOpenAdd(day)}
                  className={`min-h-[85px] p-2 rounded-xl border flex flex-col justify-between transition relative ${
                    isPrincipalOrAdmin ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500' : ''
                  } ${
                    isToday
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/70 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 shadow-sm'
                      : isWeekendHoliday
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40'
                      : 'bg-white dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`font-mono font-bold text-sm ${
                        isToday
                          ? 'text-blue-700 dark:text-blue-300 font-extrabold'
                          : isWeekendHoliday
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {day}
                    </span>

                    {/* Today Badge */}
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 font-bold rounded-full bg-blue-600 text-white shadow-xs animate-pulse">
                        {isNp ? 'आज' : 'Today'}
                      </span>
                    )}

                    {/* Subtle weekend label if no events */}
                    {!isToday && isWeekendHoliday && dayEvents.length === 0 && (
                      <span className="text-[9px] font-semibold text-rose-500 dark:text-rose-400">
                        {isNp ? 'बिदा' : 'Holiday'}
                      </span>
                    )}
                  </div>

                  {/* Day Events Badges */}
                  <div className="space-y-1 mt-1">
                    {dayEvents.map((ev: any) => {
                      const catInfo = getCatInfo(ev.eventType);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPrincipalOrAdmin) handleOpenEdit(ev);
                          }}
                          style={{ backgroundColor: catInfo.color }}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate transition shadow-xs text-white flex items-center justify-between ${
                            isPrincipalOrAdmin ? 'hover:opacity-90' : ''
                          }`}
                          title={`${isNp ? ev.titleNp || ev.titleEn : ev.titleEn || ev.titleNp} (${isNp ? catInfo.labelNp : catInfo.labelEn})`}
                        >
                          <span className="truncate flex items-center gap-1">
                            {ev.showOnWebsite && <Globe className="w-2.5 h-2.5 shrink-0 opacity-90" />}
                            <span>{isNp ? ev.titleNp || ev.titleEn : ev.titleEn || ev.titleNp}</span>
                          </span>
                          {isPrincipalOrAdmin && <Edit2 className="w-2.5 h-2.5 shrink-0 opacity-75 ml-1" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Month Events Sidebar with Principal Edit/Delete */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isNp ? `${currentMonthInfo.nameNp} महिनाका कार्यक्रमहरू` : `Events in ${currentMonthInfo.nameEn}`}
            </h3>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {events.length} {isNp ? 'कार्यक्रम' : 'events'}
            </span>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              {isNp ? 'यस महिनामा कुनै अतिरिक्त बिदा वा कार्यक्रम छैन।' : 'No custom events scheduled for this month.'}
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const catInfo = getCatInfo(ev.eventType);
                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catInfo.color }} />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {isNp ? ev.titleNp || ev.titleEn : ev.titleEn || ev.titleNp}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-medium text-slate-500 flex items-center gap-2">
                          <span>{ev.startDateBs} {ev.endDateBs && ev.endDateBs !== ev.startDateBs ? `${isNp ? 'देखि' : 'to'} ${ev.endDateBs}` : ''}</span>
                          {ev.eventTime && (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-sans">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {ev.eventTime}
                            </span>
                          )}
                        </div>
                        {(ev.venueNp || ev.venueEn) && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{isNp ? (ev.venueNp || ev.venueEn) : (ev.venueEn || ev.venueNp)}</span>
                          </div>
                        )}
                      </div>

                      {/* Principal-Only Action Buttons */}
                      {isPrincipalOrAdmin && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(ev)}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 rounded transition"
                            title="Edit event (Principal only)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 rounded transition"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: catInfo.color }}
                      >
                        {isNp ? catInfo.labelNp : catInfo.labelEn}
                      </span>
                      <div className="flex items-center gap-2">
                        {ev.showOnWebsite && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                            <Globe className="w-3 h-3" />
                            <span>{isNp ? 'वेबसाइट' : 'Website'}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {ev.isTeachingDay ? (isNp ? 'पढाइ हुने दिन' : 'Teaching Day') : (isNp ? 'बिदा' : 'No Teaching')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add Event Modal (Principal & Admin only) */}
      {showAddModal && isPrincipalOrAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>{isNp ? 'नयाँ बिदा वा कार्यक्रम थप्नुहोस्' : 'Add Calendar Event'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  शीर्षक (नेपाली) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. संविधान दिवस / दशैं बिदा"
                  value={formData.titleNp}
                  onChange={(e) => setFormData({ ...formData, titleNp: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Constitution Day"
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    कार्यक्रमको प्रकार (Event Category) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenAddCategory();
                      setShowCategoryModal(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isNp ? 'विधा थप्नुहोस्' : 'Add Category'}</span>
                  </button>
                </div>
                <select
                  value={formData.eventType}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cat = categories.find((c) => c.code === val);
                    const isTeach = cat ? !cat.isHoliday : (val !== 'PUBLIC_HOLIDAY' && val !== 'SCHOOL_HOLIDAY');
                    setFormData({ ...formData, eventType: val, isTeachingDay: isTeach });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                >
                  {(categories.length > 0 ? categories : Object.entries(EVENT_COLORS).map(([code, cfg]) => ({ code, nameNp: cfg.labelNp, nameEn: cfg.labelEn }))).map((c: any) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.nameNp} ({c.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    सुरु मिति (BS) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DD"
                    value={formData.startDateBs}
                    onChange={(e) => setFormData({ ...formData, startDateBs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    अन्त्य मिति (BS)
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={formData.endDateBs}
                    onChange={(e) => setFormData({ ...formData, endDateBs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="teachingDayCheck"
                  checked={formData.isTeachingDay}
                  onChange={(e) => setFormData({ ...formData, isTeachingDay: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="teachingDayCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {isNp ? 'यस दिन पठनपाठन हुन्छ (Counts as Teaching Day)' : 'Counts toward 190 Teaching Days'}
                </label>
              </div>

              {/* Show on Website Options */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showOnWebsiteCheckAdd"
                    checked={formData.showOnWebsite}
                    onChange={(e) => setFormData({ ...formData, showOnWebsite: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="showOnWebsiteCheckAdd"
                    className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isNp ? 'सार्वजनिक वेबसाइटमा देखाउने (Show on Public Website)' : 'Publish to School Public Website'}</span>
                  </label>
                </div>

                {formData.showOnWebsite && (
                  <div className="space-y-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                        समय (Event Time)
                      </label>
                      <input
                        type="text"
                        placeholder={isNp ? 'उदा. बिहान १०:०० बजे देखि' : 'e.g. 10:00 AM onwards'}
                        value={formData.eventTime}
                        onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                          स्थान (Venue Np)
                        </label>
                        <input
                          type="text"
                          placeholder={isNp ? 'उदा. विद्यालय प्राङ्गण' : 'e.g. विद्यालय प्राङ्गण'}
                          value={formData.venueNp}
                          onChange={(e) => setFormData({ ...formData, venueNp: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                          Venue (English)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. School Grounds"
                          value={formData.venueEn}
                          onChange={(e) => setFormData({ ...formData, venueEn: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Event Modal (Principal & Admin only) */}
      {showEditModal && isPrincipalOrAdmin && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                <span>{isNp ? 'कार्यक्रम सम्पादन (Principal Edit)' : 'Edit Calendar Event'}</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  शीर्षक (नेपाली) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titleNp}
                  onChange={(e) => setFormData({ ...formData, titleNp: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    कार्यक्रमको प्रकार (Event Category) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenAddCategory();
                      setShowCategoryModal(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isNp ? 'विधा थप्नुहोस्' : 'Add Category'}</span>
                  </button>
                </div>
                <select
                  value={formData.eventType}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cat = categories.find((c) => c.code === val);
                    const isTeach = cat ? !cat.isHoliday : (val !== 'PUBLIC_HOLIDAY' && val !== 'SCHOOL_HOLIDAY');
                    setFormData({ ...formData, eventType: val, isTeachingDay: isTeach });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                >
                  {(categories.length > 0 ? categories : Object.entries(EVENT_COLORS).map(([code, cfg]) => ({ code, nameNp: cfg.labelNp, nameEn: cfg.labelEn }))).map((c: any) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.nameNp} ({c.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    सुरु मिति (BS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.startDateBs}
                    onChange={(e) => setFormData({ ...formData, startDateBs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    अन्त्य मिति (BS)
                  </label>
                  <input
                    type="text"
                    value={formData.endDateBs}
                    onChange={(e) => setFormData({ ...formData, endDateBs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="teachingDayCheckEdit"
                  checked={formData.isTeachingDay}
                  onChange={(e) => setFormData({ ...formData, isTeachingDay: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="teachingDayCheckEdit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {isNp ? 'यस दिन पठनपाठन हुन्छ (Counts as Teaching Day)' : 'Counts toward 190 Teaching Days'}
                </label>
              </div>

              {/* Show on Website Options */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showOnWebsiteCheckEdit"
                    checked={formData.showOnWebsite}
                    onChange={(e) => setFormData({ ...formData, showOnWebsite: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="showOnWebsiteCheckEdit"
                    className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isNp ? 'सार्वजनिक वेबसाइटमा देखाउने (Show on Public Website)' : 'Publish to School Public Website'}</span>
                  </label>
                </div>

                {formData.showOnWebsite && (
                  <div className="space-y-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                        समय (Event Time)
                      </label>
                      <input
                        type="text"
                        placeholder={isNp ? 'उदा. बिहान १०:०० बजे देखि' : 'e.g. 10:00 AM onwards'}
                        value={formData.eventTime}
                        onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                          स्थान (Venue Np)
                        </label>
                        <input
                          type="text"
                          placeholder={isNp ? 'उदा. विद्यालय प्राङ्गण' : 'e.g. विद्यालय प्राङ्गण'}
                          value={formData.venueNp}
                          onChange={(e) => setFormData({ ...formData, venueNp: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                          Venue (English)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. School Grounds"
                          value={formData.venueEn}
                          onChange={(e) => setFormData({ ...formData, venueEn: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isNp ? 'हटाउनुहोस्' : 'Delete'}</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border rounded-lg text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                  >
                    Update Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manage Categories Modal (Principal & Admin only) */}
      {showCategoryModal && isPrincipalOrAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isNp ? 'कार्यक्रम विधा व्यवस्थापन' : 'Manage Event Categories'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isNp
                      ? 'क्यालेन्डर र वेबसाइट दुवैमा देखिने कार्यक्रमका विधाहरू थप्न, सम्पादन वा हटाउन सक्नुहुन्छ।'
                      : 'Add, edit, and organize calendar & website event categories with custom colors.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  handleOpenAddCategory();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Existing Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <span>{isNp ? 'मौजुदा विधाहरू' : 'Existing Categories'} ({categories.length})</span>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleOpenAddCategory}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline capitalize"
                  >
                    + {isNp ? 'नयाँ थप्नुहोस्' : 'Create New'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id || cat.code}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      editingCategory?.id === cat.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color || '#3b82f6' }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {isNp ? cat.nameNp : cat.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                          <span>{cat.nameEn}</span>
                          {cat.isHoliday && (
                            <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                              {isNp ? 'बिदा' : 'Holiday'}
                            </span>
                          )}
                          {cat.isSystem && (
                            <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px]">
                              {isNp ? 'सिस्टम' : 'System'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition"
                        title={isNp ? 'सम्पादन' : 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!cat.isSystem && (
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded transition"
                          title={isNp ? 'हटाउनुहोस्' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add or Edit Category Form */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>
                  {editingCategory
                    ? (isNp ? `विधा सम्पादन: ${editingCategory.nameNp}` : `Edit Category: ${editingCategory.nameEn}`)
                    : (isNp ? 'नयाँ विधा थप्नुहोस् (Create New Category)' : 'Add New Category')}
                </span>
              </h4>

              {categoryError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{categoryError}</span>
                </div>
              )}

              <form onSubmit={handleSaveCategory} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      विधाको नाम (नेपाली) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. वार्षिकोत्सव तथा पुरस्कार"
                      value={categoryForm.nameNp}
                      onChange={(e) => setCategoryForm({ ...categoryForm, nameNp: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Category Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual Day & Award"
                      value={categoryForm.nameEn}
                      onChange={(e) => {
                        const val = e.target.value;
                        const codeGen = editingCategory
                          ? categoryForm.code
                          : val.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
                        setCategoryForm({
                          ...categoryForm,
                          nameEn: val,
                          code: codeGen,
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      रंग संकेत (Category Color) *
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '#f43f5e',
                          '#dc2626',
                          '#ea580c',
                          '#d97706',
                          '#16a34a',
                          '#0d9488',
                          '#2563eb',
                          '#4f46e5',
                          '#7c3aed',
                          '#db2777',
                          '#475569',
                        ].map((c) => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setCategoryForm({ ...categoryForm, color: c })}
                            className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                              categoryForm.color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0 shrink-0"
                        title="Custom Color"
                      />
                    </div>
                  </div>

                  <div className="pt-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryForm.isHoliday}
                        onChange={(e) => setCategoryForm({ ...categoryForm, isHoliday: e.target.checked })}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isNp ? 'यो विधा बिदा हो (Counts as School Holiday)' : 'This is a Holiday category'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {isNp ? 'रद्द गर्नुहोस्' : 'Cancel Edit'}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingCategory}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {isSavingCategory
                      ? (isNp ? 'सुरक्षित गर्दै...' : 'Saving...')
                      : editingCategory
                      ? (isNp ? 'विधा अपडेट गर्नुहोस्' : 'Update Category')
                      : (isNp ? 'विधा थप्नुहोस्' : 'Create Category')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
