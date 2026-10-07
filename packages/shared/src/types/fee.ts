export type FeeType = 'MONTHLY' | 'ANNUAL' | 'TERM' | 'ONE_TIME' | 'OPTIONAL';

export type FeePaymentMode = 'CASH' | 'QR_CODE' | 'BANK_TRANSFER' | 'CHEQUE';

export type FeeBillStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL_WAIVER';

export type DiscountReason = 'MERIT' | 'NEED_BASED' | 'SIBLING' | 'STAFF_CHILD' | 'OTHER';

export interface FeeHead {
  id: string;
  schoolId: string;
  code: string;
  nameEn: string;
  nameNp: string;
  feeType: FeeType;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  streamId?: string | null;
  feeHeadId: string;
  amount: number;
  feeHead?: FeeHead;
  classNameEn?: string;
  classNameNp?: string;
  createdAt?: string;
}

export interface StudentFeeDiscount {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  feeHeadId?: string | null;
  discountType: DiscountType;
  discountValue: number;
  reason: DiscountReason;
  documentUrl?: string | null;
  documentName?: string | null;
  uploadedAt?: string | null;
  approvedById?: string | null;
  studentNameEn?: string;
  studentNameNp?: string;
  rollNumber?: number | null;
  classNameEn?: string;
  classNameNp?: string;
  headNameEn?: string;
  headNameNp?: string;
  createdAt?: string;
}

export interface FeeBillItem {
  id: string;
  billId: string;
  feeHeadId: string;
  headNameEn: string;
  headNameNp: string;
  amount: number;
  discountAmount: number;
  netAmount: number;
}

export interface FeeBill {
  id: string;
  schoolId: string;
  billNumber: string;
  studentId: string;
  classId: string;
  sectionId?: string | null;
  academicYearId: string;
  monthBs: number;
  yearBs: number;
  titleEn: string;
  titleNp: string;
  subTotal: number;
  discountAmount: number;
  previousDue: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: FeeBillStatus;
  dueDateBs?: string | null;
  generatedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items?: FeeBillItem[];
  studentNameEn?: string;
  studentNameNp?: string;
  admissionNumber?: string;
  rollNumber?: number | null;
  classNameEn?: string;
  classNameNp?: string;
  sectionNameEn?: string;
  sectionNameNp?: string;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  receiptNumber: string;
  studentId: string;
  billId?: string | null;
  amountPaid: number;
  paymentMode: FeePaymentMode;
  transactionRef?: string | null;
  qrBankProvider?: string | null;
  paymentDateBs: string;
  paymentDateAd: string;
  remarks?: string | null;
  receivedById?: string | null;
  printedCount: number;
  createdAt?: string;
  studentNameEn?: string;
  studentNameNp?: string;
  admissionNumber?: string;
  rollNumber?: number | null;
  classNameEn?: string;
  classNameNp?: string;
  receivedByName?: string;
}

export interface StudentFeeDueStatement {
  student: {
    id: string;
    admissionNumber: string;
    fullNameEn: string;
    fullNameNp: string;
    classId: string;
    classNameEn: string;
    classNameNp: string;
    sectionNameEn?: string;
    rollNumber?: number | null;
    fatherName?: string | null;
    primaryPhone?: string | null;
  };
  bills: FeeBill[];
  totalPreviousDue: number;
  totalCurrentBilled: number;
  totalPaid: number;
  totalDue: number;
  recentPayments: FeePayment[];
}

export interface FeeCollectRequest {
  studentId: string;
  billId?: string; // Optional specific bill, otherwise settles oldest unpaid bills
  amountPaid: number;
  paymentMode: FeePaymentMode;
  transactionRef?: string;
  qrBankProvider?: string;
  paymentDateBs: string;
  remarks?: string;
}

export interface FeeReceiptPayload {
  school: {
    nameEn: string;
    nameNp: string;
    addressEn: string;
    addressNp: string;
    phone: string;
    email: string;
    logoUrl?: string | null;
    feeQrCodeUrl?: string | null;
    feeMerchantName?: string | null;
    iemisCode?: string | null;
  };
  payment: FeePayment;
  bill?: FeeBill | null;
  billItems?: FeeBillItem[];
  outstandingDueRemaining: number;
}
