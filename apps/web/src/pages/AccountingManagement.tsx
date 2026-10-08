import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Landmark,
  Plus,
  Search,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  ChartOfAccount,
  AccountGroup,
  JournalVoucher,
  JournalVoucherType,
  GeneralLedgerReport,
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
} from '@sms/shared';

export const AccountingManagement: React.FC = () => {
  const { language, formatNumber } = useLanguage();
  const isNp = language === 'np';
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'vouchers' | 'ledger' | 'trial_balance' | 'profit_loss' | 'balance_sheet' | 'coa'
  >('vouchers');

  // Data states
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
  const [coa, setCoa] = useState<ChartOfAccount[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Voucher Entry Modal
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<JournalVoucherType>('JV');
  const [voucherDateBs, setVoucherDateBs] = useState('2083-01-20');
  const [narration, setNarration] = useState('');
  const [voucherRows, setVoucherRows] = useState<
    { accountId: string; particulars: string; debitAmount: number; creditAmount: number }[]
  >([
    { accountId: '', particulars: '', debitAmount: 0, creditAmount: 0 },
    { accountId: '', particulars: '', debitAmount: 0, creditAmount: 0 },
  ]);

  // General Ledger state
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>('');
  const [ledgerReport, setLedgerReport] = useState<GeneralLedgerReport | null>(null);

  // Reports states
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);

  // New Account Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccNameEn, setNewAccNameEn] = useState('');
  const [newAccNameNp, setNewAccNameNp] = useState('');
  const [newAccGroupId, setNewAccGroupId] = useState('');
  const [newAccOpeningDr, setNewAccOpeningDr] = useState(0);
  const [newAccOpeningCr, setNewAccOpeningCr] = useState(0);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-hide feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Headers for API
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || localStorage.getItem('sms_token')}`,
  });

  // Fetch initial COA and Groups
  const fetchData = async () => {
    setLoading(true);
    try {
      const [coaRes, groupsRes, vouchersRes] = await Promise.all([
        fetch('/api/accounting/coa', { headers: getAuthHeaders() }),
        fetch('/api/accounting/groups', { headers: getAuthHeaders() }),
        fetch('/api/accounting/vouchers', { headers: getAuthHeaders() }),
      ]);

      if (coaRes.ok) {
        const coaData = await coaRes.json();
        setCoa(coaData);
        if (coaData.length > 0 && !selectedLedgerAccountId) {
          setSelectedLedgerAccountId(coaData[0].id);
        }
      }
      if (groupsRes.ok) {
        setGroups(await groupsRes.json());
      }
      if (vouchersRes.ok) {
        setVouchers(await vouchersRes.json());
      }
    } catch (err) {
      console.error('Error fetching accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch report data on tab switch
  useEffect(() => {
    if (activeTab === 'ledger' && selectedLedgerAccountId) {
      fetchLedger(selectedLedgerAccountId);
    } else if (activeTab === 'trial_balance') {
      fetchTrialBalance();
    } else if (activeTab === 'profit_loss') {
      fetchProfitLoss();
    } else if (activeTab === 'balance_sheet') {
      fetchBalanceSheet();
    }
  }, [activeTab, selectedLedgerAccountId]);

  const fetchLedger = async (accId: string) => {
    try {
      const res = await fetch(`/api/accounting/reports/ledger/${accId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setLedgerReport(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrialBalance = async () => {
    try {
      const res = await fetch('/api/accounting/reports/trial-balance', { headers: getAuthHeaders() });
      if (res.ok) {
        setTrialBalance(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfitLoss = async () => {
    try {
      const res = await fetch('/api/accounting/reports/profit-loss', { headers: getAuthHeaders() });
      if (res.ok) {
        setProfitLoss(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      const res = await fetch('/api/accounting/reports/balance-sheet', { headers: getAuthHeaders() });
      if (res.ok) {
        setBalanceSheet(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Voucher row management
  const addVoucherRow = () => {
    setVoucherRows([...voucherRows, { accountId: '', particulars: '', debitAmount: 0, creditAmount: 0 }]);
  };

  const removeVoucherRow = (idx: number) => {
    if (voucherRows.length <= 2) return;
    setVoucherRows(voucherRows.filter((_, i) => i !== idx));
  };

  const updateVoucherRow = (idx: number, field: string, val: any) => {
    const updated = [...voucherRows];
    updated[idx] = { ...updated[idx], [field]: val };
    setVoucherRows(updated);
  };

  // Calculations for Voucher Entry
  const totalDebit = Math.round(voucherRows.reduce((sum, r) => sum + (Number(r.debitAmount) || 0), 0) * 100) / 100;
  const totalCredit = Math.round(voucherRows.reduce((sum, r) => sum + (Number(r.creditAmount) || 0), 0) * 100) / 100;
  const difference = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
  const isVoucherBalanced = difference < 0.01 && totalDebit > 0;

  // Handle Voucher Submission
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVoucherBalanced) {
      setFeedback({
        type: 'error',
        message: isNp
          ? 'डेबिट र क्रेडिट रकम बराबर हुनुपर्छ! भौचर सेभ गर्न सकिएन।'
          : 'Total Debit must equal Total Credit! Voucher cannot be saved.',
      });
      return;
    }

    const validRows = voucherRows.filter((r) => r.accountId && (r.debitAmount > 0 || r.creditAmount > 0));
    if (validRows.length < 2) {
      setFeedback({
        type: 'error',
        message: isNp ? 'कम्तिमा २ वटा खाता पंक्ति छान्नुहोस्।' : 'Please select at least 2 valid account rows.',
      });
      return;
    }

    try {
      const res = await fetch('/api/accounting/vouchers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          voucherType,
          voucherDateBs,
          narration,
          items: validRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error creating voucher');
      }

      setFeedback({
        type: 'success',
        message: isNp ? 'गोश्वारा भौचर सफलतापूर्वक प्रविष्टि भयो!' : 'Journal Voucher posted successfully!',
      });
      setIsVoucherModalOpen(false);
      setNarration('');
      setVoucherRows([
        { accountId: '', particulars: '', debitAmount: 0, creditAmount: 0 },
        { accountId: '', particulars: '', debitAmount: 0, creditAmount: 0 },
      ]);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Handle Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounting/coa', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: newAccCode,
          nameEn: newAccNameEn,
          nameNp: newAccNameNp,
          groupId: newAccGroupId,
          openingBalanceDr: Number(newAccOpeningDr) || 0,
          openingBalanceCr: Number(newAccOpeningCr) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error creating account');
      }

      setFeedback({
        type: 'success',
        message: isNp ? 'नयाँ खाता सफलतापूर्वक थपियो!' : 'New account added successfully!',
      });
      setIsAccountModalOpen(false);
      setNewAccCode('');
      setNewAccNameEn('');
      setNewAccNameNp('');
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Landmark className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {isNp ? 'दोहोरो लेखा प्रणाली' : 'Double-Entry Accounting System'}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {isNp ? 'आ.व. २०८२/०८३' : 'FY 2082/083'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isNp
                  ? 'गोश्वारा भौचर, मुख्य खाता (लेजर), सन्तुलन परीक्षण, आय-व्यय तथा वासलात विवरण'
                  : 'Journal Vouchers, General Ledger, Trial Balance, Income & Expenditure and Balance Sheet'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ गोश्वारा भौचर (JV)' : 'New Voucher Entry'}
            </button>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-sm transition-colors gap-2"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ खाता (COA)' : 'Add Account'}
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-center space-x-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 overflow-x-auto space-x-1">
          {[
            { id: 'vouchers', labelNp: 'गोश्वारा भौचरहरू (Vouchers)', labelEn: 'Journal Vouchers', icon: FileText },
            { id: 'ledger', labelNp: 'मुख्य खाता / लेजर (General Ledger)', labelEn: 'General Ledger', icon: BookOpen },
            { id: 'trial_balance', labelNp: 'सन्तुलन परीक्षण (Trial Balance)', labelEn: 'Trial Balance', icon: Scale },
            { id: 'profit_loss', labelNp: 'आय-व्यय विवरण (P&L Statement)', labelEn: 'Income & Expenditure', icon: TrendingUp },
            { id: 'balance_sheet', labelNp: 'वासलात (Balance Sheet)', labelEn: 'Balance Sheet', icon: Landmark },
            { id: 'coa', labelNp: 'खाता सूची (Chart of Accounts)', labelEn: 'Chart of Accounts', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isNp ? tab.labelNp : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: JOURNAL VOUCHERS LIST */}
      {/* ========================================================================= */}
      {activeTab === 'vouchers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              {isNp ? 'गोश्वारा भौचर अभिलेख (Journal Vouchers)' : 'Posted Vouchers'}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={isNp ? 'भौचर नं. वा कैफियत खोज्नुहोस्...' : 'Search vouchers...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                title="रिफ्रेस"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'भौचर नम्बर' : 'Voucher No.'}</th>
                  <th className="py-3 px-4">{isNp ? 'प्रकार' : 'Type'}</th>
                  <th className="py-3 px-4">{isNp ? 'मिति (वि.सं.)' : 'Date (BS)'}</th>
                  <th className="py-3 px-4">{isNp ? 'कैफियत (Narration)' : 'Narration'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'डेबिट रकम (रू)' : 'Total Debit (NPR)'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'क्रेडिट रकम (रू)' : 'Total Credit (NPR)'}</th>
                  <th className="py-3 px-4 text-center">{isNp ? 'स्थिति' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {vouchers
                  .filter(
                    (v) =>
                      v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      v.narration.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((v) => (
                    <React.Fragment key={v.id}>
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {v.voucherNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              v.voucherType === 'CR' || v.voucherType === 'BR'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : v.voucherType === 'CP' || v.voucherType === 'BP'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {v.voucherType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium">{formatNumber(v.voucherDateBs)}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate" title={v.narration}>
                          {v.narration}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                          {formatNumber(v.totalDebit.toLocaleString())}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                          {formatNumber(v.totalCredit.toLocaleString())}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {isNp ? 'सदर (Posted)' : 'POSTED'}
                          </span>
                        </td>
                      </tr>
                      {/* Expanded rows for items */}
                      {v.items && v.items.length > 0 && (
                        <tr className="bg-slate-50/40 dark:bg-slate-950/40">
                          <td colSpan={7} className="py-2.5 px-6">
                            <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                              <table className="w-full">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  <tr>
                                    <th className="py-1.5 px-3">{isNp ? 'खाता (Account)' : 'Account'}</th>
                                    <th className="py-1.5 px-3">{isNp ? 'विवरण' : 'Particulars'}</th>
                                    <th className="py-1.5 px-3 text-right">{isNp ? 'डेबिट (Dr)' : 'Debit (Dr)'}</th>
                                    <th className="py-1.5 px-3 text-right">{isNp ? 'क्रेडिट (Cr)' : 'Credit (Cr)'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.items.map((it, idx) => (
                                    <tr key={idx} className="border-t border-slate-200/50 dark:border-slate-800/60">
                                      <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                        {it.accountCode} - {isNp ? it.accountNameNp : it.accountNameEn}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-500">{it.particulars || '-'}</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                                        {it.debitAmount > 0 ? formatNumber(it.debitAmount.toLocaleString()) : '-'}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono text-rose-700 dark:text-rose-400">
                                        {it.creditAmount > 0 ? formatNumber(it.creditAmount.toLocaleString()) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                {vouchers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      {isNp ? 'कुनै पनि गोश्वारा भौचर दर्ता भएको छैन।' : 'No vouchers recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERAL LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                {isNp ? 'मुख्य खाता / लेजर (General Ledger)' : 'General Ledger Account'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {isNp ? 'खाता छान्नुहोस् र कारोबार विवरण तथा रनिङ ब्यालेन्स हेर्नुहोस्' : 'Select an account to view its statement'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {isNp ? 'खाता छान्नुहोस्:' : 'Select Account:'}
              </label>
              <select
                value={selectedLedgerAccountId}
                onChange={(e) => setSelectedLedgerAccountId(e.target.value)}
                className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
              >
                {coa.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {isNp ? acc.nameNp : acc.nameEn}
                  </option>
                ))}
              </select>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm gap-2"
              >
                <Printer className="w-4 h-4" />
                {isNp ? 'प्रिन्ट' : 'Print'}
              </button>
            </div>
          </div>

          {ledgerReport ? (
            <div className="space-y-4">
              {/* Account summary card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-sm">
                <div>
                  <span className="text-xs text-slate-400 font-semibold">{isNp ? 'खाता शीर्षक' : 'Account'}</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {ledgerReport.account.code} - {isNp ? ledgerReport.account.nameNp : ledgerReport.account.nameEn}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold">{isNp ? 'लेखा वर्ग (Nature)' : 'Nature'}</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {ledgerReport.account.group?.nature || 'ASSET'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold">{isNp ? 'सुरुवाती मौज्दात (Opening)' : 'Opening Balance'}</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    रू. {formatNumber(ledgerReport.openingBalance.toLocaleString())} ({ledgerReport.openingBalanceType})
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold">{isNp ? 'हालको शेष (Closing Balance)' : 'Closing Balance'}</span>
                  <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 text-base">
                    रू. {formatNumber(ledgerReport.closingBalance.toLocaleString())} ({ledgerReport.closingBalanceType})
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">{isNp ? 'मिति' : 'Date'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'भौचर नं.' : 'Voucher No'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'प्रकार' : 'Type'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'विवरण तथा कैफियत' : 'Particulars'}</th>
                      <th className="py-2.5 px-3 text-right">{isNp ? 'डेबिट (Dr)' : 'Debit (Dr)'}</th>
                      <th className="py-2.5 px-3 text-right">{isNp ? 'क्रेडिट (Cr)' : 'Credit (Cr)'}</th>
                      <th className="py-2.5 px-3 text-right">{isNp ? 'रनिङ ब्यालेन्स' : 'Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <td className="py-2 px-3">-</td>
                      <td className="py-2 px-3">-</td>
                      <td className="py-2 px-3">OPENING</td>
                      <td className="py-2 px-3 italic">{isNp ? 'सुरुवाती मौज्दात शेष' : 'Opening Balance Brought Forward'}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {ledgerReport.openingBalanceType === 'Dr' ? formatNumber(ledgerReport.openingBalance.toLocaleString()) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {ledgerReport.openingBalanceType === 'Cr' ? formatNumber(ledgerReport.openingBalance.toLocaleString()) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-600 font-bold">
                        {formatNumber(ledgerReport.openingBalance.toLocaleString())} {ledgerReport.openingBalanceType}
                      </td>
                    </tr>

                    {ledgerReport.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium">{formatNumber(entry.dateBs)}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 font-medium">{entry.voucherNumber}</td>
                        <td className="py-2.5 px-3">{entry.voucherType}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{entry.narration}</p>
                          {entry.particulars && <p className="text-xs text-slate-400">{entry.particulars}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                          {entry.debit > 0 ? formatNumber(entry.debit.toLocaleString()) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700 dark:text-rose-400">
                          {entry.credit > 0 ? formatNumber(entry.credit.toLocaleString()) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatNumber(entry.balance.toLocaleString())} <span className="text-xs">{entry.balanceType}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right">
                        {isNp ? 'जम्मा (Total) / अन्तिम शेष (Closing Balance):' : 'Total / Closing Balance:'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatNumber(ledgerReport.totalDebit.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-700 dark:text-rose-400">
                        {formatNumber(ledgerReport.totalCredit.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-indigo-700 dark:text-indigo-400 text-base">
                        {formatNumber(ledgerReport.closingBalance.toLocaleString())} {ledgerReport.closingBalanceType}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              {isNp ? 'खाता छान्नुहोस्...' : 'Select an account to view ledger...'}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRIAL BALANCE */}
      {/* ========================================================================= */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                {isNp ? 'सन्तुलन परीक्षण (Trial Balance Report)' : 'Trial Balance'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp
                  ? 'सम्पूर्ण खाताहरूको कुल डेबिट र क्रेडिट शेष बराबर भएको प्रमाणित प्रतिवेदन'
                  : 'Verification statement that Total Debits equal Total Credits'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {trialBalance && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold gap-1.5 ${
                    trialBalance.isBalanced
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                  }`}
                >
                  {trialBalance.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {trialBalance.isBalanced
                    ? isNp
                      ? 'सन्तुलित छ (Balanced)'
                      : 'BALANCED'
                    : isNp
                    ? 'असन्तुलित (Unbalanced)'
                    : 'UNBALANCED'}
                </span>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 text-sm gap-2"
              >
                <Printer className="w-4 h-4" />
                {isNp ? 'प्रिन्ट' : 'Print'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'खाता कोड' : 'Account Code'}</th>
                  <th className="py-3 px-4">{isNp ? 'खाताको नाम (Account Name)' : 'Account Name'}</th>
                  <th className="py-3 px-4">{isNp ? 'वर्ग (Nature)' : 'Nature'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'डेबिट शेष (Dr NPR)' : 'Debit Balance'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'क्रेडिट शेष (Cr NPR)' : 'Credit Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trialBalance?.items.map((item) => (
                  <tr key={item.accountId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono font-semibold text-indigo-600">{item.accountCode}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                      {isNp ? item.accountNameNp : item.accountNameEn}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.nature}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.debit > 0 ? formatNumber(item.debit.toLocaleString()) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.credit > 0 ? formatNumber(item.credit.toLocaleString()) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right">
                    {isNp ? 'कुल जम्मा (Total):' : 'Grand Total:'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base text-indigo-600 dark:text-indigo-400">
                    रू. {formatNumber(trialBalance?.totalDebit.toLocaleString() || '0')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base text-indigo-600 dark:text-indigo-400">
                    रू. {formatNumber(trialBalance?.totalCredit.toLocaleString() || '0')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROFIT & LOSS / INCOME & EXPENDITURE */}
      {/* ========================================================================= */}
      {activeTab === 'profit_loss' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                {isNp ? 'आय-व्यय विवरण (Income & Expenditure Account)' : 'Profit & Loss Statement'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp ? 'शैक्षिक राजस्व आम्दानी तथा सञ्चालन खर्चको वित्तीय हिसाब' : 'School revenues vs operating expenses'}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 text-sm gap-2"
            >
              <Printer className="w-4 h-4" />
              {isNp ? 'प्रिन्ट' : 'Print'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Column */}
            <div className="border border-emerald-200 dark:border-emerald-900/60 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {isNp ? 'आम्दानी तथा राजस्व (Revenue & Income)' : 'Income / Revenue'}
                </h3>
                <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">
                  रू. {formatNumber(profitLoss?.totalRevenue.toLocaleString() || '0')}
                </span>
              </div>
              <div className="p-4 space-y-2 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {profitLoss?.revenues.map((r) => (
                  <div key={r.accountId} className="flex justify-between py-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      {r.code} - {isNp ? r.nameNp : r.nameEn}
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      रू. {formatNumber(r.amount.toLocaleString())}
                    </span>
                  </div>
                ))}
                {(!profitLoss?.revenues || profitLoss.revenues.length === 0) && (
                  <p className="text-slate-400 text-center py-4">{isNp ? 'कुनै आम्दानी प्रविष्टि छैन' : 'No revenues'}</p>
                )}
              </div>
            </div>

            {/* Expenses Column */}
            <div className="border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden">
              <div className="bg-rose-50 dark:bg-rose-950/60 p-4 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                <h3 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  {isNp ? 'खर्च तथा व्यय (Expenditure & Expenses)' : 'Expenses'}
                </h3>
                <span className="font-mono font-bold text-rose-900 dark:text-rose-200">
                  रू. {formatNumber(profitLoss?.totalExpense.toLocaleString() || '0')}
                </span>
              </div>
              <div className="p-4 space-y-2 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {profitLoss?.expenses.map((e) => (
                  <div key={e.accountId} className="flex justify-between py-2">
                    <span className="text-slate-700 dark:text-slate-300">
                      {e.code} - {isNp ? e.nameNp : e.nameEn}
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      रू. {formatNumber(e.amount.toLocaleString())}
                    </span>
                  </div>
                ))}
                {(!profitLoss?.expenses || profitLoss.expenses.length === 0) && (
                  <p className="text-slate-400 text-center py-4">{isNp ? 'कुनै खर्च प्रविष्टि छैन' : 'No expenses'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Net Surplus/Deficit Banner */}
          {profitLoss && (
            <div
              className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                profitLoss.netSurplus >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div>
                <h4 className="font-bold text-base">
                  {profitLoss.netSurplus >= 0
                    ? isNp
                      ? 'खुद बचत (Net Surplus / Retained Earnings)'
                      : 'Net Surplus'
                    : isNp
                    ? 'खुद घाटा (Net Deficit)'
                    : 'Net Deficit'}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {isNp
                    ? 'कुल आम्दानी - कुल खर्च = बचत रकम (वासलातको पुँजी कोषमा स्वतः थप हुनेछ)'
                    : 'Total Revenue minus Total Expenses (Carried to Balance Sheet Equity)'}
                </p>
              </div>
              <div className="font-mono text-2xl font-black">
                रू. {formatNumber(profitLoss.netSurplus.toLocaleString())}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BALANCE SHEET */}
      {/* ========================================================================= */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                {isNp ? 'वासलात (Balance Sheet Statement)' : 'Balance Sheet'}
              </h2>
              <p className="text-sm text-slate-500">
                {isNp
                  ? 'सम्पत्ति = दायित्व + पुँजी तथा कोष (Assets = Liabilities + Equity)'
                  : 'Financial position as of current date'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {balanceSheet && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold gap-1.5 ${
                    balanceSheet.isBalanced
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {balanceSheet.isBalanced
                    ? isNp
                      ? 'समीकरण सन्तुलित छ (Assets = Liabilities + Equity)'
                      : 'BALANCED'
                    : isNp
                    ? 'असन्तुलित'
                    : 'UNBALANCED'}
                </span>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 text-sm gap-2"
              >
                <Printer className="w-4 h-4" />
                {isNp ? 'प्रिन्ट' : 'Print'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets Column */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isNp ? 'सम्पत्तिहरू (Assets)' : 'Assets'}
                  </h3>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    रू. {formatNumber(balanceSheet?.totalAssets.toLocaleString() || '0')}
                  </span>
                </div>
                <div className="p-4 space-y-2 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                  {balanceSheet?.assets.map((a) => (
                    <div key={a.accountId} className="flex justify-between py-2">
                      <span className="text-slate-700 dark:text-slate-300">
                        {a.code} - {isNp ? a.nameNp : a.nameEn}
                      </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        रू. {formatNumber(a.amount.toLocaleString())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-base">
                <span>{isNp ? 'कुल सम्पत्ति (Total Assets):' : 'Total Assets:'}</span>
                <span className="font-mono text-indigo-600">
                  रू. {formatNumber(balanceSheet?.totalAssets.toLocaleString() || '0')}
                </span>
              </div>
            </div>

            {/* Liabilities & Equity Column */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isNp ? 'दायित्व तथा पुँजी कोष (Liabilities & Equity)' : 'Liabilities & Equity'}
                  </h3>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    रू. {formatNumber(balanceSheet?.totalLiabilitiesAndEquity.toLocaleString() || '0')}
                  </span>
                </div>
                <div className="p-4 space-y-4 text-sm">
                  {/* Liabilities */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {isNp ? 'चालु दायित्व (Liabilities)' : 'Liabilities'}
                    </h4>
                    <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                      {balanceSheet?.liabilities.map((l) => (
                        <div key={l.accountId} className="flex justify-between py-1">
                          <span className="text-slate-700 dark:text-slate-300">
                            {l.code} - {isNp ? l.nameNp : l.nameEn}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white">
                            रू. {formatNumber(l.amount.toLocaleString())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equity & Reserves */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {isNp ? 'पुँजी तथा कोष (Capital & Equity)' : 'Capital & Equity'}
                    </h4>
                    <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                      {balanceSheet?.equity.map((eq) => (
                        <div key={eq.accountId} className="flex justify-between py-1">
                          <span className="text-slate-700 dark:text-slate-300">
                            {eq.code} - {isNp ? eq.nameNp : eq.nameEn}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white">
                            रू. {formatNumber(eq.amount.toLocaleString())}
                          </span>
                        </div>
                      ))}
                      {/* Net Surplus added from P&L */}
                      <div className="flex justify-between py-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <span>{isNp ? 'संचित नाफा/बचत (Retained Surplus from P&L)' : 'Retained Surplus (P&L)'}</span>
                        <span className="font-mono">
                          रू. {formatNumber(balanceSheet?.netSurplus.toLocaleString() || '0')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-base">
                <span>{isNp ? 'कुल दायित्व र पुँजी कोष:' : 'Total Liabilities & Equity:'}</span>
                <span className="font-mono text-indigo-600">
                  रू. {formatNumber(balanceSheet?.totalLiabilitiesAndEquity.toLocaleString() || '0')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CHART OF ACCOUNTS (COA) */}
      {/* ========================================================================= */}
      {activeTab === 'coa' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              {isNp ? 'खाता सूची (Chart of Accounts Master)' : 'Chart of Accounts Master'}
            </h2>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              {isNp ? 'नयाँ खाता दर्ता' : 'Add New Account'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">{isNp ? 'कोड' : 'Code'}</th>
                  <th className="py-3 px-4">{isNp ? 'खाताको नाम (नेपाली)' : 'Name (Nepali)'}</th>
                  <th className="py-3 px-4">{isNp ? 'खाताको नाम (English)' : 'Name (English)'}</th>
                  <th className="py-3 px-4">{isNp ? 'लेखा समूह' : 'Group'}</th>
                  <th className="py-3 px-4">{isNp ? 'वर्ग (Nature)' : 'Nature'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'सुरुवाती मौज्दात' : 'Opening'}</th>
                  <th className="py-3 px-4 text-right">{isNp ? 'हालको शेष' : 'Current Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {coa.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{acc.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{acc.nameNp}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{acc.nameEn}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {acc.group ? (isNp ? acc.group.nameNp : acc.group.nameEn) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          acc.group?.nature === 'ASSET'
                            ? 'bg-blue-100 text-blue-800'
                            : acc.group?.nature === 'LIABILITY'
                            ? 'bg-amber-100 text-amber-800'
                            : acc.group?.nature === 'EQUITY'
                            ? 'bg-purple-100 text-purple-800'
                            : acc.group?.nature === 'REVENUE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {acc.group?.nature || 'ASSET'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {acc.openingBalanceDr > 0
                        ? `${formatNumber(acc.openingBalanceDr.toLocaleString())} Dr`
                        : acc.openingBalanceCr > 0
                        ? `${formatNumber(acc.openingBalanceCr.toLocaleString())} Cr`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {acc.currentBalanceDr > 0
                        ? `${formatNumber(acc.currentBalanceDr.toLocaleString())} Dr`
                        : acc.currentBalanceCr > 0
                        ? `${formatNumber(acc.currentBalanceCr.toLocaleString())} Cr`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NEW JOURNAL VOUCHER (JV) ENTRY */}
      {/* ========================================================================= */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isNp ? 'नयाँ गोश्वारा भौचर प्रविष्टि (New Journal Voucher)' : 'Post New Accounting Voucher'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isNp
                      ? 'दोहोरो लेखा नियम: डेबिट र क्रेडिट कुल रकम बराबर हुनैपर्छ'
                      : 'Double Entry Rule: Sum of Debits must equal Sum of Credits'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'भौचर प्रकार (Voucher Type)' : 'Voucher Type'}
                  </label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="JV">JV - गोश्वारा भौचर (Journal Voucher)</option>
                    <option value="CP">CP - नगद भुक्तानी (Cash Payment)</option>
                    <option value="BP">BP - बैंक भुक्तानी (Bank Payment)</option>
                    <option value="CR">CR - नगद आम्दानी (Cash Receipt)</option>
                    <option value="BR">BR - बैंक आम्दानी (Bank Receipt)</option>
                    <option value="CV">CV - कन्ट्रा भौचर (Contra Voucher)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'भौचर मिति (वि.सं.)' : 'Voucher Date (B.S.)'}
                  </label>
                  <input
                    type="text"
                    value={voucherDateBs}
                    onChange={(e) => setVoucherDateBs(e.target.value)}
                    placeholder="2083-01-20"
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isNp ? 'आर्थिक वर्ष' : 'Fiscal Year'}
                  </label>
                  <input
                    type="text"
                    value="2082/083"
                    disabled
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-sm text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isNp ? 'कैफियत / व्यहोरा (Narration)' : 'Narration / Description'}
                </label>
                <input
                  type="text"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder={isNp ? 'कारोबारको स्पष्ट व्यहोरा...' : 'Enter voucher narration...'}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Rows Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 w-1/3">{isNp ? 'खाता (Account Head)' : 'Account'}</th>
                      <th className="py-2.5 px-3">{isNp ? 'विवरण (Particulars)' : 'Particulars'}</th>
                      <th className="py-2.5 px-3 w-32 text-right">{isNp ? 'डेबिट रू. (Dr)' : 'Debit (Dr)'}</th>
                      <th className="py-2.5 px-3 w-32 text-right">{isNp ? 'क्रेडिट रू. (Cr)' : 'Credit (Cr)'}</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {voucherRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <select
                            value={row.accountId}
                            onChange={(e) => updateVoucherRow(idx, 'accountId', e.target.value)}
                            required
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- {isNp ? 'खाता छान्नुहोस्' : 'Select Account'} --</option>
                            {coa.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {isNp ? acc.nameNp : acc.nameEn}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder={isNp ? 'विवरण' : 'Particulars'}
                            value={row.particulars}
                            onChange={(e) => updateVoucherRow(idx, 'particulars', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.debitAmount || ''}
                            onChange={(e) => updateVoucherRow(idx, 'debitAmount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.creditAmount || ''}
                            onChange={(e) => updateVoucherRow(idx, 'creditAmount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs text-right font-mono text-rose-700 dark:text-rose-400 font-semibold"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {voucherRows.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeVoucherRow(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700 text-sm">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={addVoucherRow}
                          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isNp ? '+ पंक्ति थप्नुहोस् (Add Line)' : '+ Add Row'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-base">
                        रू. {formatNumber(totalDebit.toLocaleString())}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700 text-base">
                        रू. {formatNumber(totalCredit.toLocaleString())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance Verification Strip */}
              <div
                className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold ${
                  isVoucherBalanced
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isVoucherBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>
                    {isVoucherBalanced
                      ? isNp
                        ? 'डेबिट र क्रेडिट रकम बराबर छ (Voucher is Balanced)'
                        : 'Voucher is Balanced'
                      : isNp
                      ? `असन्तुलित! डेबिट र क्रेडिट बीचको फरक: रू. ${formatNumber(difference.toLocaleString())}`
                      : `Unbalanced! Difference: NPR ${difference.toLocaleString()}`}
                  </span>
                </div>
                <div className="font-mono">
                  Dr: {formatNumber(totalDebit)} | Cr: {formatNumber(totalCredit)}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  {isNp ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!isVoucherBalanced}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                  {isNp ? 'भौचर सदर गरी सेभ गर्नुहोस्' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW ACCOUNT (COA) */}
      {/* ========================================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                {isNp ? 'नयाँ खाता दर्ता (Add Account to COA)' : 'Add New Account'}
              </h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'लेखा समूह (Account Group)' : 'Group'}</label>
                <select
                  value={newAccGroupId}
                  onChange={(e) => setNewAccGroupId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                >
                  <option value="">-- {isNp ? 'समूह छान्नुहोस्' : 'Select Group'} --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} - {isNp ? g.nameNp : g.nameEn} ({g.nature})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'खाता कोड (Account Code)' : 'Account Code'}</label>
                <input
                  type="text"
                  placeholder="उदा: 1005, 5004"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'खाताको नाम (नेपाली)' : 'Name (Nepali)'}</label>
                <input
                  type="text"
                  placeholder="उदा: खेलकुद सामग्री मौज्दात"
                  value={newAccNameNp}
                  onChange={(e) => setNewAccNameNp(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">{isNp ? 'खाताको नाम (English)' : 'Name (English)'}</label>
                <input
                  type="text"
                  placeholder="e.g. Sports Equipment Stock"
                  value={newAccNameEn}
                  onChange={(e) => setNewAccNameEn(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'सुरुवाती डेबिट (Dr)' : 'Opening Debit'}</label>
                  <input
                    type="number"
                    min="0"
                    value={newAccOpeningDr}
                    onChange={(e) => setNewAccOpeningDr(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{isNp ? 'सुरुवाती क्रेडिट (Cr)' : 'Opening Credit'}</label>
                  <input
                    type="number"
                    min="0"
                    value={newAccOpeningCr}
                    onChange={(e) => setNewAccOpeningCr(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700"
                >
                  {isNp ? 'रद्द' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium">
                  {isNp ? 'सेभ गर्नुहोस्' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingManagement;
