export type AccountNature = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type JournalVoucherType = 'JV' | 'CR' | 'BR' | 'CP' | 'BP' | 'CV';
export type JournalVoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface AccountGroup {
  id: string;
  schoolId: string;
  code: string;
  nameEn: string;
  nameNp: string;
  nature: AccountNature;
  parentGroupId?: string | null;
  displayOrder: number;
  createdAt?: string;
}

export interface ChartOfAccount {
  id: string;
  schoolId: string;
  code: string;
  nameEn: string;
  nameNp: string;
  groupId: string;
  group?: AccountGroup;
  openingBalanceDr: number;
  openingBalanceCr: number;
  currentBalanceDr: number;
  currentBalanceCr: number;
  isSystemAccount: boolean;
  isActive: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalVoucherItem {
  id?: string;
  voucherId?: string;
  accountId: string;
  accountCode?: string;
  accountNameEn?: string;
  accountNameNp?: string;
  particulars?: string | null;
  debitAmount: number;
  creditAmount: number;
  displayOrder?: number;
}

export interface JournalVoucher {
  id: string;
  schoolId: string;
  voucherNumber: string;
  voucherType: JournalVoucherType;
  voucherDateBs: string;
  voucherDateAd: string;
  fiscalYearBs: string;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalVoucherStatus;
  attachmentUrl?: string | null;
  referenceModule?: string | null;
  referenceId?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  items?: JournalVoucherItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateJournalVoucherPayload {
  voucherType: JournalVoucherType;
  voucherDateBs: string;
  narration: string;
  attachmentUrl?: string | null;
  items: {
    accountId: string;
    particulars?: string;
    debitAmount: number;
    creditAmount: number;
  }[];
}

export interface GeneralLedgerEntry {
  dateBs: string;
  voucherNumber: string;
  voucherType: string;
  narration: string;
  particulars?: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface GeneralLedgerReport {
  account: ChartOfAccount;
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  entries: GeneralLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: 'Dr' | 'Cr';
}

export interface TrialBalanceItem {
  accountId: string;
  accountCode: string;
  accountNameEn: string;
  accountNameNp: string;
  nature: AccountNature;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface ProfitLossReport {
  revenues: { accountId: string; code: string; nameEn: string; nameNp: string; amount: number }[];
  expenses: { accountId: string; code: string; nameEn: string; nameNp: string; amount: number }[];
  totalRevenue: number;
  totalExpense: number;
  netSurplus: number;
}

export interface BalanceSheetReport {
  assets: { accountId: string; code: string; nameEn: string; nameNp: string; amount: number }[];
  liabilities: { accountId: string; code: string; nameEn: string; nameNp: string; amount: number }[];
  equity: { accountId: string; code: string; nameEn: string; nameNp: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netSurplus: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}
