import React from 'react';
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
  Award,
  ArrowRightLeft,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();

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
      visible: hasPermission('ATTENDANCE_VIEW'),
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
      visible: true,
    },
    {
      id: 'exams',
      label: t('nav.exams'),
      icon: GraduationCap,
      visible: true,
    },
    {
      id: 'certificates',
      label: t('nav.certificates'),
      icon: Award,
      visible: true,
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
    { id: 'fees', label: t('nav.fees'), icon: ReceiptText, stage: 'Stage 4' },
    { id: 'accounts', label: t('nav.accounts'), icon: Landmark, stage: 'Stage 4' },
    { id: 'library', label: t('nav.library'), icon: BookOpen, stage: 'Stage 5' },
    { id: 'documents', label: t('nav.documents'), icon: FileCheck2, stage: 'Stage 7' },
  ];

  return (
    <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-61px)] transition-colors">
      <div className="p-4 flex-1 space-y-6">
        {/* Core Stage 1 Navigation */}
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
                  onClick={() => setCurrentTab(item.id)}
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
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 font-medium">
        <div className="font-bold text-slate-200">Nepal Government SMS</div>
        <div>Version 1.0 (Local-First PWA)</div>
      </div>
    </aside>
  );
};
