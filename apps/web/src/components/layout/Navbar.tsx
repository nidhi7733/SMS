import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { LogOut, Globe, School as SchoolIcon, ShieldCheck, Sun, Moon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t, formatNumber } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { school } = useSchool();

  const schoolNameEn = school?.nameEn || 'Shree Shanti Secondary School';
  const schoolNameNp = school?.nameNp || 'श्री शान्ति माध्यमिक विद्यालय';
  const logoUrl = school?.logoUrl || (school as any)?.logo_url;
  const academicYearBs = school?.activeAcademicYearBs || 2083;
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 lg:px-6 py-2.5 flex items-center justify-between shadow-xs transition-colors">
      {/* Left: School Logo, Title & Academic Year */}
      <div className="flex items-center space-x-3">
        {logoUrl && !imgError ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-xs shrink-0 flex items-center justify-center p-0.5">
            <img
              src={logoUrl}
              alt="School Logo"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <SchoolIcon className="w-6 h-6" />
          </div>
        )}

        <div>
          <h1 className="text-base lg:text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {language === 'np' ? schoolNameNp : schoolNameEn}
          </h1>
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>{t('app.nepal_gov')}</span>
            <span>•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {t('app.academic_year')}: {formatNumber(academicYearBs)} BS
            </span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle, Language switch & User actions */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Dark / Bright Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
          title={theme === 'dark' ? 'Switch to Bright Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Bright</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'np' : 'en')}
          className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
          title="Switch Language / भाषा परिवर्तन गर्नुहोस्"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
        </button>

        {/* User Badge */}
        {user && (
          <div className="flex items-center space-x-2 sm:space-x-3 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="hidden md:block text-right">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language === 'np' ? user.fullNameNp : user.fullNameEn}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" />
                {user.roles[0]
                  ? language === 'np'
                    ? user.roles[0].displayNameNp
                    : user.roles[0].displayNameEn
                  : 'Staff'}
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
              title={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
