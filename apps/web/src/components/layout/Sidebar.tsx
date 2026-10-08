import React, { useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Settings,
  Users,
  UserCheck,
  GraduationCap,
  CalendarCheck2,
  Calendar,
  ReceiptText,
  BookOpen,
  FileCheck2,
  Clock,
  Landmark,
  Boxes,
  Award,
  ArrowRightLeft,
  BookMarked,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen = false,
  onClose,
}) => {
  const { t } = useLanguage();
  const { hasPermission, hasRole, user } = useAuth();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeItems = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'academic',
      label: t('nav.academic'),
      icon: GraduationCap,
      visible: hasPermission('ACADEMIC_STRUCTURE_VIEW'),
    },
    {
      id: 'students',
      label: t('nav.admissions'),
      icon: Users,
      visible: hasPermission('STUDENTS_VIEW'),
    },
    {
      id: 'staff',
      label: t('nav.staff'),
      icon: UserCheck,
      visible: hasPermission('STAFF_VIEW'),
    },
    {
      id: 'attendance',
      label: t('nav.attendance'),
      icon: CalendarCheck2,
      visible: hasPermission('ATTENDANCE_VIEW') || hasPermission('ATTENDANCE_RECORD'),
    },
    {
      id: 'calendar',
      label: t('nav.calendar'),
      icon: Calendar,
      visible: true,
    },
    {
      id: 'routine',
      label: t('nav.timetable'),
      icon: Clock,
      visible: hasPermission('TIMETABLE_VIEW'),
    },
    {
      id: 'substitute',
      label: t('nav.substitute'),
      icon: ArrowRightLeft,
      visible:
        hasRole('PRINCIPAL') ||
        hasRole('SYSTEM_ADMIN') ||
        hasRole('ADMINISTRATIVE_STAFF') ||
        Boolean(user?.isSuperAdmin),
    },
    {
      id: 'exams',
      label: t('nav.exams'),
      icon: GraduationCap,
      visible:
        hasPermission('EXAMS_ENTER_MARKS') ||
        hasPermission('EXAMS_VERIFY_RESULTS') ||
        hasPermission('EXAMS_APPROVE_PUBLISH'),
    },
    {
      id: 'certificates',
      label: t('nav.certificates'),
      icon: Award,
      visible: hasPermission('DOCUMENTS_ISSUE'),
    },
    {
      id: 'fees',
      label: t('nav.fees'),
      icon: ReceiptText,
      visible: hasPermission('FEES_COLLECT') || hasPermission('FEES_STRUCTURE_MANAGE'),
    },
    {
      id: 'accounting',
      label: t('nav.accounting'),
      icon: Landmark,
      visible: hasPermission('ACCOUNTS_VIEW') || hasPermission('ACCOUNTS_POST_VOUCHER'),
    },
    {
      id: 'inventory',
      label: t('nav.inventory'),
      icon: Boxes,
      visible: hasPermission('INVENTORY_VIEW') || hasPermission('INVENTORY_MANAGE'),
    },
    {
      id: 'library',
      label: t('nav.library'),
      icon: BookOpen,
      visible: hasPermission('LIBRARY_VIEW') || hasPermission('LIBRARY_CIRCULATION'),
    },
    {
      id: 'learning',
      label: t('nav.learning'),
      icon: BookMarked,
      visible:
        hasPermission('LMS_CONTENT_MANAGE') ||
        hasRole('TEACHER') ||
        hasRole('PRINCIPAL') ||
        hasRole('STUDENT'),
    },
    {
      id: 'school_settings',
      label: t('nav.school_settings'),
      icon: Settings,
      visible: hasPermission('SCHOOL_SETTINGS_VIEW'),
    },
    {
      id: 'users_roles',
      label: t('nav.users_roles'),
      icon: Users,
      visible: hasPermission('USERS_VIEW'),
    },
  ];

  const upcomingStages = [
    { id: 'documents', label: t('nav.documents'), icon: FileCheck2, stage: 'Stage 7' },
  ];


  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-auto w-72 lg:w-64 bg-slate-900 dark:bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 h-full lg:min-h-[calc(100vh-61px)] transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Drawer Header with Close Button */}
        <div className="lg:hidden px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              SMS
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">Hamro SMS</div>
              <div className="text-[10px] text-slate-400">नेपाल विद्यालय व्यवस्थापन</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 space-y-6 overflow-y-auto">
          {/* Core System Navigation */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              System Modules
            </div>
            <nav className="space-y-1">
              {activeItems.filter((item) => item.visible).map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    data-tab={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-blue-400" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Modular Roadmap / Future Stages */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Planned Modules
            </div>
            <div className="space-y-1">
              {upcomingStages.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80 text-slate-400" />
                      <span className="truncate font-medium">{item.label}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-blue-300 border border-slate-700">
                      {item.stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 font-medium shrink-0">
          <div className="font-bold text-slate-200">Nepal Government SMS</div>
          <div>Version 1.0 (Local-First PWA)</div>
        </div>
      </aside>
    </>
  );
};
