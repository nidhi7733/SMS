import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { School, KeyRound, User as UserIcon, AlertCircle, ArrowRight, Sun, Moon, Globe } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { school } = useSchool();

  const schoolNameEn = school?.nameEn || 'Shree Shanti Secondary School';
  const schoolNameNp = school?.nameNp || 'श्री शान्ति माध्यमिक विद्यालय';
  const logoUrl = school?.logoUrl;

  const [username, setUsername] = useState('principal');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (user: string) => {
    setUsername(user);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Controls on Top Right */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center space-x-1"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Bright</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span>Dark</span>
            </>
          )}
        </button>

        <button
          onClick={() => setLanguage(language === 'en' ? 'np' : 'en')}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center space-x-1"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {logoUrl ? (
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-lg mb-4 p-1.5 overflow-hidden">
            <img src={logoUrl} alt="School Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 text-white shadow-lg mb-4">
            <School className="w-9 h-9" />
          </div>
        )}

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'np' ? schoolNameNp : schoolNameEn}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 font-medium">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-md rounded-xl border border-slate-200 dark:border-slate-800 sm:px-10 transition-colors">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-sm rounded-lg flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                {t('login.username')}
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g. principal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                {t('login.password')}
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : t('login.btn')}
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('login.quick_demo')}
              </p>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                १ भन्दा बढी प्रयोगकर्ता समर्थित
              </span>
            </div>

            {/* Grid of demo roles */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoUser('principal')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="प्रधानाध्यापक (Dr. Ram Bahadur / Premendra Nidhi)"
              >
                <span>🎓</span>
                <span className="truncate">Principal</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('admin')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="सिस्टम प्रशासक (Admin)"
              >
                <span>⚙️</span>
                <span className="truncate">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('librarian')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="पुस्तकालय प्रमुख (Santosh Shrestha)"
              >
                <span>📚</span>
                <span className="truncate">Librarian</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('accountant')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="मुख्य लेखापाल (Hari Prasad Acharya)"
              >
                <span>💰</span>
                <span className="truncate">Accountant 1</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('accountant2')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="सहायक लेखापाल (Sunita Thapa)"
              >
                <span>💳</span>
                <span className="truncate">Accountant 2</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('teacher')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="शिक्षक (Binod Kumar Adhikari)"
              >
                <span>📖</span>
                <span className="truncate">Teacher 1</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('9844040914')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="शिक्षक (Ashok Kumar Labh - Mobile Number)"
              >
                <span>👨‍🏫</span>
                <span className="truncate">Teacher 2 (Ph)</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('student')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="विद्यार्थी (Aarav Sharma - Student Portal)"
              >
                <span>🎒</span>
                <span className="truncate">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoUser('parent')}
                className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold transition text-left flex items-center space-x-1.5"
                title="अभिभावक (Bikram Sharma - Guardian Portal)"
              >
                <span>👨‍👩‍👦</span>
                <span className="truncate">Parent</span>
              </button>
            </div>

            <div className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              सबै खाताको पासवर्ड: <code className="font-mono text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Password123!</code>
            </div>

            {/* Explanatory Guide Box */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ℹ️</span>
                <span>प्रयोगकर्ता लग-इन सम्बन्धी जानकारी:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">शिक्षकहरू:</strong> सबै शिक्षकहरूको आ-आफ्नो <strong>मोबाइल नम्बर</strong> (Phone No) नै युजरनेम हो। विद्यालयका ३५+ शिक्षकहरू सबैले आफ्नो छुट्टै खाताबाट लग-इन गर्न सक्छन्।
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">लेखापाल तथा पुस्तकालय:</strong> विद्यालयमा १ भन्दा बढी लेखापाल वा पुस्तकालय कर्मचारी भएमा एडमिनले सबैको लागि छुट्टाछुट्टै युजरनेम र पासवर्ड बनाउन सक्छन्।
                </li>
                <li>
                  <strong className="text-slate-800 dark:text-slate-200">विद्यार्थी र अभिभावक:</strong> विद्यार्थीले आफ्नो Student ID/रोल नम्बर तथा अभिभावकले भर्नामा दर्ता भएको मोबाइल नम्बर प्रयोग गरेर लग-इन गर्न सक्ने व्यवस्था छ।
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
