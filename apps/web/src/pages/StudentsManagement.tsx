import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  Printer,
  X,
  Shield,
  Activity,
  AlertTriangle,
  Stethoscope,
  Building,
  BookOpen,
  FileSpreadsheet,
  UploadCloud,
  Download,
  FileCheck2,
  Edit,
  Trash2,
  Lock,
  Camera,
} from 'lucide-react';
import { downloadIemisTemplate, parseIemisExcel, IemisStudentRow, ParseResult } from '../utils/iemisExcel';

export const StudentsManagement: React.FC = () => {
  const { language, t, formatNumber } = useLanguage();
  const { hasRole } = useAuth();
  const isPrincipalOrAdmin = hasRole('PRINCIPAL') || hasRole('SYSTEM_ADMIN');

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [selectedInclusion, setSelectedInclusion] = useState('');

  // Modals
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitTab, setAdmitTab] = useState<'identity' | 'academic' | 'address' | 'inclusion' | 'health' | 'guardians'>('identity');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<any | null>(null);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);

  // Bulk Import Excel state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importParseResult, setImportParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResultSummary, setImportResultSummary] = useState<any | null>(null);
  const [importFilterTab, setImportFilterTab] = useState<'ALL' | 'VALID' | 'DUPLICATE' | 'INVALID'>('ALL');

  // Bulk promote state
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [promoteList, setPromoteList] = useState<any[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);

  // Edit & Delete Student state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editTab, setEditTab] = useState<'basic' | 'placement' | 'guardians' | 'address' | 'health'>('basic');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admit form state
  const [admitForm, setAdmitForm] = useState({
    firstNameEn: '',
    middleNameEn: '',
    lastNameEn: '',
    firstNameNp: '',
    middleNameNp: '',
    lastNameNp: '',
    dobBs: '2072-01-01',
    dobAd: '2015-04-14',
    gender: 'MALE',
    bloodGroup: 'B+',
    motherTongue: 'Nepali',
    nationality: 'Nepali',
    ethnicityInclusion: 'BRAHMIN_CHHETRI',
    disabilityStatus: 'NONE',
    scholarshipEligible: false,
    houseId: '',
    photoUrl: '',
    iemisCode: '',

    currentClassId: '',
    currentSectionId: '',
    currentRollNumber: 1,
    optionalSubject1Id: '',
    optionalSubject2Id: '',

    permProvince: 'Bagmati Province',
    permDistrict: 'Kathmandu',
    permLocalLevel: 'Tokha Municipality',
    permWardNumber: 4,
    permTole: 'Chandeshwori',

    currProvince: 'Bagmati Province',
    currDistrict: 'Kathmandu',
    currLocalLevel: 'Tokha Municipality',
    currWardNumber: 4,
    currTole: 'Chandeshwori',

    // Medical & Health Information
    allergies: 'None',
    chronicConditions: 'None',
    regularMedications: 'None',
    physicalAccommodations: 'None',
    emergencyContactName: '',
    emergencyContactPhone: '',
    preferredHospital: 'Tokha Primary Health Post',
    immunizationStatus: 'COMPLETE',
    medicalNotes: '',

    // Guardians
    fatherNameEn: '',
    fatherNameNp: '',
    fatherPhone: '',
    fatherOccupation: 'Business',
    motherNameEn: '',
    motherNameNp: '',
    motherPhone: '',
    motherOccupation: 'Homemaker',
  });

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [cRes, sRes, hRes, yRes, stRes, subRes] = await Promise.all([
        fetch('/api/academic/classes', { headers }),
        fetch('/api/academic/sections', { headers }),
        fetch('/api/academic/houses', { headers }),
        fetch('/api/academic/years', { headers }),
        fetch('/api/students', { headers }),
        fetch('/api/academic/subjects', { headers }),
      ]);

      if (cRes.ok && sRes.ok && hRes.ok && yRes.ok && stRes.ok && subRes.ok) {
        const cData = await cRes.json();
        const sData = await sRes.json();
        const hData = await hRes.json();
        const yData = await yRes.json();
        const stData = await stRes.json();
        const subData = await subRes.json();

        setClasses(cData.classes || []);
        setSections(sData.sections || []);
        setHouses(hData.houses || []);
        setYears(yData.academicYears || []);
        setStudents(stData.students || []);
        setSubjects(subData.subjects || []);

        if (cData.classes?.length > 0) {
          const firstClsId = cData.classes[0].id;
          setAdmitForm((prev) => ({
            ...prev,
            currentClassId: firstClsId,
            currentSectionId: sData.sections?.find((s: any) => s.classId === firstClsId)?.id || '',
          }));
          setSourceClassId(firstClsId);
        }
      }
    } catch (err) {
      console.error('Failed to load initial student data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (selectedClassId) params.append('classId', selectedClassId);
      if (selectedSectionId) params.append('sectionId', selectedSectionId);
      if (selectedGender) params.append('gender', selectedGender);
      if (selectedBloodGroup) params.append('bloodGroup', selectedBloodGroup);
      if (selectedInclusion) params.append('inclusion', selectedInclusion);

      const res = await fetch(`/api/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, selectedClassId, selectedSectionId, selectedGender, selectedBloodGroup, selectedInclusion]);

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const payload = {
        firstNameEn: admitForm.firstNameEn,
        middleNameEn: admitForm.middleNameEn,
        lastNameEn: admitForm.lastNameEn,
        firstNameNp: admitForm.firstNameNp,
        middleNameNp: admitForm.middleNameNp,
        lastNameNp: admitForm.lastNameNp,
        dobBs: admitForm.dobBs,
        dobAd: admitForm.dobAd,
        gender: admitForm.gender,
        bloodGroup: admitForm.bloodGroup,
        motherTongue: admitForm.motherTongue,
        nationality: admitForm.nationality,
        ethnicityInclusion: admitForm.ethnicityInclusion,
        disabilityStatus: admitForm.disabilityStatus,
        scholarshipEligible: admitForm.scholarshipEligible,
        houseId: admitForm.houseId || null,
        photoUrl: admitForm.photoUrl || null,
        iemisCode: admitForm.iemisCode || null,

        currentClassId: admitForm.currentClassId,
        currentSectionId: admitForm.currentSectionId || null,
        currentRollNumber: Number(admitForm.currentRollNumber) || 1,
        optionalSubject1Id: admitForm.optionalSubject1Id || null,
        optionalSubject2Id: admitForm.optionalSubject2Id || null,

        permProvince: admitForm.permProvince,
        permDistrict: admitForm.permDistrict,
        permLocalLevel: admitForm.permLocalLevel,
        permWardNumber: Number(admitForm.permWardNumber),
        permTole: admitForm.permTole,

        currProvince: admitForm.currProvince,
        currDistrict: admitForm.currDistrict,
        currLocalLevel: admitForm.currLocalLevel,
        currWardNumber: Number(admitForm.currWardNumber),
        currTole: admitForm.currTole,

        healthInfo: {
          bloodGroup: admitForm.bloodGroup,
          allergies: admitForm.allergies,
          chronicConditions: admitForm.chronicConditions,
          regularMedications: admitForm.regularMedications,
          physicalAccommodations: admitForm.physicalAccommodations,
          emergencyContactName: admitForm.emergencyContactName || admitForm.fatherNameEn,
          emergencyContactPhone: admitForm.emergencyContactPhone || admitForm.fatherPhone,
          preferredHospital: admitForm.preferredHospital,
          immunizationStatus: admitForm.immunizationStatus,
          medicalNotes: admitForm.medicalNotes,
        },

        guardians: [
          {
            relationship: 'FATHER',
            fullNameEn: admitForm.fatherNameEn,
            fullNameNp: admitForm.fatherNameNp || admitForm.fatherNameEn,
            phone: admitForm.fatherPhone,
            occupation: admitForm.fatherOccupation,
            isPrimaryContact: true,
          },
          ...(admitForm.motherNameEn
            ? [
                {
                  relationship: 'MOTHER',
                  fullNameEn: admitForm.motherNameEn,
                  fullNameNp: admitForm.motherNameNp || admitForm.motherNameEn,
                  phone: admitForm.motherPhone || admitForm.fatherPhone,
                  occupation: admitForm.motherOccupation,
                  isPrimaryContact: false,
                },
              ]
            : []),
        ],
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to admit student');
      }

      const resData = await res.json();
      setMsg({ type: 'success', text: `Student admitted successfully with ID: ${resData.studentId}` });
      setShowAdmitModal(false);
      fetchStudents();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDossier = async (studentId: string) => {
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedStudentForDossier(data.student);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadPhotoForDossier = async (file: File) => {
    if (!selectedStudentForDossier) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const token = localStorage.getItem('sms_token');
        const res = await fetch(`/api/students/${selectedStudentForDossier.id}/photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ photoUrl: base64 }),
        });
        if (res.ok) {
          setSelectedStudentForDossier((prev: any) => ({ ...prev, photoUrl: base64 }));
          fetchStudents();
        }
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEditModal = async (studentId: string) => {
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load student details for editing');
      }
      const { student } = await res.json();
      setEditingStudent(student);

      const father = student.guardians?.find((g: any) => g.relationship === 'FATHER');
      const mother = student.guardians?.find((g: any) => g.relationship === 'MOTHER');

      setEditForm({
        id: student.id,
        studentId: student.studentId,
        iemisCode: student.iemisCode || '',
        firstNameEn: student.firstNameEn || '',
        middleNameEn: student.middleNameEn || '',
        lastNameEn: student.lastNameEn || '',
        firstNameNp: student.firstNameNp || '',
        middleNameNp: student.middleNameNp || '',
        lastNameNp: student.lastNameNp || '',
        dobBs: student.dobBs || '',
        dobAd: student.dobAd || '',
        gender: student.gender || 'MALE',
        bloodGroup: student.bloodGroup || 'UNKNOWN',
        ethnicityInclusion: student.ethnicityInclusion || 'GENERAL',
        disabilityStatus: student.disabilityStatus || 'None',
        scholarshipEligible: student.scholarshipEligible || false,
        currentClassId: student.currentClassId || '',
        currentSectionId: student.currentSectionId || '',
        currentRollNumber: student.currentRollNumber || '',
        houseId: student.houseId || '',
        photoUrl: student.photoUrl || '',
        optionalSubject1Id: student.optionalSubject1Id || '',
        optionalSubject2Id: student.optionalSubject2Id || '',
        // Address
        permProvince: student.permProvince || 'Madhesh Province',
        permDistrict: student.permDistrict || 'Dhanusha',
        permLocalLevel: student.permLocalLevel || 'Nagarain',
        permWardNumber: student.permWardNumber || 1,
        permTole: student.permTole || '',
        currProvince: student.currProvince || '',
        currDistrict: student.currDistrict || '',
        currLocalLevel: student.currLocalLevel || '',
        currWardNumber: student.currWardNumber || '',
        currTole: student.currTole || '',
        // Guardians
        fatherNameEn: father?.fullNameEn || student.guardianName || '',
        fatherPhone: father?.phone || student.guardianPhone || '',
        fatherOccupation: father?.occupation || 'Agriculture',
        motherNameEn: mother?.fullNameEn || '',
        motherPhone: mother?.phone || '',
        motherOccupation: mother?.occupation || 'Homemaker',
        // Health
        allergies: student.healthRecord?.allergies || 'None',
        chronicConditions: student.healthRecord?.chronicConditions || 'None',
        regularMedications: student.healthRecord?.regularMedications || 'None',
        preferredHospital: student.healthRecord?.preferredHospital || '',
        emergencyContactName: student.healthRecord?.emergencyContactName || '',
        emergencyContactPhone: student.healthRecord?.emergencyContactPhone || '',
      });
      setEditTab('basic');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to update student profile');
      }
      setMsg({
        type: 'success',
        text: `Student "${editForm.firstNameEn} ${editForm.lastNameEn}" updated successfully.`,
      });
      setEditingStudent(null);
      fetchStudents();
      if (selectedStudentForDossier?.id === editingStudent.id) {
        handleOpenDossier(editingStudent.id);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to delete student');
      }
      setMsg({
        type: 'success',
        text: `Student "${studentToDelete.firstNameEn} ${studentToDelete.lastNameEn}" (${studentToDelete.studentId}) was deleted successfully.`,
      });
      setStudentToDelete(null);
      if (selectedStudentForDossier?.id === studentToDelete.id) {
        setSelectedStudentForDossier(null);
      }
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Prepare promotion list when source class changes
  const handleOpenBulkPromote = () => {
    const classStudents = students.filter((s) => s.currentClassId === sourceClassId);
    setPromoteList(
      classStudents.map((s, idx) => ({
        studentId: s.id,
        name: `${s.firstNameEn} ${s.lastNameEn}`,
        studentIdCode: s.studentId,
        status: 'PROMOTED',
        rollNumber: idx + 1,
        remarks: 'Satisfactory academic and attendance progress',
      }))
    );
    setShowBulkPromoteModal(true);
  };

  const handleExecutePromotion = async () => {
    if (!targetClassId) {
      alert('Please select a target class');
      return;
    }
    const currentActiveYear = years.find((y) => y.isCurrent) || years[0];
    if (!currentActiveYear) return;

    setIsPromoting(true);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/students/bulk-promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetAcademicYearId: currentActiveYear.id,
          targetClassId,
          targetSectionId: targetSectionId || undefined,
          promotions: promoteList,
        }),
      });

      if (!res.ok) {
        throw new Error('Promotion execution failed');
      }

      const d = await res.json();
      setMsg({ type: 'success', text: d.message });
      setShowBulkPromoteModal(false);
      fetchStudents();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setIsPromoting(false);
    }
  };

  // Bulk Import Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setIsParsing(true);
    setImportResultSummary(null);
    try {
      const result = await parseIemisExcel(file, students);
      setImportParseResult(result);
    } catch (err: any) {
      alert(`Failed to parse Excel file: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!importParseResult || importParseResult.validCount === 0) {
      alert('No valid student records found to import.');
      return;
    }
    setIsImporting(true);
    try {
      const token = localStorage.getItem('sms_token');
      const validStudents = importParseResult.rows.filter((r) => r.isValid);
      const res = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students: validStudents }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to import students');
      }

      setImportResultSummary(data);
      fetchStudents();
      setMsg({
        type: 'success',
        text: `Bulk import completed: ${data.importedCount} student(s) imported. ${data.duplicateCount} duplicate(s) and ${data.invalidCount || 0} invalid record(s) were safely skipped.`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseBulkImport = () => {
    setShowBulkImportModal(false);
    setImportFile(null);
    setImportParseResult(null);
    setImportResultSummary(null);
    setImportFilterTab('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t('students.title')}</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            {t('students.subtitle')}
          </p>
        </div>

        {isPrincipalOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdmitModal(true)}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t('students.admit_student')}
            </button>
            <button
              onClick={() => setShowBulkImportModal(true)}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              {language === 'np' ? 'IEMIS Excel बाट आयात' : 'Bulk Import (IEMIS)'}
            </button>
            <button
              onClick={handleOpenBulkPromote}
              className="inline-flex items-center px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-2xs"
            >
              <ArrowUpRight className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" />
              {t('students.bulk_promote')}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Enrolled</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {formatNumber(students.length)}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Boys vs. Girls</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {formatNumber(students.filter((s) => s.gender === 'MALE').length)} : {formatNumber(students.filter((s) => s.gender === 'FEMALE').length)}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inclusion Scholarships</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {formatNumber(students.filter((s) => s.scholarshipEligible).length)}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1">
            <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
            <span>Health Care Alerts</span>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {formatNumber(
              students.filter(
                (s) =>
                  (s.healthRecord?.allergies && s.healthRecord.allergies !== 'None') ||
                  (s.healthRecord?.chronicConditions && s.healthRecord.chronicConditions !== 'None')
              ).length
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, Student ID, IEMIS, Parent Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
          />
        </div>

        <select
          value={selectedClassId}
          onChange={(e) => {
            setSelectedClassId(e.target.value);
            setSelectedSectionId('');
          }}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="">All Classes (ECD-12)</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
            </option>
          ))}
        </select>

        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="">All Sections</option>
          {sections
            .filter((s) => !selectedClassId || s.classId === selectedClassId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.code} {s.streamNameEn ? `(${s.streamNameEn})` : ''}
              </option>
            ))}
        </select>

        <select
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="">All Genders</option>
          <option value="MALE">Male (छात्र)</option>
          <option value="FEMALE">Female (छात्रा)</option>
        </select>

        <select
          value={selectedBloodGroup}
          onChange={(e) => setSelectedBloodGroup(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="">Blood Group</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>

        <select
          value={selectedInclusion}
          onChange={(e) => setSelectedInclusion(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="">Inclusion Category</option>
          <option value="DALIT">Dalit</option>
          <option value="JANAJATI">Janajati</option>
          <option value="BRAHMIN_CHHETRI">Brahmin/Chhetri</option>
          <option value="MADHESI">Madhesi</option>
          <option value="THARU">Tharu</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">ID / IEMIS</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Class / Sec</th>
                <th className="px-5 py-3.5">Roll</th>
                <th className="px-5 py-3.5">Blood Group</th>
                <th className="px-5 py-3.5">Guardian Contact</th>
                <th className="px-5 py-3.5">Inclusion / Health</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {students.map((st) => {
                const hasHealthAlert =
                  (st.healthRecord?.allergies && st.healthRecord.allergies !== 'None') ||
                  (st.healthRecord?.chronicConditions && st.healthRecord.chronicConditions !== 'None');

                return (
                  <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                        {st.studentId}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {st.iemisCode || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        {st.photoUrl ? (
                          <img
                            src={st.photoUrl}
                            alt={st.firstNameEn}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                            {st.firstNameEn?.[0] || 'S'}{st.lastNameEn?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{language === 'np' ? `${st.firstNameNp} ${st.lastNameNp}` : `${st.firstNameEn} ${st.lastNameEn}`}</span>
                            {st.houseColor && (
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                                style={{ backgroundColor: st.houseColor }}
                                title={st.houseNameEn}
                              />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                            <span>{language === 'np' ? `${st.firstNameEn} ${st.lastNameEn}` : `${st.firstNameNp} ${st.lastNameNp}`}</span>
                            {st.houseNameEn && <span className="text-[11px] text-slate-400">• {st.houseNameEn}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{st.classCode} {st.sectionCode ? `- ${st.sectionCode}` : ''}</span>
                        {st.streamNameEn && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {language === 'np' ? (st.streamNameNp || st.streamNameEn) : st.streamNameEn}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {st.currentRollNumber ? formatNumber(st.currentRollNumber) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {st.bloodGroup || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-medium text-slate-900 dark:text-slate-200">{st.guardianName}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{st.guardianPhone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {st.ethnicityInclusion}
                        </span>
                        {hasHealthAlert && (
                          <span
                            className="p-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                            title={`Health alert: ${st.healthRecord?.allergies} | ${st.healthRecord?.chronicConditions}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(st.id)}
                          title="View Complete Student Dossier"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-xs font-bold text-blue-700 dark:text-blue-300 transition shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(st.id)}
                          title="Edit Student Information"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-xs font-bold text-amber-700 dark:text-amber-300 transition shadow-2xs"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(st)}
                          title="Delete Student Record"
                          className="inline-flex items-center p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-xs font-bold text-rose-700 dark:text-rose-300 transition shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redesigned Responsive Student Dossier Modal */}
      {selectedStudentForDossier && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Sticky Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="relative group shrink-0">
                  {selectedStudentForDossier.photoUrl ? (
                    <img
                      src={selectedStudentForDossier.photoUrl}
                      alt={selectedStudentForDossier.firstNameEn}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-blue-500 shadow-md"
                    />
                  ) : (
                    <span className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black font-mono text-lg shadow-sm">
                      {selectedStudentForDossier.firstNameEn ? selectedStudentForDossier.firstNameEn[0] : 'S'}
                      {selectedStudentForDossier.lastNameEn ? selectedStudentForDossier.lastNameEn[0] : ''}
                    </span>
                  )}
                  <label
                    title="तस्बिर फेर्नुहोस् (Upload/Change Photo)"
                    className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-800 text-blue-600 hover:text-blue-700 rounded-full shadow border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPhotoForDossier(file);
                      }}
                    />
                  </label>
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedStudentForDossier.firstNameEn}{' '}
                      {selectedStudentForDossier.middleNameEn ? selectedStudentForDossier.middleNameEn + ' ' : ''}
                      {selectedStudentForDossier.lastNameEn}
                    </h3>
                    {(selectedStudentForDossier.firstNameNp || selectedStudentForDossier.lastNameNp) && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                        ({selectedStudentForDossier.firstNameNp} {selectedStudentForDossier.lastNameNp})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1 text-xs">
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold">
                      ID: {selectedStudentForDossier.studentId}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      <Shield className="w-3 h-3 mr-1" />
                      IEMIS: {selectedStudentForDossier.iemisCode || '—'}
                    </span>
                    {(selectedStudentForDossier.houseNameEn || selectedStudentForDossier.house?.nameEn) && (
                      <span
                        className="px-2 py-0.5 rounded text-white font-bold text-[11px] shadow-2xs"
                        style={{ backgroundColor: selectedStudentForDossier.houseColor || selectedStudentForDossier.house?.colorHex || '#3b82f6' }}
                      >
                        {selectedStudentForDossier.houseNameEn || selectedStudentForDossier.house?.nameEn}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                      {selectedStudentForDossier.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedStudentForDossier.id;
                    handleOpenEditModal(id);
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-xs font-bold text-amber-800 dark:text-amber-200 transition"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Edit Student
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDossier(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs text-slate-800 dark:text-slate-200">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Class & Section</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 flex-wrap text-sm">
                    <span>
                      Grade {selectedStudentForDossier.currentClass?.code || selectedStudentForDossier.classCode || '10'} (
                      {selectedStudentForDossier.currentSection?.code || selectedStudentForDossier.sectionCode || 'A'})
                    </span>
                    {(selectedStudentForDossier.currentSection?.streamNameEn || selectedStudentForDossier.stream?.nameEn) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {selectedStudentForDossier.currentSection?.streamNameEn || selectedStudentForDossier.stream?.nameEn}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Roll Number</span>
                  <div className="font-black text-slate-900 dark:text-white mt-1 font-mono text-sm">
                    #{formatNumber(selectedStudentForDossier.currentRollNumber || 1)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Date of Birth (BS / AD)</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1 font-mono text-xs">
                    {selectedStudentForDossier.dobBs} BS
                  </div>
                  {selectedStudentForDossier.dobAd && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {selectedStudentForDossier.dobAd} AD
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gender & Blood</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    <span>{selectedStudentForDossier.gender}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      {selectedStudentForDossier.bloodGroup || 'UNKNOWN'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">House (सदन)</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                    {selectedStudentForDossier.houseNameEn || selectedStudentForDossier.house?.nameEn ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-white text-[11px] font-bold"
                        style={{ backgroundColor: selectedStudentForDossier.houseColor || selectedStudentForDossier.house?.colorHex || '#3b82f6' }}
                      >
                        {language === 'np'
                          ? (selectedStudentForDossier.houseNameNp || selectedStudentForDossier.house?.nameNp || selectedStudentForDossier.houseNameEn)
                          : (selectedStudentForDossier.houseNameEn || selectedStudentForDossier.house?.nameEn)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">छैन (None)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Family & Guardians Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Guardians & Family Contacts (अभिभावकको विवरण)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedStudentForDossier.guardians && selectedStudentForDossier.guardians.length > 0 ? (
                    selectedStudentForDossier.guardians.map((g: any) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            {g.relationship}
                          </span>
                          {g.isPrimaryContact && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Primary Contact
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm pt-0.5">
                          {g.fullNameEn}
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a href={`tel:${g.phone}`} className="hover:underline text-blue-600 dark:text-blue-400 font-bold">
                            {g.phone || '—'}
                          </a>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Occupation: <span className="font-medium text-slate-700 dark:text-slate-300">{g.occupation || '—'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1 col-span-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        GUARDIAN
                      </span>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedStudentForDossier.guardianName || 'Not Recorded'}
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                        Phone: {selectedStudentForDossier.guardianPhone || '—'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2 text-sm">
                  <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Residency & Address Details (ठेगाना विवरण)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Permanent Address (स्थायी ठेगाना)
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                      {selectedStudentForDossier.permLocalLevel || 'Nagarain'}-
                      {selectedStudentForDossier.permWardNumber || 2},{' '}
                      {selectedStudentForDossier.permDistrict || 'Dhanusha'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedStudentForDossier.permProvince || 'Madhesh Province'}
                      {selectedStudentForDossier.permTole ? ` (${selectedStudentForDossier.permTole})` : ''}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Temporary / Current Address (हालको ठेगाना)
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white text-xs mt-1">
                      {selectedStudentForDossier.currLocalLevel
                        ? `${selectedStudentForDossier.currLocalLevel}-${selectedStudentForDossier.currWardNumber || ''}, ${selectedStudentForDossier.currDistrict || ''}`
                        : 'Same as Permanent Address (स्थायी ठेगाना सरह)'}
                    </div>
                    {selectedStudentForDossier.currProvince && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedStudentForDossier.currProvince}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MEDICAL & HEALTH CARE SECTION (High Contrast) */}
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="flex items-center space-x-2 font-bold text-rose-900 dark:text-rose-200 text-sm">
                  <Stethoscope className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Medical & Health Information Record (स्वास्थ्य अभिलेख)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Known Allergies:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedStudentForDossier.healthRecord?.allergies || 'None (कुनै एलर्जी छैन)'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Chronic Conditions:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedStudentForDossier.healthRecord?.chronicConditions || 'None (कुनै दीर्घरोग छैन)'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Regular Medications:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedStudentForDossier.healthRecord?.regularMedications || 'None'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Preferred Health Center:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedStudentForDossier.healthRecord?.preferredHospital || 'Local Primary Health Center'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Emergency Medical Contact:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedStudentForDossier.healthRecord?.emergencyContactName || 'Guardian'}{' '}
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        ({selectedStudentForDossier.healthRecord?.emergencyContactPhone || selectedStudentForDossier.guardianPhone || '—'})
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Immunization:</span>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {selectedStudentForDossier.healthRecord?.immunizationStatus || 'COMPLETE'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Enrolled Subjects & Curriculum */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2 text-sm">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Active Enrolled Curriculum & Subjects ({selectedStudentForDossier.activeSubjects?.length || 0})</span>
                  </div>
                  {selectedStudentForDossier.currentSection?.code === 'C' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Section C Technical Stream
                    </span>
                  ) : (selectedStudentForDossier.optionalSubject1 || selectedStudentForDossier.optionalSubject2) ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      General Stream (CDC Electives)
                    </span>
                  ) : null}
                </div>

                {selectedStudentForDossier.activeSubjects && selectedStudentForDossier.activeSubjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedStudentForDossier.activeSubjects.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-500">{sub.code}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                sub.optionalGroup === 'OPT_1'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : sub.optionalGroup === 'OPT_2'
                                  ? 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300'
                                  : sub.optionalGroup === 'TECHNICAL'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {sub.optionalGroup === 'OPT_1'
                                ? 'Optional I'
                                : sub.optionalGroup === 'OPT_2'
                                ? 'Optional II'
                                : sub.optionalGroup === 'TECHNICAL'
                                ? 'Technical'
                                : 'Compulsory'}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                            {language === 'np' ? (sub.nameNp || sub.nameEn) : (sub.nameEn || sub.nameNp)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {formatNumber(sub.creditHours || 4)} CH
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {formatNumber(sub.theoryFullMarks ?? 75)} / {formatNumber(sub.practicalFullMarks ?? 25)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-3 bg-white dark:bg-slate-900 rounded-lg">
                    No individual subject records enrolled yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
              <div className="text-[11px] text-slate-500 font-medium">
                Student Permanent Dossier &bull; {selectedStudentForDossier.studentId}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedStudentForDossier.id;
                    handleOpenEditModal(id);
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-xs flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDossier(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal (with Non-Editable IEMIS ID) */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Student Profile: {editingStudent.firstNameEn} {editingStudent.lastNameEn}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: <span className="font-bold text-blue-600">{editingStudent.studentId}</span> | IEMIS:{' '}
                    <span className="font-bold text-emerald-600">{editingStudent.iemisCode || '—'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Tabs Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/30 shrink-0 gap-1 overflow-x-auto text-xs font-bold">
              {[
                { key: 'basic', label: '१. व्यक्तिगत विवरण (Basic Info)' },
                { key: 'placement', label: '२. कक्षा र रोल (Placement)' },
                { key: 'guardians', label: '३. अभिभावक (Guardians)' },
                { key: 'address', label: '४. ठेगाना (Address)' },
                { key: 'health', label: '५. स्वास्थ्य (Health & Medical)' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setEditTab(tab.key as any)}
                  className={`py-3 px-3.5 border-b-2 transition whitespace-nowrap ${
                    editTab === tab.key
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEditStudent} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Tab 1: Basic Info */}
                {editTab === 'basic' && (
                  <div className="space-y-4">
                    {/* Non-Editable Official IEMIS ID Banner */}
                    <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span>IEMIS Student ID (आधिकारिक सरकारी कोड - सुरक्षित / Non-Editable)</span>
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900 text-amber-900 dark:text-amber-200 flex items-center space-x-1">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.iemisCode || ''}
                          readOnly
                          disabled
                          className="w-full px-3 py-2 pl-9 rounded-lg border border-amber-300 dark:border-amber-800 bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono font-bold cursor-not-allowed select-none"
                        />
                        <Lock className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
                      </div>
                      <p className="text-[10px] text-amber-800 dark:text-amber-300">
                        CEHRD को नियम अनुसार विद्यार्थीको १६-अङ्के सरकारी IEMIS कोड दर्ता भइसकेपछि प्रणालीको सुरक्षाका लागि सिधै सच्याउन मिल्दैन।
                      </p>
                    </div>

                    {/* Student Photo Section */}
                    <div className="flex items-center space-x-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      <div className="w-20 h-24 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {editForm.photoUrl ? (
                          <img src={editForm.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-slate-400 text-[10px] flex flex-col items-center">
                            <Camera className="w-5 h-5 mb-1 text-slate-400" />
                            <span>तस्बिर छैन</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          विद्यार्थीको तस्बिर (Student Passport Photo)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          पासपोर्ट साइजको तस्बिर (JPG, PNG) - रिपोर्ट कार्ड, प्रमाणपत्र र परिचयपत्रमा प्रयोग हुन्छ।
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition shadow-2xs">
                            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                            <span>{editForm.photoUrl ? 'तस्बिर फेर्नुहोस्' : 'तस्बिर छान्नुहोस्'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditForm({ ...editForm, photoUrl: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {editForm.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, photoUrl: '' })}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              हटाउनुहोस्
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">First Name (English) *</label>
                        <input
                          type="text"
                          required
                          value={editForm.firstNameEn || ''}
                          onChange={(e) => setEditForm({ ...editForm, firstNameEn: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Middle Name (English)</label>
                        <input
                          type="text"
                          value={editForm.middleNameEn || ''}
                          onChange={(e) => setEditForm({ ...editForm, middleNameEn: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Last Name (English) *</label>
                        <input
                          type="text"
                          required
                          value={editForm.lastNameEn || ''}
                          onChange={(e) => setEditForm({ ...editForm, lastNameEn: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">पहिलो नाम (नेपाली)</label>
                        <input
                          type="text"
                          value={editForm.firstNameNp || ''}
                          onChange={(e) => setEditForm({ ...editForm, firstNameNp: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">थर (नेपाली)</label>
                        <input
                          type="text"
                          value={editForm.lastNameNp || ''}
                          onChange={(e) => setEditForm({ ...editForm, lastNameNp: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">DOB (वि.सं. BS) *</label>
                        <input
                          type="text"
                          required
                          placeholder="2067-03-03"
                          value={editForm.dobBs || ''}
                          onChange={(e) => setEditForm({ ...editForm, dobBs: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                        <select
                          value={editForm.gender || 'MALE'}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        >
                          <option value="MALE">Male (छात्र)</option>
                          <option value="FEMALE">Female (छात्रा)</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                        <select
                          value={editForm.bloodGroup || 'UNKNOWN'}
                          onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold font-mono text-rose-600"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'].map((bg) => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inclusion Quota</label>
                        <select
                          value={editForm.ethnicityInclusion || 'GENERAL'}
                          onChange={(e) => setEditForm({ ...editForm, ethnicityInclusion: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        >
                          <option value="GENERAL">General</option>
                          <option value="BRAHMIN_CHHETRI">Brahmin/Chhetri</option>
                          <option value="JANAJATI">Janajati</option>
                          <option value="MADHESI">Madhesi</option>
                          <option value="DALIT">Dalit</option>
                          <option value="MUSLIM">Muslim</option>
                          <option value="THARU">Tharu</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Placement */}
                {editTab === 'placement' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class (कक्षा) *</label>
                        <select
                          required
                          value={editForm.currentClassId || ''}
                          onChange={(e) => setEditForm({ ...editForm, currentClassId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section (सेक्सन) *</label>
                        <select
                          required
                          value={editForm.currentSectionId || ''}
                          onChange={(e) => setEditForm({ ...editForm, currentSectionId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                        >
                          {sections
                            .filter((s) => !editForm.currentClassId || s.classId === editForm.currentClassId)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                Section {s.code} {s.streamNameEn ? `(${s.streamNameEn})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Roll Number</label>
                        <input
                          type="number"
                          value={editForm.currentRollNumber || ''}
                          onChange={(e) => setEditForm({ ...editForm, currentRollNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">House (Sports)</label>
                      <select
                        value={editForm.houseId || ''}
                        onChange={(e) => setEditForm({ ...editForm, houseId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                      >
                        <option value="">No House Assigned</option>
                        {houses.map((h) => (
                          <option key={h.id} value={h.id}>
                            {language === 'np' ? (h.nameNp || h.nameEn) : (h.nameEn || h.nameNp)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Tab 3: Guardians */}
                {editTab === 'guardians' && (
                  <div className="space-y-4">
                    {/* Father */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px]">
                          FATHER
                        </span>
                        <span>बुबाको विवरण (Father's Details)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (English)</label>
                          <input
                            type="text"
                            value={editForm.fatherNameEn || ''}
                            onChange={(e) => setEditForm({ ...editForm, fatherNameEn: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editForm.fatherPhone || ''}
                            onChange={(e) => setEditForm({ ...editForm, fatherPhone: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Occupation</label>
                          <input
                            type="text"
                            value={editForm.fatherOccupation || ''}
                            onChange={(e) => setEditForm({ ...editForm, fatherOccupation: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mother */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px]">
                          MOTHER
                        </span>
                        <span>आमाको विवरण (Mother's Details)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (English)</label>
                          <input
                            type="text"
                            value={editForm.motherNameEn || ''}
                            onChange={(e) => setEditForm({ ...editForm, motherNameEn: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editForm.motherPhone || ''}
                            onChange={(e) => setEditForm({ ...editForm, motherPhone: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Occupation</label>
                          <input
                            type="text"
                            value={editForm.motherOccupation || ''}
                            onChange={(e) => setEditForm({ ...editForm, motherOccupation: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Address */}
                {editTab === 'address' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-slate-900 dark:text-white">स्थायी ठेगाना (Permanent Address)</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">प्रदेश (Province)</label>
                          <input
                            type="text"
                            value={editForm.permProvince || ''}
                            onChange={(e) => setEditForm({ ...editForm, permProvince: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">जिल्ला (District)</label>
                          <input
                            type="text"
                            value={editForm.permDistrict || ''}
                            onChange={(e) => setEditForm({ ...editForm, permDistrict: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">स्थानीय तह (Municipality)</label>
                          <input
                            type="text"
                            value={editForm.permLocalLevel || ''}
                            onChange={(e) => setEditForm({ ...editForm, permLocalLevel: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">वडा नं. (Ward)</label>
                          <input
                            type="number"
                            value={editForm.permWardNumber || ''}
                            onChange={(e) => setEditForm({ ...editForm, permWardNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="font-bold text-slate-900 dark:text-white">हालको ठेगाना (Temporary / Current Address)</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">प्रदेश (Province)</label>
                          <input
                            type="text"
                            placeholder="Same as Permanent"
                            value={editForm.currProvince || ''}
                            onChange={(e) => setEditForm({ ...editForm, currProvince: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">जिल्ला (District)</label>
                          <input
                            type="text"
                            value={editForm.currDistrict || ''}
                            onChange={(e) => setEditForm({ ...editForm, currDistrict: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">स्थानीय तह (Municipality)</label>
                          <input
                            type="text"
                            value={editForm.currLocalLevel || ''}
                            onChange={(e) => setEditForm({ ...editForm, currLocalLevel: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">वडा नं. (Ward)</label>
                          <input
                            type="number"
                            value={editForm.currWardNumber || ''}
                            onChange={(e) => setEditForm({ ...editForm, currWardNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 5: Health & Medical */}
                {editTab === 'health' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Known Allergies (एलर्जी)</label>
                        <input
                          type="text"
                          placeholder="e.g. Penicillin, Peanuts (or None)"
                          value={editForm.allergies || ''}
                          onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chronic Medical Conditions (दीर्घरोग)</label>
                        <input
                          type="text"
                          placeholder="e.g. Asthma, Diabetes (or None)"
                          value={editForm.chronicConditions || ''}
                          onChange={(e) => setEditForm({ ...editForm, chronicConditions: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Regular Medications (नियमित औषधि)</label>
                        <input
                          type="text"
                          placeholder="e.g. Daily Inhaler (or None)"
                          value={editForm.regularMedications || ''}
                          onChange={(e) => setEditForm({ ...editForm, regularMedications: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Hospital / Health Center</label>
                        <input
                          type="text"
                          value={editForm.preferredHospital || ''}
                          onChange={(e) => setEditForm({ ...editForm, preferredHospital: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Medical Contact Name</label>
                        <input
                          type="text"
                          value={editForm.emergencyContactName || ''}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Medical Phone</label>
                        <input
                          type="text"
                          value={editForm.emergencyContactPhone || ''}
                          onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving Changes...' : 'Save Student Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Student (विद्यार्थी मेटाउने)?
                </h3>
                <p className="text-xs text-slate-500">
                  This action permanently removes the student from the database.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
              <div>
                <strong>Student:</strong> {studentToDelete.firstNameEn} {studentToDelete.lastNameEn}
              </div>
              <div className="font-mono text-[11px]">
                <strong>Student ID:</strong> {studentToDelete.studentId}
              </div>
              <div className="font-mono text-[11px]">
                <strong>IEMIS Code:</strong> {studentToDelete.iemisCode || '—'}
              </div>
              <div>
                <strong>Placement:</strong> Grade {studentToDelete.classCode} ({studentToDelete.sectionCode || 'A'})
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              के तपाईं पक्का हुनुहुन्छ? यस विद्यार्थीसँग जोडिएका सबै अभिभावक तथा स्वास्थ्य रेकर्डहरू पनि हट्नेछन्।
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admit New Student Modal (Comprehensive 6-Tab Workflow) */}
      {showAdmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('students.admit_student')}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enrolls student with auto-generated ID [BSYear]-[0001], addresses, and health records.
                </p>
              </div>
              <button
                onClick={() => setShowAdmitModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto px-6 pt-2 gap-2 bg-slate-50/40 dark:bg-slate-950/20">
              {[
                { id: 'identity', label: '1. Identity' },
                { id: 'academic', label: '2. Placement' },
                { id: 'address', label: '3. Addresses' },
                { id: 'inclusion', label: '4. Inclusion' },
                { id: 'health', label: '5. Medical & Health' },
                { id: 'guardians', label: '6. Guardians' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdmitTab(tab.id as any)}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                    admitTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleAdmitSubmit} className="p-6 space-y-4 text-xs">
              {/* Tab 1: Identity */}
              {admitTab === 'identity' && (
                <div className="space-y-4">
                  {/* Student Photo Upload */}
                  <div className="flex items-center space-x-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <div className="w-20 h-24 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {admitForm.photoUrl ? (
                        <img src={admitForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-slate-400 text-[10px] flex flex-col items-center">
                          <Camera className="w-5 h-5 mb-1 text-slate-400" />
                          <span>तस्बिर</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        विद्यार्थीको तस्बिर (Student Passport Photo)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        पासपोर्ट साइजको तस्बिर (JPG, PNG) - प्रमाणपत्र, परिचयपत्र र परीक्षा रिपोर्ट कार्डमा छापिन्छ।
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition shadow-2xs">
                          <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                          <span>{admitForm.photoUrl ? 'तस्बिर फेर्नुहोस्' : 'तस्बिर छान्नुहोस्'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAdmitForm({ ...admitForm, photoUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {admitForm.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setAdmitForm({ ...admitForm, photoUrl: '' })}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          >
                            हटाउनुहोस्
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">First Name (English) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Suman"
                        value={admitForm.firstNameEn}
                        onChange={(e) => setAdmitForm({ ...admitForm, firstNameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Middle Name (English)</label>
                      <input
                        type="text"
                        placeholder="e.g. Bahadur"
                        value={admitForm.middleNameEn}
                        onChange={(e) => setAdmitForm({ ...admitForm, middleNameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Last Name (English) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Thapa"
                        value={admitForm.lastNameEn}
                        onChange={(e) => setAdmitForm({ ...admitForm, lastNameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">पहिलो नाम (नेपाली) *</label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: सुमन"
                        value={admitForm.firstNameNp}
                        onChange={(e) => setAdmitForm({ ...admitForm, firstNameNp: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">बीचको नाम (नेपाली)</label>
                      <input
                        type="text"
                        placeholder="उदा: बहादुर"
                        value={admitForm.middleNameNp}
                        onChange={(e) => setAdmitForm({ ...admitForm, middleNameNp: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">थर (नेपाली) *</label>
                      <input
                        type="text"
                        required
                        placeholder="उदा: थापा"
                        value={admitForm.lastNameNp}
                        onChange={(e) => setAdmitForm({ ...admitForm, lastNameNp: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth (BS) *</label>
                      <input
                        type="text"
                        required
                        placeholder="YYYY-MM-DD"
                        value={admitForm.dobBs}
                        onChange={(e) => setAdmitForm({ ...admitForm, dobBs: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth (AD) *</label>
                      <input
                        type="date"
                        required
                        value={admitForm.dobAd}
                        onChange={(e) => setAdmitForm({ ...admitForm, dobAd: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                      <select
                        value={admitForm.gender}
                        onChange={(e) => setAdmitForm({ ...admitForm, gender: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="MALE">Male (छात्र)</option>
                        <option value="FEMALE">Female (छात्रा)</option>
                        <option value="OTHER">Other (अन्य)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Placement */}
              {admitTab === 'academic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class *</label>
                      <select
                        value={admitForm.currentClassId}
                        onChange={(e) => setAdmitForm({ ...admitForm, currentClassId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section</label>
                      <select
                        value={admitForm.currentSectionId}
                        onChange={(e) => setAdmitForm({ ...admitForm, currentSectionId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="">Auto / Default</option>
                        {sections
                          .filter((s) => s.classId === admitForm.currentClassId)
                          .map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.streamNameEn
                                ? `${sec.streamNameEn} - Section ${sec.code} (${sec.nameEn})`
                                : `${sec.nameEn} (${sec.code})`}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Roll Number</label>
                      <input
                        type="number"
                        value={admitForm.currentRollNumber}
                        onChange={(e) => setAdmitForm({ ...admitForm, currentRollNumber: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IEMIS Student Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 270010001-016"
                        value={admitForm.iemisCode}
                        onChange={(e) => setAdmitForm({ ...admitForm, iemisCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">House (Sports)</label>
                      <select
                        value={admitForm.houseId}
                        onChange={(e) => setAdmitForm({ ...admitForm, houseId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="">No House Assigned</option>
                        {houses.map((h) => (
                          <option key={h.id} value={h.id}>
                            {language === 'np' ? (h.nameNp || h.nameEn) : (h.nameEn || h.nameNp)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Class 9 & 10 CDC Curriculum & Electives Section */}
                  {(() => {
                    const selectedClass = classes.find((c) => c.id === admitForm.currentClassId);
                    const selectedSection = sections.find((s) => s.id === admitForm.currentSectionId);
                    const isClass9or10 = selectedClass && (
                      selectedClass.code?.toUpperCase().includes('9') ||
                      selectedClass.code?.toUpperCase().includes('10') ||
                      selectedClass.nameEn?.toUpperCase().includes('9') ||
                      selectedClass.nameEn?.toUpperCase().includes('10')
                    );
                    if (!isClass9or10) return null;

                    const isSectionC = selectedSection && (
                      selectedSection.code?.toUpperCase() === 'C' ||
                      selectedSection.nameEn?.toUpperCase().includes('TECH')
                    );

                    const opt1Subjects = subjects.filter(
                      (s) => s.classId === admitForm.currentClassId && s.optionalGroup === 'OPT_1'
                    );
                    const opt2Subjects = subjects.filter(
                      (s) => s.classId === admitForm.currentClassId && s.optionalGroup === 'OPT_2'
                    );
                    const techSubjects = subjects.filter(
                      (s) => s.classId === admitForm.currentClassId && (s.optionalGroup === 'TECHNICAL' || (selectedSection && s.sectionId === selectedSection.id))
                    );

                    return (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>CDC Secondary Curriculum & Elective Selection (कक्षा ९/१० पाठ्यक्रम)</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            isSectionC
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                          }`}>
                            {isSectionC ? 'Technical / Vocational Stream (Section C)' : 'General Stream (CDC Electives)'}
                          </span>
                        </div>

                        {isSectionC ? (
                          <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 space-y-2">
                            <div className="flex items-center space-x-2 font-bold">
                              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>Section C — Technical Stream Curriculum (प्राविधिक धार - कम्प्युटर इन्जिनियरिङ)</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
                              Students enrolled in <strong>Section C</strong> automatically study the Technical Stream curriculum. The 5 core compulsory subjects plus Section C specialized technical subjects ({techSubjects.map((s) => s.nameEn).join(', ') || 'Computer Engineering, Drawing & Programming'}) are assigned directly to this section. Elective selection is not needed.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              Under the Nepal CDC Curriculum for Class 9 & 10 General Stream (Sections A & B), each student must elect <strong>1 subject from Optional Group I</strong> and <strong>1 subject from Optional Group II</strong>:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Optional I (ऐच्छिक प्रथम) *
                                </label>
                                <select
                                  value={admitForm.optionalSubject1Id}
                                  onChange={(e) => setAdmitForm({ ...admitForm, optionalSubject1Id: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                                >
                                  <option value="">-- Select Optional I Subject --</option>
                                  {opt1Subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.code}: {language === 'np' ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)} ({formatNumber(s.creditHours)} CH)
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Optional II (ऐच्छिक द्वितीय) *
                                </label>
                                <select
                                  value={admitForm.optionalSubject2Id}
                                  onChange={(e) => setAdmitForm({ ...admitForm, optionalSubject2Id: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                                >
                                  <option value="">-- Select Optional II Subject --</option>
                                  {opt2Subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.code}: {language === 'np' ? (s.nameNp || s.nameEn) : (s.nameEn || s.nameNp)} ({formatNumber(s.creditHours)} CH)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Class 11 & 12 NEB Higher Secondary Faculty & Curriculum Section */}
                  {(() => {
                    const selectedClass = classes.find((c) => c.id === admitForm.currentClassId);
                    const isHigherSec = selectedClass && (
                      selectedClass.hasStreams ||
                      ['11', '12'].includes(selectedClass.code) ||
                      selectedClass.code?.toUpperCase().includes('11') ||
                      selectedClass.code?.toUpperCase().includes('12')
                    );
                    if (!isHigherSec) return null;

                    const selectedSection = sections.find((s) => s.id === admitForm.currentSectionId);
                    const streamName = selectedSection?.streamNameEn || selectedSection?.streamNameNp;

                    return (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>NEB Higher Secondary Faculty (+२ संकाय तथा पाठ्यक्रम)</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                            {streamName ? `${streamName} Faculty` : 'Higher Secondary (+२)'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 space-y-2">
                          <div className="flex items-center space-x-2 font-bold text-xs">
                            <span>Faculty Stream: {streamName || 'Section-Linked Faculty'}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
                            Class 11 & 12 enrollments are integrated directly by Faculty Stream sections.
                            {selectedSection?.streamNameEn ? (
                              <span> The student will be enrolled into the <strong>{selectedSection.streamNameEn}</strong> faculty (Section {selectedSection.code}), and mapped to NEB standard core and specialized stream curriculum.</span>
                            ) : (
                              <span> Please select a stream-linked section (e.g. Science or Management) above to associate this student with the appropriate faculty curriculum.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab 3: Address */}
              {admitTab === 'address' && (
                <div className="space-y-4">
                  <div className="font-bold text-slate-900 dark:text-white">Permanent Address (स्थायी ठेगाना)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Province</label>
                      <input
                        type="text"
                        value={admitForm.permProvince}
                        onChange={(e) => setAdmitForm({ ...admitForm, permProvince: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">District</label>
                      <input
                        type="text"
                        value={admitForm.permDistrict}
                        onChange={(e) => setAdmitForm({ ...admitForm, permDistrict: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Local Level (Municipality)</label>
                      <input
                        type="text"
                        value={admitForm.permLocalLevel}
                        onChange={(e) => setAdmitForm({ ...admitForm, permLocalLevel: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ward Number</label>
                      <input
                        type="number"
                        value={admitForm.permWardNumber}
                        onChange={(e) => setAdmitForm({ ...admitForm, permWardNumber: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tole / Street</label>
                      <input
                        type="text"
                        value={admitForm.permTole}
                        onChange={(e) => setAdmitForm({ ...admitForm, permTole: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Inclusion */}
              {admitTab === 'inclusion' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Inclusion Category *</label>
                      <select
                        value={admitForm.ethnicityInclusion}
                        onChange={(e) => setAdmitForm({ ...admitForm, ethnicityInclusion: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="BRAHMIN_CHHETRI">Brahmin / Chhetri</option>
                        <option value="JANAJATI">Janajati</option>
                        <option value="DALIT">Dalit</option>
                        <option value="MADHESI">Madhesi</option>
                        <option value="THARU">Tharu</option>
                        <option value="MUSLIM">Muslim</option>
                        <option value="BACKWARD">Backward Class (पिछडिएको वर्ग)</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Disability Status</label>
                      <select
                        value={admitForm.disabilityStatus}
                        onChange={(e) => setAdmitForm({ ...admitForm, disabilityStatus: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="NONE">None (सामान्य)</option>
                        <option value="PHYSICAL">Physical Disability</option>
                        <option value="VISUAL">Visual Impairment</option>
                        <option value="HEARING">Hearing Impairment</option>
                        <option value="INTELLECTUAL">Intellectual Disability</option>
                        <option value="MULTIPLE">Multiple Disabilities</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="scholarship"
                      checked={admitForm.scholarshipEligible}
                      onChange={(e) => setAdmitForm({ ...admitForm, scholarshipEligible: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="scholarship" className="font-bold text-slate-800 dark:text-slate-200">
                      Eligible for Government Free-Ship / Quota Scholarship
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 5: MEDICAL & HEALTH INFORMATION SECTION (User Requested Addition) */}
              {admitTab === 'health' && (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center space-x-2 text-xs text-rose-900 dark:text-rose-200 font-semibold">
                    <Stethoscope className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>School Health Dossier: All data is confidential and accessible to authorized staff & emergency responders.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group (रक्त समूह) *</label>
                      <select
                        value={admitForm.bloodGroup}
                        onChange={(e) => setAdmitForm({ ...admitForm, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-rose-600"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'].map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Immunization Status (खोप)</label>
                      <select
                        value={admitForm.immunizationStatus}
                        onChange={(e) => setAdmitForm({ ...admitForm, immunizationStatus: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="COMPLETE">Complete (सबै आधारभूत खोप पूरा)</option>
                        <option value="PARTIAL">Partial (केही खोप बाँकी)</option>
                        <option value="NOT_SPECIFIED">Not Specified</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Known Allergies & Sensitivities</label>
                      <input
                        type="text"
                        placeholder="e.g. Penicillin, Peanuts, Dust (or None)"
                        value={admitForm.allergies}
                        onChange={(e) => setAdmitForm({ ...admitForm, allergies: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chronic Conditions</label>
                      <input
                        type="text"
                        placeholder="e.g. Asthma, Diabetes, Epilepsy (or None)"
                        value={admitForm.chronicConditions}
                        onChange={(e) => setAdmitForm({ ...admitForm, chronicConditions: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Regular Medications / Care Needs</label>
                      <input
                        type="text"
                        placeholder="e.g. Inhaler, Daily tablets (or None)"
                        value={admitForm.regularMedications}
                        onChange={(e) => setAdmitForm({ ...admitForm, regularMedications: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Local Hospital / Health Post</label>
                      <input
                        type="text"
                        placeholder="e.g. Tokha Primary Health Post, Grande Hospital"
                        value={admitForm.preferredHospital}
                        onChange={(e) => setAdmitForm({ ...admitForm, preferredHospital: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Medical Contact (Name & Phone)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Contact Person Name"
                        value={admitForm.emergencyContactName}
                        onChange={(e) => setAdmitForm({ ...admitForm, emergencyContactName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Emergency Phone (e.g. 9841123456)"
                        value={admitForm.emergencyContactPhone}
                        onChange={(e) => setAdmitForm({ ...admitForm, emergencyContactPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Guardians */}
              {admitTab === 'guardians' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="font-bold text-slate-900 dark:text-white">Father's Information (बुबाको विवरण) *</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (English) *</label>
                        <input
                          type="text"
                          required
                          value={admitForm.fatherNameEn}
                          onChange={(e) => setAdmitForm({ ...admitForm, fatherNameEn: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                        <input
                          type="text"
                          required
                          value={admitForm.fatherPhone}
                          onChange={(e) => setAdmitForm({ ...admitForm, fatherPhone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="font-bold text-slate-900 dark:text-white">Mother's Information (आमाको विवरण)</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (English)</label>
                        <input
                          type="text"
                          value={admitForm.motherNameEn}
                          onChange={(e) => setAdmitForm({ ...admitForm, motherNameEn: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={admitForm.motherPhone}
                          onChange={(e) => setAdmitForm({ ...admitForm, motherPhone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Ensure basic identity and guardian contacts are filled before finalizing enrollment.
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAdmitModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Admitting...' : t('students.save_student')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Promotion Dialog */}
      {showBulkPromoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('students.bulk_promote')}
                </h3>
                <p className="text-xs text-slate-500">
                  Promote students to next academic level with permanent enrollment history logging.
                </p>
              </div>
              <button
                onClick={() => setShowBulkPromoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class (Next Grade)</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Select Target Class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Section</label>
                  <select
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">Maintain Section / Default</option>
                    {sections
                      .filter((s) => s.classId === targetClassId)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.nameEn}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Student</th>
                      <th className="p-2.5">Decision</th>
                      <th className="p-2.5">New Roll No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {promoteList.map((item, idx) => (
                      <tr key={item.studentId}>
                        <td className="p-2.5 font-medium">
                          {item.name} <span className="text-slate-400 font-mono text-[10px]">({item.studentIdCode})</span>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPromoteList((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, status: val } : p))
                              );
                            }}
                            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                          >
                            <option value="PROMOTED">Promoted (उत्तीर्ण / स्तरोन्नति)</option>
                            <option value="RETAINED">Retained (यही कक्षामा दोहोर्याउने)</option>
                            <option value="TRANSFERRED">Transferred (स्थानान्तरित)</option>
                            <option value="GRADUATED">Graduated (उत्तीर्ण भई बिदा)</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={item.rollNumber}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPromoteList((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, rollNumber: val } : p))
                              );
                            }}
                            className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 bg-slate-50/70 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowBulkPromoteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPromoting || !targetClassId}
                onClick={handleExecutePromotion}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs disabled:opacity-50"
              >
                {isPromoting ? 'Processing...' : 'Confirm Bulk Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import from IEMIS Excel Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'np' ? 'IEMIS Excel बाट विद्यार्थी तथा अभिभावक आयात' : 'Bulk Import Students & Parents from IEMIS Excel'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {language === 'np'
                      ? 'CEHRD को मानक ढाँचा अनुसार विद्यार्थी, ठेगाना र अभिभावकको विवरण एकै पटक आयात गर्नुहोस्।'
                      : 'Upload students, parents, and address records in bulk using CEHRD IEMIS format.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseBulkImport}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Step 1: Download Template or Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Template Card */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-200 text-sm">
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>{language === 'np' ? '१. नमूना Excel ढाँचा डाउनलोड गर्नुहोस्' : '1. Download Sample Excel Template'}</span>
                    </div>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1.5 leading-relaxed">
                      {language === 'np'
                        ? 'यसमा नेपाल सरकारको IEMIS अनुसार आवश्यक पर्ने सबै स्तम्भहरू (Columns) र नमुना पङ्क्तिहरू पहिल्यै मिलाइएका छन्।'
                        : 'Download the pre-formatted CEHRD IEMIS .xlsx spreadsheet with sample rows and column instructions.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadIemisTemplate}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {language === 'np' ? 'IEMIS Template (.xlsx) डाउनलोड' : 'Download IEMIS Template (.xlsx)'}
                  </button>
                </div>

                {/* File Upload Box */}
                <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500 transition flex flex-col items-center justify-center text-center space-y-2 relative cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {importFile ? importFile.name : (language === 'np' ? 'Excel फाइल यहाँ छान्नुहोस् वा तान्नुहोस्' : 'Click or Drag & Drop Excel File here')}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                  {isParsing && (
                    <span className="text-xs text-blue-600 font-semibold animate-pulse">
                      Parsing spreadsheet...
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2: Validation Summary Chips & Filter Tabs */}
              {importParseResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Total Rows: {importParseResult.totalRows}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {importParseResult.validCount} Ready to Import
                      </span>
                      {importParseResult.duplicateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {importParseResult.duplicateCount} Duplicate IEMIS (Blocked)
                        </span>
                      )}
                      {importParseResult.invalidCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                          {importParseResult.invalidCount} Invalid/Incomplete
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {(['ALL', 'VALID', 'DUPLICATE', 'INVALID'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setImportFilterTab(tab)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                            importFilterTab === tab
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {tab === 'ALL' ? 'All Rows' : tab === 'VALID' ? 'Valid Only' : tab === 'DUPLICATE' ? 'Duplicates' : 'Invalid'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duplicate Alert Notice */}
                  {importParseResult.duplicateCount > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">दोहोरिएको IEMIS कोड सुरक्षा (Duplicate Protection Active): </span>
                        {importParseResult.duplicateCount} वटा विद्यार्थीको IEMIS ID पहिले नै प्रणालीमा दर्ता भएकाले वा फाइलभित्र दोहोरिएकाले ती रेकर्डहरू अपलोड नगरिकन सुरक्षित रूपमा हटाइनेछन् (Skipped)।
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2.5">Row</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">IEMIS ID</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5">Class & Section</th>
                          <th className="p-2.5">DOB (BS) / Gender</th>
                          <th className="p-2.5">Father & Phone</th>
                          <th className="p-2.5">Mother</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {importParseResult.rows
                          .filter((r) => {
                            if (importFilterTab === 'VALID') return r.isValid;
                            if (importFilterTab === 'DUPLICATE') return r.isDuplicate;
                            if (importFilterTab === 'INVALID') return !r.isValid && !r.isDuplicate;
                            return true;
                          })
                          .map((row) => (
                            <tr
                              key={row.rowNum}
                              className={
                                row.isDuplicate
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                  : !row.isValid
                                  ? 'bg-red-50/50 dark:bg-red-950/20'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }
                            >
                              <td className="p-2.5 font-mono text-slate-400">#{row.rowNum}</td>
                              <td className="p-2.5">
                                {row.isValid ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                                  </span>
                                ) : row.isDuplicate ? (
                                  <span
                                    title={row.errorReason}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 cursor-help"
                                  >
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Duplicate
                                  </span>
                                ) : (
                                  <span
                                    title={row.errorReason}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 cursor-help"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" /> Error
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {row.iemisCode || '—'}
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {row.fullName || `${row.firstNameEn} ${row.lastNameEn}`.trim()}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {row.permanentAddress || (row.permDistrict ? `${row.permLocalLevel || ''}, ${row.permDistrict}` : '')}
                                </div>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                Grade {row.currentClass || row.classCode} ({row.section || row.sectionCode || 'A'})
                              </td>
                              <td className="p-2.5 font-mono text-[11px]">
                                {row.dobBs} &bull; {row.gender}
                              </td>
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-900 dark:text-slate-200">
                                  {row.fatherNameEn || row.guardianName || '—'}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500">
                                  {row.guardianContactNumber || row.fatherPhone || '—'}
                                </div>
                              </td>
                              <td className="p-2.5 text-slate-700 dark:text-slate-300">
                                {row.motherNameEn || '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Result Notification */}
              {importResultSummary && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <FileCheck2 className="w-5 h-5 text-emerald-600" />
                    <span>{importResultSummary.message}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200">
                      <div className="text-slate-500 text-[10px]">Imported Students</div>
                      <div className="text-lg font-black text-emerald-600">{importResultSummary.importedCount}</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200">
                      <div className="text-slate-500 text-[10px]">Duplicates Skipped</div>
                      <div className="text-lg font-black text-amber-600">{importResultSummary.duplicateCount}</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200">
                      <div className="text-slate-500 text-[10px]">Invalid Rows</div>
                      <div className="text-lg font-black text-red-600">{importResultSummary.invalidCount || 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={handleCloseBulkImport}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {importResultSummary ? 'Done / Close' : 'Cancel'}
              </button>

              {!importResultSummary && (
                <button
                  type="button"
                  disabled={isImporting || !importParseResult || importParseResult.validCount === 0}
                  onClick={handleExecuteBulkImport}
                  className="inline-flex items-center px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                  {isImporting
                    ? 'Importing...'
                    : `Import ${importParseResult?.validCount || 0} Students & Parents`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
