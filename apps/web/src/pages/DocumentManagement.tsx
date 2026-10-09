import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { toDevanagariDigits } from '@sms/shared';
import {
  FileText,
  Inbox,
  Send,
  FileCheck2,
  Archive,
  Search,
  Plus,
  Printer,
  Eye,
  Trash2,
  Edit2,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  UserCheck,
  Tag,
  Calendar,
  X,
  FileBadge,
  Sparkles,
} from 'lucide-react';

interface InwardDoc {
  id: string;
  dartaNo: number;
  fiscalYear: string;
  registeredDateBs: string;
  senderOrganization: string;
  senderLetterNo?: string;
  senderLetterDateBs?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  scannedFileUrl?: string;
  receiverStaffId?: string;
  receiverStaffName?: string;
  remarks?: string;
}

interface OutwardDoc {
  id: string;
  chalaniNo: number;
  fiscalYear: string;
  dispatchDateBs: string;
  recipientOrganization: string;
  subject: string;
  category: string;
  dispatchMode: string;
  signatoryStaffId?: string;
  signatoryStaffName?: string;
  scannedFileUrl?: string;
  remarks?: string;
}

interface LetterTemplate {
  id: string;
  code: string;
  titleEn: string;
  titleNp: string;
  templateBodyHtml: string;
  category: string;
  isActive: boolean;
}

interface IssuedLetter {
  id: string;
  letterNo: string;
  templateId: string;
  templateTitle?: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  issueDateBs: string;
  generatedContentHtml: string;
  signatoryStaffId?: string;
  signatoryStaffName?: string;
  remarks?: string;
  createdAt: string;
}

interface InstitutionalArchive {
  id: string;
  title: string;
  category: string;
  documentYearBs?: number;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes?: number;
  tags?: string[];
  confidentialityLevel: string;
  createdAt: string;
}

interface StaffMember {
  id: string;
  fullName: string;
  designation?: string;
}

interface StudentItem {
  id: string;
  firstNameNp?: string;
  lastNameNp?: string;
  firstNameEn: string;
  lastNameEn?: string;
  admissionNo?: string;
  currentRollNumber?: number;
  currentClassId?: string;
  dobBs?: string;
}

