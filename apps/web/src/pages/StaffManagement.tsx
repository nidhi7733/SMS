import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  UserCheck,
  Search,
  Upload,
  Download,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Building,
  Award,
  CreditCard,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';

interface StaffItem {
  id: string;
  staffCode: string;
  category: 'TEACHING' | 'NON_TEACHING';
  fullNameEn: string;
  fullNameNp: string;
  dobBs: string;
  dobAd?: string | null;
  gender: string;
  bloodGroup?: string | null;
  phone: string;
  email?: string | null;
  citizenshipNo?: string | null;
  nationalIdNo?: string | null;
  panNumber?: string | null;
  appointmentType: string;
  designation: string;
  teachingLicenseNo?: string | null;
  qualification: string;
  majorSubject?: string | null;
  training?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  userId?: string | null;
  status: string;
  createdAt: string;
  linkedUser?: any;
}

export const StaffManagement: React.FC = () => {
  const { token } = useAuth();
  const { language } = useLanguage();
  const isNp = language === 'np';

  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, teaching: 0, nonTeaching: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [selectedDesignation, setSelectedDesignation] = useState('ALL');
  const [selectedAppointment, setSelectedAppointment] = useState('ALL');

  // Modals
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);

  // Bulk Import state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkCategory, setBulkCategory] = useState<'TEACHING' | 'NON_TEACHING'>('TEACHING');
  const [createUserAccounts, setCreateUserAccounts] = useState(true);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [bulkErrorMsg, setBulkErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for Add/Edit
  const [formData, setFormData] = useState<any>({
    fullNameEn: '',
    fullNameNp: '',
    dobBs: '2040-01-01',
    dobAd: '',
    gender: 'MALE',
    bloodGroup: 'UNKNOWN',
    phone: '',
    email: '',
    citizenshipNo: '',
    panNumber: '',
    category: 'TEACHING',
    appointmentType: 'PERMANENT',
    designation: 'TEACHER',
    teachingLicenseNo: '',
    qualification: 'BACHELOR',
    majorSubject: '',
    training: '',
    bankName: '',
    bankAccountNo: '',
    permanentAddress: '',
    currentAddress: '',
  });

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategoryTab !== 'ALL') params.append('category', selectedCategoryTab);
      if (selectedDesignation !== 'ALL') params.append('designation', selectedDesignation);
      if (selectedAppointment !== 'ALL') params.append('appointmentType', selectedAppointment);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const res = await fetch(`/api/staff?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedCategoryTab, selectedDesignation, selectedAppointment, searchQuery]);

  // Bulk file select & preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkErrorMsg('');
    setBulkSuccessMsg('');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/staff/preview-iemis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fileData: base64, defaultCategory: bulkCategory }),
        });
        if (res.ok) {
          const preview = await res.json();
          setBulkPreview(preview);
          if (preview.detectedCategory) {
            setBulkCategory(preview.detectedCategory);
          }
        } else {
          const err = await res.json();
          setBulkErrorMsg(err.message || 'Failed to preview file');
        }
      } catch (err: any) {
        setBulkErrorMsg(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteBulkImport = async () => {
    if (!bulkPreview || !bulkPreview.rows) return;
    setIsBulkUploading(true);
    setBulkErrorMsg('');
    try {
      const res = await fetch('/api/staff/bulk-import-iemis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rows: bulkPreview.rows,
          category: bulkCategory,
          createUserAccounts,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkSuccessMsg(data.message);
        setBulkPreview(null);
        setBulkFile(null);
        fetchStaff();
      } else {
        setBulkErrorMsg(data.message || 'Import failed');
      }
    } catch (err: any) {
      setBulkErrorMsg(err.message);
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/staff/template', '_blank');
  };

  const handleOpenAdd = () => {
    setFormData({
      fullNameEn: '',
      fullNameNp: '',
      dobBs: '2040-01-01',
      dobAd: '',
      gender: 'MALE',
      bloodGroup: 'UNKNOWN',
      phone: '',
      email: '',
      citizenshipNo: '',
      panNumber: '',
      category: 'TEACHING',
      appointmentType: 'PERMANENT',
      designation: 'TEACHER',
      teachingLicenseNo: '',
      qualification: 'BACHELOR',
      majorSubject: '',
      training: '',
      bankName: '',
      bankAccountNo: '',
      permanentAddress: '',
      currentAddress: '',
    });
    setShowAddModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchStaff();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save staff');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEdit = (staff: StaffItem) => {
    setSelectedStaff(staff);
    setFormData({
      fullNameEn: staff.fullNameEn,
      fullNameNp: staff.fullNameNp,
      dobBs: staff.dobBs,
      dobAd: staff.dobAd || '',
      gender: staff.gender,
      bloodGroup: staff.bloodGroup || 'UNKNOWN',
      phone: staff.phone,
      email: staff.email || '',
      citizenshipNo: staff.citizenshipNo || '',
      panNumber: staff.panNumber || '',
      category: staff.category,
      appointmentType: staff.appointmentType,
      designation: staff.designation,
      teachingLicenseNo: staff.teachingLicenseNo || '',
      qualification: staff.qualification,
      majorSubject: staff.majorSubject || '',
      training: staff.training || '',
      bankName: staff.bankName || '',
      bankAccountNo: staff.bankAccountNo || '',
      permanentAddress: staff.permanentAddress || '',
      currentAddress: staff.currentAddress || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchStaff();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update staff');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowDeleteModal(false);
        fetchStaff();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete staff');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenDossier = (staff: StaffItem) => {
    setSelectedStaff(staff);
    setShowDossierModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isNp ? 'शिक्षक तथा कर्मचारी व्यवस्थापन' : 'Teachers & Staff Management'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isNp
                    ? 'IEMIS एक्सेल बल्क आयात, सरकारी दरबन्दी, योग्यता, लाइसेन्स र दैनिक सञ्चालन'
                    : 'CEHRD IEMIS Bulk Import, government appointments, qualifications, licenses, and directory'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>{isNp ? 'टेम्पलेट (.xlsx)' : 'Download Template'}</span>
            </button>

            <button
              onClick={() => {
                setBulkSuccessMsg('');
                setBulkErrorMsg('');
                setBulkPreview(null);
                setBulkFile(null);
                setShowBulkModal(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>{isNp ? 'Bulk Import (IEMIS Excel)' : 'Bulk Import (IEMIS)'}</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isNp ? 'कर्मचारी थप्नुहोस्' : 'Add Staff'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center sm:text-left">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              {isNp ? 'कुल कर्मचारी तथा शिक्षक' : 'Total Staff'}
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{counts.total}</div>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200/40 dark:border-blue-800/40">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
              {isNp ? 'शिक्षक संख्या' : 'Teaching Staff'}
            </span>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{counts.teaching}</div>
          </div>
          <div className="bg-purple-50/50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200/40 dark:border-purple-800/40">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">
              {isNp ? 'प्रशासनिक तथा सहयोगी' : 'Support / Admin Staff'}
            </span>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">{counts.nonTeaching}</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
          <button
            onClick={() => setSelectedCategoryTab('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              selectedCategoryTab === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isNp ? `सबै (${counts.total})` : `All Staff (${counts.total})`}
          </button>
          <button
            onClick={() => setSelectedCategoryTab('TEACHING')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              selectedCategoryTab === 'TEACHING'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isNp ? `शिक्षकहरू (${counts.teaching})` : `Teachers (${counts.teaching})`}
          </button>
          <button
            onClick={() => setSelectedCategoryTab('NON_TEACHING')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              selectedCategoryTab === 'NON_TEACHING'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isNp ? `कर्मचारीहरू (${counts.nonTeaching})` : `Support Staff (${counts.nonTeaching})`}
          </button>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={isNp ? 'नाम, कोड वा फोनबाट खोज्नुहोस्...' : 'Search by name, code, phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <div>
            <select
              value={selectedAppointment}
              onChange={(e) => setSelectedAppointment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="ALL">{isNp ? 'सबै दरबन्दी (All Appointments)' : 'All Appointments'}</option>
              <option value="PERMANENT">{isNp ? 'स्थायी (Permanent)' : 'Permanent'}</option>
              <option value="RELIEF">{isNp ? 'राहत अनुदान (Relief)' : 'Relief'}</option>
              <option value="MUNICIPAL">{isNp ? 'स्थानीय तह/नगर (Municipal)' : 'Municipal'}</option>
              <option value="CONTRACT">{isNp ? 'करार (Contract)' : 'Contract'}</option>
              <option value="PRIVATE">{isNp ? 'निजी स्रोत (Private)' : 'Private'}</option>
              <option value="OFFICE_SUPPORT">{isNp ? 'कार्यालय सहयोगी (Office Support)' : 'Office Support'}</option>
            </select>
          </div>

          <div>
            <select
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="ALL">{isNp ? 'सबै पद (All Designations)' : 'All Designations'}</option>
              <option value="PRINCIPAL">{isNp ? 'प्रधानाध्यापक (Principal)' : 'Principal'}</option>
              <option value="SECONDARY_TEACHER">{isNp ? 'मावि शिक्षक (Secondary Teacher)' : 'Secondary Teacher'}</option>
              <option value="LOWER_SECONDARY_TEACHER">{isNp ? 'निमावि शिक्षक (Lower Sec Teacher)' : 'Lower Sec Teacher'}</option>
              <option value="PRIMARY_TEACHER">{isNp ? 'प्रावि शिक्षक (Primary Teacher)' : 'Primary Teacher'}</option>
              <option value="ECD_TEACHER">{isNp ? 'बालविकास सहजकर्ता (ECD Teacher)' : 'ECD Teacher'}</option>
              <option value="ACCOUNTANT">{isNp ? 'लेखापाल (Accountant)' : 'Accountant'}</option>
              <option value="ADMIN_STAFF">{isNp ? 'प्रशासनिक कर्मचारी (Admin Staff)' : 'Admin Staff'}</option>
              <option value="OFFICE_ASSISTANT">{isNp ? 'कार्यालय सहयोगी (Peon)' : 'Office Assistant'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading staff records...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold text-base">
              {isNp ? 'कुनै कर्मचारी वा शिक्षक फेला परेन' : 'No staff members found'}
            </p>
            <p className="text-sm mt-1">
              {isNp ? 'IEMIS Excel बाट एकमुष्ट अपलोड गर्न माथिको "Bulk Import" थिच्नुहोस्।' : 'Use "Bulk Import (IEMIS)" above to import.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">{isNp ? 'नाम (Name)' : 'Name'}</th>
                  <th className="px-4 py-3.5">{isNp ? 'प्रकार / पद' : 'Category & Designation'}</th>
                  <th className="px-4 py-3.5">{isNp ? 'दरबन्दी' : 'Appointment'}</th>
                  <th className="px-4 py-3.5">{isNp ? 'सम्पर्क फोन' : 'Phone'}</th>
                  <th className="px-4 py-3.5">{isNp ? 'जन्ममिति (BS)' : 'DOB (BS)'}</th>
                  <th className="px-4 py-3.5">{isNp ? 'स्थिति' : 'Status'}</th>
                  <th className="px-4 py-3.5 text-right">{isNp ? 'कार्य' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                      {item.staffCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.fullNameEn}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.fullNameNp}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.category === 'TEACHING'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}
                        >
                          {item.category === 'TEACHING' ? 'शिक्षक' : 'कर्मचारी'}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.designation.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {item.appointmentType}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">
                      {item.phone}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {item.dobBs}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenDossier(item)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition"
                          title="View Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStaff(item);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isNp ? 'IEMIS Excel बाट शिक्षक तथा कर्मचारी Bulk Upload' : 'Bulk Import Staff / Teachers via IEMIS Excel'}
                </h3>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkSuccessMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            {bulkErrorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-sm flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{bulkErrorMsg}</span>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                {isNp ? 'आयात गरिने समूह (Import Category)' : 'Import Category'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBulkCategory('TEACHING')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center space-x-2 ${
                    bulkCategory === 'TEACHING'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{isNp ? 'शिक्षक (Teachers - ३५)' : 'Teaching Staff'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkCategory('NON_TEACHING')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center space-x-2 ${
                    bulkCategory === 'NON_TEACHING'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{isNp ? 'कर्मचारी (Staff - ४)' : 'Non-Teaching Staff'}</span>
                </button>
              </div>
            </div>

            {/* File Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {bulkFile ? bulkFile.name : isNp ? 'Teacher_List_Report वा Staff_List_Report फाइल छान्नुहोस्' : 'Select Teacher_List_Report or Staff_List_Report (.xlsx)'}
              </p>
              <p className="text-xs text-slate-500 mt-1">CEHRD IEMIS standard excel exports supported</p>
            </div>

            {/* Preview Summary */}
            {bulkPreview && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isNp ? 'फाइल पूर्वावलोकन (Preview)' : 'File Preview Summary'}
                  </h4>
                  <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded">
                    Sheet: {bulkPreview.sheetName}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block font-semibold">Total Rows</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{bulkPreview.totalRows}</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="text-emerald-700 dark:text-emerald-300 block font-semibold">Ready to Import</span>
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{bulkPreview.readyCount}</span>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-amber-700 dark:text-amber-300 block font-semibold">Duplicate / Skip</span>
                    <span className="text-base font-bold text-amber-700 dark:text-amber-300">{bulkPreview.duplicateCount}</span>
                  </div>
                </div>

                {/* Auto User Accounts Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="userAccountsCheck"
                    checked={createUserAccounts}
                    onChange={(e) => setCreateUserAccounts(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="userAccountsCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    {isNp
                      ? 'प्रत्येक शिक्षक/कर्मचारीको लागि स्वतः लगइन युजर खाता खोल्ने (Username = फोन नम्बर, Default Pass = Password123!)'
                      : 'Automatically create user login accounts for imported staff (Username = Phone, Default Pass = Password123!)'}
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition"
              >
                {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                disabled={!bulkPreview || bulkPreview.readyCount === 0 || isBulkUploading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center space-x-2"
              >
                {isBulkUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>{isNp ? `एकमुष्ट सुरक्षित गर्नुहोस् (${bulkPreview?.readyCount || 0})` : `Import Staff (${bulkPreview?.readyCount || 0})`}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isNp ? 'नयाँ शिक्षक वा कर्मचारी दर्ता' : 'Add New Staff Member'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullNameEn}
                    onChange={(e) => setFormData({ ...formData, fullNameEn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    पूरा नाम (नेपाली)
                  </label>
                  <input
                    type="text"
                    value={formData.fullNameNp}
                    onChange={(e) => setFormData({ ...formData, fullNameNp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="TEACHING">शिक्षक (Teaching)</option>
                    <option value="NON_TEACHING">कर्मचारी (Non-Teaching)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Appointment Type *
                  </label>
                  <select
                    value={formData.appointmentType}
                    onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="PERMANENT">स्थायी (Permanent)</option>
                    <option value="RELIEF">राहत (Relief)</option>
                    <option value="MUNICIPAL">स्थानीय तह (Municipal)</option>
                    <option value="CONTRACT">करार (Contract)</option>
                    <option value="PRIVATE">निजी स्रोत (Private)</option>
                    <option value="OFFICE_SUPPORT">सहयोगी (Support)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Designation *
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="PRINCIPAL">प्रधानाध्यापक (Principal)</option>
                    <option value="SECONDARY_TEACHER">मावि शिक्षक (Secondary)</option>
                    <option value="LOWER_SECONDARY_TEACHER">निमावि शिक्षक (Lower Sec)</option>
                    <option value="PRIMARY_TEACHER">प्रावि शिक्षक (Primary)</option>
                    <option value="ECD_TEACHER">बालविकास सहजकर्ता (ECD)</option>
                    <option value="ACCOUNTANT">लेखापाल (Accountant)</option>
                    <option value="ADMIN_STAFF">प्रशासन कर्मचारी (Admin)</option>
                    <option value="OFFICE_ASSISTANT">कार्यालय सहयोगी (Office Assistant)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Date of Birth (BS) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DD"
                    value={formData.dobBs}
                    onChange={(e) => setFormData({ ...formData, dobBs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Teaching License No
                  </label>
                  <input
                    type="text"
                    value={formData.teachingLicenseNo}
                    onChange={(e) => setFormData({ ...formData, teachingLicenseNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Major Subject (मुख्य विषय)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Science, Nepali"
                    value={formData.majorSubject}
                    onChange={(e) => setFormData({ ...formData, majorSubject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Qualification (सर्वोच्च योग्यता)
                  </label>
                  <select
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="BACHELOR">स्नातक (Bachelor)</option>
                    <option value="MASTER">स्नातकोत्तर (Master)</option>
                    <option value="PLUS_TWO">+२ / प्रविणता प्रमाणपत्र (10+2)</option>
                    <option value="SLC_SEE">SLC / SEE</option>
                    <option value="MPHIL_PHD">MPhil / PhD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isNp ? 'कर्मचारी विवरण सम्पादन' : 'Edit Staff Details'}
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {selectedStaff.staffCode}
                </span>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullNameEn}
                    onChange={(e) => setFormData({ ...formData, fullNameEn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    पूरा नाम (नेपाली)
                  </label>
                  <input
                    type="text"
                    value={formData.fullNameNp}
                    onChange={(e) => setFormData({ ...formData, fullNameNp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Date of Birth (BS)
                  </label>
                  <input
                    type="text"
                    value={formData.dobBs}
                    onChange={(e) => setFormData({ ...formData, dobBs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Designation
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="PRINCIPAL">प्रधानाध्यापक (Principal)</option>
                    <option value="SECONDARY_TEACHER">मावि शिक्षक (Secondary)</option>
                    <option value="LOWER_SECONDARY_TEACHER">निमावि शिक्षक (Lower Sec)</option>
                    <option value="PRIMARY_TEACHER">प्रावि शिक्षक (Primary)</option>
                    <option value="ECD_TEACHER">बालविकास सहजकर्ता (ECD)</option>
                    <option value="ACCOUNTANT">लेखापाल (Accountant)</option>
                    <option value="ADMIN_STAFF">प्रशासन कर्मचारी (Admin)</option>
                    <option value="OFFICE_ASSISTANT">कार्यालय सहयोगी (Peon)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Major Subject
                  </label>
                  <input
                    type="text"
                    value={formData.majorSubject}
                    onChange={(e) => setFormData({ ...formData, majorSubject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Teaching License Number
                  </label>
                  <input
                    type="text"
                    value={formData.teachingLicenseNo}
                    onChange={(e) => setFormData({ ...formData, teachingLicenseNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                >
                  Update Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Staff Dossier Modal */}
      {showDossierModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl max-h-[92vh] w-full flex flex-col shadow-2xl overflow-hidden">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                  {selectedStaff.fullNameEn.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{selectedStaff.fullNameEn}</span>
                    <span className="text-xs px-2 py-0.5 font-mono rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {selectedStaff.staffCode}
                    </span>
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedStaff.fullNameNp} • {selectedStaff.designation.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Category</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedStaff.category === 'TEACHING' ? 'शिक्षक (Teaching)' : 'कर्मचारी (Staff)'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Appointment</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedStaff.appointmentType}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase">DOB (BS)</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedStaff.dobBs}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Phone</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedStaff.phone}</div>
                </div>
              </div>

              {/* Service & Qualification Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    <span>पेशागत तथा सेवा विवरण (Service & Appointment)</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">पद (Designation):</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedStaff.designation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">दरबन्दी प्रकार:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedStaff.appointmentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">अध्यापन अनुमतिपत्र नं:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedStaff.teachingLicenseNo || 'उल्लेख नभएको'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">सेवा स्थिति:</span>
                      <span className="font-semibold text-emerald-600">{selectedStaff.status}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>शैक्षिक योग्यता र तालिम (Education & Training)</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">सर्वोच्च योग्यता:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedStaff.qualification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">मुख्य अध्यापन विषय:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedStaff.majorSubject || 'उल्लेख नभएको'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IEMIS तालिम विवरण:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedStaff.training || 'तालिम विवरण उपलब्ध छैन'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 shrink-0 bg-slate-50 dark:bg-slate-800/60">
              <button
                onClick={() => {
                  setShowDossierModal(false);
                  handleOpenEdit(selectedStaff);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Edit Staff Details
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Confirmation Modal */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isNp ? 'कर्मचारी हटाउने पुष्टि गर्नुहोस्' : 'Confirm Delete Staff'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isNp
                ? `के तपाईँ निश्चित हुनुहुन्छ? कर्मचारी "${selectedStaff.fullNameEn}" (${selectedStaff.staffCode}) लाई प्रणालीबाट हटाइनेछ।`
                : `Are you sure you want to remove ${selectedStaff.fullNameEn} (${selectedStaff.staffCode})? This cannot be undone.`}
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                Delete Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
