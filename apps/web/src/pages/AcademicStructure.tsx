import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import {
  GraduationCap,
  Layers,
  BookOpen,
  Calendar,
  Plus,
  CheckCircle2,
  Users,
  Clock,
  Sparkles,
  X,
  AlertCircle,
  Flag,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  Trophy,
  Award,
  Medal,
  Shuffle,
  Eye,
  Activity,
  Save,
} from 'lucide-react';

export const AcademicStructure: React.FC = () => {
  const { language, t, formatNumber } = useLanguage();
  const { hasRole } = useAuth();
  const { refreshSchool } = useSchool();
  const isPrincipalOrAdmin = hasRole('PRINCIPAL') || hasRole('SYSTEM_ADMIN');

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'houses' | 'years'>('classes');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Academic Year Modal State
  const [showAddYear, setShowAddYear] = useState(false);
  const [yearSaving, setYearSaving] = useState(false);
  const [yearForm, setYearForm] = useState({
    yearBs: 2084,
    startDateBs: '2084-01-01',
    endDateBs: '2084-12-30',
    startDateAd: '2027-04-14',
    endDateAd: '2028-04-13',
    isCurrent: false,
  });

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
      setShowAddYear(false);
      fetchAcademicData();
      if (yearForm.isCurrent) {
        await refreshSchool();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create academic year');
    } finally {
      setYearSaving(false);
    }
  };

  const handleActivateYear = async (year: any) => {
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/years/${year.id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to activate academic year');
      fetchAcademicData();
      await refreshSchool();
    } catch (err: any) {
      alert(err.message || 'Failed to activate academic year');
    }
  };

  // Modal states
  const [showAddSection, setShowAddSection] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    classId: '',
    streamId: '',
    code: 'A',
    nameEn: 'Section A',
    nameNp: 'खण्ड क',
    shift: 'DAY',
    capacity: 45,
    roomNumber: '',
    classTeacherId: '',
  });

  // Edit & Delete Section state
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [editSectionForm, setEditSectionForm] = useState({
    classId: '',
    streamId: '',
    code: '',
    nameEn: '',
    nameNp: '',
    shift: 'DAY',
    capacity: 45,
    roomNumber: '',
    classTeacherId: '',
  });
  const [deletingSection, setDeletingSection] = useState<any | null>(null);

  // Subject filtering & search
  const [subjectStageFilter, setSubjectStageFilter] = useState<'ALL' | 'ECD' | 'BASIC_1_3' | 'BASIC_4_5' | 'BASIC_6_8' | 'SEC_9_10' | 'HIGHER_SEC_11_12'>('ALL');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [subjectFilterClassId, setSubjectFilterClassId] = useState('');
  const [subjectFilterSectionId, setSubjectFilterSectionId] = useState('');

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    classId: '',
    streamId: '',
    sectionId: '',
    optionalGroup: '',
    code: '',
    nameEn: '',
    nameNp: '',
    isOptional: false,
    creditHours: 4,
    theoryFullMarks: 75,
    practicalFullMarks: 25,
    theoryPassMarks: 27,
    practicalPassMarks: 10,
  });

  // Edit & Delete Subject state
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState({
    classId: '',
    streamId: '',
    sectionId: '',
    optionalGroup: '',
    code: '',
    nameEn: '',
    nameNp: '',
    isOptional: false,
    creditHours: 4,
    theoryFullMarks: 75,
    practicalFullMarks: 25,
    theoryPassMarks: 27,
    practicalPassMarks: 10,
  });
  const [deletingSubject, setDeletingSubject] = useState<any | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // House & Activities state
  const [houseActivities, setHouseActivities] = useState<any[]>([]);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('ALL');

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedHouseForMembers, setSelectedHouseForMembers] = useState<any | null>(null);
  const [houseMembers, setHouseMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [autoAssignClassId, setAutoAssignClassId] = useState('');
  const [forceReassign, setForceReassign] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    titleNp: '',
    category: 'SPORTS',
    eventDateBs: '2081-08-15',
    description: '',
    firstHouseId: '',
    firstPoints: 100,
    secondHouseId: '',
    secondPoints: 60,
    thirdHouseId: '',
    thirdPoints: 40,
    participatingHouses: 'All Houses (सबै सदनहरू)',
  });

  const [showEditLeadershipModal, setShowEditLeadershipModal] = useState(false);
  const [selectedHouseForLeadership, setSelectedHouseForLeadership] = useState<any | null>(null);
  const [leadershipForm, setLeadershipForm] = useState({
    masterTeacherName: '',
    captainStudentName: '',
    viceCaptainStudentName: '',
  });
  const [isSavingLeadership, setIsSavingLeadership] = useState(false);

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const fetchAcademicData = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [cRes, sRes, strRes, subRes, hRes, yRes, stfRes, actRes] = await Promise.all([
        fetch('/api/academic/classes', { headers }),
        fetch('/api/academic/sections', { headers }),
        fetch('/api/academic/streams', { headers }),
        fetch('/api/academic/subjects', { headers }),
        fetch('/api/academic/houses', { headers }),
        fetch('/api/academic/years', { headers }),
        fetch('/api/staff?category=TEACHING', { headers }),
        fetch('/api/academic/houses/activities', { headers }),
      ]);

      if (cRes.ok && sRes.ok && strRes.ok && subRes.ok && hRes.ok && yRes.ok) {
        const cData = await cRes.json();
        const sData = await sRes.json();
        const strData = await strRes.json();
        const subData = await subRes.json();
        const hData = await hRes.json();
        const yData = await yRes.json();
        const stfData = stfRes && stfRes.ok ? await stfRes.json() : null;
        const actData = actRes && actRes.ok ? await actRes.json() : null;

        setClasses(cData.classes || []);
        setSections(sData.sections || []);
        setStreams(strData.streams || []);
        setSubjects(subData.subjects || []);
        setHouses(hData.houses || []);
        setYears(yData.academicYears || []);
        if (stfData) setTeachersList(stfData.staff || []);
        if (actData) setHouseActivities(actData.activities || []);

        if (cData.classes?.length > 0 && !sectionForm.classId) {
          setSectionForm((prev) => ({ ...prev, classId: cData.classes[0].id }));
          setSubjectForm((prev) => ({ ...prev, classId: cData.classes[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch academic data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHouseMembers = async (house: any) => {
    setSelectedHouseForMembers(house);
    setShowMembersModal(true);
    setMembersLoading(true);
    setMemberSearchTerm('');
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/houses/${house.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHouseMembers(data.members || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleTransferStudent = async (studentId: string, targetHouseId: string) => {
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/houses/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId, houseId: targetHouseId }),
      });
      if (res.ok) {
        if (selectedHouseForMembers) {
          handleOpenHouseMembers(selectedHouseForMembers);
        }
        fetchAcademicData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAutoAssigning(true);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/houses/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: autoAssignClassId || undefined,
          forceReassign,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMsg({ type: 'success', text: data.message || 'Students successfully assigned to houses' });
        setShowAutoAssignModal(false);
        fetchAcademicData();
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Auto-assign failed' });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleOpenEditLeadership = (house: any) => {
    setSelectedHouseForLeadership(house);
    setLeadershipForm({
      masterTeacherName: house.masterTeacherName || '',
      captainStudentName: house.captainStudentName || '',
      viceCaptainStudentName: house.viceCaptainStudentName || '',
    });
    setShowEditLeadershipModal(true);
  };

  const handleSaveLeadershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseForLeadership) return;
    setIsSavingLeadership(true);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/houses/${selectedHouseForLeadership.id}/leadership`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leadershipForm),
      });
      if (res.ok) {
        setShowEditLeadershipModal(false);
        fetchAcademicData();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSavingLeadership(false);
    }
  };

  const handleCreateActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingActivity(true);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/houses/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(activityForm),
      });
      if (res.ok) {
        setShowAddActivityModal(false);
        setActivityForm({
          title: '',
          titleNp: '',
          category: 'SPORTS',
          eventDateBs: '2081-08-15',
          description: '',
          firstHouseId: '',
          firstPoints: 100,
          secondHouseId: '',
          secondPoints: 60,
          thirdHouseId: '',
          thirdPoints: 40,
          participatingHouses: 'All Houses (सबै सदनहरू)',
        });
        fetchAcademicData();
        setMsg({ type: 'success', text: 'ECA activity recorded successfully.' });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsCreatingActivity(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity record?')) return;
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/houses/activities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAcademicData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/academic/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sectionForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create section');
      }

      setMsg({ type: 'success', text: 'New section created successfully!' });
      setShowAddSection(false);
      fetchAcademicData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const isOpt = ['OPT_1', 'OPT_2', 'STREAM_ELECTIVE'].includes(subjectForm.optionalGroup) || Boolean(subjectForm.isOptional);
      const res = await fetch('/api/academic/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...subjectForm,
          streamId: subjectForm.streamId || null,
          sectionId: subjectForm.sectionId || null,
          optionalGroup: subjectForm.optionalGroup || null,
          isOptional: isOpt,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create subject');
      }

      setMsg({ type: 'success', text: 'New subject added successfully!' });
      setShowAddSubject(false);
      fetchAcademicData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  // Section Action Handlers
  const openEditSection = (sec: any) => {
    setEditingSection(sec);
    setEditSectionForm({
      classId: sec.classId || '',
      streamId: sec.streamId || '',
      code: sec.code || '',
      nameEn: sec.nameEn || '',
      nameNp: sec.nameNp || '',
      shift: sec.shift || 'DAY',
      capacity: sec.capacity || 45,
      roomNumber: sec.roomNumber || '',
      classTeacherId: sec.classTeacherId || '',
    });
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editSectionForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update section');
      }

      setMsg({ type: 'success', text: `Section "${editSectionForm.nameEn}" updated successfully!` });
      setEditingSection(null);
      fetchAcademicData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSection) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/sections/${deletingSection.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete section');
      }

      setMsg({ type: 'success', text: data.message || `Section deleted successfully!` });
      setDeletingSection(null);
      fetchAcademicData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
      setDeletingSection(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Subject Action Handlers
  const openEditSubject = (sub: any) => {
    setEditingSubject(sub);
    setEditSubjectForm({
      classId: sub.classId || '',
      streamId: sub.streamId || '',
      sectionId: sub.sectionId || '',
      optionalGroup: sub.optionalGroup || (sub.isOptional ? 'OPT_1' : ''),
      code: sub.code || '',
      nameEn: sub.nameEn || '',
      nameNp: sub.nameNp || '',
      isOptional: Boolean(sub.isOptional),
      creditHours: sub.creditHours || 4,
      theoryFullMarks: sub.theoryFullMarks ?? 75,
      practicalFullMarks: sub.practicalFullMarks ?? 25,
      theoryPassMarks: sub.theoryPassMarks ?? 27,
      practicalPassMarks: sub.practicalPassMarks ?? 10,
    });
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const isOpt = ['OPT_1', 'OPT_2', 'STREAM_ELECTIVE'].includes(editSubjectForm.optionalGroup) || Boolean(editSubjectForm.isOptional);
      const res = await fetch(`/api/academic/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editSubjectForm,
          streamId: editSubjectForm.streamId || null,
          sectionId: editSubjectForm.sectionId || null,
          optionalGroup: editSubjectForm.optionalGroup || null,
          isOptional: isOpt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update subject');
      }

      setMsg({ type: 'success', text: `Subject "${editSubjectForm.nameEn}" updated successfully!` });
      setEditingSubject(null);
      fetchAcademicData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/academic/subjects/${deletingSubject.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete subject');
      }

      setMsg({ type: 'success', text: data.message || `Subject deleted successfully!` });
      setDeletingSubject(null);
      fetchAcademicData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
      setDeletingSubject(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Loading Academic Structure...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t('academic.title')}</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            {t('academic.subtitle')}
          </p>
        </div>

        {isPrincipalOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSection(true)}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('academic.add_section')}
            </button>
            <button
              onClick={() => setShowAddSubject(true)}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-2xs"
            >
              <Plus className="w-4 h-4 mr-1 text-indigo-600 dark:text-indigo-400" />
              {t('academic.add_subject')}
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'classes', label: t('academic.classes'), icon: Layers },
          { id: 'subjects', label: t('academic.subjects'), icon: BookOpen },
          { id: 'houses', label: t('academic.houses'), icon: Flag },
          { id: 'years', label: t('academic.years'), icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Classes & Sections Grid */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const isHigherSec = c.hasStreams || ['11', '12'].includes(c.code);
            const classSections = sections.filter((s) => s.classId === c.id);
            const classSubjects = subjects.filter((sub) => sub.classId === c.id);

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        isHigherSec
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {isHigherSec ? 'HIGHER_SECONDARY (+२ संकाय)' : c.stage}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                      {language === 'np' ? c.nameNp : c.nameEn}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {language === 'np' ? c.nameEn : c.nameNp}
                    </div>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                    {formatNumber(c.code)}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-1.5 font-medium">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>{formatNumber(classSections.length)} Sections</span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{formatNumber(classSubjects.length)} Subjects</span>
                  </div>
                </div>

                {/* Section Cards */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Configured Sections ({formatNumber(classSections.length)}):</span>
                    {isPrincipalOrAdmin && (
                      <button
                        onClick={() => {
                          const nextCode = String.fromCharCode(65 + classSections.length);
                          const defaultStr = isHigherSec && streams.length > 0 ? streams[0] : null;
                          setSectionForm({
                            classId: c.id,
                            streamId: defaultStr ? defaultStr.id : '',
                            code: nextCode,
                            nameEn: defaultStr ? `${defaultStr.nameEn} Section ${nextCode}` : `Section ${nextCode}`,
                            nameNp: defaultStr ? `${defaultStr.nameNp} खण्ड ${nextCode}` : `खण्ड ${nextCode}`,
                            shift: 'DAY',
                            capacity: 45,
                            roomNumber: '',
                            classTeacherId: '',
                          });
                          setShowAddSection(true);
                        }}
                        className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline normal-case text-xs font-semibold"
                      >
                        <Plus className="w-3 h-3 mr-0.5" />
                        Add Section
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {classSections.map((sec) => (
                      <div
                        key={sec.id}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                            {sec.code}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white leading-tight">
                                {language === 'np' ? sec.nameNp : sec.nameEn}
                              </span>
                              {sec.streamNameEn && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {language === 'np' ? (sec.streamNameNp || sec.streamNameEn) : sec.streamNameEn}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
                              <span>{formatNumber(sec.studentCount || 0)}/{formatNumber(sec.capacity)} students &bull; {sec.shift} {sec.roomNumber ? `&bull; ${sec.roomNumber}` : ''}</span>
                              {sec.classTeacherName && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {language === 'np' ? 'कक्षा शिक्षक:' : 'Class Teacher:'} {sec.classTeacherName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isPrincipalOrAdmin && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditSection(sec)}
                              title={t('academic.edit_section') || 'Edit Section'}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingSection(sec)}
                              title={t('academic.delete_section') || 'Delete Section'}
                              className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {classSections.length === 0 && (
                      <div className="text-xs text-slate-400 italic py-1">No sections created yet.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Subjects Catalog */}
      {activeTab === 'subjects' && (() => {
        const classIdToClassMap = new Map(classes.map((c) => [c.id, c]));

        // Calculate KPI values
        const totalSubjectCount = subjects.length;
        const compulsoryCount = subjects.filter((s) => !s.isOptional).length;
        const optionalCount = subjects.filter((s) => s.isOptional).length;
        const streamCount = streams.length;

        // Stage definitions according to Nepal CDC Curriculum Framework
        const STAGE_TABS: {
          id: 'ALL' | 'ECD' | 'BASIC_1_3' | 'BASIC_4_5' | 'BASIC_6_8' | 'SEC_9_10' | 'HIGHER_SEC_11_12';
          labelNp: string;
          labelEn: string;
          codes: string[];
          descNp: string;
        }[] = [
          { id: 'ALL', labelNp: 'सबै तहहरू', labelEn: 'All Levels', codes: [], descNp: 'पाठ्यक्रम विकास केन्द्र (CDC) राष्ट्रिय पाठ्यक्रम प्रारूप' },
          { id: 'ECD', labelNp: 'प्रारम्भिक बाल विकास (ECD)', labelEn: 'ECD', codes: ['ECD'], descNp: '५ विकासात्मक सिकाइ क्षेत्रहरू • १००% निरन्तर मूल्याङ्कन' },
          { id: 'BASIC_1_3', labelNp: 'कक्षा १–३ (एकीकृत CAS)', labelEn: 'Grades 1-3 (Integrated)', codes: ['1', '2', '3'], descNp: 'एकीकृत पाठ्यक्रम • १००% CAS (थिमगत ४ स्तरहरू: १, २, ३, ४)' },
          { id: 'BASIC_4_5', labelNp: 'कक्षा ४–५ (५०/५०)', labelEn: 'Grades 4-5', codes: ['4', '5'], descNp: '५०% आन्तरिक/प्रयोगात्मक + ५०% बाह्य/सैद्धान्तिक मूल्याङ्कन' },
          { id: 'BASIC_6_8', labelNp: 'कक्षा ६–८ (BLE मानक)', labelEn: 'Grades 6-8 (BLE)', codes: ['6', '7', '8'], descNp: 'आधारभूत तह • कक्षा ८ BLE परीक्षा मानक (७५% सैद्धान्तिक, २५% आन्तरिक)' },
          { id: 'SEC_9_10', labelNp: 'कक्षा ९–१० (SEE मानक)', labelEn: 'Grades 9-10 (SEE)', codes: ['9', '10'], descNp: '५ अनिवार्य + ऐच्छिक I + ऐच्छिक II + प्राविधिक धार' },
          { id: 'HIGHER_SEC_11_12', labelNp: 'कक्षा ११–१२ (+२ संकाय)', labelEn: 'Grades 11-12 (+2)', codes: ['11', '12'], descNp: 'अनिवार्य + विज्ञान, व्यवस्थापन, शिक्षा, मानविकी, प्राविधिक संकाय' },
        ];

        const getStageCount = (codes: string[]) => {
          if (codes.length === 0) return subjects.length;
          const stageClassIds = new Set(classes.filter((c) => codes.includes(c.code)).map((c) => c.id));
          return subjects.filter((s) => stageClassIds.has(s.classId)).length;
        };

        const activeStage = STAGE_TABS.find((s) => s.id === subjectStageFilter);

        // Classes available in current stage filter for dropdown
        const availableClasses = subjectStageFilter === 'ALL'
          ? classes
          : classes.filter((c) => activeStage?.codes.includes(c.code));

        const filteredSubjects = subjects.filter((sub) => {
          const cls = classIdToClassMap.get(sub.classId);

          // 1. Stage filter
          if (subjectStageFilter !== 'ALL' && activeStage && activeStage.codes.length > 0) {
            if (!cls || !activeStage.codes.includes(cls.code)) return false;
          }

          // 2. Class dropdown filter
          if (subjectFilterClassId && sub.classId !== subjectFilterClassId) return false;

          // 3. Section dropdown filter
          if (subjectFilterSectionId && sub.sectionId && sub.sectionId !== subjectFilterSectionId) return false;

          // 4. Real-time Search filter
          if (subjectSearchQuery.trim()) {
            const q = subjectSearchQuery.toLowerCase().trim();
            const matchCode = sub.code?.toLowerCase().includes(q);
            const matchNameEn = sub.nameEn?.toLowerCase().includes(q);
            const matchNameNp = sub.nameNp?.toLowerCase().includes(q);
            const matchClass = (cls?.nameEn?.toLowerCase().includes(q) || cls?.nameNp?.toLowerCase().includes(q) || cls?.code?.toLowerCase().includes(q));
            const matchStream = (sub.streamNameEn?.toLowerCase().includes(q) || sub.streamNameNp?.toLowerCase().includes(q) || sub.streamCode?.toLowerCase().includes(q));
            if (!matchCode && !matchNameEn && !matchNameNp && !matchClass && !matchStream) {
              return false;
            }
          }

          return true;
        });

        const getStreamBadge = (sub: any) => {
          const cls = classIdToClassMap.get(sub.classId);
          const isHigherSec = ['11', '12'].includes(cls?.code || '');
          if (!isHigherSec) return <span className="text-slate-400">—</span>;

          const st = streams.find((s) => s.id === sub.streamId);
          const code = sub.streamCode || st?.code;
          const nameNp = sub.streamNameNp || st?.nameNp;
          const nameEn = sub.streamNameEn || st?.nameEn;

          if (!code && !nameEn) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {language === 'np' ? 'साझा (अनिवार्य)' : 'Common Core'}
              </span>
            );
          }

          let colorClasses = 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
          if (code === 'SCIENCE') {
            colorClasses = 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
          } else if (code === 'MANAGEMENT') {
            colorClasses = 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          } else if (code === 'EDUCATION') {
            colorClasses = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
          } else if (code === 'HUMANITIES') {
            colorClasses = 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
          } else if (code === 'COMPUTER_ENGINEERING') {
            colorClasses = 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
          }

          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${colorClasses}`}>
              {language === 'np' ? (nameNp || nameEn) : (nameEn || nameNp)}
            </span>
          );
        };

        return (
          <div className="space-y-4">
            {/* 1. CDC KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'np' ? 'कुल CDC विषयहरू' : 'Total CDC Subjects'}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatNumber(totalSubjectCount)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'np' ? 'ECD देखि कक्षा १२ सम्म' : 'Grades ECD to 12'}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'np' ? 'अनिवार्य विषयहरू' : 'Compulsory Core'}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatNumber(compulsoryCount)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'np' ? 'सबै विद्यार्थीलाई अनिवार्य' : 'Standard Core Subjects'}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'np' ? 'ऐच्छिक र प्राविधिक' : 'Electives & Tech'}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatNumber(optionalCount)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'np' ? 'ऐच्छिक I/II र संकाय विशिष्ट' : 'Optional I/II & Streams'}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'np' ? '+२ शैक्षिक संकाय' : '+2 Academic Streams'}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatNumber(streamCount)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'np' ? 'विज्ञान, व्यवस्थापन, शिक्षा आदि' : 'Sci, Mgt, Edu, Hum, Tech'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Stage Filter Navigation Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {STAGE_TABS.map((stage) => {
                  const isActive = subjectStageFilter === stage.id;
                  const count = getStageCount(stage.codes);
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        setSubjectStageFilter(stage.id);
                        setSubjectFilterClassId('');
                        setSubjectFilterSectionId('');
                      }}
                      className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{language === 'np' ? stage.labelNp : stage.labelEn}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {formatNumber(count)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Stage Description Context */}
              {activeStage && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {language === 'np' ? activeStage.labelNp : activeStage.labelEn}:
                    </span>
                    <span>{activeStage.descNp}</span>
                  </div>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {formatNumber(getStageCount(activeStage.codes))} {language === 'np' ? 'विषयहरू' : 'subjects'}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Search and Dropdown Refinement Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={subjectSearchQuery}
                    onChange={(e) => setSubjectSearchQuery(e.target.value)}
                    placeholder={language === 'np' ? 'कोड वा विषयको नाम खोज्नुहोस् (उदा: NEP, 101, विज्ञान)...' : 'Search by code or subject name...'}
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  {subjectSearchQuery && (
                    <button
                      onClick={() => setSubjectSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Class Dropdown */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {language === 'np' ? 'कक्षा:' : 'Class:'}
                  </span>
                  <select
                    value={subjectFilterClassId}
                    onChange={(e) => {
                      setSubjectFilterClassId(e.target.value);
                      setSubjectFilterSectionId('');
                    }}
                    className="text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">
                      {subjectStageFilter === 'ALL'
                        ? (language === 'np' ? 'सबै कक्षाहरू' : 'All Classes')
                        : (language === 'np' ? `यस तहका सबै कक्षाहरू` : 'All Stage Classes')}
                    </option>
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Dropdown */}
                {subjectFilterClassId && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {language === 'np' ? 'सेक्सन:' : 'Section:'}
                    </span>
                    <select
                      value={subjectFilterSectionId}
                      onChange={(e) => setSubjectFilterSectionId(e.target.value)}
                      className="text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">{language === 'np' ? 'सबै सेक्सन' : 'All Sections'}</option>
                      {sections
                        .filter((s) => s.classId === subjectFilterClassId)
                        .map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.code} ({sec.nameEn})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  {language === 'np' ? 'जम्मा देखाइएको:' : 'Showing:'}{' '}
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatNumber(filteredSubjects.length)}</span> /{' '}
                  <span className="font-mono">{formatNumber(subjects.length)}</span>
                </div>

                {isPrincipalOrAdmin && (
                  <button
                    onClick={() => setShowAddSubject(true)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {language === 'np' ? 'नयाँ विषय थप्नुहोस्' : 'Add Subject'}
                  </button>
                )}
              </div>
            </div>

            {/* 4. Subjects Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{language === 'np' ? 'पाठ्यक्रम विकास केन्द्र (CDC) विषय सूची' : 'CDC Curricula & Assessment Standards'}</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {formatNumber(filteredSubjects.length)}
                  </span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'np'
                    ? 'अक्षराङ्कन निर्देशिका २०७८ / राष्ट्रिय पाठ्यक्रम प्रारूप २०७६ अनुसार'
                    : 'Letter Grading Directives 2078 & National Curriculum Framework'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 whitespace-nowrap">{language === 'np' ? 'कोड' : 'Code'}</th>
                      <th className="px-5 py-3.5">{language === 'np' ? 'विषयको नाम' : 'Subject Name'}</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">{language === 'np' ? 'कक्षा' : 'Class'}</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">{language === 'np' ? 'संकाय' : 'Stream'}</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">{language === 'np' ? 'लागू दायरा' : 'Applicability'}</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">{language === 'np' ? 'प्रकृति' : 'Category'}</th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap">{language === 'np' ? 'क्रेडिट' : 'Credit'}</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">{language === 'np' ? 'सैद्धान्तिक (पूर्णाङ्क / उत्तीर्णाङ्क)' : 'Theory (Full / Pass)'}</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">{language === 'np' ? 'प्रयोगात्मक / CAS (पूर्णाङ्क / उत्तीर्णाङ्क)' : 'Practical / CAS (Full / Pass)'}</th>
                      {isPrincipalOrAdmin && <th className="px-5 py-3.5 text-right whitespace-nowrap">{language === 'np' ? 'कार्य' : 'Actions'}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredSubjects.map((sub) => {
                      const cls = classIdToClassMap.get(sub.classId);
                      const sec = sections.find((s) => s.id === sub.sectionId);
                      const isCASOnly = sub.theoryFullMarks === 0 && sub.practicalFullMarks === 100;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          {/* Code */}
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                              {sub.code}
                            </span>
                          </td>

                          {/* Subject Name */}
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {language === 'np' ? (sub.nameNp || sub.nameEn) : (sub.nameEn || sub.nameNp)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {language === 'np' ? (sub.nameEn || sub.nameNp) : (sub.nameNp || sub.nameEn)}
                            </div>
                          </td>

                          {/* Class */}
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {cls ? (language === 'np' ? (cls.nameNp || cls.nameEn) : (cls.nameEn || cls.nameNp)) : '—'}
                          </td>

                          {/* Stream */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {getStreamBadge(sub)}
                          </td>

                          {/* Applicability */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {sub.sectionId ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                Section {sub.sectionCode || sec?.code || 'Specific'} Only
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                {language === 'np' ? 'सबै सेक्सन' : 'All Sections'}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {sub.optionalGroup === 'OPT_1' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                {language === 'np' ? 'ऐच्छिक प्रथम' : 'Optional I'}
                              </span>
                            ) : sub.optionalGroup === 'OPT_2' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                                {language === 'np' ? 'ऐच्छिक द्वितीय' : 'Optional II'}
                              </span>
                            ) : sub.optionalGroup === 'TECHNICAL' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                                {language === 'np' ? 'प्राविधिक' : 'Technical'}
                              </span>
                            ) : sub.optionalGroup === 'STREAM_ELECTIVE' ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                {language === 'np' ? 'संकाय ऐच्छिक' : 'Stream Elective'}
                              </span>
                            ) : sub.isOptional ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                {language === 'np' ? 'ऐच्छिक' : 'Optional'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                {language === 'np' ? 'अनिवार्य' : 'Compulsory'}
                              </span>
                            )}
                          </td>

                          {/* Credit Hours */}
                          <td className="px-3 py-3.5 font-mono text-xs font-bold text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              {formatNumber(sub.creditHours)} CH
                            </span>
                          </td>

                          {/* Theory Marks */}
                          <td className="px-5 py-3.5 text-xs font-medium whitespace-nowrap">
                            {isCASOnly ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {language === 'np' ? 'CAS आधारित (०)' : 'CAS Based (0)'}
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{formatNumber(sub.theoryFullMarks)}</span>
                                <span className="text-slate-500 dark:text-slate-400"> / {formatNumber(sub.theoryPassMarks)}</span>
                              </div>
                            )}
                          </td>

                          {/* Practical / CAS Marks */}
                          <td className="px-5 py-3.5 text-xs font-medium whitespace-nowrap">
                            {isCASOnly ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {language === 'np' ? '१००% CAS (स्तर १-४)' : '100% CAS (Levels 1-4)'}
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{formatNumber(sub.practicalFullMarks)}</span>
                                <span className="text-slate-500 dark:text-slate-400"> / {formatNumber(sub.practicalPassMarks)}</span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          {isPrincipalOrAdmin && (
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => openEditSubject(sub)}
                                  title={t('academic.edit_subject') || 'Edit Subject'}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingSubject(sub)}
                                  title={t('academic.delete_subject') || 'Delete Subject'}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {filteredSubjects.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div className="text-sm font-semibold">
                            {language === 'np' ? 'कुनै विषय भेटिएन' : 'No subjects found'}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {language === 'np'
                              ? 'फिल्टर वा खोज शब्द परिवर्तन गरी पुन: प्रयास गर्नुहोस्।'
                              : 'Try adjusting your search query or stage filter.'}
                          </div>
                          {(subjectSearchQuery || subjectFilterClassId || subjectStageFilter !== 'ALL') && (
                            <button
                              onClick={() => {
                                setSubjectStageFilter('ALL');
                                setSubjectFilterClassId('');
                                setSubjectFilterSectionId('');
                                setSubjectSearchQuery('');
                              }}
                              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:underline"
                            >
                              {language === 'np' ? 'सबै फिल्टर हटाउनुहोस्' : 'Reset All Filters'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 4: Houses & Activities Management (सदन तथा अतिरिक्त क्रियाकलाप) */}
      {activeTab === 'houses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Action Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-white/10 text-amber-300">
                  <Trophy className="w-6 h-6" />
                </span>
                <h2 className="text-xl font-black tracking-tight">
                  {language === 'np' ? 'सदन तथा अतिरिक्त क्रियाकलाप व्यवस्थापन' : 'House System & ECA Championship'}
                </h2>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                {language === 'np'
                  ? 'विद्यार्थीहरूलाई चार सदनमा विभाजन, सदन नेतृत्व (हाउस मास्टर र क्याप्टेन), खेलकुद एवं सह-क्रियाकलाप प्रतियोगिता र प्रत्यक्ष च्याम्पियनसिप अङ्क तालिका।'
                  : 'Manage 4 school houses (Red, Blue, Green, Yellow), student rosters, leadership, ECA competitions, and live championship standings.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAutoAssignModal(true)}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition shadow-sm"
              >
                <Shuffle className="w-4 h-4 mr-1.5 text-blue-300" />
                <span>{language === 'np' ? 'स्वतः सदन विभाजन' : 'Auto-Assign Students'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddActivityModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>{language === 'np' ? 'नयाँ प्रतियोगिता / क्रियाकलाप' : 'Add ECA Activity'}</span>
              </button>
            </div>
          </div>

          {/* Championship Podium / Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {language === 'np' ? 'वार्षिक सदन च्याम्पियनसिप अङ्क तालिका' : 'Annual House Championship Standings'}
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'np' ? 'प्रत्येक प्रतियोगिताको अङ्क आधारमा' : 'Ranked by total points earned'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {houses.map((h, idx) => {
                const isFirst = h.rank === 1;
                const isSecond = h.rank === 2;
                const isThird = h.rank === 3;
                return (
                  <div
                    key={h.id}
                    className={`relative rounded-2xl border p-5 shadow-xs transition overflow-hidden ${
                      isFirst
                        ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 border-amber-400/80 dark:border-amber-500/40 ring-2 ring-amber-400/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Top Color Ribbon */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: h.colorHex }}
                    />

                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                          style={{ backgroundColor: h.colorHex }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {language === 'np' ? h.nameNp : h.nameEn}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {language === 'np' ? h.nameEn : h.nameNp}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-xs ${
                          isFirst
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                            : isSecond
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white'
                            : isThird
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        #{h.rank || idx + 1}
                      </div>
                    </div>

                    {/* Total Points Display */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {language === 'np' ? 'कुल अङ्क' : 'Total Points'}
                        </span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none mt-0.5">
                          {formatNumber(h.totalPoints || 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {language === 'np' ? 'सदस्य' : 'Members'}
                        </span>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                          {formatNumber(h.memberCount || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Medal Breakdown */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold">
                      <div className="bg-amber-50 dark:bg-amber-950/40 rounded-lg py-1 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
                        🥇 {formatNumber(h.goldMedals || 0)}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-1 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        🥈 {formatNumber(h.silverMedals || 0)}
                      </div>
                      <div className="bg-amber-100/50 dark:bg-amber-950/20 rounded-lg py-1 border border-amber-300/40 text-amber-900 dark:text-amber-400">
                        🥉 {formatNumber(h.bronzeMedals || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4 House Profiles & Leadership */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {language === 'np' ? 'सदन विवरण, नेतृत्व एवं सदस्यहरू' : 'House Profiles, Leadership & Student Roster'}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {houses.map((h) => (
                <div
                  key={h.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className="w-6 h-6 rounded-xl border border-black/20 shadow-xs"
                        style={{ backgroundColor: h.colorHex }}
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {language === 'np' ? h.nameNp : h.nameEn}
                        </h4>
                        <div className="text-xs text-slate-500 font-medium">
                          {language === 'np' ? h.nameEn : h.nameNp}
                        </div>
                      </div>
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-black text-white shadow-2xs"
                      style={{ backgroundColor: h.colorHex }}
                    >
                      {h.memberCount || 0} {language === 'np' ? 'विद्यार्थी' : 'Students'}
                    </span>
                  </div>

                  {/* Leadership Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {language === 'np' ? 'हाउस मास्टर' : 'House Master'}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                        {h.masterTeacherName || 'तोकिएको छैन'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {language === 'np' ? 'क्याप्टेन' : 'Captain'}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                        {h.captainStudentName || 'तोकिएको छैन'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        {language === 'np' ? 'उप-क्याप्टेन' : 'Vice-Captain'}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                        {h.viceCaptainStudentName || 'तोकिएको छैन'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLeadership(h)}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      <span>{language === 'np' ? 'नेतृत्व सम्पादन' : 'Edit Leadership'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenHouseMembers(h)}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      <span>{language === 'np' ? 'सदस्य सूची हेर्नुहोस्' : 'View Members'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ECA Activities & Events Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {language === 'np' ? 'अतिरिक्त क्रियाकलाप तथा प्रतियोगिताहरू (ECA Events)' : 'Extracurricular Activities & Events'}
                </h3>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                {[
                  { id: 'ALL', labelNp: 'सबै', labelEn: 'All' },
                  { id: 'SPORTS', labelNp: 'खेलकुद', labelEn: 'Sports' },
                  { id: 'ACADEMIC', labelNp: 'प्राज्ञिक', labelEn: 'Academic' },
                  { id: 'CULTURAL', labelNp: 'सांस्कृतिक', labelEn: 'Cultural' },
                  { id: 'DISCIPLINE', labelNp: 'अनुशासन/सरसफाइ', labelEn: 'Discipline' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivityCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      activityCategoryFilter === tab.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'np' ? tab.labelNp : tab.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 w-28">मिति (Date BS)</th>
                    <th className="px-4 py-3">क्रियाकलाप / प्रतियोगिता (Event)</th>
                    <th className="px-4 py-3">विधा (Category)</th>
                    <th className="px-4 py-3">प्रथम (1st Place)</th>
                    <th className="px-4 py-3">दोस्रो (2nd Place)</th>
                    <th className="px-4 py-3">तेस्रो (3rd Place)</th>
                    <th className="px-4 py-3 text-right">कार्य (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {houseActivities
                    .filter((act) => activityCategoryFilter === 'ALL' || act.category === activityCategoryFilter)
                    .map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {act.eventDateBs}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {language === 'np' && act.titleNp ? act.titleNp : act.title}
                          </div>
                          {act.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {act.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {act.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {act.firstHouse ? (
                            <div className="flex items-center space-x-1.5 font-bold">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: act.firstHouse.colorHex }}
                              />
                              <span className="text-slate-900 dark:text-white">
                                {language === 'np' ? act.firstHouse.nameNp : act.firstHouse.nameEn}
                              </span>
                              <span className="text-emerald-600 font-mono text-[11px]">
                                (+{act.firstPoints})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {act.secondHouse ? (
                            <div className="flex items-center space-x-1.5 font-bold">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: act.secondHouse.colorHex }}
                              />
                              <span className="text-slate-700 dark:text-slate-300">
                                {language === 'np' ? act.secondHouse.nameNp : act.secondHouse.nameEn}
                              </span>
                              <span className="text-blue-600 font-mono text-[11px]">
                                (+{act.secondPoints})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {act.thirdHouse ? (
                            <div className="flex items-center space-x-1.5 font-bold">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: act.thirdHouse.colorHex }}
                              />
                              <span className="text-slate-700 dark:text-slate-300">
                                {language === 'np' ? act.thirdHouse.nameNp : act.thirdHouse.nameEn}
                              </span>
                              <span className="text-amber-600 font-mono text-[11px]">
                                (+{act.thirdPoints})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act.id)}
                            title="Delete Activity"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {houseActivities.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        कुनै अतिरिक्त क्रियाकलाप दर्ता भएको छैन। माथि "नयाँ प्रतियोगिता / क्रियाकलाप" बटन थिचेर दर्ता गर्नुहोस्।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Academic Sessions */}
      {activeTab === 'years' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'np'
                ? 'विद्यालयका दर्ता भएका शैक्षिक सत्रहरू तथा चालु सत्र व्यवस्थापन'
                : 'Configured academic sessions and active session management'}
            </p>
            {isPrincipalOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  const maxYear = years.reduce((max, y) => Math.max(max, y.yearBs || 0), 2083);
                  handleYearBsChange(maxYear + 1);
                  setShowAddYear(true);
                }}
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t('academic.add_year')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {years.map((y) => (
              <div
                key={y.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-2xs space-y-3 transition ${
                  y.isCurrent
                    ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {formatNumber(y.yearBs)} BS ({formatNumber(y.yearBs - 57)} AD)
                  </div>
                  {y.isCurrent ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {t('academic.active_session')}
                    </span>
                  ) : (
                    isPrincipalOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleActivateYear(y)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-300 dark:border-blue-800 rounded-lg transition"
                      >
                        {t('academic.activate_session')}
                      </button>
                    )
                  )}
                </div>
                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Bikram Sambat: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {y.startDateBs} to {y.endDateBs}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Gregorian (AD): </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {y.startDateAd} to {y.endDateAd}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Academic Year Modal */}
      {showAddYear && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('academic.add_year')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddYear(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="p-6 space-y-4 text-xs font-medium">
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
                  onClick={() => setShowAddYear(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={yearSaving}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {yearSaving ? 'सुरक्षित हुँदैछ...' : 'सत्र सुरक्षित गर्नुहोस् (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('academic.add_section')}
              </h3>
              <button
                onClick={() => setShowAddSection(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class</label>
                <select
                  value={sectionForm.classId}
                  onChange={(e) => {
                    const nextClassId = e.target.value;
                    const cObj = classes.find((c) => c.id === nextClassId);
                    const isHS = cObj?.hasStreams || ['11', '12'].includes(cObj?.code || '');
                    const defaultStr = isHS && streams.length > 0 ? streams[0] : null;
                    setSectionForm({
                      ...sectionForm,
                      classId: nextClassId,
                      streamId: defaultStr ? defaultStr.id : '',
                      nameEn: defaultStr ? `${defaultStr.nameEn} Section ${sectionForm.code}` : `Section ${sectionForm.code}`,
                      nameNp: defaultStr ? `${defaultStr.nameNp} खण्ड ${sectionForm.code}` : `खण्ड ${sectionForm.code}`,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Higher Secondary Stream Selection */}
              {(() => {
                const targetC = classes.find((c) => c.id === sectionForm.classId);
                const isHS = targetC?.hasStreams || ['11', '12'].includes(targetC?.code || '');
                if (!isHS) return null;
                return (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-1.5">
                    <label className="block font-bold text-purple-900 dark:text-purple-200">
                      Faculty / Stream (संकाय) *
                    </label>
                    <select
                      value={sectionForm.streamId}
                      required
                      onChange={(e) => {
                        const strObj = streams.find((s) => s.id === e.target.value);
                        setSectionForm({
                          ...sectionForm,
                          streamId: e.target.value,
                          nameEn: strObj ? `${strObj.nameEn} Section ${sectionForm.code}` : `Section ${sectionForm.code}`,
                          nameNp: strObj ? `${strObj.nameNp} खण्ड ${sectionForm.code}` : `खण्ड ${sectionForm.code}`,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-purple-950 dark:text-purple-200 font-semibold"
                    >
                      <option value="">-- Select Faculty / Stream --</option>
                      {streams.map((str) => (
                        <option key={str.id} value={str.id}>
                          {str.nameEn} ({str.nameNp})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      Higher Secondary (+२) sections are linked directly with this faculty stream.
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section Code</label>
                  <input
                    type="text"
                    required
                    value={sectionForm.code}
                    onChange={(e) => {
                      const codeVal = e.target.value.toUpperCase();
                      const strObj = streams.find((s) => s.id === sectionForm.streamId);
                      setSectionForm({
                        ...sectionForm,
                        code: codeVal,
                        nameEn: strObj ? `${strObj.nameEn} Section ${codeVal}` : `Section ${codeVal}`,
                        nameNp: strObj ? `${strObj.nameNp} खण्ड ${codeVal}` : `खण्ड ${codeVal}`,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shift</label>
                  <select
                    value={sectionForm.shift}
                    onChange={(e) => setSectionForm({ ...sectionForm, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="DAY">Day (दिवा)</option>
                    <option value="MORNING">Morning (बिहानी)</option>
                    <option value="EVENING">Evening (साँझ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    value={sectionForm.capacity}
                    onChange={(e) => setSectionForm({ ...sectionForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 102"
                    value={sectionForm.roomNumber}
                    onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'कक्षा शिक्षक (Class Teacher)' : 'Class Teacher'}
                </label>
                <select
                  value={sectionForm.classTeacherId || ''}
                  onChange={(e) => setSectionForm({ ...sectionForm, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">{language === 'np' ? '-- कक्षा शिक्षक तोक्नुहोस् (ऐच्छिक) --' : '-- Assign Class Teacher (Optional) --'}</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.userId || t.id}>
                      {t.fullNameEn} ({t.fullNameNp}) &bull; {t.staffCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSection(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('academic.add_subject')}
              </h3>
              <button
                onClick={() => setShowAddSubject(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class *</label>
                  <select
                    value={subjectForm.classId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value, sectionId: '' })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section Applicability</label>
                  <select
                    value={subjectForm.sectionId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, sectionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">All Sections (सबै सेक्सनमा लागू)</option>
                    {sections
                      .filter((s) => s.classId === subjectForm.classId)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.code} ({sec.nameEn})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Category / Stream Type</label>
                <select
                  value={subjectForm.optionalGroup}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubjectForm({
                      ...subjectForm,
                      optionalGroup: val,
                      isOptional: ['OPT_1', 'OPT_2', 'STREAM_ELECTIVE'].includes(val),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Compulsory (अनिवार्य - Standard Core Curriculum)</option>
                  <option value="OPT_1">Optional I (ऐच्छिक प्रथम - e.g., Opt. Mathematics, Economics)</option>
                  <option value="OPT_2">Optional II (ऐच्छिक द्वितीय - e.g., Computer Science, Accountancy)</option>
                  <option value="STREAM_ELECTIVE">Stream Elective (संकाय ऐच्छिक - Science / Management / Education / Humanities / Tech)</option>
                  <option value="TECHNICAL">Technical Stream (प्राविधिक धार - e.g., 9C / 10C Specialized Subjects)</option>
                </select>
              </div>

              {(['11', '12'].includes(classes.find((c) => c.id === subjectForm.classId)?.code || '') || subjectForm.optionalGroup === 'STREAM_ELECTIVE') && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'शैक्षिक संकाय (Faculty / Stream)' : 'Faculty / Academic Stream'}
                  </label>
                  <select
                    value={subjectForm.streamId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, streamId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">{language === 'np' ? '-- साझा अनिवार्य (सबै संकायमा लागू) --' : '-- Common Core (All Streams) --'}</option>
                    {streams.map((st) => (
                      <option key={st.id} value={st.id}>
                        {language === 'np' ? (st.nameNp || st.nameEn) : (st.nameEn || st.nameNp)} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {subjectForm.sectionId
                  ? '⚡ This subject will only apply to students enrolled in the selected section (e.g., Section C).'
                  : subjectForm.optionalGroup === 'OPT_1' || subjectForm.optionalGroup === 'OPT_2'
                  ? '🎯 General stream students will choose one elective from each Optional Group during admission.'
                  : subjectForm.optionalGroup === 'STREAM_ELECTIVE'
                  ? '🎓 Elective for students in the chosen academic faculty (+2 NEB stream).'
                  : '📘 Compulsory subject applicable across all sections.'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NEP.101"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Hours</label>
                  <input
                    type="number"
                    value={subjectForm.creditHours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, creditHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name (English)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Compulsory English"
                    value={subjectForm.nameEn}
                    onChange={(e) => setSubjectForm({ ...subjectForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name (Nepali)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. अनिवार्य अंग्रेजी"
                    value={subjectForm.nameNp}
                    onChange={(e) => setSubjectForm({ ...subjectForm, nameNp: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Theory (Full / Pass)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={subjectForm.theoryFullMarks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, theoryFullMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={subjectForm.theoryPassMarks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, theoryPassMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Practical (Full / Pass)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={subjectForm.practicalFullMarks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, practicalFullMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={subjectForm.practicalPassMarks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, practicalPassMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>{t('academic.edit_section') || 'Edit Section'}</span>
              </h3>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSection} className="p-6 space-y-4 text-xs">
              {/* Higher Secondary Faculty / Stream Selection for Edit */}
              {(() => {
                const targetC = classes.find((c) => c.id === editSectionForm.classId);
                const isHS = targetC?.hasStreams || ['11', '12'].includes(targetC?.code || '');
                if (!isHS) return null;
                return (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-1.5">
                    <label className="block font-bold text-purple-900 dark:text-purple-200">
                      Faculty / Stream (संकाय)
                    </label>
                    <select
                      value={editSectionForm.streamId || ''}
                      onChange={(e) => {
                        const strObj = streams.find((s) => s.id === e.target.value);
                        setEditSectionForm({
                          ...editSectionForm,
                          streamId: e.target.value,
                          nameEn: strObj ? `${strObj.nameEn} Section ${editSectionForm.code}` : editSectionForm.nameEn,
                          nameNp: strObj ? `${strObj.nameNp} खण्ड ${editSectionForm.code}` : editSectionForm.nameNp,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-purple-950 dark:text-purple-200 font-semibold"
                    >
                      <option value="">-- General / No Stream --</option>
                      {streams.map((str) => (
                        <option key={str.id} value={str.id}>
                          {str.nameEn} ({str.nameNp})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      Assigned Higher Secondary (+२) faculty stream for this section.
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section Code</label>
                  <input
                    type="text"
                    required
                    value={editSectionForm.code}
                    onChange={(e) =>
                      setEditSectionForm({
                        ...editSectionForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shift</label>
                  <select
                    value={editSectionForm.shift}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="DAY">Day (दिवा)</option>
                    <option value="MORNING">Morning (बिहानी)</option>
                    <option value="EVENING">Evening (साँझ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name (English)</label>
                  <input
                    type="text"
                    required
                    value={editSectionForm.nameEn}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name (Nepali)</label>
                  <input
                    type="text"
                    value={editSectionForm.nameNp}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, nameNp: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    value={editSectionForm.capacity}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 102"
                    value={editSectionForm.roomNumber}
                    onChange={(e) => setEditSectionForm({ ...editSectionForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'कक्षा शिक्षक (Class Teacher)' : 'Class Teacher'}
                </label>
                <select
                  value={editSectionForm.classTeacherId || ''}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">{language === 'np' ? '-- कक्षा शिक्षक तोक्नुहोस् (ऐच्छिक) --' : '-- Assign Class Teacher (Optional) --'}</option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.userId || t.id}>
                      {t.fullNameEn} ({t.fullNameNp}) &bull; {t.staffCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Section Confirmation Modal */}
      {deletingSection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-50/70 dark:bg-red-950/40">
              <h3 className="text-base font-bold text-red-900 dark:text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>{t('academic.delete_section') || 'Delete Section'}</span>
              </h3>
              <button
                onClick={() => setDeletingSection(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete section{' '}
                <strong className="text-slate-900 dark:text-white font-bold">
                  "{deletingSection.nameEn}" (Code: {deletingSection.code})
                </strong>
                ?
              </p>

              {Number(deletingSection.studentCount || 0) > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Cannot delete active section:</div>
                    <div className="mt-0.5 text-[11px] leading-tight">
                      This section currently has <strong>{deletingSection.studentCount} active enrolled student(s)</strong>.
                      Please reassign or transfer the students before deleting this section.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px]">
                  ✓ This section currently has 0 enrolled students. It can be safely removed from the system.
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingSection(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSection}
                  disabled={actionLoading || Number(deletingSection.studentCount || 0) > 0}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>{t('academic.edit_subject') || 'Edit Subject'}</span>
              </h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Class *</label>
                  <select
                    value={editSubjectForm.classId}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, classId: e.target.value, sectionId: '' })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Section Applicability</label>
                  <select
                    value={editSubjectForm.sectionId}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, sectionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">All Sections (सबै सेक्सनमा लागू)</option>
                    {sections
                      .filter((s) => s.classId === editSubjectForm.classId)
                      .map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.code} ({sec.nameEn})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Category / Stream Type</label>
                <select
                  value={editSubjectForm.optionalGroup}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditSubjectForm({
                      ...editSubjectForm,
                      optionalGroup: val,
                      isOptional: ['OPT_1', 'OPT_2', 'STREAM_ELECTIVE'].includes(val),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Compulsory (अनिवार्य - Standard Core Curriculum)</option>
                  <option value="OPT_1">Optional I (ऐच्छिक प्रथम - e.g., Opt. Mathematics, Economics)</option>
                  <option value="OPT_2">Optional II (ऐच्छिक द्वितीय - e.g., Computer Science, Accountancy)</option>
                  <option value="STREAM_ELECTIVE">Stream Elective (संकाय ऐच्छिक - Science / Management / Education / Humanities / Tech)</option>
                  <option value="TECHNICAL">Technical Stream (प्राविधिक धार - e.g., 9C / 10C Specialized Subjects)</option>
                </select>
              </div>

              {(['11', '12'].includes(classes.find((c) => c.id === editSubjectForm.classId)?.code || '') || editSubjectForm.optionalGroup === 'STREAM_ELECTIVE') && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'शैक्षिक संकाय (Faculty / Stream)' : 'Faculty / Academic Stream'}
                  </label>
                  <select
                    value={editSubjectForm.streamId}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, streamId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">{language === 'np' ? '-- साझा अनिवार्य (सबै संकायमा लागू) --' : '-- Common Core (All Streams) --'}</option>
                    {streams.map((st) => (
                      <option key={st.id} value={st.id}>
                        {language === 'np' ? (st.nameNp || st.nameEn) : (st.nameEn || st.nameNp)} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={editSubjectForm.code}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Hours</label>
                  <input
                    type="number"
                    value={editSubjectForm.creditHours}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, creditHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name (English)</label>
                  <input
                    type="text"
                    required
                    value={editSubjectForm.nameEn}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Name (Nepali)</label>
                  <input
                    type="text"
                    required
                    value={editSubjectForm.nameNp}
                    onChange={(e) => setEditSubjectForm({ ...editSubjectForm, nameNp: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Theory (Full / Pass)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editSubjectForm.theoryFullMarks}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, theoryFullMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={editSubjectForm.theoryPassMarks}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, theoryPassMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Practical (Full / Pass)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editSubjectForm.practicalFullMarks}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, practicalFullMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={editSubjectForm.practicalPassMarks}
                      onChange={(e) => setEditSubjectForm({ ...editSubjectForm, practicalPassMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-50/70 dark:bg-red-950/40">
              <h3 className="text-base font-bold text-red-900 dark:text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>{t('academic.delete_subject') || 'Delete Subject'}</span>
              </h3>
              <button
                onClick={() => setDeletingSubject(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete subject{' '}
                <strong className="text-slate-900 dark:text-white font-bold">
                  "{deletingSubject.nameEn}" ({deletingSubject.code})
                </strong>
                ?
              </p>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingSubject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubject}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. House Members Roster Modal */}
      {showMembersModal && selectedHouseForMembers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center space-x-3">
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs font-black text-sm"
                  style={{ backgroundColor: selectedHouseForMembers.colorHex }}
                >
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{language === 'np' ? selectedHouseForMembers.nameNp : selectedHouseForMembers.nameEn}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold text-white shadow-2xs"
                      style={{ backgroundColor: selectedHouseForMembers.colorHex }}
                    >
                      {houseMembers.length} {language === 'np' ? 'विद्यार्थी' : 'Students'}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {language === 'np' ? 'यस सदनमा आबद्ध विद्यार्थीहरूको विवरण तथा सदन स्थानान्तरण' : 'House student roster & assignment'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="विद्यार्थीको नाम, ID वा IEMIS खोज्नुहोस्..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {language === 'np' ? 'कुल भेटिएका:' : 'Showing:'}{' '}
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {houseMembers.filter((m) => {
                    if (!memberSearchTerm) return true;
                    const q = memberSearchTerm.toLowerCase();
                    return (
                      m.fullNameEn?.toLowerCase().includes(q) ||
                      m.fullNameNp?.includes(q) ||
                      m.studentId?.toLowerCase().includes(q) ||
                      (m.iemisCode && m.iemisCode.toLowerCase().includes(q))
                    );
                  }).length}
                </span>
              </div>
            </div>

            {/* Scrollable Members List */}
            <div className="p-4 overflow-y-auto flex-1">
              {membersLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">सदस्य सूची लोड हुँदैछ...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">ID / IEMIS</th>
                        <th className="px-3 py-2.5">विद्यार्थी (Student)</th>
                        <th className="px-3 py-2.5">कक्षा (Class)</th>
                        <th className="px-3 py-2.5 text-center">रोल नं</th>
                        <th className="px-3 py-2.5 text-center">लिङ्ग</th>
                        <th className="px-3 py-2.5 text-right">सदन परिवर्तन (Transfer)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {houseMembers
                        .filter((m) => {
                          if (!memberSearchTerm) return true;
                          const q = memberSearchTerm.toLowerCase();
                          return (
                            m.fullNameEn?.toLowerCase().includes(q) ||
                            m.fullNameNp?.includes(q) ||
                            m.studentId?.toLowerCase().includes(q) ||
                            (m.iemisCode && m.iemisCode.toLowerCase().includes(q))
                          );
                        })
                        .map((mem) => (
                          <tr key={mem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="px-3 py-2.5">
                              <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{mem.studentId}</div>
                              <div className="text-[10px] font-mono text-slate-400">{mem.iemisCode || '—'}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center space-x-2.5">
                                {mem.photoUrl ? (
                                  <img
                                    src={mem.photoUrl}
                                    alt={mem.fullNameEn}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {mem.firstNameEn?.[0] || 'S'}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {language === 'np' && mem.fullNameNp ? mem.fullNameNp : mem.fullNameEn}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {mem.fullNameEn}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                Grade {mem.classCode || '—'} {mem.sectionCode ? `(${mem.sectionCode})` : ''}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {mem.rollNumber || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                mem.gender === 'MALE'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {mem.gender === 'MALE' ? 'छात्र' : mem.gender === 'FEMALE' ? 'छात्रा' : 'अन्य'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <select
                                value={selectedHouseForMembers.id}
                                onChange={(e) => handleTransferStudent(mem.id, e.target.value)}
                                className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                              >
                                {houses.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {language === 'np' ? h.nameNp : h.nameEn}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}

                      {houseMembers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                            यस सदनमा हाल कुनै विद्यार्थी आबद्ध छैनन्।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Auto-Assign Students Modal */}
      {showAutoAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <Shuffle className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'np' ? 'स्वतः सदन विभाजन (Auto-Assign)' : 'Auto-Assign Students'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoAssignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAutoAssignSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'np'
                  ? 'यस सुविधाले छात्र र छात्राको सङ्ख्या सन्तुलन कायम गर्दै विद्यार्थीहरूलाई चारै सदन (रातो, नीलो, हरियो, पहेँलो) मा बराबर रूपमा विभाजन गर्दछ।'
                  : 'Distributes students evenly across the 4 houses while maintaining gender balance.'}
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'लक्षित कक्षा (Target Class)' : 'Target Class'}
                </label>
                <select
                  value={autoAssignClassId}
                  onChange={(e) => setAutoAssignClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                >
                  <option value="">{language === 'np' ? 'सबै कक्षाहरू (Entire School)' : 'All Classes (Entire School)'}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === 'np' ? (c.nameNp || c.nameEn) : (c.nameEn || c.nameNp)} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceReassign}
                    onChange={(e) => setForceReassign(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {language === 'np' ? 'सबै विद्यार्थीलाई पुनर्गठन गर्ने (Reassign All)' : 'Reassign All Students'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  {forceReassign
                    ? 'पहिले सदन तोकिएका विद्यार्थीहरूको सदन पनि फेरबदल हुनेछ।'
                    : 'हाल कुनै सदन नतोकिएका (बाँकी रहेका) विद्यार्थी मात्र सदनमा विभाजन हुनेछन्।'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAutoAssignModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAutoAssigning}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isAutoAssigning ? 'विभाजन हुँदैछ...' : 'विभाजन सुरु गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add ECA Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'np' ? 'नयाँ अतिरिक्त क्रियाकलाप / प्रतियोगिता' : 'Record ECA Activity / Event'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddActivityModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivitySubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    प्रतियोगिता शीर्षक (Title En) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Football Tournament"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    शीर्षक (नेपाली)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: फुटबल प्रतियोगिता"
                    value={activityForm.titleNp}
                    onChange={(e) => setActivityForm({ ...activityForm, titleNp: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    विधा (Category) *
                  </label>
                  <select
                    value={activityForm.category}
                    onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-indigo-700 dark:text-indigo-300"
                  >
                    <option value="SPORTS">खेलकुद (Sports)</option>
                    <option value="ACADEMIC">प्राज्ञिक / हाजिरीजवाफ (Academic / Quiz)</option>
                    <option value="CULTURAL">सांस्कृतिक / नृत्य / गायन (Cultural / Dance)</option>
                    <option value="LITERARY">साहित्यिक / वक्तृत्वकला (Literary / Speech)</option>
                    <option value="DISCIPLINE">अनुशासन तथा सरसफाइ (Discipline / Cleanliness)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    सम्पन्न मिति (Date BS) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2081-08-15"
                    value={activityForm.eventDateBs}
                    onChange={(e) => setActivityForm({ ...activityForm, eventDateBs: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  कैफियत / विवरण (Description)
                </label>
                <textarea
                  rows={2}
                  placeholder="प्रतियोगिताको नतिजा र विवरण..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none"
                />
              </div>

              {/* Awarded Houses & Points */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                <div className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                  🏆 विजेता सदन तथा अङ्क निर्धारण (Winners & Points)
                </div>

                {/* 1st Place */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="font-bold text-amber-700 dark:text-amber-300">🥇 प्रथम (1st Place):</span>
                  <select
                    value={activityForm.firstHouseId}
                    onChange={(e) => setActivityForm({ ...activityForm, firstHouseId: e.target.value })}
                    className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="">सदन छान्नुहोस्</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {language === 'np' ? h.nameNp : h.nameEn}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={activityForm.firstPoints}
                      onChange={(e) => setActivityForm({ ...activityForm, firstPoints: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded border border-amber-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-500">अङ्क</span>
                  </div>
                </div>

                {/* 2nd Place */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">🥈 दोस्रो (2nd Place):</span>
                  <select
                    value={activityForm.secondHouseId}
                    onChange={(e) => setActivityForm({ ...activityForm, secondHouseId: e.target.value })}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="">सदन छान्नुहोस्</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {language === 'np' ? h.nameNp : h.nameEn}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={activityForm.secondPoints}
                      onChange={(e) => setActivityForm({ ...activityForm, secondPoints: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded border border-slate-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-500">अङ्क</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="font-bold text-amber-800 dark:text-amber-400">🥉 तेस्रो (3rd Place):</span>
                  <select
                    value={activityForm.thirdHouseId}
                    onChange={(e) => setActivityForm({ ...activityForm, thirdHouseId: e.target.value })}
                    className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="">सदन छान्नुहोस्</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {language === 'np' ? h.nameNp : h.nameEn}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={activityForm.thirdPoints}
                      onChange={(e) => setActivityForm({ ...activityForm, thirdPoints: Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded border border-amber-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-500">अङ्क</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingActivity}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black transition shadow-xs disabled:opacity-50"
                >
                  {isCreatingActivity ? 'दर्ता हुँदैछ...' : 'प्रतियोगिता सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit House Leadership Modal */}
      {showEditLeadershipModal && selectedHouseForLeadership && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: selectedHouseForLeadership.colorHex }}
                />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedHouseForLeadership.nameNp} - {language === 'np' ? 'सदन नेतृत्व' : 'Leadership'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditLeadershipModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeadershipSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  हाउस मास्टर (House Master Teacher)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bharat KC (भरत केसी)"
                  value={leadershipForm.masterTeacherName}
                  onChange={(e) => setLeadershipForm({ ...leadershipForm, masterTeacherName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  सदन क्याप्टेन (House Captain Student)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aayush Karki"
                  value={leadershipForm.captainStudentName}
                  onChange={(e) => setLeadershipForm({ ...leadershipForm, captainStudentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  उप-क्याप्टेन (Vice-Captain Student)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pooja Thapa"
                  value={leadershipForm.viceCaptainStudentName}
                  onChange={(e) => setLeadershipForm({ ...leadershipForm, viceCaptainStudentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditLeadershipModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLeadership}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSavingLeadership ? 'सुरक्षित हुँदैछ...' : 'नेतृत्व सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