export const DocumentManagement: React.FC = () => {
  const { language } = useLanguage();
  const isNp = language === 'np';
  const { school } = useSchool();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'inward' | 'outward' | 'templates' | 'archives'>('inward');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Data states
  const [inwardList, setInwardList] = useState<InwardDoc[]>([]);
  const [outwardList, setOutwardList] = useState<OutwardDoc[]>([]);
  const [templateList, setTemplateList] = useState<LetterTemplate[]>([]);
  const [issuedList, setIssuedList] = useState<IssuedLetter[]>([]);
  const [archiveList, setArchiveList] = useState<InstitutionalArchive[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [fiscalYearFilter, setFiscalYearFilter] = useState('2082/083');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);
  const [isIssueLetterModalOpen, setIsIssueLetterModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [printLetterData, setPrintLetterData] = useState<IssuedLetter | null>(null);

  // Edit states
  const [editingInward, setEditingInward] = useState<InwardDoc | null>(null);
  const [editingOutward, setEditingOutward] = useState<OutwardDoc | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplate | null>(null);
  const [editingArchive, setEditingArchive] = useState<InstitutionalArchive | null>(null);

  // Form states
  const [inwardForm, setInwardForm] = useState({
    dartaNo: '',
    fiscalYear: '2082/083',
    registeredDateBs: '2083-01-15',
    senderOrganization: '',
    senderLetterNo: '',
    senderLetterDateBs: '',
    subject: '',
    category: 'GOVERNMENT',
    priority: 'NORMAL',
    status: 'PENDING',
    scannedFileUrl: '',
    receiverStaffId: '',
    remarks: '',
  });

  const [outwardForm, setOutwardForm] = useState({
    chalaniNo: '',
    fiscalYear: '2082/083',
    dispatchDateBs: '2083-01-15',
    recipientOrganization: '',
    subject: '',
    category: 'RECOMMENDATION',
    dispatchMode: 'HAND_DELIVERY',
    signatoryStaffId: '',
    scannedFileUrl: '',
    remarks: '',
  });

  const [issueForm, setIssueForm] = useState({
    templateId: '',
    targetType: 'STUDENT',
    targetId: '',
    targetName: '',
    issueDateBs: '2083-01-15',
    signatoryStaffId: '',
    remarks: '',
    autoRegisterChalani: true,
  });

  const [templateForm, setTemplateForm] = useState({
    code: '',
    titleEn: '',
    titleNp: '',
    category: 'GENERAL',
    templateBodyHtml: '',
  });

  const [archiveForm, setArchiveForm] = useState({
    title: '',
    category: 'MISCELLANEOUS',
    documentYearBs: 2083,
    fileUrl: '',
    tags: '',
    confidentialityLevel: 'RESTRICTED',
  });

  // Modal Open Handlers
  const openAddInward = () => {
    setEditingInward(null);
    setInwardForm({
      dartaNo: '',
      fiscalYear: fiscalYearFilter || '2082/083',
      registeredDateBs: '2083-01-15',
      senderOrganization: '',
      senderLetterNo: '',
      senderLetterDateBs: '',
      subject: '',
      category: 'GOVERNMENT',
      priority: 'NORMAL',
      status: 'PENDING',
      scannedFileUrl: '',
      receiverStaffId: '',
      remarks: '',
    });
    setIsInwardModalOpen(true);
  };

  const openEditInward = (doc: InwardDoc) => {
    setEditingInward(doc);
    setInwardForm({
      dartaNo: String(doc.dartaNo),
      fiscalYear: doc.fiscalYear,
      registeredDateBs: doc.registeredDateBs,
      senderOrganization: doc.senderOrganization,
      senderLetterNo: doc.senderLetterNo || '',
      senderLetterDateBs: doc.senderLetterDateBs || '',
      subject: doc.subject,
      category: doc.category,
      priority: doc.priority,
      status: doc.status,
      scannedFileUrl: doc.scannedFileUrl || '',
      receiverStaffId: doc.receiverStaffId || '',
      remarks: doc.remarks || '',
    });
    setIsInwardModalOpen(true);
  };

  const openAddOutward = () => {
    setEditingOutward(null);
    setOutwardForm({
      chalaniNo: '',
      fiscalYear: fiscalYearFilter || '2082/083',
      dispatchDateBs: '2083-01-15',
      recipientOrganization: '',
      subject: '',
      category: 'RECOMMENDATION',
      dispatchMode: 'HAND_DELIVERY',
      signatoryStaffId: '',
      scannedFileUrl: '',
      remarks: '',
    });
    setIsOutwardModalOpen(true);
  };

  const openEditOutward = (doc: OutwardDoc) => {
    setEditingOutward(doc);
    setOutwardForm({
      chalaniNo: String(doc.chalaniNo),
      fiscalYear: doc.fiscalYear,
      dispatchDateBs: doc.dispatchDateBs,
      recipientOrganization: doc.recipientOrganization,
      subject: doc.subject,
      category: doc.category,
      dispatchMode: doc.dispatchMode,
      signatoryStaffId: doc.signatoryStaffId || '',
      scannedFileUrl: doc.scannedFileUrl || '',
      remarks: doc.remarks || '',
    });
    setIsOutwardModalOpen(true);
  };

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      code: '',
      titleEn: '',
      titleNp: '',
      category: 'GENERAL',
      templateBodyHtml: '',
    });
    setIsTemplateModalOpen(true);
  };

  const openEditTemplate = (tpl: LetterTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      code: tpl.code,
      titleEn: tpl.titleEn,
      titleNp: tpl.titleNp,
      category: tpl.category,
      templateBodyHtml: tpl.templateBodyHtml,
    });
    setIsTemplateModalOpen(true);
  };

  const openAddArchive = () => {
    setEditingArchive(null);
    setArchiveForm({
      title: '',
      category: 'MISCELLANEOUS',
      documentYearBs: 2083,
      fileUrl: '',
      tags: '',
      confidentialityLevel: 'RESTRICTED',
    });
    setIsArchiveModalOpen(true);
  };

  const openEditArchive = (arch: InstitutionalArchive) => {
    setEditingArchive(arch);
    setArchiveForm({
      title: arch.title,
      category: arch.category,
      documentYearBs: arch.documentYearBs || 2083,
      fileUrl: arch.fileUrl,
      tags: Array.isArray(arch.tags) ? arch.tags.join(', ') : (arch.tags || ''),
      confidentialityLevel: arch.confidentialityLevel,
    });
    setIsArchiveModalOpen(true);
  };

  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const token = localStorage.getItem('sms_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  };

  // Fetch initial summary & metadata
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [sumRes, staffRes, studRes] = await Promise.all([
        fetch('/api/documents/summary', { headers }),
        fetch('/api/staff', { headers }),
        fetch('/api/students', { headers }),
      ]);
      if (sumRes.ok) setStats(await sumRes.json());
      if (staffRes.ok) {
        const sData = await staffRes.json();
        setStaffList(Array.isArray(sData) ? sData : (sData.staff || []));
      }
      if (studRes.ok) {
        const stData = await studRes.json();
        setStudents(Array.isArray(stData) ? stData : (stData.students || []));
      }

      if (activeTab === 'inward') {
        const res = await fetch(`/api/documents/inward?fiscalYear=${fiscalYearFilter}`, { headers });
        if (res.ok) setInwardList(await res.json());
      } else if (activeTab === 'outward') {
        const res = await fetch(`/api/documents/outward?fiscalYear=${fiscalYearFilter}`, { headers });
        if (res.ok) setOutwardList(await res.json());
      } else if (activeTab === 'templates') {
        const [tplRes, issRes] = await Promise.all([
          fetch('/api/documents/templates', { headers }),
          fetch('/api/documents/issued', { headers }),
        ]);
        if (tplRes.ok) setTemplateList(await tplRes.json());
        if (issRes.ok) setIssuedList(await issRes.json());
      } else if (activeTab === 'archives') {
        const res = await fetch('/api/documents/archives', { headers });
        if (res.ok) setArchiveList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching document data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, fiscalYearFilter]);

  // Handlers
  const handleSaveInward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingInward ? `/api/documents/inward/${editingInward.id}` : '/api/documents/inward';
      const method = editingInward ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(inwardForm),
      });
      if (res.ok) {
        setIsInwardModalOpen(false);
        setEditingInward(null);
        fetchData();
        setInwardForm({
          dartaNo: '',
          fiscalYear: '2082/083',
          registeredDateBs: '2083-01-15',
          senderOrganization: '',
          senderLetterNo: '',
          senderLetterDateBs: '',
          subject: '',
          category: 'GOVERNMENT',
          priority: 'NORMAL',
          status: 'PENDING',
          scannedFileUrl: '',
          receiverStaffId: '',
          remarks: '',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error saving inward record');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOutward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingOutward ? `/api/documents/outward/${editingOutward.id}` : '/api/documents/outward';
      const method = editingOutward ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(outwardForm),
      });
      if (res.ok) {
        setIsOutwardModalOpen(false);
        setEditingOutward(null);
        fetchData();
        setOutwardForm({
          chalaniNo: '',
          fiscalYear: '2082/083',
          dispatchDateBs: '2083-01-15',
          recipientOrganization: '',
          subject: '',
          category: 'RECOMMENDATION',
          dispatchMode: 'HAND_DELIVERY',
          signatoryStaffId: '',
          scannedFileUrl: '',
          remarks: '',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error saving outward record');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/documents/issue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(issueForm),
      });
      if (res.ok) {
        const created = await res.json();
        setIsIssueLetterModalOpen(false);
        setPrintLetterData(created);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Error issuing letter');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate ? `/api/documents/templates/${editingTemplate.id}` : '/api/documents/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(templateForm),
      });
      if (res.ok) {
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        fetchData();
        setTemplateForm({
          code: '',
          titleEn: '',
          titleNp: '',
          category: 'GENERAL',
          templateBodyHtml: '',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error saving template');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingArchive ? `/api/documents/archives/${editingArchive.id}` : '/api/documents/archives';
      const method = editingArchive ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(archiveForm),
      });
      if (res.ok) {
        setIsArchiveModalOpen(false);
        setEditingArchive(null);
        fetchData();
        setArchiveForm({
          title: '',
          category: 'MISCELLANEOUS',
          documentYearBs: 2083,
          fileUrl: '',
          tags: '',
          confidentialityLevel: 'RESTRICTED',
        });
      } else {
        const err = await res.json();
        alert(err.message || 'Error saving archive');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (endpoint: string, id: string) => {
    if (!confirm(isNp ? 'के तपाईं यो अभिलेख मेटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/documents/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-600" />
            {isNp ? 'कागजात तथा दर्ता/चलानी व्यवस्थापन' : 'Document & Darta/Chalani Management'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isNp
              ? 'नेपाल सरकारको कार्यालय कार्यविधि अनुसार दर्ता किताब, चलानी पुस्तिका, सिफारिस र डिजिटल अभिलेखालय'
              : 'Government-standard Inward/Outward registers, official certificates issuance and institutional archive'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'inward' && (
            <button
              data-testid="btn-add-inward"
              onClick={openAddInward}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ दर्ता प्रविष्टि' : 'New Inward Entry'}
            </button>
          )}
          {activeTab === 'outward' && (
            <button
              onClick={openAddOutward}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ चलानी प्रविष्टि' : 'New Outward Entry'}
            </button>
          )}
          {activeTab === 'templates' && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsIssueLetterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
              >
                <FileBadge className="w-4 h-4" />
                {isNp ? 'सिफारिस पत्र जारी' : 'Issue Official Letter'}
              </button>
              <button
                onClick={openAddTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {isNp ? 'नयाँ ढाँचा' : 'New Template'}
              </button>
            </div>
          )}
          {activeTab === 'archives' && (
            <button
              onClick={openAddArchive}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'अभिलेख थप्नुहोस्' : 'Add to Archive'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'कुल दर्ता (Inward)' : 'Total Inward'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.totalInward) : stats.totalInward}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {isNp ? `${toDevanagariDigits(stats.pendingInward)} बाँकी` : `${stats.pendingInward} Pending`}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 rounded-lg">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'कुल चलानी (Outward)' : 'Total Outward'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.totalOutward) : stats.totalOutward}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isNp ? 'आ.व. २०८२/०८३' : 'FY 2082/083'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'जारी सिफारिस पत्र' : 'Issued Letters'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.totalIssued) : stats.totalIssued}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                {isNp ? `${toDevanagariDigits(stats.totalTemplates)} ढाँचाहरू` : `${stats.totalTemplates} Templates`}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{isNp ? 'संस्थागत अभिलेख' : 'Digital Archive'}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isNp ? toDevanagariDigits(stats.totalArchives) : stats.totalArchives}
              </h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                {isNp ? 'स्थायी सुरक्षित फाइल' : 'Secure Vault'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          data-testid="tab-inward"
          onClick={() => setActiveTab('inward')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'inward'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Inbox className="w-4 h-4" />
          {isNp ? 'दर्ता पुस्तिका (Inward)' : 'Inward Register'}
        </button>

        <button
          data-testid="tab-outward"
          onClick={() => setActiveTab('outward')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'outward'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Send className="w-4 h-4" />
          {isNp ? 'चलानी पुस्तिका (Outward)' : 'Outward Register'}
        </button>

        <button
          data-testid="tab-templates"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileBadge className="w-4 h-4" />
          {isNp ? 'सिफारिस तथा आधिकारिक पत्र' : 'Official Recommendations'}
        </button>

        <button
          data-testid="tab-archives"
          onClick={() => setActiveTab('archives')}
          className={`flex items-center gap-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'archives'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Archive className="w-4 h-4" />
          {isNp ? 'डिजिटल अभिलेखालय (Archives)' : 'Institutional Archives'}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. INWARD TAB */}
      {/* ========================================================= */}
      {activeTab === 'inward' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={isNp ? 'विषय, दर्ता नं वा पठाउने खोजी...' : 'Search subject, darta no, sender...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={fiscalYearFilter}
                onChange={(e) => setFiscalYearFilter(e.target.value)}
                className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <option value="2082/083">आ.व. २०८२/०८३</option>
                <option value="2081/082">आ.व. २०८१/०८२</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <option value="ALL">{isNp ? 'सबै स्थिति' : 'All Status'}</option>
                <option value="PENDING">{isNp ? 'कारबाही बाँकी (Pending)' : 'Pending'}</option>
                <option value="IN_PROCESS">{isNp ? 'प्रक्रियामा (In Process)' : 'In Process'}</option>
                <option value="ACTION_TAKEN">{isNp ? 'कारबाही सम्पन्न (Action Taken)' : 'Action Taken'}</option>
                <option value="FILED">{isNp ? 'तामेल/फाइल (Filed)' : 'Filed'}</option>
              </select>
            </div>
          </div>

          {/* Inward Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-3 w-20">{isNp ? 'दर्ता नं' : 'Darta No'}</th>
                  <th className="p-3 w-28">{isNp ? 'दर्ता मिति' : 'Reg. Date'}</th>
                  <th className="p-3">{isNp ? 'पठाउने कार्यालय / व्यक्ति' : 'Sender Organization'}</th>
                  <th className="p-3">{isNp ? 'पत्र संख्या र मिति' : 'Letter No & Date'}</th>
                  <th className="p-3">{isNp ? 'विषय' : 'Subject'}</th>
                  <th className="p-3 w-28">{isNp ? 'प्राथमिकता' : 'Priority'}</th>
                  <th className="p-3 w-32">{isNp ? 'स्थिति' : 'Status'}</th>
                  <th className="p-3 w-20 text-center">{isNp ? 'कार्य' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inwardList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isNp ? 'कुनै दर्ता अभिलेख फेला परेन।' : 'No inward documents recorded.'}
                    </td>
                  </tr>
                ) : (
                  inwardList.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400">
                        {isNp ? toDevanagariDigits(doc.dartaNo) : doc.dartaNo}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {isNp ? toDevanagariDigits(doc.registeredDateBs) : doc.registeredDateBs}
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                        {doc.senderOrganization}
                      </td>
                      <td className="p-3 text-slate-500 text-xs">
                        {doc.senderLetterNo || '-'}
                        {doc.senderLetterDateBs && <span className="block text-slate-400">({isNp ? toDevanagariDigits(doc.senderLetterDateBs) : doc.senderLetterDateBs})</span>}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-200">
                        {doc.subject}
                        {doc.remarks && <p className="text-xs text-slate-400 italic mt-0.5">{doc.remarks}</p>}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          doc.priority === 'VERY_URGENT'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : doc.priority === 'URGENT'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {doc.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1 ${
                          doc.status === 'ACTION_TAKEN'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : doc.status === 'IN_PROCESS'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditInward(doc)}
                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded"
                            title={isNp ? 'दर्ता सम्पादन' : 'Edit Inward'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('inward', doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. OUTWARD TAB */}
      {/* ========================================================= */}
      {activeTab === 'outward' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={isNp ? 'विषय, चलानी नं वा पाउने कार्यालय खोजी...' : 'Search subject, chalani no, recipient...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={fiscalYearFilter}
                onChange={(e) => setFiscalYearFilter(e.target.value)}
                className="text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <option value="2082/083">आ.व. २०८२/०८३</option>
                <option value="2081/082">आ.व. २०८१/०८२</option>
              </select>
            </div>
          </div>

          {/* Outward Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-3 w-20">{isNp ? 'चलानी नं' : 'Chalani No'}</th>
                  <th className="p-3 w-28">{isNp ? 'चलानी मिति' : 'Date'}</th>
                  <th className="p-3">{isNp ? 'पाउने कार्यालय / व्यक्ति' : 'Recipient'}</th>
                  <th className="p-3">{isNp ? 'विषय' : 'Subject'}</th>
                  <th className="p-3 w-28">{isNp ? 'विधा' : 'Category'}</th>
                  <th className="p-3 w-28">{isNp ? 'माध्यम' : 'Dispatch Mode'}</th>
                  <th className="p-3 w-32">{isNp ? 'हस्ताक्षरकर्ता' : 'Signatory'}</th>
                  <th className="p-3 w-20 text-center">{isNp ? 'कार्य' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outwardList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isNp ? 'कुनै चलानी अभिलेख फेला परेन।' : 'No outward documents recorded.'}
                    </td>
                  </tr>
                ) : (
                  outwardList.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-sky-700 dark:text-sky-400">
                        {isNp ? toDevanagariDigits(doc.chalaniNo) : doc.chalaniNo}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {isNp ? toDevanagariDigits(doc.dispatchDateBs) : doc.dispatchDateBs}
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                        {doc.recipientOrganization}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-200">
                        {doc.subject}
                        {doc.remarks && <p className="text-xs text-slate-400 italic mt-0.5">{doc.remarks}</p>}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-600 dark:text-slate-300">
                          {doc.category}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {doc.dispatchMode}
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                        {doc.signatoryStaffName || '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditOutward(doc)}
                            className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded"
                            title={isNp ? 'चलानी सम्पादन' : 'Edit Outward'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('outward', doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TEMPLATES & ISSUED LETTERS TAB */}
      {/* ========================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Templates list */}
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {isNp ? 'उपलब्ध सिफारिस ढाँचाहरू' : 'Available Letter Templates'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templateList.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-indigo-400 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono font-medium rounded">
                        {tpl.code}
                      </span>
                      <span className="text-xs text-slate-400">{tpl.category}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-2">
                      {isNp ? tpl.titleNp : tpl.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{tpl.titleEn}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditTemplate(tpl)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                        title={isNp ? 'ढाँचा सम्पादन' : 'Edit Template'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('templates', tpl.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                        title={isNp ? 'ढाँचा मेटाउनुहोस्' : 'Delete Template'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setIssueForm((prev) => ({ ...prev, templateId: tpl.id }));
                        setIsIssueLetterModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-md transition-colors"
                    >
                      {isNp ? 'यो ढाँचामा पत्र जारी गर्नुहोस्' : 'Issue Using Template'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issued Letters History */}
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              {isNp ? 'जारी गरिएका आधिकारिक पत्रहरूको अभिलेख' : 'Issued Official Letters History'}
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    <th className="p-3 w-32">{isNp ? 'पत्र संख्या' : 'Letter No'}</th>
                    <th className="p-3 w-28">{isNp ? 'जारी मिति' : 'Issue Date'}</th>
                    <th className="p-3">{isNp ? 'पत्रको प्रकार' : 'Template'}</th>
                    <th className="p-3">{isNp ? 'प्रापक / विद्यार्थी' : 'Recipient Name'}</th>
                    <th className="p-3 w-36">{isNp ? 'हस्ताक्षरकर्ता' : 'Signatory'}</th>
                    <th className="p-3 w-24 text-center">{isNp ? 'प्रिन्ट' : 'Print'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {issuedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        {isNp ? 'अहिलेसम्म कुनै पत्र जारी गरिएको छैन।' : 'No letters issued yet.'}
                      </td>
                    </tr>
                  ) : (
                    issuedList.map((letItem) => (
                      <tr key={letItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-medium text-indigo-700 dark:text-indigo-400">
                          {letItem.letterNo}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {isNp ? toDevanagariDigits(letItem.issueDateBs) : letItem.issueDateBs}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                          {letItem.templateTitle || 'आधिकारिक पत्र'}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {letItem.targetName}
                          <span className="block text-xs text-slate-400">{letItem.targetType}</span>
                        </td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                          {letItem.signatoryStaffName || '-'}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setPrintLetterData(letItem)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded"
                              title={isNp ? 'प्रिन्ट / हेर्नुहोस्' : 'View / Print'}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('issued', letItem.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                              title={isNp ? 'मेटाउनुहोस्' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. INSTITUTIONAL ARCHIVES TAB */}
      {/* ========================================================= */}
      {activeTab === 'archives' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {archiveList.map((arch) => (
              <div
                key={arch.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 rounded font-medium">
                      {arch.category}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {arch.confidentialityLevel}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-2 line-clamp-2">
                    {arch.title}
                  </h3>
                  {arch.documentYearBs && (
                    <p className="text-xs text-slate-500 mt-1">
                      {isNp ? `अभिलेख वर्ष: २०${toDevanagariDigits(arch.documentYearBs % 100)} साल` : `Year BS: ${arch.documentYearBs}`}
                    </p>
                  )}
                  {arch.tags && arch.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {arch.tags.map((t, idx) => (
                        <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">{arch.fileType || 'PDF'}</span>
                  <div className="flex gap-2">
                    <a
                      href={arch.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded flex items-center gap-1 text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isNp ? 'खोल्नुहोस्' : 'View'}
                    </a>
                    <button
                      onClick={() => openEditArchive(arch)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded"
                      title={isNp ? 'अभिलेख सम्पादन' : 'Edit Archive'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete('archives', arch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title={isNp ? 'मेटाउनुहोस्' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NEW INWARD ENTRY */}
      {/* ========================================================= */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-emerald-600" />
                {editingInward
                  ? (isNp ? 'दर्ता विवरण सम्पादन' : 'Edit Inward Registration')
                  : (isNp ? 'नयाँ दर्ता प्रविष्टि' : 'New Inward Registration')}
              </h3>
              <button onClick={() => setIsInwardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInward} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'दर्ता नं (खाली राखे स्वतः गणना)' : 'Darta No (Auto if empty)'}
                  </label>
                  <input
                    type="number"
                    value={inwardForm.dartaNo}
                    onChange={(e) => setInwardForm({ ...inwardForm, dartaNo: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'दर्ता मिति (वि.सं.)' : 'Registered Date (BS)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={inwardForm.registeredDateBs}
                    onChange={(e) => setInwardForm({ ...inwardForm, registeredDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पठाउने कार्यालय वा संस्थाको नाम' : 'Sender Organization / Sender Name'} *
                </label>
                <input
                  data-testid="inward-sender-input"
                  type="text"
                  required
                  value={inwardForm.senderOrganization}
                  onChange={(e) => setInwardForm({ ...inwardForm, senderOrganization: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: शिक्षा तथा मानव स्रोत विकास केन्द्र / टोखा नगरपालिका"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पठाउनेको पत्र संख्या' : 'Sender Letter Number'}
                  </label>
                  <input
                    type="text"
                    value={inwardForm.senderLetterNo}
                    onChange={(e) => setInwardForm({ ...inwardForm, senderLetterNo: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="उदा: ०८२/०८३-२४५"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'पत्रको मिति (वि.सं.)' : 'Sender Letter Date (BS)'}
                  </label>
                  <input
                    type="text"
                    value={inwardForm.senderLetterDateBs}
                    onChange={(e) => setInwardForm({ ...inwardForm, senderLetterDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पत्रको विषय' : 'Subject'} *
                </label>
                <textarea
                  data-testid="inward-subject-input"
                  required
                  rows={2}
                  value={inwardForm.subject}
                  onChange={(e) => setInwardForm({ ...inwardForm, subject: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="पत्रमा उल्लेख भएको मूल विषय..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'विधा' : 'Category'}
                  </label>
                  <select
                    value={inwardForm.category}
                    onChange={(e) => setInwardForm({ ...inwardForm, category: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="GOVERNMENT">सरकारी निकाय</option>
                    <option value="MUNICIPALITY">स्थानीय तह (पालिका)</option>
                    <option value="PARENT">अभिभावक</option>
                    <option value="COMMUNITY">समुदाय / संघसंस्था</option>
                    <option value="CIRCULAR">परिपत्र / निर्देशन</option>
                    <option value="OTHER">अन्य</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'प्राथमिकता' : 'Priority'}
                  </label>
                  <select
                    value={inwardForm.priority}
                    onChange={(e) => setInwardForm({ ...inwardForm, priority: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="NORMAL">साधारण (Normal)</option>
                    <option value="URGENT">जरुरी (Urgent)</option>
                    <option value="VERY_URGENT">अति जरुरी (Very Urgent)</option>
                    <option value="CONFIDENTIAL">गोप्य (Confidential)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'स्थिति' : 'Status'}
                  </label>
                  <select
                    value={inwardForm.status}
                    onChange={(e) => setInwardForm({ ...inwardForm, status: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="PENDING">कारबाही बाँकी</option>
                    <option value="IN_PROCESS">प्रक्रियामा</option>
                    <option value="ACTION_TAKEN">कारबाही सम्पन्न</option>
                    <option value="FILED">फाइल तामेल</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'फाँटवाला / जिम्मेवार कर्मचारी' : 'Receiving / Handling Staff'}
                </label>
                <select
                  value={inwardForm.receiverStaffId}
                  onChange={(e) => setInwardForm({ ...inwardForm, receiverStaffId: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">-- छनोट गर्नुहोस् --</option>
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id}>
                      {stf.fullName} {stf.designation ? `(${stf.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कैफियत' : 'Remarks'}
                </label>
                <input
                  type="text"
                  value={inwardForm.remarks}
                  onChange={(e) => setInwardForm({ ...inwardForm, remarks: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="कुनै थप विवरण भएमा..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  data-testid="inward-submit-btn"
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                >
                  {editingInward
                    ? (isNp ? 'अद्यावधिक गर्नुहोस्' : 'Update Record')
                    : (isNp ? 'दर्ता सुरक्षित गर्नुहोस्' : 'Save Registration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NEW OUTWARD ENTRY */}
      {/* ========================================================= */}
      {isOutwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-600" />
                {editingOutward
                  ? (isNp ? 'चलानी विवरण सम्पादन' : 'Edit Outward Entry')
                  : (isNp ? 'नयाँ चलानी प्रविष्टि' : 'New Outward Registration')}
              </h3>
              <button onClick={() => setIsOutwardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutward} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'चलानी नं (खाली राखे स्वतः गणना)' : 'Chalani No (Auto if empty)'}
                  </label>
                  <input
                    type="number"
                    value={outwardForm.chalaniNo}
                    onChange={(e) => setOutwardForm({ ...outwardForm, chalaniNo: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'चलानी मिति (वि.सं.)' : 'Dispatch Date (BS)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={outwardForm.dispatchDateBs}
                    onChange={(e) => setOutwardForm({ ...outwardForm, dispatchDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पत्र पाउने कार्यालय वा व्यक्तिको नाम' : 'Recipient Organization / Person'} *
                </label>
                <input
                  type="text"
                  required
                  value={outwardForm.recipientOrganization}
                  onChange={(e) => setOutwardForm({ ...outwardForm, recipientOrganization: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: शिक्षा विकास तथा समन्वय इकाई, काठमाडौं"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पत्रको विषय' : 'Subject'} *
                </label>
                <textarea
                  required
                  rows={2}
                  value={outwardForm.subject}
                  onChange={(e) => setOutwardForm({ ...outwardForm, subject: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="चलानी गरिएको पत्रको विषय..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'विधा' : 'Category'}
                  </label>
                  <select
                    value={outwardForm.category}
                    onChange={(e) => setOutwardForm({ ...outwardForm, category: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="RECOMMENDATION">सिफारिस (Recommendation)</option>
                    <option value="REPORT">प्रतिवेदन (Report)</option>
                    <option value="REQUEST">माग / अनुरोध (Request)</option>
                    <option value="RESPONSE">जवाफ / प्रत्युत्तर (Response)</option>
                    <option value="NOTICE">सूचना (Notice)</option>
                    <option value="OTHER">अन्य</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'प्रेषण माध्यम' : 'Dispatch Mode'}
                  </label>
                  <select
                    value={outwardForm.dispatchMode}
                    onChange={(e) => setOutwardForm({ ...outwardForm, dispatchMode: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="HAND_DELIVERY">दस्तखत/हातै (Hand Delivery)</option>
                    <option value="EMAIL">ईमेल (Email)</option>
                    <option value="POST">हुलाक (Postal Mail)</option>
                    <option value="COURIER">कुरियर (Courier)</option>
                    <option value="PORTAL">अनलाइन पोर्टल (Portal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'हस्ताक्षरकर्ता कर्मचारी' : 'Signatory Staff'}
                </label>
                <select
                  value={outwardForm.signatoryStaffId}
                  onChange={(e) => setOutwardForm({ ...outwardForm, signatoryStaffId: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">-- छनोट गर्नुहोस् --</option>
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id}>
                      {stf.fullName} {stf.designation ? `(${stf.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOutwardModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-md font-semibold"
                >
                  {editingOutward
                    ? (isNp ? 'अद्यावधिक गर्नुहोस्' : 'Update Record')
                    : (isNp ? 'चलानी सुरक्षित गर्नुहोस्' : 'Save Chalani')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ISSUE OFFICIAL LETTER */}
      {/* ========================================================= */}
      {isIssueLetterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-indigo-600" />
                {isNp ? 'आधिकारिक सिफारिस पत्र जारी' : 'Issue Official Recommendation'}
              </h3>
              <button onClick={() => setIsIssueLetterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueLetter} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पत्रको ढाँचा (Template)' : 'Letter Template'} *
                </label>
                <select
                  required
                  value={issueForm.templateId}
                  onChange={(e) => setIssueForm({ ...issueForm, templateId: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">-- ढाँचा छनोट गर्नुहोस् --</option>
                  {templateList.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.code} - {isNp ? tpl.titleNp : tpl.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'लक्षित समूह' : 'Target Type'}
                  </label>
                  <select
                    value={issueForm.targetType}
                    onChange={(e) => setIssueForm({ ...issueForm, targetType: e.target.value, targetId: '', targetName: '' })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="STUDENT">विद्यार्थी (Student)</option>
                    <option value="STAFF">शिक्षक / कर्मचारी (Staff)</option>
                    <option value="GENERAL">सामान्य नागरिक (General Citizen)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'जारी मिति (वि.सं.)' : 'Issue Date (BS)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={issueForm.issueDateBs}
                    onChange={(e) => setIssueForm({ ...issueForm, issueDateBs: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              {issueForm.targetType === 'STUDENT' && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'विद्यार्थी छनोट गर्नुहोस्' : 'Select Student'}
                  </label>
                  <select
                    value={issueForm.targetId}
                    onChange={(e) => {
                      const st = students.find((s) => s.id === e.target.value);
                      setIssueForm({
                        ...issueForm,
                        targetId: e.target.value,
                        targetName: st ? (st.firstNameNp ? `${st.firstNameNp} ${st.lastNameNp || ''}`.trim() : `${st.firstNameEn} ${st.lastNameEn || ''}`.trim()) : '',
                      });
                    }}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">-- विद्यार्थी छनोट --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.admissionNo ? `[${st.admissionNo}] ` : ''}
                        {st.firstNameNp || st.firstNameEn} {st.lastNameNp || st.lastNameEn || ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {issueForm.targetType === 'STAFF' && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'कर्मचारी छनोट गर्नुहोस्' : 'Select Staff'}
                  </label>
                  <select
                    value={issueForm.targetId}
                    onChange={(e) => {
                      const stf = staffList.find((s) => s.id === e.target.value);
                      setIssueForm({
                        ...issueForm,
                        targetId: e.target.value,
                        targetName: stf ? stf.fullName : '',
                      });
                    }}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="">-- कर्मचारी छनोट --</option>
                    {staffList.map((stf) => (
                      <option key={stf.id} value={stf.id}>
                        {stf.fullName} {stf.designation ? `(${stf.designation})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {issueForm.targetType === 'GENERAL' && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'व्यक्ति वा संस्थाको नाम' : 'Person or Organization Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={issueForm.targetName}
                    onChange={(e) => setIssueForm({ ...issueForm, targetName: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="नाम प्रविष्टि गर्नुहोस्"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'हस्ताक्षरकर्ता' : 'Signatory Staff'}
                </label>
                <select
                  value={issueForm.signatoryStaffId}
                  onChange={(e) => setIssueForm({ ...issueForm, signatoryStaffId: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">-- छनोट गर्नुहोस् (प्रधानाध्यापक) --</option>
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id}>
                      {stf.fullName} {stf.designation ? `(${stf.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoChalani"
                  checked={issueForm.autoRegisterChalani}
                  onChange={(e) => setIssueForm({ ...issueForm, autoRegisterChalani: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="autoChalani" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  {isNp ? 'यो पत्रलाई चलानी पुस्तिकामा स्वतः प्रविष्टि गर्ने' : 'Auto-register in Chalani book upon issuance'}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIssueLetterModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold"
                >
                  {isNp ? 'पत्र जारी गर्नुहोस्' : 'Generate & Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD TEMPLATE */}
      {/* ========================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingTemplate
                  ? (isNp ? 'सिफारिस ढाँचा सम्पादन' : 'Edit Recommendation Template')
                  : (isNp ? 'नयाँ सिफारिस पत्र ढाँचा सिर्जना' : 'Create New Letter Template')}
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'ढाँचा कोड' : 'Template Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 font-mono"
                    placeholder="उदा: BONAFIDE"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'विधा' : 'Category'}
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="GENERAL">सामान्य (General)</option>
                    <option value="STUDENT_BONAFIDE">अध्ययनरत (Bonafide)</option>
                    <option value="SCHOLARSHIP">छात्रवृत्ति (Scholarship)</option>
                    <option value="STAFF_EXPERIENCE">शिक्षक अनुभव (Experience)</option>
                    <option value="CHARACTER">चारित्रिक (Character)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'शीर्षक (नेपाली)' : 'Title (Nepali)'} *
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.titleNp}
                  onChange={(e) => setTemplateForm({ ...templateForm, titleNp: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: अध्ययनरत प्रमाणपत्र"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'शीर्षक (अङ्ग्रेजी)' : 'Title (English)'} *
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.titleEn}
                  onChange={(e) => setTemplateForm({ ...templateForm, titleEn: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. Student Bonafide Certificate"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'पत्रको मुख्य व्यहोरा (HTML/Text)' : 'Template Body (HTML)'} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={templateForm.templateBodyHtml}
                  onChange={(e) => setTemplateForm({ ...templateForm, templateBodyHtml: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 font-mono text-xs"
                  placeholder="<p>प्रमाणित गरिन्छ कि विद्यार्थी {{studentName}} कक्षा {{class}} मा अध्ययनरत हुनुहुन्छ।</p>"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  उपलब्ध टोकनहरू: <code>{'{{studentName}}'}</code>, <code>{'{{class}}'}</code>, <code>{'{{section}}'}</code>, <code>{'{{dobBs}}'}</code>, <code>{'{{admissionNo}}'}</code>, <code>{'{{date}}'}</code>, <code>{'{{staffName}}'}</code>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-slate-800 hover:bg-slate-900 text-white rounded-md font-semibold"
                >
                  {editingTemplate
                    ? (isNp ? 'अद्यावधिक गर्नुहोस्' : 'Update Template')
                    : (isNp ? 'ढाँचा सुरक्षित गर्नुहोस्' : 'Save Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD ARCHIVE DOCUMENT */}
      {/* ========================================================= */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Archive className="w-5 h-5 text-purple-600" />
                {editingArchive
                  ? (isNp ? 'अभिलेख सम्पादन' : 'Edit Archived Document')
                  : (isNp ? 'संस्थागत डिजिटल अभिलेखालयमा कागजात थप्नुहोस्' : 'Add to Institutional Archive')}
              </h3>
              <button onClick={() => setIsArchiveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArchive} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कागजातको नाम / शीर्षक' : 'Document Title'} *
                </label>
                <input
                  type="text"
                  required
                  value={archiveForm.title}
                  onChange={(e) => setArchiveForm({ ...archiveForm, title: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="उदा: विद्यालय जग्गाधनी प्रमाणपुर्जा (कित्ता नं. १२४)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'अभिलेख विधा' : 'Category'}
                  </label>
                  <select
                    value={archiveForm.category}
                    onChange={(e) => setArchiveForm({ ...archiveForm, category: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="LAND_OWNERSHIP">जग्गाधनी प्रमाणपुर्जा (Lalpurja)</option>
                    <option value="BUILDING_MAP">भवन नक्सा तथा स्वीकृति (Building Map)</option>
                    <option value="SMC_MINUTES">वि.व्य.स. बैठक निर्णय (SMC Minutes)</option>
                    <option value="PTA_MINUTES">शिक्षक-अभिभावक बैठक (PTA Minutes)</option>
                    <option value="AUDIT_REPORT">लेखापरीक्षण प्रतिवेदन (Audit Report)</option>
                    <option value="POLICIES">नीति तथा नियमावली (Policies)</option>
                    <option value="MISCELLANEOUS">विविध (Miscellaneous)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'कागजात मिति / वर्ष (वि.सं.)' : 'Document Year (BS)'}
                  </label>
                  <input
                    type="number"
                    value={archiveForm.documentYearBs}
                    onChange={(e) => setArchiveForm({ ...archiveForm, documentYearBs: Number(e.target.value) })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="2083"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isNp ? 'कागजात लिङ्क वा फाइल मार्ग (File URL/Path)' : 'File URL or Cloud Path'} *
                </label>
                <input
                  type="text"
                  required
                  value={archiveForm.fileUrl}
                  onChange={(e) => setArchiveForm({ ...archiveForm, fileUrl: e.target.value })}
                  className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  placeholder="/uploads/documents/sample.pdf"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'ट्यागहरू (अल्पविरामले छुट्याउनुहोस्)' : 'Tags (comma separated)'}
                  </label>
                  <input
                    type="text"
                    value={archiveForm.tags}
                    onChange={(e) => setArchiveForm({ ...archiveForm, tags: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    placeholder="जग्गा, सम्पत्ति, पुर्जा"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isNp ? 'गोपनीयता स्तर' : 'Confidentiality'}
                  </label>
                  <select
                    value={archiveForm.confidentialityLevel}
                    onChange={(e) => setArchiveForm({ ...archiveForm, confidentialityLevel: e.target.value })}
                    className="w-full text-sm mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="PUBLIC">सार्वजनिक (Public)</option>
                    <option value="RESTRICTED">गोप्य (Restricted)</option>
                    <option value="HIGHLY_CONFIDENTIAL">अति गोप्य (Highly Confidential)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold"
                >
                  {editingArchive
                    ? (isNp ? 'अद्यावधिक गर्नुहोस्' : 'Update Document')
                    : (isNp ? 'अभिलेख सुरक्षित गर्नुहोस्' : 'Save Archive')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRINT OFFICIAL LETTER VIEW */}
      {/* ========================================================= */}
      {printLetterData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                {isNp ? 'आधिकारिक पत्र पूर्वावलोकन' : 'Official Letter Preview'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isNp ? 'प्रिन्ट गर्नुहोस्' : 'Print'}
                </button>
                <button onClick={() => setPrintLetterData(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Letterhead */}
            <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
              <p className="text-xs text-slate-600 font-semibold">{school?.province || 'बागमती प्रदेश'}</p>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                {isNp ? (school?.nameNp || 'श्री शान्ति माध्यमिक विद्यालय') : (school?.nameEn || 'Shree Shanti Secondary School')}
              </h2>
              <p className="text-xs text-slate-600">
                {isNp ? (school?.addressNp || 'टोखा-०४, काठमाडौं') : (school?.addressEn || 'Tokha-04, Kathmandu')} | IEMIS: {school?.iemisCode || '270010001'}
              </p>
            </div>

            {/* Letter Reference Bar */}
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <div>
                <p>पत्र संख्या: ०८२/०८३</p>
                <p>चलानी / पत्र नं: <span className="font-mono font-bold text-slate-950">{printLetterData.letterNo}</span></p>
              </div>
              <div className="text-right">
                <p>मिति: <span className="font-semibold">{isNp ? toDevanagariDigits(printLetterData.issueDateBs) : printLetterData.issueDateBs} वि.सं.</span></p>
              </div>
            </div>

            {/* Subject */}
            <div className="text-center py-2">
              <h4 className="text-base font-bold underline decoration-slate-400 underline-offset-4">
                विषय: {printLetterData.templateTitle || 'सिफारिस सम्बन्धमा'}
              </h4>
            </div>

            {/* Body */}
            <div
              className="text-sm leading-relaxed text-slate-800 space-y-3 py-2"
              dangerouslySetInnerHTML={{ __html: printLetterData.generatedContentHtml }}
            />

            {/* Footer / Signature */}
            <div className="pt-12 flex justify-between items-end text-xs">
              <div className="border border-dashed border-slate-300 p-2 rounded text-center text-slate-400 w-28">
                कार्यालयको छाप<br />(Official Seal)
              </div>
              <div className="text-center space-y-1">
                <div className="w-40 border-b border-slate-800 pb-1 font-semibold text-slate-900">
                  {printLetterData.signatoryStaffName || ((school as any)?.principalNameEn || 'प्रधानाध्यापक')}
                </div>
                <p className="text-[11px] text-slate-600">प्रधानाध्यापक / अधिकारप्राप्त अधिकारी</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
