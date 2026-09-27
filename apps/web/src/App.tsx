import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SchoolProvider } from './context/SchoolContext';
import { Login } from './pages/Login';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { SchoolSettings } from './pages/SchoolSettings';
import { UsersManagement } from './pages/UsersManagement';
import { AcademicStructure } from './pages/AcademicStructure';
import { StudentsManagement } from './pages/StudentsManagement';
import { StaffManagement } from './pages/StaffManagement';
import { AttendanceManagement } from './pages/AttendanceManagement';
import { SchoolCalendar } from './pages/SchoolCalendar';
import { RoutineManagement } from './pages/RoutineManagement';
import { ExaminationManagement } from './pages/ExaminationManagement';
import { CertificateManagement } from './pages/CertificateManagement';
import { SubstituteManagement } from './pages/SubstituteManagement';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [attendanceSubTab, setAttendanceSubTab] = useState<
    'DAILY' | 'MONTHLY_REGISTER' | 'STAFF_ATTENDANCE' | 'STAFF_MONTHLY_REGISTER'
  >('DAILY');
  const [attendanceClassId, setAttendanceClassId] = useState<string | undefined>(undefined);

  const handleNavigate = (tab: string, subTab?: string, classId?: string) => {
    setCurrentTab(tab);
    if (subTab) {
      setAttendanceSubTab(subTab as any);
    }
    if (classId) {
      setAttendanceClassId(classId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold text-base transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Nepali School Management System...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentTab === 'academic' && <AcademicStructure />}
          {currentTab === 'students' && <StudentsManagement />}
          {currentTab === 'staff' && <StaffManagement />}
          {currentTab === 'attendance' && (
            <AttendanceManagement
              initialTab={attendanceSubTab}
              initialClassId={attendanceClassId}
              onTabChange={(tab) => setAttendanceSubTab(tab)}
            />
          )}
          {currentTab === 'calendar' && <SchoolCalendar />}
          {currentTab === 'routine' && <RoutineManagement />}
          {currentTab === 'substitute' && <SubstituteManagement />}
          {currentTab === 'exams' && <ExaminationManagement />}
          {currentTab === 'certificates' && <CertificateManagement />}
          {currentTab === 'school_settings' && <SchoolSettings />}
          {currentTab === 'users_roles' && <UsersManagement />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SchoolProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SchoolProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
