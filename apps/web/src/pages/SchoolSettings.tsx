import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { School, Save, CheckCircle2, AlertCircle, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export const SchoolSettings: React.FC = () => {
  const { t, formatNumber } = useLanguage();
  const { setSchoolData } = useSchool();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

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
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Academic & Fiscal Cycles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Active Academic Year (BS) *
              </label>
              <input
                type="number"
                name="activeAcademicYearBs"
                value={form.activeAcademicYearBs}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Current Bikram Sambat Academic Session ({formatNumber(form.activeAcademicYearBs)} BS)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nepal Fiscal Year (Shrawan to Ashadh) *
              </label>
              <input
                type="text"
                name="fiscalYearBs"
                value={form.fiscalYearBs}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Statutory accounting period (e.g. 2082/083)
              </span>
            </div>
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
    </div>
  );
};
