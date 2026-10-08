import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  BookMarked,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  Video,
  FileDown,
  Layers,
  Award,
  TrendingUp,
  UserCheck,
  Send,
  X,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import {
  LmsAssignment,
  LmsSubmission,
  LmsStudyMaterial,
  StudentLearningSummary,
} from '@sms/shared';

export const LearningManagement: React.FC = () => {
  const { language, formatNumber } = useLanguage();
  const isNp = language === 'np';
  const { token, user, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'assignments' | 'evaluations' | 'materials' | 'progress'>('assignments');

  // Core Data
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [materials, setMaterials] = useState<LmsStudyMaterial[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected assignment for evaluation tab
  const [activeAssignment, setActiveAssignment] = useState<LmsAssignment | null>(null);
  const [activeSubmissions, setActiveSubmissions] = useState<LmsSubmission[]>([]);

  // Selected student for progress tab
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSummary, setStudentSummary] = useState<StudentLearningSummary | null>(null);

  // Modals
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState<boolean>(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);
  const [activeSubmissionToGrade, setActiveSubmissionToGrade] = useState<LmsSubmission | null>(null);

  // Loading & Feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [assignmentForm, setAssignmentForm] = useState({
    classId: '',
    sectionId: '',
    subjectId: '',
    title: '',
    description: '',
    attachmentUrl: '',
    attachmentName: '',
    assignedDateBs: '2083-06-22',
    dueDateBs: '2083-06-25',
    totalMarks: '10',
    status: 'ACTIVE' as const,
  });

  const [materialForm, setMaterialForm] = useState({
    classId: '',
    subjectId: '',
    unitName: 'एकाइ १',
    title: '',
    resourceType: 'PDF' as const,
    fileUrl: '',
    fileName: '',
    description: '',
  });

  const [submissionForm, setSubmissionForm] = useState({
    studentId: '',
    content: '',
    attachmentUrl: '',
    attachmentName: '',
  });

  const [gradeForm, setGradeForm] = useState({
    marksObtained: '',
    teacherFeedback: '',
    status: 'CHECKED' as const,
  });

  // Fetch initial metadata (Classes, Subjects, Students)
  useEffect(() => {
    fetchMetadata();
  }, []);

  // Fetch Assignments and Materials when metadata or filters change
  useEffect(() => {
    fetchAssignments();
    fetchMaterials();
  }, [selectedClassId, selectedSubjectId, statusFilter]);

  // Fetch student summary when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentSummary(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchMetadata = async () => {
    try {
      const [classRes, studentRes] = await Promise.all([
        fetch('/api/academic/classes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (classRes.ok) {
        const cData = await classRes.json();
        const clsList = cData.classes || [];
        setClasses(clsList);
        if (clsList.length > 0) {
          // Flatten sections and subjects
          const allSec: any[] = [];
          const allSub: any[] = [];
          clsList.forEach((c: any) => {
            if (c.sections) allSec.push(...c.sections);
            if (c.subjects) allSub.push(...c.subjects);
          });
          setSections(allSec);
          setSubjects(allSub);

          // Default selection
          setAssignmentForm((prev) => ({
            ...prev,
            classId: prev.classId || clsList[0].id,
            sectionId: prev.sectionId || (clsList[0].sections?.[0]?.id || ''),
            subjectId: prev.subjectId || (clsList[0].subjects?.[0]?.id || ''),
          }));
          setMaterialForm((prev) => ({
            ...prev,
            classId: prev.classId || clsList[0].id,
            subjectId: prev.subjectId || (clsList[0].subjects?.[0]?.id || ''),
          }));
        }
      }

      if (studentRes.ok) {
        const sData = await studentRes.json();
        const stdList = sData.students || [];
        setStudents(stdList);
        if (stdList.length > 0 && !selectedStudentId) {
          setSelectedStudentId(stdList[0].id);
          setSubmissionForm((prev) => ({ ...prev, studentId: stdList[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let url = '/api/learning/assignments?';
      if (selectedClassId) url += `classId=${selectedClassId}&`;
      if (selectedSubjectId) url += `subjectId=${selectedSubjectId}&`;
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      let url = '/api/learning/materials?';
      if (selectedClassId) url += `classId=${selectedClassId}&`;
      if (selectedSubjectId) url += `subjectId=${selectedSubjectId}&`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  const fetchAssignmentDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/learning/assignments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAssignment(data.assignment);
        setActiveSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Error fetching assignment submissions:', err);
    }
  };

  const fetchStudentSummary = async (studentId: string) => {
    try {
      const res = await fetch(`/api/learning/students/${studentId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching student summary:', err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/learning/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assignmentForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'गृहकार्य सिर्जना गर्न सकिएन');

      setSuccess('नयाँ गृहकार्य सफलतापूर्वक सिर्जना गरियो।');
      setShowAddAssignmentModal(false);
      setAssignmentForm((prev) => ({ ...prev, title: '', description: '', attachmentUrl: '' }));
      await fetchAssignments();
    } catch (err: any) {
      setError(err.message || 'गृहकार्य सिर्जना असफल');
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/learning/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(materialForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'पाठ्य सामग्री थप्न सकिएन');

      setSuccess('डिजिटल पाठ्य सामग्री सफलतापूर्वक थपियो।');
      setShowAddMaterialModal(false);
      setMaterialForm((prev) => ({ ...prev, title: '', fileUrl: '', description: '' }));
      await fetchMaterials();
    } catch (err: any) {
      setError(err.message || 'पाठ्य सामग्री थप्न असफल');
    }
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;
    setError(null);
    try {
      const res = await fetch(`/api/learning/assignments/${activeAssignment.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submissionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'समाधान बुझाउन असफल');

      setSuccess('गृहकार्य समाधान सफलतापूर्वक बुझाइयो।');
      setShowSubmitModal(false);
      await fetchAssignmentDetails(activeAssignment.id);
      await fetchAssignments();
      if (submissionForm.studentId) {
        await fetchStudentSummary(submissionForm.studentId);
      }
    } catch (err: any) {
      setError(err.message || 'समाधान बुझाउन असफल');
    }
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmissionToGrade || !activeAssignment) return;
    setError(null);
    try {
      const res = await fetch(`/api/learning/submissions/${activeSubmissionToGrade.id}/evaluate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(gradeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'जाँच सुरक्षित गर्न सकिएन');

      setSuccess('गृहकार्य सफलतापूर्वक जाँचियो र पृष्ठपोषण सुरक्षित भयो।');
      setShowEvaluationModal(false);
      await fetchAssignmentDetails(activeAssignment.id);
      if (activeSubmissionToGrade.studentId) {
        await fetchStudentSummary(activeSubmissionToGrade.studentId);
      }
    } catch (err: any) {
      setError(err.message || 'जाँच सुरक्षित गर्न असफल');
    }
  };

  const handleToggleAssignmentStatus = async (assignment: LmsAssignment) => {
    const nextStatus = assignment.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    try {
      await fetch(`/api/learning/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो गृहकार्य हटाउन चाहनुहुन्छ?' : 'Are you sure you want to delete this assignment?')) return;
    try {
      await fetch(`/api/learning/assignments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm(isNp ? 'के तपाईं यो पाठ्य सामग्री हटाउन चाहनुहुन्छ?' : 'Are you sure you want to delete this material?')) return;
    try {
      await fetch(`/api/learning/materials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.className && a.className.toLowerCase().includes(q)) ||
      (a.subjectName && a.subjectName.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5">
            <BookMarked className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>{isNp ? 'विद्यार्थी सिकाइ तथा शिक्षण व्यवस्थापन (LMS)' : 'Student Learning & LMS Management'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">
            {isNp
              ? 'दैनिक गृहकार्य, डिजिटल पाठ्य सामग्री, विद्यार्थी समाधान जाँच, र सिकाइ प्रगतिको एकीकृत व्यवस्थापन'
              : 'Integrated homework management, digital study materials, student submissions evaluation, and learning analytics'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowAddAssignmentModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isNp ? '+ नयाँ गृहकार्य तोक्नुहोस्' : '+ Assign Homework'}</span>
          </button>
          <button
            onClick={() => setShowAddMaterialModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center space-x-2"
          >
            <FileDown className="w-4 h-4" />
            <span>{isNp ? '+ पाठ्य सामग्री थप्नुहोस्' : '+ Add Study Material'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm rounded-xl flex items-center justify-between font-medium">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm rounded-xl flex items-center justify-between font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{isNp ? 'कुल गृहकार्य' : 'Total Assignments'}</span>
            <BookMarked className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatNumber(assignments.length)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isNp ? 'सबै कक्षा र विषयहरू' : 'Across all grades & subjects'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{isNp ? 'सक्रिय गृहकार्य' : 'Active Assignments'}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatNumber(assignments.filter((a) => a.status === 'ACTIVE').length)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isNp ? 'हाल बुझाउन बाँकी कार्य' : 'Currently open for submission'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{isNp ? 'डिजिटल पाठ्य सामग्री' : 'Study Materials'}</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatNumber(materials.length)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isNp ? 'नोट, पीडीएफ र भिडियो' : 'PDFs, Videos, and Notes'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{isNp ? 'सिकाइ नियमितता दर' : 'Submission Rate'}</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {studentSummary ? `${formatNumber(studentSummary.submissionRate)}%` : '85%'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isNp ? 'औसत विद्यार्थी सहभागिता' : 'Average student participation'}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-1.5 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'assignments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>{isNp ? 'दैनिक गृहकार्य तथा असाइनमेन्ट' : 'Assignments & Homework'}</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluations')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'evaluations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{isNp ? 'गृहकार्य जाँच तथा मूल्यांकन' : 'Evaluation & Grading'}</span>
          {activeSubmissions.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-extrabold">
              {formatNumber(activeSubmissions.length)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'materials'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isNp ? 'डिजिटल पाठ्य सामग्री तथा नोट' : 'Study Materials & Notes'}</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'progress'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{isNp ? 'विद्यार्थी सिकाइ प्रगति तथा उपचारात्मक' : 'Learning Analytics & Remedial'}</span>
        </button>
      </div>

      {/* Filter Bar (for assignments and materials) */}
      {(activeTab === 'assignments' || activeTab === 'materials') && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isNp ? 'शीर्षक वा पाठ खोज्नुहोस्...' : 'Search assignments or materials...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="">{isNp ? 'सबै कक्षाहरू (All Classes)' : 'All Classes'}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameNp || c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="">{isNp ? 'सबै विषयहरू (All Subjects)' : 'All Subjects'}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameNp || s.nameEn}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'assignments' && (
            <div className="w-full sm:w-36">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">{isNp ? 'सबै स्थिति' : 'All Status'}</option>
                <option value="ACTIVE">{isNp ? 'सक्रिय (Active)' : 'Active'}</option>
                <option value="CLOSED">{isNp ? 'बन्द (Closed)' : 'Closed'}</option>
              </select>
            </div>
          )}

          <button
            onClick={() => {
              fetchAssignments();
              fetchMaterials();
            }}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            title="रिफ्रेस गर्नुहोस्"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* TAB 1: DAILY HOMEWORK & ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <BookMarked className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isNp ? 'कुनै गृहकार्य फेला परेन' : 'No Assignments Found'}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {isNp
                  ? 'माथि रहेको "+ नयाँ गृहकार्य तोक्नुहोस्" बटन क्लिक गरी विद्यार्थीहरूलाई आजको गृहकार्य दिनुहोस्।'
                  : 'Click "+ Assign Homework" button above to assign homework to students.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="assignments-grid">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {assignment.className || 'कक्षा'} {assignment.sectionName ? `(${assignment.sectionName})` : ''}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          assignment.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {assignment.status === 'ACTIVE'
                          ? isNp
                            ? 'सक्रिय (Active)'
                            : 'Active'
                          : isNp
                          ? 'बन्द (Closed)'
                          : 'Closed'}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {assignment.subjectName || 'अनिवार्य विषय'}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
                        {assignment.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {assignment.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">{isNp ? 'म्याद:' : 'Due Date:'} </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{assignment.dueDateBs}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">{isNp ? 'पूर्णांक:' : 'Marks:'} </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatNumber(assignment.totalMarks || 10)}
                        </span>
                      </div>
                    </div>

                    {assignment.attachmentUrl && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg flex items-center justify-between text-xs">
                        <span className="truncate max-w-[180px] text-slate-600 dark:text-slate-300 font-medium">
                          📎 {assignment.attachmentName || 'प्रश्नपत्र / सामग्री'}
                        </span>
                        <a
                          href={assignment.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 font-bold shrink-0 inline-flex items-center space-x-1"
                        >
                          <span>हेर्नुहोस्</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setActiveAssignment(assignment);
                        fetchAssignmentDetails(assignment.id);
                        setActiveTab('evaluations');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {isNp ? 'जाँच्नुहोस्' : 'Evaluate'} ({formatNumber(assignment.submissionsCount || 0)})
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAssignment(assignment);
                        setShowSubmitModal(true);
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition"
                      title={isNp ? 'विद्यार्थीको समाधान बुझाउनुहोस्' : 'Submit as student'}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleAssignmentStatus(assignment)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                      title={assignment.status === 'ACTIVE' ? 'बन्द गर्नुहोस्' : 'सक्रिय गर्नुहोस्'}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold transition"
                      title="हटाउनुहोस्"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVALUATION & GRADING */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'जाँच गर्न गृहकार्य छनोट गर्नुहोस्:' : 'Select Assignment to Evaluate:'}
              </label>
              <select
                value={activeAssignment?.id || ''}
                onChange={(e) => {
                  const found = assignments.find((a) => a.id === e.target.value);
                  setActiveAssignment(found || null);
                  if (found) fetchAssignmentDetails(found.id);
                }}
                className="w-full sm:max-w-md px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="">{isNp ? '-- गृहकार्य छान्नुहोस् --' : '-- Choose Assignment --'}</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.className} - {a.subjectName}] {a.title} (म्याद: {a.dueDateBs})
                  </option>
                ))}
              </select>
            </div>

            {activeAssignment && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isNp ? '+ समाधान बुझाउनुहोस् (Submit)' : '+ Submit Solution'}</span>
                </button>
              </div>
            )}
          </div>

          {!activeAssignment ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <UserCheck className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isNp ? 'कृपया जाँच्नका लागि कुनै एक गृहकार्य छान्नुहोस्' : 'Please select an assignment to view submissions'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isNp
                  ? 'माथिको ड्रपडाउनबाट गृहकार्य छनोट गरेपछि विद्यार्थीहरूले बुझाएका समाधानहरू देखिनेछन्।'
                  : 'Select an assignment from above to inspect and grade student submissions.'}
              </p>
            </div>
          ) : activeSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Clock className="w-12 h-12 mx-auto text-amber-500 mb-3" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isNp ? 'यस गृहकार्यमा अहिलेसम्म कुनै विद्यार्थीले समाधान बुझाएका छैनन्' : 'No submissions received yet'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isNp
                  ? 'विद्यार्थीको तर्फबाट समाधान परीक्षण गर्न माथिको "+ समाधान बुझाउनुहोस्" बटन प्रयोग गर्न सक्नुहुन्छ।'
                  : 'You can use the "+ Submit Solution" button above to simulate a student submission.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {activeAssignment.title} — {isNp ? 'बुझाइएका समाधानहरूको सूची' : 'Student Submissions'}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {activeAssignment.className} • {activeAssignment.subjectName} • {isNp ? 'पूर्णांक:' : 'Total Marks:'}{' '}
                    {formatNumber(activeAssignment.totalMarks || 10)}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {isNp ? 'कुल समाधान:' : 'Total:'} {formatNumber(activeSubmissions.length)}
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {activeSubmissions.map((sub) => (
                  <div key={sub.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {sub.studentName}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({sub.studentCode || 'STU-ID'})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              sub.status === 'CHECKED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : sub.status === 'LATE'
                                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {sub.status === 'CHECKED'
                              ? isNp
                                ? 'जाँचिएको (Checked)'
                                : 'Checked'
                              : sub.status === 'LATE'
                              ? isNp
                                ? 'ढिलो बुझाइएको (Late)'
                                : 'Late'
                              : isNp
                              ? 'बुझाइएको (Submitted)'
                              : 'Submitted'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-slate-500">{isNp ? 'समाधान / उत्तर:' : 'Answer:'} </span>
                          <span>{sub.content || 'कुनै लिखित उत्तर छैन'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                        {sub.marksObtained !== null && sub.marksObtained !== undefined ? (
                          <div className="text-right">
                            <span className="text-xs text-slate-500">{isNp ? 'प्राप्त अंक:' : 'Marks:'} </span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              {formatNumber(sub.marksObtained)} / {formatNumber(activeAssignment.totalMarks || 10)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-bold">
                            {isNp ? 'जाँच्न बाँकी' : 'Ungraded'}
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setActiveSubmissionToGrade(sub);
                            setGradeForm({
                              marksObtained: sub.marksObtained !== null ? String(sub.marksObtained) : '',
                              teacherFeedback: sub.teacherFeedback || '',
                              status: 'CHECKED',
                            });
                            setShowEvaluationModal(true);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 active:scale-95"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{sub.status === 'CHECKED' ? (isNp ? 'पुनः जाँच्नुहोस्' : 'Regrade') : (isNp ? 'जाँच्नुहोस्' : 'Grade & Feedback')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Teacher Remarks if checked */}
                    {sub.teacherFeedback && (
                      <div className="mt-3 p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isNp ? 'शिक्षकको पृष्ठपोषण (Feedback):' : 'Teacher Feedback:'} </span>
                          <span>{sub.teacherFeedback}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIGITAL STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {materials.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                {isNp ? 'कुनै पाठ्य सामग्री फेला परेन' : 'No Study Materials Found'}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {isNp
                  ? 'माथि रहेको "+ पाठ्य सामग्री थप्नुहोस्" बटन प्रयोग गरी अध्यायगत नोट, पीडीएफ वा भिडियो लिङ्क अपलोड गर्नुहोस्।'
                  : 'Click "+ Add Study Material" above to upload notes, PDFs or educational videos.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="materials-grid">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {mat.className || 'कक्षा'} • {mat.subjectName || 'विषय'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {mat.resourceType}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {mat.unitName}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
                        {mat.title}
                      </h3>
                    </div>

                    {mat.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {mat.description}
                      </p>
                    )}

                    <div className="pt-2 text-[11px] text-slate-500">
                      {isNp ? 'अपलोडकर्ता:' : 'Uploaded by:'} {mat.uploadedByName || 'शिक्षक'}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isNp ? 'सामग्री खोल्नुहोस्' : 'Open Resource'}</span>
                    </a>

                    <button
                      onClick={() => handleDeleteMaterial(mat.id)}
                      className="py-1.5 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold transition"
                      title="हटाउनुहोस्"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STUDENT LEARNING ANALYTICS & REMEDIAL SUPPORT */}
      {activeTab === 'progress' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isNp ? 'सिकाइ प्रगति हेर्न विद्यार्थी छनोट गर्नुहोस्:' : 'Select Student to View Progress:'}
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full sm:max-w-md px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.studentId}] {s.firstNameNp || s.firstNameEn} {s.lastNameNp || s.lastNameEn}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudentId && (
              <button
                onClick={() => fetchStudentSummary(selectedStudentId)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isNp ? 'रिफ्रेस' : 'Refresh'}</span>
              </button>
            )}
          </div>

          {studentSummary ? (
            <div className="space-y-5" id="student-progress-card">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                    {isNp ? 'कुल गृहकार्य' : 'Assigned'}
                  </div>
                  <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100 mt-1">
                    {formatNumber(studentSummary.totalAssignments)}
                  </div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    {isNp ? 'बुझाइएका कार्य' : 'Submitted'}
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
                    {formatNumber(studentSummary.submittedCount)}
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    {isNp ? 'बुझाउने नियमितता' : 'Submission Rate'}
                  </div>
                  <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">
                    {formatNumber(studentSummary.submissionRate)}%
                  </div>
                </div>

                <div className="bg-purple-50/50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                    {isNp ? 'औसत अंक' : 'Average Score'}
                  </div>
                  <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">
                    {typeof studentSummary.averageMarks === 'number' ? formatNumber(studentSummary.averageMarks) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{isNp ? 'सिकाइ प्रतिबद्धता दर (Completion Rate):' : 'Completion Rate:'}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatNumber(studentSummary.submissionRate)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, studentSummary.submissionRate)}%` }}
                  />
                </div>
              </div>

              {/* Remedial Feedback History */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isNp ? 'शिक्षकका उपचारात्मक सुझावहरू (Teacher Remedial Remarks):' : 'Teacher Remedial Remarks:'}</span>
                </h3>

                {studentSummary.remedialRemarks && studentSummary.remedialRemarks.length > 0 ? (
                  <div className="space-y-2">
                    {studentSummary.remedialRemarks.map((remark, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isNp ? `सुझाव #${idx + 1}: ` : `Remark #${idx + 1}: `}</span>
                          <span>{remark}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    {isNp
                      ? 'यस विद्यार्थीका लागि कुनै उपचारात्मक सुझाव लेखिएको छैन। विद्यार्थीको सिकाइ प्रगति सामान्य छ।'
                      : 'No remedial remarks recorded yet. Learning progress is normal.'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">{isNp ? 'विवरण लोड हुँदैछ...' : 'Loading summary...'}</span>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD ASSIGNMENT */}
      {showAddAssignmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <BookMarked className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'नयाँ गृहकार्य तोक्नुहोस् (Assign Homework)' : 'Assign New Homework'}</span>
              </h3>
              <button
                onClick={() => setShowAddAssignmentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'कक्षा (Class) *' : 'Class *'}
                  </label>
                  <select
                    value={assignmentForm.classId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, classId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameNp || c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'विषय (Subject) *' : 'Subject *'}
                  </label>
                  <select
                    value={assignmentForm.subjectId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameNp || s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'गृहकार्य शीर्षक (Title) *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isNp ? 'उदा: अध्याय ३ अभ्यास ३.२ प्रश्न १ देखि १०' : 'e.g. Chapter 3 Exercise 3.2'}
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विस्तृत निर्देशन (Instructions)' : 'Instructions'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isNp ? 'गर्नुपर्ने अभ्यास तथा निर्देशनहरू यहाँ लेख्नुहोस्...' : 'Write detailed instructions...'}
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'बुझाउने म्याद वि.सं. (Due Date BS) *' : 'Due Date BS *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DD"
                    value={assignmentForm.dueDateBs}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDateBs: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'पूर्णांक (Total Marks)' : 'Total Marks'}
                  </label>
                  <input
                    type="number"
                    value={assignmentForm.totalMarks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, totalMarks: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'संलग्न प्रश्नपत्र/फाइल लिङ्क (ऐच्छिक)' : 'Attachment Link (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="https://... or PDF URL"
                  value={assignmentForm.attachmentUrl}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, attachmentUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssignmentModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md"
                >
                  {isNp ? 'गृहकार्य सुरक्षित गर्नुहोस्' : 'Assign Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD STUDY MATERIAL */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileDown className="w-5 h-5 text-emerald-600" />
                <span>{isNp ? 'पाठ्य सामग्री तथा नोट थप्नुहोस्' : 'Add Study Material & Notes'}</span>
              </h3>
              <button
                onClick={() => setShowAddMaterialModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'कक्षा (Class) *' : 'Class *'}
                  </label>
                  <select
                    value={materialForm.classId}
                    onChange={(e) => setMaterialForm({ ...materialForm, classId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameNp || c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'विषय (Subject) *' : 'Subject *'}
                  </label>
                  <select
                    value={materialForm.subjectId}
                    onChange={(e) => setMaterialForm({ ...materialForm, subjectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameNp || s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'एकाइ / पाठ (Unit Name) *' : 'Unit Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isNp ? 'उदा: एकाइ ३: हाम्रो अर्थतन्त्र' : 'e.g. Unit 3'}
                    value={materialForm.unitName}
                    onChange={(e) => setMaterialForm({ ...materialForm, unitName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'प्रकार (Resource Type) *' : 'Type *'}
                  </label>
                  <select
                    value={materialForm.resourceType}
                    onChange={(e) => setMaterialForm({ ...materialForm, resourceType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="PDF">PDF Documents</option>
                    <option value="VIDEO_URL">Video Link (YouTube)</option>
                    <option value="IMAGE">Image / Diagrams</option>
                    <option value="DOCUMENT">Doc / Presentation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'सामग्री शीर्षक (Title) *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isNp ? 'उदा: अध्याय ३ को पूर्ण सारांश र अभ्यास समाधान' : 'e.g. Chapter 3 Complete Notes'}
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'सामग्री लिङ्क वा फाइल URL *' : 'File URL / Video Link *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://... or /notes/chapter3.pdf"
                  value={materialForm.fileUrl}
                  onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विवरण (Description)' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isNp ? 'सामग्री सम्बन्धी संक्षिप्त विवरण...' : 'Brief description...'}
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md"
                >
                  {isNp ? 'सामग्री थप्नुहोस्' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STUDENT HOMEWORK SUBMISSION (SIMULATOR) */}
      {showSubmitModal && activeAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'विद्यार्थी समाधान बुझाउने विन्डो (Submit Solution)' : 'Submit Homework Solution'}</span>
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHomework} className="p-5 space-y-4">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
                <div className="font-extrabold text-indigo-900 dark:text-indigo-200">{activeAssignment.title}</div>
                <div className="text-indigo-700 dark:text-indigo-300 mt-1">{activeAssignment.description}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'विद्यार्थी (Student) *' : 'Student *'}
                </label>
                <select
                  value={submissionForm.studentId}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, studentId: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.studentId}] {s.firstNameNp || s.firstNameEn} {s.lastNameNp || s.lastNameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'समाधान / उत्तर (Answer / Solution Text) *' : 'Answer Content *'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={isNp ? 'गृहकार्यको समाधान वा उत्तर यहाँ प्रविष्टि गर्नुहोस्...' : 'Write solution here...'}
                  value={submissionForm.content}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'संलग्न समाधान फाइल/फोटो (ऐच्छिक)' : 'Attachment URL (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="https://... or solution-photo.jpg"
                  value={submissionForm.attachmentUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, attachmentUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md"
                >
                  {isNp ? 'समाधान बुझाउनुहोस्' : 'Submit Solution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TEACHER EVALUATION & GRADING */}
      {showEvaluationModal && activeSubmissionToGrade && activeAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>{isNp ? 'गृहकार्य जाँच तथा मूल्यांकन (Grading & Feedback)' : 'Grade Homework'}</span>
              </h3>
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  विद्यार्थी: {activeSubmissionToGrade.studentName} ({activeSubmissionToGrade.studentCode})
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-1">
                  <b>विद्यार्थीको उत्तर:</b> {activeSubmissionToGrade.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'प्राप्त अंक (Marks Obtained) *' : 'Marks Obtained *'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    max={activeAssignment.totalMarks || 10}
                    required
                    placeholder={`Max ${activeAssignment.totalMarks || 10}`}
                    value={gradeForm.marksObtained}
                    onChange={(e) => setGradeForm({ ...gradeForm, marksObtained: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-extrabold text-base"
                  />
                  <span className="text-[10px] text-slate-500">
                    पूर्णांक: {activeAssignment.totalMarks || 10}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'जाँचको अवस्था (Status) *' : 'Status *'}
                  </label>
                  <select
                    value={gradeForm.status}
                    onChange={(e) => setGradeForm({ ...gradeForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="CHECKED">{isNp ? 'जाँचिएको (Checked)' : 'Checked'}</option>
                    <option value="NEEDS_REVISION">{isNp ? 'सुधार आवश्यक (Needs Revision)' : 'Needs Revision'}</option>
                    <option value="REJECTED">{isNp ? 'अस्वीकृत (Rejected)' : 'Rejected'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'शिक्षकको पृष्ठपोषण तथा उपचारात्मक टिप्पणी (Teacher Remarks)' : 'Teacher Remarks'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isNp ? 'उदा: राम्रो प्रयास छ। सूत्र तथा व्याकरणमा अझ ध्यान दिनुहोला।' : 'Write feedback...'}
                  value={gradeForm.teacherFeedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, teacherFeedback: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEvaluationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md"
                >
                  {isNp ? 'जाँच सुरक्षित गर्नुहोस्' : 'Save Grade & Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
