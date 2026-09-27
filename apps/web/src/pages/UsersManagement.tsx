import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Shield,
  Plus,
  CheckCircle2,
  Lock,
  Key,
  X,
  UserCheck,
  Pencil,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  Sparkles,
  Search,
  BookOpen,
  GraduationCap,
  Info,
} from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const { language, t } = useLanguage();
  const { user: currentUser, hasRole } = useAuth();
  const isSystemAdmin = hasRole('SYSTEM_ADMIN') || currentUser?.isSuperAdmin;

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'ACCOUNTANT' | 'LIBRARIAN' | 'ADMIN' | 'STUDENT_PARENT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [allMasterPermissions, setAllMasterPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<any | null>(null);

  // Role permissions editing state
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([]);
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  // Edit user state
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    fullNameEn: '',
    fullNameNp: '',
    email: '',
    phone: '',
    roleId: '',
    status: 'ACTIVE',
    password: '',
  });
  const [updating, setUpdating] = useState(false);

  // Delete user state
  const [deleteUserTarget, setDeleteUserTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create user state
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullNameEn: '',
    fullNameNp: '',
    email: '',
    phone: '',
    roleId: '',
  });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('sms_token');
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/roles', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/permissions', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (usersRes.ok && rolesRes.ok && permsRes.ok) {
        const uData = await usersRes.json();
        const rData = await rolesRes.json();
        const pData = await permsRes.json();
        setUsers(uData.users);
        setRoles(rData.roles);
        setAllMasterPermissions(pData.permissions);

        if (rData.roles.length > 0) {
          const initialRole = rData.roles[0];
          setSelectedRoleForMatrix(initialRole);
          setSelectedPermCodes(initialRole.permissions?.map((p: any) => p.code) || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (r: any) => {
    setSelectedRoleForMatrix(r);
    setSelectedPermCodes(r.permissions?.map((p: any) => p.code) || []);
  };

  const togglePermission = (code: string) => {
    if (!isSystemAdmin) return;
    setSelectedPermCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllInModule = (moduleName: string) => {
    if (!isSystemAdmin) return;
    const modulePermCodes = allMasterPermissions
      .filter((p) => p.module === moduleName)
      .map((p) => p.code);
    
    // If all are already selected, deselect them. Otherwise, add all.
    const allSelected = modulePermCodes.every((c) => selectedPermCodes.includes(c));
    if (allSelected) {
      setSelectedPermCodes((prev) => prev.filter((c) => !modulePermCodes.includes(c)));
    } else {
      setSelectedPermCodes((prev) => Array.from(new Set([...prev, ...modulePermCodes])));
    }
  };

  const handleSelectAllPermissions = () => {
    if (!isSystemAdmin) return;
    setSelectedPermCodes(allMasterPermissions.map((p) => p.code));
  };

  const handleClearAllPermissions = () => {
    if (!isSystemAdmin) return;
    setSelectedPermCodes([]);
  };

  const handleResetPermissions = () => {
    if (!selectedRoleForMatrix) return;
    setSelectedPermCodes(selectedRoleForMatrix.permissions?.map((p: any) => p.code) || []);
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleForMatrix || !isSystemAdmin) return;
    setSavingRolePerms(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/users/roles/${selectedRoleForMatrix.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissionCodes: selectedPermCodes }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update role permissions');
      }

      const data = await res.json();
      setMsg({
        type: 'success',
        text: `Permissions for role "${selectedRoleForMatrix.displayNameEn}" updated successfully!`,
      });

      // Update local roles list and selectedRole
      const updatedPermissions = data.permissions;
      setSelectedRoleForMatrix((prev: any) => ({
        ...prev,
        permissions: updatedPermissions,
      }));
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleForMatrix.id ? { ...r, permissions: updatedPermissions } : r
        )
      );
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSavingRolePerms(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create user');
      }

      setMsg({ type: 'success', text: 'User created successfully' });
      setShowAddModal(false);
      setNewUser({
        username: '',
        password: '',
        fullNameEn: '',
        fullNameNp: '',
        email: '',
        phone: '',
        roleId: '',
      });
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (u: any) => {
    setEditUser(u);
    setEditForm({
      fullNameEn: u.fullNameEn || '',
      fullNameNp: u.fullNameNp || '',
      email: u.email || '',
      phone: u.phone || '',
      roleId: u.roles?.[0]?.id || '',
      status: u.status || 'ACTIVE',
      password: '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setUpdating(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update user');
      }

      setMsg({ type: 'success', text: `User "${editUser.username}" updated successfully` });
      setEditUser(null);
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeleting(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('sms_token');
      const res = await fetch(`/api/users/${deleteUserTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete user');
      }

      setMsg({ type: 'success', text: `User "${deleteUserTarget.username}" deleted successfully` });
      setDeleteUserTarget(null);
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  // Group master permissions by module
  const permissionsByModule = allMasterPermissions.reduce<Record<string, any[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const isPermissionsModified = selectedRoleForMatrix && (
    selectedPermCodes.length !== (selectedRoleForMatrix.permissions?.length || 0) ||
    !selectedRoleForMatrix.permissions?.every((p: any) => selectedPermCodes.includes(p.code))
  );

  const teacherCount = users.filter((u) => u.roles?.some((r: any) => r.name === 'TEACHER')).length;
  const accountantCount = users.filter((u) => u.roles?.some((r: any) => r.name === 'ACCOUNTANT')).length;
  const librarianCount = users.filter((u) => u.roles?.some((r: any) => r.name === 'LIBRARIAN')).length;
  const adminCount = users.filter((u) =>
    u.roles?.some((r: any) => ['SYSTEM_ADMIN', 'PRINCIPAL', 'ADMINISTRATIVE_STAFF'].includes(r.name))
  ).length;
  const studentParentCount = users.filter((u) =>
    u.roles?.some((r: any) => ['STUDENT', 'PARENT'].includes(r.name))
  ).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchTerm.trim() ||
      (u.fullNameEn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.fullNameNp || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').includes(searchTerm);

    if (!matchesSearch) return false;

    const roleNames = (u.roles || []).map((r: any) => r.name);
    if (roleFilter === 'TEACHER') return roleNames.includes('TEACHER');
    if (roleFilter === 'ACCOUNTANT') return roleNames.includes('ACCOUNTANT');
    if (roleFilter === 'LIBRARIAN') return roleNames.includes('LIBRARIAN');
    if (roleFilter === 'ADMIN')
      return (
        roleNames.includes('SYSTEM_ADMIN') ||
        roleNames.includes('PRINCIPAL') ||
        roleNames.includes('ADMINISTRATIVE_STAFF')
      );
    if (roleFilter === 'STUDENT_PARENT') return roleNames.includes('STUDENT') || roleNames.includes('PARENT');
    return true;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-400 font-medium">
        Loading user and permission matrix...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Privilege Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{t('users.title')}</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{t('users.subtitle')}</p>
        </div>

        {isSystemAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('users.add_user')}
          </button>
        )}
      </div>

      {/* Multi-User Architecture Notice Banner */}
      <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
              बहु-प्रयोगकर्ता व्यवस्थापन (Multi-User Role Support)
            </div>
            <div className="text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
              विद्यालयमा शिक्षक, लेखापाल, पुस्तकालय कर्मचारी, विद्यार्थी तथा अभिभावकहरू <strong>१ भन्दा बढी (असीमित)</strong> हुन सक्छन्। प्रत्येक व्यक्तिको आ-आफ्नो छुट्टै मोबाइल नम्बर वा युजरनेम, व्यक्तिगत पासवर्ड र अधिकार (Role) हुने गर्दछ।
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setRoleFilter('ALL')}
          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs text-center cursor-pointer transition ${
            roleFilter === 'ALL' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-500 font-semibold">कुल प्रयोगकर्ता</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{users.length}</div>
        </div>
        <div
          onClick={() => setRoleFilter('TEACHER')}
          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs text-center cursor-pointer transition ${
            roleFilter === 'TEACHER' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-blue-600 font-semibold flex items-center justify-center gap-1">📖 शिक्षकहरू</div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">{teacherCount}</div>
        </div>
        <div
          onClick={() => setRoleFilter('ACCOUNTANT')}
          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs text-center cursor-pointer transition ${
            roleFilter === 'ACCOUNTANT' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">💰 लेखापालहरू</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{accountantCount}</div>
        </div>
        <div
          onClick={() => setRoleFilter('LIBRARIAN')}
          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs text-center cursor-pointer transition ${
            roleFilter === 'LIBRARIAN' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-amber-600 font-semibold flex items-center justify-center gap-1">📚 पुस्तकालय</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">{librarianCount}</div>
        </div>
        <div
          onClick={() => setRoleFilter('ADMIN')}
          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs text-center cursor-pointer transition ${
            roleFilter === 'ADMIN' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-purple-600 font-semibold flex items-center justify-center gap-1">⚙️ प्रशासन / प्र.अ.</div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">{adminCount}</div>
        </div>
        <div
          onClick={() => setRoleFilter('STUDENT_PARENT')}
          className={`p-3 bg-white dark:bg-slate-900 rounded-xl border shadow-2xs text-center cursor-pointer transition ${
            roleFilter === 'STUDENT_PARENT' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-xs text-rose-600 font-semibold flex items-center justify-center gap-1">🎒 विद्यार्थी/अभिभावक</div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">{studentParentCount}</div>
        </div>
      </div>

      {/* Role Privilege Banner */}
      <div
        className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          isSystemAdmin
            ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
            : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isSystemAdmin ? <Shield className="w-4 h-4 text-blue-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
          <span>{isSystemAdmin ? t('users.admin_badge') : t('users.staff_badge')}</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          User: {currentUser?.username} ({currentUser?.roles[0]?.name || 'Staff'})
        </div>
      </div>

      {/* Operation Feedback Message */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center space-x-2 font-medium ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Section 1: Staff & System Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              प्रयोगकर्ता खाता सूची ({filteredUsers.length} / {users.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Permanent Audit Log Enabled • भूमिका अनुसार छुट्टाछुट्टै लग-इन
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="नाम, युजरनेम वा फोन खोज्नुहोस्..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: `सबै (${users.length})` },
            { id: 'TEACHER', label: `📖 शिक्षकहरू (${teacherCount})` },
            { id: 'ACCOUNTANT', label: `💰 लेखापालहरू (${accountantCount})` },
            { id: 'LIBRARIAN', label: `📚 पुस्तकालय (${librarianCount})` },
            { id: 'ADMIN', label: `⚙️ प्रशासक / प्र.अ. (${adminCount})` },
            { id: 'STUDENT_PARENT', label: `🎒 विद्यार्थी र अभिभावक (${studentParentCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                roleFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">{t('users.full_name')}</th>
                <th className="px-6 py-3.5">{t('login.username')}</th>
                <th className="px-6 py-3.5">{t('users.role')}</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">{t('users.status')}</th>
                <th className="px-6 py-3.5 text-right">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    कुनै पनि प्रयोगकर्ता भेटिएन (No users match the search/filter criteria)
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {language === 'np' ? u.fullNameNp : u.fullNameEn}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {language === 'np' ? u.fullNameEn : u.fullNameNp}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {u.username}
                        {isSelf && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-sans font-bold">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.roles?.map((r: any) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mr-1.5"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {language === 'np' ? r.displayNameNp : r.displayNameEn}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <div>{u.email || '—'}</div>
                        <div className="text-slate-500 dark:text-slate-400">{u.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isSystemAdmin ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditModal(u)}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                              title="Edit User"
                            >
                              <Pencil className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
                              {t('users.edit_user')}
                            </button>

                            <button
                              onClick={() => setDeleteUserTarget(u)}
                              disabled={isSelf}
                              className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
                                isSelf
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                  : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300'
                              }`}
                              title={isSelf ? t('users.cannot_delete_self') : 'Delete User'}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {t('users.delete_user')}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                            <Lock className="w-3 h-3 mr-1" />
                            {t('users.admin_only')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Interactive Role & Permissions Management (System Admin Facility) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 space-y-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('users.roles_matrix')}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
              Select any role to view or customize its authorized permission privileges. System Administrators can dynamically adjust access rights for Teachers, Accountants, Librarians, and other staff.
            </p>
          </div>

          {/* Quick Action Buttons for System Admin */}
          {isSystemAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllPermissions}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                {t('roles.select_all')}
              </button>
              <button
                type="button"
                onClick={handleClearAllPermissions}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                {t('roles.deselect_all')}
              </button>
              {isPermissionsModified && (
                <button
                  type="button"
                  onClick={handleResetPermissions}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={savingRolePerms || !isPermissionsModified}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingRolePerms ? 'Saving...' : t('roles.save_permissions')}
              </button>
            </div>
          )}
        </div>

        {/* Role Select Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {roles.map((r) => {
            const isSelected = selectedRoleForMatrix?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => handleSelectRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {language === 'np' ? r.displayNameNp : r.displayNameEn} ({r.name})
              </button>
            );
          })}
        </div>

        {/* Selected Role Status & Modification Bar */}
        {selectedRoleForMatrix && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-blue-950 dark:text-blue-100 text-sm">
                  {selectedRoleForMatrix.displayNameEn} ({selectedRoleForMatrix.name})
                </div>
                <div className="text-blue-800 dark:text-blue-300 mt-0.5">
                  {selectedRoleForMatrix.description || 'Configurable role in system'}
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 font-mono font-bold text-blue-900 dark:text-blue-200">
                  {selectedPermCodes.length} / {allMasterPermissions.length} Active
                </div>
                {isPermissionsModified && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[11px] border border-amber-300 dark:border-amber-800">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Unsaved Changes
                  </span>
                )}
              </div>
            </div>

            {/* Permissions Grouped by Module */}
            <div className="space-y-5">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                const moduleActiveCount = perms.filter((p) => selectedPermCodes.includes(p.code)).length;
                const isAllInModuleSelected = moduleActiveCount === perms.length;

                return (
                  <div
                    key={moduleName}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    {/* Module Header */}
                    <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {moduleName} Module
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          {moduleActiveCount} / {perms.length}
                        </span>
                      </div>

                      {isSystemAdmin && (
                        <button
                          type="button"
                          onClick={() => handleSelectAllInModule(moduleName)}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{isAllInModuleSelected ? 'Deselect Module' : 'Select All in Module'}</span>
                        </button>
                      )}
                    </div>

                    {/* Permissions Grid for this Module */}
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {perms.map((p) => {
                        const isChecked = selectedPermCodes.includes(p.code);

                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePermission(p.code)}
                            className={`p-3 rounded-lg border text-xs space-y-1.5 transition cursor-pointer select-none ${
                              isChecked
                                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-800 dark:text-blue-300">
                                {p.code}
                              </span>
                              {isSystemAdmin ? (
                                <span className={isChecked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400" />
                                  )}
                                </span>
                              ) : (
                                isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </div>

                            <div className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                              {language === 'np' ? p.descriptionNp : p.descriptionEn}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal (Exclusively for System Admin) */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {t('users.edit_user')}: <span className="font-mono text-blue-600 dark:text-blue-400">{editUser.username}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullNameEn}
                    onChange={(e) => setEditForm({ ...editForm, fullNameEn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (Nepali) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullNameNp}
                    onChange={(e) => setEditForm({ ...editForm, fullNameNp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    required
                    value={editForm.roleId}
                    onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {language === 'np' ? r.displayNameNp : r.displayNameEn} ({r.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reset Password (optional)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  placeholder="Leave empty to keep existing password"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Only enter text if you wish to overwrite this user's password.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal (Exclusively for System Admin) */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 dark:border-red-950 bg-red-50/70 dark:bg-red-950/30 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold">{t('users.delete_user')}</h3>
              </div>
              <button
                onClick={() => setDeleteUserTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {t('users.confirm_delete')}
              </p>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1 font-mono">
                <div><strong>Username:</strong> {deleteUserTarget.username}</div>
                <div><strong>Name:</strong> {deleteUserTarget.fullNameEn} ({deleteUserTarget.fullNameNp})</div>
                <div><strong>Role:</strong> {deleteUserTarget.roles?.[0]?.name || 'N/A'}</div>
              </div>

              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Warning: This user account and all role bindings will be removed. This action is permanently audited in the system ledger.
              </p>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteUserTarget(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && isSystemAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-900 dark:text-white">{t('users.add_user')}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. sita_s"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.fullNameEn}
                    onChange={(e) => setNewUser({ ...newUser, fullNameEn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="Sita Sharma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (Nepali) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.fullNameNp}
                    onChange={(e) => setNewUser({ ...newUser, fullNameNp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="सीता शर्मा"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="sita@school.edu.np"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign System Role *
                </label>
                <select
                  required
                  value={newUser.roleId}
                  onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {language === 'np' ? r.displayNameNp : r.displayNameEn} ({r.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
