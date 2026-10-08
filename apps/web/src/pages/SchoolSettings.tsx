import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import {
  School,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Image as ImageIcon,
  Calendar,
  Plus,
  Check,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';

export const SchoolSettings: React.FC = () => {
  const { t, formatNumber } = useLanguage();
  const { setSchoolData, refreshSchool } = useSchool();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Academic Sessions Management State
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [yearSaving, setYearSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [yearForm, setYearForm] = useState({
    yearBs: 2084,
    startDateBs: '2084-01-01',
    endDateBs: '2084-12-30',
    startDateAd: '2027-04-14',
    endDateAd: '2028-04-13',
    isCurrent: false,
  });

  const [form, setForm] = useState({
    nameEn: '',
    nameNp: '',
    logoUrl: '',
    mottoEn: '',
    mottoNp: '',
    iemisCode: '',
    establishedBsYear: 2028,
    phone: '',
    email: '',
    website: '',
    addressEn: '',
    addressNp: '',
    province: '',
    district: '',
    localLevel: '',
    wardNumber: 4,
    activeAcademicYearBs: 2083,
    fiscalYearBs: '2082/083',
  });

  useEffect(() => {
    fetchProfile();
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/years', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAcademicYears(data.academicYears || []);
      }
    } catch (err) {
      console.error('Failed to load academic years', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/school/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          ...data.school,
          logoUrl: data.school.logoUrl || '',
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load school profile');
    } finally {
      setLoading(false);
    }
  };

  const handleYearBsChange = (year: number) => {
    setYearForm({
      yearBs: year,
      startDateBs: `${year}-01-01`,
      endDateBs: `${year}-12-30`,
      startDateAd: `${year - 57}-04-14`,
      endDateAd: `${year - 56}-04-13`,
      isCurrent: false,
    });
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setYearSaving(true);
    setError(null);
    setModalError(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/years', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(yearForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create academic year');

      setSuccess(`शैक्षिक सत्र ${yearForm.yearBs} वि.सं. सफलतापूर्वक थपियो।`);
      setShowAddYearModal(false);
      await fetchAcademicYears();
      if (yearForm.isCurrent) {
        setForm((prev) => ({ ...prev, activeAcademicYearBs: yearForm.yearBs }));
        await refreshSchool();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to create academic year');
    } finally {
      setYearSaving(false);
    }
  };

  const handleActivateYear = async (year: any) => {
    setError(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/years/${year.id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to activate academic year');

      setForm((prev) => ({ ...prev, activeAcademicYearBs: year.yearBs }));
      setSuccess(`शैक्षिक सत्र ${year.yearBs} वि.सं. मुख्य चालु (Active) सत्रको रूपमा सक्रिय गरियो।`);
      await fetchAcademicYears();
      await refreshSchool();
    } catch (err: any) {
      setError(err.message || 'Failed to activate academic year');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to maximum 400x400 for crisp header rendering & lightweight payload
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' || file.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg';
          const optimizedDataUrl = canvas.toDataURL(mimeType, 0.92);
          setForm((prev) => ({ ...prev, logoUrl: optimizedDataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/school/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to update profile (HTTP ${res.status})`);
      }

      const data = await res.json();
      // Update global SchoolContext immediately so Header updates in real-time!
      setSchoolData(data.school);
      await refreshSchool();
      await fetchAcademicYears();
      setSuccess(t('school.saved_success'));
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-400 font-medium">
        Loading school settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t('nav.school_settings')}</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Configure institutional profile, logo, address structure, and active BS sessions
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm rounded-xl flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm rounded-xl flex items-center space-x-2 font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        
        {/* Section 0: Official School Logo Upload */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Official School Logo / विद्यालयको लोगो</span>
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo Preview */}
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-xs shrink-0 p-1">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="School Logo Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-2">
                  <School className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                  <span className="text-[10px] text-slate-500 font-medium">No Logo</span>
                </div>
              )}
            </div>

            {/* Logo Controls */}
            <div className="space-y-2 text-center sm:text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
                id="school-logo-input"
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label
                  htmlFor="school-logo-input"
                  className="inline-flex items-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload New Logo
                </label>

                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remove Logo
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recommended: Square PNG or SVG (transparent background), max 2MB. Logo appears immediately on Header and report cards.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t('school.info')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.name_en')} *
              </label>
              <input
                type="text"
                name="nameEn"
                value={form.nameEn}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.name_np')} *
              </label>
              <input
                type="text"
                name="nameNp"
                value={form.nameNp}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.motto_en')}
              </label>
              <input
                type="text"
                name="mottoEn"
                value={form.mottoEn || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.motto_np')}
              </label>
              <input
                type="text"
                name="mottoNp"
                value={form.mottoNp || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Nepal Address & Governance */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t('school.address')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Official Address (Nepali) / पूरा ठेगाना (नेपाली) *
              </label>
              <input
                type="text"
                name="addressNp"
                value={form.addressNp || ''}
                onChange={handleChange}
                placeholder="उदा: बुटवल-०६, रुपन्देही, लुम्बिनी प्रदेश, नेपाल"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Official Address (English) / पूरा ठेगाना (अंग्रेजी) *
              </label>
              <input
                type="text"
                name="addressEn"
                value={form.addressEn || ''}
                onChange={handleChange}
                placeholder="e.g. Butwal-06, Rupandehi, Lumbini Province, Nepal"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.province')} *
              </label>
              <input
                type="text"
                name="province"
                value={form.province}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.district')} *
              </label>
              <input
                type="text"
                name="district"
                value={form.district}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.local_level')} *
              </label>
              <input
                type="text"
                name="localLevel"
                value={form.localLevel}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.ward')} *
              </label>
              <input
                type="number"
                name="wardNumber"
                value={form.wardNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dash.iemis_code')}
              </label>
              <input
                type="text"
                name="iemisCode"
                value={form.iemisCode || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('school.phone')} *
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Academic Year & Fiscal Year */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>शैक्षिक सत्र तथा आर्थिक वर्ष (Academic & Fiscal Cycles)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                विद्यालयको मुख्य चालु शैक्षिक सत्र, आर्थिक वर्ष र आगामी वर्षका सत्रहरूको व्यवस्थापन
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextYear = (form.activeAcademicYearBs || 2083) + 1;
                handleYearBsChange(nextYear);
                setShowAddYearModal(true);
              }}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              नयाँ शैक्षिक सत्र थप्नुहोस् (Add Session)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Active Academic Year (BS) / मुख्य चालु शैक्षिक सत्र *
              </label>
              <input
                type="number"
                name="activeAcademicYearBs"
                value={form.activeAcademicYearBs}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                हालको बिक्रम संवत् मुख्य शैक्षिक सत्र ({formatNumber(form.activeAcademicYearBs)} BS)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nepal Fiscal Year (Shrawan to Ashadh) / आर्थिक वर्ष *
              </label>
              <input
                type="text"
                name="fiscalYearBs"
                value={form.fiscalYearBs}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                लेखा तथा वित्तीय प्रयोजनका लागि (उदा: 2082/083)
              </span>
            </div>
          </div>

          {/* Configured Academic Sessions List */}
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              दर्ता भएका शैक्षिक सत्रहरू (Configured Educational Sessions)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {academicYears.map((y) => {
                const isActive = y.isCurrent || y.yearBs === Number(form.activeAcademicYearBs);
                return (
                  <div
                    key={y.id}
                    className={`p-4 rounded-xl border transition ${
                      isActive
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{formatNumber(y.yearBs)} वि.सं.</span>
                        <span className="text-xs font-medium text-slate-500">
                          ({formatNumber(y.yearBs - 57)} AD)
                        </span>
                      </div>
                      {isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                          <Check className="w-3 h-3 mr-1" />
                          मुख्य चालु सत्र (Active)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivateYear(y)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-lg transition"
                        >
                          सक्रिय गर्नुहोस् (Activate)
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                      <div>
                        <span className="text-slate-500">वि.सं. मिति: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {y.startDateBs} देखि {y.endDateBs} सम्म
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">ई.सं. (AD) मिति: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {y.startDateAd} to {y.endDateAd}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guide on How to Add Next Year Session */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs space-y-2">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>अर्को वर्षको शैक्षिक सत्र कसरी थप्ने? (How to Add Next Year's Session):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-amber-900/90 dark:text-amber-300/90 font-medium">
              <li>
                माथिको <strong>'+ नयाँ शैक्षिक सत्र थप्नुहोस्'</strong> बटनमा क्लिक गर्नुहोस्।
              </li>
              <li>
                आगामी वि.सं. वर्ष (जस्तै: <strong>{formatNumber((form.activeAcademicYearBs || 2083) + 1)}</strong>) चयन गर्नुहोस् — यसका वि.सं. तथा ई.सं. सुरु र अन्तिम मितिहरू स्वचालित रूपमा तयार हुनेछन्।
              </li>
              <li>
                सत्र सुरक्षित गर्नुहोस्। नयाँ वर्ष सुरु भएपछि सोही सत्रको छेउमा रहेको <strong>'सक्रिय गर्नुहोस्'</strong> बटन थिचेर चालु सत्र बनाउन सकिनेछ।
              </li>
            </ol>
          </div>
        </div>

        {/* Submit */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-end space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : t('school.save')}
          </button>
        </div>
      </form>

      {/* Add Academic Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  नयाँ शैक्षिक सत्र थप्नुहोस् (Add Session)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddYearModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="p-6 space-y-4 text-xs font-medium">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs rounded-xl flex items-center space-x-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  शैक्षिक वर्ष वि.सं. (Academic Year BS) *
                </label>
                <input
                  type="number"
                  min="2080"
                  max="2100"
                  value={yearForm.yearBs}
                  onChange={(e) => handleYearBsChange(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-500">
                  उदा: 2084 वि.सं. ({yearForm.yearBs - 57} AD)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    सुरु मिति वि.सं. (Start Date BS) *
                  </label>
                  <input
                    type="text"
                    value={yearForm.startDateBs}
                    onChange={(e) => setYearForm({ ...yearForm, startDateBs: e.target.value })}
                    required
                    placeholder="YYYY-01-01"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    अन्तिम मिति वि.सं. (End Date BS) *
                  </label>
                  <input
                    type="text"
                    value={yearForm.endDateBs}
                    onChange={(e) => setYearForm({ ...yearForm, endDateBs: e.target.value })}
                    required
                    placeholder="YYYY-12-30"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    सुरु मिति ई.सं. (Start Date AD) *
                  </label>
                  <input
                    type="date"
                    value={yearForm.startDateAd}
                    onChange={(e) => setYearForm({ ...yearForm, startDateAd: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    अन्तिम मिति ई.सं. (End Date AD) *
                  </label>
                  <input
                    type="date"
                    value={yearForm.endDateAd}
                    onChange={(e) => setYearForm({ ...yearForm, endDateAd: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={yearForm.isCurrent}
                    onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    यस सत्रलाई तुरुन्त मुख्य चालु सत्र बनाउनुहोस् (Set as Active Session)
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={yearSaving}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {yearSaving ? 'सुरक्षित हुँदैछ...' : 'सत्र सुरक्षित गर्नुहोस् (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

